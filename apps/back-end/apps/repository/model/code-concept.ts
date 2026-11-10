import { type Entity } from '@utility/database/interface'
import { type ActorRef } from '@utility/history/actor'
import { type DatePeriod } from './common/calendar'
import { type Coding } from './common/coding'
import { type LocalizedText } from './common/localized-text'
import { Timestamp } from './timestamp'

/**
 * One code of a code system that business rules depend on, for example a workforce category,
 * employment type or licence type (`account-and-workforce-collections.md` 3.4). A tenant concept
 * overrides a platform concept with the same system and code.
 *
 * @property tenant_id - Tenant that owns the concept; absent for platform-wide concepts.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property system - Code system, carrying the jurisdiction, for example `id.license-type`.
 * @property code - Code inside the system.
 * @property display - Text per language.
 * @property properties - Concept-specific attributes that rules read, for example `{ is_clinical: true }`.
 * @property mappings - Equivalent codes in universal systems (ISCO-08, SNOMED CT).
 * @property period - When the concept may be used, or `null` for always.
 * @property status - Retired concepts stay valid on old records but cannot be used on new ones.
 * @property created_by - Who created the record.
 */
export class CodeConcept extends Timestamp implements Entity {
  id!: string
  tenant_id?: string
  schema_version!: number
  version!: number
  system!: string
  code!: string
  display!: LocalizedText[]
  properties!: Record<string, unknown>
  mappings!: Coding[]
  period!: DatePeriod | null
  status!: 'active' | 'retired'
  created_by!: ActorRef
}
