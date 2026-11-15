import { Inject, Injectable } from '@nestjs/common'
import { RepositoryConflictError } from '@utility/database/error'
import {
  TRANSACTION_MANAGER,
  type TransactionManager,
} from '@utility/database/transaction'
import { CHANGE_RECORDER, type ChangeRecorder } from '@utility/history/recorder'
import { getRequestContext } from '@utility/logger/context'
import { AppLogger } from '@utility/logger/service'
import { type CommitteeMembershipRepository } from '@repository/interface/committee-membership'
import { type CredentialApplicationRepository } from '@repository/interface/credential-application'
import { type CredentialAssessmentRepository } from '@repository/interface/credential-assessment'
import { type EmployeeRepository } from '@repository/interface/employee'
import { type Coding } from '@repository/model/common/coding'
import { type PrivilegeCondition } from '@repository/model/common/credentialing'
import {
  type CredentialApplication,
  type RecommendedPrivilege,
} from '@repository/model/credential-application'
import { type CredentialAssessment } from '@repository/model/credential-assessment'
import {
  REPOSITORY_COMMITTEE_MEMBERSHIP,
  REPOSITORY_CREDENTIAL_APPLICATION,
  REPOSITORY_CREDENTIAL_ASSESSMENT,
  REPOSITORY_EMPLOYEE,
} from '@repository/token'
import { CodeConceptService } from '../concept/code-concept.service'
import { observe } from '../observe'
import { ParameterService } from '../parameter/parameter.service'
import {
  ConflictError,
  ForbiddenError,
  InvalidRequestError,
} from '../workforce.error'
import {
  assertApplicationVersion,
  findSeat,
  invalidTransition,
  loadApplication,
  writeApplication,
} from './application-support'

const NAME = 'AssessmentService'

/**
 * Entity name of an assessment in the change history.
 */
const ENTITY_TYPE = 'credential_assessment'

/**
 * Role codes of the committee (`id.committee-role`).
 */
const ROLE_CHAIR = 'chair'
const ROLE_ASSESSOR = 'mitra_bestari'

/**
 * Longest text of an assessment reason or a recommendation summary, and of restriction notes.
 */
const MAX_TEXT = 2000
const MAX_NOTES = 500

/**
 * Most methods one assessment can name.
 */
const MAX_METHODS = 10

/**
 * Code system name suffix of the assessment methods, after an optional country prefix.
 */
const METHOD_SYSTEM = /(^|\.)assessment-method$/

const CONDITIONS: readonly string[] = ['full', 'supervised', 'restricted']
const OUTCOMES: readonly string[] = ['recommended', 'not_recommended']

/**
 * How permissive a condition is: `full` is more than `supervised` and `restricted`, which are
 * equal for this check (HR plan 4.2 AP12).
 *
 * @param condition - A condition.
 * @returns 2 for `full`, otherwise 1.
 */
function permissiveness(condition: PrivilegeCondition): number {
  return condition === 'full' ? 2 : 1
}

/**
 * One assessor's finding on one requested privilege, as sent.
 *
 * @property catalogItemId - The privilege.
 * @property methods - How it was assessed.
 * @property outcome - `recommended` or `not_recommended`.
 * @property recommendedCondition - Needed when recommended, empty otherwise.
 * @property reason - The assessor's reasoning.
 */
export interface AssessmentFindingInput {
  catalogItemId: string
  methods: Coding[]
  outcome: 'recommended' | 'not_recommended'
  recommendedCondition?: PrivilegeCondition | null
  reason: string
}

/**
 * Data of an assessment: a finding for every requested privilege.
 *
 * @property assessments - The findings.
 * @property version - Version of the application the caller read.
 */
export interface AssessInput {
  assessments: AssessmentFindingInput[]
  version?: number
}

/**
 * The stored fields of one checked finding.
 */
type CheckedFinding = Pick<
  CredentialAssessment,
  'catalog_item_id' | 'methods' | 'outcome' | 'recommended_condition' | 'reason'
>

/**
 * What an assessment returns: the assessor's own findings and the status that followed.
 *
 * @property status - Status of the application after the assessment.
 * @property assessments - The findings that were stored.
 */
export interface AssessResult {
  status: CredentialApplication['status']
  assessments: CredentialAssessment[]
}

/**
 * The committee's decision on one privilege, as sent.
 *
 * @property catalogItemId - The privilege.
 * @property outcome - `recommended` or `not_recommended`.
 * @property condition - Needed when recommended.
 * @property supervisorEmployeeId - Needed for `supervised`.
 * @property restrictionNotes - Needed for `restricted`.
 */
export interface RecommendedPrivilegeInput {
  catalogItemId: string
  outcome: 'recommended' | 'not_recommended'
  condition?: PrivilegeCondition | null
  supervisorEmployeeId?: string | null
  restrictionNotes?: string | null
}

/**
 * Data of a recommendation.
 *
 * @property summary - Summary of the assessment, 1 to 2000 characters.
 * @property privileges - A decision for every requested privilege.
 * @property version - Version the caller read.
 * @property reason - Why, kept in the change history.
 */
export interface RecommendInput {
  summary: string
  privileges: RecommendedPrivilegeInput[]
  version?: number
  reason?: string
}

/**
 * Credential applications, the assessment part (HR plan 4.2, part 3): the assessors' findings,
 * the committee's reading of them with an access record, and the chair's recommendation.
 */
@Injectable()
export class AssessmentService {
  /**
   * @param applications - Application repository.
   * @param assessments - Assessment repository.
   * @param employees - Employee repository.
   * @param memberships - Committee membership repository (group 2.5).
   * @param concepts - Code concepts, for the assessment methods.
   * @param parameters - HR parameters (`MIN_ASSESSORS`).
   * @param transactions - Transaction manager of the main connection.
   * @param changes - Change recorder, for the access record of reads.
   * @param logger - Logger of this service.
   */
  constructor(
    @Inject(REPOSITORY_CREDENTIAL_APPLICATION)
    private readonly applications: CredentialApplicationRepository,
    @Inject(REPOSITORY_CREDENTIAL_ASSESSMENT)
    private readonly assessments: CredentialAssessmentRepository,
    @Inject(REPOSITORY_EMPLOYEE)
    private readonly employees: EmployeeRepository,
    @Inject(REPOSITORY_COMMITTEE_MEMBERSHIP)
    private readonly memberships: CommitteeMembershipRepository,
    @Inject(CodeConceptService) private readonly concepts: CodeConceptService,
    @Inject(ParameterService) private readonly parameters: ParameterService,
    @Inject(TRANSACTION_MANAGER)
    private readonly transactions: TransactionManager,
    @Inject(CHANGE_RECORDER) private readonly changes: ChangeRecorder,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /**
   * An appointed assessor records the assessment of every requested privilege (HR-CRD-006,
   * AP11). The findings and the move to `assessed`, when every assessor without a conflict has
   * assessed and at least `MIN_ASSESSORS` of them, are written in one transaction.
   *
   * @param tenantId - Tenant of the caller.
   * @param callerEmployeeId - The caller's employee, or `null`.
   * @param id - Application identifier.
   * @param input - The findings and optional version.
   * @returns The stored findings and the status that followed.
   * @throws NotFoundError `application_not_found`.
   * @throws ForbiddenError `not_an_assessor` or `conflict_declared`.
   * @throws InvalidRequestError `invalid_transition`, `declaration_required`,
   * `assessment_incomplete`, `duplicate_privilege`, `privilege_not_requested`, `invalid_methods`,
   * `invalid_method`, `invalid_outcome`, `condition_required`, `invalid_condition`,
   * `condition_not_allowed`, `reason_required`, `invalid_reason`, `unknown_code`, `code_retired`
   * or `code_not_in_period`.
   * @throws ConflictError `assessment_exists` or `stale_version`.
   */
  assess(
    tenantId: string,
    callerEmployeeId: string | null,
    id: string,
    input: AssessInput,
  ): Promise<AssessResult> {
    return observe(
      this.logger,
      'assessment_create',
      `${NAME}.assess`,
      async () => {
        const application = await loadApplication(
          this.applications,
          tenantId,
          id,
        )
        const own = application.assessors.find(
          (entry) => entry.employee_id === callerEmployeeId,
        )
        if (callerEmployeeId === null || !own) {
          throw new ForbiddenError(
            'not_an_assessor',
            'Only an appointed assessor of this application can assess.',
          )
        }
        if (application.status !== 'under_review') {
          throw invalidTransition(
            'An application is assessed while it is under review.',
          )
        }
        if (own.conflict_declaration === null) {
          throw new InvalidRequestError(
            'declaration_required',
            'Declare a conflict of interest, or none, before assessing.',
          )
        }
        if (own.conflict_declaration.has_conflict) {
          throw new ForbiddenError(
            'conflict_declared',
            'An assessor with a conflict of interest cannot assess.',
          )
        }
        if (
          (
            await this.assessments.findByAssessor(
              tenantId,
              application.id,
              callerEmployeeId,
            )
          ).length > 0
        ) {
          throw this.assessmentExists()
        }
        this.assertCovers(
          application,
          input.assessments.map((finding) => finding.catalogItemId),
          'assessment_incomplete',
        )
        const findings: CheckedFinding[] = []
        for (const finding of input.assessments) {
          findings.push(await this.checkFinding(tenantId, finding))
        }
        assertApplicationVersion(application, input.version)
        const minimum = Number(
          (
            await this.parameters.resolve(tenantId, {
              key: 'MIN_ASSESSORS',
              facilityId: application.credentialing_facility_id,
            })
          ).value,
        )
        const assessedAt = new Date()
        return this.transactions.run(async () => {
          const stored: CredentialAssessment[] = []
          try {
            for (const finding of findings) {
              stored.push(
                await this.assessments.create({
                  tenant_id: tenantId,
                  application_id: application.id,
                  employee_id: application.employee_id,
                  assessor_employee_id: callerEmployeeId,
                  ...finding,
                  assessed_at: assessedAt,
                }),
              )
            }
          } catch (error: unknown) {
            if (error instanceof RepositoryConflictError) {
              throw this.assessmentExists()
            }
            throw error
          }
          const all = await this.assessments.findByApplication(
            tenantId,
            application.id,
          )
          const assessed = new Set(all.map((item) => item.assessor_employee_id))
          const expected = application.assessors.filter(
            (entry) => entry.conflict_declaration?.has_conflict !== true,
          )
          const done =
            expected.every((entry) => assessed.has(entry.employee_id)) &&
            expected.length >= minimum
          if (!done) {
            return { status: application.status, assessments: stored }
          }
          const updated = await writeApplication(undefined, () =>
            this.applications.update(
              application.id,
              { status: 'assessed', status_since: new Date() },
              { expectedVersion: application.version },
            ),
          )
          return { status: updated.status, assessments: stored }
        })
      },
    )
  }

  /**
   * The committee reads the assessments of an application. Each assessment returned is recorded
   * as an access in the change log, after the read succeeded (HR-AUD-003, AP13). An assessor
   * sees only their own findings; the chair, the secretary and the members see all. Writes no
   * operational log entry (a read).
   *
   * @param tenantId - Tenant of the caller.
   * @param callerEmployeeId - The caller's employee, or `null`.
   * @param id - Application identifier.
   * @returns The assessments the caller may see.
   * @throws NotFoundError `application_not_found`.
   * @throws ForbiddenError `not_committee_member`.
   */
  async list(
    tenantId: string,
    callerEmployeeId: string | null,
    id: string,
  ): Promise<CredentialAssessment[]> {
    const application = await loadApplication(this.applications, tenantId, id)
    const seat = await findSeat(
      this.memberships,
      tenantId,
      callerEmployeeId,
      application,
    )
    if (!seat) {
      throw this.notMember()
    }
    const all = await this.assessments.findByApplication(
      tenantId,
      application.id,
    )
    const visible =
      seat.role.code === ROLE_ASSESSOR
        ? all.filter((item) => item.assessor_employee_id === callerEmployeeId)
        : all
    for (const item of visible) {
      await this.changes.recordAccess({
        type: ENTITY_TYPE,
        id: item.id,
        operation: `${NAME}.list`,
        tenantId,
      })
    }
    return visible
  }

  /**
   * The committee chair signs the recommendation to the Director (HR-CRD-008, AP12): from
   * `assessed`, or from `under_review` for a temporary application, which is not assessed. Every
   * requested privilege gets a decision, never more permissive than requested.
   *
   * @param tenantId - Tenant of the caller.
   * @param callerEmployeeId - The caller's employee, or `null`.
   * @param id - Application identifier.
   * @param input - The summary and the decisions.
   * @returns The recommended application.
   * @throws NotFoundError `application_not_found`.
   * @throws ForbiddenError `not_committee_member` or `not_committee_chair`.
   * @throws InvalidRequestError `invalid_transition`, `summary_required`, `invalid_summary`,
   * `recommendation_incomplete`, `duplicate_privilege`, `privilege_not_requested`,
   * `invalid_outcome`, `condition_required`, `invalid_condition`, `condition_not_allowed`,
   * `condition_exceeds_request`, `supervisor_required`, `supervisor_not_allowed`,
   * `supervisor_invalid`, `notes_required`, `notes_not_allowed` or `invalid_notes`.
   * @throws ConflictError `stale_version`.
   */
  recommend(
    tenantId: string,
    callerEmployeeId: string | null,
    id: string,
    input: RecommendInput,
  ): Promise<CredentialApplication> {
    return observe(
      this.logger,
      'application_recommend',
      `${NAME}.recommend`,
      async () => {
        const application = await loadApplication(
          this.applications,
          tenantId,
          id,
        )
        const seat = await findSeat(
          this.memberships,
          tenantId,
          callerEmployeeId,
          application,
        )
        if (!seat) {
          throw this.notMember()
        }
        if (seat.role.code !== ROLE_CHAIR) {
          throw new ForbiddenError(
            'not_committee_chair',
            'Only the committee chair can sign the recommendation.',
          )
        }
        const from = application.type === 'temporary' ? 'under_review' : 'assessed'
        if (application.status !== from) {
          throw invalidTransition(
            from === 'assessed'
              ? 'Only an assessed application can be recommended.'
              : 'A temporary application is recommended while it is under review.',
          )
        }
        const summary = (input.summary ?? '').trim()
        if (summary.length === 0) {
          throw new InvalidRequestError(
            'summary_required',
            'A summary is required.',
          )
        }
        if (summary.length > MAX_TEXT) {
          throw new InvalidRequestError(
            'invalid_summary',
            'The summary can have at most 2000 characters.',
          )
        }
        this.assertCovers(
          application,
          input.privileges.map((item) => item.catalogItemId),
          'recommendation_incomplete',
        )
        const privileges: RecommendedPrivilege[] = []
        for (const item of input.privileges) {
          privileges.push(await this.checkDecision(tenantId, application, item))
        }
        assertApplicationVersion(application, input.version)
        const actor = getRequestContext()?.actor
        if (!actor) {
          throw new Error('Signing a recommendation needs an actor in the request context.')
        }
        const now = new Date()
        return writeApplication(input.reason, () =>
          this.applications.update(
            application.id,
            {
              status: 'recommended',
              status_since: now,
              recommendation: {
                decided_at: now,
                signed_by: actor,
                summary,
                privileges,
              },
            },
            { expectedVersion: input.version },
          ),
        )
      },
    )
  }

  /**
   * Checks that a list names every requested privilege exactly once and nothing else.
   *
   * @param application - The application.
   * @param ids - The privileges the list names.
   * @param incomplete - Code to use when a requested privilege is missing.
   * @throws InvalidRequestError `duplicate_privilege`, `privilege_not_requested` or the
   * `incomplete` code.
   */
  private assertCovers(
    application: CredentialApplication,
    ids: string[],
    incomplete: string,
  ): void {
    if (new Set(ids).size !== ids.length) {
      throw new InvalidRequestError(
        'duplicate_privilege',
        'A privilege appears twice.',
      )
    }
    const requested = new Set(
      application.requested_privileges.map((item) => item.catalog_item_id),
    )
    if (ids.some((item) => !requested.has(item))) {
      throw new InvalidRequestError(
        'privilege_not_requested',
        'A privilege was not requested by this application.',
      )
    }
    if (ids.length !== requested.size) {
      throw new InvalidRequestError(
        incomplete,
        'Every requested privilege needs an entry.',
      )
    }
  }

  /**
   * Checks one finding and builds the stored fields.
   *
   * @param tenantId - Tenant of the caller.
   * @param finding - The finding as sent.
   * @returns The stored fields of the finding.
   * @throws InvalidRequestError `invalid_methods`, `invalid_method`, `invalid_outcome`,
   * `condition_required`, `invalid_condition`, `condition_not_allowed`, `reason_required`,
   * `invalid_reason`, `unknown_code`, `code_retired` or `code_not_in_period`.
   */
  private async checkFinding(
    tenantId: string,
    finding: AssessmentFindingInput,
  ): Promise<CheckedFinding> {
    const methods = finding.methods ?? []
    const keys = methods.map((method) => `${method.system}|${method.code}`)
    if (
      methods.length < 1 ||
      methods.length > MAX_METHODS ||
      new Set(keys).size !== keys.length
    ) {
      throw new InvalidRequestError(
        'invalid_methods',
        'Name 1 to 10 different assessment methods.',
      )
    }
    for (const method of methods) {
      if (!METHOD_SYSTEM.test(method.system)) {
        throw new InvalidRequestError(
          'invalid_method',
          'A method must come from an assessment-method code system.',
        )
      }
      await this.concepts.assertActive(tenantId, method)
    }
    const condition = this.checkOutcome(
      finding.outcome,
      finding.recommendedCondition ?? null,
    )
    const reason = (finding.reason ?? '').trim()
    if (reason.length === 0) {
      throw new InvalidRequestError('reason_required', 'A reason is required.')
    }
    if (reason.length > MAX_TEXT) {
      throw new InvalidRequestError(
        'invalid_reason',
        'The reason can have at most 2000 characters.',
      )
    }
    return {
      catalog_item_id: finding.catalogItemId,
      methods: methods.map(({ system, code }) => ({ system, code })),
      outcome: finding.outcome,
      recommended_condition: condition,
      reason,
    }
  }

  /**
   * Checks an outcome and its condition: a condition exactly when recommended.
   *
   * @param outcome - The outcome as sent.
   * @param condition - The condition as sent, or `null`.
   * @returns The condition to store.
   * @throws InvalidRequestError `invalid_outcome`, `condition_required`, `invalid_condition` or
   * `condition_not_allowed`.
   */
  private checkOutcome(
    outcome: string,
    condition: PrivilegeCondition | null,
  ): PrivilegeCondition | null {
    if (!OUTCOMES.includes(outcome)) {
      throw new InvalidRequestError(
        'invalid_outcome',
        'The outcome must be recommended or not_recommended.',
      )
    }
    if (outcome === 'not_recommended') {
      if (condition !== null) {
        throw new InvalidRequestError(
          'condition_not_allowed',
          'A privilege that is not recommended has no condition.',
        )
      }
      return null
    }
    if (condition === null) {
      throw new InvalidRequestError(
        'condition_required',
        'A recommended privilege needs a condition.',
      )
    }
    if (!CONDITIONS.includes(condition)) {
      throw new InvalidRequestError(
        'invalid_condition',
        'The condition must be full, supervised or restricted.',
      )
    }
    return condition
  }

  /**
   * Checks the committee's decision on one privilege and builds the stored value (AP12).
   *
   * @param tenantId - Tenant of the caller.
   * @param application - The application.
   * @param item - The decision as sent.
   * @returns The decision as it will be stored.
   * @throws InvalidRequestError `invalid_outcome`, `condition_required`, `invalid_condition`,
   * `condition_not_allowed`, `condition_exceeds_request`, `supervisor_required`,
   * `supervisor_not_allowed`, `supervisor_invalid`, `notes_required`, `notes_not_allowed` or
   * `invalid_notes`.
   */
  private async checkDecision(
    tenantId: string,
    application: CredentialApplication,
    item: RecommendedPrivilegeInput,
  ): Promise<RecommendedPrivilege> {
    const supervisorId = item.supervisorEmployeeId ?? null
    const notes = (item.restrictionNotes ?? '').trim()
    const condition = this.checkOutcome(item.outcome, item.condition ?? null)
    if (condition === null) {
      if (supervisorId !== null || notes.length > 0) {
        throw new InvalidRequestError(
          'condition_not_allowed',
          'A privilege that is not recommended has no condition, supervisor or notes.',
        )
      }
      return {
        catalog_item_id: item.catalogItemId,
        outcome: 'not_recommended',
        condition: null,
        supervisor_employee_id: null,
        restriction_notes: null,
      }
    }
    const requested = application.requested_privileges.find(
      (entry) => entry.catalog_item_id === item.catalogItemId,
    )
    if (
      !requested ||
      permissiveness(condition) > permissiveness(requested.requested_condition)
    ) {
      throw new InvalidRequestError(
        'condition_exceeds_request',
        'The recommended condition is more permissive than the one requested.',
      )
    }
    if (condition === 'supervised') {
      if (supervisorId === null) {
        throw new InvalidRequestError(
          'supervisor_required',
          'A supervised privilege needs a supervisor.',
        )
      }
      await this.assertSupervisor(tenantId, application, supervisorId)
    } else if (supervisorId !== null) {
      throw new InvalidRequestError(
        'supervisor_not_allowed',
        'Only a supervised privilege has a supervisor.',
      )
    }
    if (condition === 'restricted') {
      if (notes.length === 0) {
        throw new InvalidRequestError(
          'notes_required',
          'A restricted privilege needs the restrictions.',
        )
      }
      if (notes.length > MAX_NOTES) {
        throw new InvalidRequestError(
          'invalid_notes',
          'The restrictions can have at most 500 characters.',
        )
      }
    } else if (notes.length > 0) {
      throw new InvalidRequestError(
        'notes_not_allowed',
        'Only a restricted privilege has restriction notes.',
      )
    }
    return {
      catalog_item_id: item.catalogItemId,
      outcome: 'recommended',
      condition,
      supervisor_employee_id: supervisorId,
      restriction_notes: condition === 'restricted' ? notes : null,
    }
  }

  /**
   * Checks a supervisor: an employee of the tenant who has not separated and is not the applicant.
   * Checking that the supervisor's own grant is `full` waits for group 4.3.
   *
   * @param tenantId - Tenant of the caller.
   * @param application - The application.
   * @param employeeId - The proposed supervisor.
   * @throws InvalidRequestError `supervisor_invalid`.
   */
  private async assertSupervisor(
    tenantId: string,
    application: CredentialApplication,
    employeeId: string,
  ): Promise<void> {
    const supervisor = await this.employees.findOne(employeeId)
    if (
      !supervisor ||
      supervisor.tenant_id !== tenantId ||
      supervisor.id === application.employee_id ||
      supervisor.employment_status === 'separated'
    ) {
      throw new InvalidRequestError(
        'supervisor_invalid',
        'The supervisor must be another employee of the tenant who has not separated.',
      )
    }
  }

  /**
   * @returns The refusal for a caller without a seat in the applicant's committee.
   */
  private notMember(): ForbiddenError {
    return new ForbiddenError(
      'not_committee_member',
      "Only a member of the applicant's committee can do this.",
    )
  }

  /**
   * @returns The conflict for a second assessment by the same assessor.
   */
  private assessmentExists(): ConflictError {
    return new ConflictError(
      'assessment_exists',
      'This assessor already assessed the application.',
    )
  }
}
