import { type ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { type AuthorizationService } from '../authorization/authorization.service'
import { ForbiddenError, UnauthenticatedError } from '../identity.error'
import { type GuardedRequest, PERMISSIONS_KEY } from './decorators'
import { PermissionsGuard } from './permissions.guard'

describe('PermissionsGuard', () => {
  const user = { id: 'u1', tenant_id: 't1' } as never
  const permissionsOf = vi.fn()
  let guard: PermissionsGuard

  /**
   * Builds the execution context of a request to a handler with the given route metadata.
   *
   * @param metadata - Permissions of `@RequirePermissions(...)`, or `undefined` for no decorator.
   * @param request - The request.
   * @param type - Context type.
   * @returns The context.
   */
  function contextOf(
    metadata: string[] | undefined,
    request: GuardedRequest,
    type = 'http',
  ): ExecutionContext {
    const handler = (): void => undefined
    class Controller {}
    if (metadata !== undefined) {
      Reflect.defineMetadata(PERMISSIONS_KEY, metadata, handler)
    }
    return {
      getType: () => type,
      getHandler: () => handler,
      getClass: () => Controller,
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext
  }

  beforeEach(() => {
    vi.resetAllMocks()
    permissionsOf.mockResolvedValue(new Set(['a:read', 'a:write']))
    guard = new PermissionsGuard(
      { permissionsOf } as unknown as AuthorizationService,
      new Reflector(),
    )
  })

  it('lets a route without the decorator through and resolves nothing', async () => {
    const request: GuardedRequest = { headers: {}, user }

    expect(await guard.canActivate(contextOf(undefined, request))).toBe(true)

    expect(permissionsOf).not.toHaveBeenCalled()
    expect(request.permissions).toBeUndefined()
  })

  it('lets a non-HTTP context through', async () => {
    expect(await guard.canActivate(contextOf(['a:read'], { headers: {} }, 'rpc'))).toBe(true)
    expect(permissionsOf).not.toHaveBeenCalled()
  })

  it('lets a caller who holds every required permission in and keeps their permissions on the request', async () => {
    const request: GuardedRequest = { headers: {}, user }

    expect(await guard.canActivate(contextOf(['a:read', 'a:write'], request))).toBe(true)

    expect(request.permissions).toEqual(new Set(['a:read', 'a:write']))
  })

  it('refuses a caller who lacks one required permission, without naming it', async () => {
    const request: GuardedRequest = { headers: {}, user }

    const thrown = await guard.canActivate(contextOf(['a:read', 'b:read'], request)).catch((error: unknown) => error)

    expect(thrown).toBeInstanceOf(ForbiddenError)
    expect((thrown as ForbiddenError).message).not.toContain('b:read')
    expect(request.permissions).toBeUndefined()
  })

  it('with an empty list lets any signed-in caller in and keeps their permissions on the request for the handler', async () => {
    const request: GuardedRequest = { headers: {}, user }

    expect(await guard.canActivate(contextOf([], request))).toBe(true)

    expect(permissionsOf).toHaveBeenCalledWith(user)
    expect(request.permissions).toEqual(new Set(['a:read', 'a:write']))
  })

  it('with an empty list still needs a signed-in caller', async () => {
    const thrown = await guard.canActivate(contextOf([], { headers: {} })).catch((error: unknown) => error)

    expect(thrown).toBeInstanceOf(UnauthenticatedError)
    expect(permissionsOf).not.toHaveBeenCalled()
  })
})
