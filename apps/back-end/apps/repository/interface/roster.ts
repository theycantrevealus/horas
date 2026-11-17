import { type Repository } from '@utility/database/interface'
import { type Roster, type RosterStatus } from '@repository/model/roster'

/**
 * Filters and paging of the roster list.
 *
 * @property unitId - Only rosters of this unit.
 * @property facilityId - Only rosters of this facility.
 * @property status - Only rosters in this status.
 * @property open - Only rosters that are not closed (`draft`, `submitted`, `approved`, `published`).
 * @property from - Only rosters whose period ends on or after this local date.
 * @property to - Only rosters whose period starts on or before this local date.
 * @property limit - Page size.
 * @property offset - Items to skip.
 */
export interface RosterQuery {
  unitId?: string
  facilityId?: string
  status?: RosterStatus
  open?: boolean
  from?: string
  to?: string
  limit?: number
  offset?: number
}

/**
 * Persistence of rosters. Nothing is deleted.
 */
export interface RosterRepository extends Repository<Roster> {
  /**
   * Finds rosters, latest period first, then by unit.
   *
   * @param tenantId - Tenant to search in.
   * @param query - Optional filters and paging.
   * @returns The rosters, possibly none.
   */
  findByFilter(tenantId: string, query?: RosterQuery): Promise<Roster[]>

  /**
   * Finds the roster of a unit that starts on a date.
   *
   * @param tenantId - Tenant to search in.
   * @param unitId - The unit.
   * @param start - First day of the period.
   * @returns The roster, or `null` when there is none.
   */
  findByUnitAndStart(
    tenantId: string,
    unitId: string,
    start: string,
  ): Promise<Roster | null>

  /**
   * Finds the rosters of a unit whose period shares a day with a range.
   *
   * @param tenantId - Tenant to search in.
   * @param unitId - The unit.
   * @param start - First day of the range.
   * @param end - Last day of the range.
   * @returns The overlapping rosters, possibly none.
   */
  findOverlapping(
    tenantId: string,
    unitId: string,
    start: string,
    end: string,
  ): Promise<Roster[]>
}
