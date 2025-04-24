import { mockAccount } from '@gateway_core/account/mock/account.mock'
import { mockStockAdjustment } from '@gateway_inventory/adjustment/mock/stock.adjustment.mock'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { Test, TestingModule } from '@nestjs/testing'
import { AuthService } from '@security/auth.service'
import { KafkaService } from '@utility/kafka/avro/service'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { testCaption } from '@utility/string'
import { Job } from 'bullmq'
import { Cache } from 'cache-manager'
import { Logger } from 'winston'

import { StockProcessorConsumer } from '../stock.processor.consumer'

describe('Stock Processor Service', () => {
  let configService: ConfigService
  let cacheManager: Cache
  let stockClient: KafkaService
  let stockProcessorService: StockProcessorConsumer
  let logger: Logger
  let module: TestingModule

  beforeAll(async () => {
    module = await Test.createTestingModule({
      controllers: [],
      providers: [
        StockProcessorConsumer,
        AuthService,
        JwtService,
        {
          provide: 'STOCK_SERVICE',
          useValue: {
            transaction: jest.fn().mockImplementation(() => ({
              send: () => jest.fn().mockResolvedValue({}),
              abort: () => jest.fn(),
              commit: () =>
                jest.fn().mockResolvedValue({
                  message: '',
                  transaction_id: '',
                  payload: {},
                }),
            })),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: () => jest.fn().mockResolvedValue('Test'),
            set: () => jest.fn().mockResolvedValue('Test'),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: () => '',
            set: () => jest.fn(),
          },
        },
        {
          provide: WINSTON_MODULE_PROVIDER,
          useValue: {
            log: jest.fn(),
            warn: jest.fn(),
            verbose: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile()
  })

  beforeEach(() => {
    // jest.restoreAllMocks()
    configService = module.get<ConfigService>(ConfigService)

    stockProcessorService = module.get<StockProcessorConsumer>(
      StockProcessorConsumer
    )
    cacheManager = module.get(CACHE_MANAGER)
    stockClient = module.get('STOCK_SERVICE')
    logger = module.get(WINSTON_MODULE_PROVIDER)

    jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')
  })

  it(
    testCaption('SERVICE STATE', 'component', 'Service should be defined'),
    () => {
      expect(stockProcessorService).toBeDefined()
    }
  )

  it(testCaption('SERVICE EVENT', 'component', 'On Active'), () => {
    const job = {
      id: 'job-id',
      data: {
        payload: mockStockAdjustment(),
        account: mockAccount(),
        token: '',
      },
      attemptsMade: 0,
      log: jest.fn(),
    } as any
    stockProcessorService.onActive(job)
    expect(job.log).toHaveBeenCalled()
    expect(logger.verbose).toHaveBeenCalled()
  })

  it(testCaption('SERVICE EVENT', 'component', 'On Paused'), () => {
    const job = {
      id: 'job-id',
      data: {
        payload: mockStockAdjustment(),
        account: mockAccount(),
        token: '',
      },
      attemptsMade: 0,
      log: jest.fn(),
    } as any
    stockProcessorService.onPaused(job)
    expect(job.log).toHaveBeenCalled()
    expect(logger.verbose).toHaveBeenCalled()
  })

  it(testCaption('SERVICE EVENT', 'component', 'On Completed'), () => {
    const job = {
      id: 'job-id',
      data: {
        payload: mockStockAdjustment(),
        account: mockAccount(),
        token: '',
      },
      attemptsMade: 0,
      log: jest.fn(),
    } as any
    stockProcessorService.onCompleted(job, {})
    expect(job.log).toHaveBeenCalled()
    expect(logger.verbose).toHaveBeenCalled()
  })

  it(testCaption('SERVICE EVENT', 'component', 'On Error'), () => {
    stockProcessorService.onError(new Error('Any error'))
    expect(logger.error).toHaveBeenCalled()
  })

  describe(
    testCaption('PROCESS DATA', 'data', 'Consumer Stock - Stock Movement'),
    () => {
      it(
        testCaption(
          'DATA',
          'data',
          'Should return true if stock point is exist on auditing'
        ),
        async () => {
          jest.spyOn(cacheManager, 'get')
          const transaction = jest.spyOn(stockClient, 'transaction')

          jest.spyOn(stockClient, 'transaction').mockResolvedValue({
            send: jest.fn().mockResolvedValue({}),
            abort: jest.fn(),
            sendOffsets: jest.fn(),
            commit: jest.fn(),
            isActive: jest.fn(),
          })

          const job = {
            id: 'job-id',
            data: {
              payload: mockStockAdjustment(),
              account: mockAccount(),
              token: '',
            },
            attemptsMade: 0,
          } as Job

          await stockProcessorService.process(job).then(() => {
            expect(transaction).toHaveBeenCalled()
          })
        }
      )

      it(
        testCaption(
          'HANDLING',
          'feature',
          'Should abort transaction if any error occur'
        ),
        async () => {
          jest.spyOn(cacheManager, 'get')

          jest.spyOn(stockClient, 'transaction').mockResolvedValue({
            send: jest.fn().mockRejectedValue(new Error()),
            abort: jest.fn(),
            sendOffsets: jest.fn(),
            commit: jest.fn(),
            isActive: jest.fn(),
          })

          const job = {
            id: 'job-id',
            data: {
              payload: mockStockAdjustment(),
              account: mockAccount(),
              token: '',
            },
            attemptsMade: 0,
          } as Job

          const transaction = await stockClient.transaction('adjustment-manual')

          const abortMock = jest.spyOn(transaction, 'abort')

          const commitMock = jest.spyOn(transaction, 'commit')

          expect(
            async () =>
              await stockProcessorService.process(job).then(() => {
                expect(commitMock).not.toHaveBeenCalled()
                expect(abortMock).toHaveBeenCalled()
              })
          ).rejects.toThrow(Error)
        }
      )
    }
  )

  // afterEach(async () => {
  //   jest.clearAllMocks()
  // })

  afterAll(async () => {
    jest.clearAllMocks()
  })
})
