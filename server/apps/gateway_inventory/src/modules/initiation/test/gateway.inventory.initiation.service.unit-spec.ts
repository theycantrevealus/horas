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
  StockInitiation,
  StockInitiationDocument,
} from '@schemas/inventory/initiation'
import { AuthService } from '@security/auth.service'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { testCaption } from '@utility/string'
import { Cache } from 'cache-manager'
import { Model } from 'mongoose'

import { GatewayInventoryStockInitiationService } from '../gateway.inventory.initiation.service'
import {
  mockStockInitiation,
  mockStockInitiationDocArray,
  mockStockInitiationModel,
} from '../mock/initiation.mock'

describe('Gateway Inventory Stock Initiation Service', () => {
  let configService: ConfigService
  let cacheManager: Cache
  let gatewayInventoryStockInitiationService: GatewayInventoryStockInitiationService
  let stockInitiationModel: Model<StockInitiation>
  let socketProxy: SocketIoClientProxyService

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [],
      providers: [
        GatewayInventoryStockInitiationService,
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
          provide: getQueueToken('stock'),
          useValue: {
            add: () => jest.fn().mockResolvedValue({ id: 'queue-1' }),
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
          provide: getModelToken(StockInitiation.name, 'primary'),
          useValue: mockStockInitiationModel,
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

    gatewayInventoryStockInitiationService =
      module.get<GatewayInventoryStockInitiationService>(
        GatewayInventoryStockInitiationService
      )
    stockInitiationModel = module.get<Model<StockInitiationDocument>>(
      getModelToken(StockInitiation.name, 'primary')
    )

    cacheManager = module.get(CACHE_MANAGER)

    jest.clearAllMocks()
  })

  it(
    testCaption('SERVICE STATE', 'component', 'Service should be defined'),
    () => {
      expect(gatewayInventoryStockInitiationService).toBeDefined()
    }
  )

  describe(
    testCaption('GET DATA', 'data', 'Stock Initiation - Fetch list'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Response validity', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(stockInitiationModel, 'aggregate').mockReturnValue({
            exec: jest.fn().mockReturnValue(mockStockInitiationDocArray),
          } as any)
          await gatewayInventoryStockInitiationService
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
              expect(result.data).toEqual(mockStockInitiationDocArray)
            })
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Response error on fetch data', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(JSON, 'parse').mockImplementation(() => ({}))

          jest.spyOn(stockInitiationModel, 'aggregate').mockImplementation({
            exec: jest.fn().mockRejectedValue(new Error()),
          } as any)

          await expect(
            gatewayInventoryStockInitiationService.all('')
          ).rejects.toThrow(Error)
        }
      )
    }
  )

  describe(
    testCaption('GET DETAIL', 'data', 'Stock Initiation - Fetch detail'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Response validity', {
          tab: 1,
        }),
        async () => {
          const findMock = mockStockInitiationDocArray[0]
          stockInitiationModel.findOne = jest
            .fn()
            .mockImplementationOnce(() => {
              return Promise.resolve(findMock)
            })

          await gatewayInventoryStockInitiationService
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
          jest.spyOn(stockInitiationModel, 'findOne').mockResolvedValue(null)
          await expect(async () => {
            await gatewayInventoryStockInitiationService.detail(
              mockStockInitiation().id
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
            .spyOn(stockInitiationModel, 'findOne')
            .mockRejectedValue(new Error())
          await expect(async () => {
            await gatewayInventoryStockInitiationService.detail(
              mockStockInitiation().id
            )
          }).rejects.toThrow(Error)
        }
      )
    }
  )

  describe(
    testCaption('ADD DATA', 'data', 'Stock Initiation - Add new data'),
    () => {
      it(testCaption('DATA', 'data', 'Should add new data'), async () => {
        jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')
        jest.spyOn(cacheManager, 'get').mockResolvedValueOnce({})
        jest.spyOn(stockInitiationModel, 'create')
        await gatewayInventoryStockInitiationService
          .add(
            {
              code: mockStockInitiation().code,
              transaction_date: new Date(),
              stock_point: mockStockInitiation().stock_point,
              detail: mockStockInitiation().detail,
              extras: mockStockInitiation().extras,
              remark: mockStockInitiation().remark,
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
            .spyOn(stockInitiationModel, 'create')
            .mockRejectedValue(new Error())
          await expect(async () => {
            await gatewayInventoryStockInitiationService.add(
              {
                code: mockStockInitiation().code,
                transaction_date: new Date(),
                stock_point: mockStockInitiation().stock_point,
                detail: mockStockInitiation().detail,
                extras: mockStockInitiation().extras,
                remark: mockStockInitiation().remark,
              },
              mockAccount()
            )
          }).rejects.toThrow(Error)
        }
      )
    }
  )

  describe(
    testCaption('EDIT DATA', 'data', 'Stock Initiation - Edit data'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should edit data', { tab: 1 }),
        async () => {
          jest.spyOn(stockInitiationModel, 'findOneAndUpdate')

          await gatewayInventoryStockInitiationService
            .edit(
              {
                code: mockStockInitiation().code,
                transaction_date: new Date(),
                stock_point: mockStockInitiation().stock_point,
                detail: mockStockInitiation().detail,
                extras: mockStockInitiation().extras,
                remark: mockStockInitiation().remark,
                __v: 0,
              },
              mockStockInitiation().id,
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
            .spyOn(stockInitiationModel, 'findOneAndUpdate')
            .mockResolvedValue(null)

          await expect(async () => {
            await gatewayInventoryStockInitiationService.edit(
              {
                code: mockStockInitiation().code,
                transaction_date: new Date(),
                stock_point: mockStockInitiation().stock_point,
                detail: mockStockInitiation().detail,
                extras: mockStockInitiation().extras,
                remark: mockStockInitiation().remark,
                __v: 0,
              },
              mockStockInitiation().id,
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
            .spyOn(stockInitiationModel, 'findOneAndUpdate')
            .mockImplementationOnce(() => {
              throw new Error()
            })

          await expect(async () => {
            await gatewayInventoryStockInitiationService.edit(
              {
                code: mockStockInitiation().code,
                transaction_date: new Date(),
                stock_point: mockStockInitiation().stock_point,
                detail: mockStockInitiation().detail,
                extras: mockStockInitiation().extras,
                remark: mockStockInitiation().remark,
                __v: 0,
              },
              mockStockInitiation().id,
              mockAccount()
            )
          }).rejects.toThrow(Error)
        }
      )
    }
  )

  describe(
    testCaption('DELETE DATA', 'data', 'Stock Initiation - Delete data'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Response error if data is not found', {
          tab: 1,
        }),
        async () => {
          const targetID = mockStockInitiation().id
          jest
            .spyOn(stockInitiationModel, 'findOneAndUpdate')
            .mockResolvedValue(null)

          await expect(async () => {
            await gatewayInventoryStockInitiationService.delete(
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
          const targetID = mockStockInitiation().id
          jest
            .spyOn(stockInitiationModel, 'findOneAndUpdate')
            .mockRejectedValue(new Error())

          await expect(async () => {
            await gatewayInventoryStockInitiationService.delete(
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
            .spyOn(stockInitiationModel, 'findOneAndUpdate')
            .mockResolvedValue(mockStockInitiationDocArray[0])

          await gatewayInventoryStockInitiationService
            .delete(mockStockInitiationDocArray[0].id, mockAccount())
            .then((result) => {
              expect(result).toHaveProperty('transaction_date')
            })
        }
      )
    }
  )

  describe(
    testCaption('APPROVAL DATA', 'data', 'Stock Initiation - Ask Approval'),
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
          const targetID = mockStockInitiation().id
          jest
            .spyOn(stockInitiationModel, 'findOneAndUpdate')
            .mockResolvedValue(null)

          await expect(async () => {
            await gatewayInventoryStockInitiationService.askApproval(
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
          const targetID = mockStockInitiation().id
          jest
            .spyOn(stockInitiationModel, 'findOneAndUpdate')
            .mockImplementationOnce(() => {
              throw new Error()
            })

          await expect(async () => {
            await gatewayInventoryStockInitiationService.askApproval(
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
          const targetID = mockStockInitiation().id
          jest
            .spyOn(stockInitiationModel, 'findOneAndUpdate')
            .mockResolvedValue(mockStockInitiationDocArray[0])

          await gatewayInventoryStockInitiationService
            .askApproval(
              {
                remark: '',
                __v: 0,
              },
              targetID,
              mockAccount()
            )
            .then((result) => {
              expect(result).toHaveProperty('transaction_date')
            })
        }
      )
    }
  )

  describe(
    testCaption('APPROVAL DATA', 'data', 'Stock Initiation - Approval'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should handle if data is not found', {
          tab: 1,
        }),
        async () => {
          const targetID = mockStockInitiation().id
          jest
            .spyOn(stockInitiationModel, 'findOneAndUpdate')
            .mockResolvedValue(null)

          await expect(async () => {
            await gatewayInventoryStockInitiationService.approve(
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
          const targetID = mockStockInitiation().id
          jest
            .spyOn(stockInitiationModel, 'findOneAndUpdate')
            .mockImplementationOnce(() => {
              throw new Error()
            })

          await expect(async () => {
            await gatewayInventoryStockInitiationService.approve(
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
          const targetID = mockStockInitiation().id
          jest
            .spyOn(stockInitiationModel, 'findOneAndUpdate')
            .mockResolvedValue(mockStockInitiationDocArray[0])

          await gatewayInventoryStockInitiationService
            .approve(
              {
                remark: '',
                __v: 0,
              },
              targetID,
              mockAccount()
            )
            .then((result) => {
              expect(result).toHaveProperty('transaction_date')
            })
        }
      )
    }
  )

  describe(
    testCaption('APPROVAL DATA', 'data', 'Stock Initiation - Decline'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should handle if data is not found', {
          tab: 1,
        }),
        async () => {
          const targetID = mockStockInitiation().id
          jest
            .spyOn(stockInitiationModel, 'findOneAndUpdate')
            .mockResolvedValue(null)

          await expect(async () => {
            await gatewayInventoryStockInitiationService.decline(
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
          const targetID = mockStockInitiation().id
          jest
            .spyOn(stockInitiationModel, 'findOneAndUpdate')
            .mockImplementationOnce(() => {
              throw new Error()
            })

          await expect(async () => {
            await gatewayInventoryStockInitiationService.decline(
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
          const targetID = mockStockInitiation().id
          jest
            .spyOn(stockInitiationModel, 'findOneAndUpdate')
            .mockResolvedValue(mockStockInitiationDocArray[0])

          await gatewayInventoryStockInitiationService
            .decline(
              {
                remark: '',
                __v: 0,
              },
              targetID,
              mockAccount()
            )
            .then((result) => {
              expect(result).toHaveProperty('transaction_date')
            })
        }
      )
    }
  )

  describe(
    testCaption('APPROVAL DATA', 'data', 'Stock Initiation - Running'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should handle if data is not found', {
          tab: 1,
        }),
        async () => {
          const targetID = mockStockInitiation().id
          jest
            .spyOn(stockInitiationModel, 'findOneAndUpdate')
            .mockResolvedValue(null)

          await expect(async () => {
            await gatewayInventoryStockInitiationService.running(
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
          const targetID = mockStockInitiation().id
          jest
            .spyOn(stockInitiationModel, 'findOneAndUpdate')
            .mockImplementationOnce(() => {
              throw new Error()
            })

          await expect(async () => {
            await gatewayInventoryStockInitiationService.running(
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
        testCaption('HANDLING', 'data', 'Should success running', {
          tab: 1,
        }),
        async () => {
          const targetID = mockStockInitiation().id
          jest
            .spyOn(stockInitiationModel, 'findOneAndUpdate')
            .mockResolvedValue(mockStockInitiationDocArray[0])

          await gatewayInventoryStockInitiationService
            .running(
              {
                remark: '',
                __v: 0,
              },
              targetID,
              mockAccount(),
              ''
            )
            .then((result) => {
              expect(result).toHaveProperty('transaction_date')
            })
        }
      )
    }
  )

  describe(
    testCaption('APPROVAL DATA', 'data', 'Stock Initiation - Complete'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should handle if data is not found', {
          tab: 1,
        }),
        async () => {
          const targetID = mockStockInitiation().id
          jest
            .spyOn(stockInitiationModel, 'findOneAndUpdate')
            .mockResolvedValue(null)

          await expect(async () => {
            await gatewayInventoryStockInitiationService.completed(
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
          const targetID = mockStockInitiation().id
          jest
            .spyOn(stockInitiationModel, 'findOneAndUpdate')
            .mockImplementationOnce(() => {
              throw new Error()
            })

          await expect(async () => {
            await gatewayInventoryStockInitiationService.completed(
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
        testCaption('HANDLING', 'data', 'Should success completed', {
          tab: 1,
        }),
        async () => {
          const targetID = mockStockInitiation().id
          jest
            .spyOn(stockInitiationModel, 'findOneAndUpdate')
            .mockResolvedValue(mockStockInitiationDocArray[0])

          await gatewayInventoryStockInitiationService
            .completed(
              {
                remark: '',
                __v: 0,
              },
              targetID,
              mockAccount()
            )
            .then((result) => {
              expect(result).toHaveProperty('transaction_date')
            })
        }
      )
    }
  )

  describe(
    testCaption('NOTIFIER', 'data', 'Stock Initiation - Notification'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should send notification', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(socketProxy, 'reconnect').mockResolvedValue({
            emit: jest.fn(),
          })

          await gatewayInventoryStockInitiationService
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
            await gatewayInventoryStockInitiationService.notifier(
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
