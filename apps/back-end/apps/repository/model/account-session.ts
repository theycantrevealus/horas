import { type Entity } from '@utility/database/interface'
import { type ActorRef } from '@utility/history/actor'
import { Timestamp } from './timestamp'

/**
 * Client that opened a session.
 *
 * @property app - Application name, for example `back-office-web`.
 * @property device_label - Optional device name chosen by the user.
 * @property user_agent_hash - SHA-256 of the user agent, so the raw text is not stored.
 */
export interface SessionClient {
  app: string
  device_label?: string
  user_agent_hash: string
}

/**
 * How the session was authenticated, for step-up decisions.
 *
 * @property method - Authentication method.
 * @property mfa - Whether a second factor was used.
 * @property at - When the user authenticated.
 */
export interface SessionAuthentication {
  method: 'password' | 'sso' | 'webauthn'
  mfa: boolean
  at: Date
}

/**
 * One refresh-token session. Secret class: only the authentication service reads it.
 * Sessions are not business data, so their writes are not in the change history (`database.md` 6.1);
 * login and logout are in `security_events`.
 *
 * @property tenant_id - Tenant of the account.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property account_id - Account the session belongs to.
 * @property refresh_token_hash - SHA-256 of the current refresh token; unique.
 * @property family_id - Rotation family; reuse of an old token revokes the whole family.
 * @property client - Client that opened the session.
 * @property facility_id - Facility the session works in, or `null`.
 * @property authenticated_with - How the user authenticated.
 * @property last_seen_at - Last time the session was used.
 * @property expires_at - End of the session; a TTL index removes the document afterwards.
 * @property revoked_at - When it was revoked, or `null` while valid.
 * @property revoke_reason - Why it was revoked.
 * @property created_by - Who opened the session.
 */
export class AccountSession extends Timestamp implements Entity {
  id!: string
  tenant_id!: string
  schema_version!: number
  version!: number
  account_id!: string
  refresh_token_hash!: string
  family_id!: string
  client!: SessionClient
  facility_id!: string | null
  authenticated_with!: SessionAuthentication
  last_seen_at!: Date
  expires_at!: Date
  revoked_at!: Date | null
  revoke_reason!: string | null
  created_by!: ActorRef
}
