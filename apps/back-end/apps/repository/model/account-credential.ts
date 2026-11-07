import { type Entity } from '@utility/database/interface'
import { type ActorRef } from '@utility/history/actor'
import { Timestamp } from './timestamp'

/**
 * Password secrets and lockout counters of one account. Secret class: only the authentication
 * service reads it, and no API ever returns it. Accounts that only use SSO have none.
 *
 * @property tenant_id - Tenant of the account.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property account_id - Account the credentials belong to; unique.
 * @property password_hash - Argon2id hash in PHC string form (parameters embedded).
 * @property password_history - Recent hashes, newest first, to block reuse.
 * @property password_changed_at - When the password was last set.
 * @property must_change - Whether the user must set a new password before anything else.
 * @property failed_attempts - Consecutive failed logins.
 * @property last_failed_at - Time of the last failed login, or `null`.
 * @property locked_until - End of the current lockout, or `null`.
 * @property created_by - Who created the credentials.
 */
export class AccountCredential extends Timestamp implements Entity {
  id!: string
  tenant_id!: string
  schema_version!: number
  version!: number
  account_id!: string
  password_hash!: string
  password_history!: string[]
  password_changed_at!: Date
  must_change!: boolean
  failed_attempts!: number
  last_failed_at!: Date | null
  locked_until!: Date | null
  created_by!: ActorRef
}
