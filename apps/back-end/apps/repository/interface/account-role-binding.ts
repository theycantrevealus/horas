import { type Repository } from '@utility/database/interface'
import { type AccountRoleBinding } from '@repository/model/account-role-binding'

/**
 * Role binding data access. Inject it with `REPOSITORY_ACCOUNT_ROLE_BINDING`.
 */
export interface AccountRoleBindingRepository extends Repository<AccountRoleBinding> {
  /**
   * Returns the bindings of an account that are in force at a moment.
   *
   * @param tenantId - Tenant of the account.
   * @param accountId - Account identifier.
   * @param at - Moment to evaluate; bindings must be `active` and cover this moment.
   * @returns The bindings in force.
   */
  findInForce(
    tenantId: string,
    accountId: string,
    at: Date,
  ): Promise<AccountRoleBinding[]>
}
