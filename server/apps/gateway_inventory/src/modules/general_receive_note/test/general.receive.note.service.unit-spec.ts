import { mockAccount } from '@gateway_core/account/mock/account.mock'
import { mockAuthorityModel } from '@gateway_core/account/mock/authority.mock'
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
import { LogActivity } from '@log/schemas/log.activity'
import { LogLogin } from '@log/schemas/log.login'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { getConnectionToken, getModelToken } from '@nestjs/mongoose'
import { Test, TestingModule } from '@nestjs/testing'
import { Authority } from '@schemas/account/authority.model'
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
import {
  MasterItemBatch,
  MasterItemBatchDocument,
} from '@schemas/master/master.item.batch'
import { MasterItemSupplier } from '@schemas/master/master.item.supplier'
import {
  MasterStockPoint,
  MasterStockPointDocument,
} from '@schemas/master/master.stock.point'
import { AuthService } from '@security/auth.service'
import { KafkaService } from '@utility/kafka/avro/service'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { testCaption } from '@utility/string'
import { Cache } from 'cache-manager'
import { Model } from 'mongoose'

import { GatewayInventoryGeneralReceiveNoteService } from '../general.receive.note.service'
import {
  mockGeneralReceiveNote,
  mockGeneralReceiveNoteDocArray,
  mockGeneralReceiveNoteModel,
} from '../mock/general.receive.note.mock'

describe('Gateway Inventory General Receive Note Service', () => {
  let configService: ConfigService
  let cacheManager: Cache
  let gatewayInventoryGeneralReceiveNoteService: GatewayInventoryGeneralReceiveNoteService
  let masterItemModel: Model<MasterItem>
  let masterItemBatchModel: Model<MasterItemBatch>
  let masterStockPointModel: Model<MasterStockPoint>
  let purchaseOrderModel: Model<PurchaseOrder>
  let generalReceiveNoteModel: Model<GeneralReceiveNote>
  let stockPointService: MasterStockPointService
  let purchaseOrderService: GatewayInventoryPurchaseOrderService
  let stockClient: KafkaService
  //   let socketProxy: SocketIoClientProxyService

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [],
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
            transaction: jest.fn().mockImplementation(() => {
              return Promise.resolve({
                send: () => {
                  return Promise.resolve()
                },
                abort: () => jest.fn(),
                commit: jest.fn(),
              })
            }),
            // transaction: jest.fn().mockImplementation(() => ({
            //   send: () => jest.fn().mockResolvedValue({}),
            //   abort: () => jest.fn(),
            //   commit: () =>
            //     jest.fn().mockResolvedValue({
            //       message: '',
            //       transaction_id: '',
            //       payload: {},
            //     }),
            // })),
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
        {
          provide: getModelToken(Authority.name, 'primary'),
          useValue: mockAuthorityModel,
        },
        { provide: getModelToken(LogActivity.name, 'primary'), useValue: {} },
        { provide: getModelToken(LogLogin.name, 'primary'), useValue: {} },
      ],
    }).compile()

    configService = module.get<ConfigService>(ConfigService)

    // socketProxy = module.get<SocketIoClientProxyService>(
    //   SocketIoClientProxyService
    // )

    purchaseOrderService = module.get<GatewayInventoryPurchaseOrderService>(
      GatewayInventoryPurchaseOrderService
    )

    stockPointService = module.get<MasterStockPointService>(
      MasterStockPointService
    )

    gatewayInventoryGeneralReceiveNoteService =
      module.get<GatewayInventoryGeneralReceiveNoteService>(
        GatewayInventoryGeneralReceiveNoteService
      )

    masterItemModel = module.get<Model<MasterItemDocument>>(
      getModelToken(MasterItem.name, 'primary')
    )

    masterItemBatchModel = module.get<Model<MasterItemBatchDocument>>(
      getModelToken(MasterItemBatch.name, 'primary')
    )

    masterStockPointModel = module.get<Model<MasterStockPointDocument>>(
      getModelToken(MasterStockPoint.name, 'primary')
    )

    purchaseOrderModel = module.get<Model<PurchaseOrderDocument>>(
      getModelToken(PurchaseOrder.name, 'primary')
    )

    generalReceiveNoteModel = module.get<Model<GeneralReceiveNoteDocument>>(
      getModelToken(GeneralReceiveNote.name, 'primary')
    )

    cacheManager = module.get(CACHE_MANAGER)

    stockClient = module.get('STOCK_SERVICE')

    jest.clearAllMocks()
  })

  beforeEach(() => {
    jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')
    jest.spyOn(cacheManager, 'get')
    jest.restoreAllMocks()
    jest.clearAllMocks()
    jest.spyOn(masterStockPointModel, 'findOne').mockResolvedValue({
      ...mockMasterStockPoint(),
      configuration: {
        allow_grn: true,
        allow_incoming: true,
        allow_outgoing: true,
        allow_destruction: true,
      },
    })
  })

  it(
    testCaption('SERVICE STATE', 'component', 'Service should be defined'),
    () => {
      expect(gatewayInventoryGeneralReceiveNoteService).toBeDefined()
    }
  )

  describe(
    testCaption('GET DATA', 'data', 'General Receive Note - Fetch list'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Response validity', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(generalReceiveNoteModel, 'aggregate').mockReturnValue({
            exec: jest.fn().mockReturnValue(mockGeneralReceiveNoteDocArray),
          } as any)
          await gatewayInventoryGeneralReceiveNoteService
            .all(
              `{
              "first": 0,
              "rows": 10,
              "sortField": "created_at",
              "sortOrder": 1,
              "filters": {}
            }`
            )
            .then((result) => {
              // Should be an array of data
              expect(result.data).toBeInstanceOf(Array)

              // Data should be defined
              expect(result.data).toEqual(mockGeneralReceiveNoteDocArray)
            })
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Response error on fetch data', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(JSON, 'parse').mockImplementation(() => ({}))

          jest.spyOn(generalReceiveNoteModel, 'aggregate').mockImplementation({
            exec: jest.fn().mockRejectedValue(new Error()),
          } as any)

          await expect(
            gatewayInventoryGeneralReceiveNoteService.all('')
          ).rejects.toThrow(Error)
        }
      )
    }
  )

  describe(
    testCaption('GET DETAIL', 'data', 'General Receive Note - Fetch detail'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Response validity', {
          tab: 1,
        }),
        async () => {
          const findMock = mockGeneralReceiveNoteDocArray[0]
          generalReceiveNoteModel.findOne = jest
            .fn()
            .mockImplementationOnce(() => {
              return Promise.resolve(findMock)
            })

          await gatewayInventoryGeneralReceiveNoteService
            .detail(findMock.id)
            .then((result) => {
              // Deep equality check
              expect(result).toEqual(findMock)
            })
        }
      )

      it(
        testCaption(
          'HANDLING',
          'data',
          'Response error if detail data is not found',
          {
            tab: 1,
          }
        ),
        async () => {
          jest.spyOn(generalReceiveNoteModel, 'findOne').mockResolvedValue(null)
          await expect(async () => {
            await gatewayInventoryGeneralReceiveNoteService.detail(
              mockGeneralReceiveNote().id
            )
          }).rejects.toThrow(NotFoundException)
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Response error on get detail data', {
          tab: 1,
        }),
        async () => {
          jest
            .spyOn(generalReceiveNoteModel, 'findOne')
            .mockRejectedValue(new Error())
          await expect(async () => {
            await gatewayInventoryGeneralReceiveNoteService.detail(
              mockGeneralReceiveNote().id
            )
          }).rejects.toThrow(Error)
        }
      )
    }
  )

  describe(
    testCaption('ADD DATA', 'data', 'General Receive Note - Add new data'),
    () => {
      it(
        testCaption(
          'DATA',
          'data',
          'Should reject process if target stock point is error'
        ),
        async () => {
          jest.spyOn(stockPointService, 'find').mockRejectedValue(new Error())

          expect(async () => {
            await gatewayInventoryGeneralReceiveNoteService.add(
              {
                code: '',
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
                    brand: {
                      id: 'brand-xx1',
                      code: 'BRAND-001',
                      name: 'Brand 1',
                    },
                    expired: new Date(),
                    remark: '-',
                  },
                  {
                    item: mockMasterItem(),
                    qty: 10,
                    batch: 'AV3D112',
                    brand: {
                      id: 'brand-xx1',
                      code: 'BRAND-001',
                      name: 'Brand 1',
                    },
                    expired: new Date(),
                    remark: '-',
                  },
                ],
                extras: mockGeneralReceiveNote().extras,
                remark: mockGeneralReceiveNote().remark,
              },
              mockAccount(),
              ''
            )
          }).rejects.toThrow(Error)
        }
      )

      it(
        testCaption(
          'DATA',
          'data',
          'Should reject process if target stock point is not found'
        ),
        async () => {
          jest.spyOn(masterStockPointModel, 'findOne').mockResolvedValue(null)

          expect(async () => {
            await gatewayInventoryGeneralReceiveNoteService.add(
              {
                code: '',
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
                    brand: {
                      id: 'brand-xx1',
                      code: 'BRAND-001',
                      name: 'Brand 1',
                    },
                    expired: new Date(),
                    remark: '-',
                  },
                  {
                    item: mockMasterItem(),
                    qty: 10,
                    batch: 'AV3D112',
                    brand: {
                      id: 'brand-xx1',
                      code: 'BRAND-001',
                      name: 'Brand 1',
                    },
                    expired: new Date(),
                    remark: '-',
                  },
                ],
                extras: mockGeneralReceiveNote().extras,
                remark: mockGeneralReceiveNote().remark,
              },
              mockAccount(),
              ''
            )
          }).rejects.toThrow(NotFoundException)
        }
      )

      it(
        testCaption(
          'DATA',
          'data',
          'Should reject process if target stock point is not allowed to GRN'
        ),
        async () => {
          jest.spyOn(masterStockPointModel, 'findOne').mockResolvedValue({
            ...mockMasterStockPoint(),
            configuration: {
              allow_grn: false,
              allow_incoming: true,
              allow_outgoing: true,
              allow_destruction: true,
            },
          })

          expect(async () => {
            await gatewayInventoryGeneralReceiveNoteService.add(
              {
                code: '',
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
                    brand: {
                      id: 'brand-xx1',
                      code: 'BRAND-001',
                      name: 'Brand 1',
                    },
                    expired: new Date(),
                    remark: '-',
                  },
                  {
                    item: mockMasterItem(),
                    qty: 10,
                    batch: 'AV3D112',
                    brand: {
                      id: 'brand-xx1',
                      code: 'BRAND-001',
                      name: 'Brand 1',
                    },
                    expired: new Date(),
                    remark: '-',
                  },
                ],
                extras: mockGeneralReceiveNote().extras,
                remark: mockGeneralReceiveNote().remark,
              },
              mockAccount(),
              ''
            )
          }).rejects.toThrow(ForbiddenException)
        }
      )

      it(
        testCaption(
          'DATA',
          'data',
          'Should handle error on purchase error get detail'
        ),
        async () => {
          jest
            .spyOn(purchaseOrderService, 'detail')
            .mockRejectedValue(new Error())

          expect(async () => {
            await gatewayInventoryGeneralReceiveNoteService.add(
              {
                code: '',
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
                    brand: {
                      id: 'brand-xx1',
                      code: 'BRAND-001',
                      name: 'Brand 1',
                    },
                    expired: new Date(),
                    remark: '-',
                  },
                  {
                    item: mockMasterItem(),
                    qty: 10,
                    batch: 'AV3D112',
                    brand: {
                      id: 'brand-xx1',
                      code: 'BRAND-001',
                      name: 'Brand 1',
                    },
                    expired: new Date(),
                    remark: '-',
                  },
                ],
                extras: mockGeneralReceiveNote().extras,
                remark: mockGeneralReceiveNote().remark,
              },
              mockAccount(),
              ''
            )
          }).rejects.toThrow(Error)
        }
      )

      it(
        testCaption(
          'DATA',
          'data',
          'Should reject if inserted purchase order is not defined or approve'
        ),
        async () => {
          jest.spyOn(purchaseOrderModel, 'findOne').mockResolvedValue({
            ...mockPurchaseOrder(),
            status: 'new',
          })

          expect(async () => {
            await gatewayInventoryGeneralReceiveNoteService.add(
              {
                code: '',
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
                    brand: {
                      id: 'brand-xx1',
                      code: 'BRAND-001',
                      name: 'Brand 1',
                    },
                    expired: new Date(),
                    remark: '-',
                  },
                  {
                    item: mockMasterItem(),
                    qty: 10,
                    batch: 'AV3D112',
                    brand: {
                      id: 'brand-xx1',
                      code: 'BRAND-001',
                      name: 'Brand 1',
                    },
                    expired: new Date(),
                    remark: '-',
                  },
                ],
                extras: mockGeneralReceiveNote().extras,
                remark: mockGeneralReceiveNote().remark,
              },
              mockAccount(),
              ''
            )
          }).rejects.toThrow(ForbiddenException)
        }
      )

      it(
        testCaption(
          'DATA',
          'data',
          "Should skip item if it's not found on system"
        ),
        async () => {
          jest.spyOn(purchaseOrderModel, 'findOne').mockResolvedValue({
            ...mockPurchaseOrder(),
            status: 'approved',
          })

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

          await gatewayInventoryGeneralReceiveNoteService
            .add(
              {
                code: '',
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
                    item: {
                      id: 'xx1',
                      code: 'xx1',
                      name: 'Sample 1',
                    },
                    qty: 10,
                    batch: 'X01192D',
                    brand: {
                      id: 'brand-xx1',
                      code: 'BRAND-001',
                      name: 'Brand 1',
                    },
                    expired: new Date(),
                    remark: '-',
                  },
                  {
                    item: {
                      id: 'xx2',
                      code: 'xx2',
                      name: 'Sample 2',
                    },
                    qty: 10,
                    batch: 'AV3D112',
                    brand: {
                      id: 'brand-xx1',
                      code: 'BRAND-001',
                      name: 'Brand 1',
                    },
                    expired: new Date(),
                    remark: '-',
                  },
                  {
                    item: {
                      id: 'xx3',
                      code: 'xx3',
                      name: 'Sample 3',
                    },
                    qty: 10,
                    batch: 'AV3D113',
                    brand: {
                      id: 'brand-xx1',
                      code: 'BRAND-001',
                      name: 'Brand 1',
                    },
                    expired: new Date(),
                    remark: '-',
                  },
                ],
                extras: mockGeneralReceiveNote().extras,
                remark: mockGeneralReceiveNote().remark,
              },
              mockAccount(),
              ''
            )
            .then(async () => {
              expect(
                jest.spyOn(masterItemBatchModel, 'findOneAndUpdate')
              ).toHaveBeenCalledTimes(2)
            })
        }
      )

      it(
        testCaption(
          'DATA',
          'data',
          'Should calculate the sell price based on item configuration and buy prices is based on purchase order detail'
        ),
        async () => {
          const POItemList = [
            {
              item: {
                id: 'xx1',
                code: 'xx1',
                name: 'Sample 1',
                brand: null,
              },
              qty: 2,
              price: 10,
              delivered: 0,
              discount_type: 'n',
              discount_value: 0,
              total: 10,
              remark: '-',
            },
            {
              item: {
                id: 'xx2',
                code: 'xx2',
                name: 'Sample 2',
                brand: null,
              },
              qty: 2,
              price: 10,
              delivered: 0,
              discount_type: 'n',
              discount_value: 0,
              total: 20,
              remark: '-',
            },
            {
              item: {
                id: 'xx3',
                code: 'xx3',
                name: 'Sample 3',
                brand: null,
              },
              qty: 2,
              price: 10,
              delivered: 0,
              discount_type: 'n',
              discount_value: 0,
              total: 30,
              remark: '-',
            },
            {
              item: {
                id: 'xx4',
                code: 'xx4',
                name: 'Sample 4',
                brand: null,
              },
              qty: 2,
              price: 10,
              delivered: 0,
              discount_type: 'n',
              discount_value: 0,
              total: 40,
              remark: '-',
            },
          ]

          jest.spyOn(purchaseOrderModel, 'findOne').mockResolvedValue({
            ...mockPurchaseOrder(),
            detail: POItemList,
            status: 'approved',
          })

          const mockItemList = [
            {
              allow_sell: true,
              allow_destruction: true,
              allow_incoming: true,
              allow_outgoing: true,
              benefit_margin_type: 'n',
              benefit_margin_value: 0,
            },
            {
              allow_sell: true,
              allow_destruction: true,
              allow_incoming: true,
              allow_outgoing: true,
              benefit_margin_type: 'v',
              benefit_margin_value: 1,
            },
            {
              allow_sell: true,
              allow_destruction: true,
              allow_incoming: true,
              allow_outgoing: true,
              benefit_margin_type: 'p',
              benefit_margin_value: 1,
            },
          ]

          jest
            .spyOn(masterItemModel, 'findOne')
            .mockImplementation((filter) => {
              return {
                exec: () => {
                  if (filter.id === 'xx1') {
                    return Promise.resolve({
                      ...mockMasterItem(),
                      id: filter.id,
                      configuration: mockItemList[0],
                    })
                  } else if (filter.id === 'xx2') {
                    return Promise.resolve({
                      ...mockMasterItem(),
                      id: filter.id,
                      configuration: mockItemList[1],
                    })
                  } else if (filter.id === 'xx3') {
                    return Promise.resolve({
                      ...mockMasterItem(),
                      id: filter.id,
                      configuration: mockItemList[2],
                    })
                  } else {
                    return Promise.resolve(null)
                  }
                },
              } as any
            })

          const batchManager = jest.spyOn(
            masterItemBatchModel,
            'findOneAndUpdate'
          )

          const GRNItemList = [
            {
              item: {
                id: 'xx1',
                code: 'xx1',
                name: 'Sample 1',
                brand: null,
              },
              qty: 10,
              batch: 'X01192D',
              brand: {
                id: 'brand-xx1',
                code: 'BRAND-001',
                name: 'Brand 1',
              },
              expired: new Date(),
              remark: '-',
            },
            {
              item: {
                id: 'xx2',
                code: 'xx2',
                name: 'Sample 2',
                brand: null,
              },
              qty: 10,
              batch: 'AV3D112',
              brand: {
                id: 'brand-xx1',
                code: 'BRAND-001',
                name: 'Brand 1',
              },
              expired: new Date(),
              remark: '-',
            },
            {
              item: {
                id: 'xx3',
                code: 'xx3',
                name: 'Sample 3',
                brand: null,
              },
              qty: 10,
              batch: 'AV3D113',
              brand: {
                id: 'brand-xx1',
                code: 'BRAND-001',
                name: 'Brand 1',
              },
              expired: new Date(),
              remark: '-',
            },
          ]

          await gatewayInventoryGeneralReceiveNoteService
            .add(
              {
                code: '',
                stock_point: mockMasterStockPoint(),
                purchase_order: {
                  id: mockPurchaseOrder().id,
                  code: mockPurchaseOrder().code,
                  supplier: mockMasterItemSupplier().id,
                  purchase_date: new Date(),
                  remark: '-',
                },
                detail: GRNItemList,
                extras: mockGeneralReceiveNote().extras,
                remark: mockGeneralReceiveNote().remark,
              },
              mockAccount(),
              ''
            )
            .then(() => {
              expect(batchManager).toHaveBeenCalledTimes(3)

              GRNItemList.forEach(async (itemObject, itemIndex) => {
                const POItem = POItemList.find(
                  (d) => d.item.id === itemObject.item.id
                )

                const buyPrice = POItem ? POItem.total : 0

                let sellPrice = 0

                if (mockItemList[itemIndex].benefit_margin_type === 'v') {
                  sellPrice =
                    buyPrice + mockItemList[itemIndex].benefit_margin_value
                } else if (
                  mockItemList[itemIndex].benefit_margin_type === 'p'
                ) {
                  sellPrice =
                    buyPrice +
                    (buyPrice * mockItemList[itemIndex].benefit_margin_value) /
                      100
                } else {
                  sellPrice = buyPrice
                }

                expect(batchManager).toHaveBeenNthCalledWith(
                  itemIndex + 1,
                  expect.objectContaining({
                    code: itemObject.batch,
                  }),
                  expect.objectContaining({
                    $set: expect.objectContaining({
                      price_buy: buyPrice,
                      price_sell: sellPrice,
                    }),
                  }),
                  expect.objectContaining({
                    upsert: true,
                    new: true,
                  })
                )
              })
            })
        }
      )

      it(
        testCaption(
          'DATA',
          'data',
          'Should process transaction to kafka stock handler'
        ),
        async () => {
          jest.spyOn(purchaseOrderModel, 'findOne').mockResolvedValue({
            ...mockPurchaseOrder(),
            status: 'approved',
          })

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

          jest
            .spyOn(purchaseOrderService, 'updateDeliveredItem')
            .mockImplementation(() => {
              return Promise.resolve()
            })

          await gatewayInventoryGeneralReceiveNoteService
            .add(
              {
                code: '',
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
                    item: {
                      id: 'xx1',
                      code: 'xx1',
                      name: 'Sample 1',
                    },
                    qty: 10,
                    batch: 'X01192D',
                    brand: {
                      id: 'brand-xx1',
                      code: 'BRAND-001',
                      name: 'Brand 1',
                    },
                    expired: new Date(),
                    remark: '-',
                  },
                  {
                    item: {
                      id: 'xx2',
                      code: 'xx2',
                      name: 'Sample 2',
                    },
                    qty: 10,
                    batch: 'AV3D112',
                    brand: {
                      id: 'brand-xx1',
                      code: 'BRAND-001',
                      name: 'Brand 1',
                    },
                    expired: new Date(),
                    remark: '-',
                  },
                  {
                    item: {
                      id: 'xx3',
                      code: 'xx3',
                      name: 'Sample 3',
                    },
                    qty: 10,
                    batch: 'AV3D113',
                    brand: {
                      id: 'brand-xx1',
                      code: 'BRAND-001',
                      name: 'Brand 1',
                    },
                    expired: new Date(),
                    remark: '-',
                  },
                ],
                extras: mockGeneralReceiveNote().extras,
                remark: mockGeneralReceiveNote().remark,
              },
              mockAccount(),
              ''
            )
            .then(async () => {
              expect(jest.spyOn(stockClient, 'transaction')).toHaveBeenCalled()
              expect(
                jest.spyOn(generalReceiveNoteModel, 'create')
              ).toHaveBeenCalled()
              expect(
                jest.spyOn(purchaseOrderService, 'updateDeliveredItem')
              ).toHaveBeenCalled()
              // const sendSpy = jest.spyOn(transaction, 'send')
              // expect(sendSpy).toHaveBeenCalledTimes(1)
              // expect(send).toHaveBeenCalledWith(
              //   expect.objectContaining({
              //     messages: expect.arrayContaining([expect.anything()]),
              //   })
              // )
            })
        }
      )

      it(
        testCaption(
          'DATA',
          'data',
          'Should abort kafka transaction if create encountered error'
        ),
        async () => {
          jest.spyOn(purchaseOrderModel, 'findOne').mockResolvedValue({
            ...mockPurchaseOrder(),
            status: 'approved',
          })

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

          jest
            .spyOn(generalReceiveNoteModel, 'create')
            .mockRejectedValue(new Error())

          const transaction = await stockClient.transaction('grn')

          expect(async () => {
            await gatewayInventoryGeneralReceiveNoteService
              .add(
                {
                  code: '',
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
                      item: {
                        id: 'xx1',
                        code: 'xx1',
                        name: 'Sample 1',
                      },
                      qty: 10,
                      batch: 'X01192D',
                      brand: {
                        id: 'brand-xx1',
                        code: 'BRAND-001',
                        name: 'Brand 1',
                      },
                      expired: new Date(),
                      remark: '-',
                    },
                    {
                      item: {
                        id: 'xx2',
                        code: 'xx2',
                        name: 'Sample 2',
                      },
                      qty: 10,
                      batch: 'AV3D112',
                      brand: {
                        id: 'brand-xx1',
                        code: 'BRAND-001',
                        name: 'Brand 1',
                      },
                      expired: new Date(),
                      remark: '-',
                    },
                    {
                      item: {
                        id: 'xx3',
                        code: 'xx3',
                        name: 'Sample 3',
                      },
                      qty: 10,
                      batch: 'AV3D113',
                      brand: {
                        id: 'brand-xx1',
                        code: 'BRAND-001',
                        name: 'Brand 1',
                      },
                      expired: new Date(),
                      remark: '-',
                    },
                  ],
                  extras: mockGeneralReceiveNote().extras,
                  remark: mockGeneralReceiveNote().remark,
                },
                mockAccount(),
                ''
              )
              .then(() => {
                expect(jest.spyOn(transaction, 'abort')).toHaveBeenCalled()
              })
          }).rejects.toThrow(Error)
        }
      )

      //   it(testCaption('DATA', 'data', 'Should add new data'), async () => {
      //     jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')
      //     jest.spyOn(cacheManager, 'get').mockResolvedValueOnce({})
      //     jest.spyOn(generalReceiveNoteModel, 'create')
      //     await gatewayInventoryGeneralReceiveNoteService
      //       .add(
      //         {
      //           code: '',
      //           stock_point: mockMasterStockPoint(),
      //           purchase_order: {
      //   id: mockPurchaseOrder().id,
      //   code: mockPurchaseOrder().code,
      //   supplier: mockMasterItemSupplier().id,
      //   purchase_date: new Date(),
      //   remark: '-',
      // },
      //           detail: [
      //             {
      //               item: mockMasterItem(),
      //               qty: 10,
      //               batch: 'X01192D',
      //               expired: new Date(),
      //               remark: '-',
      //             },
      //             {
      //               item: mockMasterItem(),
      //               qty: 10,
      //               batch: 'AV3D112',
      //               expired: new Date(),
      //               remark: '-',
      //             },
      //           ],
      //           extras: mockGeneralReceiveNote().extras,
      //           remark: mockGeneralReceiveNote().remark,
      //         },
      //         mockAccount(),
      //         ''
      //       )
      //       .then((result) => {
      //         // Should create id
      //         expect(result).toHaveProperty('id')
      //       })
      //   })
    }
  )

  afterEach(async () => {
    jest.restoreAllMocks()
    jest.clearAllMocks()
  })

  afterAll(async () => {
    jest.clearAllMocks()
  })
})
