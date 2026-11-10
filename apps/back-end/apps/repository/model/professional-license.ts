import { type Entity } from '@utility/database/interface'
import { type ActorRef } from '@utility/history/actor'
import { type Address } from './common/address'
import { type LocalDate } from './common/calendar'
import { type Coding } from './common/coding'
import { type FileRef } from './common/file-ref'
import { Timestamp } from './timestamp'

/**
 * Licence status (HR spec 6.3), plus `superseded` for a SIP replaced by its verified renewal
 * (`human-resource-collections.md` 3.3).
 */
export type LicenseStatus =
  | 'pending_verification'
  | 'valid'
  | 'rejected'
  | 'expired'
  | 'revoked'
  | 'superseded'

/**
 * Clinical-eligibility condition a licence type satisfies: STR is `registration`, SIP is
 * `practice_permit` (HR spec 5.5). `null` for licences that are recorded but not checked.
 */
export type EligibilityRole = 'registration' | 'practice_permit'

/**
 * Body that issued a licence.
 *
 * @property code - The authority as a code, when one exists.
 * @property name - Name as printed.
 */
export interface IssuingAuthority {
  code: Coding | null
  name: string
}

/**
 * Where a licence applies.
 *
 * @property country - ISO 3166-1 alpha-2 code.
 * @property subdivision - ISO 3166-2 code, for example a US state, or `null`.
 */
export interface LicenseJurisdiction {
  country: string
  subdivision: string | null
}

/**
 * Practice location named on a location-specific licence (SIP).
 *
 * @property facility_id - Facility of this tenant, or `null` for another hospital or clinic.
 * @property name - Name as printed.
 * @property address - Address as printed.
 */
export interface PracticeLocation {
  facility_id: string | null
  name: string
  address: Address | null
}

/**
 * How a licence was submitted.
 *
 * @property via - Self-service by the employee or entry by HR.
 * @property by - Who submitted it; must differ from the verifier (`HR-LIC-002`).
 * @property at - When.
 */
export interface LicenseSubmission {
  via: 'self_service' | 'hr'
  by: ActorRef
  at: Date
}

/**
 * Primary-source verification by HR Admin (HR spec 6.4.2).
 *
 * @property by - Verifier.
 * @property at - When.
 * @property method - For example `manual_registry_check`.
 * @property outcome - Whether the document matched the original and the registry.
 * @property notes - Verifier's notes.
 */
export interface LicenseVerification {
  by: ActorRef
  at: Date
  method: Coding
  outcome: 'match' | 'mismatch'
  notes: string | null
}

/**
 * Reason recorded when a licence is rejected or revoked.
 *
 * @property effective_date - Local date it takes effect.
 * @property reason - Reason code.
 * @property notes - Free text.
 */
export interface LicenseStatusReason {
  effective_date: LocalDate
  reason: Coding
  notes: string | null
}

/**
 * Link from a superseded SIP to its renewal.
 *
 * @property by_license_id - The renewal that replaced it.
 * @property effective_date - The renewal's issue date.
 */
export interface LicenseSupersession {
  by_license_id: string
  effective_date: LocalDate
}

/**
 * A legal document that lets a clinical employee practise: STR, SIP, or another country's
 * registration or permit (`human-resource-collections.md` 3.2, HR spec 6). Never deleted
 * (`HR-LIC-008`).
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property employee_id - Holder.
 * @property license_type - Licence type concept, for example `id.license-type|sip`.
 * @property eligibility_role - Copied from the type when registered.
 * @property profession - Must equal the employee's to be verified (`HR-LIC-003`).
 * @property specialty - Must equal the employee's primary specialty, or `null`.
 * @property document_number - As printed.
 * @property document_number_normalized - Upper-case without spaces, dots and hyphens; used for uniqueness.
 * @property issuing_authority - Who issued it.
 * @property jurisdiction - Where it applies.
 * @property practice_location - Required for location-specific types; one location per licence.
 * @property issue_date - Issue date.
 * @property expiry_date - Expiry date, or `null` for lifetime licences.
 * @property document - Scan of the original.
 * @property status - Current status.
 * @property status_effective_date - Local date the current status took effect.
 * @property is_live - False once rejected; a rejected record does not block its correction.
 * @property submission - How it was submitted.
 * @property verification - Verification result, or `null`.
 * @property rejection - Rejection reason, or `null`.
 * @property revocation - Revocation by the issuing authority, or `null`.
 * @property superseded - Set when a verified renewal replaced it, or `null`.
 * @property replaces_license_id - Licence this one renews, or `null`.
 * @property created_by - Who created the record.
 */
export class ProfessionalLicense extends Timestamp implements Entity {
  id!: string
  tenant_id!: string
  schema_version!: number
  version!: number
  employee_id!: string
  license_type!: Coding
  eligibility_role!: EligibilityRole | null
  profession!: Coding
  specialty!: Coding | null
  document_number!: string
  document_number_normalized!: string
  issuing_authority!: IssuingAuthority
  jurisdiction!: LicenseJurisdiction
  practice_location!: PracticeLocation | null
  issue_date!: LocalDate
  expiry_date!: LocalDate | null
  document!: FileRef
  status!: LicenseStatus
  status_effective_date!: LocalDate
  is_live!: boolean
  submission!: LicenseSubmission
  verification!: LicenseVerification | null
  rejection!: LicenseStatusReason | null
  revocation!: LicenseStatusReason | null
  superseded!: LicenseSupersession | null
  replaces_license_id!: string | null
  created_by!: ActorRef
}
