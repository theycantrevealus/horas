import { Inject, Injectable } from '@nestjs/common'
import {
  RepositoryConflictError,
  RepositoryNotFoundError,
} from '@utility/database/error'
import {
  TRANSACTION_MANAGER,
  type TransactionManager,
} from '@utility/database/transaction'
import { withChangeReason } from '@utility/history/reason'
import { getRequestContext } from '@utility/logger/context'
import { AppLogger } from '@utility/logger/service'
import {
  compareLocalDates,
  isLocalDate,
  todayUtc,
} from '@utility/validation/local-date'
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
  type LicenseVerification,
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
  method: /(^|\.)license-verification-method$/,
  reason: /(^|\.)license-status-reason$/,
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
 * Longest note on a verification, rejection or revocation.
 */
const MAX_NOTES = 500

/**
 * Data of a verification.
 *
 * @property outcome - `match` when the document matched the original and the registry, otherwise `mismatch`.
 * @property method - How it was checked, a code of a license-verification-method system.
 * @property notes - Verifier's notes.
 * @property reason - Why it was rejected; required for a mismatch.
 * @property version - Version the caller read.
 */
export interface VerifyLicenseInput {
  outcome: 'match' | 'mismatch'
  method: Coding
  notes?: string
  reason?: Coding
  version?: number
}

/**
 * Data of a revocation.
 *
 * @property effectiveDate - Local date the revocation takes effect.
 * @property reason - Reason code of a license-status-reason system.
 * @property notes - Free text.
 * @property version - Version the caller read.
 */
export interface RevokeLicenseInput {
  effectiveDate: string
  reason: Coding
  notes?: string
  version?: number
}

/**
 * Professional licences (STR, SIP and others): registration, reads, verification and revocation
 * (HR plan 3.1). Never
 * edits or deletes: a wrong licence is rejected and registered again (`HR-LIC-008`).
 */
@Injectable()
export class LicenseService {
  /**
   * @param licenses - Licence repository.
   * @param employees - Employee repository.
   * @param facilities - Facility repository, for a practice location in this tenant.
   * @param concepts - Code concepts, to check types, professions, specialties and authorities.
   * @param transactions - Transaction manager, so a renewal and the licence it replaces change together.
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
    @Inject(TRANSACTION_MANAGER)
    private readonly transactions: TransactionManager,
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
   * Records the verification of a pending licence (HR plan 3.1 L9, L10 and L12). A match makes
   * it `valid` and, for a renewal, supersedes the licence it replaces in the same transaction. A
   * mismatch rejects it.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Licence identifier.
   * @param input - Outcome, method, notes, and the reason of a rejection.
   * @returns The verified or rejected licence.
   * @throws NotFoundError `license_not_found`.
   * @throws ForbiddenError `verifier_is_submitter`.
   * @throws InvalidRequestError `license_not_pending`, `invalid_method`, `invalid_reason`,
   * `invalid_notes`, `reason_required`, `unknown_code`, `code_retired`, `code_not_in_period`,
   * `employee_not_found`, `profession_mismatch`, `specialty_mismatch`, `license_expired` or
   * `issue_date_in_future`.
   * @throws ConflictError `valid_license_exists` or `stale_version`.
   */
  verify(
    tenantId: string,
    id: string,
    input: VerifyLicenseInput,
  ): Promise<ProfessionalLicense> {
    return observe(
      this.logger,
      'license_verify',
      `${NAME}.verify`,
      async () => {
        const license = await this.get(tenantId, id)
        if (license.status !== 'pending_verification') {
          throw new InvalidRequestError(
            'license_not_pending',
            'Only a licence that is pending verification can be verified.',
          )
        }
        const actor = getRequestContext()?.actor
        if (!actor) {
          throw new ForbiddenError(
            'actor_required',
            'A signed-in actor is required.',
          )
        }
        if (actor.account_id === license.submission.by.account_id) {
          throw new ForbiddenError(
            'verifier_is_submitter',
            'A licence cannot be verified by the person who submitted it.',
          )
        }
        const notes = this.cleanNotes(input.notes)
        if (!SYSTEMS.method.test(input.method.system)) {
          throw new InvalidRequestError(
            'invalid_method',
            'The method must come from a license-verification-method code system.',
          )
        }
        await this.concepts.assertActive(tenantId, input.method)
        const reason = await this.reasonOf(
          tenantId,
          input.reason,
          input.outcome === 'mismatch',
        )
        this.assertVersion(license, input.version)
        const today = todayUtc()
        const verification: LicenseVerification = {
          by: actor,
          at: new Date(),
          method: { system: input.method.system, code: input.method.code },
          outcome: input.outcome,
          notes,
        }

        if (input.outcome === 'mismatch') {
          return this.write(license, () =>
            this.licenses.update(
              license.id,
              {
                status: 'rejected',
                is_live: false,
                status_effective_date: today,
                verification,
                rejection: {
                  effective_date: today,
                  reason: reason as Coding,
                  notes,
                },
              },
              { expectedVersion: input.version },
            ),
          )
        }

        await this.assertMatches(tenantId, license, today)
        const old = license.replaces_license_id
          ? await this.licenses.findOne(license.replaces_license_id)
          : null
        const replaced =
          old &&
          old.tenant_id === tenantId &&
          old.employee_id === license.employee_id &&
          old.status === 'valid'
            ? old
            : null
        return this.write(license, () =>
          this.transactions.run(async () => {
            // The old licence leaves `valid` first, so the unique index on valid practice
            // permits is never broken (design 3.3).
            if (replaced) {
              await this.licenses.update(replaced.id, {
                status: 'superseded',
                status_effective_date: license.issue_date,
                superseded: {
                  by_license_id: license.id,
                  effective_date: license.issue_date,
                },
              })
            }
            return this.licenses.update(
              license.id,
              {
                status: 'valid',
                status_effective_date: today,
                verification,
              },
              { expectedVersion: input.version },
            )
          }),
        )
      },
    )
  }

  /**
   * Records the revocation of a valid licence by its issuing authority (HR plan 3.1 L13).
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Licence identifier.
   * @param input - Effective date, reason, notes and optional version.
   * @returns The revoked licence.
   * @throws NotFoundError `license_not_found`.
   * @throws InvalidRequestError `license_not_valid`, `invalid_effective_date`, `invalid_reason`,
   * `invalid_notes`, `unknown_code`, `code_retired` or `code_not_in_period`.
   * @throws ConflictError `stale_version`.
   */
  revoke(
    tenantId: string,
    id: string,
    input: RevokeLicenseInput,
  ): Promise<ProfessionalLicense> {
    return observe(
      this.logger,
      'license_revoke',
      `${NAME}.revoke`,
      async () => {
        const license = await this.get(tenantId, id)
        if (license.status !== 'valid') {
          throw new InvalidRequestError(
            'license_not_valid',
            'Only a valid licence can be revoked.',
          )
        }
        if (
          !isLocalDate(input.effectiveDate) ||
          compareLocalDates(input.effectiveDate, license.issue_date) < 0 ||
          compareLocalDates(input.effectiveDate, addDays(todayUtc(), 1)) > 0
        ) {
          throw new InvalidRequestError(
            'invalid_effective_date',
            'The date must be a real date, not before the issue date and not later than tomorrow.',
          )
        }
        const notes = this.cleanNotes(input.notes)
        const reason = await this.reasonOf(tenantId, input.reason, true)
        this.assertVersion(license, input.version)
        return this.write(license, () =>
          this.licenses.update(
            license.id,
            {
              status: 'revoked',
              status_effective_date: input.effectiveDate,
              revocation: {
                effective_date: input.effectiveDate,
                reason: reason as Coding,
                notes,
              },
            },
            { expectedVersion: input.version },
          ),
        )
      },
    )
  }

  /**
   * Checks that a licence can be verified as matching: the holder exists and has the same
   * profession and specialty, the licence has not expired and has started (HR plan 3.1 L9).
   *
   * @param tenantId - Tenant of the caller.
   * @param license - The licence.
   * @param today - Today in UTC.
   * @throws InvalidRequestError `employee_not_found`, `profession_mismatch`, `specialty_mismatch`,
   * `license_expired` or `issue_date_in_future`.
   */
  private async assertMatches(
    tenantId: string,
    license: ProfessionalLicense,
    today: string,
  ): Promise<void> {
    const employee = await this.employee(tenantId, license.employee_id)
    if (
      !employee.profession ||
      employee.profession.system !== license.profession.system ||
      employee.profession.code !== license.profession.code
    ) {
      throw new InvalidRequestError(
        'profession_mismatch',
        'The licence profession differs from the employee profession.',
      )
    }
    if (license.specialty) {
      const primary = employee.specialties.find((item) => item.is_primary)
      if (
        !primary ||
        primary.coding.system !== license.specialty.system ||
        primary.coding.code !== license.specialty.code
      ) {
        throw new InvalidRequestError(
          'specialty_mismatch',
          'The licence specialty differs from the employee primary specialty.',
        )
      }
    }
    if (
      license.expiry_date !== null &&
      compareLocalDates(license.expiry_date, today) < 0
    ) {
      throw new InvalidRequestError(
        'license_expired',
        'The licence has already expired.',
      )
    }
    if (compareLocalDates(license.issue_date, today) > 0) {
      throw new InvalidRequestError(
        'issue_date_in_future',
        'The licence is issued on a later date. Verify it on or after that date.',
      )
    }
  }

  /**
   * Checks the reason of a rejection or revocation.
   *
   * @param tenantId - Tenant of the caller.
   * @param reason - The reason as sent.
   * @param required - Whether the reason must be given.
   * @returns The cleaned reason, or `null` when none is needed and none was given.
   * @throws InvalidRequestError `reason_required`, `invalid_reason`, `unknown_code`,
   * `code_retired` or `code_not_in_period`.
   */
  private async reasonOf(
    tenantId: string,
    reason: Coding | undefined,
    required: boolean,
  ): Promise<Coding | null> {
    if (!reason) {
      if (required) {
        throw new InvalidRequestError(
          'reason_required',
          'A reason is required.',
        )
      }
      return null
    }
    if (!SYSTEMS.reason.test(reason.system)) {
      throw new InvalidRequestError(
        'invalid_reason',
        'The reason must come from a license-status-reason code system.',
      )
    }
    await this.concepts.assertActive(tenantId, reason)
    return { system: reason.system, code: reason.code }
  }

  /**
   * Cleans a free-text note: trimmed, at most 500 characters, `null` when empty.
   *
   * @param raw - Note as sent.
   * @returns The cleaned note, or `null`.
   * @throws InvalidRequestError `invalid_notes`.
   */
  private cleanNotes(raw: string | undefined): string | null {
    const notes = (raw ?? '').trim()
    if (notes.length > MAX_NOTES) {
      throw new InvalidRequestError(
        'invalid_notes',
        'The notes can have at most 500 characters.',
      )
    }
    return notes.length > 0 ? notes : null
  }

  /**
   * Refuses a stale version before any write.
   *
   * @param license - The licence as read.
   * @param version - Version the caller read.
   * @throws ConflictError `stale_version`.
   */
  private assertVersion(
    license: ProfessionalLicense,
    version: number | undefined,
  ): void {
    if (version !== undefined && version !== license.version) {
      throw this.stale()
    }
  }

  /**
   * Runs a repository write and turns repository rejections into workforce errors.
   *
   * @param license - The licence as read before the write.
   * @param write - The repository call.
   * @returns What the call returns.
   * @throws ConflictError `valid_license_exists` when another valid permit holds the place, or
   * `stale_version` when the licence changed meanwhile.
   */
  private async write(
    license: ProfessionalLicense,
    write: () => Promise<ProfessionalLicense>,
  ): Promise<ProfessionalLicense> {
    try {
      return await write()
    } catch (error: unknown) {
      if (error instanceof RepositoryConflictError) {
        // The optimistic lock and the unique index on valid permits both end here. A licence
        // that changed since it was read is a stale version; otherwise a second permit won.
        const fresh = await this.licenses.findOne(license.id)
        if (fresh && fresh.version !== license.version) {
          throw this.stale()
        }
        throw new ConflictError(
          'valid_license_exists',
          'The employee already has a valid practice permit for this profession and facility.',
        )
      }
      if (error instanceof RepositoryNotFoundError) {
        throw new NotFoundError(
          'license_not_found',
          'The license was not found.',
        )
      }
      throw error
    }
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
   * @returns The conflict for a stale version.
   */
  private stale(): ConflictError {
    return new ConflictError(
      'stale_version',
      'The licence was changed by someone else. Reload it and try again.',
    )
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
