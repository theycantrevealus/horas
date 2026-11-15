import { Inject, Injectable } from '@nestjs/common'
import { getRequestContext } from '@utility/logger/context'
import { AppLogger } from '@utility/logger/service'
import { type CommitteeMembershipRepository } from '@repository/interface/committee-membership'
import { type CredentialApplicationRepository } from '@repository/interface/credential-application'
import { type EmployeeRepository } from '@repository/interface/employee'
import { type Coding } from '@repository/model/common/coding'
import {
  type ApplicationAssessor,
  type CredentialApplication,
} from '@repository/model/credential-application'
import {
  REPOSITORY_COMMITTEE_MEMBERSHIP,
  REPOSITORY_CREDENTIAL_APPLICATION,
  REPOSITORY_EMPLOYEE,
} from '@repository/token'
import { CodeConceptService } from '../concept/code-concept.service'
import { observe } from '../observe'
import {
  ConflictError,
  ForbiddenError,
  InvalidRequestError,
} from '../workforce.error'
import {
  assertApplicationVersion,
  cleanReason,
  invalidTransition,
  loadApplication,
  writeApplication,
} from './application-support'

const NAME = 'ReviewService'

/**
 * Role code of a peer assessor in the committee (`id.committee-role`).
 */
const ASSESSOR_ROLE = 'mitra_bestari'

/**
 * Most assessors one request can appoint.
 */
const MAX_APPOINTED = 20

/**
 * Code system name suffix of the conflict relationships, after an optional country prefix.
 */
const RELATIONSHIP_SYSTEM = /(^|\.)conflict-relationship$/

/**
 * Optional version and reason of a committee step.
 *
 * @property version - Version the caller read.
 * @property reason - Why, kept in the change history.
 */
export interface ReviewStepInput {
  version?: number
  reason?: string
}

/**
 * Data of a return for completion.
 *
 * @property reason - Why; required.
 * @property version - Version the caller read.
 */
export interface ReturnApplicationInput {
  reason: string
  version?: number
}

/**
 * Data of the appointment of assessors.
 *
 * @property assessorEmployeeIds - The employees to appoint.
 * @property version - Version the caller read.
 * @property reason - Why, kept in the change history.
 */
export interface AppointAssessorsInput {
  assessorEmployeeIds: string[]
  version?: number
  reason?: string
}

/**
 * Data of a conflict declaration.
 *
 * @property hasConflict - Whether the assessor has a conflict of interest.
 * @property relationship - Kind of relationship; needed exactly when there is a conflict.
 * @property version - Version the caller read.
 */
export interface DeclareConflictInput {
  hasConflict: boolean
  relationship?: Coding | null
  version?: number
}

/**
 * Credential applications, the committee review steps (HR plan 4.2, part 2): start the
 * completeness check, return for completion, appoint assessors and the assessors' conflict
 * declarations. The committee routes need an active seat in the applicant's committee at the
 * credentialing facility (AP7); the declaration is personal to the appointed assessor.
 */
@Injectable()
export class ReviewService {
  /**
   * @param applications - Application repository.
   * @param employees - Employee repository.
   * @param memberships - Committee membership repository (group 2.5).
   * @param concepts - Code concepts, for the relationship codes.
   * @param logger - Logger of this service.
   */
  constructor(
    @Inject(REPOSITORY_CREDENTIAL_APPLICATION)
    private readonly applications: CredentialApplicationRepository,
    @Inject(REPOSITORY_EMPLOYEE)
    private readonly employees: EmployeeRepository,
    @Inject(REPOSITORY_COMMITTEE_MEMBERSHIP)
    private readonly memberships: CommitteeMembershipRepository,
    @Inject(CodeConceptService) private readonly concepts: CodeConceptService,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /**
   * The committee starts checking completeness: `submitted` to `under_review` (AP9).
   *
   * @param tenantId - Tenant of the caller.
   * @param callerEmployeeId - The caller's employee, or `null`.
   * @param id - Application identifier.
   * @param input - Optional version and reason.
   * @returns The application under review.
   * @throws NotFoundError `application_not_found`.
   * @throws ForbiddenError `not_committee_member`.
   * @throws InvalidRequestError `invalid_transition`.
   * @throws ConflictError `stale_version`.
   */
  startReview(
    tenantId: string,
    callerEmployeeId: string | null,
    id: string,
    input: ReviewStepInput,
  ): Promise<CredentialApplication> {
    return observe(
      this.logger,
      'application_start_review',
      `${NAME}.startReview`,
      async () => {
        const application = await this.loadForCommittee(
          tenantId,
          callerEmployeeId,
          id,
        )
        if (application.status !== 'submitted') {
          throw invalidTransition('Only a submitted application can be reviewed.')
        }
        assertApplicationVersion(application, input.version)
        return writeApplication(input.reason, () =>
          this.applications.update(
            application.id,
            { status: 'under_review', status_since: new Date() },
            { expectedVersion: input.version },
          ),
        )
      },
    )
  }

  /**
   * The committee sends an application back for missing documents: `under_review` or
   * `assessed` to `returned` (AP9 and AP16).
   *
   * @param tenantId - Tenant of the caller.
   * @param callerEmployeeId - The caller's employee, or `null`.
   * @param id - Application identifier.
   * @param input - Reason and optional version.
   * @returns The returned application.
   * @throws NotFoundError `application_not_found`.
   * @throws ForbiddenError `not_committee_member`.
   * @throws InvalidRequestError `invalid_transition`, `reason_required` or `invalid_reason`.
   * @throws ConflictError `stale_version`.
   */
  returnApplication(
    tenantId: string,
    callerEmployeeId: string | null,
    id: string,
    input: ReturnApplicationInput,
  ): Promise<CredentialApplication> {
    return observe(
      this.logger,
      'application_return',
      `${NAME}.returnApplication`,
      async () => {
        const application = await this.loadForCommittee(
          tenantId,
          callerEmployeeId,
          id,
        )
        if (
          application.status !== 'under_review' &&
          application.status !== 'assessed'
        ) {
          throw invalidTransition(
            'Only an application under review or assessed can be returned.',
          )
        }
        const reason = cleanReason(input.reason)
        assertApplicationVersion(application, input.version)
        return writeApplication(reason, () =>
          this.applications.update(
            application.id,
            {
              status: 'returned',
              status_since: new Date(),
              return_reason: reason,
            },
            { expectedVersion: input.version },
          ),
        )
      },
    )
  }

  /**
   * The committee appoints assessors (HR-CRD-005, AP10). All are appointed or none. Appointing is
   * additive. A temporary application is not assessed (AP12).
   *
   * @param tenantId - Tenant of the caller.
   * @param callerEmployeeId - The caller's employee, or `null`.
   * @param id - Application identifier.
   * @param input - The employees to appoint, optional version and reason.
   * @returns The application with its assessors.
   * @throws NotFoundError `application_not_found`.
   * @throws ForbiddenError `not_committee_member`.
   * @throws InvalidRequestError `invalid_transition`, `assessment_not_required`,
   * `invalid_assessors` or `assessor_not_eligible`.
   * @throws ConflictError `assessor_already_appointed` or `stale_version`.
   */
  appointAssessors(
    tenantId: string,
    callerEmployeeId: string | null,
    id: string,
    input: AppointAssessorsInput,
  ): Promise<CredentialApplication> {
    return observe(
      this.logger,
      'application_appoint_assessors',
      `${NAME}.appointAssessors`,
      async () => {
        const application = await this.loadForCommittee(
          tenantId,
          callerEmployeeId,
          id,
        )
        if (application.status !== 'under_review') {
          throw invalidTransition(
            'Assessors are appointed while the application is under review.',
          )
        }
        if (application.type === 'temporary') {
          throw new InvalidRequestError(
            'assessment_not_required',
            'A temporary application is not assessed.',
          )
        }
        const ids = input.assessorEmployeeIds
        if (
          ids.length < 1 ||
          ids.length > MAX_APPOINTED ||
          new Set(ids).size !== ids.length
        ) {
          throw new InvalidRequestError(
            'invalid_assessors',
            'Appoint 1 to 20 different assessors.',
          )
        }
        for (const assessorId of ids) {
          await this.assertEligible(tenantId, application, assessorId)
        }
        const appointed = new Set(
          application.assessors.map((entry) => entry.employee_id),
        )
        if (ids.some((assessorId) => appointed.has(assessorId))) {
          throw new ConflictError(
            'assessor_already_appointed',
            'An assessor is already appointed to this application.',
          )
        }
        assertApplicationVersion(application, input.version)
        const actor = getRequestContext()?.actor
        if (!actor) {
          throw new Error('Appointing assessors needs an actor in the request context.')
        }
        const now = new Date()
        const added: ApplicationAssessor[] = ids.map((assessorId) => ({
          employee_id: assessorId,
          appointed_at: now,
          appointed_by: actor,
          conflict_declaration: null,
        }))
        return writeApplication(input.reason, () =>
          this.applications.update(
            application.id,
            { assessors: [...application.assessors, ...added] },
            { expectedVersion: input.version },
          ),
        )
      },
    )
  }

  /**
   * An appointed assessor declares a conflict of interest, or none, once and finally (AP11).
   * Personal: the caller must be one of the application's assessors.
   *
   * @param tenantId - Tenant of the caller.
   * @param callerEmployeeId - The caller's employee, or `null`.
   * @param id - Application identifier.
   * @param input - The declaration and optional version.
   * @returns The application with the declaration.
   * @throws NotFoundError `application_not_found`.
   * @throws ForbiddenError `not_an_assessor`.
   * @throws InvalidRequestError `invalid_transition`, `relationship_required`,
   * `relationship_not_allowed`, `invalid_relationship`, `unknown_code`, `code_retired` or
   * `code_not_in_period`.
   * @throws ConflictError `declaration_exists` or `stale_version`.
   */
  declareConflict(
    tenantId: string,
    callerEmployeeId: string | null,
    id: string,
    input: DeclareConflictInput,
  ): Promise<CredentialApplication> {
    return observe(
      this.logger,
      'application_declare_conflict',
      `${NAME}.declareConflict`,
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
            'Only an appointed assessor of this application can declare.',
          )
        }
        if (application.status !== 'under_review') {
          throw invalidTransition(
            'A declaration is made while the application is under review.',
          )
        }
        if (own.conflict_declaration !== null) {
          throw new ConflictError(
            'declaration_exists',
            'The declaration was made already and cannot be changed.',
          )
        }
        const relationship = await this.checkRelationship(tenantId, input)
        assertApplicationVersion(application, input.version)
        const declared = {
          declared_at: new Date(),
          has_conflict: input.hasConflict,
          relationship,
        }
        return writeApplication(undefined, () =>
          this.applications.update(
            application.id,
            {
              assessors: application.assessors.map((entry) =>
                entry === own
                  ? { ...entry, conflict_declaration: declared }
                  : entry,
              ),
            },
            { expectedVersion: input.version },
          ),
        )
      },
    )
  }

  /**
   * Loads an application and checks that the caller sits on the applicant's committee at the
   * credentialing facility, in any role (AP7). A missing application answers first, so the
   * answer does not depend on the caller's seat.
   *
   * @param tenantId - Tenant of the caller.
   * @param callerEmployeeId - The caller's employee, or `null`.
   * @param id - Application identifier.
   * @returns The application.
   * @throws NotFoundError `application_not_found`.
   * @throws ForbiddenError `not_committee_member`.
   */
  private async loadForCommittee(
    tenantId: string,
    callerEmployeeId: string | null,
    id: string,
  ): Promise<CredentialApplication> {
    const application = await loadApplication(this.applications, tenantId, id)
    const seat =
      callerEmployeeId === null
        ? null
        : await this.memberships.findActiveForEmployee(
            tenantId,
            callerEmployeeId,
            application.credentialing_facility_id,
            application.committee.code,
          )
    if (!seat) {
      throw new ForbiddenError(
        'not_committee_member',
        'Only a member of the applicant\'s committee can do this.',
      )
    }
    return application
  }

  /**
   * Checks an assessor: an employee of the tenant who has not separated, is not the applicant and
   * holds an active mitra bestari seat in the applicant's committee at the credentialing facility
   * (HR-CRD-005).
   *
   * @param tenantId - Tenant of the caller.
   * @param application - The application.
   * @param employeeId - The proposed assessor.
   * @throws InvalidRequestError `assessor_not_eligible`.
   */
  private async assertEligible(
    tenantId: string,
    application: CredentialApplication,
    employeeId: string,
  ): Promise<void> {
    const employee = await this.employees.findOne(employeeId)
    const seat =
      employee && employee.tenant_id === tenantId
        ? await this.memberships.findActiveForEmployee(
            tenantId,
            employee.id,
            application.credentialing_facility_id,
            application.committee.code,
          )
        : null
    if (
      !employee ||
      employee.tenant_id !== tenantId ||
      employee.employment_status === 'separated' ||
      employee.id === application.employee_id ||
      seat?.role.code !== ASSESSOR_ROLE
    ) {
      throw new InvalidRequestError(
        'assessor_not_eligible',
        'An assessor must be another employee with an active peer assessor seat in the committee.',
      )
    }
  }

  /**
   * Checks the relationship of a declaration: needed exactly when there is a conflict.
   *
   * @param tenantId - Tenant of the caller.
   * @param input - The declaration as sent.
   * @returns The relationship as it will be stored, or `null`.
   * @throws InvalidRequestError `relationship_required`, `relationship_not_allowed`,
   * `invalid_relationship`, `unknown_code`, `code_retired` or `code_not_in_period`.
   */
  private async checkRelationship(
    tenantId: string,
    input: DeclareConflictInput,
  ): Promise<Coding | null> {
    const relationship = input.relationship ?? null
    if (!input.hasConflict) {
      if (relationship !== null) {
        throw new InvalidRequestError(
          'relationship_not_allowed',
          'A declaration of no conflict has no relationship.',
        )
      }
      return null
    }
    if (relationship === null) {
      throw new InvalidRequestError(
        'relationship_required',
        'A conflict needs the kind of relationship.',
      )
    }
    if (!RELATIONSHIP_SYSTEM.test(relationship.system)) {
      throw new InvalidRequestError(
        'invalid_relationship',
        'The relationship must come from a conflict-relationship code system.',
      )
    }
    await this.concepts.assertActive(tenantId, relationship)
    return { system: relationship.system, code: relationship.code }
  }
}
