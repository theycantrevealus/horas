import { Test } from '@nestjs/testing'
import { RepositoryUnavailableError } from '@utility/database/error'
import { AppLogger } from '@utility/logger/service'
import { REPOSITORY_LOV } from '@repository/token'
import { GatewayBackOfficeService } from './gateway.back.office.service'

describe('GatewayBackOfficeService.getLovByGroup', () => {
  const lovRepository = { findByGroup: vi.fn() }
  const logger = {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    verbose: vi.fn(),
  }
  let service: GatewayBackOfficeService

  beforeEach(async () => {
    vi.resetAllMocks()
    const moduleRef = await Test.createTestingModule({
      providers: [GatewayBackOfficeService],
    })
      .useMocker((token) => {
        if (token === REPOSITORY_LOV) return lovRepository
        if (token === AppLogger) return logger
        return undefined
      })
      .compile()
    service = moduleRef.get(GatewayBackOfficeService)
  })

  /**
   * Counts every log call made through the fake logger.
   *
   * @returns The number of entries written.
   */
  function loggedEntries(): number {
    return Object.values(logger).reduce(
      (total, method) => total + method.mock.calls.length,
      0,
    )
  }

  it('returns the records and writes no log entry: reading data is not logged', async () => {
    lovRepository.findByGroup.mockResolvedValue([{ id: '1' }])

    await expect(service.getLovByGroup('gender')).resolves.toHaveLength(1)

    expect(loggedEntries()).toBe(0)
  })

  it('rethrows a failed read unchanged and still writes no log entry', async () => {
    const failure = new RepositoryUnavailableError('database unavailable', {
      operation: 'LovRepository.findByGroup',
      cause: new Error('down'),
    })
    lovRepository.findByGroup.mockRejectedValue(failure)

    await expect(service.getLovByGroup('gender')).rejects.toBe(failure)

    expect(loggedEntries()).toBe(0)
  })
})

describe('GatewayBackOfficeService writes', () => {
  const lovRepository = { create: vi.fn() }
  const logger = { log: vi.fn(), warn: vi.fn() }
  let service: GatewayBackOfficeService

  beforeEach(async () => {
    vi.resetAllMocks()
    const moduleRef = await Test.createTestingModule({
      providers: [GatewayBackOfficeService],
    })
      .useMocker((token) => {
        if (token === REPOSITORY_LOV) return lovRepository
        if (token === AppLogger) return logger
        return undefined
      })
      .compile()
    service = moduleRef.get(GatewayBackOfficeService)
  })

  it('logs a successful write with the outcome and duration but not the values', async () => {
    lovRepository.create.mockResolvedValue({ id: '1' })

    await service.createLov({ group_name: 'gender', set_value: 'secret-value' })

    expect(logger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'lov_create',
        outcome: 'success',
        durationMs: expect.any(Number),
      }),
    )
    expect(JSON.stringify(logger.log.mock.calls)).not.toContain('secret-value')
  })

  it('logs a failed write with the retry flag and rethrows the error', async () => {
    const failure = new RepositoryUnavailableError('database unavailable', {
      operation: 'LovRepository.create',
    })
    lovRepository.create.mockRejectedValue(failure)

    await expect(
      service.createLov({ group_name: 'gender', set_value: 'x' }),
    ).rejects.toBe(failure)

    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'lov_create',
        outcome: 'failure',
        error: 'RepositoryUnavailableError',
        retryable: true,
      }),
    )
  })
})
