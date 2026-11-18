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

  /**
   * Finds `published` rosters of **every tenant** whose last day is on or after a date, in
   * identifier order, after a cursor. A cross-tenant read for the worker's eligibility sweep only
   * (`gateway-hr-7-worker-expiry-jobs.md` WJ4, WJ7); the job handles each roster with its own
   * `tenant_id`.
   *
   * @param date - Local date; rosters ending on or after it are returned.
   * @param limit - Largest number of records to return.
   * @param afterId - Identifier of the last roster of the previous page, or omitted for the first.
   * @returns The rosters, possibly none.
   */
  findPublishedEndingOnOrAfter(
    date: string,
    limit: number,
    afterId?: string,
  ): Promise<Roster[]>
}
