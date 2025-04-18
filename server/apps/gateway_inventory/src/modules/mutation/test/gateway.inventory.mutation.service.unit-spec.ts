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
import { Mutation, MutationDocument } from '@schemas/inventory/mutation'
import { AuthService } from '@security/auth.service'
import { KafkaService } from '@utility/kafka/avro/service'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { testCaption } from '@utility/string'
import { Cache } from 'cache-manager'
import { CompressionTypes } from 'kafkajs'
import { Model } from 'mongoose'

import { GatewayInventoryMutationService } from '../gateway.inventory.mutation.service'
import {
  mockMutation,
  mockMutationDocArray,
  mockMutationModel,
} from '../mock/mutation.mock'

describe('Gateway Inventory Mutation Service', () => {
  let configService: ConfigService
  let cacheManager: Cache
  let gatewayInventoryMutationService: GatewayInventoryMutationService
  let mutationModel: Model<Mutation>
  let socketProxy: SocketIoClientProxyService
  let stockClient: KafkaService

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [],
      providers: [
        GatewayInventoryMutationService,
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
          provide: getModelToken(Mutation.name, 'primary'),
          useValue: mockMutationModel,
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

    stockClient = module.get('STOCK_SERVICE')

    gatewayInventoryMutationService =
      module.get<GatewayInventoryMutationService>(
        GatewayInventoryMutationService
      )
    mutationModel = module.get<Model<MutationDocument>>(
      getModelToken(Mutation.name, 'primary')
    )

    cacheManager = module.get(CACHE_MANAGER)

    jest.clearAllMocks()
  })

  it(
    testCaption('SERVICE STATE', 'component', 'Service should be defined'),
    () => {
      expect(gatewayInventoryMutationService).toBeDefined()
    }
  )

  describe(
    testCaption('GET DATA', 'data', 'Stock Mutation - Fetch list'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Response validity', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(mutationModel, 'aggregate').mockReturnValue({
            exec: jest.fn().mockReturnValue(mockMutationDocArray),
          } as any)
          await gatewayInventoryMutationService
            .all(
              `{
              "first": 0,
              "rows": 10,
              "sortField": "created_at",
              "sortOrder": 1,
              "filters": {}
            }`,
              mockAccount()
            )
            .then((result) => {
              // Should be an array of data
              expect(result.data).toBeInstanceOf(Array)

              // Data should be defined
              expect(result.data).toEqual(mockMutationDocArray)
            })
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Response error on fetch data', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(JSON, 'parse').mockImplementation(() => ({}))

          jest.spyOn(mutationModel, 'aggregate').mockImplementation({
            exec: jest.fn().mockRejectedValue(new Error()),
          } as any)

          await expect(
            gatewayInventoryMutationService.all('', mockAccount())
          ).rejects.toThrow(Error)
        }
      )
    }
  )

  describe(
    testCaption('GET DETAIL', 'data', 'Stock Mutation - Fetch detail'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Response validity', {
          tab: 1,
        }),
        async () => {
          const findMock = mockMutationDocArray[0]
          mutationModel.findOne = jest.fn().mockImplementationOnce(() => {
            return Promise.resolve(findMock)
          })

          await gatewayInventoryMutationService
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
          jest.spyOn(mutationModel, 'findOne').mockResolvedValue(null)
          await expect(async () => {
            await gatewayInventoryMutationService.detail(mockMutation().id)
          }).rejects.toThrow(NotFoundException)
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Response error on get detail data', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(mutationModel, 'findOne').mockRejectedValue(new Error())
          await expect(async () => {
            await gatewayInventoryMutationService.detail(mockMutation().id)
          }).rejects.toThrow(Error)
        }
      )
    }
  )

  describe(
    testCaption('ADD DATA', 'data', 'Stock Mutation - Add new data'),
    () => {
      it(testCaption('DATA', 'data', 'Should add new data'), async () => {
        jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')
        jest.spyOn(cacheManager, 'get').mockResolvedValueOnce({})
        jest.spyOn(mutationModel, 'create')
        await gatewayInventoryMutationService
          .add(
            {
              code: mockMutation().code,
              transaction_date: mockMutation().transaction_date,
              from: mockMutation().from,
              to: mockMutation().to,
              detail: mockMutation().detail,
              extras: mockMutation().extras,
              remark: mockMutation().remark,
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
          jest.spyOn(mutationModel, 'create').mockRejectedValue(new Error())
          await expect(async () => {
            await gatewayInventoryMutationService.add(
              {
                code: mockMutation().code,
                transaction_date: mockMutation().transaction_date,
                from: mockMutation().from,
                to: mockMutation().to,
                detail: mockMutation().detail,
                extras: mockMutation().extras,
                remark: mockMutation().remark,
              },
              mockAccount()
            )
          }).rejects.toThrow(Error)
        }
      )
    }
  )

  describe(
    testCaption('EDIT DATA', 'data', 'Stock Mutation - Edit data'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should edit data', { tab: 1 }),
        async () => {
          jest.spyOn(mutationModel, 'findOneAndUpdate')

          await gatewayInventoryMutationService
            .edit(
              {
                code: mockMutation().code,
                transaction_date: mockMutation().transaction_date,
                from: mockMutation().from,
                to: mockMutation().to,
                detail: mockMutation().detail,
                extras: mockMutation().extras,
                remark: mockMutation().remark,
                __v: 0,
              },
              mockMutation().id,
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
          jest.spyOn(mutationModel, 'findOneAndUpdate').mockResolvedValue(null)

          await expect(async () => {
            await gatewayInventoryMutationService.edit(
              {
                code: mockMutation().code,
                transaction_date: mockMutation().transaction_date,
                from: mockMutation().from,
                to: mockMutation().to,
                detail: mockMutation().detail,
                extras: mockMutation().extras,
                remark: mockMutation().remark,
                __v: 0,
              },
              mockMutation().id,
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
            .spyOn(mutationModel, 'findOneAndUpdate')
            .mockImplementationOnce(() => {
              throw new Error()
            })

          await expect(async () => {
            await gatewayInventoryMutationService.edit(
              {
                code: mockMutation().code,
                transaction_date: mockMutation().transaction_date,
                from: mockMutation().from,
                to: mockMutation().to,
                detail: mockMutation().detail,
                extras: mockMutation().extras,
                remark: mockMutation().remark,
                __v: 0,
              },
              mockMutation().id,
              mockAccount()
            )
          }).rejects.toThrow(Error)
        }
      )
    }
  )

  describe(
    testCaption('DELETE DATA', 'data', 'Stock Mutation - Delete data'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Response error if data is not found', {
          tab: 1,
        }),
        async () => {
          const targetID = mockMutation().id
          jest.spyOn(mutationModel, 'findOneAndUpdate').mockResolvedValue(null)

          await expect(async () => {
            await gatewayInventoryMutationService.delete(
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
          const targetID = mockMutation().id
          jest
            .spyOn(mutationModel, 'findOneAndUpdate')
            .mockRejectedValue(new Error())

          await expect(async () => {
            await gatewayInventoryMutationService.delete(
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
            .spyOn(mutationModel, 'findOneAndUpdate')
            .mockResolvedValue(mockMutationDocArray[0])

          await gatewayInventoryMutationService
            .delete(mockMutationDocArray[0].id, mockAccount())
            .then((result) => {
              expect(result).toHaveProperty('transaction_date')
            })
        }
      )
    }
  )

  describe(
    testCaption('APPROVAL DATA', 'data', 'Stock Mutation - Ask Approval'),
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
          const targetID = mockMutation().id
          jest.spyOn(mutationModel, 'findOneAndUpdate').mockResolvedValue(null)

          await expect(async () => {
            await gatewayInventoryMutationService.askApproval(
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
          const targetID = mockMutation().id
          jest
            .spyOn(mutationModel, 'findOneAndUpdate')
            .mockImplementationOnce(() => {
              throw new Error()
            })

          await expect(async () => {
            await gatewayInventoryMutationService.askApproval(
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
          const targetID = mockMutation().id
          jest
            .spyOn(mutationModel, 'findOneAndUpdate')
            .mockResolvedValue(mockMutationDocArray[0])

          await gatewayInventoryMutationService
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
    testCaption('APPROVAL DATA', 'data', 'Stock Mutation - Approval'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should handle if data is not found', {
          tab: 1,
        }),
        async () => {
          const targetID = mockMutation().id
          jest.spyOn(mutationModel, 'findOneAndUpdate').mockResolvedValue(null)

          await expect(async () => {
            await gatewayInventoryMutationService.approve(
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
          const targetID = mockMutation().id
          jest
            .spyOn(mutationModel, 'findOneAndUpdate')
            .mockImplementationOnce(() => {
              throw new Error()
            })

          await expect(async () => {
            await gatewayInventoryMutationService.approve(
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
          const targetID = mockMutation().id
          jest
            .spyOn(mutationModel, 'findOneAndUpdate')
            .mockResolvedValue(mockMutationDocArray[0])

          await gatewayInventoryMutationService
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
    testCaption('APPROVAL DATA', 'data', 'Stock Mutation - Decline'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should handle if data is not found', {
          tab: 1,
        }),
        async () => {
          const targetID = mockMutation().id
          jest.spyOn(mutationModel, 'findOneAndUpdate').mockResolvedValue(null)

          await expect(async () => {
            await gatewayInventoryMutationService.decline(
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
          const targetID = mockMutation().id
          jest
            .spyOn(mutationModel, 'findOneAndUpdate')
            .mockImplementationOnce(() => {
              throw new Error()
            })

          await expect(async () => {
            await gatewayInventoryMutationService.decline(
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
          const targetID = mockMutation().id
          jest
            .spyOn(mutationModel, 'findOneAndUpdate')
            .mockResolvedValue(mockMutationDocArray[0])

          await gatewayInventoryMutationService
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
    testCaption('APPROVAL DATA', 'data', 'Stock Mutation - Process'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should handle if data is not found', {
          tab: 1,
        }),
        async () => {
          const targetID = mockMutation().id
          jest.spyOn(mutationModel, 'findOneAndUpdate').mockResolvedValue(null)

          await expect(async () => {
            await gatewayInventoryMutationService.proceed(
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
        testCaption('HANDLING', 'data', 'Should process mutation', {
          tab: 1,
        }),
        async () => {
          const targetData = mockMutationDocArray[0]
          const account = mockAccount()
          jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')
          jest
            .spyOn(mutationModel, 'findOneAndUpdate')
            .mockResolvedValue(targetData)

          const token = 'token'

          const transactionMock = stockClient.transaction as jest.Mock

          let sendMock

          transactionMock.mockImplementation(() => {
            sendMock = jest.fn().mockResolvedValue({})
            return {
              send: sendMock,
              abort: jest.fn(),
              commit: jest.fn().mockResolvedValue({}),
            }
          })

          await gatewayInventoryMutationService
            .proceed(
              {
                remark: '',
                __v: 0,
              },
              targetData.id,
              account,
              token
            )
            .then(async (result) => {
              expect(result).toHaveProperty('transaction_date')
              expect(transactionMock).toHaveBeenCalled()

              expect(sendMock).toHaveBeenCalledWith({
                acks: -1,
                timeout: 5000,
                compression: CompressionTypes.None,
                topic: 'Asia/Jakarta',
                messages: [
                  {
                    headers: {
                      ...account,
                      token: token,
                    },
                    key: {
                      id: result.id.toString(),
                      code: result.id.toString(),
                      service: 'stock',
                      method: 'stock_movement',
                    },
                    value: {
                      batch: targetData.detail[0].batch,
                      from: result.from,
                      to: result.to,
                      qty: targetData.detail[0].qty,
                      transaction_id: result.id.toString(),
                      logged_at: new Date().toString(),
                    },
                  },
                ],
              })
            })
        }
      )
    }
  )

  describe(
    testCaption('NOTIFIER', 'data', 'Stock Mutation - Notification'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should send notification', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(socketProxy, 'reconnect').mockResolvedValue({
            emit: jest.fn(),
          })

          await gatewayInventoryMutationService
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
            await gatewayInventoryMutationService.notifier(
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
