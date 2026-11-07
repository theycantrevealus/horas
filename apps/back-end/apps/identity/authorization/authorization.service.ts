import { Inject, Injectable } from '@nestjs/common'
import { type AccountRoleBindingRepository } from '@repository/interface/account-role-binding'
import { type RoleRepository } from '@repository/interface/role'
import {
  REPOSITORY_ACCOUNT_ROLE_BINDING,
  REPOSITORY_ROLE,
} from '@repository/token'
import { type AuthenticatedUser } from '../authenticated-user'
import { isPermission } from '../permission'

/**
 * Decides what an authenticated account may do, from its role bindings.
 *
 * Only bindings with the `tenant` scope give permissions here. Bindings scoped to an
 * organization, facility or unit must not grant tenant-wide rights, and the scope-aware check
 * ("may this account act in facility F") is not built yet; until it is, scoped bindings give nothing.
 */
@Injectable()
export class AuthorizationService {
  /**
   * @param bindings - Role binding repository.
   * @param roles - Role repository.
   */
  constructor(
    @Inject(REPOSITORY_ACCOUNT_ROLE_BINDING)
    private readonly bindings: AccountRoleBindingRepository,
    @Inject(REPOSITORY_ROLE) private readonly roles: RoleRepository,
  ) {}

  /**
   * Collects the tenant-wide permissions of an account: bindings in force now, of active roles.
   *
   * @param user - The signed-in caller.
   * @returns The permission codes; unknown codes are ignored.
   */
  async permissionsOf(user: AuthenticatedUser): Promise<ReadonlySet<string>> {
    const bindings = await this.bindings.findInForce(
      user.tenant_id,
      user.account_id,
      new Date(),
    )
    const roleIds = [
      ...new Set(
        bindings
          .filter((binding) => binding.scope.kind === 'tenant')
          .map((binding) => binding.role_id),
      ),
    ]
    if (roleIds.length === 0) {
      return new Set()
    }
    const roles = await this.roles.findAll({
      where: {
        id: { in: roleIds },
        tenant_id: { eq: user.tenant_id },
        status: { eq: 'active' },
      },
    })
    return new Set(
      roles.flatMap((role) => role.permissions).filter(isPermission),
    )
  }

  /**
   * Returns the codes of the roles an account holds tenant-wide, for rules such as "assignable by".
   *
   * @param user - The signed-in caller.
   * @returns The role codes.
   */
  async roleCodesOf(user: AuthenticatedUser): Promise<ReadonlySet<string>> {
    const bindings = await this.bindings.findInForce(
      user.tenant_id,
      user.account_id,
      new Date(),
    )
    const roleIds = bindings
      .filter((binding) => binding.scope.kind === 'tenant')
      .map((binding) => binding.role_id)
    if (roleIds.length === 0) {
      return new Set()
    }
    const roles = await this.roles.findAll({
      where: {
        id: { in: roleIds },
        tenant_id: { eq: user.tenant_id },
        status: { eq: 'active' },
      },
    })
    return new Set(roles.map((role) => role.code))
  }
}
