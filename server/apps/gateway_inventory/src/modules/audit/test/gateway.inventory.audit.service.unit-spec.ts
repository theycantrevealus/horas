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
import { StockAudit, StockAuditDocument } from '@schemas/inventory/audit'
import { AuthService } from '@security/auth.service'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { testCaption } from '@utility/string'
import { Cache } from 'cache-manager'
import { Model } from 'mongoose'

import { GatewayInventoryStockAuditService } from '../gateway.inventory.audit.service'
import {
  mockStockAudit,
  mockStockAuditDocArray,
  mockStockAuditModel,
} from '../mock/stock.audit.mock'

describe('Gateway Inventory Audit Service', () => {
  let configService: ConfigService
  let cacheManager: Cache
  let gatewayInventoryAuditService: GatewayInventoryStockAuditService
  let stockAuditModel: Model<StockAudit>
  let socketProxy: SocketIoClientProxyService

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [],
      providers: [
        GatewayInventoryStockAuditService,
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
          provide: getModelToken(StockAudit.name, 'primary'),
          useValue: mockStockAuditModel,
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

    gatewayInventoryAuditService =
      module.get<GatewayInventoryStockAuditService>(
        GatewayInventoryStockAuditService
      )
    stockAuditModel = module.get<Model<StockAuditDocument>>(
      getModelToken(StockAudit.name, 'primary')
    )

    cacheManager = module.get(CACHE_MANAGER)

    jest.clearAllMocks()
  })

  it(
    testCaption('SERVICE STATE', 'component', 'Service should be defined'),
    () => {
      expect(gatewayInventoryAuditService).toBeDefined()
    }
  )

  describe(testCaption('GET DATA', 'data', 'Stock Audit - Fetch list'), () => {
    it(
      testCaption('HANDLING', 'data', 'Response validity', {
        tab: 1,
      }),
      async () => {
        jest.spyOn(stockAuditModel, 'aggregate').mockReturnValue({
          exec: jest.fn().mockReturnValue(mockStockAuditDocArray),
        } as any)
        await gatewayInventoryAuditService
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
            expect(result.data).toEqual(mockStockAuditDocArray)
          })
      }
    )

    it(
      testCaption('HANDLING', 'data', 'Response error on fetch data', {
        tab: 1,
      }),
      async () => {
        jest.spyOn(JSON, 'parse').mockImplementation(() => ({}))

        jest.spyOn(stockAuditModel, 'aggregate').mockImplementation({
          exec: jest.fn().mockRejectedValue(new Error()),
        } as any)

        await expect(gatewayInventoryAuditService.all('')).rejects.toThrow(
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
          const findMock = mockStockAuditDocArray[0]
          stockAuditModel.findOne = jest.fn().mockImplementationOnce(() => {
            return Promise.resolve(findMock)
          })

          await gatewayInventoryAuditService
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
          jest.spyOn(stockAuditModel, 'findOne').mockResolvedValue(null)
          await expect(async () => {
            await gatewayInventoryAuditService.detail(mockStockAudit().id)
          }).rejects.toThrow(NotFoundException)
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Response error on get detail data', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(stockAuditModel, 'findOne').mockRejectedValue(new Error())
          await expect(async () => {
            await gatewayInventoryAuditService.detail(mockStockAudit().id)
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
        jest.spyOn(stockAuditModel, 'create')
        await gatewayInventoryAuditService
          .add(
            {
              period_from: new Date(),
              period_to: new Date(),
              code: mockStockAudit().code,
              transaction_date: mockStockAudit().transaction_date,
              stock_point: mockStockAudit().stock_point,
              detail: mockStockAudit().detail,
              extras: mockStockAudit().extras,
              remark: mockStockAudit().remark,
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
          jest.spyOn(stockAuditModel, 'create').mockRejectedValue(new Error())
          await expect(async () => {
            await gatewayInventoryAuditService.add(
              {
                period_from: new Date(),
                period_to: new Date(),
                code: mockStockAudit().code,
                transaction_date: mockStockAudit().transaction_date,
                stock_point: mockStockAudit().stock_point,
                detail: mockStockAudit().detail,
                extras: mockStockAudit().extras,
                remark: mockStockAudit().remark,
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
        jest.spyOn(stockAuditModel, 'findOneAndUpdate')

        await gatewayInventoryAuditService
          .edit(
            {
              period_from: new Date(),
              period_to: new Date(),
              code: mockStockAudit().code,
              transaction_date: mockStockAudit().transaction_date,
              stock_point: mockStockAudit().stock_point,
              detail: mockStockAudit().detail,
              extras: mockStockAudit().extras,
              remark: mockStockAudit().remark,
              __v: 0,
            },
            mockStockAudit().id,
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
        jest.spyOn(stockAuditModel, 'findOneAndUpdate').mockResolvedValue(null)

        await expect(async () => {
          await gatewayInventoryAuditService.edit(
            {
              period_from: new Date(),
              period_to: new Date(),
              code: mockStockAudit().code,
              transaction_date: mockStockAudit().transaction_date,
              stock_point: mockStockAudit().stock_point,
              detail: mockStockAudit().detail,
              extras: mockStockAudit().extras,
              remark: mockStockAudit().remark,
              __v: 0,
            },
            mockStockAudit().id,
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
          .spyOn(stockAuditModel, 'findOneAndUpdate')
          .mockImplementationOnce(() => {
            throw new Error()
          })

        await expect(async () => {
          await gatewayInventoryAuditService.edit(
            {
              period_from: new Date(),
              period_to: new Date(),
              code: mockStockAudit().code,
              transaction_date: mockStockAudit().transaction_date,
              stock_point: mockStockAudit().stock_point,
              detail: mockStockAudit().detail,
              extras: mockStockAudit().extras,
              remark: mockStockAudit().remark,
              __v: 0,
            },
            mockStockAudit().id,
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
          const targetID = mockStockAudit().id
          jest
            .spyOn(stockAuditModel, 'findOneAndUpdate')
            .mockResolvedValue(null)

          await expect(async () => {
            await gatewayInventoryAuditService.delete(targetID, mockAccount())
          }).rejects.toThrow(NotFoundException)
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Response error on delete data', {
          tab: 1,
        }),
        async () => {
          const targetID = mockStockAudit().id
          jest
            .spyOn(stockAuditModel, 'findOneAndUpdate')
            .mockRejectedValue(new Error())

          await expect(async () => {
            await gatewayInventoryAuditService.delete(targetID, mockAccount())
          }).rejects.toThrow(Error)
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Should success delete data', {
          tab: 1,
        }),
        async () => {
          jest
            .spyOn(stockAuditModel, 'findOneAndUpdate')
            .mockResolvedValue(mockStockAuditDocArray[0])

          await gatewayInventoryAuditService
            .delete(mockStockAuditDocArray[0].id, mockAccount())
            .then((result) => {
              expect(result).toHaveProperty('transaction_date')
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
          const targetID = mockStockAudit().id
          jest
            .spyOn(stockAuditModel, 'findOneAndUpdate')
            .mockResolvedValue(null)

          await expect(async () => {
            await gatewayInventoryAuditService.askApproval(
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
          const targetID = mockStockAudit().id
          jest
            .spyOn(stockAuditModel, 'findOneAndUpdate')
            .mockImplementationOnce(() => {
              throw new Error()
            })

          await expect(async () => {
            await gatewayInventoryAuditService.askApproval(
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
          const targetID = mockStockAudit().id
          jest
            .spyOn(stockAuditModel, 'findOneAndUpdate')
            .mockResolvedValue(mockStockAuditDocArray[0])

          await gatewayInventoryAuditService
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
    testCaption('APPROVAL DATA', 'data', 'Stock Audit - Approval'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should handle if data is not found', {
          tab: 1,
        }),
        async () => {
          const targetID = mockStockAudit().id
          jest
            .spyOn(stockAuditModel, 'findOneAndUpdate')
            .mockResolvedValue(null)

          await expect(async () => {
            await gatewayInventoryAuditService.approve(
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
          const targetID = mockStockAudit().id
          jest
            .spyOn(stockAuditModel, 'findOneAndUpdate')
            .mockImplementationOnce(() => {
              throw new Error()
            })

          await expect(async () => {
            await gatewayInventoryAuditService.approve(
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
          const targetID = mockStockAudit().id
          jest
            .spyOn(stockAuditModel, 'findOneAndUpdate')
            .mockResolvedValue(mockStockAuditDocArray[0])

          await gatewayInventoryAuditService
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
    testCaption('APPROVAL DATA', 'data', 'Stock Audit - Decline'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should handle if data is not found', {
          tab: 1,
        }),
        async () => {
          const targetID = mockStockAudit().id
          jest
            .spyOn(stockAuditModel, 'findOneAndUpdate')
            .mockResolvedValue(null)

          await expect(async () => {
            await gatewayInventoryAuditService.decline(
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
          const targetID = mockStockAudit().id
          jest
            .spyOn(stockAuditModel, 'findOneAndUpdate')
            .mockImplementationOnce(() => {
              throw new Error()
            })

          await expect(async () => {
            await gatewayInventoryAuditService.decline(
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
          const targetID = mockStockAudit().id
          jest
            .spyOn(stockAuditModel, 'findOneAndUpdate')
            .mockResolvedValue(mockStockAuditDocArray[0])

          await gatewayInventoryAuditService
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
    testCaption('APPROVAL DATA', 'data', 'Stock Audit - Running'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should handle if data is not found', {
          tab: 1,
        }),
        async () => {
          const targetID = mockStockAudit().id
          jest
            .spyOn(stockAuditModel, 'findOneAndUpdate')
            .mockResolvedValue(null)

          await expect(async () => {
            await gatewayInventoryAuditService.running(
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
          const targetID = mockStockAudit().id
          jest
            .spyOn(stockAuditModel, 'findOneAndUpdate')
            .mockImplementationOnce(() => {
              throw new Error()
            })

          await expect(async () => {
            await gatewayInventoryAuditService.running(
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
        testCaption('HANDLING', 'data', 'Should success running', {
          tab: 1,
        }),
        async () => {
          const targetID = mockStockAudit().id
          jest
            .spyOn(stockAuditModel, 'findOneAndUpdate')
            .mockResolvedValue(mockStockAuditDocArray[0])

          await gatewayInventoryAuditService
            .running(
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
    testCaption('APPROVAL DATA', 'data', 'Stock Audit - Complete'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should handle if data is not found', {
          tab: 1,
        }),
        async () => {
          const targetID = mockStockAudit().id
          jest
            .spyOn(stockAuditModel, 'findOneAndUpdate')
            .mockResolvedValue(null)

          await expect(async () => {
            await gatewayInventoryAuditService.completed(
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
          const targetID = mockStockAudit().id
          jest
            .spyOn(stockAuditModel, 'findOneAndUpdate')
            .mockImplementationOnce(() => {
              throw new Error()
            })

          await expect(async () => {
            await gatewayInventoryAuditService.completed(
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
          const targetID = mockStockAudit().id
          jest
            .spyOn(stockAuditModel, 'findOneAndUpdate')
            .mockResolvedValue(mockStockAuditDocArray[0])

          await gatewayInventoryAuditService
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
    testCaption('NOTIFIER', 'data', 'Stock Audit - Notification'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should send notification', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(socketProxy, 'reconnect').mockResolvedValue({
            emit: jest.fn(),
          })

          await gatewayInventoryAuditService
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
            await gatewayInventoryAuditService.notifier(
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
