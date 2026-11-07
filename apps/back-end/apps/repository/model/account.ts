import { type Entity } from '@utility/database/interface'
import { type ActorRef } from '@utility/history/actor'
import { type Coding } from './common/coding'
import { type FileRef } from './common/file-ref'
import { Timestamp } from './timestamp'

/**
 * Kind of account (`account-and-workforce-collections.md` 5.1).
 * `workforce` is linked to an employee, `external` is a sponsored outsider, `service` is a machine client.
 */
export type AccountType = 'workforce' | 'external' | 'service'

/**
 * Lifecycle state of an account. `suspended` and `disabled` are derived from `holds`.
 */
export type AccountStatus =
  | 'pending_activation'
  | 'active'
  | 'locked'
  | 'suspended'
  | 'disabled'
  | 'closed'

/**
 * Kind of identifier a person can log in with.
 */
export type LoginIdentifierType = 'username' | 'email' | 'phone'

/**
 * One way to log in.
 *
 * @property type - Identifier kind.
 * @property value - Display form, as entered.
 * @property normalized - Form used for lookup: NFKC and lower-case for username and email, E.164 for phone.
 * @property is_primary - Whether it is the preferred identifier of its kind.
 * @property verified_at - When ownership was verified, or `null`.
 */
export interface LoginIdentifier {
  type: LoginIdentifierType
  value: string
  normalized: string
  is_primary: boolean
  verified_at: Date | null
}

/**
 * Cached public profile. For workforce accounts it is a copy of the public name held by HRM.
 *
 * @property display_name - Name to show.
 * @property given_name - Given name.
 * @property family_name - Family name.
 * @property avatar - Photo.
 */
export interface AccountProfile {
  display_name: string
  given_name?: string
  family_name?: string
  avatar?: FileRef
}

/**
 * User preferences.
 *
 * @property locale - BCP 47 language tag.
 * @property timezone - IANA time zone, or `null` to use the facility's.
 * @property default_facility_id - Facility selected at login, or `null`.
 */
export interface AccountPreferences {
  locale: string
  timezone: string | null
  default_facility_id: string | null
}

/**
 * Why an account is held.
 */
export type AccountHoldReason =
  | 'employment_suspended'
  | 'employment_ended'
  | 'contract_expired'
  | 'sponsor_ended'
  | 'external_expired'
  | 'inactivity'
  | 'security'
  | 'administrative'

/**
 * A restriction placed on an account by one source. Each source lifts only its own holds,
 * so HR lifting its suspension never re-enables an account security has held.
 *
 * @property kind - `suspend` (temporary) or `disable` (until a new approved request).
 * @property reason - Why the hold exists.
 * @property source - Context that placed it.
 * @property source_ref - Event or decision identifier that placed it, or `null`.
 * @property placed_by - Who placed it.
 * @property placed_at - When it was placed.
 * @property notes - Free-text note.
 */
export interface AccountHold {
  kind: 'suspend' | 'disable'
  reason: AccountHoldReason
  source: 'workforce' | 'identity' | 'security'
  source_ref: string | null
  placed_by: ActorRef
  placed_at: Date
  notes?: string
}

/**
 * Period in which an account may be used.
 *
 * @property not_before - First moment of use, or `null`.
 * @property expires_at - Last moment of use, or `null`. Mandatory for external accounts.
 */
export interface AccountValidity {
  not_before: Date | null
  expires_at: Date | null
}

/**
 * How an account was closed.
 *
 * @property at - Closing time.
 * @property reason - Reason code.
 * @property pseudonymized_at - When personal data was replaced, or `null`.
 */
export interface AccountClosure {
  at: Date
  reason: Coding
  pseudonymized_at: Date | null
}

/**
 * Login identity of a person or machine. Holds no secrets: password hashes live in
 * `AccountCredential`, which only the authentication service reads.
 *
 * @property tenant_id - Tenant the account belongs to.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property account_type - Kind of account.
 * @property employee_id - Linked employee; set only by the server, never from a request (`6.8`).
 * @property sponsor_account_id - Responsible workforce account, required for external accounts.
 * @property username - Display form of the username.
 * @property login_identifiers - All ways to log in.
 * @property profile - Cached public profile.
 * @property profile_source - `hr` when the name comes from HRM, `local` otherwise.
 * @property preferences - User preferences.
 * @property status - Lifecycle state.
 * @property status_changed_at - When `status` last changed.
 * @property is_open - `false` only when closed; supports the one-open-account-per-employee index.
 * @property holds - Active restrictions.
 * @property validity - Usage period.
 * @property mfa_required - Whether a second factor is mandatory.
 * @property authz_version - Incremented when roles, holds or status change; access tokens carry it.
 * @property last_login_at - Last login, updated at most once per hour.
 * @property request_id - Approved account request that created it.
 * @property closed - Closing details, or `null` while open.
 * @property created_by - Who created the account.
 */
export class Account extends Timestamp implements Entity {
  id!: string
  tenant_id!: string
  schema_version!: number
  version!: number
  account_type!: AccountType
  employee_id!: string | null
  sponsor_account_id!: string | null
  username!: string
  login_identifiers!: LoginIdentifier[]
  profile!: AccountProfile
  profile_source!: 'hr' | 'local'
  preferences!: AccountPreferences
  status!: AccountStatus
  status_changed_at!: Date
  is_open!: boolean
  holds!: AccountHold[]
  validity!: AccountValidity
  mfa_required!: boolean
  authz_version!: number
  last_login_at!: Date | null
  request_id!: string | null
  closed!: AccountClosure | null
  created_by!: ActorRef
}
