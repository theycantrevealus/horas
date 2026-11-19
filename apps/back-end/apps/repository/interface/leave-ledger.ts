import { type NewEntity, type Repository } from '@utility/database/interface'
import { type Coding } from '@repository/model/common/coding'
import { type LeaveLedgerEntry } from '@repository/model/leave-ledger-entry'

/**
 * Filters and paging of an employee's ledger.
 *
 * @property leaveTypeSystem - Only entries of this code system.
 * @property leaveTypeCode - Only entries of this leave type code.
 * @property periodStart - Only entries of the entitlement period that starts on this date.
 * @property limit - Page size.
 * @property offset - Items to skip.
 */
export interface LeaveLedgerQuery {
  leaveTypeSystem?: string
  leaveTypeCode?: string
  periodStart?: string
  limit?: number
  offset?: number
}

/**
 * Persistence of leave ledger entries. The ledger is append-only: `update`, `delete` and
 * `deleteSoft` reject (`HR-LEV-030`), and the one write is `append`.
 */
export interface LeaveLedgerRepository extends Repository<LeaveLedgerEntry> {
  /**
   * Appends an entry. An entry with a `dedupe_key` that is already used in the tenant rejects with
   * `RepositoryConflictError`, so a job that runs twice posts nothing the second time.
   *
   * @param entry - The entry.
   * @returns The stored entry.
   */
  append(entry: NewEntity<LeaveLedgerEntry>): Promise<LeaveLedgerEntry>

  /**
   * Finds an employee's entries, oldest first.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - The employee.
   * @param query - Optional filters and paging.
   * @returns The entries, possibly none.
   */
  findByEmployee(
    tenantId: string,
    employeeId: string,
    query?: LeaveLedgerQuery,
  ): Promise<LeaveLedgerEntry[]>

  /**
   * Finds every entry of one employee, leave type and entitlement period, oldest first. Not
   * paged: it is what a balance is summed from.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - The employee.
   * @param leaveType - The leave type.
   * @param periodStart - First day of the entitlement period.
   * @returns The entries, possibly none.
   */
  findByEmployeeTypeAndPeriod(
    tenantId: string,
    employeeId: string,
    leaveType: Coding,
    periodStart: string,
  ): Promise<LeaveLedgerEntry[]>
}
