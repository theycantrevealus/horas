import { Test } from '@nestjs/testing'
import { RepositoryUnavailableError } from '@utility/database/error'
import { AppLogger } from '@utility/logger/service'
import { REPOSITORY_LOV } from '@repository/token'
import { GatewayBackOfficeService } from './gateway.back.office.service'

describe('GatewayBackOfficeService.getLovByGroup', () => {
  const lovRepository = { findByGroup: vi.fn() }
  const logger = { debug: vi.fn(), error: vi.fn() }
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

  it('logs a success entry with the count but not the records', async () => {
    lovRepository.findByGroup.mockResolvedValue([
      { id: '1', set_value: 'secret-value' },
    ])

    await expect(service.getLovByGroup('gender')).resolves.toHaveLength(1)

    expect(logger.debug).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'lov_read',
        outcome: 'success',
        groupName: 'gender',
        count: 1,
        durationMs: expect.any(Number),
      }),
    )
    expect(JSON.stringify(logger.debug.mock.calls)).not.toContain(
      'secret-value',
    )
  })

  it('logs a failure entry with the retry flag and rethrows the error', async () => {
    const failure = new RepositoryUnavailableError('database unavailable', {
      operation: 'LovRepository.findByGroup',
      cause: new Error('down'),
    })
    lovRepository.findByGroup.mockRejectedValue(failure)

    await expect(service.getLovByGroup('gender')).rejects.toBe(failure)

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'lov_read',
        outcome: 'failure',
        error: 'RepositoryUnavailableError',
        retryable: true,
      }),
    )
  })
})
