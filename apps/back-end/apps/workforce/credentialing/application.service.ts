import { Inject, Injectable } from '@nestjs/common'
import { withChangeReason } from '@utility/history/reason'
import { AppLogger } from '@utility/logger/service'
import { type ClinicalAppointmentRepository } from '@repository/interface/clinical-appointment'
import { type EmployeeRepository } from '@repository/interface/employee'
import { type FacilityRepository } from '@repository/interface/facility'
import { type OrganizationUnitRepository } from '@repository/interface/organization-unit'
import { type PrivilegeCatalogRepository } from '@repository/interface/privilege-catalog'
import { type PrivilegeGrantRepository } from '@repository/interface/privilege-grant'
import { type ProfessionalLicenseRepository } from '@repository/interface/professional-license'
import {
  type ApplicationQuery,
  type CredentialApplicationRepository,
} from '@repository/interface/credential-application'
import { type Coding } from '@repository/model/common/coding'
import { type PrivilegeCondition } from '@repository/model/common/credentialing'
import { type CredentialingScope } from '@repository/model/common/credentialing'
import { type FileRef } from '@repository/model/common/file-ref'
import {
  type ApplicationDocument,
  type CredentialApplication,
  type CredentialApplicationType,
  type RequestedPrivilege,
} from '@repository/model/credential-application'
import { type Employee } from '@repository/model/employee'
import { type Facility } from '@repository/model/facility'
import { type PrivilegeCatalogItem } from '@repository/model/privilege-catalog-item'
import {
  REPOSITORY_CLINICAL_APPOINTMENT,
  REPOSITORY_CREDENTIAL_APPLICATION,
  REPOSITORY_EMPLOYEE,
  REPOSITORY_FACILITY,
  REPOSITORY_ORGANIZATION_UNIT,
  REPOSITORY_PRIVILEGE_CATALOG,
  REPOSITORY_PRIVILEGE_GRANT,
  REPOSITORY_PROFESSIONAL_LICENSE,
} from '@repository/token'
import { CodeConceptService } from '../concept/code-concept.service'
import { isValidDocumentRef } from '../license/license-rules'
import { observe } from '../observe'
import { ParameterService } from '../parameter/parameter.service'
import { ConflictError, InvalidRequestError } from '../workforce.error'
import {
  assertApplicationVersion,
  cleanReason,
  invalidTransition,
  loadApplication,
  writeApplication,
} from './application-support'
import {
  hasRepeats,
  levelRank,
  LIMITS,
  missingEvidence,
  RENEWAL_TYPES,
  SUPPORTED_TYPES,
} from './application-rules'

const NAME = 'ApplicationService'

/**
 * Code system name suffixes, after an optional country prefix.
 */
const SYSTEMS = {
  evidence: /(^|\.)evidence-type$/,
  urgency: /(^|\.)temporary-urgency$/,
} as const

/**
 * One requested privilege as sent.
 *
 * @property catalogItemId - The catalog item.
 * @property requestedCondition - Condition asked for.
 * @property proposedSupervisorEmployeeId - Proposed supervisor; needed for `supervised`.
 * @property notes - Notes.
 */
export interface RequestedPrivilegeInput {
  catalogItemId: string
  requestedCondition: PrivilegeCondition
  proposedSupervisorEmployeeId?: string | null
  notes?: string | null
}

/**
 * One attached document as sent.
 *
 * @property type - Document type code.
 * @property file - Reference to the file.
 * @property licenseId - Licence of the applicant the document belongs to.
 */
export interface ApplicationDocumentInput {
  type: Coding
  file: FileRef
  licenseId?: string | null
}

/**
 * A temporary request as sent.
 *
 * @property requestedDays - How long the privileges are needed.
 * @property urgency - Why, a code.
 */
export interface TemporaryInput {
  requestedDays: number
  urgency: Coding
}

/**
 * Data of a new application.
 *
 * @property employeeId - The applicant.
 * @property credentialingFacilityId - Facility whose committee credentials the applicant.
 * @property type - `initial`, `temporary`, `recredentialing` or `privilege_extension` (HR plan 4.2
 * AP3, 4.4 RN2).
 * @property previousAppointmentId - The applicant's current SPK being renewed or extended; needed
 * for a renewal type and refused for the others.
 * @property requestedPrivileges - What is asked for.
 * @property requestedUnitIds - Units the privileges are asked for.
 * @property documents - Attached documents.
 * @property temporary - Temporary request; type `temporary` only.
 * @property reason - Why, kept in the change history.
 */
export interface CreateApplicationInput {
  employeeId: string
  credentialingFacilityId: string
  type: CredentialApplicationType
  previousAppointmentId?: string | null
  requestedPrivileges: RequestedPrivilegeInput[]
  requestedUnitIds: string[]
  documents?: ApplicationDocumentInput[]
  temporary?: TemporaryInput | null
  reason?: string
}

/**
 * Data of an edit: any of the editable parts.
 *
 * @property requestedPrivileges - New list of requested privileges.
 * @property requestedUnitIds - New list of units.
 * @property documents - New list of documents.
 * @property temporary - New temporary request; type `temporary` only.
 * @property version - Version the caller read.
 * @property reason - Why, kept in the change history.
 */
export interface UpdateApplicationInput {
  requestedPrivileges?: RequestedPrivilegeInput[]
  requestedUnitIds?: string[]
  documents?: ApplicationDocumentInput[]
  temporary?: TemporaryInput | null
  version?: number
  reason?: string
}

/**
 * Data of a withdrawal.
 *
 * @property reason - Why; required.
 * @property version - Version the caller read.
 */
export interface WithdrawApplicationInput {
  reason: string
  version?: number
}

/**
 * Data of a submission.
 *
 * @property version - Version the caller read.
 * @property reason - Why, kept in the change history.
 */
export interface SubmitApplicationInput {
  version?: number
  reason?: string
}

/**
 * The stored parts of an application that the content checks produce.
 */
interface CheckedContent {
  requested_privileges: RequestedPrivilege[]
  requested_unit_ids: string[]
  requested_facility_ids: string[]
  documents: ApplicationDocument[]
  items: PrivilegeCatalogItem[]
}

/**
 * Credential applications, the part HR prepares and the committee queue (HR plan 4.2, part 1):
 * create, edit, submit, withdraw and the work queue. Never deletes.
 */
@Injectable()
export class ApplicationService {
  /**
   * @param applications - Application repository.
   * @param employees - Employee repository.
   * @param facilities - Facility repository.
   * @param units - Unit repository.
   * @param catalog - Privilege catalog repository.
   * @param licenses - Licence repository, for the temporary-privilege licence check.
   * @param appointments - SPK repository, for the SPK a renewal names.
   * @param grants - Grant repository, for the privileges an extension must not repeat.
   * @param concepts - Code concepts, for the committee, the evidence types and the level ranks.
   * @param parameters - HR parameters (`CREDENTIALING_SCOPE`, `TEMPORARY_PRIVILEGE_MAX_DAYS`).
   * @param logger - Logger of this service.
   */
  constructor(
    @Inject(REPOSITORY_CREDENTIAL_APPLICATION)
    private readonly applications: CredentialApplicationRepository,
    @Inject(REPOSITORY_EMPLOYEE)
    private readonly employees: EmployeeRepository,
    @Inject(REPOSITORY_FACILITY)
    private readonly facilities: FacilityRepository,
    @Inject(REPOSITORY_ORGANIZATION_UNIT)
    private readonly units: OrganizationUnitRepository,
    @Inject(REPOSITORY_PRIVILEGE_CATALOG)
    private readonly catalog: PrivilegeCatalogRepository,
    @Inject(REPOSITORY_PROFESSIONAL_LICENSE)
    private readonly licenses: ProfessionalLicenseRepository,
    @Inject(REPOSITORY_CLINICAL_APPOINTMENT)
    private readonly appointments: ClinicalAppointmentRepository,
    @Inject(REPOSITORY_PRIVILEGE_GRANT)
    private readonly grants: PrivilegeGrantRepository,
    @Inject(CodeConceptService) private readonly concepts: CodeConceptService,
    @Inject(ParameterService) private readonly parameters: ParameterService,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /**
   * Lists applications, the oldest status first: the committee work queue. Writes no log entry (a
   * read).
   *
   * @param tenantId - Tenant of the caller.
   * @param query - Filters and paging; `olderThanDays` counts from the start of the status.
   * @returns The applications.
   */
  list(
    tenantId: string,
    query: Omit<ApplicationQuery, 'statusBefore'> & { olderThanDays?: number },
  ): Promise<CredentialApplication[]> {
    const { olderThanDays, ...rest } = query
    return this.applications.findByFilter(tenantId, {
      ...rest,
      ...(olderThanDays === undefined
        ? {}
        : { statusBefore: new Date(Date.now() - olderThanDays * 86_400_000) }),
    })
  }

  /**
   * Returns one application. Writes no log entry (a read).
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Application identifier.
   * @returns The application.
   * @throws NotFoundError `application_not_found`.
   */
  get(tenantId: string, id: string): Promise<CredentialApplication> {
    return this.load(tenantId, id)
  }

  /**
   * Starts an application as a draft (HR plan 4.2 AP3 to AP8).
   *
   * @param tenantId - Tenant of the caller.
   * @param input - The application.
   * @returns The created draft.
   * @throws InvalidRequestError `type_not_supported`, `employee_not_found`, `employee_separated`,
   * `employee_not_clinical`, `facility_not_found`, `facility_inactive`, `committee_not_configured`,
   * `temporary_required`, `temporary_not_allowed`, `invalid_days`, `invalid_urgency`,
   * `license_not_valid` and the codes of `checkContent`.
   */
  create(
    tenantId: string,
    input: CreateApplicationInput,
  ): Promise<CredentialApplication> {
    return observe(
      this.logger,
      'application_create',
      `${NAME}.create`,
      async () => {
        if (!SUPPORTED_TYPES.includes(input.type)) {
          throw new InvalidRequestError(
            'type_not_supported',
            'The application type is not supported.',
          )
        }
        const previousId = this.previousOf(input.type, input.previousAppointmentId)
        const employee = await this.applicant(tenantId, input.employeeId)
        const facility = await this.facility(tenantId, input.credentialingFacilityId)
        const committee = await this.committeeOf(tenantId, employee)
        const scope = await this.scopeOf(tenantId, facility.id)
        const content = await this.checkContent(tenantId, employee, facility, scope, {
          requestedPrivileges: input.requestedPrivileges,
          requestedUnitIds: input.requestedUnitIds,
          documents: input.documents ?? [],
        })
        if (previousId !== null) {
          await this.checkRenewal(
            tenantId,
            employee,
            facility,
            input.type,
            previousId,
            content.requested_privileges,
          )
        }
        const temporary = await this.checkTemporary(
          tenantId,
          input.type,
          input.temporary ?? null,
          facility.id,
        )
        if (input.type === 'temporary') {
          await this.assertValidLicences(
            tenantId,
            employee.id,
            content.requested_facility_ids,
          )
        }
        const write = (): Promise<CredentialApplication> =>
          this.applications.create({
            tenant_id: tenantId,
            employee_id: employee.id,
            credentialing_facility_id: facility.id,
            credentialing_scope: scope,
            type: input.type,
            committee,
            status: 'draft',
            status_since: new Date(),
            requested_privileges: content.requested_privileges,
            requested_unit_ids: content.requested_unit_ids,
            requested_facility_ids: content.requested_facility_ids,
            documents: content.documents,
            assessors: [],
            recommendation: null,
            decision: null,
            return_reason: null,
            withdrawal_reason: null,
            temporary,
            previous_appointment_id: previousId,
          })
        return input.reason ? withChangeReason(input.reason, write) : write()
      },
    )
  }

  /**
   * Edits a draft or a returned application. A returned one goes back to draft (HR plan 4.2 AP9
   * and AP18). The whole application is checked again with the new parts.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Application identifier.
   * @param input - Parts to change, optional version and reason.
   * @returns The updated application.
   * @throws NotFoundError `application_not_found`.
   * @throws InvalidRequestError `application_not_editable`, `empty_update`,
   * `temporary_not_allowed` and the codes of `checkContent` and `checkTemporary`.
   * @throws ConflictError `stale_version`.
   */
  update(
    tenantId: string,
    id: string,
    input: UpdateApplicationInput,
  ): Promise<CredentialApplication> {
    return observe(
      this.logger,
      'application_update',
      `${NAME}.update`,
      async () => {
        const application = await this.load(tenantId, id)
        if (application.status !== 'draft' && application.status !== 'returned') {
          throw new InvalidRequestError(
            'application_not_editable',
            'Only a draft or a returned application can be edited.',
          )
        }
        if (
          input.requestedPrivileges === undefined &&
          input.requestedUnitIds === undefined &&
          input.documents === undefined &&
          input.temporary === undefined
        ) {
          throw new InvalidRequestError(
            'empty_update',
            'Send at least one part to change.',
          )
        }
        this.assertVersion(application, input.version)
        const employee = await this.applicant(tenantId, application.employee_id)
        const facility = await this.facility(
          tenantId,
          application.credentialing_facility_id,
        )
        const content = await this.checkContent(
          tenantId,
          employee,
          facility,
          application.credentialing_scope,
          {
            requestedPrivileges:
              input.requestedPrivileges ??
              application.requested_privileges.map((item) => ({
                catalogItemId: item.catalog_item_id,
                requestedCondition: item.requested_condition,
                proposedSupervisorEmployeeId: item.proposed_supervisor_employee_id,
                notes: item.notes,
              })),
            requestedUnitIds:
              input.requestedUnitIds ?? application.requested_unit_ids,
            documents:
              input.documents ??
              application.documents.map((document) => ({
                type: document.type,
                file: document.file,
                licenseId: document.license_id,
              })),
          },
        )
        if (application.previous_appointment_id !== null) {
          await this.checkRenewal(
            tenantId,
            employee,
            facility,
            application.type,
            application.previous_appointment_id,
            content.requested_privileges,
            application.id,
          )
        }
        const temporary =
          input.temporary === undefined
            ? application.temporary
            : await this.checkTemporary(
                tenantId,
                application.type,
                input.temporary,
                facility.id,
              )
        const returned = application.status === 'returned'
        return this.write(application, input.reason, () =>
          this.applications.update(
            application.id,
            {
              requested_privileges: content.requested_privileges,
              requested_unit_ids: content.requested_unit_ids,
              requested_facility_ids: content.requested_facility_ids,
              documents: content.documents,
              temporary,
              ...(returned ? { status: 'draft', status_since: new Date() } : {}),
            },
            { expectedVersion: input.version },
          ),
        )
      },
    )
  }

  /**
   * Sends a draft to the committee. Every mandatory evidence type of every requested privilege
   * must be attached (HR plan 4.2 AP8).
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Application identifier.
   * @param input - Optional version and reason.
   * @returns The submitted application.
   * @throws NotFoundError `application_not_found`.
   * @throws InvalidRequestError `invalid_transition` or `evidence_missing`.
   * @throws ConflictError `stale_version`.
   */
  submit(
    tenantId: string,
    id: string,
    input: SubmitApplicationInput,
  ): Promise<CredentialApplication> {
    return observe(
      this.logger,
      'application_submit',
      `${NAME}.submit`,
      async () => {
        const application = await this.load(tenantId, id)
        if (application.status !== 'draft') {
          throw this.invalidTransition('Only a draft can be submitted.')
        }
        this.assertVersion(application, input.version)
        const mandatory: Coding[] = []
        for (const requested of application.requested_privileges) {
          const item = await this.catalog.findOne(requested.catalog_item_id)
          for (const evidence of item?.required_evidence ?? []) {
            if (evidence.mandatory) {
              mandatory.push(evidence.type)
            }
          }
        }
        const missing = missingEvidence(
          mandatory,
          application.documents.map((document) => document.type),
        )
        if (missing.length > 0) {
          throw new InvalidRequestError(
            'evidence_missing',
            `Mandatory evidence is missing: ${missing.join(', ')}.`,
          )
        }
        return this.write(application, input.reason, () =>
          this.applications.update(
            application.id,
            { status: 'submitted', status_since: new Date() },
            { expectedVersion: input.version },
          ),
        )
      },
    )
  }

  /**
   * The applicant withdraws before assessment (HR plan 4.2 AP9 and AP16).
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Application identifier.
   * @param input - Reason and optional version.
   * @returns The withdrawn application.
   * @throws NotFoundError `application_not_found`.
   * @throws InvalidRequestError `invalid_transition`, `reason_required` or `invalid_reason`.
   * @throws ConflictError `stale_version`.
   */
  withdraw(
    tenantId: string,
    id: string,
    input: WithdrawApplicationInput,
  ): Promise<CredentialApplication> {
    return observe(
      this.logger,
      'application_withdraw',
      `${NAME}.withdraw`,
      async () => {
        const application = await this.load(tenantId, id)
        if (
          !['draft', 'submitted', 'under_review', 'returned'].includes(
            application.status,
          )
        ) {
          throw this.invalidTransition(
            'An application can be withdrawn only before it is assessed.',
          )
        }
        const reason = cleanReason(input.reason)
        this.assertVersion(application, input.version)
        return this.write(application, reason, () =>
          this.applications.update(
            application.id,
            {
              status: 'withdrawn',
              status_since: new Date(),
              withdrawal_reason: reason,
            },
            { expectedVersion: input.version },
          ),
        )
      },
    )
  }

  /**
   * Checks that the SPK to renew is named exactly when the type needs one (HR plan 4.4 RN2).
   *
   * @param type - Application type.
   * @param previousAppointmentId - The SPK as sent.
   * @returns The SPK identifier for a renewal, otherwise `null`.
   * @throws InvalidRequestError `previous_appointment_required` or `previous_appointment_not_allowed`.
   */
  private previousOf(
    type: CredentialApplicationType,
    previousAppointmentId: string | null | undefined,
  ): string | null {
    const previousId = previousAppointmentId ?? null
    if (RENEWAL_TYPES.includes(type)) {
      if (previousId === null) {
        throw new InvalidRequestError(
          'previous_appointment_required',
          'A renewal names the SPK it renews.',
        )
      }
      return previousId
    }
    if (previousId !== null) {
      throw new InvalidRequestError(
        'previous_appointment_not_allowed',
        'Only a re-credentialing or a privilege extension names an SPK.',
      )
    }
    return null
  }

  /**
   * Checks the SPK a renewal names and the privileges an extension asks for (HR plan 4.4 RN2 to
   * RN5): an active regular SPK of the applicant at the credentialing facility, with no other
   * open renewal, and for an extension only privileges the SPK does not hold.
   *
   * @param tenantId - Tenant of the caller.
   * @param employee - The applicant.
   * @param facility - The credentialing facility.
   * @param type - `recredentialing` or `privilege_extension`.
   * @param previousId - The SPK being renewed.
   * @param requested - The requested privileges as they will be stored.
   * @param selfId - This application, when it is edited, so it does not clash with itself.
   * @throws InvalidRequestError `previous_appointment_not_found`, `previous_appointment_mismatch`,
   * `previous_appointment_not_regular`, `previous_appointment_not_active` or
   * `privilege_already_granted`.
   * @throws ConflictError `renewal_exists`.
   */
  private async checkRenewal(
    tenantId: string,
    employee: Employee,
    facility: Facility,
    type: CredentialApplicationType,
    previousId: string,
    requested: RequestedPrivilege[],
    selfId?: string,
  ): Promise<void> {
    const spk = await this.appointments.findOne(previousId)
    if (!spk || spk.tenant_id !== tenantId || spk.deleted_at) {
      throw new InvalidRequestError(
        'previous_appointment_not_found',
        'The SPK to renew was not found.',
      )
    }
    if (
      spk.employee_id !== employee.id ||
      spk.credentialing_facility_id !== facility.id
    ) {
      throw new InvalidRequestError(
        'previous_appointment_mismatch',
        'The SPK must be the applicant\'s own SPK at the credentialing facility.',
      )
    }
    if (spk.is_temporary) {
      throw new InvalidRequestError(
        'previous_appointment_not_regular',
        'A temporary SPK is not renewed.',
      )
    }
    if (spk.status !== 'active') {
      throw new InvalidRequestError(
        'previous_appointment_not_active',
        'Only an active SPK can be renewed; a suspension is lifted first.',
      )
    }
    const open = await this.applications.findOpenRenewal(tenantId, spk.id)
    if (open && open.id !== selfId) {
      throw new ConflictError(
        'renewal_exists',
        'This SPK has an open renewal application already.',
      )
    }
    if (type === 'privilege_extension') {
      const held = new Set(
        (await this.grants.findByAppointment(tenantId, spk.id))
          .filter(
            (grant) => grant.status === 'active' || grant.status === 'suspended',
          )
          .map((grant) => grant.catalog_item_id),
      )
      if (requested.some((item) => held.has(item.catalog_item_id))) {
        throw new InvalidRequestError(
          'privilege_already_granted',
          'An extension asks only for privileges the SPK does not hold.',
        )
      }
    }
  }

  /**
   * Checks the applicant: an employee of the tenant who has not separated, is clinical and has a
   * profession (HR plan 4.2 AP4).
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - Employee identifier.
   * @returns The employee.
   * @throws InvalidRequestError `employee_not_found`, `employee_separated` or `employee_not_clinical`.
   */
  private async applicant(
    tenantId: string,
    employeeId: string,
  ): Promise<Employee> {
    const employee = await this.employees.findOne(employeeId)
    if (!employee || employee.tenant_id !== tenantId) {
      throw new InvalidRequestError(
        'employee_not_found',
        'The employee was not found.',
      )
    }
    if (employee.employment_status === 'separated') {
      throw new InvalidRequestError(
        'employee_separated',
        'The employee has separated.',
      )
    }
    if (!employee.is_clinical || !employee.profession) {
      throw new InvalidRequestError(
        'employee_not_clinical',
        'Only a clinical employee with a profession can apply for privileges.',
      )
    }
    return employee
  }

  /**
   * Loads an active facility of the tenant.
   *
   * @param tenantId - Tenant of the caller.
   * @param facilityId - Facility identifier.
   * @returns The facility.
   * @throws InvalidRequestError `facility_not_found` or `facility_inactive`.
   */
  private async facility(
    tenantId: string,
    facilityId: string,
  ): Promise<Facility> {
    const facility = await this.facilities.findOne(facilityId)
    if (!facility || facility.tenant_id !== tenantId || facility.deleted_at) {
      throw new InvalidRequestError(
        'facility_not_found',
        'The facility was not found.',
      )
    }
    if (facility.status !== 'active') {
      throw new InvalidRequestError(
        'facility_inactive',
        'The facility is not active.',
      )
    }
    return facility
  }

  /**
   * Reads the credentialing committee from the employee's workforce category and checks it.
   *
   * @param tenantId - Tenant of the caller.
   * @param employee - The applicant.
   * @returns The committee code.
   * @throws InvalidRequestError `committee_not_configured`.
   */
  private async committeeOf(
    tenantId: string,
    employee: Employee,
  ): Promise<Coding> {
    const category = await this.concepts.resolve(
      tenantId,
      employee.workforce_category.system,
      employee.workforce_category.code,
    )
    const code = category?.properties?.credentialing_committee
    const dot = employee.workforce_category.system.indexOf('.')
    if (typeof code !== 'string' || code.length === 0 || dot < 1) {
      throw new InvalidRequestError(
        'committee_not_configured',
        'The workforce category of the employee names no credentialing committee.',
      )
    }
    const committee = {
      system: `${employee.workforce_category.system.slice(0, dot)}.committee`,
      code,
    }
    await this.concepts.assertActive(tenantId, committee)
    return committee
  }

  /**
   * Reads the credentialing scope parameter for a facility (decision C7).
   *
   * @param tenantId - Tenant of the caller.
   * @param facilityId - The credentialing facility.
   * @returns `facility` or `group`.
   */
  private async scopeOf(
    tenantId: string,
    facilityId: string,
  ): Promise<CredentialingScope> {
    const value = await this.parameters.resolve(tenantId, {
      key: 'CREDENTIALING_SCOPE',
      facilityId,
    })
    return value.value === 'group' ? 'group' : 'facility'
  }

  /**
   * Checks the requested privileges, the units and the documents against the applicant and the
   * catalog (HR plan 4.2 AP5, AP6 and AP8).
   *
   * @param tenantId - Tenant of the caller.
   * @param employee - The applicant.
   * @param facility - The credentialing facility.
   * @param scope - The credentialing scope of the application.
   * @param parts - The parts as they will be stored.
   * @returns The cleaned parts and the catalog items.
   * @throws InvalidRequestError `invalid_privileges`, `duplicate_privilege`, `privilege_not_found`,
   * `privilege_retired`, `privilege_not_open`, `level_not_met`, `invalid_condition`,
   * `supervisor_required`, `supervisor_not_allowed`, `supervisor_invalid`, `invalid_notes`,
   * `invalid_units`, `duplicate_unit`, `unit_not_found`, `unit_closed`, `unit_outside_facility`,
   * `invalid_documents`, `invalid_document`, `invalid_document_type`, `license_not_found`,
   * `unknown_code`, `code_retired` or `code_not_in_period`.
   */
  private async checkContent(
    tenantId: string,
    employee: Employee,
    facility: Facility,
    scope: CredentialingScope,
    parts: {
      requestedPrivileges: RequestedPrivilegeInput[]
      requestedUnitIds: string[]
      documents: ApplicationDocumentInput[]
    },
  ): Promise<CheckedContent> {
    const privileges = parts.requestedPrivileges
    if (privileges.length < 1 || privileges.length > LIMITS.privileges) {
      throw new InvalidRequestError(
        'invalid_privileges',
        'An application needs 1 to 50 requested privileges.',
      )
    }
    if (hasRepeats(privileges.map((item) => item.catalogItemId))) {
      throw new InvalidRequestError(
        'duplicate_privilege',
        'A privilege is requested twice.',
      )
    }
    const items: PrivilegeCatalogItem[] = []
    const requested: RequestedPrivilege[] = []
    for (const input of privileges) {
      const item = await this.catalog.findOne(input.catalogItemId)
      if (!item || item.tenant_id !== tenantId || item.deleted_at) {
        throw new InvalidRequestError(
          'privilege_not_found',
          'A requested privilege was not found in the catalog.',
        )
      }
      await this.checkItem(tenantId, employee, facility, item)
      requested.push(await this.checkRequest(tenantId, employee, item, input))
      items.push(item)
    }

    const unitIds = parts.requestedUnitIds
    if (unitIds.length < 1 || unitIds.length > LIMITS.units) {
      throw new InvalidRequestError(
        'invalid_units',
        'An application needs 1 to 50 units.',
      )
    }
    if (hasRepeats(unitIds)) {
      throw new InvalidRequestError('duplicate_unit', 'A unit appears twice.')
    }
    const facilityIds = new Set<string>()
    for (const unitId of unitIds) {
      const unit = await this.units.findOne(unitId)
      if (!unit || unit.tenant_id !== tenantId || unit.deleted_at) {
        throw new InvalidRequestError(
          'unit_not_found',
          'A requested unit was not found.',
        )
      }
      if (unit.status !== 'active') {
        throw new InvalidRequestError('unit_closed', 'A requested unit is closed.')
      }
      if (scope === 'facility' && unit.facility_id !== facility.id) {
        throw new InvalidRequestError(
          'unit_outside_facility',
          'Every unit must belong to the credentialing facility.',
        )
      }
      facilityIds.add(unit.facility_id)
    }

    const documents = await this.checkDocuments(
      tenantId,
      employee.id,
      parts.documents,
    )
    return {
      requested_privileges: requested,
      requested_unit_ids: unitIds,
      requested_facility_ids: [...facilityIds],
      documents,
      items,
    }
  }

  /**
   * Checks that the applicant may request a catalog item (HR-CRD-007): active, open to the
   * profession, the primary specialty, the career level and the credentialing facility.
   *
   * @param tenantId - Tenant of the caller.
   * @param employee - The applicant.
   * @param facility - The credentialing facility.
   * @param item - The catalog item.
   * @throws InvalidRequestError `privilege_retired`, `privilege_not_open` or `level_not_met`.
   */
  private async checkItem(
    tenantId: string,
    employee: Employee,
    facility: Facility,
    item: PrivilegeCatalogItem,
  ): Promise<void> {
    if (item.status !== 'active') {
      throw new InvalidRequestError(
        'privilege_retired',
        'A requested privilege is retired.',
      )
    }
    const profession = employee.profession as Coding
    const professionOk = item.professions.some(
      (coding) =>
        coding.system === profession.system && coding.code === profession.code,
    )
    const primary = employee.specialties.find((entry) => entry.is_primary)
    const specialtyOk =
      item.specialties.length === 0 ||
      (primary !== undefined &&
        item.specialties.some(
          (coding) =>
            coding.system === primary.coding.system &&
            coding.code === primary.coding.code,
        ))
    const facilityOk =
      item.facility_ids.length === 0 || item.facility_ids.includes(facility.id)
    if (!professionOk || !specialtyOk || !facilityOk) {
      throw new InvalidRequestError(
        'privilege_not_open',
        'A requested privilege is not open to this applicant or this facility.',
      )
    }
    if (item.min_clinical_level) {
      const needed = levelRank(
        (
          await this.concepts.resolve(
            tenantId,
            item.min_clinical_level.system,
            item.min_clinical_level.code,
          )
        )?.properties,
      )
      const held = employee.clinical_level
        ? levelRank(
            (
              await this.concepts.resolve(
                tenantId,
                employee.clinical_level.system,
                employee.clinical_level.code,
              )
            )?.properties,
          )
        : null
      if (needed === null || held === null || held < needed) {
        throw new InvalidRequestError(
          'level_not_met',
          'The applicant does not hold the career level a requested privilege needs.',
        )
      }
    }
  }

  /**
   * Checks one request: the condition, the supervisor and the notes.
   *
   * @param tenantId - Tenant of the caller.
   * @param employee - The applicant.
   * @param item - The catalog item.
   * @param input - The request as sent.
   * @returns The request as it will be stored.
   * @throws InvalidRequestError `invalid_condition`, `supervisor_required`, `supervisor_not_allowed`,
   * `supervisor_invalid` or `invalid_notes`.
   */
  private async checkRequest(
    tenantId: string,
    employee: Employee,
    item: PrivilegeCatalogItem,
    input: RequestedPrivilegeInput,
  ): Promise<RequestedPrivilege> {
    if (!['full', 'supervised', 'restricted'].includes(input.requestedCondition)) {
      throw new InvalidRequestError(
        'invalid_condition',
        'The condition must be full, supervised or restricted.',
      )
    }
    const supervisorId = input.proposedSupervisorEmployeeId ?? null
    if (input.requestedCondition === 'supervised' && supervisorId === null) {
      throw new InvalidRequestError(
        'supervisor_required',
        'A supervised privilege needs a proposed supervisor.',
      )
    }
    if (input.requestedCondition !== 'supervised' && supervisorId !== null) {
      throw new InvalidRequestError(
        'supervisor_not_allowed',
        'Only a supervised privilege has a supervisor.',
      )
    }
    if (supervisorId !== null) {
      const supervisor = await this.employees.findOne(supervisorId)
      if (
        !supervisor ||
        supervisor.tenant_id !== tenantId ||
        supervisor.id === employee.id ||
        supervisor.employment_status === 'separated'
      ) {
        throw new InvalidRequestError(
          'supervisor_invalid',
          'The proposed supervisor must be another employee of the tenant who has not separated.',
        )
      }
    }
    const notes = (input.notes ?? '').trim()
    if (notes.length > LIMITS.notes) {
      throw new InvalidRequestError(
        'invalid_notes',
        'The notes can have at most 500 characters.',
      )
    }
    return {
      catalog_item_id: item.id,
      code: item.code,
      requested_condition: input.requestedCondition,
      proposed_supervisor_employee_id: supervisorId,
      notes: notes.length > 0 ? notes : null,
    }
  }

  /**
   * Checks the attached documents: the type, the file reference and the licence link.
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - The applicant.
   * @param documents - The documents as sent.
   * @returns The documents as they will be stored.
   * @throws InvalidRequestError `invalid_documents`, `invalid_document`, `invalid_document_type`,
   * `license_not_found`, `unknown_code`, `code_retired` or `code_not_in_period`.
   */
  private async checkDocuments(
    tenantId: string,
    employeeId: string,
    documents: ApplicationDocumentInput[],
  ): Promise<ApplicationDocument[]> {
    if (documents.length > LIMITS.documents) {
      throw new InvalidRequestError(
        'invalid_documents',
        'There can be at most 30 documents.',
      )
    }
    const stored: ApplicationDocument[] = []
    for (const document of documents) {
      if (!SYSTEMS.evidence.test(document.type.system)) {
        throw new InvalidRequestError(
          'invalid_document_type',
          'The document type must come from an evidence-type code system.',
        )
      }
      await this.concepts.assertActive(tenantId, document.type)
      if (!isValidDocumentRef(document.file)) {
        throw new InvalidRequestError(
          'invalid_document',
          'A document needs a file id, a PDF, JPEG or PNG content type and a SHA-256 hash.',
        )
      }
      const licenseId = document.licenseId ?? null
      if (licenseId !== null) {
        const license = await this.licenses.findOne(licenseId)
        if (
          !license ||
          license.tenant_id !== tenantId ||
          license.employee_id !== employeeId
        ) {
          throw new InvalidRequestError(
            'license_not_found',
            'A linked licence was not found for this applicant.',
          )
        }
      }
      stored.push({
        type: { system: document.type.system, code: document.type.code },
        file: {
          file_id: document.file.file_id,
          content_type: document.file.content_type,
          sha256: document.file.sha256.toLowerCase(),
        },
        license_id: licenseId,
      })
    }
    return stored
  }

  /**
   * Checks the temporary request: needed for type `temporary`, refused for the others, at most
   * `TEMPORARY_PRIVILEGE_MAX_DAYS` days (HR plan 4.2 AP3).
   *
   * @param tenantId - Tenant of the caller.
   * @param type - Application type.
   * @param temporary - The request as sent, or `null`.
   * @param facilityId - The credentialing facility, for the parameter.
   * @returns The request as it will be stored, or `null`.
   * @throws InvalidRequestError `temporary_required`, `temporary_not_allowed`, `invalid_days`,
   * `invalid_urgency`, `unknown_code`, `code_retired` or `code_not_in_period`.
   */
  private async checkTemporary(
    tenantId: string,
    type: CredentialApplicationType,
    temporary: TemporaryInput | null,
    facilityId: string,
  ): Promise<CredentialApplication['temporary']> {
    if (type !== 'temporary') {
      if (temporary !== null) {
        throw new InvalidRequestError(
          'temporary_not_allowed',
          'Only a temporary application has a temporary request.',
        )
      }
      return null
    }
    if (temporary === null) {
      throw new InvalidRequestError(
        'temporary_required',
        'A temporary application needs the number of days and the urgency.',
      )
    }
    const max = await this.parameters.resolve(tenantId, {
      key: 'TEMPORARY_PRIVILEGE_MAX_DAYS',
      facilityId,
    })
    if (
      !Number.isInteger(temporary.requestedDays) ||
      temporary.requestedDays < 1 ||
      temporary.requestedDays > Number(max.value)
    ) {
      throw new InvalidRequestError(
        'invalid_days',
        'The days must be a whole number up to the longest temporary period.',
      )
    }
    if (!SYSTEMS.urgency.test(temporary.urgency.system)) {
      throw new InvalidRequestError(
        'invalid_urgency',
        'The urgency must come from a temporary-urgency code system.',
      )
    }
    await this.concepts.assertActive(tenantId, temporary.urgency)
    return {
      requested_days: temporary.requestedDays,
      urgency: {
        system: temporary.urgency.system,
        code: temporary.urgency.code,
      },
    }
  }

  /**
   * A temporary privilege still needs a valid registration and a valid practice permit for each
   * requested facility (HR-LIC-001, HR plan 4.2 AP3).
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - The applicant.
   * @param facilityIds - Facilities of the requested units.
   * @throws InvalidRequestError `license_not_valid`.
   */
  private async assertValidLicences(
    tenantId: string,
    employeeId: string,
    facilityIds: string[],
  ): Promise<void> {
    const valid = (await this.licenses.findByEmployee(tenantId, employeeId)).filter(
      (license) => license.status === 'valid',
    )
    const registration = valid.some(
      (license) => license.eligibility_role === 'registration',
    )
    const permits = facilityIds.every((facilityId) =>
      valid.some(
        (license) =>
          license.eligibility_role === 'practice_permit' &&
          license.practice_location?.facility_id === facilityId,
      ),
    )
    if (!registration || !permits) {
      throw new InvalidRequestError(
        'license_not_valid',
        'A temporary application needs a valid registration and a valid practice permit for each requested facility.',
      )
    }
  }

  /**
   * Loads an application of the caller's tenant.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Application identifier.
   * @returns The application.
   * @throws NotFoundError `application_not_found`.
   */
  private load(tenantId: string, id: string): Promise<CredentialApplication> {
    return loadApplication(this.applications, tenantId, id)
  }

  /**
   * Refuses a stale version before any write.
   *
   * @param application - The application as read.
   * @param version - Version the caller read.
   * @throws ConflictError `stale_version`.
   */
  private assertVersion(
    application: CredentialApplication,
    version: number | undefined,
  ): void {
    assertApplicationVersion(application, version)
  }

  /**
   * Runs a repository write, with the change reason when given, and turns repository rejections
   * into workforce errors.
   *
   * @param _application - The application as read before the write.
   * @param reason - Optional reason for the change history.
   * @param write - The repository call.
   * @returns What the call returns.
   */
  private write(
    _application: CredentialApplication,
    reason: string | undefined,
    write: () => Promise<CredentialApplication>,
  ): Promise<CredentialApplication> {
    return writeApplication(reason, write)
  }

  /**
   * @param message - What is allowed.
   * @returns The error for a move outside the status table.
   */
  private invalidTransition(message: string): InvalidRequestError {
    return invalidTransition(message)
  }
}
