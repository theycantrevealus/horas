import { type Repository } from '@utility/database/interface'
import {
  type Account,
  type LoginIdentifierType,
} from '@repository/model/account'

/**
 * Account data access. Inject it with `REPOSITORY_ACCOUNT`.
 * Every named query takes the tenant, so a query can never cross tenants.
 */
export interface AccountRepository extends Repository<Account> {
  /**
   * Finds the open account that logs in with an identifier.
   *
   * @param tenantId - Tenant to search in.
   * @param type - Identifier kind.
   * @param normalized - Normalized identifier value.
   * @returns The account, or `null` when none matches.
   */
  findByLoginIdentifier(
    tenantId: string,
    type: LoginIdentifierType,
    normalized: string,
  ): Promise<Account | null>

  /**
   * Finds the open account linked to an employee.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - Employee identifier.
   * @returns The account, or `null` when the employee has none.
   */
  findByEmployeeId(
    tenantId: string,
    employeeId: string,
  ): Promise<Account | null>
}
