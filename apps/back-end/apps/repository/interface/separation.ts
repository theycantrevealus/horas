import { type Repository } from '@utility/database/interface'
import {
  type Separation,
  type SeparationStatus,
} from '@repository/model/separation'

/**
 * Filters and paging of the separation list.
 *
 * @property status - Only separations in this status.
 * @property typeCode - Only separations of this type code.
 * @property facilityId - Only separations of this facility.
 * @property employeeIds - Only separations of these employees (the caller resolves a unit to them).
 * @property from - Only separations whose last working day is this date or later.
 * @property to - Only separations whose last working day is on or before this date.
 * @property limit - Page size.
 * @property offset - Items to skip.
 */
export interface SeparationQuery {
  status?: SeparationStatus
  typeCode?: string
  facilityId?: string
  employeeIds?: string[]
  from?: string
  to?: string
  limit?: number
  offset?: number
}

/**
 * Persistence of separations (`separations`).
 */
export interface SeparationRepository extends Repository<Separation> {
  /**
   * Finds separations, by last working day, latest first.
   *
   * @param tenantId - Tenant to search in.
   * @param query - Optional filters and paging.
   * @returns The separations, possibly none.
   */
  findByFilter(tenantId: string, query?: SeparationQuery): Promise<Separation[]>

  /**
   * Finds the separation of an employee that is not cancelled (`HR-SEP-001`).
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - The employee.
   * @returns The separation, or `null` when the employee has none.
   */
  findOpenByEmployee(
    tenantId: string,
    employeeId: string,
  ): Promise<Separation | null>

  /**
   * Finds `planned` separations of **every tenant** whose last working day is before a date, in
   * identifier order, after a cursor. A cross-tenant read for the worker's separation job only
   * (`gateway-hr-9-separation.md` SP5); the job handles each separation with its own `tenant_id`.
   *
   * @param date - Local date; separations whose last working day is before it are returned.
   * @param afterId - Identifier of the last separation of the previous page, or `null`.
   * @param limit - Largest number of records to return.
   * @returns The separations, possibly none; empty for a malformed cursor.
   */
  findPlannedEndedBefore(
    date: string,
    afterId: string | null,
    limit: number,
  ): Promise<Separation[]>
}
