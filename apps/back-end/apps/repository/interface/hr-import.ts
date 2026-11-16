import { type Repository } from '@utility/database/interface'
import {
  type HrImport,
  type HrImportKind,
  type HrImportStatus,
} from '@repository/model/hr-import'

/**
 * Filters and paging of the import list.
 *
 * @property kind - Only imports of this kind.
 * @property calendarCode - Only imports into the calendar with this code.
 * @property year - Only imports into a calendar of this year.
 * @property status - Only imports in this status.
 * @property sha256 - Only imports of a file with this hash.
 * @property limit - Page size.
 * @property offset - Items to skip.
 */
export interface HrImportQuery {
  kind?: HrImportKind
  calendarCode?: string
  year?: number
  status?: HrImportStatus
  sha256?: string
  limit?: number
  offset?: number
}

/**
 * Persistence of file imports. An import is never deleted.
 */
export interface HrImportRepository extends Repository<HrImport> {
  /**
   * Finds imports, latest first.
   *
   * @param tenantId - Tenant to search in.
   * @param query - Optional filters and paging.
   * @returns The imports, possibly none.
   */
  findByFilter(tenantId: string, query?: HrImportQuery): Promise<HrImport[]>
}
