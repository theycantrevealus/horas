import { type Entity } from '@utility/database/interface'
import { type ActorRef } from '@utility/history/actor'
import { type Address } from './common/address'
import { type BankAccount } from './common/bank-account'
import { type LocalDate } from './common/calendar'
import { type Coding } from './common/coding'
import { type ContactPoint } from './common/contact-point'
import { type HumanName } from './common/human-name'
import { type PersonIdentifier } from './common/person-identifier'
import { Timestamp } from './timestamp'

/**
 * Family member of an employee, for insurance and tax.
 *
 * @property relationship - For example spouse or child.
 * @property name - The person's name.
 * @property birth_date - Birth date, when known.
 * @property is_dependent - Counted as a dependent for benefits and tax.
 */
export interface FamilyMember {
  relationship: Coding
  name: HumanName
  birth_date: LocalDate | null
  is_dependent: boolean
}

/**
 * Person to call in an emergency.
 *
 * @property name - Full name.
 * @property relationship - Relationship to the employee.
 * @property contacts - How to reach them.
 */
export interface EmergencyContact {
  name: string
  relationship: Coding
  contacts: ContactPoint[]
}

/**
 * Tax status of an employee from a date, for example Indonesian PTKP `K/1`.
 *
 * @property country - ISO 3166-1 alpha-2 code.
 * @property status - Tax status code.
 * @property effective_date - First day it applies.
 */
export interface TaxProfile {
  country: string
  status: Coding
  effective_date: LocalDate
}

/**
 * Confidential personal data of an employee, one per employee
 * (`account-and-workforce-collections.md` 4.2, HR spec 14). Read only by HR, the Payroll
 * Officer and the employee. Identifier and bank numbers appear only masked; the birth date is
 * stored encrypted.
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property employee_id - The employee; one profile each.
 * @property birth_date - Birth date, or `null`.
 * @property birth_place - Place of birth.
 * @property nationalities - ISO 3166-1 alpha-2 codes.
 * @property identifiers - National id, passport, work permit, tax and social insurance numbers.
 * @property personal_contacts - Personal phone and email.
 * @property addresses - Home and mailing addresses.
 * @property marital_status - Needed for tax status in some countries.
 * @property religion - Only where the jurisdiction requires it; special-category data elsewhere.
 * @property family_members - Family and dependents.
 * @property emergency_contacts - People to call in an emergency.
 * @property bank_accounts - Salary accounts.
 * @property tax_profile - Tax status history, newest last.
 * @property created_by - Who created the record.
 */
export class EmployeePrivateProfile extends Timestamp implements Entity {
  id!: string
  tenant_id!: string
  schema_version!: number
  version!: number
  employee_id!: string
  birth_date!: LocalDate | null
  birth_place!: string | null
  nationalities!: string[]
  identifiers!: PersonIdentifier[]
  personal_contacts!: ContactPoint[]
  addresses!: Address[]
  marital_status!: Coding | null
  religion!: Coding | null
  family_members!: FamilyMember[]
  emergency_contacts!: EmergencyContact[]
  bank_accounts!: BankAccount[]
  tax_profile!: TaxProfile[]
  created_by!: ActorRef
}
