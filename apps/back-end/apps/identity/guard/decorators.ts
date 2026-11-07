import {
  createParamDecorator,
  type ExecutionContext,
  SetMetadata,
} from '@nestjs/common'
import { type AuthenticatedUser } from '../authenticated-user'
import { type Permission } from '../permission'

/**
 * Metadata key set by `@Public()`.
 */
export const IS_PUBLIC_KEY = 'identity:is_public'

/**
 * Metadata key set by `@RequirePermissions(...)`.
 */
export const PERMISSIONS_KEY = 'identity:permissions'

/**
 * Metadata key set by `@AllowPasswordChange()`.
 */
export const ALLOW_PASSWORD_CHANGE_KEY = 'identity:allow_password_change'

/**
 * Request fields the guards and decorators use. Express and Fastify requests both provide them.
 *
 * @property headers - Request headers.
 * @property ip - Client address.
 * @property user - The signed-in caller, set by `AuthenticationGuard`.
 */
export interface GuardedRequest {
  headers: Record<string, string | string[] | undefined>
  ip?: string
  user?: AuthenticatedUser
}

/**
 * Marks a route as open to callers who are not signed in. Every other route requires a valid
 * access token, because `AuthenticationGuard` is registered globally.
 *
 * @returns A method or class decorator.
 */
export const Public = (): MethodDecorator & ClassDecorator =>
  SetMetadata(IS_PUBLIC_KEY, true)

/**
 * Requires the caller to hold every listed permission (tenant-wide). Without this decorator a
 * route only requires a signed-in caller.
 *
 * @param permissions - Permissions from the catalog in `permission.ts`.
 * @returns A method or class decorator.
 */
export const RequirePermissions = (
  ...permissions: Permission[]
): MethodDecorator & ClassDecorator => SetMetadata(PERMISSIONS_KEY, permissions)

/**
 * Lets a caller who must change the password reach this route. All other routes refuse such a
 * caller, so a temporary password only allows choosing a new one.
 *
 * @returns A method or class decorator.
 */
export const AllowPasswordChange = (): MethodDecorator & ClassDecorator =>
  SetMetadata(ALLOW_PASSWORD_CHANGE_KEY, true)

/**
 * Injects the signed-in caller into a handler parameter. Only use it on routes that are not `@Public()`.
 *
 * @example
 * `me(@CurrentUser() user: AuthenticatedUser)`
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser | undefined =>
    context.switchToHttp().getRequest<GuardedRequest>().user,
)
