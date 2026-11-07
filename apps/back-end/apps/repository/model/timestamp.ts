import { Timestamped } from '@utility/database/interface'

/**
 * Base class that adds timestamp fields to a model.
 * Repositories set these fields; callers never do.
 *
 * @property created_at - Creation date.
 * @property updated_at - Last update date.
 * @property deleted_at - Soft-delete date, or `null` when active.
 */
export class Timestamp implements Timestamped {
  created_at?: Date
  updated_at?: Date
  deleted_at?: Date | null
}
