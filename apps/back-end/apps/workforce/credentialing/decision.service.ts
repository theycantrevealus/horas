import { Inject, Injectable } from '@nestjs/common'
import { RepositoryConflictError } from '@utility/database/error'
import { type NewEntity } from '@utility/database/interface'
import {
  TRANSACTION_MANAGER,
  type TransactionManager,
} from '@utility/database/transaction'
import { type ActorRef } from '@utility/history/actor'
import { getRequestContext } from '@utility/logger/context'
import { AppLogger } from '@utility/logger/service'
import { isLocalDate, todayInZone } from '@utility/validation/local-date'
import { type ClinicalAppointmentRepository } from '@repository/interface/clinical-appointment'
import { type CredentialApplicationRepository } from '@repository/interface/credential-application'
import { type EmployeeRepository } from '@repository/interface/employee'
import { type FacilityRepository } from '@repository/interface/facility'
import { type PrivilegeCatalogRepository } from '@repository/interface/privilege-catalog'
import { type PrivilegeGrantRepository } from '@repository/interface/privilege-grant'
import { type ProfessionalLicenseRepository } from '@repository/interface/professional-license'
import { type ClinicalAppointment } from '@repository/model/clinical-appointment'
import { type FileRef } from '@repository/model/common/file-ref'
import {
  type CredentialApplication,
  type RecommendedPrivilege,
} from '@repository/model/credential-application'
import { type Facility } from '@repository/model/facility'
import { type PrivilegeGrant } from '@repository/model/privilege-grant'
import {
  REPOSITORY_CLINICAL_APPOINTMENT,
  REPOSITORY_CREDENTIAL_APPLICATION,
  REPOSITORY_EMPLOYEE,
  REPOSITORY_FACILITY,
  REPOSITORY_PRIVILEGE_CATALOG,
  REPOSITORY_PRIVILEGE_GRANT,
  REPOSITORY_PROFESSIONAL_LICENSE,
} from '@repository/token'
import { repointDependents } from '../appointment/supervisor-links'
import { isValidDocumentRef } from '../license/license-rules'
import { observe } from '../observe'
import { ParameterService } from '../parameter/parameter.service'
import {
  ConflictError,
  ForbiddenError,
  InvalidRequestError,
} from '../workforce.error'
import {
  APPOINTMENT_NUMBER,
  isLicenseValidOn,
  latestEnd,
} from './appointment-rules'
import {
  assertApplicationVersion,
  cleanReason,
  invalidTransition,
  loadApplication,
  writeApplication,
} from './application-support'

const NAME = 'DecisionService'

/**
 * Data of the Director's decision.
 *
 * @property outcome - `approved` or `rejected`.
 * @property reason - Needed when rejected (1 to 500 characters); optional note when approved.
 * @property appointmentNumber - The SPK letter number; needed when approved.
 * @property validUntil - Last valid day; defaults to the longest allowed.
 * @property signedDocument - Scan of the signed letter.
 * @property version - Version of the application the caller read.
 */
export interface DecideInput {
  outcome: 'approved' | 'rejected'
  reason?: string
  appointmentNumber?: string
  validUntil?: string
  signedDocument?: FileRef | null
  version?: number
}

/**
 * What a decision produced.
 *
 * @property application - The decided application.
 * @property appointment - The SPK, or `null` when rejected.
 * @property grants - The SPK's grants, empty when rejected.
 */
export interface DecisionResult {
  application: CredentialApplication
  appointment: ClinicalAppointment | null
  grants: PrivilegeGrant[]
}

/**
 * The Director's decision on a recommended credential application (HR plan 4.3, part 1):
 * approving issues the SPK and its privilege grants, rejecting ends the application. Never
 * deletes.
 */
@Injectable()
export class DecisionService {
  /**
   * @param applications - Application repository.
   * @param employees - Employee repository.
   * @param facilities - Facility repository, for the time zone of the issue date.
   * @param catalog - Privilege catalog repository.
   * @param licenses - Licence repository (HR-CRD-002).
   * @param appointments - Clinical appointment (SPK) repository.
   * @param grants - Privilege grant repository.
   * @param parameters - HR parameters (`SPK_VALIDITY_YEARS`).
   * @param transactions - Transaction manager of the main connection.
   * @param logger - Logger of this service.
   */
  constructor(
    @Inject(REPOSITORY_CREDENTIAL_APPLICATION)
    private readonly applications: CredentialApplicationRepository,
    @Inject(REPOSITORY_EMPLOYEE)
    private readonly employees: EmployeeRepository,
    @Inject(REPOSITORY_FACILITY)
    private readonly facilities: FacilityRepository,
    @Inject(REPOSITORY_PRIVILEGE_CATALOG)
    private readonly catalog: PrivilegeCatalogRepository,
    @Inject(REPOSITORY_PROFESSIONAL_LICENSE)
    private readonly licenses: ProfessionalLicenseRepository,
    @Inject(REPOSITORY_CLINICAL_APPOINTMENT)
    private readonly appointments: ClinicalAppointmentRepository,
    @Inject(REPOSITORY_PRIVILEGE_GRANT)
    private readonly grants: PrivilegeGrantRepository,
    @Inject(ParameterService) private readonly parameters: ParameterService,
    @Inject(TRANSACTION_MANAGER)
    private readonly transactions: TransactionManager,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /**
   * The Director approves or rejects a recommended application (HR plan 4.3 SP1 to SP8).
   *
   * @param tenantId - Tenant of the caller.
   * @param callerEmployeeId - The caller's employee, recorded as the Director, or `null`.
   * @param id - Application identifier.
   * @param input - The decision.
   * @returns The decided application, the SPK and its grants.
   * @throws NotFoundError `application_not_found`.
   * @throws ForbiddenError `director_employee_required` or `decider_is_applicant`.
   * @throws InvalidRequestError `invalid_outcome`, `invalid_transition`, `reason_required`,
   * `invalid_reason`, `invalid_appointment_number`, `invalid_document`, `invalid_validity`,
   * `employee_not_found`, `employee_separated`, `facility_not_found`, `nothing_recommended`,
   * `privilege_not_found`, `privilege_retired`, `license_not_valid` or
   * `supervisor_not_privileged`.
   * @throws ConflictError `appointment_number_exists`, `appointment_exists` or `stale_version`.
   */
  decide(
    tenantId: string,
    callerEmployeeId: string | null,
    id: string,
    input: DecideInput,
  ): Promise<DecisionResult> {
    return observe(
      this.logger,
      'application_decide',
      `${NAME}.decide`,
      async () => {
        if (input.outcome !== 'approved' && input.outcome !== 'rejected') {
          throw new InvalidRequestError(
            'invalid_outcome',
            'The outcome must be approved or rejected.',
          )
        }
        const application = await loadApplication(
          this.applications,
          tenantId,
          id,
        )
        if (callerEmployeeId === null) {
          throw new ForbiddenError(
            'director_employee_required',
            'The deciding account must be linked to an employee.',
          )
        }
        if (callerEmployeeId === application.employee_id) {
          throw new ForbiddenError(
            'decider_is_applicant',
            'The applicant cannot decide their own application.',
          )
        }
        if (application.status !== 'recommended') {
          throw invalidTransition('Only a recommended application can be decided.')
        }
        return input.outcome === 'rejected'
          ? this.reject(application, callerEmployeeId, input)
          : this.approve(tenantId, application, callerEmployeeId, input)
      },
    )
  }

  /**
   * Rejects the application: no SPK, no grants.
   *
   * @param application - The recommended application.
   * @param directorId - The deciding employee.
   * @param input - The decision.
   * @returns The rejected application.
   * @throws InvalidRequestError `reason_required` or `invalid_reason`.
   * @throws ConflictError `stale_version`.
   */
  private async reject(
    application: CredentialApplication,
    directorId: string,
    input: DecideInput,
  ): Promise<DecisionResult> {
    const reason = cleanReason(input.reason as string)
    assertApplicationVersion(application, input.version)
    const now = new Date()
    const updated = await writeApplication(reason, () =>
      this.applications.update(
        application.id,
        {
          status: 'rejected',
          status_since: now,
          decision: {
            outcome: 'rejected',
            decided_by: this.actor(),
            decided_at: now,
            reason,
            appointment_id: null,
          },
        },
        { expectedVersion: application.version },
      ),
    )
    return { application: updated, appointment: null, grants: [] }
  }

  /**
   * Approves the application: checks everything, then writes the SPK, its grants and the
   * application in one transaction.
   *
   * @param tenantId - Tenant of the caller.
   * @param application - The recommended application.
   * @param directorId - The deciding employee.
   * @param input - The decision.
   * @returns The approved application, the SPK and its grants.
   */
  private async approve(
    tenantId: string,
    application: CredentialApplication,
    directorId: string,
    input: DecideInput,
  ): Promise<DecisionResult> {
    const number = input.appointmentNumber ?? ''
    if (!APPOINTMENT_NUMBER.test(number)) {
      throw new InvalidRequestError(
        'invalid_appointment_number',
        'The SPK number needs 1 to 64 upper case letters, digits, slashes, dots or hyphens.',
      )
    }
    const note = input.reason ? cleanReason(input.reason) : null
    if (
      input.signedDocument !== undefined &&
      input.signedDocument !== null &&
      !isValidDocumentRef(input.signedDocument)
    ) {
      throw new InvalidRequestError(
        'invalid_document',
        'The signed letter needs a file id, a PDF, JPEG or PNG content type and a SHA-256 hash.',
      )
    }
    const applicant = await this.employees.findOne(application.employee_id)
    if (!applicant || applicant.tenant_id !== tenantId) {
      throw new InvalidRequestError(
        'employee_not_found',
        'The applicant was not found.',
      )
    }
    if (applicant.employment_status === 'separated') {
      throw new InvalidRequestError(
        'employee_separated',
        'The applicant has separated.',
      )
    }
    const facility = await this.facility(
      tenantId,
      application.credentialing_facility_id,
    )
    const issueDate = todayInZone(facility.timezone)
    const recommended = (application.recommendation?.privileges ?? []).filter(
      (item) => item.outcome === 'recommended',
    )
    if (recommended.length === 0) {
      throw new InvalidRequestError(
        'nothing_recommended',
        'No privilege was recommended; reject the application instead.',
      )
    }
    for (const item of recommended) {
      const privilege = await this.catalog.findOne(item.catalog_item_id)
      if (!privilege || privilege.tenant_id !== tenantId || privilege.deleted_at) {
        throw new InvalidRequestError(
          'privilege_not_found',
          'A recommended privilege was not found in the catalog.',
        )
      }
      if (privilege.status !== 'active') {
        throw new InvalidRequestError(
          'privilege_retired',
          'A recommended privilege is retired.',
        )
      }
    }
    const previous =
      application.previous_appointment_id === null
        ? null
        : await this.previousOf(tenantId, application, issueDate)
    const extension = application.type === 'privilege_extension'
    const oldGrants = previous
      ? await this.grants.findByAppointment(tenantId, previous.id)
      : []
    const carried = extension
      ? oldGrants.filter(
          (grant) => grant.status === 'active' || grant.status === 'suspended',
        )
      : []
    if (
      recommended.some((item) =>
        carried.some((grant) => grant.catalog_item_id === item.catalog_item_id),
      )
    ) {
      throw new InvalidRequestError(
        'privilege_already_granted',
        'An extension grants only privileges the SPK does not hold.',
      )
    }
    const unitIds =
      extension && previous
        ? [...new Set([...previous.unit_ids, ...application.requested_unit_ids])]
        : application.requested_unit_ids
    const facilityIds =
      extension && previous
        ? [
            ...new Set([
              ...previous.facility_ids,
              ...application.requested_facility_ids,
            ]),
          ]
        : application.requested_facility_ids
    await this.assertLicenses(
      tenantId,
      application.employee_id,
      issueDate,
      facilityIds,
    )
    const supervisors = new Map<string, string>()
    for (const item of recommended) {
      if (item.condition === 'supervised') {
        supervisors.set(
          item.catalog_item_id,
          await this.supervisorGrant(tenantId, application, item),
        )
      }
    }
    const end = await this.validEnd(
      tenantId,
      application,
      issueDate,
      input,
      previous,
    )
    if (await this.appointments.findByNumber(tenantId, number)) {
      throw new ConflictError(
        'appointment_number_exists',
        'An SPK with this number exists already.',
      )
    }
    if (
      application.type !== 'temporary' &&
      previous === null &&
      (await this.appointments.findCurrentRegular(
        tenantId,
        application.employee_id,
        application.credentialing_facility_id,
      ))
    ) {
      throw this.appointmentExists()
    }
    assertApplicationVersion(application, input.version)
    const actor = this.actor()
    const now = new Date()
    return this.transactions.run(async () => {
      if (previous) {
        // The old SPK stops being current first, which frees the one-current-SPK index.
        try {
          await this.appointments.update(
            previous.id,
            { status: 'superseded', is_current: false },
            { expectedVersion: previous.version },
          )
        } catch (thrown: unknown) {
          if (thrown instanceof RepositoryConflictError) {
            throw new ConflictError(
              'previous_appointment_changed',
              'The SPK being renewed was changed by someone else.',
            )
          }
          throw thrown
        }
      }
      let appointment: ClinicalAppointment
      try {
        appointment = await this.appointments.create({
          tenant_id: tenantId,
          appointment_number: number,
          employee_id: application.employee_id,
          credentialing_facility_id: application.credentialing_facility_id,
          credentialing_scope: application.credentialing_scope,
          facility_ids: facilityIds,
          unit_ids: unitIds,
          source_application_id: application.id,
          valid_period: { start: issueDate, end },
          is_temporary: application.type === 'temporary',
          status: 'active',
          is_current: true,
          issued: {
            by: actor,
            director_employee_id: directorId,
            date: issueDate,
          },
          signed_document: input.signedDocument ?? null,
          suspension: null,
          revocation: null,
          superseded_by_id: null,
        })
      } catch (thrown: unknown) {
        if (thrown instanceof RepositoryConflictError) {
          throw this.appointmentExists()
        }
        throw thrown
      }
      const created: PrivilegeGrant[] = []
      for (const grant of carried) {
        created.push(
          await this.grants.create({
            tenant_id: tenantId,
            appointment_id: appointment.id,
            employee_id: appointment.employee_id,
            facility_ids: appointment.facility_ids,
            unit_ids: appointment.unit_ids,
            catalog_item_id: grant.catalog_item_id,
            code: grant.code,
            condition: grant.condition,
            supervisor: grant.supervisor,
            restriction_notes: grant.restriction_notes,
            status: grant.status,
            status_change: grant.status_change,
            flag: grant.flag,
          }),
        )
      }
      for (const item of recommended) {
        created.push(
          await this.grants.create(
            this.grantOf(
              tenantId,
              application,
              appointment,
              item,
              supervisors.get(item.catalog_item_id),
            ),
          ),
        )
      }
      if (previous) {
        await this.appointments.update(previous.id, {
          superseded_by_id: appointment.id,
        })
        const replacements = new Map<string, string | null>()
        for (const grant of oldGrants) {
          if (grant.status !== 'active' && grant.status !== 'suspended') {
            continue
          }
          await this.grants.update(grant.id, { status: 'superseded' })
          if (grant.condition === 'full') {
            replacements.set(
              grant.id,
              created.find(
                (next) =>
                  next.catalog_item_id === grant.catalog_item_id &&
                  next.condition === 'full',
              )?.id ?? null,
            )
          }
        }
        await repointDependents(this.grants, tenantId, replacements, now)
      }
      const updated = await writeApplication(note ?? undefined, () =>
        this.applications.update(
          application.id,
          {
            status: 'approved',
            status_since: now,
            decision: {
              outcome: 'approved',
              decided_by: actor,
              decided_at: now,
              reason: note,
              appointment_id: appointment.id,
            },
          },
          { expectedVersion: application.version },
        ),
      )
      return { application: updated, appointment, grants: created }
    })
  }

  /**
   * Loads the SPK a renewal replaces and checks that it can still be renewed (HR plan 4.4 RN6):
   * it is the applicant's own regular SPK at the credentialing facility and still `active`, and
   * for an extension its last valid day is not before the issue date.
   *
   * @param tenantId - Tenant of the caller.
   * @param application - The renewal application.
   * @param issueDate - The issue date.
   * @returns The old SPK.
   * @throws InvalidRequestError `previous_appointment_not_found`, `previous_appointment_mismatch`,
   * `previous_appointment_not_active` or `appointment_lapsed`.
   */
  private async previousOf(
    tenantId: string,
    application: CredentialApplication,
    issueDate: string,
  ): Promise<ClinicalAppointment> {
    const previous = await this.appointments.findOne(
      application.previous_appointment_id as string,
    )
    if (!previous || previous.tenant_id !== tenantId || previous.deleted_at) {
      throw new InvalidRequestError(
        'previous_appointment_not_found',
        'The SPK to renew was not found.',
      )
    }
    if (
      previous.employee_id !== application.employee_id ||
      previous.credentialing_facility_id !== application.credentialing_facility_id
    ) {
      throw new InvalidRequestError(
        'previous_appointment_mismatch',
        'The SPK must be the applicant\'s own SPK at the credentialing facility.',
      )
    }
    if (previous.is_temporary || previous.status !== 'active') {
      throw new InvalidRequestError(
        'previous_appointment_not_active',
        'Only an active regular SPK can be renewed.',
      )
    }
    if (
      application.type === 'privilege_extension' &&
      previous.valid_period.end < issueDate
    ) {
      throw new InvalidRequestError(
        'appointment_lapsed',
        'An extension keeps the last valid day of the SPK, which has passed.',
      )
    }
    return previous
  }

  /**
   * Builds one grant from one recommended privilege. The condition, supervisor and notes come
   * from the recommendation, never from the request (HR-CRD-008).
   *
   * @param tenantId - Tenant of the caller.
   * @param application - The application.
   * @param appointment - The SPK.
   * @param item - The recommended privilege.
   * @param supervisorGrantId - Grant of the supervisor, for a supervised privilege.
   * @returns The grant to create.
   */
  private grantOf(
    tenantId: string,
    application: CredentialApplication,
    appointment: ClinicalAppointment,
    item: RecommendedPrivilege,
    supervisorGrantId: string | undefined,
  ): NewEntity<PrivilegeGrant> {
    const requested = application.requested_privileges.find(
      (entry) => entry.catalog_item_id === item.catalog_item_id,
    )
    return {
      tenant_id: tenantId,
      appointment_id: appointment.id,
      employee_id: appointment.employee_id,
      facility_ids: appointment.facility_ids,
      unit_ids: appointment.unit_ids,
      catalog_item_id: item.catalog_item_id,
      code: requested?.code ?? '',
      condition: item.condition as NonNullable<RecommendedPrivilege['condition']>,
      supervisor:
        item.supervisor_employee_id && supervisorGrantId
          ? {
              employee_id: item.supervisor_employee_id,
              grant_id: supervisorGrantId,
            }
          : null,
      restriction_notes: item.restriction_notes,
      status: 'active',
      status_change: null,
      flag: null,
    }
  }

  /**
   * Loads the credentialing facility of the tenant.
   *
   * @param tenantId - Tenant of the caller.
   * @param facilityId - Facility identifier.
   * @returns The facility.
   * @throws InvalidRequestError `facility_not_found`.
   */
  private async facility(
    tenantId: string,
    facilityId: string,
  ): Promise<Facility> {
    const facility = await this.facilities.findOne(facilityId)
    if (!facility || facility.tenant_id !== tenantId || facility.deleted_at) {
      throw new InvalidRequestError(
        'facility_not_found',
        'The credentialing facility was not found.',
      )
    }
    return facility
  }

  /**
   * HR-CRD-002: a valid registration and, for every facility of the SPK, a valid practice permit
   * on the issue date.
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - The applicant.
   * @param issueDate - The issue date.
   * @param facilityIds - Facilities of the SPK.
   * @throws InvalidRequestError `license_not_valid`.
   */
  private async assertLicenses(
    tenantId: string,
    employeeId: string,
    issueDate: string,
    facilityIds: string[],
  ): Promise<void> {
    const valid = (
      await this.licenses.findByEmployee(tenantId, employeeId)
    ).filter((license) => isLicenseValidOn(license, issueDate))
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
        'The applicant needs a valid registration and a valid practice permit for each facility of the SPK on the issue date.',
      )
    }
  }

  /**
   * HR-CRD-006: the supervisor of a supervised privilege holds an active full grant of it in an
   * active SPK of the credentialing facility.
   *
   * @param tenantId - Tenant of the caller.
   * @param application - The application.
   * @param item - The supervised recommended privilege.
   * @returns The identifier of the supervisor's grant.
   * @throws InvalidRequestError `supervisor_not_privileged`.
   */
  private async supervisorGrant(
    tenantId: string,
    application: CredentialApplication,
    item: RecommendedPrivilege,
  ): Promise<string> {
    const grant = item.supervisor_employee_id
      ? await this.grants.findActiveFullGrant(
          tenantId,
          item.catalog_item_id,
          item.supervisor_employee_id,
          application.credentialing_facility_id,
        )
      : null
    const appointment = grant
      ? await this.appointments.findOne(grant.appointment_id)
      : null
    if (!grant || appointment?.status !== 'active') {
      throw new InvalidRequestError(
        'supervisor_not_privileged',
        'A supervisor needs an active full grant of the privilege in an active SPK.',
      )
    }
    return grant.id
  }

  /**
   * Works out the last valid day (HR-CRD-004, HR plan 4.3 SP6).
   *
   * @param tenantId - Tenant of the caller.
   * @param application - The application.
   * @param issueDate - The issue date.
   * @param input - The decision, with the optional `validUntil`.
   * @param previous - The SPK being renewed, or `null`.
   * @returns The last valid day.
   * @throws InvalidRequestError `invalid_validity` or `valid_until_not_allowed`.
   */
  private async validEnd(
    tenantId: string,
    application: CredentialApplication,
    issueDate: string,
    input: DecideInput,
    previous: ClinicalAppointment | null,
  ): Promise<string> {
    if (application.type === 'privilege_extension' && previous) {
      if (input.validUntil !== undefined) {
        throw new InvalidRequestError(
          'valid_until_not_allowed',
          'An extension keeps the last valid day of the SPK it extends.',
        )
      }
      return previous.valid_period.end
    }
    const span =
      application.type === 'temporary'
        ? { days: application.temporary?.requested_days ?? 1 }
        : {
            years: Number(
              (
                await this.parameters.resolve(tenantId, {
                  key: 'SPK_VALIDITY_YEARS',
                  facilityId: application.credentialing_facility_id,
                })
              ).value,
            ),
          }
    const longest = latestEnd(issueDate, span)
    if (input.validUntil === undefined) {
      return longest
    }
    if (
      !isLocalDate(input.validUntil) ||
      input.validUntil < issueDate ||
      input.validUntil > longest
    ) {
      throw new InvalidRequestError(
        'invalid_validity',
        'The last valid day must be a date from the issue date up to the longest period allowed.',
      )
    }
    return input.validUntil
  }

  /**
   * @returns The conflict for a second current regular SPK of a practitioner at a facility.
   */
  private appointmentExists(): ConflictError {
    return new ConflictError(
      'appointment_exists',
      'The practitioner has a current SPK at this facility already.',
    )
  }

  /**
   * Reads the actor of the request: the deciding account.
   *
   * @returns The actor of the request.
   * @throws Error when the request has no actor.
   */
  private actor(): ActorRef {
    const actor = getRequestContext()?.actor
    if (!actor) {
      throw new Error('A decision needs an actor in the request context.')
    }
    return actor
  }
}
