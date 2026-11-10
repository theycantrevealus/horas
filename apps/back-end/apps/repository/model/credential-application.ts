import { type Entity } from '@utility/database/interface'
import { type ActorRef } from '@utility/history/actor'
import { type Coding } from './common/coding'
import { type FileRef } from './common/file-ref'
import {
  type CredentialingScope,
  type PrivilegeCondition,
} from './common/credentialing'
import { Timestamp } from './timestamp'

/**
 * Kind of application (HR spec 7.2).
 */
export type CredentialApplicationType =
  'initial' | 'recredentialing' | 'privilege_extension' | 'temporary'

/**
 * Application status (HR spec 7.3).
 */
export type CredentialApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'returned'
  | 'assessed'
  | 'recommended'
  | 'approved'
  | 'rejected'
  | 'withdrawn'

/**
 * One requested privilege.
 *
 * @property catalog_item_id - Requested catalog item.
 * @property code - Catalog code at the time of the request.
 * @property requested_condition - Condition asked for.
 * @property proposed_supervisor_employee_id - Supervisor proposed for a supervised privilege, or `null`.
 * @property notes - Applicant's notes.
 */
export interface RequestedPrivilege {
  catalog_item_id: string
  code: string
  requested_condition: PrivilegeCondition
  proposed_supervisor_employee_id: string | null
  notes: string | null
}

/**
 * A document attached to the application.
 *
 * @property type - Diploma, certificate, logbook, health statement, reference, ...
 * @property file - The file.
 * @property license_id - Licence record when the document is an STR or SIP, or `null`.
 */
export interface ApplicationDocument {
  type: Coding
  file: FileRef
  license_id: string | null
}

/**
 * Assessor's conflict-of-interest declaration (`HR-CRD-005`).
 *
 * @property declared_at - When it was declared.
 * @property has_conflict - Whether there is a conflict.
 * @property relationship - Kind of relationship to the applicant, or `null`.
 */
export interface ConflictDeclaration {
  declared_at: Date
  has_conflict: boolean
  relationship: Coding | null
}

/**
 * Mitra Bestari appointed to assess the application.
 *
 * @property employee_id - The assessor.
 * @property appointed_at - When appointed.
 * @property appointed_by - Who appointed them.
 * @property conflict_declaration - Declaration, or `null` until made.
 */
export interface ApplicationAssessor {
  employee_id: string
  appointed_at: Date
  appointed_by: ActorRef
  conflict_declaration: ConflictDeclaration | null
}

/**
 * Committee recommendation for one privilege. Never more than requested (`HR-CRD-008`).
 *
 * @property catalog_item_id - The privilege.
 * @property outcome - Recommended or not.
 * @property condition - Recommended condition, or `null` when not recommended.
 * @property supervisor_employee_id - Supervisor for a supervised privilege, or `null`.
 * @property restriction_notes - Restrictions for a restricted privilege, or `null`.
 */
export interface RecommendedPrivilege {
  catalog_item_id: string
  outcome: 'recommended' | 'not_recommended'
  condition: PrivilegeCondition | null
  supervisor_employee_id: string | null
  restriction_notes: string | null
}

/**
 * The committee's signed recommendation to the Director.
 *
 * @property decided_at - When decided.
 * @property signed_by - Signer.
 * @property summary - Summary of the assessment.
 * @property privileges - Recommendation per privilege.
 */
export interface CommitteeRecommendation {
  decided_at: Date
  signed_by: ActorRef
  summary: string
  privileges: RecommendedPrivilege[]
}

/**
 * The Director's decision.
 *
 * @property outcome - Approved or rejected.
 * @property decided_by - Director or delegate.
 * @property decided_at - When.
 * @property reason - Reason, required when rejected.
 * @property appointment_id - SPK created on approval, or `null`.
 */
export interface DirectorDecision {
  outcome: 'approved' | 'rejected'
  decided_by: ActorRef
  decided_at: Date
  reason: string | null
  appointment_id: string | null
}

/**
 * Extra data of a temporary application (HR spec 7.4.4).
 *
 * @property requested_days - Duration asked for; at most `TEMPORARY_PRIVILEGE_MAX_DAYS`.
 * @property urgency - Why it is urgent, for example disaster or visiting specialist.
 */
export interface TemporaryRequest {
  requested_days: number
  urgency: Coding
}

/**
 * Request of a clinical employee to be granted clinical privileges
 * (`human-resource-collections.md` 4.3, HR spec 7). Never deleted (`HR-CRD-010`).
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property employee_id - Applicant.
 * @property credentialing_facility_id - Facility whose committee credentials the applicant and whose Director decides.
 * @property credentialing_scope - Copied from `CREDENTIALING_SCOPE` when created.
 * @property type - Kind of application.
 * @property committee - Credentialing committee, from the workforce category.
 * @property status - Current status.
 * @property status_since - When the current status started, for SLA alerts.
 * @property requested_privileges - Privileges asked for.
 * @property requested_unit_ids - Units where the applicant will practise.
 * @property requested_facility_ids - Facilities of those units.
 * @property documents - Attached documents.
 * @property assessors - Appointed Mitra Bestari.
 * @property recommendation - Committee recommendation, or `null`.
 * @property decision - Director's decision, or `null`.
 * @property return_reason - Why it was last returned, or `null`.
 * @property withdrawal_reason - Why it was withdrawn, or `null`.
 * @property temporary - Temporary request data, or `null`.
 * @property previous_appointment_id - SPK being renewed or extended, or `null`.
 * @property created_by - Who created the record.
 */
export class CredentialApplication extends Timestamp implements Entity {
  id!: string
  tenant_id!: string
  schema_version!: number
  version!: number
  employee_id!: string
  credentialing_facility_id!: string
  credentialing_scope!: CredentialingScope
  type!: CredentialApplicationType
  committee!: Coding
  status!: CredentialApplicationStatus
  status_since!: Date
  requested_privileges!: RequestedPrivilege[]
  requested_unit_ids!: string[]
  requested_facility_ids!: string[]
  documents!: ApplicationDocument[]
  assessors!: ApplicationAssessor[]
  recommendation!: CommitteeRecommendation | null
  decision!: DirectorDecision | null
  return_reason!: string | null
  withdrawal_reason!: string | null
  temporary!: TemporaryRequest | null
  previous_appointment_id!: string | null
  created_by!: ActorRef
}
