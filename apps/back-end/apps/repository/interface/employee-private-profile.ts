import {
  type Repository,
  type UpdateOptions,
} from '@utility/database/interface'
import { type BankAccountInput } from '@repository/model/common/bank-account'
import { type PersonIdentifierInput } from '@repository/model/common/person-identifier'
import { type EmployeePrivateProfile } from '@repository/model/employee-private-profile'

/**
 * The fields `saveProfile` replaces: everything of the profile except the identifiers and the bank
 * accounts, which have their own writes so one cannot wipe the other.
 */
export type ProfileFields = Pick<
  EmployeePrivateProfile,
  | 'birth_date'
  | 'birth_place'
  | 'nationalities'
  | 'personal_contacts'
  | 'addresses'
  | 'marital_status'
  | 'religion'
  | 'family_members'
  | 'emergency_contacts'
  | 'tax_profile'
>

/**
 * One identifier in full, for the reveal.
 *
 * @property profile_id - Profile that holds it.
 * @property value - The plain value.
 */
export interface RevealedIdentifier {
  profile_id: string
  value: string
}

/**
 * Employee private profile data access. Inject it with `REPOSITORY_EMPLOYEE_PRIVATE_PROFILE`.
 *
 * Encryption, hashing and masking happen inside the implementation (`database.md` 4.6): callers
 * write plain values and read the profile with identifiers and bank accounts masked. The generic
 * `create`, `update`, `delete` and `deleteSoft` are not supported: the three `save` and `replace`
 * writes below replace them, and each creates the profile when the employee has none yet.
 */
export interface EmployeePrivateProfileRepository extends Repository<EmployeePrivateProfile> {
  /**
   * Finds the profile of an employee, with identifiers and bank accounts masked and the birth date
   * decrypted.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - Employee the profile belongs to.
   * @returns The profile, or `null` when the employee has none.
   */
  findByEmployee(
    tenantId: string,
    employeeId: string,
  ): Promise<EmployeePrivateProfile | null>

  /**
   * Finds one identifier of an employee in full.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - Employee the profile belongs to.
   * @param system - Identifier system, for example `id.nik`.
   * @returns The plain value and its profile, or `null` when the employee has no such identifier.
   * @throws RepositoryError when the stored value cannot be decrypted.
   */
  findIdentifierValue(
    tenantId: string,
    employeeId: string,
    system: string,
  ): Promise<RevealedIdentifier | null>

  /**
   * Finds the employee that holds an identifier, by its hash.
   *
   * @param tenantId - Tenant to search in.
   * @param system - Identifier system.
   * @param value - Normalized plain value.
   * @returns The identifier of the employee, or `null` when nobody holds it.
   */
  findEmployeeIdByIdentifier(
    tenantId: string,
    system: string,
    value: string,
  ): Promise<string | null>

  /**
   * Replaces the profile fields (not the identifiers or bank accounts) and records the change.
   *
   * @param tenantId - Tenant of the employee.
   * @param employeeId - Employee the profile belongs to.
   * @param fields - The new fields.
   * @param options - With `expectedVersion`, rejects with `RepositoryConflictError` when the stored version differs.
   * @returns The profile after the write.
   */
  saveProfile(
    tenantId: string,
    employeeId: string,
    fields: ProfileFields,
    options?: UpdateOptions,
  ): Promise<EmployeePrivateProfile>

  /**
   * Replaces the identifiers: encrypts, hashes and masks each value, and records the change with the
   * masked forms only. Rejects with `RepositoryConflictError` when another employee of the tenant
   * holds one of them.
   *
   * @param tenantId - Tenant of the employee.
   * @param employeeId - Employee the profile belongs to.
   * @param identifiers - The new identifiers, with normalized plain values.
   * @param options - With `expectedVersion`, rejects when the stored version differs.
   * @returns The profile after the write.
   */
  replaceIdentifiers(
    tenantId: string,
    employeeId: string,
    identifiers: PersonIdentifierInput[],
    options?: UpdateOptions,
  ): Promise<EmployeePrivateProfile>

  /**
   * Replaces the bank accounts: encrypts and masks each number, and records the change with the
   * masked forms only.
   *
   * @param tenantId - Tenant of the employee.
   * @param employeeId - Employee the profile belongs to.
   * @param accounts - The new accounts, with normalized plain numbers.
   * @param options - With `expectedVersion`, rejects when the stored version differs.
   * @returns The profile after the write.
   */
  replaceBankAccounts(
    tenantId: string,
    employeeId: string,
    accounts: BankAccountInput[],
    options?: UpdateOptions,
  ): Promise<EmployeePrivateProfile>
}
