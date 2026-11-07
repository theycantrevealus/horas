import { ActorRef } from './actor'

/**
 * Sensitivity class of a field, lowest first. It decides how a value is stored in the
 * change log and who may read it.
 */
export type DataClass =
  'public' | 'internal' | 'confidential' | 'highly_confidential' | 'secret'

/**
 * Every data class, ordered from least to most sensitive.
 */
export const DATA_CLASSES: readonly DataClass[] = [
  'public',
  'internal',
  'confidential',
  'highly_confidential',
  'secret',
]

/**
 * What happened to an entity.
 */
export type ChangeAction =
  'create' | 'update' | 'soft_delete' | 'restore' | 'delete' | 'read'

/**
 * Placeholder written instead of a value the change log must not hold in plain form.
 * `encrypted` (crypto-shredding, design section 7.2) is reserved and not produced yet (open question H3).
 */
export type MaskedValue =
  | { masked: 'changed' }
  | { masked: 'partial'; display: string }
  | { masked: 'encrypted'; key_ref: string; ciphertext: string }

/**
 * One changed field.
 *
 * @property path - Dotted path; array items are addressed by their key, for example `holds[reason=security]`.
 * @property class - Data class of the field.
 * @property before - Value before the change, masked by class.
 * @property after - Value after the change, masked by class.
 */
export interface FieldChange {
  path: string
  class: DataClass
  before: unknown
  after: unknown
}

/**
 * The changed entity.
 *
 * @property type - Stable entity name, for example `account`; never the collection or class name.
 * @property id - Entity identifier.
 * @property version - Document `version` after the change, or `null` when the model has none.
 */
export interface ChangedEntity {
  type: string
  id: string
  version: number | null
}

/**
 * One recorded change of one entity. Written once, never modified.
 *
 * @property event - Always `data_change`.
 * @property schema_version - Version of this shape.
 * @property change_id - UUID v7: unique and time-ordered; readers dedupe on it.
 * @property occurred_at - ISO 8601 UTC time of the write.
 * @property tenant_id - Tenant the entity belongs to, or `platform` for platform-wide data.
 * @property entity - The changed entity.
 * @property action - What happened.
 * @property actor - Who did it.
 * @property reason - Why, when the service gave a reason.
 * @property operation - Operation that wrote, for example `AccountRepository.update`.
 * @property correlation_id - Links to the operational logs of the same request.
 * @property changes - Changed fields; empty for `read` and `delete`.
 * @property data_class - Highest class among the changed fields.
 * @property truncated - Set when values were dropped to stay under the size limit.
 */
export interface ChangeRecord {
  event: 'data_change'
  schema_version: 1
  change_id: string
  occurred_at: string
  tenant_id: string
  entity: ChangedEntity
  action: ChangeAction
  actor: ActorRef
  reason: string | null
  operation: string
  correlation_id: string
  changes: FieldChange[]
  data_class: DataClass
  truncated?: true
}

/**
 * A model field name, or a dotted path that starts with one.
 */
export type FieldPath<T> = (keyof T & string) | `${keyof T & string}.${string}`

/**
 * Sensitivity classification of one model, declared in `apps/repository/model/<name>.classification.ts`.
 *
 * @property default - Class of every field not listed in `fields`.
 * @property fields - Class per field or nested path. The longest matching path wins.
 * @property arrayKeys - Fields that hold object arrays, mapped to the item fields that identify an item.
 */
export interface FieldClassification<T> {
  default: DataClass
  fields?: Readonly<Partial<Record<FieldPath<T>, DataClass>>>
  arrayKeys?: Readonly<Partial<Record<FieldPath<T>, readonly string[]>>>
}

/**
 * Tenant used for platform-wide reference data that has no `tenant_id`.
 */
export const PLATFORM_TENANT = 'platform'
