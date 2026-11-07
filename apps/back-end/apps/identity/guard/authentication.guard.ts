import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AuthenticationService } from '../authentication/authentication.service'
import { ForbiddenError, UnauthenticatedError } from '../identity.error'
import {
  ALLOW_PASSWORD_CHANGE_KEY,
  type GuardedRequest,
  IS_PUBLIC_KEY,
} from './decorators'

/**
 * Prefix of the `Authorization` header value.
 */
const BEARER_PREFIX = 'Bearer '

/**
 * Reads the bearer token from the request.
 *
 * @param request - HTTP request.
 * @returns The token, or `undefined` when the header is missing or not a bearer token.
 */
function readBearerToken(request: GuardedRequest): string | undefined {
  const header = request.headers.authorization
  const value = Array.isArray(header) ? header[0] : header
  if (!value?.startsWith(BEARER_PREFIX)) {
    return undefined
  }
  const token = value.slice(BEARER_PREFIX.length).trim()
  return token.length > 0 ? token : undefined
}

/**
 * Global guard that requires a valid access token on every route that is not `@Public()`.
 * On success it sets `request.user`, which `RequestLoggingInterceptor` turns into the actor of
 * the request's change records. Register it before `PermissionsGuard` so users are known first.
 *
 * A caller whose password must be changed may only reach routes marked `@AllowPasswordChange()`.
 * Guards run before interceptors, so failures here have no correlation identifier in the logs;
 * they are logged by `IdentityExceptionFilter`.
 */
@Injectable()
export class AuthenticationGuard implements CanActivate {
  /**
   * @param authentication - Verifies access tokens.
   * @param reflector - Reads route metadata.
   */
  constructor(
    private readonly authentication: AuthenticationService,
    private readonly reflector: Reflector,
  ) {}

  /**
   * Authenticates the request unless the route is public.
   *
   * @param context - Current execution context.
   * @returns `true` when the request may continue.
   * @throws UnauthenticatedError when the token is missing or invalid.
   * @throws ForbiddenError `password_change_required` when the caller must change the password first.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') {
      return true
    }
    const targets = [context.getHandler(), context.getClass()]
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) {
      return true
    }

    const request = context.switchToHttp().getRequest<GuardedRequest>()
    const token = readBearerToken(request)
    if (!token) {
      throw new UnauthenticatedError(
        'authentication_required',
        'Sign in to continue.',
      )
    }
    const user = await this.authentication.authenticate(token)
    const allowsPasswordChange = this.reflector.getAllAndOverride<boolean>(
      ALLOW_PASSWORD_CHANGE_KEY,
      targets,
    )
    if (user.must_change_password && !allowsPasswordChange) {
      throw new ForbiddenError(
        'password_change_required',
        'You must change your password before continuing.',
      )
    }
    request.user = user
    return true
  }
}
