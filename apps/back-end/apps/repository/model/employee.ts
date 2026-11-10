import { type Entity } from '@utility/database/interface'
import { type ActorRef } from '@utility/history/actor'
import { type LocalDate } from './common/calendar'
import { type Coding } from './common/coding'
import { type ContactPoint } from './common/contact-point'
import { type ExternalId } from './common/external-id'
import { type FileRef } from './common/file-ref'
import { type HumanName } from './common/human-name'
import { Timestamp } from './timestamp'

/**
 * Employment status (HR spec 5.4).
 */
export type EmploymentStatus =
  'onboarding' | 'probation' | 'active' | 'suspended' | 'separated'

/**
 * One specialty of a practitioner.
 *
 * @property coding - The specialty, for example `id.specialty|penyakit_dalam`.
 * @property is_primary - Main specialty, matched against licences (`HR-LIC-003`).
 */
export interface EmployeeSpecialty {
  coding: Coding
  is_primary: boolean
}

/**
 * Summary of the employee's active contract, kept in step with `employment_contracts`.
 *
 * @property contract_id - Active contract.
 * @property organization_id - Employer.
 * @property employment_type - Type of the contract, for example `id.employment-type|pkwt`.
 * @property start_date - First day of the contract.
 */
export interface CurrentEmployment {
  contract_id: string
  organization_id: string
  employment_type: Coding
  start_date: LocalDate
}

/**
 * Summary of the employee's primary position assignment, kept in step with `position_assignments`.
 *
 * @property assignment_id - The assignment.
 * @property facility_id - Facility of the position.
 * @property unit_id - Unit of the position.
 * @property position_id - The position.
 */
export interface PrimaryAssignment {
  assignment_id: string
  facility_id: string
  unit_id: string
  position_id: string
}

/**
 * A person employed by or contracted to the hospital: the public and internal part of the
 * HR record (`account-and-workforce-collections.md` 4.1, HR spec 5.1). Confidential data is
 * in `EmployeePrivateProfile`. Having an employee record gives no access to the system.
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property employee_number - Hospital-issued number; unique in the tenant and never reused.
 * @property name - Official name as on the identity document and diplomas.
 * @property other_names - Usual name and native-script variants.
 * @property display_name - Name to show, computed from `name`.
 * @property administrative_gender - FHIR administrative gender.
 * @property workforce_category - For example `id.workforce-category|tenaga_medis` (HR spec 5.2).
 * @property is_clinical - Copied from the category concept; clinical rules apply when true.
 * @property profession - Required for clinical categories.
 * @property specialties - Specialties and subspecialties.
 * @property clinical_level - Nursing or midwifery career level (PK I to V), or `null`.
 * @property employment_status - Current status (HR spec 5.4).
 * @property employment_status_since - Local date the status took effect.
 * @property current_employment - Active contract summary, or `null`.
 * @property primary_assignment - Primary position summary, or `null`.
 * @property original_hire_date - First hire date; kept when the person is rehired.
 * @property separation_date - Last day of employment, or `null`.
 * @property practitioner_ids - Public registry numbers such as the SATUSEHAT IHS number or NPI.
 * @property work_contacts - Work email and phone; personal contacts are in the private profile.
 * @property photo - Staff photo.
 * @property preferred_language - BCP 47 language tag.
 * @property created_by - Who created the record.
 */
export class Employee extends Timestamp implements Entity {
  id!: string
  tenant_id!: string
  schema_version!: number
  version!: number
  employee_number!: string
  name!: HumanName
  other_names!: HumanName[]
  display_name!: string
  administrative_gender!: Coding | null
  workforce_category!: Coding
  is_clinical!: boolean
  profession!: Coding | null
  specialties!: EmployeeSpecialty[]
  clinical_level!: Coding | null
  employment_status!: EmploymentStatus
  employment_status_since!: LocalDate
  current_employment!: CurrentEmployment | null
  primary_assignment!: PrimaryAssignment | null
  original_hire_date!: LocalDate
  separation_date!: LocalDate | null
  practitioner_ids!: ExternalId[]
  work_contacts!: ContactPoint[]
  photo!: FileRef | null
  preferred_language!: string | null
  created_by!: ActorRef
}
