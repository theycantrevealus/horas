import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common'
import { type Page } from '@utility/database/interface'
import { type Account } from '@repository/model/account'
import { type AccountRoleBinding } from '@repository/model/account-role-binding'
import { type AuthenticatedUser } from '@identity/authenticated-user'
import {
  AccountService,
  type CreatedAccount,
} from '@identity/account/account.service'
import { CurrentUser, RequirePermissions } from '@identity/guard/decorators'
import { PERMISSIONS } from '@identity/permission'
import {
  CreateAccountDto,
  GrantRoleDto,
  LiftHoldsDto,
  ListAccountsDto,
  PlaceHoldDto,
  RevokeBindingDto,
  UpdateAccountDto,
} from './account.dto'

/**
 * Account management for back-office administrators. Every route is limited to the caller's
 * tenant and needs a permission. Responses that carry a temporary password are never cached.
 */
@Controller({ path: 'accounts', version: '1' })
export class AccountController {
  /**
   * @param accounts - Account management service.
   */
  constructor(private readonly accounts: AccountService) {}

  /**
   * Handles `POST /v1/accounts`.
   *
   * @param user - The signed-in administrator.
   * @param body - The new account.
   * @returns The account and its temporary password, shown once.
   */
  @Post()
  @RequirePermissions(PERMISSIONS.ACCOUNT_CREATE)
  @Header('Cache-Control', 'no-store')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateAccountDto,
  ): Promise<CreatedAccount> {
    return this.accounts.create(user.tenant_id, body)
  }

  /**
   * Handles `GET /v1/accounts`.
   *
   * @param user - The signed-in administrator.
   * @param query - Filters and paging.
   * @returns One page of accounts.
   */
  @Get()
  @RequirePermissions(PERMISSIONS.ACCOUNT_READ)
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListAccountsDto,
  ): Promise<Page<Account>> {
    return this.accounts.list(user.tenant_id, query)
  }

  /**
   * Handles `GET /v1/accounts/:id`.
   *
   * @param user - The signed-in administrator.
   * @param id - Account identifier.
   * @returns The account.
   */
  @Get(':id')
  @RequirePermissions(PERMISSIONS.ACCOUNT_READ)
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<Account> {
    return this.accounts.get(user.tenant_id, id)
  }

  /**
   * Handles `PATCH /v1/accounts/:id`.
   *
   * @param user - The signed-in administrator.
   * @param id - Account identifier.
   * @param body - Fields to change.
   * @returns The updated account.
   */
  @Patch(':id')
  @RequirePermissions(PERMISSIONS.ACCOUNT_UPDATE)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: UpdateAccountDto,
  ): Promise<Account> {
    return this.accounts.update(user.tenant_id, id, body)
  }

  /**
   * Handles `POST /v1/accounts/:id/holds`.
   *
   * @param user - The signed-in administrator.
   * @param id - Account identifier.
   * @param body - The hold.
   * @returns The updated account.
   */
  @Post(':id/holds')
  @RequirePermissions(PERMISSIONS.ACCOUNT_HOLD)
  placeHold(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: PlaceHoldDto,
  ): Promise<Account> {
    return this.accounts.placeHold(user.tenant_id, id, user, body)
  }

  /**
   * Handles `DELETE /v1/accounts/:id/holds`: lifts the suspend holds administrators placed.
   *
   * @param user - The signed-in administrator.
   * @param id - Account identifier.
   * @param query - Optional expected version.
   * @returns The updated account.
   */
  @Delete(':id/holds')
  @RequirePermissions(PERMISSIONS.ACCOUNT_HOLD)
  liftHolds(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query() query: LiftHoldsDto,
  ): Promise<Account> {
    return this.accounts.liftHolds(user.tenant_id, id, query.expectedVersion)
  }

  /**
   * Handles `POST /v1/accounts/:id/password-reset`.
   *
   * @param user - The signed-in administrator.
   * @param id - Account identifier.
   * @returns The temporary password, shown once.
   */
  @Post(':id/password-reset')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.ACCOUNT_RESET_PASSWORD)
  @Header('Cache-Control', 'no-store')
  async resetPassword(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<{ temporaryPassword: string }> {
    const temporaryPassword = await this.accounts.resetPassword(
      user.tenant_id,
      id,
      user,
    )
    return { temporaryPassword }
  }

  /**
   * Handles `DELETE /v1/accounts/:id/sessions`: signs the account out everywhere.
   *
   * @param user - The signed-in administrator.
   * @param id - Account identifier.
   * @returns How many sessions ended.
   */
  @Delete(':id/sessions')
  @RequirePermissions(PERMISSIONS.ACCOUNT_UPDATE)
  async revokeSessions(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<{ revoked: number }> {
    const revoked = await this.accounts.revokeSessions(user.tenant_id, id)
    return { revoked }
  }

  /**
   * Handles `GET /v1/accounts/:id/role-bindings`.
   *
   * @param user - The signed-in administrator.
   * @param id - Account identifier.
   * @returns The account's bindings.
   */
  @Get(':id/role-bindings')
  @RequirePermissions(PERMISSIONS.ROLE_READ)
  listBindings(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<AccountRoleBinding[]> {
    return this.accounts.listBindings(user.tenant_id, id)
  }

  /**
   * Handles `POST /v1/accounts/:id/role-bindings`.
   *
   * @param user - The signed-in administrator.
   * @param id - Account identifier.
   * @param body - The grant.
   * @returns The binding.
   */
  @Post(':id/role-bindings')
  @RequirePermissions(PERMISSIONS.ROLE_BINDING_MANAGE)
  grantRole(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: GrantRoleDto,
  ): Promise<AccountRoleBinding> {
    return this.accounts.grantRole(user.tenant_id, id, user, body)
  }

  /**
   * Handles `POST /v1/accounts/:id/role-bindings/:bindingId/revoke`.
   *
   * @param user - The signed-in administrator.
   * @param id - Account identifier.
   * @param bindingId - Binding identifier.
   * @param body - Why access is withdrawn.
   * @returns The revoked binding.
   */
  @Post(':id/role-bindings/:bindingId/revoke')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.ROLE_BINDING_MANAGE)
  revokeBinding(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('bindingId') bindingId: string,
    @Body() body: RevokeBindingDto,
  ): Promise<AccountRoleBinding> {
    return this.accounts.revokeBinding(
      user.tenant_id,
      id,
      bindingId,
      body.reason,
    )
  }
}
