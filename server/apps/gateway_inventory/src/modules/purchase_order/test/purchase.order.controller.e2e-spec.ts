import { CommonErrorFilter } from '@filters/error'
import {
  accountArray,
  mockAccount,
  mockAccountModel,
} from '@gateway_core/account/mock/account.mock'
import {
  mockMasterItemSupplier,
  mockMasterItemSupplierModel,
} from '@gateway_core/master/mock/master.item.supplier.mock'
import {
  mockPurchaseRequisition,
  mockPurchaseRequisitionModel,
} from '@gateway_inventory/purchase_requisition/mock/purchase.requisition.mock'
import { SocketIoClientProxyService } from '@gateway_socket/socket.proxy'
import { JwtAuthGuard } from '@guards/jwt'
import { LogActivity } from '@log/schemas/log.activity'
import { LogLogin } from '@log/schemas/log.login'
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
  PurchaseOrder,
  PurchaseOrderDocument,
} from '@schemas/inventory/purchase.order'
import {
  PurchaseRequisition,
  PurchaseRequisitionDocument,
} from '@schemas/inventory/purchase.requisition'
import {
  MasterItemSupplier,
  MasterItemSupplierDocument,
} from '@schemas/master/master.item.supplier'
import { AuthService } from '@security/auth.service'
import { ApiQueryGeneral } from '@utility/dto/prime'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { testCaption } from '@utility/string'
import { HTTPDefaultResponseCheck } from '@utility/test/response.default'
import { Cache } from 'cache-manager'
import { Model } from 'mongoose'
import { Logger } from 'winston'

import {
  PurchaseOrderAddDTO,
  PurchaseOrderEditDTO,
} from '../dto/purchase.order'
import { PurchaseOrderApprovalDTO } from '../dto/purchase.order.approval'
import {
  mockPurchaseOrder,
  mockPurchaseOrderDocArray,
  mockPurchaseOrderModel,
} from '../mock/purchase.order.mock'
import { GatewayInventoryPurchaseOrderController } from '../purchase.order.controller'
import { GatewayInventoryPurchaseOrderService } from '../purchase.order.service'

describe('Gateway Inventory Purchase Order Controller', () => {
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
  let gatewayInventoryPurchaseOrderController: GatewayInventoryPurchaseOrderController
  let logger: Logger
  let masterItemSupplierModel: Model<MasterItemSupplier>
  let purchaseRequisitionModel: Model<PurchaseRequisition>
  let purchaseOrderModel: Model<PurchaseOrder>

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GatewayInventoryPurchaseOrderController],
      providers: [
        GatewayInventoryPurchaseOrderService,
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
        { provide: AuthService, useValue: {} },
        {
          provide: getModelToken(Account.name, 'primary'),
          useValue: mockAccountModel,
        },
        {
          provide: getModelToken(MasterItemSupplier.name, 'primary'),
          useValue: mockMasterItemSupplierModel,
        },
        {
          provide: getModelToken(PurchaseRequisition.name, 'primary'),
          useValue: mockPurchaseRequisitionModel,
        },
        {
          provide: getModelToken(PurchaseOrder.name, 'primary'),
          useValue: mockPurchaseOrderModel,
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
    gatewayInventoryPurchaseOrderController =
      app.get<GatewayInventoryPurchaseOrderController>(
        GatewayInventoryPurchaseOrderController
      )
    masterItemSupplierModel = module.get<Model<MasterItemSupplierDocument>>(
      getModelToken(MasterItemSupplier.name, 'primary')
    )
    purchaseRequisitionModel = module.get<Model<PurchaseRequisitionDocument>>(
      getModelToken(PurchaseRequisition.name, 'primary')
    )
    purchaseOrderModel = module.get<Model<PurchaseOrderDocument>>(
      getModelToken(PurchaseOrder.name, 'primary')
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
      expect(gatewayInventoryPurchaseOrderController).toBeDefined()
    }
  )

  describe(
    testCaption('FLOW', 'feature', 'Stock Mutation - Get data lazy loaded'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should handle invalid JSON format', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(purchaseOrderModel, 'aggregate').mockReturnValue({
            exec: jest.fn().mockReturnValue(mockPurchaseOrderDocArray),
          } as any)

          return app
            .inject({
              method: 'GET',
              headers: {
                authorization: 'Bearer ey...',
                'content-type': 'application/json',
              },
              url: '/inventory/purchase_order',
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
          jest.spyOn(purchaseOrderModel, 'aggregate').mockReturnValue({
            exec: jest.fn().mockReturnValue(mockPurchaseOrderDocArray),
          } as any)

          return app
            .inject({
              method: 'GET',
              headers: {
                authorization: 'Bearer ey...',
                'content-type': 'application/json',
              },
              url: '/inventory/purchase_order',
              query: `lazyEvent=${ApiQueryGeneral.primeDT.example}`,
            })
            .then((result) => {
              HTTPDefaultResponseCheck(result, HttpStatus.OK, null)
            })
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Should return undelivered PO data', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(purchaseOrderModel, 'aggregate').mockReturnValue({
            exec: jest.fn().mockReturnValue(mockPurchaseOrderDocArray),
          } as any)

          return app
            .inject({
              method: 'GET',
              headers: {
                authorization: 'Bearer ey...',
                'content-type': 'application/json',
              },
              url: '/inventory/purchase_order/uncompleted',
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
    testCaption('FLOW', 'feature', 'Stock Mutation - Get data detail'),
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
              url: `/inventory/purchase_order/${mockPurchaseOrder().id}`,
            })
            .then((result) => {
              HTTPDefaultResponseCheck(result, HttpStatus.OK, null)
            })
        }
      )
    }
  )

  describe(testCaption('FLOW', 'feature', 'Stock Mutation - Add data'), () => {
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
            url: '/inventory/purchase_order',
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
          supplier: '',
          purchase_date: new Date(),
          purchase_requisition: '',
          detail: mockPurchaseOrder().detail,
          discount_type: mockPurchaseOrder().discount_type,
          discount_value: mockPurchaseOrder().discount_value,
          extras: mockPurchaseOrder().extras,
          remark: mockPurchaseOrder().remark,
        } satisfies PurchaseOrderAddDTO

        delete data.detail

        return app
          .inject({
            method: 'POST',
            headers: {
              authorization: 'Bearer ey...',
              'content-type': 'application/json',
            },
            url: '/inventory/purchase_order',
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
          supplier: '-',
          purchase_date: new Date(),
          purchase_requisition: '-',
          detail: mockPurchaseOrder().detail,
          discount_type: mockPurchaseOrder().discount_type,
          discount_value: mockPurchaseOrder().discount_value,
          extras: mockPurchaseOrder().extras,
          remark: mockPurchaseOrder().remark,
        } satisfies PurchaseOrderAddDTO

        jest
          .spyOn(masterItemSupplierModel, 'findOne')
          .mockResolvedValue(mockMasterItemSupplier())

        jest
          .spyOn(purchaseRequisitionModel, 'findOne')
          .mockResolvedValue(mockPurchaseRequisition())

        return app
          .inject({
            method: 'POST',
            headers: {
              authorization: 'Bearer ey...',
              'content-type': 'application/json',
            },
            url: '/inventory/purchase_order',
            body: data,
          })
          .then((result) => {
            HTTPDefaultResponseCheck(result, HttpStatus.CREATED, logger.verbose)
          })
      }
    )
  })

  describe(testCaption('FLOW', 'feature', 'Stock Mutation - Edit data'), () => {
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
            url: `/inventory/purchase_order/${mockPurchaseOrder().id}`,
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
            url: `/inventory/purchase_order/${mockPurchaseOrder().id}`,
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
          supplier: '-',
          purchase_date: new Date(),
          purchase_requisition: '-',
          detail: mockPurchaseOrder().detail,
          discount_type: mockPurchaseOrder().discount_type,
          discount_value: mockPurchaseOrder().discount_value,
          extras: mockPurchaseOrder().extras,
          remark: mockPurchaseOrder().remark,
          __v: 0,
        } satisfies PurchaseOrderEditDTO

        jest
          .spyOn(purchaseOrderModel, 'findOneAndUpdate')
          .mockResolvedValue(mockPurchaseOrder())

        return app
          .inject({
            method: 'PATCH',
            headers: {
              authorization: 'Bearer ey...',
              'content-type': 'application/json',
            },
            url: `/inventory/purchase_order/${mockPurchaseOrder().id}`,
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
    testCaption('FLOW', 'feature', 'Stock Mutation - Delete data'),
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
            .spyOn(purchaseOrderModel, 'findOneAndUpdate')
            .mockResolvedValue(null)
          return app
            .inject({
              method: 'DELETE',
              headers: {
                authorization: 'Bearer ey...',
                'content-type': 'application/json',
              },
              url: `/inventory/purchase_order/${mockPurchaseOrder().id}`,
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
            .spyOn(purchaseOrderModel, 'findOneAndUpdate')
            .mockResolvedValue(mockPurchaseOrder())
          return app
            .inject({
              method: 'DELETE',
              headers: {
                authorization: 'Bearer ey...',
                'content-type': 'application/json',
              },
              url: `/inventory/purchase_order/${mockPurchaseOrder().id}`,
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

  describe(testCaption('FLOW', 'feature', 'Stock Mutation - Proposal'), () => {
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
          remark: mockPurchaseOrder().remark,
          __v: 0,
        } satisfies PurchaseOrderApprovalDTO

        jest
          .spyOn(purchaseOrderModel, 'findOneAndUpdate')
          .mockResolvedValue(null)
        return app
          .inject({
            method: 'PATCH',
            headers: {
              authorization: 'Bearer ey...',
              'content-type': 'application/json',
            },
            url: `/inventory/purchase_order/ask_approval/${mockPurchaseOrder().id}`,
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
          .spyOn(purchaseOrderModel, 'findOneAndUpdate')
          .mockResolvedValue(null)
        return app
          .inject({
            method: 'PATCH',
            headers: {
              authorization: 'Bearer ey...',
              'content-type': 'application/json',
            },
            url: `/inventory/purchase_order/ask_approval/${mockPurchaseOrder().id}`,
            body: {
              remark: mockPurchaseOrder().remark,
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
          .spyOn(purchaseOrderModel, 'findOneAndUpdate')
          .mockResolvedValue(mockPurchaseOrder())
        const data = {
          remark: mockPurchaseOrder().remark,
          __v: 0,
        } satisfies PurchaseOrderApprovalDTO
        return app
          .inject({
            method: 'PATCH',
            headers: {
              authorization: 'Bearer ey...',
              'content-type': 'application/json',
            },
            url: `/inventory/purchase_order/ask_approval/${mockPurchaseOrder().id}`,
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

  describe(testCaption('FLOW', 'feature', 'Stock Mutation - Approval'), () => {
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
          remark: mockPurchaseOrder().remark,
          __v: 0,
        } satisfies PurchaseOrderApprovalDTO

        jest
          .spyOn(purchaseOrderModel, 'findOneAndUpdate')
          .mockResolvedValue(null)
        return app
          .inject({
            method: 'PATCH',
            headers: {
              authorization: 'Bearer ey...',
              'content-type': 'application/json',
            },
            url: `/inventory/purchase_order/approve/${mockPurchaseOrder().id}`,
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
          .spyOn(purchaseOrderModel, 'findOneAndUpdate')
          .mockResolvedValue(null)
        return app
          .inject({
            method: 'PATCH',
            headers: {
              authorization: 'Bearer ey...',
              'content-type': 'application/json',
            },
            url: `/inventory/purchase_order/approve/${mockPurchaseOrder().id}`,
            body: {
              remark: mockPurchaseOrder().remark,
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
          .spyOn(purchaseOrderModel, 'findOneAndUpdate')
          .mockResolvedValue(mockPurchaseOrder())
        const data = {
          remark: mockPurchaseOrder().remark,
          __v: 0,
        } satisfies PurchaseOrderApprovalDTO
        return app
          .inject({
            method: 'PATCH',
            headers: {
              authorization: 'Bearer ey...',
              'content-type': 'application/json',
            },
            url: `/inventory/purchase_order/approve/${mockPurchaseOrder().id}`,
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

  describe(testCaption('FLOW', 'feature', 'Stock Mutation - Decline'), () => {
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
          remark: mockPurchaseOrder().remark,
          __v: 0,
        } satisfies PurchaseOrderApprovalDTO

        jest
          .spyOn(purchaseOrderModel, 'findOneAndUpdate')
          .mockResolvedValue(null)
        return app
          .inject({
            method: 'PATCH',
            headers: {
              authorization: 'Bearer ey...',
              'content-type': 'application/json',
            },
            url: `/inventory/purchase_order/decline/${mockPurchaseOrder().id}`,
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
          .spyOn(purchaseOrderModel, 'findOneAndUpdate')
          .mockResolvedValue(null)
        return app
          .inject({
            method: 'PATCH',
            headers: {
              authorization: 'Bearer ey...',
              'content-type': 'application/json',
            },
            url: `/inventory/purchase_order/decline/${mockPurchaseOrder().id}`,
            body: {
              remark: mockPurchaseOrder().remark,
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
          .spyOn(purchaseOrderModel, 'findOneAndUpdate')
          .mockResolvedValue(mockPurchaseOrder())
        const data = {
          remark: mockPurchaseOrder().remark,
          __v: 0,
        } satisfies PurchaseOrderApprovalDTO
        return app
          .inject({
            method: 'PATCH',
            headers: {
              authorization: 'Bearer ey...',
              'content-type': 'application/json',
            },
            url: `/inventory/purchase_order/decline/${mockPurchaseOrder().id}`,
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
