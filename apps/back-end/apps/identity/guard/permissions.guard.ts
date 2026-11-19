import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AuthorizationService } from '../authorization/authorization.service'
import { ForbiddenError, UnauthenticatedError } from '../identity.error'
import { type GuardedRequest, PERMISSIONS_KEY } from './decorators'
import { type Permission } from '../permission'

/**
 * Global guard that checks `@RequirePermissions(...)`. The caller must hold every listed
 * permission through tenant-wide role bindings. Routes without the decorator pass. With an empty
 * list (`@RequirePermissions()`) any signed-in caller passes, and the guard keeps the caller's
 * permissions on the request for the handler, so a route can allow "the owner, or a holder of a
 * permission" and let the handler decide. Register it after `AuthenticationGuard`, which sets
 * `request.user`.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  /**
   * @param authorization - Resolves the caller's permissions.
   * @param reflector - Reads route metadata.
   */
  constructor(
    private readonly authorization: AuthorizationService,
    private readonly reflector: Reflector,
  ) {}

  /**
   * Checks the permissions the route requires.
   *
   * @param context - Current execution context.
   * @returns `true` when the caller holds them all, or when the list is empty and a caller is signed in.
   * @throws UnauthenticatedError when no caller is set, which means the guards are in the wrong order.
   * @throws ForbiddenError `permission_denied` when a permission is missing. The message does not name it.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') {
      return true
    }
    const required = this.reflector.getAllAndOverride<Permission[] | undefined>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    )
    if (!required) {
      return true
    }
    const request = context.switchToHttp().getRequest<GuardedRequest>()
    const user = request.user
    if (!user) {
      throw new UnauthenticatedError(
        'authentication_required',
        'Sign in to continue.',
      )
    }
    const held = await this.authorization.permissionsOf(user)
    if (!required.every((permission) => held.has(permission))) {
      throw new ForbiddenError(
        'permission_denied',
        'You do not have permission to do this.',
      )
    }
    request.permissions = held
    return true
  }
}
