import { type Entity } from '@utility/database/interface'
import { type ActorRef } from '@utility/history/actor'
import { type StatusDecision } from './common/decision'
import { type PrivilegeCondition } from './common/credentialing'
import { Timestamp } from './timestamp'

/**
 * Supervisor of a supervised privilege.
 *
 * @property employee_id - The supervisor.
 * @property grant_id - The supervisor's own grant of the same privilege, which must be full and active.
 */
export interface GrantSupervisor {
  employee_id: string
  grant_id: string
}

/**
 * Warning on a grant that needs the committee's attention (`HR-CRD-006`).
 *
 * @property reason - Why it was flagged.
 * @property at - When.
 * @property resolved_at - When resolved, or `null`.
 */
export interface GrantFlag {
  reason: 'supervisor_lost_privilege'
  at: Date
  resolved_at: Date | null
}

/**
 * One line of the RKK attached to an SPK (`human-resource-collections.md` 4.6).
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property appointment_id - The SPK.
 * @property employee_id - Practitioner, copied from the SPK.
 * @property facility_ids - Copied from the SPK.
 * @property unit_ids - Copied from the SPK.
 * @property catalog_item_id - The privilege.
 * @property code - Catalog code at the time of the grant.
 * @property condition - How it may be performed.
 * @property supervisor - Required when supervised, otherwise `null`.
 * @property restriction_notes - Required when restricted, otherwise `null`.
 * @property status - Whether the grant is in force.
 * @property status_change - Latest suspension or revocation, or `null`.
 * @property flag - Open warning, or `null`.
 * @property created_by - Who created the record.
 */
export class PrivilegeGrant extends Timestamp implements Entity {
  id!: string
  tenant_id!: string
  schema_version!: number
  version!: number
  appointment_id!: string
  employee_id!: string
  facility_ids!: string[]
  unit_ids!: string[]
  catalog_item_id!: string
  code!: string
  condition!: PrivilegeCondition
  supervisor!: GrantSupervisor | null
  restriction_notes!: string | null
  status!: 'active' | 'suspended' | 'revoked'
  status_change!: StatusDecision | null
  flag!: GrantFlag | null
  created_by!: ActorRef
}
