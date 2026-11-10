import { type Entity } from '@utility/database/interface'
import { type ActorRef } from '@utility/history/actor'
import { type Coding } from './common/coding'
import { type LocalizedText } from './common/localized-text'
import { Timestamp } from './timestamp'

/**
 * Evidence a requester must attach for a privilege.
 *
 * @property type - Kind of evidence, for example a certificate or logbook.
 * @property description - What is expected, per language.
 * @property mandatory - Whether the application cannot be submitted without it.
 */
export interface RequiredEvidence {
  type: Coding
  description: LocalizedText[]
  mandatory: boolean
}

/**
 * A clinical privilege that can be requested (the "buku putih"), shared by every facility of
 * the tenant (`human-resource-collections.md` 4.2, decision C2).
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property facility_ids - Facilities that may grant it; empty means all.
 * @property code - Unique in the tenant, for example `PD-012`.
 * @property name - Name per language.
 * @property description - Description per language.
 * @property committee - Owning committee.
 * @property professions - Professions that may request it (`HR-CRD-007`).
 * @property specialties - Specialties that may request it; empty means any.
 * @property min_clinical_level - Required nursing or midwifery career level, or `null`.
 * @property required_evidence - Evidence to attach.
 * @property external_codes - Matching procedure codes, for example ICD-9-CM.
 * @property status - Retired items cannot be requested; existing grants stay.
 * @property created_by - Who created the record.
 */
export class PrivilegeCatalogItem extends Timestamp implements Entity {
  id!: string
  tenant_id!: string
  schema_version!: number
  version!: number
  facility_ids!: string[]
  code!: string
  name!: LocalizedText[]
  description!: LocalizedText[]
  committee!: Coding
  professions!: Coding[]
  specialties!: Coding[]
  min_clinical_level!: Coding | null
  required_evidence!: RequiredEvidence[]
  external_codes!: Coding[]
  status!: 'active' | 'retired'
  created_by!: ActorRef
}
