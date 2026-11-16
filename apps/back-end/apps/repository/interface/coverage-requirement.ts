import { type Repository } from '@utility/database/interface'
import {
  type CoverageRequirement,
  type DayPattern,
} from '@repository/model/coverage-requirement'

/**
 * Filters and paging of the requirement list.
 *
 * @property unitId - Only requirements of this unit.
 * @property shiftId - Only requirements of this shift.
 * @property status - Only requirements in this status.
 * @property dayPattern - Only requirements with this day pattern.
 * @property onDate - Only requirements whose period covers this local date.
 * @property limit - Page size.
 * @property offset - Items to skip.
 */
export interface CoverageQuery {
  unitId?: string
  shiftId?: string
  status?: CoverageRequirement['status']
  dayPattern?: DayPattern
  onDate?: string
  limit?: number
  offset?: number
}

/**
 * Persistence of coverage requirements. Nothing is deleted.
 */
export interface CoverageRequirementRepository extends Repository<CoverageRequirement> {
  /**
   * Finds requirements, ordered by unit, shift and period start.
   *
   * @param tenantId - Tenant to search in.
   * @param query - Optional filters and paging.
   * @returns The requirements, possibly none.
   */
  findByFilter(
    tenantId: string,
    query?: CoverageQuery,
  ): Promise<CoverageRequirement[]>

  /**
   * Finds the active requirements that use a shift, whatever their period.
   *
   * @param tenantId - Tenant to search in.
   * @param shiftId - The shift.
   * @param limit - Most requirements to return.
   * @returns The active requirements of the shift, possibly none.
   */
  findActiveByShift(
    tenantId: string,
    shiftId: string,
    limit: number,
  ): Promise<CoverageRequirement[]>

  /**
   * Finds every active requirement of a unit and shift, for the duplicate check.
   *
   * @param tenantId - Tenant to search in.
   * @param unitId - The unit.
   * @param shiftId - The shift.
   * @returns The active requirements of the unit and shift, possibly none.
   */
  findActiveByUnitAndShift(
    tenantId: string,
    unitId: string,
    shiftId: string,
  ): Promise<CoverageRequirement[]>
}
