import { Module } from '@nestjs/common'
import { IdentityModule } from '@identity/identity.module'
import { AccountController } from './account.controller'
import { AuthController } from './auth.controller'
import { RoleController } from './role.controller'

/**
 * Account management gateway of the back office: sign-in and tokens, accounts, holds, password
 * resets, sessions, roles and role bindings. It only exposes the identity module over HTTP.
 */
@Module({
  imports: [IdentityModule],
  controllers: [AuthController, AccountController, RoleController],
})
export class AccountManagementModule {}
