import { type Entity } from '@utility/database/interface'
import { type ActorRef } from '@utility/history/actor'
import { Timestamp } from './timestamp'

/**
 * Swap request status (HR spec 8.2).
 */
export type SwapStatus =
  | 'requested'
  | 'accepted_by_counterpart'
  | 'approved'
  | 'rejected'
  | 'cancelled'

/**
 * One side of a swap.
 *
 * @property employee_id - The person.
 * @property assignment_id - Their assignment, or `null` when the counterpart takes a shift without giving one.
 */
export interface SwapParty {
  employee_id: string
  assignment_id: string | null
}

/**
 * Head of Unit's decision on a swap.
 *
 * @property by - Who decided.
 * @property at - When.
 * @property reason - Reason, required when rejected.
 */
export interface SwapDecision {
  by: ActorRef
  at: Date
  reason: string | null
}

/**
 * Request to swap or give away a shift (`human-resource-collections.md` 5.8, HR spec 8.4.2).
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property unit_id - Unit of the roster.
 * @property roster_id - The roster.
 * @property requester - Who asks, with their assignment.
 * @property counterpart - Who takes over, or `null` while no one is named.
 * @property reason - Why.
 * @property status - Current status.
 * @property counterpart_accepted_at - When the counterpart accepted, or `null`.
 * @property decision - Head of Unit's decision, or `null`.
 * @property resulting_assignment_ids - Assignments created on approval.
 * @property created_by - Who created the record.
 */
export class ShiftSwapRequest extends Timestamp implements Entity {
  id!: string
  tenant_id!: string
  schema_version!: number
  version!: number
  unit_id!: string
  roster_id!: string
  requester!: SwapParty
  counterpart!: SwapParty | null
  reason!: string
  status!: SwapStatus
  counterpart_accepted_at!: Date | null
  decision!: SwapDecision | null
  resulting_assignment_ids!: string[]
  created_by!: ActorRef
}
