import { type Entity } from '@utility/database/interface'
import { type ActorRef } from '@utility/history/actor'
import { type Address } from './common/address'
import { type ExternalId } from './common/external-id'
import { type LocalizedText } from './common/localized-text'
import { Timestamp } from './timestamp'

/**
 * One hospital or clinic site of an organization (`account-and-workforce-collections.md` 3.3).
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property organization_id - Organization that runs the facility.
 * @property code - Unique code inside the tenant.
 * @property name - Name per language.
 * @property address - Site address.
 * @property timezone - IANA time zone used to read the facility's local dates and times.
 * @property holiday_calendar_codes - Holiday calendars that apply, combined (`human-resource-collections.md` 5.2).
 * @property external_ids - Codes given by regulators, for example Kemenkes or SATUSEHAT ids.
 * @property status - Whether the facility is in use.
 * @property created_by - Who created the record.
 */
export class Facility extends Timestamp implements Entity {
  id!: string
  tenant_id!: string
  schema_version!: number
  version!: number
  organization_id!: string
  code!: string
  name!: LocalizedText[]
  address!: Address | null
  timezone!: string
  holiday_calendar_codes!: string[]
  external_ids!: ExternalId[]
  status!: 'active' | 'inactive'
  created_by!: ActorRef
}
