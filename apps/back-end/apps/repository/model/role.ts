import { type Entity } from '@utility/database/interface'
import { type ActorRef } from '@utility/history/actor'
import { type LocalizedText } from './common/localized-text'
import { Timestamp } from './timestamp'

/**
 * Level at which a role can be granted.
 */
export type ScopeKind = 'tenant' | 'organization' | 'facility' | 'unit'

/**
 * A named set of permissions.
 *
 * @property tenant_id - Tenant that owns the role.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property code - Unique code inside the tenant, for example `identity_admin`.
 * @property name - Name per language.
 * @property description - Description per language.
 * @property permissions - Permission codes from the catalog in code (`apps/identity/permission.ts`).
 * @property allowed_scopes - Levels the role may be granted at.
 * @property assignable_by - Role codes allowed to grant it manually.
 * @property is_system - Seeded roles cannot be deleted.
 * @property status - Whether the role can be granted and gives permissions.
 * @property created_by - Who created the role.
 */
export class Role extends Timestamp implements Entity {
  id!: string
  tenant_id!: string
  schema_version!: number
  version!: number
  code!: string
  name!: LocalizedText[]
  description!: LocalizedText[]
  permissions!: string[]
  allowed_scopes!: ScopeKind[]
  assignable_by!: string[]
  is_system!: boolean
  status!: 'active' | 'inactive'
  created_by!: ActorRef
}
