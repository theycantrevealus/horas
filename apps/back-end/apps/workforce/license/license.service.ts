import { Inject, Injectable } from '@nestjs/common'
import { RepositoryConflictError } from '@utility/database/error'
import { withChangeReason } from '@utility/history/reason'
import { getRequestContext } from '@utility/logger/context'
import { AppLogger } from '@utility/logger/service'
import { todayUtc } from '@utility/validation/local-date'
import { type EmployeeRepository } from '@repository/interface/employee'
import { type FacilityRepository } from '@repository/interface/facility'
import {
  type LicenseQuery,
  type ProfessionalLicenseRepository,
} from '@repository/interface/professional-license'
import { type Coding } from '@repository/model/common/coding'
import { type FileRef } from '@repository/model/common/file-ref'
import { type Employee } from '@repository/model/employee'
import {
  type EligibilityRole,
  type LicenseStatus,
  type PracticeLocation,
  type ProfessionalLicense,
} from '@repository/model/professional-license'
import {
  REPOSITORY_EMPLOYEE,
  REPOSITORY_FACILITY,
  REPOSITORY_PROFESSIONAL_LICENSE,
} from '@repository/token'
import { addDays } from '../assignment/assignment-rules'
import { CodeConceptService } from '../concept/code-concept.service'
import { observe } from '../observe'
import {
  ForbiddenError,
  ConflictError,
  InvalidRequestError,
  NotFoundError,
} from '../workforce.error'
import {
  checkLicenseDates,
  cleanDocumentNumber,
  isValidDocumentRef,
  normalizeDocumentNumber,
} from './license-rules'

const NAME = 'LicenseService'

/**
 * Code system name suffixes, after an optional country prefix.
 */
const SYSTEMS = {
  type: /(^|\.)license-type$/,
  profession: /(^|\.)profession$/,
  specialty: /(^|\.)specialty$/,
} as const

/**
 * Longest issuing authority or practice location name.
 */
const MAX_NAME = 200

/**
 * Largest number of days ahead of the expiry report.
 */
const MAX_EXPIRING_DAYS = 3650

/**
 * Data of a new licence.
 *
 * @property employeeId - The holder (ignored by the self-service route, which uses the account's employee).
 * @property licenseType - Licence type code.
 * @property profession - Profession code.
 * @property specialty - Specialty code, or `null`.
 * @property documentNumber - Number as printed.
 * @property issuingAuthority - Name, and optional code.
 * @property jurisdiction - Country, and optional subdivision.
 * @property practiceLocation - A facility of this tenant or another place by name; required for location-specific types.
 * @property issueDate - Issue date.
 * @property expiryDate - Expiry date, or `null`.
 * @property document - Reference to the scan.
 * @property replacesLicenseId - Licence this one renews.
 * @property reason - Why, kept in the change history.
 */
export interface RegisterLicenseInput {
  employeeId?: string
  licenseType: Coding
  profession: Coding
  specialty?: Coding | null
  documentNumber: string
  issuingAuthority: { name: string; code?: Coding | null }
  jurisdiction: { country: string; subdivision?: string | null }
  practiceLocation?: { facilityId?: string; name?: string } | null
  issueDate: string
  expiryDate?: string | null
  document: FileRef
  replacesLicenseId?: string | null
  reason?: string
}

/**
 * Filters and paging of the licence list.
 *
 * @property status - Only licences in this status.
 * @property licenseType - Only this licence type code.
 * @property facilityId - Only licences whose practice location is this facility.
 * @property expiringWithinDays - Only valid licences expiring from today to this many days ahead.
 * @property limit - Page size.
 * @property offset - Records to skip.
 */
export interface ListLicensesInput {
  status?: LicenseStatus
  licenseType?: string
  facilityId?: string
  expiringWithinDays?: number
  limit?: number
  offset?: number
}

/**
 * Professional licences (STR, SIP and others): registration and reads (HR plan 3.1 B1). Never
 * edits or deletes: a wrong licence is rejected and registered again (`HR-LIC-008`).
 */
@Injectable()
export class LicenseService {
  /**
   * @param licenses - Licence repository.
   * @param employees - Employee repository.
   * @param facilities - Facility repository, for a practice location in this tenant.
   * @param concepts - Code concepts, to check types, professions, specialties and authorities.
   * @param logger - Logger of this service.
   */
  constructor(
    @Inject(REPOSITORY_PROFESSIONAL_LICENSE)
    private readonly licenses: ProfessionalLicenseRepository,
    @Inject(REPOSITORY_EMPLOYEE)
    private readonly employees: EmployeeRepository,
    @Inject(REPOSITORY_FACILITY)
    private readonly facilities: FacilityRepository,
    @Inject(CodeConceptService) private readonly concepts: CodeConceptService,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /**
   * Lists licences of the tenant. Writes no log entry (a read).
   *
   * @param tenantId - Tenant of the caller.
   * @param input - Optional filters and paging.
   * @returns The licences.
   */
  list(
    tenantId: string,
    input: ListLicensesInput,
  ): Promise<ProfessionalLicense[]> {
    const query: LicenseQuery = {
      status: input.status,
      licenseType: input.licenseType,
      facilityId: input.facilityId,
      limit: input.limit,
      offset: input.offset,
    }
    if (input.expiringWithinDays !== undefined) {
      if (input.status !== undefined && input.status !== 'valid') {
        return Promise.resolve([])
      }
      const today = todayUtc()
      query.status = 'valid'
      query.expiresFrom = today
      query.expiresTo = addDays(
        today,
        Math.min(input.expiringWithinDays, MAX_EXPIRING_DAYS),
      )
    }
    return this.licenses.findByFilter(tenantId, query)
  }

  /**
   * Lists the licences of an employee, newest issue date first. Writes no log entry (a read).
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - Employee identifier.
   * @returns The licences.
   * @throws NotFoundError `employee_not_found`.
   */
  async listByEmployee(
    tenantId: string,
    employeeId: string,
  ): Promise<ProfessionalLicense[]> {
    const employee = await this.employees.findOne(employeeId)
    if (!employee || employee.tenant_id !== tenantId) {
      throw new NotFoundError(
        'employee_not_found',
        'The employee was not found.',
      )
    }
    return this.licenses.findByEmployee(tenantId, employee.id)
  }

  /**
   * Returns one licence. Writes no log entry (a read).
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Licence identifier.
   * @returns The licence.
   * @throws NotFoundError `license_not_found`.
   */
  async get(tenantId: string, id: string): Promise<ProfessionalLicense> {
    const license = await this.licenses.findOne(id)
    if (!license || license.tenant_id !== tenantId) {
      throw new NotFoundError(
        'license_not_found',
        'The license was not found.',
      )
    }
    return license
  }

  /**
   * Registers a licence for an employee, entered by HR. It starts `pending_verification`.
   *
   * @param tenantId - Tenant of the caller.
   * @param input - The licence, with the holder's `employeeId`.
   * @returns The registered licence.
   * @throws InvalidRequestError See `register`.
   * @throws ConflictError `license_exists`.
   */
  create(
    tenantId: string,
    input: RegisterLicenseInput,
  ): Promise<ProfessionalLicense> {
    return observe(
      this.logger,
      'license_create',
      `${NAME}.create`,
      async () => {
        const employee = await this.employee(tenantId, input.employeeId ?? '')
        return this.register(tenantId, employee, input, 'hr')
      },
    )
  }

  /**
   * Registers the signed-in employee's own licence. It starts `pending_verification`.
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - The employee linked to the signed-in account, or `null` when there is none.
   * @param input - The licence; any `employeeId` in it is ignored.
   * @returns The registered licence.
   * @throws NotFoundError `employee_not_found` when the account has no employee.
   * @throws InvalidRequestError See `register`.
   * @throws ConflictError `license_exists`.
   */
  createOwn(
    tenantId: string,
    employeeId: string | null,
    input: RegisterLicenseInput,
  ): Promise<ProfessionalLicense> {
    return observe(
      this.logger,
      'license_submit',
      `${NAME}.createOwn`,
      async () => {
        const found = employeeId ? await this.employees.findOne(employeeId) : null
        if (!found || found.tenant_id !== tenantId) {
          throw new NotFoundError(
            'employee_not_found',
            'The employee was not found.',
          )
        }
        this.assertNotSeparated(found)
        return this.register(tenantId, found, input, 'self_service')
      },
    )
  }

  /**
   * Checks and stores a new licence (HR plan 3.1 L1 to L8 and L12).
   *
   * @param tenantId - Tenant of the caller.
   * @param employee - The holder.
   * @param input - The licence.
   * @param via - How it was submitted.
   * @returns The stored licence.
   * @throws InvalidRequestError `invalid_document_number`, `invalid_document`,
   * `invalid_issuing_authority`, `invalid_jurisdiction`, `invalid_license_type`,
   * `invalid_profession`, `invalid_specialty`, `profession_not_allowed`, `unknown_code`,
   * `code_retired`, `code_not_in_period`, `employee_separated`, `invalid_period`,
   * `expiry_required`, `practice_location_required`, `practice_location_not_allowed`,
   * `invalid_practice_location`, `facility_not_found`, `facility_inactive` or
   * `replaced_license_invalid`.
   * @throws ConflictError `license_exists`.
   */
  private async register(
    tenantId: string,
    employee: Employee,
    input: RegisterLicenseInput,
    via: 'hr' | 'self_service',
  ): Promise<ProfessionalLicense> {
    this.assertNotSeparated(employee)
    const documentNumber = cleanDocumentNumber(input.documentNumber)
    if (documentNumber === null) {
      throw new InvalidRequestError(
        'invalid_document_number',
        'The document number must have 1 to 64 characters.',
      )
    }
    if (!isValidDocumentRef(input.document)) {
      throw new InvalidRequestError(
        'invalid_document',
        'The document must have a file id, a PDF, JPEG or PNG content type and a SHA-256 hash.',
      )
    }
    const authorityName = input.issuingAuthority.name.trim()
    if (authorityName.length < 1 || authorityName.length > MAX_NAME) {
      throw new InvalidRequestError(
        'invalid_issuing_authority',
        'The issuing authority needs a name of 1 to 200 characters.',
      )
    }
    if (
      !/^[A-Z]{2}$/.test(input.jurisdiction.country) ||
      (input.jurisdiction.subdivision != null &&
        !/^[A-Z]{2}-[A-Z0-9]{1,3}$/.test(input.jurisdiction.subdivision))
    ) {
      throw new InvalidRequestError(
        'invalid_jurisdiction',
        'The country must be an ISO 3166-1 alpha-2 code and the subdivision an ISO 3166-2 code.',
      )
    }
    if (!SYSTEMS.type.test(input.licenseType.system)) {
      throw new InvalidRequestError(
        'invalid_license_type',
        'The type must come from a license-type code system, for example id.license-type.',
      )
    }
    if (!SYSTEMS.profession.test(input.profession.system)) {
      throw new InvalidRequestError(
        'invalid_profession',
        'The profession must come from a profession code system.',
      )
    }
    if (input.specialty && !SYSTEMS.specialty.test(input.specialty.system)) {
      throw new InvalidRequestError(
        'invalid_specialty',
        'The specialty must come from a specialty code system.',
      )
    }
    const type = await this.concepts.assertActive(tenantId, input.licenseType)
    await this.concepts.assertActive(tenantId, input.profession)
    if (input.specialty) {
      await this.concepts.assertActive(tenantId, input.specialty)
    }
    if (input.issuingAuthority.code) {
      await this.concepts.assertActive(tenantId, input.issuingAuthority.code)
    }
    const allowed = type.properties?.professions
    if (
      Array.isArray(allowed) &&
      allowed.length > 0 &&
      !allowed.some(
        (item: Partial<Coding>) =>
          item.system === input.profession.system &&
          item.code === input.profession.code,
      )
    ) {
      throw new InvalidRequestError(
        'profession_not_allowed',
        'This licence type does not apply to that profession.',
      )
    }

    const expiryDate = input.expiryDate ?? null
    const problem = checkLicenseDates(
      input.issueDate,
      expiryDate,
      type.properties?.requires_expiry_date === true,
    )
    if (problem) {
      throw new InvalidRequestError(problem.code, problem.message)
    }
    const location = await this.location(
      tenantId,
      type.properties?.location_specific === true,
      input.practiceLocation ?? null,
    )
    if (input.replacesLicenseId) {
      await this.assertReplaceable(
        tenantId,
        employee.id,
        input,
        location?.facility_id ?? null,
        input.replacesLicenseId,
      )
    }
    const normalized = normalizeDocumentNumber(documentNumber)
    if (
      await this.licenses.findLiveByNumber(
        tenantId,
        input.licenseType.system,
        input.licenseType.code,
        normalized,
      )
    ) {
      throw this.exists()
    }
    const actor = getRequestContext()?.actor
    if (!actor) {
      throw new ForbiddenError('actor_required', 'A signed-in actor is required.')
    }
    const role = type.properties?.eligibility_role
    const write = (): Promise<ProfessionalLicense> =>
      this.licenses.create({
        tenant_id: tenantId,
        employee_id: employee.id,
        license_type: {
          system: input.licenseType.system,
          code: input.licenseType.code,
        },
        eligibility_role:
          role === 'registration' || role === 'practice_permit'
            ? (role as EligibilityRole)
            : null,
        profession: {
          system: input.profession.system,
          code: input.profession.code,
        },
        specialty: input.specialty
          ? { system: input.specialty.system, code: input.specialty.code }
          : null,
        document_number: documentNumber,
        document_number_normalized: normalized,
        issuing_authority: {
          code: input.issuingAuthority.code
            ? {
                system: input.issuingAuthority.code.system,
                code: input.issuingAuthority.code.code,
              }
            : null,
          name: authorityName,
        },
        jurisdiction: {
          country: input.jurisdiction.country,
          subdivision: input.jurisdiction.subdivision ?? null,
        },
        practice_location: location,
        issue_date: input.issueDate,
        expiry_date: expiryDate,
        document: {
          file_id: input.document.file_id,
          content_type: input.document.content_type,
          sha256: input.document.sha256.toLowerCase(),
        },
        status: 'pending_verification',
        status_effective_date: todayUtc(),
        is_live: true,
        submission: { via, by: actor, at: new Date() },
        verification: null,
        rejection: null,
        revocation: null,
        superseded: null,
        replaces_license_id: input.replacesLicenseId ?? null,
      })
    try {
      return await (input.reason
        ? withChangeReason(input.reason, write)
        : write())
    } catch (error: unknown) {
      // Two requests with the same number at once: the unique index decided.
      throw error instanceof RepositoryConflictError ? this.exists() : error
    }
  }

  /**
   * Builds the practice location of a licence (HR plan 3.1 L6).
   *
   * @param tenantId - Tenant of the caller.
   * @param required - Whether the licence type is location-specific.
   * @param given - The location as sent, or `null`.
   * @returns The location to store, or `null` for a type that has none.
   * @throws InvalidRequestError `practice_location_required`, `practice_location_not_allowed`,
   * `invalid_practice_location`, `facility_not_found` or `facility_inactive`.
   */
  private async location(
    tenantId: string,
    required: boolean,
    given: { facilityId?: string; name?: string } | null,
  ): Promise<PracticeLocation | null> {
    if (given === null || (!given.facilityId && !given.name)) {
      if (required) {
        throw new InvalidRequestError(
          'practice_location_required',
          'This licence type needs a practice location.',
        )
      }
      return null
    }
    if (!required) {
      throw new InvalidRequestError(
        'practice_location_not_allowed',
        'This licence type has no practice location.',
      )
    }
    if (Boolean(given.facilityId) === Boolean(given.name)) {
      throw new InvalidRequestError(
        'invalid_practice_location',
        'Give either a facility of this hospital group or the name of another place, not both.',
      )
    }
    if (given.facilityId) {
      const facility = await this.facilities.findOne(given.facilityId)
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
      return {
        facility_id: facility.id,
        name: facility.name[0]?.text ?? facility.code,
        address: null,
      }
    }
    const name = (given.name ?? '').trim()
    if (name.length < 1 || name.length > MAX_NAME) {
      throw new InvalidRequestError(
        'invalid_practice_location',
        'The place needs a name of 1 to 200 characters.',
      )
    }
    return { facility_id: null, name, address: null }
  }

  /**
   * Checks that a renewal names a valid licence of the same employee, type, profession and
   * facility (HR plan 3.1 L12).
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - The holder.
   * @param input - The new licence.
   * @param facilityId - Facility of the new licence's location, or `null`.
   * @param replacesId - The licence it replaces.
   * @throws InvalidRequestError `replaced_license_invalid`.
   */
  private async assertReplaceable(
    tenantId: string,
    employeeId: string,
    input: RegisterLicenseInput,
    facilityId: string | null,
    replacesId: string,
  ): Promise<void> {
    const old = await this.licenses.findOne(replacesId)
    if (
      !old ||
      old.tenant_id !== tenantId ||
      old.employee_id !== employeeId ||
      old.status !== 'valid' ||
      old.license_type.system !== input.licenseType.system ||
      old.license_type.code !== input.licenseType.code ||
      old.profession.system !== input.profession.system ||
      old.profession.code !== input.profession.code ||
      (old.practice_location?.facility_id ?? null) !== facilityId
    ) {
      throw new InvalidRequestError(
        'replaced_license_invalid',
        'The licence to replace must be a valid one of the same employee, type, profession and facility.',
      )
    }
  }

  /**
   * Loads an employee of the caller's tenant.
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - Employee identifier.
   * @returns The employee.
   * @throws InvalidRequestError `employee_not_found`.
   */
  private async employee(
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
    return employee
  }

  /**
   * Refuses a separated employee.
   *
   * @param employee - The employee.
   * @throws InvalidRequestError `employee_separated`.
   */
  private assertNotSeparated(employee: Employee): void {
    if (employee.employment_status === 'separated') {
      throw new InvalidRequestError(
        'employee_separated',
        'The employee has separated.',
      )
    }
  }

  /**
   * @returns The conflict for a second live licence with the same type and number.
   */
  private exists(): ConflictError {
    return new ConflictError(
      'license_exists',
      'A licence of this type with this number already exists.',
    )
  }
}
