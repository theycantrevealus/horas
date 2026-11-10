import { type Entity } from '@utility/database/interface'
import { type ActorRef } from '@utility/history/actor'
import { type ExternalId } from './common/external-id'
import { Timestamp } from './timestamp'

/**
 * Legal entity inside a tenant that employs staff and runs facilities
 * (`account-and-workforce-collections.md` 3.2).
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property code - Unique code inside the tenant.
 * @property legal_name - Registered name.
 * @property country - ISO 3166-1 alpha-2 code; selects the jurisdiction's rules and code systems.
 * @property identifiers - Company registration and tax numbers (NIB, NPWP badan, EIN). Not personal data.
 * @property currency - ISO 4217 code used for payroll.
 * @property status - Whether the organization is in use.
 * @property created_by - Who created the record.
 */
export class Organization extends Timestamp implements Entity {
  id!: string
  tenant_id!: string
  schema_version!: number
  version!: number
  code!: string
  legal_name!: string
  country!: string
  identifiers!: ExternalId[]
  currency!: string
  status!: 'active' | 'inactive'
  created_by!: ActorRef
}
