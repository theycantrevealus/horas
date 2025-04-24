import { mockAccount } from '@gateway_core/account/mock/account.mock'
import { mockAuthorityModel } from '@gateway_core/account/mock/authority.mock'
import { SocketIoClientProxyService } from '@gateway_socket/socket.proxy'
import { LogActivity } from '@log/schemas/log.activity'
import { LogLogin } from '@log/schemas/log.login'
import { getQueueToken } from '@nestjs/bullmq'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { getConnectionToken, getModelToken } from '@nestjs/mongoose'
import { Test, TestingModule } from '@nestjs/testing'
import { Authority } from '@schemas/account/authority.model'
import {
  StockAdjustment,
  StockAdjustmentDocument,
} from '@schemas/inventory/adjustment'
import { AuthService } from '@security/auth.service'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { testCaption } from '@utility/string'
import { Queue } from 'bullmq'
import { Cache } from 'cache-manager'
import { Model } from 'mongoose'

import { GatewayInventoryStockAdjustmentService } from '../gateway.inventory.adjustment.service'
import {
  mockStockAdjustment,
  mockStockAdjustmentDocArray,
  mockStockAdjustmentModel,
} from '../mock/stock.adjustment.mock'

describe('Gateway Inventory Ajustment Service', () => {
  let configService: ConfigService
  let cacheManager: Cache
  let gatewayInventoryAdjustmentService: GatewayInventoryStockAdjustmentService
  let stockAdjustmentModel: Model<StockAdjustment>
  let socketProxy: SocketIoClientProxyService
  let queueStock: Queue

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [],
      providers: [
        GatewayInventoryStockAdjustmentService,
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
          provide: getQueueToken('stock'),
          useValue: {
            add: () => jest.fn().mockResolvedValue({ id: 'queue-1' }),
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
          provide: getModelToken(StockAdjustment.name, 'primary'),
          useValue: mockStockAdjustmentModel,
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

    gatewayInventoryAdjustmentService =
      module.get<GatewayInventoryStockAdjustmentService>(
        GatewayInventoryStockAdjustmentService
      )
    stockAdjustmentModel = module.get<Model<StockAdjustmentDocument>>(
      getModelToken(StockAdjustment.name, 'primary')
    )

    socketProxy = module.get<SocketIoClientProxyService>(
      SocketIoClientProxyService
    )

    cacheManager = module.get(CACHE_MANAGER)

    queueStock = module.get(getQueueToken('stock'))

    jest.clearAllMocks()
  })

  it(
    testCaption('SERVICE STATE', 'component', 'Service should be defined'),
    () => {
      expect(gatewayInventoryAdjustmentService).toBeDefined()
    }
  )

  describe(testCaption('GET DATA', 'data', 'Stock Audit - Fetch list'), () => {
    it(
      testCaption('HANDLING', 'data', 'Response validity', {
        tab: 1,
      }),
      async () => {
        jest.spyOn(stockAdjustmentModel, 'aggregate').mockReturnValue({
          exec: jest.fn().mockReturnValue(mockStockAdjustmentDocArray),
        } as any)
        await gatewayInventoryAdjustmentService
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
            expect(result.data).toEqual(mockStockAdjustmentDocArray)
          })
      }
    )

    it(
      testCaption('HANDLING', 'data', 'Response error on fetch data', {
        tab: 1,
      }),
      async () => {
        jest.spyOn(JSON, 'parse').mockImplementation(() => ({}))

        jest.spyOn(stockAdjustmentModel, 'aggregate').mockImplementation({
          exec: jest.fn().mockRejectedValue(new Error()),
        } as any)

        await expect(gatewayInventoryAdjustmentService.all('')).rejects.toThrow(
          Error
        )
      }
    )
  })

  describe(
    testCaption('GET DETAIL', 'data', 'Stock Audit - Fetch detail'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Response validity', {
          tab: 1,
        }),
        async () => {
          const findMock = mockStockAdjustmentDocArray[0]
          stockAdjustmentModel.findOne = jest
            .fn()
            .mockImplementationOnce(() => {
              return Promise.resolve(findMock)
            })

          await gatewayInventoryAdjustmentService
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
          jest.spyOn(stockAdjustmentModel, 'findOne').mockResolvedValue(null)
          await expect(async () => {
            await gatewayInventoryAdjustmentService.detail(
              mockStockAdjustment().id
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
            .spyOn(stockAdjustmentModel, 'findOne')
            .mockRejectedValue(new Error())
          await expect(async () => {
            await gatewayInventoryAdjustmentService.detail(
              mockStockAdjustment().id
            )
          }).rejects.toThrow(Error)
        }
      )
    }
  )

  describe(
    testCaption('ADD DATA', 'data', 'Stock Audit - Add new data'),
    () => {
      it(testCaption('DATA', 'data', 'Should add new data'), async () => {
        jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')
        jest.spyOn(cacheManager, 'get').mockResolvedValueOnce({})
        jest.spyOn(stockAdjustmentModel, 'create')
        await gatewayInventoryAdjustmentService
          .add(
            {
              code: mockStockAdjustment().code,
              stock_point: mockStockAdjustment().stock_point,
              detail: mockStockAdjustment().detail,
              extras: mockStockAdjustment().extras,
              remark: mockStockAdjustment().remark,
            },
            mockAccount()
          )
          .then((result) => {
            // Should create id
            expect(result).toHaveProperty('id')
          })
      })

      it(
        testCaption('HANDLING', 'data', 'Response error on add data', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')
          jest.spyOn(cacheManager, 'get').mockResolvedValueOnce({})
          jest
            .spyOn(stockAdjustmentModel, 'create')
            .mockRejectedValue(new Error())
          await expect(async () => {
            await gatewayInventoryAdjustmentService.add(
              {
                code: mockStockAdjustment().code,
                stock_point: mockStockAdjustment().stock_point,
                detail: mockStockAdjustment().detail,
                extras: mockStockAdjustment().extras,
                remark: mockStockAdjustment().remark,
              },
              mockAccount()
            )
          }).rejects.toThrow(Error)
        }
      )
    }
  )

  describe(testCaption('EDIT DATA', 'data', 'Stock Audit - Edit data'), () => {
    it(
      testCaption('HANDLING', 'data', 'Should edit data', { tab: 1 }),
      async () => {
        jest.spyOn(stockAdjustmentModel, 'findOneAndUpdate')

        await gatewayInventoryAdjustmentService
          .edit(
            {
              code: mockStockAdjustment().code,
              stock_point: mockStockAdjustment().stock_point,
              detail: mockStockAdjustment().detail,
              extras: mockStockAdjustment().extras,
              remark: mockStockAdjustment().remark,
              __v: 0,
            },
            mockStockAdjustment().id,
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
          .spyOn(stockAdjustmentModel, 'findOneAndUpdate')
          .mockResolvedValue(null)

        await expect(async () => {
          await gatewayInventoryAdjustmentService.edit(
            {
              code: mockStockAdjustment().code,
              stock_point: mockStockAdjustment().stock_point,
              detail: mockStockAdjustment().detail,
              extras: mockStockAdjustment().extras,
              remark: mockStockAdjustment().remark,
              __v: 0,
            },
            mockStockAdjustment().id,
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
          .spyOn(stockAdjustmentModel, 'findOneAndUpdate')
          .mockImplementationOnce(() => {
            throw new Error()
          })

        await expect(async () => {
          await gatewayInventoryAdjustmentService.edit(
            {
              code: mockStockAdjustment().code,
              stock_point: mockStockAdjustment().stock_point,
              detail: mockStockAdjustment().detail,
              extras: mockStockAdjustment().extras,
              remark: mockStockAdjustment().remark,
              __v: 0,
            },
            mockStockAdjustment().id,
            mockAccount()
          )
        }).rejects.toThrow(Error)
      }
    )
  })

  describe(
    testCaption('DELETE DATA', 'data', 'Stock Audit - Delete data'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Response error if data is not found', {
          tab: 1,
        }),
        async () => {
          const targetID = mockStockAdjustment().id
          jest
            .spyOn(stockAdjustmentModel, 'findOneAndUpdate')
            .mockResolvedValue(null)

          await expect(async () => {
            await gatewayInventoryAdjustmentService.delete(
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
          const targetID = mockStockAdjustment().id
          jest
            .spyOn(stockAdjustmentModel, 'findOneAndUpdate')
            .mockRejectedValue(new Error())

          await expect(async () => {
            await gatewayInventoryAdjustmentService.delete(
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
            .spyOn(stockAdjustmentModel, 'findOneAndUpdate')
            .mockResolvedValue(mockStockAdjustmentDocArray[0])

          await gatewayInventoryAdjustmentService
            .delete(mockStockAdjustmentDocArray[0].id, mockAccount())
            .then((result) => {
              expect(result).toHaveProperty('code')
            })
        }
      )
    }
  )

  describe(
    testCaption('APPROVAL DATA', 'data', 'Stock Audit - Ask Approval'),
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
          const targetID = mockStockAdjustment().id
          jest
            .spyOn(stockAdjustmentModel, 'findOneAndUpdate')
            .mockResolvedValue(null)

          await expect(async () => {
            await gatewayInventoryAdjustmentService.askApproval(
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
          const targetID = mockStockAdjustment().id
          jest
            .spyOn(stockAdjustmentModel, 'findOneAndUpdate')
            .mockImplementationOnce(() => {
              throw new Error()
            })

          await expect(async () => {
            await gatewayInventoryAdjustmentService.askApproval(
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
          const targetID = mockStockAdjustment().id
          jest
            .spyOn(stockAdjustmentModel, 'findOneAndUpdate')
            .mockResolvedValue(mockStockAdjustmentDocArray[0])

          await gatewayInventoryAdjustmentService
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
    testCaption('APPROVAL DATA', 'data', 'Stock Audit - Approval'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should handle if data is not found', {
          tab: 1,
        }),
        async () => {
          const targetID = mockStockAdjustment().id
          jest
            .spyOn(stockAdjustmentModel, 'findOneAndUpdate')
            .mockResolvedValue(null)

          await expect(async () => {
            await gatewayInventoryAdjustmentService.approve(
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
          const targetID = mockStockAdjustment().id
          jest
            .spyOn(stockAdjustmentModel, 'findOneAndUpdate')
            .mockImplementationOnce(() => {
              throw new Error()
            })

          await expect(async () => {
            await gatewayInventoryAdjustmentService.approve(
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
          const targetID = mockStockAdjustment().id
          jest
            .spyOn(stockAdjustmentModel, 'findOneAndUpdate')
            .mockResolvedValue(mockStockAdjustmentDocArray[0])

          await gatewayInventoryAdjustmentService
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
    testCaption('APPROVAL DATA', 'data', 'Stock Audit - Decline'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should handle if data is not found', {
          tab: 1,
        }),
        async () => {
          const targetID = mockStockAdjustment().id
          jest
            .spyOn(stockAdjustmentModel, 'findOneAndUpdate')
            .mockResolvedValue(null)

          await expect(async () => {
            await gatewayInventoryAdjustmentService.decline(
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
          const targetID = mockStockAdjustment().id
          jest
            .spyOn(stockAdjustmentModel, 'findOneAndUpdate')
            .mockImplementationOnce(() => {
              throw new Error()
            })

          await expect(async () => {
            await gatewayInventoryAdjustmentService.decline(
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
          const targetID = mockStockAdjustment().id
          jest
            .spyOn(stockAdjustmentModel, 'findOneAndUpdate')
            .mockResolvedValue(mockStockAdjustmentDocArray[0])

          await gatewayInventoryAdjustmentService
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
    testCaption('APPROVAL DATA', 'data', 'Stock Audit - Processing'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should handle if data is not found', {
          tab: 1,
        }),
        async () => {
          const targetID = mockStockAdjustment().id
          jest
            .spyOn(stockAdjustmentModel, 'findOneAndUpdate')
            .mockResolvedValue(null)

          await expect(async () => {
            await gatewayInventoryAdjustmentService.process(
              {
                remark: '',
                __v: 0,
              },
              targetID,
              mockAccount(),
              ''
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
          const targetID = mockStockAdjustment().id
          jest
            .spyOn(stockAdjustmentModel, 'findOneAndUpdate')
            .mockImplementationOnce(() => {
              throw new Error()
            })

          await expect(async () => {
            await gatewayInventoryAdjustmentService.process(
              {
                remark: '',
                __v: 0,
              },
              targetID,
              mockAccount(),
              ''
            )
          }).rejects.toThrow(Error)
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Should success process', {
          tab: 1,
        }),
        async () => {
          const targetID = mockStockAdjustment().id
          jest
            .spyOn(stockAdjustmentModel, 'findOneAndUpdate')
            .mockResolvedValue(mockStockAdjustmentDocArray[0])

          const queueEmitter = jest.spyOn(queueStock, 'add')

          await gatewayInventoryAdjustmentService
            .process(
              {
                remark: '',
                __v: 0,
              },
              targetID,
              mockAccount(),
              ''
            )
            .then((result) => {
              expect(queueEmitter).toHaveBeenCalled()
              expect(result).toHaveProperty('code')
            })
        }
      )
    }
  )

  describe(
    testCaption('NOTIFIER', 'data', 'Stock Adjustment - Notification'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should send notification', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(socketProxy, 'reconnect').mockResolvedValue({
            emit: jest.fn(),
          })

          await gatewayInventoryAdjustmentService
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
            await gatewayInventoryAdjustmentService.notifier(
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
