import { type Entity } from '@utility/database/interface'
import { type ActorRef } from '@utility/history/actor'
import { type ClosedDatePeriod, type LocalDate } from './common/calendar'
import { type FileRef } from './common/file-ref'
import { type StatusDecision } from './common/decision'
import { type CredentialingScope } from './common/credentialing'
import { Timestamp } from './timestamp'

/**
 * SPK status (HR spec 7.3).
 */
export type ClinicalAppointmentStatus =
  'active' | 'suspended' | 'revoked' | 'expired' | 'superseded'

/**
 * Who issued an SPK.
 *
 * @property by - Account that recorded the issue.
 * @property director_employee_id - Director or delegate of the credentialing facility.
 * @property date - Issue date.
 */
export interface AppointmentIssue {
  by: ActorRef
  director_employee_id: string
  date: LocalDate
}

/**
 * The Director's letter that assigns a practitioner to clinical work, with the RKK attached as
 * `PrivilegeGrant` records (`human-resource-collections.md` 4.5, HR spec 7).
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property appointment_number - Letter number; unique in the tenant.
 * @property employee_id - Practitioner.
 * @property credentialing_facility_id - Facility whose committee recommended it and whose Director issued it.
 * @property credentialing_scope - Scope it was issued under.
 * @property facility_ids - Facilities of the covered units; only that one facility under scope `facility`.
 * @property unit_ids - Units covered (`HR-CRD-009`).
 * @property source_application_id - Application it came from.
 * @property valid_period - Validity; at most `SPK_VALIDITY_YEARS` (`HR-CRD-004`).
 * @property is_temporary - Issued under HR spec 7.4.4.
 * @property status - Current status.
 * @property is_current - True while active or suspended; one current regular SPK per employee and credentialing facility.
 * @property issued - Issue details.
 * @property signed_document - Scan of the signed letter.
 * @property suspension - Suspension decision, or `null`.
 * @property revocation - Revocation decision, or `null`.
 * @property superseded_by_id - SPK that replaced it, or `null`.
 * @property created_by - Who created the record.
 */
export class ClinicalAppointment extends Timestamp implements Entity {
  id!: string
  tenant_id!: string
  schema_version!: number
  version!: number
  appointment_number!: string
  employee_id!: string
  credentialing_facility_id!: string
  credentialing_scope!: CredentialingScope
  facility_ids!: string[]
  unit_ids!: string[]
  source_application_id!: string
  valid_period!: ClosedDatePeriod
  is_temporary!: boolean
  status!: ClinicalAppointmentStatus
  is_current!: boolean
  issued!: AppointmentIssue
  signed_document!: FileRef | null
  suspension!: StatusDecision | null
  revocation!: StatusDecision | null
  superseded_by_id!: string | null
  created_by!: ActorRef
}
