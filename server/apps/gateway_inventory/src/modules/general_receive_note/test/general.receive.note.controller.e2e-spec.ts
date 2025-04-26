import { CommonErrorFilter } from '@filters/error'
import {
  accountArray,
  mockAccount,
  mockAccountModel,
} from '@gateway_core/account/mock/account.mock'
import { mockMasterItemBatchModel } from '@gateway_core/master/mock/master.item.batch.mock'
import {
  mockMasterItem,
  mockMasterItemModel,
} from '@gateway_core/master/mock/master.item.mock'
import {
  mockMasterItemSupplier,
  mockMasterItemSupplierModel,
} from '@gateway_core/master/mock/master.item.supplier.mock'
import {
  mockMasterStockPoint,
  mockMasterStockPointModel,
} from '@gateway_core/master/mock/master.stock.point.mock'
import { MasterStockPointService } from '@gateway_core/master/services/master.stock.point.service'
import {
  mockPurchaseOrder,
  mockPurchaseOrderModel,
} from '@gateway_inventory/purchase_order/mock/purchase.order.mock'
import { GatewayInventoryPurchaseOrderService } from '@gateway_inventory/purchase_order/purchase.order.service'
import { mockPurchaseRequisitionModel } from '@gateway_inventory/purchase_requisition/mock/purchase.requisition.mock'
import { SocketIoClientProxyService } from '@gateway_socket/socket.proxy'
import { JwtAuthGuard } from '@guards/jwt'
import { LogActivity } from '@log/schemas/log.activity'
import { LogLogin } from '@log/schemas/log.login'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { CanActivate, ExecutionContext, HttpStatus } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { getConnectionToken, getModelToken } from '@nestjs/mongoose'
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify'
import { Test, TestingModule } from '@nestjs/testing'
import { GatewayPipe } from '@pipes/gateway.pipe'
import { Account } from '@schemas/account/account.model'
import {
  GeneralReceiveNote,
  GeneralReceiveNoteDocument,
} from '@schemas/inventory/general.receive.note'
import {
  PurchaseOrder,
  PurchaseOrderDocument,
} from '@schemas/inventory/purchase.order'
import { PurchaseRequisition } from '@schemas/inventory/purchase.requisition'
import { MasterItem, MasterItemDocument } from '@schemas/master/master.item'
import { MasterItemBatch } from '@schemas/master/master.item.batch'
import { MasterItemSupplier } from '@schemas/master/master.item.supplier'
import { MasterStockPoint } from '@schemas/master/master.stock.point'
import { AuthService } from '@security/auth.service'
import { ApiQueryGeneral } from '@utility/dto/prime'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { testCaption } from '@utility/string'
import { HTTPDefaultResponseCheck } from '@utility/test/response.default'
import { Cache } from 'cache-manager'
import { Model } from 'mongoose'
import { Logger } from 'winston'

import { GeneralReceiveNoteAddDTO } from '../dto/general.receive.note.dto'
import { GatewayInventoryGeneralReceiveNoteController } from '../general.receive.note.controller'
import { GatewayInventoryGeneralReceiveNoteService } from '../general.receive.note.service'
import {
  mockGeneralReceiveNote,
  mockGeneralReceiveNoteDocArray,
  mockGeneralReceiveNoteModel,
} from '../mock/general.receive.note.mock'

describe('Gateway Inventory General Receive Note Controller', () => {
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
  let gatewayInventoryGeneralReceiveNoteController: GatewayInventoryGeneralReceiveNoteController
  let logger: Logger
  let masterItemModel: Model<MasterItem>
  let generalReceiveNoteModel: Model<GeneralReceiveNote>
  let purchaseOrderModel: Model<PurchaseOrder>

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GatewayInventoryGeneralReceiveNoteController],
      providers: [
        MasterStockPointService,
        GatewayInventoryPurchaseOrderService,
        GatewayInventoryGeneralReceiveNoteService,
        JwtService,
        AuthService,
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
          provide: getModelToken(MasterStockPoint.name, 'primary'),
          useValue: mockMasterStockPointModel,
        },
        {
          provide: getModelToken(MasterItem.name, 'primary'),
          useValue: mockMasterItemModel,
        },
        {
          provide: getModelToken(MasterItemBatch.name, 'primary'),
          useValue: mockMasterItemBatchModel,
        },
        {
          provide: getModelToken(PurchaseRequisition.name, 'primary'),
          useValue: mockPurchaseRequisitionModel,
        },
        {
          provide: getModelToken(PurchaseOrder.name, 'primary'),
          useValue: mockPurchaseOrderModel,
        },
        {
          provide: getModelToken(GeneralReceiveNote.name, 'primary'),
          useValue: mockGeneralReceiveNoteModel,
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
    cacheManager = module.get(CACHE_MANAGER)
    gatewayInventoryGeneralReceiveNoteController =
      app.get<GatewayInventoryGeneralReceiveNoteController>(
        GatewayInventoryGeneralReceiveNoteController
      )

    masterItemModel = module.get<Model<MasterItemDocument>>(
      getModelToken(MasterItem.name, 'primary')
    )
    generalReceiveNoteModel = module.get<Model<GeneralReceiveNoteDocument>>(
      getModelToken(GeneralReceiveNote.name, 'primary')
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
      expect(gatewayInventoryGeneralReceiveNoteController).toBeDefined()
    }
  )

  describe(
    testCaption(
      'FLOW',
      'feature',
      'General Receive Note - Get data lazy loaded'
    ),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should handle invalid JSON format', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(generalReceiveNoteModel, 'aggregate').mockReturnValue({
            exec: jest.fn().mockReturnValue(mockGeneralReceiveNoteDocArray),
          } as any)

          return app
            .inject({
              method: 'GET',
              headers: {
                authorization: 'Bearer ey...',
                'content-type': 'application/json',
              },
              url: '/inventory/general_receive_note',
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
          jest.spyOn(generalReceiveNoteModel, 'aggregate').mockReturnValue({
            exec: jest.fn().mockReturnValue(mockGeneralReceiveNoteDocArray),
          } as any)

          return app
            .inject({
              method: 'GET',
              headers: {
                authorization: 'Bearer ey...',
                'content-type': 'application/json',
              },
              url: '/inventory/general_receive_note',
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
    testCaption('FLOW', 'feature', 'General Receive Note - Get data detail'),
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
              url: `/inventory/general_receive_note/${mockGeneralReceiveNote().id}`,
            })
            .then((result) => {
              HTTPDefaultResponseCheck(result, HttpStatus.OK, null)
            })
        }
      )
    }
  )

  describe(
    testCaption('FLOW', 'feature', 'General Receive Note - Add data'),
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
              url: '/inventory/general_receive_note',
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
            code: 'xxxxxxxxx',
            stock_point: mockMasterStockPoint(),
            purchase_order: {
              id: mockPurchaseOrder().id,
              code: mockPurchaseOrder().code,
              supplier: mockMasterItemSupplier().id,
              purchase_date: new Date(),
              remark: '-',
            },
            detail: [
              {
                item: mockMasterItem(),
                qty: 10,
                batch: 'X01192D',
                expired: new Date(),
                remark: '-',
              },
              {
                item: mockMasterItem(),
                qty: 10,
                batch: 'AV3D112',
                expired: new Date(),
                remark: '-',
              },
            ],
            extras: mockGeneralReceiveNote().extras,
            remark: '-',
          } satisfies GeneralReceiveNoteAddDTO

          delete data.stock_point

          return app
            .inject({
              method: 'POST',
              headers: {
                authorization: 'Bearer ey...',
                'content-type': 'application/json',
              },
              url: '/inventory/general_receive_note',
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
          jest
            .spyOn(masterItemModel, 'findOne')
            .mockImplementation((filter) => {
              return {
                exec: () =>
                  Promise.resolve(
                    filter.id === 'xx1' ? null : mockMasterItem()
                  ),
              } as any
            })

          jest.spyOn(purchaseOrderModel, 'findOne').mockResolvedValue({
            ...mockPurchaseOrder(),
            status: 'approved',
          })

          const data = {
            code: 'xxxxxxxxx',
            stock_point: mockMasterStockPoint(),
            purchase_order: {
              id: mockPurchaseOrder().id,
              code: mockPurchaseOrder().code,
              supplier: mockMasterItemSupplier().id,
              purchase_date: new Date(),
              remark: '-',
            },
            detail: [
              {
                item: mockMasterItem(),
                qty: 10,
                batch: 'X01192D',
                expired: new Date(),
                remark: '-',
              },
              {
                item: mockMasterItem(),
                qty: 10,
                batch: 'AV3D112',
                expired: new Date(),
                remark: '-',
              },
            ],
            extras: mockGeneralReceiveNote().extras,
            remark: '-',
          } satisfies GeneralReceiveNoteAddDTO

          return app
            .inject({
              method: 'POST',
              headers: {
                authorization: 'Bearer ey...',
                'content-type': 'application/json',
              },
              url: '/inventory/general_receive_note',
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

  afterEach(async () => {
    jest.clearAllMocks()
  })

  afterAll(async () => {
    jest.clearAllMocks()
    await app.close()
  })
})
