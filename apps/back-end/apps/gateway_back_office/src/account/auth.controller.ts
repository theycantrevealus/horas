import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common'
import { type AuthenticatedUser } from '@identity/authenticated-user'
import {
  AuthenticationService,
  type TokenPair,
} from '@identity/authentication/authentication.service'
import { AuthorizationService } from '@identity/authorization/authorization.service'
import {
  AllowPasswordChange,
  CurrentUser,
  Public,
} from '@identity/guard/decorators'
import { type ClientRequest, toClientInfo } from '../common/client-request'
import { ChangePasswordDto, LoginDto, RefreshDto } from './auth.dto'

/**
 * The signed-in caller as shown to the front end.
 *
 * @property account_id - Account identifier.
 * @property tenant_id - Tenant of the account.
 * @property employee_id - Linked employee, or `null`.
 * @property display_name - Name to show.
 * @property must_change_password - Whether only a password change is allowed.
 * @property permissions - Tenant-wide permissions, for showing or hiding actions. The server still checks every request.
 */
export interface CurrentUserView {
  account_id: string
  tenant_id: string
  employee_id: string | null
  display_name: string
  must_change_password: boolean
  permissions: string[]
}

/**
 * Sign-in, token refresh, sign-out and password change. Responses that carry tokens are never cached.
 */
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  /**
   * @param authentication - Authentication service.
   * @param authorization - Authorization service, for the permissions of `GET /me`.
   */
  constructor(
    private readonly authentication: AuthenticationService,
    private readonly authorization: AuthorizationService,
  ) {}

  /**
   * Handles `POST /v1/auth/login`.
   *
   * @param body - Tenant, identifier and password.
   * @param request - HTTP request, for the client description.
   * @returns Access and refresh tokens.
   */
  @Public()
  @Header('Cache-Control', 'no-store')
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(
    @Body() body: LoginDto,
    @Req() request: ClientRequest,
  ): Promise<TokenPair> {
    return this.authentication.login({
      tenantId: body.tenantId,
      identifier: body.identifier,
      password: body.password,
      client: toClientInfo(request),
    })
  }

  /**
   * Handles `POST /v1/auth/refresh`.
   *
   * @param body - The refresh token.
   * @param request - HTTP request, for the client description.
   * @returns New access and refresh tokens.
   */
  @Public()
  @Header('Cache-Control', 'no-store')
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(
    @Body() body: RefreshDto,
    @Req() request: ClientRequest,
  ): Promise<TokenPair> {
    return this.authentication.refresh({
      refreshToken: body.refreshToken,
      client: toClientInfo(request),
    })
  }

  /**
   * Handles `POST /v1/auth/logout`.
   *
   * @param user - The signed-in caller.
   * @param request - HTTP request, for the client description.
   */
  @AllowPasswordChange()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: ClientRequest,
  ): Promise<void> {
    return this.authentication.logout(user, toClientInfo(request))
  }

  /**
   * Handles `POST /v1/auth/password`. Also the only route a user with a temporary password may use.
   *
   * @param user - The signed-in caller.
   * @param body - Current and new password.
   * @param request - HTTP request, for the client description.
   * @returns New tokens; all other sessions end.
   */
  @AllowPasswordChange()
  @Header('Cache-Control', 'no-store')
  @Post('password')
  @HttpCode(HttpStatus.OK)
  changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: ChangePasswordDto,
    @Req() request: ClientRequest,
  ): Promise<TokenPair> {
    return this.authentication.changePassword(user, {
      currentPassword: body.currentPassword,
      newPassword: body.newPassword,
      client: toClientInfo(request),
    })
  }

  /**
   * Handles `GET /v1/auth/me`.
   *
   * @param user - The signed-in caller.
   * @returns Who the caller is and what they may do.
   */
  @AllowPasswordChange()
  @Header('Cache-Control', 'no-store')
  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser): Promise<CurrentUserView> {
    const permissions = await this.authorization.permissionsOf(user)
    return {
      account_id: user.account_id,
      tenant_id: user.tenant_id,
      employee_id: user.employee_id,
      display_name: user.display_name,
      must_change_password: user.must_change_password,
      permissions: [...permissions].sort(),
    }
  }
}
