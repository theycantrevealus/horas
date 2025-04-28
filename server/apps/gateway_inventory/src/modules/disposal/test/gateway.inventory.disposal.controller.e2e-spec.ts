import { CommonErrorFilter } from '@filters/error'
import {
  accountArray,
  mockAccount,
  mockAccountModel,
} from '@gateway_core/account/mock/account.mock'
import { SocketIoClientProxyService } from '@gateway_socket/socket.proxy'
import { JwtAuthGuard } from '@guards/jwt'
import { LogActivity } from '@log/schemas/log.activity'
import { LogLogin } from '@log/schemas/log.login'
import { getQueueToken } from '@nestjs/bullmq'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { CanActivate, ExecutionContext, HttpStatus } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { getConnectionToken, getModelToken } from '@nestjs/mongoose'
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify'
import { Test, TestingModule } from '@nestjs/testing'
import { GatewayPipe } from '@pipes/gateway.pipe'
import { Account } from '@schemas/account/account.model'
import {
  StockDisposal,
  StockDisposalDocument,
} from '@schemas/inventory/disposal'
import { AuthService } from '@security/auth.service'
import { ApiQueryGeneral } from '@utility/dto/prime'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { testCaption } from '@utility/string'
import { HTTPDefaultResponseCheck } from '@utility/test/response.default'
import { Cache } from 'cache-manager'
import { Model } from 'mongoose'
import { Logger } from 'winston'

import { StockDisposalAddDTO, StockDisposalEditDTO } from '../dto/disposal'
import { StockDisposalApprovalDTO } from '../dto/disposal.approval'
import { GatewayInventoryStockDisposalController } from '../gateway.inventory.disposal.controller'
import { GatewayInventoryStockDisposalService } from '../gateway.inventory.disposal.service'
import {
  mockStockDisposal,
  mockStockDisposalDocArray,
  mockStockDisposalModel,
} from '../mock/stock.disposal.mock'

describe('Gateway Inventory Stock Disposal Controller', () => {
  const mock_Guard: CanActivate = {
    canActivate: jest.fn((context: ExecutionContext) => {
      const request = context.switchToHttp().getRequest()
      request.credential = mockAccount()
      return true
    }),
  }
  let app: NestFastifyApplication
  let configService: ConfigService
  let cacheManager: Cache
  let socketProxy: SocketIoClientProxyService
  let gatewayInventoryStockDisposalController: GatewayInventoryStockDisposalController
  let logger: Logger
  let stockDisposalModel: Model<StockDisposal>

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GatewayInventoryStockDisposalController],
      providers: [
        GatewayInventoryStockDisposalService,
        {
          provide: ConfigService,
          useValue: {
            get: () => jest.fn().mockResolvedValue('Test'),
            set: () => jest.fn().mockResolvedValue('Test'),
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
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: () => accountArray[0],
            set: () => jest.fn(),
          },
        },
        {
          provide: SocketIoClientProxyService,
          useValue: {
            reconnect: () =>
              jest.fn().mockResolvedValue({
                emit: jest.fn(),
              }),
          },
        },
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
          provide: getConnectionToken('primary'),
          useValue: {
            collection: jest.fn().mockReturnThis(),
            db: {
              collection: jest.fn().mockReturnThis(),
            },
            startSession: jest.fn().mockImplementation(() => ({
              //   withTransaction: jest.fn(),
              withTransaction: jest
                .fn()
                .mockImplementation((callback) => callback()),
              endSession: jest.fn(),
            })),
          },
        },
        {
          provide: getQueueToken('stock'),
          useValue: {
            add: () => jest.fn().mockResolvedValue({ id: 'queue-1' }),
          },
        },
        { provide: AuthService, useValue: {} },
        {
          provide: getModelToken(Account.name, 'primary'),
          useValue: mockAccountModel,
        },
        {
          provide: getModelToken(StockDisposal.name, 'primary'),
          useValue: mockStockDisposalModel,
        },
        { provide: getModelToken(LogLogin.name, 'primary'), useValue: {} },
        { provide: getModelToken(LogActivity.name, 'primary'), useValue: {} },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mock_Guard)
      .compile()

    app = module.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter({
        logger: false,
        disableRequestLogging: true,
        ignoreTrailingSlash: true,
        ignoreDuplicateSlashes: true,
      })
    )
    logger = app.get<Logger>(WINSTON_MODULE_PROVIDER)
    configService = app.get<ConfigService>(ConfigService)
    socketProxy = module.get<SocketIoClientProxyService>(
      SocketIoClientProxyService
    )
    cacheManager = module.get(CACHE_MANAGER)
    gatewayInventoryStockDisposalController =
      app.get<GatewayInventoryStockDisposalController>(
        GatewayInventoryStockDisposalController
      )
    stockDisposalModel = module.get<Model<StockDisposalDocument>>(
      getModelToken(StockDisposal.name, 'primary')
    )
    await app.useGlobalFilters(new CommonErrorFilter(logger))
    app.useGlobalPipes(new GatewayPipe())
    await app.init()
    await app.getHttpAdapter().getInstance().ready()

    jest.clearAllMocks()
  })

  beforeEach(() => {
    jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')
    jest.spyOn(cacheManager, 'get').mockResolvedValueOnce({})
  })

  it(
    testCaption(
      'CONTROLLER STATE',
      'component',
      'Controller should be defined'
    ),
    () => {
      expect(gatewayInventoryStockDisposalController).toBeDefined()
    }
  )

  describe(
    testCaption('FLOW', 'feature', 'Stock Disposal - Get data lazy loaded'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should handle invalid JSON format', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(stockDisposalModel, 'aggregate').mockReturnValue({
            exec: jest.fn().mockReturnValue(mockStockDisposalDocArray),
          } as any)

          return app
            .inject({
              method: 'GET',
              headers: {
                authorization: 'Bearer ey...',
                'content-type': 'application/json',
              },
              url: '/inventory/disposal',
              query: `lazyEvent=abc`,
            })
            .then((result) => {
              HTTPDefaultResponseCheck(
                result,
                HttpStatus.INTERNAL_SERVER_ERROR,
                null
              )
            })
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Should return data', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(stockDisposalModel, 'aggregate').mockReturnValue({
            exec: jest.fn().mockReturnValue(mockStockDisposalDocArray),
          } as any)

          return app
            .inject({
              method: 'GET',
              headers: {
                authorization: 'Bearer ey...',
                'content-type': 'application/json',
              },
              url: '/inventory/disposal',
              query: `lazyEvent=${ApiQueryGeneral.primeDT.example}`,
            })
            .then((result) => {
              HTTPDefaultResponseCheck(result, HttpStatus.OK, null)
            })
        }
      )
    }
  )

  describe(
    testCaption('FLOW', 'feature', 'Stock Disposal - Get data detail'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should return detail data', {
          tab: 1,
        }),
        async () => {
          return app
            .inject({
              method: 'GET',
              headers: {
                authorization: 'Bearer ey...',
                'content-type': 'application/json',
              },
              url: `/inventory/disposal/${mockStockDisposal().id}`,
            })
            .then((result) => {
              HTTPDefaultResponseCheck(result, HttpStatus.OK, null)
            })
        }
      )
    }
  )

  describe(testCaption('FLOW', 'feature', 'Stock Disposal - Add data'), () => {
    it(
      testCaption('HANDLING', 'feature', 'Should handle invalid format', {
        tab: 1,
      }),
      async () => {
        return app
          .inject({
            method: 'POST',
            headers: {
              authorization: 'Bearer ey...',
              'content-type': 'application/json',
            },
            url: '/inventory/disposal',
            body: {},
          })
          .then((result) => {
            HTTPDefaultResponseCheck(
              result,
              HttpStatus.BAD_REQUEST,
              logger.warn
            )
          })
      }
    )

    it(
      testCaption('HANDLING', 'feature', 'Should handle invalid data', {
        tab: 1,
      }),
      async () => {
        const data = {
          code: mockStockDisposal().code,
          transaction_date: mockStockDisposal().transaction_date,
          stock_point: mockStockDisposal().stock_point,
          detail: mockStockDisposal().detail,
          extras: mockStockDisposal().extras,
          remark: mockStockDisposal().remark,
        } satisfies StockDisposalAddDTO

        delete data.stock_point

        return app
          .inject({
            method: 'POST',
            headers: {
              authorization: 'Bearer ey...',
              'content-type': 'application/json',
            },
            url: '/inventory/disposal',
            body: data,
          })
          .then((result) => {
            HTTPDefaultResponseCheck(
              result,
              HttpStatus.BAD_REQUEST,
              logger.warn
            )
          })
      }
    )

    it(
      testCaption('HANDLING', 'data', 'Should return success add', {
        tab: 1,
      }),
      async () => {
        const data = {
          code: mockStockDisposal().code,
          transaction_date: mockStockDisposal().transaction_date,
          stock_point: mockStockDisposal().stock_point,
          detail: mockStockDisposal().detail,
          extras: mockStockDisposal().extras,
          remark: mockStockDisposal().remark,
        } satisfies StockDisposalAddDTO

        return app
          .inject({
            method: 'POST',
            headers: {
              authorization: 'Bearer ey...',
              'content-type': 'application/json',
            },
            url: '/inventory/disposal',
            body: data,
          })
          .then((result) => {
            HTTPDefaultResponseCheck(result, HttpStatus.CREATED, logger.verbose)
          })
      }
    )
  })

  describe(testCaption('FLOW', 'feature', 'Stock Disposal - Edit data'), () => {
    it(
      testCaption('HANDLING', 'feature', 'Should handle invalid format', {
        tab: 1,
      }),
      async () => {
        return app
          .inject({
            method: 'PATCH',
            headers: {
              authorization: 'Bearer ey...',
              'content-type': 'application/json',
            },
            url: `/inventory/disposal/edit/${mockStockDisposal().id}`,
            body: {},
          })
          .then((result) => {
            HTTPDefaultResponseCheck(
              result,
              HttpStatus.BAD_REQUEST,
              logger.warn
            )
          })
      }
    )

    it(
      testCaption('HANDLING', 'feature', 'Should handle invalid data', {
        tab: 1,
      }),
      async () => {
        return app
          .inject({
            method: 'PATCH',
            headers: {
              authorization: 'Bearer ey...',
              'content-type': 'application/json',
            },
            url: `/inventory/disposal/edit/${mockStockDisposal().id}`,
            body: {},
          })
          .then((result) => {
            HTTPDefaultResponseCheck(
              result,
              HttpStatus.BAD_REQUEST,
              logger.warn
            )
          })
      }
    )

    it(
      testCaption('HANDLING', 'data', 'Should return success edit', {
        tab: 1,
      }),
      async () => {
        const data = {
          code: mockStockDisposal().code,
          transaction_date: mockStockDisposal().transaction_date,
          stock_point: mockStockDisposal().stock_point,
          detail: mockStockDisposal().detail,
          extras: mockStockDisposal().extras,
          remark: mockStockDisposal().remark,
          __v: 0,
        } satisfies StockDisposalEditDTO

        return app
          .inject({
            method: 'PATCH',
            headers: {
              authorization: 'Bearer ey...',
              'content-type': 'application/json',
            },
            url: `/inventory/disposal/edit/${mockStockDisposal().id}`,
            body: data,
          })
          .then((result) => {
            HTTPDefaultResponseCheck(
              result,
              HttpStatus.ACCEPTED,
              logger.verbose
            )
          })
      }
    )
  })

  describe(
    testCaption('FLOW', 'feature', 'Stock Disposal - Delete data'),
    () => {
      it(
        testCaption(
          'HANDLING',
          'data',
          'Should return 404 if data is not found',
          {
            tab: 1,
          }
        ),
        async () => {
          jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')
          jest
            .spyOn(stockDisposalModel, 'findOneAndUpdate')
            .mockResolvedValue(null)
          return app
            .inject({
              method: 'DELETE',
              headers: {
                authorization: 'Bearer ey...',
                'content-type': 'application/json',
              },
              url: `/inventory/disposal/${mockStockDisposal().id}`,
            })
            .then(async (result) => {
              HTTPDefaultResponseCheck(
                result,
                HttpStatus.NOT_FOUND,
                logger.warn
              )
            })
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Should return success delete', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')
          jest
            .spyOn(stockDisposalModel, 'findOneAndUpdate')
            .mockResolvedValue(mockStockDisposal())
          return app
            .inject({
              method: 'DELETE',
              headers: {
                authorization: 'Bearer ey...',
                'content-type': 'application/json',
              },
              url: `/inventory/disposal/${mockStockDisposal().id}`,
            })
            .then((result) => {
              HTTPDefaultResponseCheck(
                result,
                HttpStatus.NO_CONTENT,
                logger.verbose
              )
            })
        }
      )
    }
  )

  describe(testCaption('FLOW', 'feature', 'Stock Disposal - Proposal'), () => {
    it(
      testCaption(
        'HANDLING',
        'data',
        'Should return 404 if data is not found',
        {
          tab: 1,
        }
      ),
      async () => {
        jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')
        const data = {
          remark: mockStockDisposal().remark,
          __v: 0,
        } satisfies StockDisposalApprovalDTO

        jest
          .spyOn(stockDisposalModel, 'findOneAndUpdate')
          .mockResolvedValue(null)
        return app
          .inject({
            method: 'PATCH',
            headers: {
              authorization: 'Bearer ey...',
              'content-type': 'application/json',
            },
            url: `/inventory/disposal/ask_approval/${mockStockDisposal().id}`,
            body: data,
          })
          .then(async (result) => {
            HTTPDefaultResponseCheck(result, HttpStatus.NOT_FOUND, logger.warn)
          })
      }
    )

    it(
      testCaption('HANDLING', 'data', 'Should return 400 if data is invalid', {
        tab: 1,
      }),
      async () => {
        jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')

        jest
          .spyOn(stockDisposalModel, 'findOneAndUpdate')
          .mockResolvedValue(null)
        return app
          .inject({
            method: 'PATCH',
            headers: {
              authorization: 'Bearer ey...',
              'content-type': 'application/json',
            },
            url: `/inventory/disposal/ask_approval/${mockStockDisposal().id}`,
            body: {
              remark: mockStockDisposal().remark,
            },
          })
          .then(async (result) => {
            HTTPDefaultResponseCheck(
              result,
              HttpStatus.BAD_REQUEST,
              logger.warn
            )
          })
      }
    )

    it(
      testCaption('HANDLING', 'data', 'Should return update status proposal', {
        tab: 1,
      }),
      async () => {
        jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')
        jest.spyOn(socketProxy, 'reconnect').mockResolvedValue({
          emit: jest.fn(),
        })
        jest
          .spyOn(stockDisposalModel, 'findOneAndUpdate')
          .mockResolvedValue(mockStockDisposal())
        const data = {
          remark: mockStockDisposal().remark,
          __v: 0,
        } satisfies StockDisposalApprovalDTO
        return app
          .inject({
            method: 'PATCH',
            headers: {
              authorization: 'Bearer ey...',
              'content-type': 'application/json',
            },
            url: `/inventory/disposal/ask_approval/${mockStockDisposal().id}`,
            body: data,
          })
          .then((result) => {
            HTTPDefaultResponseCheck(
              result,
              HttpStatus.ACCEPTED,
              logger.verbose
            )
          })
      }
    )
  })

  describe(testCaption('FLOW', 'feature', 'Stock Disposal - Approval'), () => {
    it(
      testCaption(
        'HANDLING',
        'data',
        'Should return 404 if data is not found',
        {
          tab: 1,
        }
      ),
      async () => {
        jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')
        const data = {
          remark: mockStockDisposal().remark,
          __v: 0,
        } satisfies StockDisposalApprovalDTO

        jest
          .spyOn(stockDisposalModel, 'findOneAndUpdate')
          .mockResolvedValue(null)
        return app
          .inject({
            method: 'PATCH',
            headers: {
              authorization: 'Bearer ey...',
              'content-type': 'application/json',
            },
            url: `/inventory/disposal/approve/${mockStockDisposal().id}`,
            body: data,
          })
          .then(async (result) => {
            HTTPDefaultResponseCheck(result, HttpStatus.NOT_FOUND, logger.warn)
          })
      }
    )

    it(
      testCaption('HANDLING', 'data', 'Should return 400 if data is invalid', {
        tab: 1,
      }),
      async () => {
        jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')

        jest
          .spyOn(stockDisposalModel, 'findOneAndUpdate')
          .mockResolvedValue(null)
        return app
          .inject({
            method: 'PATCH',
            headers: {
              authorization: 'Bearer ey...',
              'content-type': 'application/json',
            },
            url: `/inventory/disposal/approve/${mockStockDisposal().id}`,
            body: {
              remark: mockStockDisposal().remark,
            },
          })
          .then(async (result) => {
            HTTPDefaultResponseCheck(
              result,
              HttpStatus.BAD_REQUEST,
              logger.warn
            )
          })
      }
    )

    it(
      testCaption('HANDLING', 'data', 'Should return update status approve', {
        tab: 1,
      }),
      async () => {
        jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')
        jest.spyOn(socketProxy, 'reconnect').mockResolvedValue({
          emit: jest.fn(),
        })
        jest
          .spyOn(stockDisposalModel, 'findOneAndUpdate')
          .mockResolvedValue(mockStockDisposal())
        const data = {
          remark: mockStockDisposal().remark,
          __v: 0,
        } satisfies StockDisposalApprovalDTO
        return app
          .inject({
            method: 'PATCH',
            headers: {
              authorization: 'Bearer ey...',
              'content-type': 'application/json',
            },
            url: `/inventory/disposal/approve/${mockStockDisposal().id}`,
            body: data,
          })
          .then((result) => {
            HTTPDefaultResponseCheck(
              result,
              HttpStatus.ACCEPTED,
              logger.verbose
            )
          })
      }
    )
  })

  describe(testCaption('FLOW', 'feature', 'Stock Disposal - Decline'), () => {
    it(
      testCaption(
        'HANDLING',
        'data',
        'Should return 404 if data is not found',
        {
          tab: 1,
        }
      ),
      async () => {
        jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')
        const data = {
          remark: mockStockDisposal().remark,
          __v: 0,
        } satisfies StockDisposalApprovalDTO

        jest
          .spyOn(stockDisposalModel, 'findOneAndUpdate')
          .mockResolvedValue(null)
        return app
          .inject({
            method: 'PATCH',
            headers: {
              authorization: 'Bearer ey...',
              'content-type': 'application/json',
            },
            url: `/inventory/disposal/decline/${mockStockDisposal().id}`,
            body: data,
          })
          .then(async (result) => {
            HTTPDefaultResponseCheck(result, HttpStatus.NOT_FOUND, logger.warn)
          })
      }
    )

    it(
      testCaption('HANDLING', 'data', 'Should return 400 if data is invalid', {
        tab: 1,
      }),
      async () => {
        jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')

        jest
          .spyOn(stockDisposalModel, 'findOneAndUpdate')
          .mockResolvedValue(null)
        return app
          .inject({
            method: 'PATCH',
            headers: {
              authorization: 'Bearer ey...',
              'content-type': 'application/json',
            },
            url: `/inventory/disposal/decline/${mockStockDisposal().id}`,
            body: {
              remark: mockStockDisposal().remark,
            },
          })
          .then(async (result) => {
            HTTPDefaultResponseCheck(
              result,
              HttpStatus.BAD_REQUEST,
              logger.warn
            )
          })
      }
    )

    it(
      testCaption('HANDLING', 'data', 'Should return update status decline', {
        tab: 1,
      }),
      async () => {
        jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')
        jest.spyOn(socketProxy, 'reconnect').mockResolvedValue({
          emit: jest.fn(),
        })
        jest
          .spyOn(stockDisposalModel, 'findOneAndUpdate')
          .mockResolvedValue(mockStockDisposal())
        const data = {
          remark: mockStockDisposal().remark,
          __v: 0,
        } satisfies StockDisposalApprovalDTO
        return app
          .inject({
            method: 'PATCH',
            headers: {
              authorization: 'Bearer ey...',
              'content-type': 'application/json',
            },
            url: `/inventory/disposal/decline/${mockStockDisposal().id}`,
            body: data,
          })
          .then((result) => {
            HTTPDefaultResponseCheck(
              result,
              HttpStatus.ACCEPTED,
              logger.verbose
            )
          })
      }
    )
  })

  describe(testCaption('FLOW', 'feature', 'Stock Disposal - Running'), () => {
    it(
      testCaption(
        'HANDLING',
        'data',
        'Should return 404 if data is not found',
        {
          tab: 1,
        }
      ),
      async () => {
        jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')
        const data = {
          remark: mockStockDisposal().remark,
          __v: 0,
        } satisfies StockDisposalApprovalDTO

        jest
          .spyOn(stockDisposalModel, 'findOneAndUpdate')
          .mockResolvedValue(null)
        return app
          .inject({
            method: 'PATCH',
            headers: {
              authorization: 'Bearer ey...',
              'content-type': 'application/json',
            },
            url: `/inventory/disposal/running/${mockStockDisposal().id}`,
            body: data,
          })
          .then(async (result) => {
            HTTPDefaultResponseCheck(result, HttpStatus.NOT_FOUND, logger.warn)
          })
      }
    )

    it(
      testCaption('HANDLING', 'data', 'Should return 400 if data is invalid', {
        tab: 1,
      }),
      async () => {
        jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')

        jest
          .spyOn(stockDisposalModel, 'findOneAndUpdate')
          .mockResolvedValue(null)
        return app
          .inject({
            method: 'PATCH',
            headers: {
              authorization: 'Bearer ey...',
              'content-type': 'application/json',
            },
            url: `/inventory/disposal/running/${mockStockDisposal().id}`,
            body: {
              remark: mockStockDisposal().remark,
            },
          })
          .then(async (result) => {
            HTTPDefaultResponseCheck(
              result,
              HttpStatus.BAD_REQUEST,
              logger.warn
            )
          })
      }
    )

    it(
      testCaption('HANDLING', 'data', 'Should return update status running', {
        tab: 1,
      }),
      async () => {
        jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')
        jest.spyOn(socketProxy, 'reconnect').mockResolvedValue({
          emit: jest.fn(),
        })
        jest
          .spyOn(stockDisposalModel, 'findOneAndUpdate')
          .mockResolvedValue(mockStockDisposal())
        const data = {
          remark: mockStockDisposal().remark,
          __v: 0,
        } satisfies StockDisposalApprovalDTO
        return app
          .inject({
            method: 'PATCH',
            headers: {
              authorization: 'Bearer ey...',
              'content-type': 'application/json',
            },
            url: `/inventory/disposal/running/${mockStockDisposal().id}`,
            body: data,
          })
          .then((result) => {
            HTTPDefaultResponseCheck(
              result,
              HttpStatus.ACCEPTED,
              logger.verbose
            )
          })
      }
    )
  })

  afterEach(async () => {
    jest.clearAllMocks()
  })

  afterAll(async () => {
    jest.clearAllMocks()
    await app.close()
  })
})
