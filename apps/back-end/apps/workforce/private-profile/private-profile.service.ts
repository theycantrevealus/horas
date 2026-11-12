import { Inject, Injectable } from '@nestjs/common'
import {
  RepositoryConflictError,
  RepositoryNotFoundError,
} from '@utility/database/error'
import { withChangeReason } from '@utility/history/reason'
import { CHANGE_RECORDER, type ChangeRecorder } from '@utility/history/recorder'
import { AppLogger } from '@utility/logger/service'
import { isCountryCode } from '@utility/validation/iso-codes'
import {
  compareLocalDates,
  isLocalDate,
  isValidPeriod,
  todayUtc,
} from '@utility/validation/local-date'
import { type EmployeePrivateProfileRepository } from '@repository/interface/employee-private-profile'
import { type EmployeeRepository } from '@repository/interface/employee'
import { type Address } from '@repository/model/common/address'
import { type Coding } from '@repository/model/common/coding'
import { type ContactPoint } from '@repository/model/common/contact-point'
import { type PersonIdentifierInput } from '@repository/model/common/person-identifier'
import {
  type EmergencyContact,
  type EmployeePrivateProfile,
  type FamilyMember,
  type TaxProfile,
} from '@repository/model/employee-private-profile'
import {
  REPOSITORY_EMPLOYEE,
  REPOSITORY_EMPLOYEE_PRIVATE_PROFILE,
} from '@repository/token'
import { CodeConceptService } from '../concept/code-concept.service'
import { type ContactInput, normalizeContacts } from '../employee/contacts'
import { type NameInput, normalizeName } from '../employee/names'
import { observe } from '../observe'
import { normalizeAddress } from '../structure/address'
import {
  ConflictError,
  InvalidRequestError,
  NotFoundError,
} from '../workforce.error'
import { type BankAccountEntry, normalizeBankAccounts } from './bank-accounts'
import {
  IDENTIFIER_SYSTEM_PATTERN,
  normalizeIdentifier,
} from './identifier-formats'

const NAME = 'PrivateProfileService'

/**
 * Stable entity name of the profile in the change history.
 */
const ENTITY_TYPE = 'employee_private_profile'

/**
 * Earliest birth date accepted (HR plan S6).
 */
const EARLIEST_BIRTH_DATE = '1900-01-01'

/**
 * Limits of the lists of the profile (HR plan S7 to S12).
 */
const LIMITS = {
  nationalities: 5,
  personalContacts: 10,
  addresses: 5,
  familyMembers: 20,
  emergencyContacts: 5,
  emergencyContactChannels: 5,
  taxProfile: 20,
  identifiers: 10,
} as const

/**
 * Code system name suffixes, after an optional country prefix.
 */
const SYSTEMS = {
  marital: /(^|\.)marital-status$/,
  religion: /(^|\.)religion$/,
  relationship: /(^|\.)family-relationship$/,
  tax: /(^|\.)tax-status$/,
  identifierType: /(^|\.)identifier-type$/,
  bank: /(^|\.)bank$/,
} as const

/**
 * A family member as sent.
 *
 * @property relationship - Relationship code.
 * @property name - The person's name.
 * @property birthDate - Birth date, when known.
 * @property isDependent - Counted as a dependent.
 */
export interface FamilyMemberInput {
  relationship: Coding
  name: NameInput
  birthDate?: string | null
  isDependent?: boolean
}

/**
 * An emergency contact as sent.
 *
 * @property name - Full name.
 * @property relationship - Relationship code.
 * @property contacts - How to reach them.
 */
export interface EmergencyContactInput {
  name: string
  relationship: Coding
  contacts: ContactInput[]
}

/**
 * A tax status as sent.
 *
 * @property country - ISO 3166-1 alpha-2 code.
 * @property status - Tax status code.
 * @property effectiveDate - First day it applies.
 */
export interface TaxProfileInput {
  country: string
  status: Coding
  effectiveDate: string
}

/**
 * The profile fields `PUT /private-profile` replaces. An omitted field is cleared (HR plan S5).
 *
 * @property birthDate - Birth date.
 * @property birthPlace - Place of birth.
 * @property nationalities - ISO 3166-1 alpha-2 codes.
 * @property personalContacts - Personal phone and email.
 * @property addresses - Home and mailing addresses.
 * @property maritalStatus - Marital status code.
 * @property religion - Religion code.
 * @property familyMembers - Family and dependents.
 * @property emergencyContacts - People to call in an emergency.
 * @property taxProfile - Tax status history.
 * @property version - Version the caller read.
 * @property reason - Why the data changes, kept in the change history.
 */
export interface SaveProfileInput {
  birthDate?: string | null
  birthPlace?: string | null
  nationalities?: string[]
  personalContacts?: ContactInput[]
  addresses?: Address[]
  maritalStatus?: Coding | null
  religion?: Coding | null
  familyMembers?: FamilyMemberInput[]
  emergencyContacts?: EmergencyContactInput[]
  taxProfile?: TaxProfileInput[]
  version?: number
  reason?: string
}

/**
 * An identifier as sent.
 *
 * @property type - Kind of identifier, an `identifier-type` code.
 * @property system - Identifier system, for example `id.nik`.
 * @property issuingCountry - ISO 3166-1 alpha-2 code.
 * @property value - Value as printed on the document.
 * @property period - Validity of the document.
 */
export interface IdentifierEntry {
  type: Coding
  system: string
  issuingCountry: string
  value: string
  period?: { start: string; end?: string | null } | null
}

/**
 * The identifiers `PUT /private-profile/identifiers` replaces.
 *
 * @property identifiers - The new list.
 * @property version - Version the caller read.
 * @property reason - Why the data changes.
 */
export interface ReplaceIdentifiersInput {
  identifiers: IdentifierEntry[]
  version?: number
  reason?: string
}

/**
 * A bank account as sent.
 *
 * @property bank - Bank code.
 * @property accountName - Name on the account.
 * @property accountNumber - Account number or IBAN.
 * @property swiftBic - SWIFT/BIC code.
 * @property currency - ISO 4217 code.
 * @property isPrimary - Account used for salary.
 */
export interface BankAccountEntryInput {
  bank: Coding
  accountName: string
  accountNumber: string
  swiftBic?: string | null
  currency: string
  isPrimary?: boolean
}

/**
 * The bank accounts `PUT /private-profile/bank-accounts` replaces.
 *
 * @property bankAccounts - The new list.
 * @property version - Version the caller read.
 * @property reason - Why the data changes.
 */
export interface ReplaceBankAccountsInput {
  bankAccounts: BankAccountEntryInput[]
  version?: number
  reason?: string
}

/**
 * One identifier in full.
 *
 * @property system - Identifier system.
 * @property value - The plain value.
 */
export interface RevealedIdentifierValue {
  system: string
  value: string
}

/**
 * Confidential personal data of employees (HR plan S1 to S21): date of birth, identifiers, bank
 * accounts, addresses, family and tax history. The repository encrypts, hashes and masks; this
 * service checks the rules, and no plain secret is ever logged.
 */
@Injectable()
export class PrivateProfileService {
  /**
   * @param profiles - Private profile repository.
   * @param employees - Employee repository, to check that the employee exists.
   * @param concepts - Code concepts, to check the coded fields.
   * @param changes - Change history, for the access record of a reveal.
   * @param logger - Logger of this service.
   */
  constructor(
    @Inject(REPOSITORY_EMPLOYEE_PRIVATE_PROFILE)
    private readonly profiles: EmployeePrivateProfileRepository,
    @Inject(REPOSITORY_EMPLOYEE)
    private readonly employees: EmployeeRepository,
    @Inject(CodeConceptService) private readonly concepts: CodeConceptService,
    @Inject(CHANGE_RECORDER) private readonly changes: ChangeRecorder,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /**
   * Returns the profile of an employee, masked. Writes no log entry (a read).
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - Employee identifier.
   * @returns The profile.
   * @throws NotFoundError `employee_not_found` or `private_profile_not_found`.
   */
  async get(
    tenantId: string,
    employeeId: string,
  ): Promise<EmployeePrivateProfile> {
    await this.assertEmployee(tenantId, employeeId)
    return this.load(tenantId, employeeId)
  }

  /**
   * Returns the caller's own profile, masked. Writes no log entry (a read).
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - Employee linked to the caller's account, from the token, or `null`.
   * @returns The profile.
   * @throws NotFoundError `employee_not_found` or `private_profile_not_found`.
   */
  async getOwn(
    tenantId: string,
    employeeId: string | null,
  ): Promise<EmployeePrivateProfile> {
    if (employeeId === null) {
      throw this.employeeNotFound()
    }
    return this.get(tenantId, employeeId)
  }

  /**
   * Reveals one identifier in full and writes an access record in the change history after the read
   * succeeded (HR plan S16). The value is not logged anywhere.
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - Employee identifier.
   * @param system - Identifier system, for example `id.nik`.
   * @returns The system and the plain value.
   * @throws NotFoundError `employee_not_found` or `identifier_not_found`.
   */
  async revealIdentifier(
    tenantId: string,
    employeeId: string,
    system: string,
  ): Promise<RevealedIdentifierValue> {
    await this.assertEmployee(tenantId, employeeId)
    const found = await this.profiles.findIdentifierValue(
      tenantId,
      employeeId,
      system,
    )
    if (!found) {
      throw new NotFoundError(
        'identifier_not_found',
        'The employee has no such identifier.',
      )
    }
    await this.changes.recordAccess({
      type: ENTITY_TYPE,
      id: found.profile_id,
      operation: `${NAME}.revealIdentifier`,
      tenantId,
    })
    return { system, value: found.value }
  }

  /**
   * Creates or replaces the profile fields of an employee, not its identifiers or bank accounts.
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - Employee identifier.
   * @param input - The new fields; an omitted field is cleared.
   * @returns The profile after the write, masked.
   * @throws InvalidRequestError on a field that breaks its rule (`invalid_birth_date`,
   * `invalid_birth_place`, `invalid_nationalities`, `invalid_contacts`, `invalid_addresses`,
   * `invalid_marital_status`, `invalid_religion`, `invalid_family_members`,
   * `invalid_emergency_contacts`, `invalid_tax_profile`) or a code that is not active
   * (`unknown_code`, `code_retired`, `code_not_in_period`).
   * @throws NotFoundError `employee_not_found`.
   * @throws ConflictError `stale_version`.
   */
  save(
    tenantId: string,
    employeeId: string,
    input: SaveProfileInput,
  ): Promise<EmployeePrivateProfile> {
    return observe(
      this.logger,
      'private_profile_save',
      `${NAME}.save`,
      async () => {
        const birthDate = this.checkBirthDate(input.birthDate ?? null)
        const birthPlace = this.checkBirthPlace(input.birthPlace ?? null)
        const nationalities = this.checkNationalities(input.nationalities ?? [])
        const contacts = this.checkPersonalContacts(
          input.personalContacts ?? [],
        )
        const addresses = this.checkAddresses(input.addresses ?? [])
        const family = this.checkFamily(input.familyMembers ?? [])
        const emergency = this.checkEmergency(input.emergencyContacts ?? [])
        const tax = this.checkTax(input.taxProfile ?? [])
        const marital = this.checkCoded(
          input.maritalStatus ?? null,
          SYSTEMS.marital,
          'invalid_marital_status',
          'The marital status must come from a marital-status code system.',
        )
        const religion = this.checkCoded(
          input.religion ?? null,
          SYSTEMS.religion,
          'invalid_religion',
          'The religion must come from a religion code system.',
        )
        await this.assertEmployee(tenantId, employeeId)
        for (const coding of [
          marital,
          religion,
          ...family.map(({ relationship }) => relationship),
          ...emergency.map(({ relationship }) => relationship),
          ...tax.map(({ status }) => status),
        ]) {
          if (coding) {
            await this.concepts.assertActive(tenantId, coding)
          }
        }
        return this.write(input.reason, () =>
          this.profiles.saveProfile(
            tenantId,
            employeeId,
            {
              birth_date: birthDate,
              birth_place: birthPlace,
              nationalities,
              personal_contacts: contacts,
              addresses,
              marital_status: marital,
              religion,
              family_members: family,
              emergency_contacts: emergency,
              tax_profile: tax,
            },
            { expectedVersion: input.version },
          ),
        )
      },
    )
  }

  /**
   * Replaces the identifiers of an employee.
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - Employee identifier.
   * @param input - The new list.
   * @returns The profile after the write, masked.
   * @throws InvalidRequestError `invalid_identifiers`, `invalid_identifier_type`,
   * `invalid_identifier_value`, `invalid_identifier_period`, `unknown_code`, `code_retired` or
   * `code_not_in_period`.
   * @throws NotFoundError `employee_not_found`.
   * @throws ConflictError `identifier_taken` when another employee of the tenant holds one of them;
   * `stale_version`.
   */
  replaceIdentifiers(
    tenantId: string,
    employeeId: string,
    input: ReplaceIdentifiersInput,
  ): Promise<EmployeePrivateProfile> {
    return observe(
      this.logger,
      'private_profile_identifiers_replace',
      `${NAME}.replaceIdentifiers`,
      async () => {
        const identifiers = this.checkIdentifiers(input.identifiers)
        await this.assertEmployee(tenantId, employeeId)
        for (const { type } of identifiers) {
          await this.concepts.assertActive(tenantId, type)
        }
        await this.assertIdentifiersFree(tenantId, employeeId, identifiers)
        try {
          return await this.write(input.reason, () =>
            this.profiles.replaceIdentifiers(
              tenantId,
              employeeId,
              identifiers,
              {
                expectedVersion: input.version,
              },
            ),
          )
        } catch (error: unknown) {
          // A holder may have appeared after the check: the unique index decided.
          if (
            error instanceof ConflictError &&
            error.code === 'stale_version'
          ) {
            await this.assertIdentifiersFree(tenantId, employeeId, identifiers)
          }
          throw error
        }
      },
    )
  }

  /**
   * Replaces the bank accounts of an employee.
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - Employee identifier.
   * @param input - The new list.
   * @returns The profile after the write, masked.
   * @throws InvalidRequestError `invalid_bank_accounts`, `invalid_bank`, `unknown_code`,
   * `code_retired` or `code_not_in_period`.
   * @throws NotFoundError `employee_not_found`.
   * @throws ConflictError `stale_version`.
   */
  replaceBankAccounts(
    tenantId: string,
    employeeId: string,
    input: ReplaceBankAccountsInput,
  ): Promise<EmployeePrivateProfile> {
    return observe(
      this.logger,
      'private_profile_bank_accounts_replace',
      `${NAME}.replaceBankAccounts`,
      async () => {
        const entries: BankAccountEntry[] = input.bankAccounts.map((item) => ({
          bank: item.bank,
          account_name: item.accountName,
          account_number: item.accountNumber,
          swift_bic: item.swiftBic ?? null,
          currency: item.currency,
          is_primary: item.isPrimary === true,
        }))
        const accounts = normalizeBankAccounts(entries)
        if (!accounts) {
          throw new InvalidRequestError(
            'invalid_bank_accounts',
            'Give at most 5 accounts, each with a name, a number or IBAN, a currency and an optional SWIFT code, and exactly one primary account.',
          )
        }
        if (accounts.some(({ bank }) => !SYSTEMS.bank.test(bank.system))) {
          throw new InvalidRequestError(
            'invalid_bank',
            'The bank must come from a bank code system.',
          )
        }
        await this.assertEmployee(tenantId, employeeId)
        for (const { bank } of accounts) {
          await this.concepts.assertActive(tenantId, bank)
        }
        return this.write(input.reason, () =>
          this.profiles.replaceBankAccounts(tenantId, employeeId, accounts, {
            expectedVersion: input.version,
          }),
        )
      },
    )
  }

  /**
   * Loads the profile of an employee.
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - Employee identifier.
   * @returns The profile.
   * @throws NotFoundError `private_profile_not_found`.
   */
  private async load(
    tenantId: string,
    employeeId: string,
  ): Promise<EmployeePrivateProfile> {
    const profile = await this.profiles.findByEmployee(tenantId, employeeId)
    if (!profile) {
      throw new NotFoundError(
        'private_profile_not_found',
        'The employee has no private profile yet.',
      )
    }
    return profile
  }

  /**
   * Checks that the employee exists in the caller's tenant, in any status (HR plan S17). A missing,
   * malformed and foreign id give the same answer.
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - Employee identifier.
   * @throws NotFoundError `employee_not_found`.
   */
  private async assertEmployee(
    tenantId: string,
    employeeId: string,
  ): Promise<void> {
    const employee = await this.employees.findOne(employeeId)
    if (!employee || employee.tenant_id !== tenantId) {
      throw this.employeeNotFound()
    }
  }

  /**
   * Runs a repository write, with the change reason when given, and turns repository rejections
   * into workforce errors.
   *
   * @param reason - Optional reason for the change history.
   * @param write - The repository call.
   * @returns What the call returns.
   */
  private async write(
    reason: string | undefined,
    write: () => Promise<EmployeePrivateProfile>,
  ): Promise<EmployeePrivateProfile> {
    try {
      return await (reason ? withChangeReason(reason, write) : write())
    } catch (error: unknown) {
      if (error instanceof RepositoryConflictError) {
        throw new ConflictError(
          'stale_version',
          'The profile was changed by someone else. Reload it and try again.',
        )
      }
      if (error instanceof RepositoryNotFoundError) {
        throw this.employeeNotFound()
      }
      throw error
    }
  }

  /**
   * Checks the birth date: a local date from 1900-01-01 to today (HR plan S6).
   *
   * @param date - Date as sent, or `null`.
   * @returns The date, or `null`.
   * @throws InvalidRequestError `invalid_birth_date`.
   */
  private checkBirthDate(date: string | null): string | null {
    if (date === null) {
      return null
    }
    if (
      !isLocalDate(date) ||
      compareLocalDates(date, EARLIEST_BIRTH_DATE) < 0 ||
      compareLocalDates(date, todayUtc()) > 0
    ) {
      throw new InvalidRequestError(
        'invalid_birth_date',
        'The birth date must be a date from 1900-01-01 to today.',
      )
    }
    return date
  }

  /**
   * Checks the birth place.
   *
   * @param place - Place as sent, or `null`.
   * @returns The trimmed place, or `null`.
   * @throws InvalidRequestError `invalid_birth_place`.
   */
  private checkBirthPlace(place: string | null): string | null {
    if (place === null) {
      return null
    }
    const trimmed = place.trim()
    if (trimmed.length < 1 || trimmed.length > 100) {
      throw new InvalidRequestError(
        'invalid_birth_place',
        'The birth place must have 1 to 100 characters.',
      )
    }
    return trimmed
  }

  /**
   * Checks the nationalities (HR plan S7).
   *
   * @param codes - Codes as sent.
   * @returns The codes.
   * @throws InvalidRequestError `invalid_nationalities`.
   */
  private checkNationalities(codes: string[]): string[] {
    if (
      codes.length > LIMITS.nationalities ||
      new Set(codes).size !== codes.length ||
      codes.some((code) => !isCountryCode(code))
    ) {
      throw new InvalidRequestError(
        'invalid_nationalities',
        'Give at most 5 different ISO country codes, for example ID.',
      )
    }
    return [...codes]
  }

  /**
   * Checks the personal contacts (HR plan S8).
   *
   * @param inputs - Contacts as sent.
   * @returns The cleaned contacts.
   * @throws InvalidRequestError `invalid_contacts`.
   */
  private checkPersonalContacts(inputs: ContactInput[]): ContactPoint[] {
    const contacts = normalizeContacts(
      inputs,
      ['home', 'mobile'],
      LIMITS.personalContacts,
    )
    if (!contacts) {
      throw this.invalidContacts()
    }
    return contacts
  }

  /**
   * Checks the addresses (HR plan S9).
   *
   * @param inputs - Addresses as sent.
   * @returns The cleaned addresses.
   * @throws InvalidRequestError `invalid_addresses`.
   */
  private checkAddresses(inputs: Address[]): Address[] {
    const cleaned = inputs.map((address) => normalizeAddress(address))
    if (
      inputs.length > LIMITS.addresses ||
      cleaned.some((address) => address === null)
    ) {
      throw new InvalidRequestError(
        'invalid_addresses',
        'Give at most 5 addresses, each with a real country code and a subdivision like ID-JK.',
      )
    }
    return cleaned as Address[]
  }

  /**
   * Checks a coded field's system name; whether the code is active is checked later.
   *
   * @param coding - The code as sent, or `null`.
   * @param system - Pattern the system name must match.
   * @param code - Error code to raise.
   * @param message - Error message.
   * @returns The cleaned code, or `null`.
   * @throws InvalidRequestError with the given code.
   */
  private checkCoded(
    coding: Coding | null,
    system: RegExp,
    code: string,
    message: string,
  ): Coding | null {
    if (coding === null) {
      return null
    }
    if (!system.test(coding.system)) {
      throw new InvalidRequestError(code, message)
    }
    return { system: coding.system, code: coding.code }
  }

  /**
   * Checks the family members (HR plan S11).
   *
   * @param inputs - Members as sent.
   * @returns The cleaned members.
   * @throws InvalidRequestError `invalid_family_members`.
   */
  private checkFamily(inputs: FamilyMemberInput[]): FamilyMember[] {
    const invalid = new InvalidRequestError(
      'invalid_family_members',
      'Give at most 20 family members, each with a relationship from a family-relationship code system, a name and an optional birth date not in the future.',
    )
    if (inputs.length > LIMITS.familyMembers) {
      throw invalid
    }
    return inputs.map((input) => {
      const name = normalizeName(input.name, 'official')
      const birthDate = input.birthDate ?? null
      if (
        !name ||
        !SYSTEMS.relationship.test(input.relationship.system) ||
        (birthDate !== null &&
          (!isLocalDate(birthDate) ||
            compareLocalDates(birthDate, EARLIEST_BIRTH_DATE) < 0 ||
            compareLocalDates(birthDate, todayUtc()) > 0))
      ) {
        throw invalid
      }
      return {
        relationship: {
          system: input.relationship.system,
          code: input.relationship.code,
        },
        name,
        birth_date: birthDate,
        is_dependent: input.isDependent === true,
      }
    })
  }

  /**
   * Checks the emergency contacts (HR plan S11).
   *
   * @param inputs - Contacts as sent.
   * @returns The cleaned contacts.
   * @throws InvalidRequestError `invalid_emergency_contacts`.
   */
  private checkEmergency(inputs: EmergencyContactInput[]): EmergencyContact[] {
    const invalid = new InvalidRequestError(
      'invalid_emergency_contacts',
      'Give at most 5 emergency contacts, each with a name, a relationship from a family-relationship code system and 1 to 5 phones or emails.',
    )
    if (inputs.length > LIMITS.emergencyContacts) {
      throw invalid
    }
    return inputs.map((input) => {
      const name = input.name.trim()
      const contacts = normalizeContacts(
        input.contacts,
        ['mobile', 'home', 'work'],
        LIMITS.emergencyContactChannels,
      )
      if (
        name.length < 1 ||
        name.length > 200 ||
        !contacts ||
        contacts.length < 1 ||
        !SYSTEMS.relationship.test(input.relationship.system)
      ) {
        throw invalid
      }
      return {
        name,
        relationship: {
          system: input.relationship.system,
          code: input.relationship.code,
        },
        contacts,
      }
    })
  }

  /**
   * Checks the tax history and puts it in date order (HR plan S12).
   *
   * @param inputs - Entries as sent.
   * @returns The cleaned entries, oldest first.
   * @throws InvalidRequestError `invalid_tax_profile`.
   */
  private checkTax(inputs: TaxProfileInput[]): TaxProfile[] {
    const invalid = new InvalidRequestError(
      'invalid_tax_profile',
      'Give at most 20 tax statuses, each with an ISO country, a status from a tax-status code system and a date, one per date.',
    )
    const entries = inputs.map((input) => ({
      country: input.country,
      status: { system: input.status.system, code: input.status.code },
      effective_date: input.effectiveDate,
    }))
    if (
      entries.length > LIMITS.taxProfile ||
      entries.some(
        (entry) =>
          !isCountryCode(entry.country) ||
          !SYSTEMS.tax.test(entry.status.system) ||
          !isLocalDate(entry.effective_date),
      ) ||
      new Set(entries.map((entry) => entry.effective_date)).size !==
        entries.length
    ) {
      throw invalid
    }
    return entries.sort((left, right) =>
      compareLocalDates(left.effective_date, right.effective_date),
    )
  }

  /**
   * Checks and cleans the identifiers: at most 10, one per system, each with a known shape (HR plan
   * S13). Whether the type code is active is checked later.
   *
   * @param entries - Identifiers as sent.
   * @returns The cleaned identifiers, with normalized plain values.
   * @throws InvalidRequestError `invalid_identifiers`, `invalid_identifier_type`,
   * `invalid_identifier_value` or `invalid_identifier_period`.
   */
  private checkIdentifiers(
    entries: IdentifierEntry[],
  ): PersonIdentifierInput[] {
    const systems = entries.map((entry) => entry.system)
    if (
      entries.length > LIMITS.identifiers ||
      new Set(systems).size !== systems.length ||
      entries.some(
        (entry) =>
          !IDENTIFIER_SYSTEM_PATTERN.test(entry.system) ||
          !isCountryCode(entry.issuingCountry),
      )
    ) {
      throw new InvalidRequestError(
        'invalid_identifiers',
        'Give at most 10 identifiers, one per system, each with a system name and an ISO issuing country.',
      )
    }
    return entries.map((entry) => {
      if (!SYSTEMS.identifierType.test(entry.type.system)) {
        throw new InvalidRequestError(
          'invalid_identifier_type',
          'The identifier type must come from an identifier-type code system.',
        )
      }
      const value = normalizeIdentifier(entry.system, entry.value)
      if (value === null) {
        throw new InvalidRequestError(
          'invalid_identifier_value',
          'The identifier does not fit the format of its system.',
        )
      }
      const period = entry.period
        ? { start: entry.period.start, end: entry.period.end ?? null }
        : null
      if (period && !isValidPeriod(period)) {
        throw new InvalidRequestError(
          'invalid_identifier_period',
          'The validity must be dates like 2026-01-31, the end not before the start.',
        )
      }
      return {
        type: { system: entry.type.system, code: entry.type.code },
        system: entry.system,
        issuing_country: entry.issuingCountry,
        value,
        period,
      }
    })
  }

  /**
   * Checks that no other employee of the tenant holds one of the identifiers (HR plan S14). The
   * answer never says who holds it.
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - Employee being written, whose own identifiers are fine.
   * @param identifiers - Identifiers to check.
   * @throws ConflictError `identifier_taken`.
   */
  private async assertIdentifiersFree(
    tenantId: string,
    employeeId: string,
    identifiers: PersonIdentifierInput[],
  ): Promise<void> {
    for (const { system, value } of identifiers) {
      const holder = await this.profiles.findEmployeeIdByIdentifier(
        tenantId,
        system,
        value,
      )
      if (holder !== null && holder !== employeeId) {
        throw new ConflictError(
          'identifier_taken',
          'Another employee already holds one of these identifiers.',
        )
      }
    }
  }

  /**
   * @returns The rejection for bad contacts.
   */
  private invalidContacts(): InvalidRequestError {
    return new InvalidRequestError(
      'invalid_contacts',
      'Give at most 10 contacts: phones as +62..., emails as name@domain, used at home or on a mobile, one primary per kind.',
    )
  }

  /**
   * @returns The rejection for an employee that is not in the caller's tenant.
   */
  private employeeNotFound(): NotFoundError {
    return new NotFoundError(
      'employee_not_found',
      'The employee was not found.',
    )
  }
}
