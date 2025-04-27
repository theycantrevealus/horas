import { mockAccount } from '@gateway_core/account/mock/account.mock'
import { mockAuthorityModel } from '@gateway_core/account/mock/authority.mock'
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
  StockDisposal,
  StockDisposalDocument,
} from '@schemas/inventory/disposal'
import { AuthService } from '@security/auth.service'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { testCaption } from '@utility/string'
import { Cache } from 'cache-manager'
import { Model } from 'mongoose'

import { GatewayInventoryStockDisposalService } from '../gateway.inventory.disposal.service'
import {
  mockStockDisposal,
  mockStockDisposalDocArray,
  mockStockDisposalModel,
} from '../mock/stock.disposal.mock'

describe('Gateway Inventory Stock Disposal Service', () => {
  let configService: ConfigService
  let cacheManager: Cache
  let gatewayInventoryStockDisposalService: GatewayInventoryStockDisposalService
  let stockDisposalModel: Model<StockDisposal>
  let socketProxy: SocketIoClientProxyService

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [],
      providers: [
        GatewayInventoryStockDisposalService,
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
          provide: getModelToken(StockDisposal.name, 'primary'),
          useValue: mockStockDisposalModel,
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

    gatewayInventoryStockDisposalService =
      module.get<GatewayInventoryStockDisposalService>(
        GatewayInventoryStockDisposalService
      )
    stockDisposalModel = module.get<Model<StockDisposalDocument>>(
      getModelToken(StockDisposal.name, 'primary')
    )

    cacheManager = module.get(CACHE_MANAGER)

    jest.clearAllMocks()
  })

  it(
    testCaption('SERVICE STATE', 'component', 'Service should be defined'),
    () => {
      expect(gatewayInventoryStockDisposalService).toBeDefined()
    }
  )

  describe(
    testCaption('GET DATA', 'data', 'Stock Disposal - Fetch list'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Response validity', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(stockDisposalModel, 'aggregate').mockReturnValue({
            exec: jest.fn().mockReturnValue(mockStockDisposalDocArray),
          } as any)
          await gatewayInventoryStockDisposalService
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
              expect(result.data).toEqual(mockStockDisposalDocArray)
            })
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Response error on fetch data', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(JSON, 'parse').mockImplementation(() => ({}))

          jest.spyOn(stockDisposalModel, 'aggregate').mockImplementation({
            exec: jest.fn().mockRejectedValue(new Error()),
          } as any)

          await expect(
            gatewayInventoryStockDisposalService.all('')
          ).rejects.toThrow(Error)
        }
      )
    }
  )

  describe(
    testCaption('GET DETAIL', 'data', 'Stock Disposal - Fetch detail'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Response validity', {
          tab: 1,
        }),
        async () => {
          const findMock = mockStockDisposalDocArray[0]
          stockDisposalModel.findOne = jest.fn().mockImplementationOnce(() => {
            return Promise.resolve(findMock)
          })

          await gatewayInventoryStockDisposalService
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
          jest.spyOn(stockDisposalModel, 'findOne').mockResolvedValue(null)
          await expect(async () => {
            await gatewayInventoryStockDisposalService.detail(
              mockStockDisposal().id
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
            .spyOn(stockDisposalModel, 'findOne')
            .mockRejectedValue(new Error())
          await expect(async () => {
            await gatewayInventoryStockDisposalService.detail(
              mockStockDisposal().id
            )
          }).rejects.toThrow(Error)
        }
      )
    }
  )

  describe(
    testCaption('ADD DATA', 'data', 'Stock Disposal - Add new data'),
    () => {
      it(testCaption('DATA', 'data', 'Should add new data'), async () => {
        jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')
        jest.spyOn(cacheManager, 'get').mockResolvedValueOnce({})
        jest.spyOn(stockDisposalModel, 'create')
        await gatewayInventoryStockDisposalService
          .add(
            {
              code: mockStockDisposal().code,
              transaction_date: new Date(),
              stock_point: mockStockDisposal().stock_point,
              detail: mockStockDisposal().detail,
              extras: mockStockDisposal().extras,
              remark: mockStockDisposal().remark,
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
            .spyOn(stockDisposalModel, 'create')
            .mockRejectedValue(new Error())
          await expect(async () => {
            await gatewayInventoryStockDisposalService.add(
              {
                code: mockStockDisposal().code,
                transaction_date: new Date(),
                stock_point: mockStockDisposal().stock_point,
                detail: mockStockDisposal().detail,
                extras: mockStockDisposal().extras,
                remark: mockStockDisposal().remark,
              },
              mockAccount()
            )
          }).rejects.toThrow(Error)
        }
      )
    }
  )

  describe(
    testCaption('EDIT DATA', 'data', 'Stock Disposal - Edit data'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should edit data', { tab: 1 }),
        async () => {
          jest.spyOn(stockDisposalModel, 'findOneAndUpdate')

          await gatewayInventoryStockDisposalService
            .edit(
              {
                code: mockStockDisposal().code,
                transaction_date: new Date(),
                stock_point: mockStockDisposal().stock_point,
                detail: mockStockDisposal().detail,
                extras: mockStockDisposal().extras,
                remark: mockStockDisposal().remark,
                __v: 0,
              },
              mockStockDisposal().id,
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
            .spyOn(stockDisposalModel, 'findOneAndUpdate')
            .mockResolvedValue(null)

          await expect(async () => {
            await gatewayInventoryStockDisposalService.edit(
              {
                code: mockStockDisposal().code,
                transaction_date: new Date(),
                stock_point: mockStockDisposal().stock_point,
                detail: mockStockDisposal().detail,
                extras: mockStockDisposal().extras,
                remark: mockStockDisposal().remark,
                __v: 0,
              },
              mockStockDisposal().id,
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
            .spyOn(stockDisposalModel, 'findOneAndUpdate')
            .mockImplementationOnce(() => {
              throw new Error()
            })

          await expect(async () => {
            await gatewayInventoryStockDisposalService.edit(
              {
                code: mockStockDisposal().code,
                transaction_date: new Date(),
                stock_point: mockStockDisposal().stock_point,
                detail: mockStockDisposal().detail,
                extras: mockStockDisposal().extras,
                remark: mockStockDisposal().remark,
                __v: 0,
              },
              mockStockDisposal().id,
              mockAccount()
            )
          }).rejects.toThrow(Error)
        }
      )
    }
  )

  describe(
    testCaption('DELETE DATA', 'data', 'Stock Disposal - Delete data'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Response error if data is not found', {
          tab: 1,
        }),
        async () => {
          const targetID = mockStockDisposal().id
          jest
            .spyOn(stockDisposalModel, 'findOneAndUpdate')
            .mockResolvedValue(null)

          await expect(async () => {
            await gatewayInventoryStockDisposalService.delete(
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
          const targetID = mockStockDisposal().id
          jest
            .spyOn(stockDisposalModel, 'findOneAndUpdate')
            .mockRejectedValue(new Error())

          await expect(async () => {
            await gatewayInventoryStockDisposalService.delete(
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
            .spyOn(stockDisposalModel, 'findOneAndUpdate')
            .mockResolvedValue(mockStockDisposalDocArray[0])

          await gatewayInventoryStockDisposalService
            .delete(mockStockDisposalDocArray[0].id, mockAccount())
            .then((result) => {
              expect(result).toHaveProperty('transaction_date')
            })
        }
      )
    }
  )

  describe(
    testCaption('APPROVAL DATA', 'data', 'Stock Disposal - Ask Approval'),
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
          const targetID = mockStockDisposal().id
          jest
            .spyOn(stockDisposalModel, 'findOneAndUpdate')
            .mockResolvedValue(null)

          await expect(async () => {
            await gatewayInventoryStockDisposalService.askApproval(
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
          const targetID = mockStockDisposal().id
          jest
            .spyOn(stockDisposalModel, 'findOneAndUpdate')
            .mockImplementationOnce(() => {
              throw new Error()
            })

          await expect(async () => {
            await gatewayInventoryStockDisposalService.askApproval(
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
          const targetID = mockStockDisposal().id
          jest
            .spyOn(stockDisposalModel, 'findOneAndUpdate')
            .mockResolvedValue(mockStockDisposalDocArray[0])

          await gatewayInventoryStockDisposalService
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
    testCaption('APPROVAL DATA', 'data', 'Stock Disposal - Approval'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should handle if data is not found', {
          tab: 1,
        }),
        async () => {
          const targetID = mockStockDisposal().id
          jest
            .spyOn(stockDisposalModel, 'findOneAndUpdate')
            .mockResolvedValue(null)

          await expect(async () => {
            await gatewayInventoryStockDisposalService.approve(
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
          const targetID = mockStockDisposal().id
          jest
            .spyOn(stockDisposalModel, 'findOneAndUpdate')
            .mockImplementationOnce(() => {
              throw new Error()
            })

          await expect(async () => {
            await gatewayInventoryStockDisposalService.approve(
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
          const targetID = mockStockDisposal().id
          jest
            .spyOn(stockDisposalModel, 'findOneAndUpdate')
            .mockResolvedValue(mockStockDisposalDocArray[0])

          await gatewayInventoryStockDisposalService
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
    testCaption('APPROVAL DATA', 'data', 'Stock Disposal - Decline'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should handle if data is not found', {
          tab: 1,
        }),
        async () => {
          const targetID = mockStockDisposal().id
          jest
            .spyOn(stockDisposalModel, 'findOneAndUpdate')
            .mockResolvedValue(null)

          await expect(async () => {
            await gatewayInventoryStockDisposalService.decline(
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
          const targetID = mockStockDisposal().id
          jest
            .spyOn(stockDisposalModel, 'findOneAndUpdate')
            .mockImplementationOnce(() => {
              throw new Error()
            })

          await expect(async () => {
            await gatewayInventoryStockDisposalService.decline(
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
          const targetID = mockStockDisposal().id
          jest
            .spyOn(stockDisposalModel, 'findOneAndUpdate')
            .mockResolvedValue(mockStockDisposalDocArray[0])

          await gatewayInventoryStockDisposalService
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
    testCaption('APPROVAL DATA', 'data', 'Stock Disposal - Complete'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should handle if data is not found', {
          tab: 1,
        }),
        async () => {
          const targetID = mockStockDisposal().id
          jest
            .spyOn(stockDisposalModel, 'findOneAndUpdate')
            .mockResolvedValue(null)

          await expect(async () => {
            await gatewayInventoryStockDisposalService.completed(
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
          const targetID = mockStockDisposal().id
          jest
            .spyOn(stockDisposalModel, 'findOneAndUpdate')
            .mockImplementationOnce(() => {
              throw new Error()
            })

          await expect(async () => {
            await gatewayInventoryStockDisposalService.completed(
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
          const targetID = mockStockDisposal().id
          jest
            .spyOn(stockDisposalModel, 'findOneAndUpdate')
            .mockResolvedValue(mockStockDisposalDocArray[0])

          await gatewayInventoryStockDisposalService
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
    testCaption('NOTIFIER', 'data', 'Stock Disposal - Notification'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should send notification', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(socketProxy, 'reconnect').mockResolvedValue({
            emit: jest.fn(),
          })

          await gatewayInventoryStockDisposalService
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
            await gatewayInventoryStockDisposalService.notifier(
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
