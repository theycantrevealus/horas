import { type Repository } from '@utility/database/interface'
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
}
