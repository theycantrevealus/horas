import { type Repository } from '@utility/database/interface'
import { type Coding } from '@repository/model/common/coding'
import { type CpdRecord } from '@repository/model/cpd-record'

/**
 * Filters and paging of an employee's credit record list.
 *
 * @property creditSystem - Only records of this credit system code.
 * @property status - Only records in this status.
 * @property limit - Page size; the repository default applies when omitted.
 * @property offset - Records to skip.
 */
export interface CpdRecordQuery {
  creditSystem?: string
  status?: CpdRecord['status']
  limit?: number
  offset?: number
}

/**
 * CPD record data access. Inject it with `REPOSITORY_CPD_RECORD`. Records are never deleted: a
 * wrong one is rejected.
 */
export interface CpdRecordRepository extends Repository<CpdRecord> {
  /**
   * Finds the credit records of an employee, newest activity date first.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - The employee.
   * @param query - Optional filters and paging.
   * @returns The records, possibly none.
   */
  findByEmployee(
    tenantId: string,
    employeeId: string,
    query?: CpdRecordQuery,
  ): Promise<CpdRecord[]>

  /**
   * Finds the accepted records of an employee in one credit system whose activity date lies in a
   * period, both ends included.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - The employee.
   * @param creditSystem - The credit system.
   * @param from - First day of the period.
   * @param to - Last day of the period.
   * @returns The accepted records, possibly none.
   */
  findAcceptedInCycle(
    tenantId: string,
    employeeId: string,
    creditSystem: Coding,
    from: string,
    to: string,
  ): Promise<CpdRecord[]>
}
