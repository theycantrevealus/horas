import { mockAccount } from '@gateway_core/account/mock/account.mock'
import { mockAuthorityModel } from '@gateway_core/account/mock/authority.mock'
import {
  mockMasterItemSupplier,
  mockMasterItemSupplierModel,
} from '@gateway_core/master/mock/master.item.supplier.mock'
import {
  mockPurchaseRequisition,
  mockPurchaseRequisitionModel,
} from '@gateway_inventory/purchase_requisition/mock/purchase.requisition.mock'
import { SocketIoClientProxyService } from '@gateway_socket/socket.proxy'
import { LogActivity } from '@log/schemas/log.activity'
import { LogLogin } from '@log/schemas/log.login'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { getConnectionToken, getModelToken } from '@nestjs/mongoose'
import { Test, TestingModule } from '@nestjs/testing'
import { Authority } from '@schemas/account/authority.model'
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
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { testCaption } from '@utility/string'
import { Cache } from 'cache-manager'
import { Model } from 'mongoose'

import {
  mockPurchaseOrder,
  mockPurchaseOrderDocArray,
  mockPurchaseOrderModel,
} from '../mock/purchase.order.mock'
import { GatewayInventoryPurchaseOrderService } from '../purchase.order.service'

describe('Gateway Inventory Audit Service', () => {
  let configService: ConfigService
  let cacheManager: Cache
  let gatewayInventoryPurchaseOrderService: GatewayInventoryPurchaseOrderService
  let masterItemSupplierModel: Model<MasterItemSupplier>
  let purchaseRequisitionModel: Model<PurchaseRequisition>
  let purchaseOrderModel: Model<PurchaseOrder>
  let socketProxy: SocketIoClientProxyService

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [],
      providers: [
        GatewayInventoryPurchaseOrderService,
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
        {
          provide: getModelToken(Authority.name, 'primary'),
          useValue: mockAuthorityModel,
        },
        { provide: getModelToken(LogActivity.name, 'primary'), useValue: {} },
        { provide: getModelToken(LogLogin.name, 'primary'), useValue: {} },
      ],
    }).compile()

    configService = module.get<ConfigService>(ConfigService)

    socketProxy = module.get<SocketIoClientProxyService>(
      SocketIoClientProxyService
    )

    gatewayInventoryPurchaseOrderService =
      module.get<GatewayInventoryPurchaseOrderService>(
        GatewayInventoryPurchaseOrderService
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

    cacheManager = module.get(CACHE_MANAGER)

    jest.clearAllMocks()
  })

  it(
    testCaption('SERVICE STATE', 'component', 'Service should be defined'),
    () => {
      expect(gatewayInventoryPurchaseOrderService).toBeDefined()
    }
  )

  describe(
    testCaption('GET DATA', 'data', 'Purchase Order - Fetch list'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Response validity', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(purchaseOrderModel, 'aggregate').mockReturnValue({
            exec: jest.fn().mockReturnValue(mockPurchaseOrderDocArray),
          } as any)
          await gatewayInventoryPurchaseOrderService
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
              expect(result.data).toEqual(mockPurchaseOrderDocArray)
            })
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Response error on fetch data', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(JSON, 'parse').mockImplementation(() => ({}))

          jest.spyOn(purchaseOrderModel, 'aggregate').mockImplementation({
            exec: jest.fn().mockRejectedValue(new Error()),
          } as any)

          await expect(
            gatewayInventoryPurchaseOrderService.all('')
          ).rejects.toThrow(Error)
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Fetch uncompleted delivery', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(purchaseOrderModel, 'aggregate').mockReturnValue({
            exec: jest.fn().mockReturnValue(mockPurchaseOrderDocArray),
          } as any)
          await gatewayInventoryPurchaseOrderService
            .uncompletedDelivery({
              first: 0,
              rows: 10,
              sortField: 'created_at',
              sortOrder: 1,
              filters: {},
            })
            .then((result) => {
              // Should be an array of data
              expect(result.data).toBeInstanceOf(Array)

              // Data should be defined
              expect(result.data).toEqual(mockPurchaseOrderDocArray)
            })
        }
      )

      it(
        testCaption(
          'HANDLING',
          'data',
          'Response error on fetch uncompleted delivery data',
          {
            tab: 1,
          }
        ),
        async () => {
          jest.spyOn(JSON, 'parse').mockImplementation(() => ({}))

          jest.spyOn(purchaseOrderModel, 'aggregate').mockImplementation({
            exec: jest.fn().mockRejectedValue(new Error()),
          } as any)

          await expect(
            gatewayInventoryPurchaseOrderService.uncompletedDelivery({})
          ).rejects.toThrow(Error)
        }
      )
    }
  )

  describe(
    testCaption('GET DETAIL', 'data', 'Purchase Order - Fetch detail'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Response validity', {
          tab: 1,
        }),
        async () => {
          const findMock = mockPurchaseOrderDocArray[0]
          purchaseOrderModel.findOne = jest.fn().mockImplementationOnce(() => {
            return Promise.resolve(findMock)
          })

          await gatewayInventoryPurchaseOrderService
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
          jest.spyOn(purchaseOrderModel, 'findOne').mockResolvedValue(null)
          await expect(async () => {
            await gatewayInventoryPurchaseOrderService.detail(
              mockPurchaseOrder().id
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
            .spyOn(purchaseOrderModel, 'findOne')
            .mockRejectedValue(new Error())
          await expect(async () => {
            await gatewayInventoryPurchaseOrderService.detail(
              mockPurchaseOrder().id
            )
          }).rejects.toThrow(Error)
        }
      )
    }
  )

  describe(
    testCaption('ADD DATA', 'data', 'Purchase Order - Add new data'),
    () => {
      it(
        testCaption(
          'DATA',
          'data',
          'Should throw exception if supplier is not found'
        ),
        async () => {
          jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')
          jest.spyOn(cacheManager, 'get').mockResolvedValueOnce({})
          jest.spyOn(masterItemSupplierModel, 'findOne').mockResolvedValue(null)

          expect(async () => {
            await gatewayInventoryPurchaseOrderService.add(
              {
                supplier: '',
                purchase_date: new Date(),
                purchase_requisition: '',
                detail: mockPurchaseOrder().detail,
                discount_type: mockPurchaseOrder().discount_type,
                discount_value: mockPurchaseOrder().discount_value,
                extras: mockPurchaseOrder().extras,
                remark: mockPurchaseOrder().remark,
              },
              mockAccount()
            )
          }).rejects.toThrow(NotFoundException)
        }
      )

      it(
        testCaption(
          'DATA',
          'data',
          'Should throw exception if purchase requisition is not found'
        ),
        async () => {
          jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')
          jest.spyOn(cacheManager, 'get').mockResolvedValueOnce({})
          jest
            .spyOn(masterItemSupplierModel, 'findOne')
            .mockResolvedValue(mockMasterItemSupplier())
          jest
            .spyOn(purchaseRequisitionModel, 'findOne')
            .mockResolvedValue(null)

          expect(async () => {
            await gatewayInventoryPurchaseOrderService.add(
              {
                supplier: '',
                purchase_date: new Date(),
                purchase_requisition: '',
                detail: mockPurchaseOrder().detail,
                discount_type: mockPurchaseOrder().discount_type,
                discount_value: mockPurchaseOrder().discount_value,
                extras: mockPurchaseOrder().extras,
                remark: mockPurchaseOrder().remark,
              },
              mockAccount()
            )
          }).rejects.toThrow(NotFoundException)
        }
      )

      it(
        testCaption(
          'DATA',
          'data',
          'Should add new data - Normal discount on PO detail'
        ),
        async () => {
          jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')
          jest.spyOn(cacheManager, 'get').mockResolvedValueOnce({})
          jest
            .spyOn(masterItemSupplierModel, 'findOne')
            .mockResolvedValue(mockMasterItemSupplier())
          jest
            .spyOn(purchaseRequisitionModel, 'findOne')
            .mockResolvedValue(mockPurchaseRequisition())

          const dataCreate = jest.spyOn(purchaseOrderModel, 'create')

          const detailPO = [
            {
              item: {
                id: 'item-xxx',
                code: 'ITM01',
                name: 'Item 1',
                brand: null,
              },
              qty: 2,
              price: 10,
              discount_type: 'n',
              discount_value: 0,
              remark: '-',
            },
          ]

          await gatewayInventoryPurchaseOrderService
            .add(
              {
                supplier: '',
                purchase_date: new Date(),
                purchase_requisition: '',
                detail: detailPO,
                discount_type: mockPurchaseOrder().discount_type,
                discount_value: mockPurchaseOrder().discount_value,
                extras: mockPurchaseOrder().extras,
                remark: mockPurchaseOrder().remark,
              },
              mockAccount()
            )
            .then((result) => {
              // Should create id
              expect(result).toHaveProperty('id')

              expect(dataCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                  detail: expect.arrayContaining([
                    expect.objectContaining({
                      total: detailPO[0].qty * detailPO[0].price,
                    }),
                  ]),
                })
              )
            })
        }
      )

      it(
        testCaption(
          'DATA',
          'data',
          'Should add new data - Percentage discount on PO detail'
        ),
        async () => {
          jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')
          jest.spyOn(cacheManager, 'get').mockResolvedValueOnce({})
          jest
            .spyOn(masterItemSupplierModel, 'findOne')
            .mockResolvedValue(mockMasterItemSupplier())
          jest
            .spyOn(purchaseRequisitionModel, 'findOne')
            .mockResolvedValue(mockPurchaseRequisition())

          const dataCreate = jest.spyOn(purchaseOrderModel, 'create')

          const detailPO = [
            {
              item: {
                id: 'item-xxx',
                code: 'ITM01',
                name: 'Item 1',
                brand: null,
              },
              qty: 2,
              price: 10,
              discount_type: 'p',
              discount_value: 2,
              remark: '-',
            },
          ]

          await gatewayInventoryPurchaseOrderService
            .add(
              {
                supplier: '',
                purchase_date: new Date(),
                purchase_requisition: '',
                detail: detailPO,
                discount_type: mockPurchaseOrder().discount_type,
                discount_value: mockPurchaseOrder().discount_value,
                extras: mockPurchaseOrder().extras,
                remark: mockPurchaseOrder().remark,
              },
              mockAccount()
            )
            .then((result) => {
              // Should create id
              expect(result).toHaveProperty('id')

              expect(dataCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                  detail: expect.arrayContaining([
                    expect.objectContaining({
                      total:
                        detailPO[0].qty * detailPO[0].price -
                        (detailPO[0].qty *
                          detailPO[0].price *
                          detailPO[0].discount_value) /
                          100,
                    }),
                  ]),
                })
              )
            })
        }
      )

      it(
        testCaption(
          'DATA',
          'data',
          'Should add new data - Value discount on PO detail'
        ),
        async () => {
          jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')
          jest.spyOn(cacheManager, 'get').mockResolvedValueOnce({})
          jest
            .spyOn(masterItemSupplierModel, 'findOne')
            .mockResolvedValue(mockMasterItemSupplier())
          jest
            .spyOn(purchaseRequisitionModel, 'findOne')
            .mockResolvedValue(mockPurchaseRequisition())

          const dataCreate = jest.spyOn(purchaseOrderModel, 'create')

          const detailPO = [
            {
              item: {
                id: 'item-xxx',
                code: 'ITM01',
                name: 'Item 1',
                brand: null,
              },
              qty: 2,
              price: 10,
              discount_type: 'v',
              discount_value: 2,
              remark: '-',
            },
          ]

          await gatewayInventoryPurchaseOrderService
            .add(
              {
                supplier: '',
                purchase_date: new Date(),
                purchase_requisition: '',
                detail: detailPO,
                discount_type: mockPurchaseOrder().discount_type,
                discount_value: mockPurchaseOrder().discount_value,
                extras: mockPurchaseOrder().extras,
                remark: mockPurchaseOrder().remark,
              },
              mockAccount()
            )
            .then((result) => {
              // Should create id
              expect(result).toHaveProperty('id')

              expect(dataCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                  detail: expect.arrayContaining([
                    expect.objectContaining({
                      total:
                        detailPO[0].qty * detailPO[0].price -
                        detailPO[0].discount_value,
                    }),
                  ]),
                })
              )
            })
        }
      )

      it(
        testCaption(
          'DATA',
          'data',
          'Should add new data - Percentage discount on PO'
        ),
        async () => {
          jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')
          jest.spyOn(cacheManager, 'get').mockResolvedValueOnce({})
          jest
            .spyOn(masterItemSupplierModel, 'findOne')
            .mockResolvedValue(mockMasterItemSupplier())
          jest
            .spyOn(purchaseRequisitionModel, 'findOne')
            .mockResolvedValue(mockPurchaseRequisition())

          const dataCreate = jest.spyOn(purchaseOrderModel, 'create')

          const detailPO = [
            {
              item: {
                id: 'item-xxx',
                code: 'ITM01',
                name: 'Item 1',
                brand: null,
              },
              qty: 2,
              price: 10,
              discount_type: 'n',
              discount_value: 0,
              remark: '-',
            },
          ]

          await gatewayInventoryPurchaseOrderService
            .add(
              {
                supplier: '',
                purchase_date: new Date(),
                purchase_requisition: '',
                detail: detailPO,
                discount_type: 'p',
                discount_value: 2,
                extras: mockPurchaseOrder().extras,
                remark: mockPurchaseOrder().remark,
              },
              mockAccount()
            )
            .then((result) => {
              // Should create id
              expect(result).toHaveProperty('id')

              expect(dataCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                  grand_total:
                    detailPO[0].qty * detailPO[0].price -
                    (detailPO[0].qty * detailPO[0].price * 2) / 100,
                })
              )
            })
        }
      )

      it(
        testCaption(
          'DATA',
          'data',
          'Should add new data - Value discount on PO'
        ),
        async () => {
          jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')
          jest.spyOn(cacheManager, 'get').mockResolvedValueOnce({})
          jest
            .spyOn(masterItemSupplierModel, 'findOne')
            .mockResolvedValue(mockMasterItemSupplier())
          jest
            .spyOn(purchaseRequisitionModel, 'findOne')
            .mockResolvedValue(mockPurchaseRequisition())

          const dataCreate = jest.spyOn(purchaseOrderModel, 'create')

          const detailPO = [
            {
              item: {
                id: 'item-xxx',
                code: 'ITM01',
                name: 'Item 1',
                brand: null,
              },
              qty: 2,
              price: 10,
              discount_type: 'n',
              discount_value: 0,
              remark: '-',
            },
          ]

          await gatewayInventoryPurchaseOrderService
            .add(
              {
                supplier: '',
                purchase_date: new Date(),
                purchase_requisition: '',
                detail: detailPO,
                discount_type: 'v',
                discount_value: 2,
                extras: mockPurchaseOrder().extras,
                remark: mockPurchaseOrder().remark,
              },
              mockAccount()
            )
            .then((result) => {
              // Should create id
              expect(result).toHaveProperty('id')

              expect(dataCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                  grand_total: detailPO[0].qty * detailPO[0].price - 2,
                })
              )
            })
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Response error on add data', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')
          jest.spyOn(cacheManager, 'get').mockResolvedValueOnce({})
          jest
            .spyOn(purchaseOrderModel, 'create')
            .mockRejectedValue(new Error())
          await expect(async () => {
            await gatewayInventoryPurchaseOrderService.add(
              {
                supplier: '',
                purchase_date: new Date(),
                purchase_requisition: '',
                detail: mockPurchaseOrder().detail,
                discount_type: mockPurchaseOrder().discount_type,
                discount_value: mockPurchaseOrder().discount_value,
                extras: mockPurchaseOrder().extras,
                remark: mockPurchaseOrder().remark,
              },
              mockAccount()
            )
          }).rejects.toThrow(Error)
        }
      )
    }
  )

  describe(
    testCaption('EDIT DATA', 'data', 'Purchase Order - Edit data'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should edit data', { tab: 1 }),
        async () => {
          jest.spyOn(purchaseOrderModel, 'findOneAndUpdate')

          await gatewayInventoryPurchaseOrderService
            .edit(
              {
                supplier: '',
                purchase_date: new Date(),
                purchase_requisition: '',
                detail: mockPurchaseOrder().detail,
                discount_type: mockPurchaseOrder().discount_type,
                discount_value: mockPurchaseOrder().discount_value,
                extras: mockPurchaseOrder().extras,
                remark: mockPurchaseOrder().remark,
                __v: 0,
              },
              mockPurchaseOrder().id,
              mockAccount()
            )
            .then((result) => {
              // Should create id
              expect(result).toHaveProperty('id')
            })
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Response error if data is not found', {
          tab: 1,
        }),
        async () => {
          jest
            .spyOn(purchaseOrderModel, 'findOneAndUpdate')
            .mockResolvedValue(null)

          await expect(async () => {
            await gatewayInventoryPurchaseOrderService.edit(
              {
                supplier: '',
                purchase_date: new Date(),
                purchase_requisition: '',
                detail: mockPurchaseOrder().detail,
                discount_type: mockPurchaseOrder().discount_type,
                discount_value: mockPurchaseOrder().discount_value,
                extras: mockPurchaseOrder().extras,
                remark: mockPurchaseOrder().remark,
                __v: 0,
              },
              mockPurchaseOrder().id,
              mockAccount()
            )
          }).rejects.toThrow(NotFoundException)
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Response error on edit data', {
          tab: 1,
        }),
        async () => {
          jest
            .spyOn(purchaseOrderModel, 'findOneAndUpdate')
            .mockImplementationOnce(() => {
              throw new Error()
            })

          await expect(async () => {
            await gatewayInventoryPurchaseOrderService.edit(
              {
                supplier: '',
                purchase_date: new Date(),
                purchase_requisition: '',
                detail: mockPurchaseOrder().detail,
                discount_type: mockPurchaseOrder().discount_type,
                discount_value: mockPurchaseOrder().discount_value,
                extras: mockPurchaseOrder().extras,
                remark: mockPurchaseOrder().remark,
                __v: 0,
              },
              mockPurchaseOrder().id,
              mockAccount()
            )
          }).rejects.toThrow(Error)
        }
      )
    }
  )

  describe(
    testCaption('DELETE DATA', 'data', 'Purchase Order - Delete data'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Response error if data is not found', {
          tab: 1,
        }),
        async () => {
          const targetID = mockPurchaseOrder().id
          jest
            .spyOn(purchaseOrderModel, 'findOneAndUpdate')
            .mockResolvedValue(null)

          await expect(async () => {
            await gatewayInventoryPurchaseOrderService.delete(
              targetID,
              mockAccount()
            )
          }).rejects.toThrow(NotFoundException)
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Response error on delete data', {
          tab: 1,
        }),
        async () => {
          const targetID = mockPurchaseOrder().id
          jest
            .spyOn(purchaseOrderModel, 'findOneAndUpdate')
            .mockRejectedValue(new Error())

          await expect(async () => {
            await gatewayInventoryPurchaseOrderService.delete(
              targetID,
              mockAccount()
            )
          }).rejects.toThrow(Error)
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Should success delete data', {
          tab: 1,
        }),
        async () => {
          jest
            .spyOn(purchaseOrderModel, 'findOneAndUpdate')
            .mockResolvedValue(mockPurchaseOrderDocArray[0])

          await gatewayInventoryPurchaseOrderService
            .delete(mockPurchaseOrderDocArray[0].id, mockAccount())
            .then((result) => {
              expect(result).toHaveProperty('code')
            })
        }
      )
    }
  )

  describe(
    testCaption('APPROVAL DATA', 'data', 'Purchase Order - Ask Approval'),
    () => {
      it(
        testCaption(
          'HANDLING',
          'data',
          'Should allowed to propose user created request',
          {
            tab: 1,
          }
        ),
        async () => {
          const targetID = mockPurchaseOrder().id
          jest
            .spyOn(purchaseOrderModel, 'findOneAndUpdate')
            .mockResolvedValue(null)

          await expect(async () => {
            await gatewayInventoryPurchaseOrderService.askApproval(
              {
                remark: '',
                __v: 0,
              },
              targetID,
              mockAccount()
            )
          }).rejects.toThrow(NotFoundException)
        }
      )

      it(
        testCaption(
          'HANDLING',
          'data',
          'Should handle error if proposal encounter error',
          {
            tab: 1,
          }
        ),
        async () => {
          const targetID = mockPurchaseOrder().id
          jest
            .spyOn(purchaseOrderModel, 'findOneAndUpdate')
            .mockImplementationOnce(() => {
              throw new Error()
            })

          await expect(async () => {
            await gatewayInventoryPurchaseOrderService.askApproval(
              {
                remark: '',
                __v: 0,
              },
              targetID,
              mockAccount()
            )
          }).rejects.toThrow(Error)
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Should success propose approval', {
          tab: 1,
        }),
        async () => {
          const targetID = mockPurchaseOrder().id
          jest
            .spyOn(purchaseOrderModel, 'findOneAndUpdate')
            .mockResolvedValue(mockPurchaseOrderDocArray[0])

          await gatewayInventoryPurchaseOrderService
            .askApproval(
              {
                remark: '',
                __v: 0,
              },
              targetID,
              mockAccount()
            )
            .then((result) => {
              expect(result).toHaveProperty('code')
            })
        }
      )
    }
  )

  describe(
    testCaption('APPROVAL DATA', 'data', 'Purchase Order - Approval'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should handle if data is not found', {
          tab: 1,
        }),
        async () => {
          const targetID = mockPurchaseOrder().id
          jest
            .spyOn(purchaseOrderModel, 'findOneAndUpdate')
            .mockResolvedValue(null)

          await expect(async () => {
            await gatewayInventoryPurchaseOrderService.approve(
              {
                remark: '',
                __v: 0,
              },
              targetID,
              mockAccount()
            )
          }).rejects.toThrow(NotFoundException)
        }
      )

      it(
        testCaption(
          'HANDLING',
          'data',
          'Should handle error if approval encounter error',
          {
            tab: 1,
          }
        ),
        async () => {
          const targetID = mockPurchaseOrder().id
          jest
            .spyOn(purchaseOrderModel, 'findOneAndUpdate')
            .mockImplementationOnce(() => {
              throw new Error()
            })

          await expect(async () => {
            await gatewayInventoryPurchaseOrderService.approve(
              {
                remark: '',
                __v: 0,
              },
              targetID,
              mockAccount()
            )
          }).rejects.toThrow(Error)
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Should success approve', {
          tab: 1,
        }),
        async () => {
          const targetID = mockPurchaseOrder().id
          jest
            .spyOn(purchaseOrderModel, 'findOneAndUpdate')
            .mockResolvedValue(mockPurchaseOrderDocArray[0])

          await gatewayInventoryPurchaseOrderService
            .approve(
              {
                remark: '',
                __v: 0,
              },
              targetID,
              mockAccount()
            )
            .then((result) => {
              expect(result).toHaveProperty('code')
            })
        }
      )
    }
  )

  describe(
    testCaption('APPROVAL DATA', 'data', 'Purchase Order - Decline'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should handle if data is not found', {
          tab: 1,
        }),
        async () => {
          const targetID = mockPurchaseOrder().id
          jest
            .spyOn(purchaseOrderModel, 'findOneAndUpdate')
            .mockResolvedValue(null)

          await expect(async () => {
            await gatewayInventoryPurchaseOrderService.decline(
              {
                remark: '',
                __v: 0,
              },
              targetID,
              mockAccount()
            )
          }).rejects.toThrow(NotFoundException)
        }
      )

      it(
        testCaption(
          'HANDLING',
          'data',
          'Should handle error if approval encounter error',
          {
            tab: 1,
          }
        ),
        async () => {
          const targetID = mockPurchaseOrder().id
          jest
            .spyOn(purchaseOrderModel, 'findOneAndUpdate')
            .mockImplementationOnce(() => {
              throw new Error()
            })

          await expect(async () => {
            await gatewayInventoryPurchaseOrderService.decline(
              {
                remark: '',
                __v: 0,
              },
              targetID,
              mockAccount()
            )
          }).rejects.toThrow(Error)
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Should success decline', {
          tab: 1,
        }),
        async () => {
          const targetID = mockPurchaseOrder().id
          jest
            .spyOn(purchaseOrderModel, 'findOneAndUpdate')
            .mockResolvedValue(mockPurchaseOrderDocArray[0])

          await gatewayInventoryPurchaseOrderService
            .decline(
              {
                remark: '',
                __v: 0,
              },
              targetID,
              mockAccount()
            )
            .then((result) => {
              expect(result).toHaveProperty('code')
            })
        }
      )
    }
  )

  describe(
    testCaption('NOTIFIER', 'data', 'Purchase Order - Notification'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should send notification', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(socketProxy, 'reconnect').mockResolvedValue({
            emit: jest.fn(),
          })

          await gatewayInventoryPurchaseOrderService
            .notifier(
              {
                remark: '',
                __v: 0,
              },
              mockAccount(),
              'token'
            )
            .then(() => {
              expect(socketProxy.reconnect).toHaveBeenCalled()
              expect(socketProxy.reconnect).toHaveBeenCalledWith({
                extraHeaders: {
                  Authorization: `token`,
                },
              })
            })
        }
      )

      it(
        testCaption(
          'HANDLING',
          'data',
          'Should handle error if occur while send notification',
          {
            tab: 1,
          }
        ),
        async () => {
          jest.spyOn(socketProxy, 'reconnect').mockResolvedValue({
            emit: jest.fn().mockImplementationOnce(() => {
              throw new Error()
            }),
          })

          await expect(async () => {
            await gatewayInventoryPurchaseOrderService.notifier(
              {
                remark: '',
                __v: 0,
              },
              mockAccount(),
              'token'
            )
          }).rejects.toThrow(Error)
        }
      )
    }
  )

  afterEach(async () => {
    jest.clearAllMocks()
  })

  afterAll(async () => {
    jest.clearAllMocks()
  })
})
