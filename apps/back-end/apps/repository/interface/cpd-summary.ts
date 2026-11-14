import { type Repository } from '@utility/database/interface'
import { type CpdSummary } from '@repository/model/cpd-summary'

/**
 * CPD summary data access. Inject it with `REPOSITORY_CPD_SUMMARY`. One summary per employee and
 * credit system; setting a total replaces the earlier one, and the old values stay in the change
 * history.
 */
export interface CpdSummaryRepository extends Repository<CpdSummary> {
  /**
   * Finds the summaries of an employee, ordered by credit system code.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - The employee.
   * @returns The summaries, possibly none.
   */
  findByEmployee(tenantId: string, employeeId: string): Promise<CpdSummary[]>

  /**
   * Finds the summary of an employee in one credit system.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - The employee.
   * @param creditSystem - Credit system code system.
   * @param creditCode - Credit system code.
   * @returns The summary, or `null` when none exists.
   */
  findByEmployeeAndSystem(
    tenantId: string,
    employeeId: string,
    creditSystem: string,
    creditCode: string,
  ): Promise<CpdSummary | null>
}
