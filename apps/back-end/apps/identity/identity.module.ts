import { Module } from '@nestjs/common'
import { LoggerModule } from '@utility/logger/module'
import { AccountRepositoryModule } from '@repository/mongo/account.module'
import { AccountCredentialRepositoryModule } from '@repository/mongo/account-credential.module'
import { AccountRoleBindingRepositoryModule } from '@repository/mongo/account-role-binding.module'
import { AccountSessionRepositoryModule } from '@repository/mongo/account-session.module'
import { RoleRepositoryModule } from '@repository/mongo/role.module'
import { SecurityEventRepositoryModule } from '@repository/mongo/security-event.module'
import { AccountService } from './account/account.service'
import { AuthenticationService } from './authentication/authentication.service'
import { CredentialService } from './authentication/credential.service'
import { PasswordHasher } from './authentication/password-hasher'
import { SecurityAuditService } from './authentication/security-audit.service'
import { TokenService } from './authentication/token.service'
import { AuthorizationService } from './authorization/authorization.service'
import { RoleService } from './authorization/role.service'

/**
 * Identity context: authentication, authorization and account management.
 * It owns the identity collections (`account-and-workforce-collections.md` 1) and imports only
 * its own repository modules. Applications register `AuthenticationGuard` and `PermissionsGuard`
 * as global guards (in that order, `APP_GUARD` with `useClass`) and `IdentityExceptionFilter` as a
 * global filter; the guards need `AuthenticationService` and `AuthorizationService` from this module.
 */
@Module({
  imports: [
    LoggerModule,
    AccountRepositoryModule,
    AccountCredentialRepositoryModule,
    AccountSessionRepositoryModule,
    SecurityEventRepositoryModule,
    RoleRepositoryModule,
    AccountRoleBindingRepositoryModule,
  ],
  providers: [
    PasswordHasher,
    TokenService,
    SecurityAuditService,
    CredentialService,
    AuthenticationService,
    AuthorizationService,
    RoleService,
    AccountService,
  ],
  exports: [
    AuthenticationService,
    AuthorizationService,
    RoleService,
    AccountService,
  ],
})
export class IdentityModule {}
