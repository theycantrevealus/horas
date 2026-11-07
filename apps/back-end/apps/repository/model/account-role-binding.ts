import { type Entity } from '@utility/database/interface'
import { type ActorRef } from '@utility/history/actor'
import { type ScopeKind } from './role'
import { Timestamp } from './timestamp'

/**
 * Where a role applies.
 *
 * @property kind - Scope level.
 * @property organization_id - Organization, for `organization` scope.
 * @property facility_id - Facility, for `facility` scope.
 * @property unit_id - Unit, for `unit` scope.
 * @property include_descendants - Whether child units are included.
 */
export interface BindingScope {
  kind: ScopeKind
  organization_id?: string
  facility_id?: string
  unit_id?: string
  include_descendants: boolean
}

/**
 * Period in which a binding applies.
 *
 * @property start - First moment.
 * @property end - Last moment, or `null` for open-ended.
 */
export interface BindingPeriod {
  start: Date
  end: Date | null
}

/**
 * Grant of a role to an account in a scope.
 *
 * @property tenant_id - Tenant of the account.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property account_id - Account that holds the role.
 * @property role_id - Role granted.
 * @property scope - Where it applies.
 * @property source - `manual` or `derived` from HR assignments by the derivation job.
 * @property source_ref - What a derived binding came from, or `null`.
 * @property period - When it applies.
 * @property granted_by - Who granted it.
 * @property approved_by - Second person for privileged roles, or `null`.
 * @property reason - Why it was granted; required for manual bindings.
 * @property status - Whether it is in force.
 * @property created_by - Who created the binding.
 */
export class AccountRoleBinding extends Timestamp implements Entity {
  id!: string
  tenant_id!: string
  schema_version!: number
  version!: number
  account_id!: string
  role_id!: string
  scope!: BindingScope
  source!: 'manual' | 'derived'
  source_ref!: {
    type: 'position_assignment' | 'committee_membership'
    id: string
    rule_id: string
  } | null
  period!: BindingPeriod
  granted_by!: ActorRef
  approved_by!: ActorRef | null
  reason!: string | null
  status!: 'active' | 'ended' | 'revoked'
  created_by!: ActorRef
}
