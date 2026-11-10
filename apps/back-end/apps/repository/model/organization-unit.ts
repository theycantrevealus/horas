import { type Entity } from '@utility/database/interface'
import { type ActorRef } from '@utility/history/actor'
import { type DatePeriod } from './common/calendar'
import { type Coding } from './common/coding'
import { type ExternalId } from './common/external-id'
import { type LocalizedText } from './common/localized-text'
import { Timestamp } from './timestamp'

/**
 * A node of the organization chart: directorate, department, installation, ward, polyclinic
 * (`account-and-workforce-collections.md` 4.4, HR spec 5.3). The Head of Unit is the active
 * assignment of the unit's head position, not a field here.
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property organization_id - Organization the unit belongs to.
 * @property facility_id - Facility the unit is in.
 * @property code - Unique per facility.
 * @property name - Name per language.
 * @property type - Unit type, for example ward or polyclinic.
 * @property parent_id - Parent unit, or `null` for a top unit.
 * @property ancestor_ids - All ancestors, top first; maintained by the repository for subtree queries.
 * @property is_clinical - Patients are treated here.
 * @property external_ids - Codes in other systems, for example a SATUSEHAT Location id.
 * @property period - When the unit exists, or `null`.
 * @property status - Closed units stay for history.
 * @property created_by - Who created the record.
 */
export class OrganizationUnit extends Timestamp implements Entity {
  id!: string
  tenant_id!: string
  schema_version!: number
  version!: number
  organization_id!: string
  facility_id!: string
  code!: string
  name!: LocalizedText[]
  type!: Coding
  parent_id!: string | null
  ancestor_ids!: string[]
  is_clinical!: boolean
  external_ids!: ExternalId[]
  period!: DatePeriod | null
  status!: 'active' | 'closed'
  created_by!: ActorRef
}
