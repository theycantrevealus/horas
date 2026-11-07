import { type ArgumentsHost } from '@nestjs/common'
import { type HttpAdapterHost } from '@nestjs/core'
import { type AppLogger } from '@utility/logger/service'
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthenticatedError,
} from './identity.error'
import { IdentityExceptionFilter } from './identity.filter'

describe('IdentityExceptionFilter logging', () => {
  const reply = vi.fn()
  const setHeader = vi.fn()
  const warn = vi.fn()
  const filter = new IdentityExceptionFilter(
    { httpAdapter: { reply, setHeader } } as unknown as HttpAdapterHost,
    { warn } as unknown as AppLogger,
  )

  /**
   * Builds the execution context of a request with the given method.
   *
   * @param method - HTTP method.
   * @returns The arguments host.
   */
  function hostFor(method: string): ArgumentsHost {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ method }),
        getResponse: () => ({}),
      }),
    } as unknown as ArgumentsHost
  }

  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('does not log a record that a read request did not find, but still answers 404', () => {
    filter.catch(
      new NotFoundError('account_not_found', 'Not found'),
      hostFor('GET'),
    )
    filter.catch(
      new NotFoundError('account_not_found', 'Not found'),
      hostFor('HEAD'),
    )

    expect(warn).not.toHaveBeenCalled()
    expect(reply).toHaveBeenCalledTimes(2)
    expect(reply).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ statusCode: 404, code: 'account_not_found' }),
      404,
    )
  })

  it('logs a record that a write request did not find', () => {
    filter.catch(
      new NotFoundError('account_not_found', 'Not found'),
      hostFor('POST'),
    )

    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'identity_rejection',
        kind: 'not_found',
        status: 404,
      }),
    )
  })

  it.each([
    [
      'unauthenticated',
      new UnauthenticatedError('authentication_required', 'Sign in'),
    ],
    ['forbidden', new ForbiddenError('permission_denied', 'No access')],
    ['conflict', new ConflictError('stale_version', 'Stale')],
  ])(
    'logs a %s rejection even on a read request: it is a security or business signal, not a data read',
    (_kind, error) => {
      filter.catch(error, hostFor('GET'))

      expect(warn).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'identity_rejection',
          code: error.code,
        }),
      )
    },
  )
})
