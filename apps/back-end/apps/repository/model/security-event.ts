import { type Entity } from '@utility/database/interface'
import { type ActorRef } from '@utility/history/actor'
import { Timestamp } from './timestamp'

/**
 * Kinds of authentication events.
 */
export type SecurityEventType =
  | 'login_succeeded'
  | 'login_failed'
  | 'account_locked'
  | 'token_refreshed'
  | 'token_reuse_detected'
  | 'logout'
  | 'password_changed'
  | 'password_reset'
  | 'session_revoked'
  | 'account_hold_placed'
  | 'account_hold_lifted'

/**
 * One authentication event. Append-only, with a retention period: the repository sets
 * `expires_at` and a TTL index removes the event afterwards. Not business data, so not in the change history.
 *
 * @property tenant_id - Tenant the event belongs to.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property account_id - Account involved, or `null` for unknown-username attempts.
 * @property type - Event kind.
 * @property occurred_at - When it happened.
 * @property ip - Client address.
 * @property user_agent_hash - SHA-256 of the user agent.
 * @property correlation_id - Links to the operational logs.
 * @property outcome - `success` or `failure`.
 * @property reason_code - Machine-readable reason of a failure. Never the attempted password or username.
 * @property expires_at - End of the retention period.
 * @property created_by - Actor that caused the event.
 */
export class SecurityEvent extends Timestamp implements Entity {
  id!: string
  tenant_id!: string
  schema_version!: number
  version!: number
  account_id!: string | null
  type!: SecurityEventType
  occurred_at!: Date
  ip!: string | null
  user_agent_hash!: string | null
  correlation_id!: string | null
  outcome!: 'success' | 'failure'
  reason_code!: string | null
  expires_at!: Date
  created_by!: ActorRef
}
