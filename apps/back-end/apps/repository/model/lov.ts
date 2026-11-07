import { Entity } from '@utility/database/interface'
import { Timestamp } from './timestamp'

/**
 * LOV (list of values) record, used for front-end options such as dropdown items.
 * This is the engine-neutral model that services and repositories exchange.
 *
 * @property id - Record identifier.
 * @property group_name - Group the value belongs to.
 * @property set_value - Stored value.
 * @property description - Human-readable description.
 * @property additional - Free-form extra data.
 */
export class LOV extends Timestamp implements Entity {
  id!: string
  group_name!: string
  set_value!: string
  description?: string
  additional?: Record<string, unknown>
}
