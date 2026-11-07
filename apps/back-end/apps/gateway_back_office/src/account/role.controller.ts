import { Body, Controller, Get, Post } from '@nestjs/common'
import { type Role } from '@repository/model/role'
import { type AuthenticatedUser } from '@identity/authenticated-user'
import { RoleService } from '@identity/authorization/role.service'
import { CurrentUser, RequirePermissions } from '@identity/guard/decorators'
import { PERMISSIONS } from '@identity/permission'
import { CreateRoleDto } from './account.dto'

/**
 * Role listing and creation for back-office administrators, limited to the caller's tenant.
 */
@Controller({ path: 'roles', version: '1' })
export class RoleController {
  /**
   * @param roles - Role service.
   */
  constructor(private readonly roles: RoleService) {}

  /**
   * Handles `GET /v1/roles`.
   *
   * @param user - The signed-in administrator.
   * @returns The tenant's roles.
   */
  @Get()
  @RequirePermissions(PERMISSIONS.ROLE_READ)
  list(@CurrentUser() user: AuthenticatedUser): Promise<Role[]> {
    return this.roles.list(user.tenant_id)
  }

  /**
   * Handles `POST /v1/roles`.
   *
   * @param user - The signed-in administrator.
   * @param body - The new role.
   * @returns The created role.
   */
  @Post()
  @RequirePermissions(PERMISSIONS.ROLE_MANAGE)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateRoleDto,
  ): Promise<Role> {
    return this.roles.create(user.tenant_id, body)
  }
}
