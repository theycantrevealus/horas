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
  StockAdjustment,
  StockAdjustmentDocument,
} from '@schemas/inventory/adjustment'
import { AuthService } from '@security/auth.service'
import { ApiQueryGeneral } from '@utility/dto/prime'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { testCaption } from '@utility/string'
import { HTTPDefaultResponseCheck } from '@utility/test/response.default'
import { Cache } from 'cache-manager'
import { Model } from 'mongoose'
import { Logger } from 'winston'

import {
  StockAdjustmentAddDTO,
  StockAdjustmentEditDTO,
} from '../dto/adjustment'
import { StockAdjustmentApprovalDTO } from '../dto/adjustment.approval'
import { GatewayInventoryStockAdjustmentController } from '../gateway.inventory.adjustment.controller'
import { GatewayInventoryStockAdjustmentService } from '../gateway.inventory.adjustment.service'
import {
  mockStockAdjustment,
  mockStockAdjustmentDocArray,
  mockStockAdjustmentModel,
} from '../mock/stock.adjustment.mock'

describe('Gateway Inventory Adjustment Controller', () => {
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
  let gatewayInventoryStockAdjustmentController: GatewayInventoryStockAdjustmentController
  let logger: Logger
  let stockAdjustmentModel: Model<StockAdjustment>

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GatewayInventoryStockAdjustmentController],
      providers: [
        GatewayInventoryStockAdjustmentService,
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
          provide: getQueueToken('stock'),
          useValue: {
            add: () => jest.fn().mockResolvedValue({ id: 'queue-1' }),
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
        { provide: AuthService, useValue: {} },
        {
          provide: getModelToken(Account.name, 'primary'),
          useValue: mockAccountModel,
        },
        {
          provide: getModelToken(StockAdjustment.name, 'primary'),
          useValue: mockStockAdjustmentModel,
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
    gatewayInventoryStockAdjustmentController =
      app.get<GatewayInventoryStockAdjustmentController>(
        GatewayInventoryStockAdjustmentController
      )
    stockAdjustmentModel = module.get<Model<StockAdjustmentDocument>>(
      getModelToken(StockAdjustment.name, 'primary')
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
      expect(gatewayInventoryStockAdjustmentController).toBeDefined()
    }
  )

  describe(
    testCaption('FLOW', 'feature', 'Stock Adjustment - Get data lazy loaded'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should handle invalid JSON format', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(stockAdjustmentModel, 'aggregate').mockReturnValue({
            exec: jest.fn().mockReturnValue(mockStockAdjustmentDocArray),
          } as any)

          return app
            .inject({
              method: 'GET',
              headers: {
                authorization: 'Bearer ey...',
                'content-type': 'application/json',
              },
              url: '/inventory/adjustment',
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
          jest.spyOn(stockAdjustmentModel, 'aggregate').mockReturnValue({
            exec: jest.fn().mockReturnValue(mockStockAdjustmentDocArray),
          } as any)

          return app
            .inject({
              method: 'GET',
              headers: {
                authorization: 'Bearer ey...',
                'content-type': 'application/json',
              },
              url: '/inventory/adjustment',
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
    testCaption('FLOW', 'feature', 'Stock Adjustment - Get data detail'),
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
              url: `/inventory/adjustment/${mockStockAdjustment().id}`,
            })
            .then((result) => {
              HTTPDefaultResponseCheck(result, HttpStatus.OK, null)
            })
        }
      )
    }
  )

  describe(
    testCaption('FLOW', 'feature', 'Stock Adjustment - Add data'),
    () => {
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
              url: '/inventory/adjustment',
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
            code: mockStockAdjustment().code,
            stock_point: mockStockAdjustment().stock_point,
            detail: mockStockAdjustment().detail,
            extras: mockStockAdjustment().extras,
            remark: mockStockAdjustment().remark,
          } satisfies StockAdjustmentAddDTO

          delete data.stock_point

          return app
            .inject({
              method: 'POST',
              headers: {
                authorization: 'Bearer ey...',
                'content-type': 'application/json',
              },
              url: '/inventory/adjustment',
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
            code: mockStockAdjustment().code,
            stock_point: mockStockAdjustment().stock_point,
            detail: mockStockAdjustment().detail,
            extras: mockStockAdjustment().extras,
            remark: mockStockAdjustment().remark,
          } satisfies StockAdjustmentAddDTO

          return app
            .inject({
              method: 'POST',
              headers: {
                authorization: 'Bearer ey...',
                'content-type': 'application/json',
              },
              url: '/inventory/adjustment',
              body: data,
            })
            .then((result) => {
              HTTPDefaultResponseCheck(
                result,
                HttpStatus.CREATED,
                logger.verbose
              )
            })
        }
      )
    }
  )

  describe(
    testCaption('FLOW', 'feature', 'Stock Adjustment - Edit data'),
    () => {
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
              url: `/inventory/adjustment/edit/${mockStockAdjustment().id}`,
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
              url: `/inventory/adjustment/edit/${mockStockAdjustment().id}`,
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
            code: mockStockAdjustment().code,
            stock_point: mockStockAdjustment().stock_point,
            detail: mockStockAdjustment().detail,
            extras: mockStockAdjustment().extras,
            remark: mockStockAdjustment().remark,
            __v: 0,
          } satisfies StockAdjustmentEditDTO

          return app
            .inject({
              method: 'PATCH',
              headers: {
                authorization: 'Bearer ey...',
                'content-type': 'application/json',
              },
              url: `/inventory/adjustment/edit/${mockStockAdjustment().id}`,
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
    }
  )

  describe(
    testCaption('FLOW', 'feature', 'Stock Adjustment - Delete data'),
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
            .spyOn(stockAdjustmentModel, 'findOneAndUpdate')
            .mockResolvedValue(null)
          return app
            .inject({
              method: 'DELETE',
              headers: {
                authorization: 'Bearer ey...',
                'content-type': 'application/json',
              },
              url: `/inventory/adjustment/${mockStockAdjustment().id}`,
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
            .spyOn(stockAdjustmentModel, 'findOneAndUpdate')
            .mockResolvedValue(mockStockAdjustment())
          return app
            .inject({
              method: 'DELETE',
              headers: {
                authorization: 'Bearer ey...',
                'content-type': 'application/json',
              },
              url: `/inventory/adjustment/${mockStockAdjustment().id}`,
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

  describe(
    testCaption('FLOW', 'feature', 'Stock Adjustment - Proposal'),
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
          const data = {
            remark: mockStockAdjustment().remark,
            __v: 0,
          } satisfies StockAdjustmentApprovalDTO

          jest
            .spyOn(stockAdjustmentModel, 'findOneAndUpdate')
            .mockResolvedValue(null)
          return app
            .inject({
              method: 'PATCH',
              headers: {
                authorization: 'Bearer ey...',
                'content-type': 'application/json',
              },
              url: `/inventory/adjustment/ask_approval/${mockStockAdjustment().id}`,
              body: data,
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
        testCaption(
          'HANDLING',
          'data',
          'Should return 400 if data is invalid',
          {
            tab: 1,
          }
        ),
        async () => {
          jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')

          jest
            .spyOn(stockAdjustmentModel, 'findOneAndUpdate')
            .mockResolvedValue(null)
          return app
            .inject({
              method: 'PATCH',
              headers: {
                authorization: 'Bearer ey...',
                'content-type': 'application/json',
              },
              url: `/inventory/adjustment/ask_approval/${mockStockAdjustment().id}`,
              body: {
                remark: mockStockAdjustment().remark,
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
        testCaption(
          'HANDLING',
          'data',
          'Should return update status proposal',
          {
            tab: 1,
          }
        ),
        async () => {
          jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')
          jest.spyOn(socketProxy, 'reconnect').mockResolvedValue({
            emit: jest.fn(),
          })
          jest
            .spyOn(stockAdjustmentModel, 'findOneAndUpdate')
            .mockResolvedValue(mockStockAdjustment())
          const data = {
            remark: mockStockAdjustment().remark,
            __v: 0,
          } satisfies StockAdjustmentApprovalDTO
          return app
            .inject({
              method: 'PATCH',
              headers: {
                authorization: 'Bearer ey...',
                'content-type': 'application/json',
              },
              url: `/inventory/adjustment/ask_approval/${mockStockAdjustment().id}`,
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
    }
  )

  describe(
    testCaption('FLOW', 'feature', 'Stock Adjustment - Approval'),
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
          const data = {
            remark: mockStockAdjustment().remark,
            __v: 0,
          } satisfies StockAdjustmentApprovalDTO

          jest
            .spyOn(stockAdjustmentModel, 'findOneAndUpdate')
            .mockResolvedValue(null)
          return app
            .inject({
              method: 'PATCH',
              headers: {
                authorization: 'Bearer ey...',
                'content-type': 'application/json',
              },
              url: `/inventory/adjustment/approve/${mockStockAdjustment().id}`,
              body: data,
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
        testCaption(
          'HANDLING',
          'data',
          'Should return 400 if data is invalid',
          {
            tab: 1,
          }
        ),
        async () => {
          jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')

          jest
            .spyOn(stockAdjustmentModel, 'findOneAndUpdate')
            .mockResolvedValue(null)
          return app
            .inject({
              method: 'PATCH',
              headers: {
                authorization: 'Bearer ey...',
                'content-type': 'application/json',
              },
              url: `/inventory/adjustment/approve/${mockStockAdjustment().id}`,
              body: {
                remark: mockStockAdjustment().remark,
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
            .spyOn(stockAdjustmentModel, 'findOneAndUpdate')
            .mockResolvedValue(mockStockAdjustment())
          const data = {
            remark: mockStockAdjustment().remark,
            __v: 0,
          } satisfies StockAdjustmentApprovalDTO
          return app
            .inject({
              method: 'PATCH',
              headers: {
                authorization: 'Bearer ey...',
                'content-type': 'application/json',
              },
              url: `/inventory/adjustment/approve/${mockStockAdjustment().id}`,
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
    }
  )

  describe(testCaption('FLOW', 'feature', 'Stock Adjustment - Decline'), () => {
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
          remark: mockStockAdjustment().remark,
          __v: 0,
        } satisfies StockAdjustmentApprovalDTO

        jest
          .spyOn(stockAdjustmentModel, 'findOneAndUpdate')
          .mockResolvedValue(null)
        return app
          .inject({
            method: 'PATCH',
            headers: {
              authorization: 'Bearer ey...',
              'content-type': 'application/json',
            },
            url: `/inventory/adjustment/decline/${mockStockAdjustment().id}`,
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
          .spyOn(stockAdjustmentModel, 'findOneAndUpdate')
          .mockResolvedValue(null)
        return app
          .inject({
            method: 'PATCH',
            headers: {
              authorization: 'Bearer ey...',
              'content-type': 'application/json',
            },
            url: `/inventory/adjustment/decline/${mockStockAdjustment().id}`,
            body: {
              remark: mockStockAdjustment().remark,
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
          .spyOn(stockAdjustmentModel, 'findOneAndUpdate')
          .mockResolvedValue(mockStockAdjustment())
        const data = {
          remark: mockStockAdjustment().remark,
          __v: 0,
        } satisfies StockAdjustmentApprovalDTO
        return app
          .inject({
            method: 'PATCH',
            headers: {
              authorization: 'Bearer ey...',
              'content-type': 'application/json',
            },
            url: `/inventory/adjustment/decline/${mockStockAdjustment().id}`,
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

  describe(testCaption('FLOW', 'feature', 'Stock Adjustment - Process'), () => {
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
          remark: mockStockAdjustment().remark,
          __v: 0,
        } satisfies StockAdjustmentApprovalDTO

        jest
          .spyOn(stockAdjustmentModel, 'findOneAndUpdate')
          .mockResolvedValue(null)
        return app
          .inject({
            method: 'PATCH',
            headers: {
              authorization: 'Bearer ey...',
              'content-type': 'application/json',
            },
            url: `/inventory/adjustment/process/${mockStockAdjustment().id}`,
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
          .spyOn(stockAdjustmentModel, 'findOneAndUpdate')
          .mockResolvedValue(null)
        return app
          .inject({
            method: 'PATCH',
            headers: {
              authorization: 'Bearer ey...',
              'content-type': 'application/json',
            },
            url: `/inventory/adjustment/process/${mockStockAdjustment().id}`,
            body: {
              remark: mockStockAdjustment().remark,
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
          .spyOn(stockAdjustmentModel, 'findOneAndUpdate')
          .mockResolvedValue(mockStockAdjustment())
        const data = {
          remark: mockStockAdjustment().remark,
          __v: 0,
        } satisfies StockAdjustmentApprovalDTO
        return app
          .inject({
            method: 'PATCH',
            headers: {
              authorization: 'Bearer ey...',
              'content-type': 'application/json',
            },
            url: `/inventory/adjustment/process/${mockStockAdjustment().id}`,
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
