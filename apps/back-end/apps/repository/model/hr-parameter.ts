import { type Entity } from '@utility/database/interface'
import { type ActorRef } from '@utility/history/actor'
import { type LocalDate } from './common/calendar'
import { Timestamp } from './timestamp'

/**
 * Level a parameter value applies to.
 *
 * @property kind - Tenant, organization, facility, unit or committee.
 * @property id - Identifier of that level, or `null` for the tenant.
 */
export interface HrParameterScope {
  kind: 'tenant' | 'organization' | 'facility' | 'unit' | 'committee'
  id: string | null
}

/**
 * Value of one HR parameter from a date (`human-resource-collections.md` 6, HR spec 10). The
 * most specific scope with the latest `effective_from` wins; without one, the code default applies.
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property key - Parameter key from the catalog in code, for example `MAX_WEEKLY_HOURS`.
 * @property scope - Level it applies to.
 * @property value - Value, checked against the key's type.
 * @property effective_from - First day it applies.
 * @property notes - Legal basis, for example a PKB article.
 * @property created_by - Who created the record.
 */
export class HrParameter extends Timestamp implements Entity {
  id!: string
  tenant_id!: string
  schema_version!: number
  version!: number
  key!: string
  scope!: HrParameterScope
  value!: unknown
  effective_from!: LocalDate
  notes!: string | null
  created_by!: ActorRef
}
