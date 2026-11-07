import { type ArgumentsHost, Logger } from '@nestjs/common'
import { type HttpAdapterHost } from '@nestjs/core'
import {
  RepositoryError,
  RepositoryNotFoundError,
  RepositoryUnavailableError,
} from '@utility/database/error'
import { RepositoryExceptionFilter } from './repository'

describe('RepositoryExceptionFilter', () => {
  const reply = vi.fn()
  const adapterHost = { httpAdapter: { reply } } as unknown as HttpAdapterHost
  const host = {
    switchToHttp: () => ({ getRequest: () => ({}), getResponse: () => ({}) }),
  } as unknown as ArgumentsHost
  let errorLog: ReturnType<typeof vi.spyOn>
  let warnLog: ReturnType<typeof vi.spyOn>
  let filter: RepositoryExceptionFilter

  beforeEach(() => {
    reply.mockReset()
    errorLog = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {})
    warnLog = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {})
    filter = new RepositoryExceptionFilter(adapterHost)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('logs a failed write with its operation, error kind and retry flag', () => {
    filter.catch(
      new RepositoryUnavailableError('database unavailable', {
        operation: 'LovRepository.update',
      }),
      host,
    )

    expect(errorLog).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'repository_error',
        operation: 'LovRepository.update',
        error: 'RepositoryUnavailableError',
        retryable: true,
        status: 503,
      }),
    )
    expect(reply).toHaveBeenCalledWith(
      {},
      { statusCode: 503, message: 'Service temporarily unavailable' },
      503,
    )
  })

  it('logs a client error of a write as a warning', () => {
    filter.catch(
      new RepositoryNotFoundError('missing', {
        operation: 'LovRepository.update',
      }),
      host,
    )

    expect(warnLog).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'LovRepository.update',
        status: 404,
      }),
    )
    expect(errorLog).not.toHaveBeenCalled()
  })

  it.each([
    new RepositoryUnavailableError('down', {
      operation: 'LovRepository.findByGroup',
    }),
    new RepositoryError('defect', { operation: 'AccountRepository.findOne' }),
    new RepositoryNotFoundError('missing', {
      operation: 'AccountRepository.findAll',
    }),
  ])(
    'does not log a failed read, but still answers the client: $operation',
    (error) => {
      filter.catch(error, host)

      expect(errorLog).not.toHaveBeenCalled()
      expect(warnLog).not.toHaveBeenCalled()
      expect(reply).toHaveBeenCalledTimes(1)
    },
  )
})
