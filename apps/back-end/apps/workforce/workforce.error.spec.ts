import { type ArgumentsHost } from '@nestjs/common'
import { type HttpAdapterHost } from '@nestjs/core'
import { RepositoryUnavailableError } from '@utility/database/error'
import { type AppLogger } from '@utility/logger/service'
import { observe } from './observe'
import {
  ConflictError,
  ForbiddenError,
  InvalidRequestError,
  NotFoundError,
  WorkforceError,
} from './workforce.error'
import { WorkforceExceptionFilter } from './workforce.filter'

describe('workforce errors', () => {
  it.each([
    ['forbidden', new ForbiddenError('x', 'm'), 'ForbiddenError'],
    ['not_found', new NotFoundError('x', 'm'), 'NotFoundError'],
    ['conflict', new ConflictError('x', 'm'), 'ConflictError'],
    ['invalid', new InvalidRequestError('x', 'm'), 'InvalidRequestError'],
  ])('%s carries its kind and class name', (kind, error, name) => {
    expect(error).toBeInstanceOf(WorkforceError)
    expect(error.kind).toBe(kind)
    expect(error.name).toBe(name)
    expect(error.code).toBe('x')
  })
})

describe('WorkforceExceptionFilter', () => {
  const reply = vi.fn()
  const warn = vi.fn()
  const filter = new WorkforceExceptionFilter(
    { httpAdapter: { reply } } as unknown as HttpAdapterHost,
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

  it.each([
    [new ForbiddenError('f', 'm'), 403],
    [new NotFoundError('n', 'm'), 404],
    [new ConflictError('c', 'm'), 409],
    [new InvalidRequestError('i', 'm'), 422],
  ])('answers %o with status %i', (error, status) => {
    filter.catch(error, hostFor('POST'))

    expect(reply).toHaveBeenCalledWith(
      {},
      { statusCode: status, code: error.code, message: 'm' },
      status,
    )
  })

  it('does not log a record that a read request did not find, but still answers 404', () => {
    filter.catch(
      new NotFoundError('organization_not_found', 'm'),
      hostFor('GET'),
    )

    expect(warn).not.toHaveBeenCalled()
    expect(reply).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ statusCode: 404 }),
      404,
    )
  })

  it('does not log an invalid lookup on a read request, but still answers 422, and logs it on a write', () => {
    filter.catch(new InvalidRequestError('invalid_place', 'm'), hostFor('GET'))

    expect(warn).not.toHaveBeenCalled()
    expect(reply).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ statusCode: 422, code: 'invalid_place' }),
      422,
    )

    filter.catch(new InvalidRequestError('invalid_place', 'm'), hostFor('POST'))

    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('logs a record that a write request did not find', () => {
    filter.catch(
      new NotFoundError('organization_not_found', 'm'),
      hostFor('PATCH'),
    )

    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'workforce_rejection',
        kind: 'not_found',
        status: 404,
      }),
    )
  })

  it('logs a conflict even on a read request', () => {
    filter.catch(new ConflictError('stale_version', 'm'), hostFor('GET'))

    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'workforce_rejection',
        code: 'stale_version',
      }),
    )
  })
})

describe('observe', () => {
  const log = vi.fn()
  const warn = vi.fn()
  const error = vi.fn()
  const debug = vi.fn()
  const logger = { log, warn, error, debug } as unknown as AppLogger

  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('logs one success entry with the shared fields and returns the result', async () => {
    const result = await observe(
      logger,
      'organization_create',
      'OrganizationService.create',
      async () => 7,
    )

    expect(result).toBe(7)
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'organization_create',
        operation: 'OrganizationService.create',
        outcome: 'success',
        durationMs: expect.any(Number),
      }),
    )
  })

  it('adds the summary of the result to the success entry', async () => {
    await observe(
      logger,
      'code_concept_import',
      'CodeConceptService.import',
      async () => ({ created: 3, skipped: 1 }),
      'log',
      ({ created, skipped }) => ({ created, skipped }),
    )

    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'code_concept_import',
        outcome: 'success',
        created: 3,
        skipped: 1,
      }),
    )
  })

  it('logs a business rejection as warn with its code and rethrows it', async () => {
    const rejection = new ConflictError('organization_exists', 'm')

    await expect(
      observe(
        logger,
        'organization_create',
        'OrganizationService.create',
        async () => {
          throw rejection
        },
      ),
    ).rejects.toBe(rejection)

    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: 'failure',
        error: 'ConflictError',
        code: 'organization_exists',
        retryable: false,
      }),
    )
    expect(error).not.toHaveBeenCalled()
  })

  it('logs a transient data-layer failure as error and marks it retryable', async () => {
    await expect(
      observe(
        logger,
        'organization_update',
        'OrganizationService.update',
        async () => {
          throw new RepositoryUnavailableError('down', { operation: 'x' })
        },
      ),
    ).rejects.toBeInstanceOf(RepositoryUnavailableError)

    expect(error).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'failure', retryable: true }),
    )
    expect(warn).not.toHaveBeenCalled()
  })
})
