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

  /**
   * Finds the entries a leave request posted, oldest first (its `use` entries, to reverse them when
   * the leave is cancelled or changed).
   *
   * @param tenantId - Tenant to search in.
   * @param requestId - The leave request.
   * @returns The entries, possibly none; empty for a malformed identifier.
   */
  findByRequest(
    tenantId: string,
    requestId: string,
  ): Promise<LeaveLedgerEntry[]>

  /**
   * Finds `grant` entries of **every tenant** whose period ended in a window, in identifier order,
   * after a cursor. A cross-tenant read for the worker's leave period job only
   * (`gateway-hr-8-2-leave-balances.md` Task 5); the job handles each entry with its own
   * `tenant_id`.
   *
   * @param from - First day of the window (the day a period ended), inclusive.
   * @param to - Last day of the window, inclusive.
   * @param afterId - Identifier of the last entry of the previous page, or `null` for the first.
   * @param limit - Largest number of records to return.
   * @returns The entries, possibly none; empty for a malformed cursor.
   */
  findGrantsEndedBetween(
    from: string,
    to: string,
    afterId: string | null,
    limit: number,
  ): Promise<LeaveLedgerEntry[]>

  /**
   * Finds `carry_over` entries of **every tenant** whose last usable day falls in a window, in
   * identifier order, after a cursor. A cross-tenant read for the leave period job only.
   *
   * @param from - First day of the window, inclusive.
   * @param to - Last day of the window, inclusive.
   * @param afterId - Identifier of the last entry of the previous page, or `null` for the first.
   * @param limit - Largest number of records to return.
   * @returns The entries, possibly none; empty for a malformed cursor.
   */
  findCarryOversExpiringBetween(
    from: string,
    to: string,
    afterId: string | null,
    limit: number,
  ): Promise<LeaveLedgerEntry[]>
}
