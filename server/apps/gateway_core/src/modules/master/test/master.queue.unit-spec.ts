import { AccountService } from '@gateway_core/account/account.service'
import {
  accountDocArray,
  mockAccount,
  mockAccountModel,
} from '@gateway_core/account/mock/account.mock'
import { mockAuthority } from '@gateway_core/account/mock/authority.mock'
import { mockMasterItemUnit } from '@gateway_core/master/mock/master.item.unit.mock'
import {
  masterQueueDocArray,
  mockMasterQueue,
  mockMasterQueueModel,
} from '@gateway_core/master/mock/master.queue.mock'
import { MasterQueueService } from '@gateway_core/master/services/master.queue.service'
import { LogActivity } from '@log/schemas/log.activity'
import { LogLogin } from '@log/schemas/log.login'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { getModelToken } from '@nestjs/mongoose'
import { Test, TestingModule } from '@nestjs/testing'
import { Account } from '@schemas/account/account.model'
import { Authority } from '@schemas/account/authority.model'
import {
  MasterQueue,
  MasterQueueDocument,
} from '@schemas/master/master.queue.machine'
import { AuthService } from '@security/auth.service'
import { GlobalResponse } from '@utility/dto/response'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { modCodes } from '@utility/modules'
import { testCaption } from '@utility/string'
import { Model } from 'mongoose'

describe('Master Queue Service', () => {
  let masterQueueService: MasterQueueService
  let masterQueueModel: Model<MasterQueue>
  let configService: ConfigService

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [],
      providers: [
        MasterQueueService,
        AccountService,
        AuthService,
        JwtService,
        {
          provide: 'ACCOUNT_SERVICE',
          useValue: {
            emit: () => jest.fn(),
            transaction: () => jest.fn(),
          },
        },
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
            get: () => 'any value',
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
          provide: getModelToken(MasterQueue.name, 'primary'),
          useValue: mockMasterQueueModel,
        },
        {
          provide: getModelToken(Account.name, 'primary'),
          useValue: mockAccountModel,
        },
        {
          provide: getModelToken(Authority.name, 'primary'),
          useValue: mockAuthority,
        },
        {
          provide: getModelToken(Authority.name, 'primary'),
          useValue: mockAuthority,
        },
        { provide: getModelToken(LogActivity.name, 'primary'), useValue: {} },
        { provide: getModelToken(LogLogin.name, 'primary'), useValue: {} },
      ],
    }).compile()

    configService = module.get<ConfigService>(ConfigService)

    masterQueueService = module.get<MasterQueueService>(MasterQueueService)
    masterQueueModel = module.get<Model<MasterQueueDocument>>(
      getModelToken(MasterQueue.name, 'primary')
    )

    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it(
    testCaption('SERVICE STATE', 'component', 'Service should be defined'),
    () => {
      expect(masterQueueService).toBeDefined()
    }
  )

  describe(testCaption('GET DATA', 'data', 'Master Queue - Fetch list'), () => {
    it(
      testCaption('HANDLING', 'data', 'Response validity', {
        tab: 1,
      }),
      async () => {
        jest.spyOn(masterQueueModel, 'aggregate').mockReturnValue({
          exec: jest.fn().mockReturnValue(masterQueueDocArray),
        } as any)
        await masterQueueService
          .all(
            `{
              "first": 0,
              "rows": 10,
              "sortField": "created_at",
              "sortOrder": 1,
              "filters": {}
            }`
          )
          .then((result: GlobalResponse) => {
            // Should classify transaction
            expect(result.transaction_classify).toEqual('MASTER_QUEUE_LIST')

            // Not an empty string so be informative
            expect(result.message).not.toBe('')

            // Should return success code
            expect(result.statusCode.customCode).toEqual(
              modCodes.Global.success
            )

            // Should be an array of data
            expect(result.payload['data']).toBeInstanceOf(Array)

            // Data should be defined
            expect(result.payload['data']).toEqual(masterQueueDocArray)
          })
      }
    )

    it(
      testCaption('HANDLING', 'data', 'Response error on fetch data', {
        tab: 1,
      }),
      async () => {
        jest.spyOn(mockMasterQueueModel, 'aggregate').mockImplementation({
          exec: jest.fn().mockRejectedValue(new Error()),
        } as any)

        await expect(
          masterQueueService.all({
            first: 0,
            rows: 10,
            sortField: 'created_at',
            sortOrder: 1,
            filters: {},
          })
        ).rejects.toThrow(Error)
      }
    )
  })

  describe(
    testCaption('GET DETAIL', 'data', 'Master Queue - Fetch detail'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Response validity', {
          tab: 1,
        }),
        async () => {
          const findMock = masterQueueDocArray[0]
          masterQueueModel.findOne = jest.fn().mockImplementationOnce(() => {
            return Promise.resolve(findMock)
          })

          await masterQueueService
            .detail(findMock.id)
            .then((result: GlobalResponse) => {
              // Deep equality check
              expect(result.payload).toEqual(findMock)

              // Should classify transaction
              expect(result.transaction_classify).toEqual('MASTER_QUEUE_GET')

              // Not an empty string so be informative
              expect(result.message).not.toBe('')

              // Should return success code
              expect(result.statusCode.customCode).toEqual(
                modCodes.Global.success
              )
            })
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Response error on get detail data', {
          tab: 1,
        }),
        async () => {
          const targetData = masterQueueDocArray[0]

          jest.spyOn(masterQueueModel, 'findOne').mockImplementationOnce(() => {
            throw new Error()
          })

          await expect(async () => {
            await masterQueueService.detail(targetData.id)
          }).rejects.toThrow(Error)
        }
      )
    }
  )

  describe(
    testCaption('ADD DATA', 'data', 'Master Queue - Add new data'),
    () => {
      it(
        testCaption('DATA', 'data', 'Should add new master queue'),
        async () => {
          jest.spyOn(masterQueueModel, 'create')

          await masterQueueService
            .add(mockMasterQueue(), mockAccount())
            .then((result: GlobalResponse) => {
              // Should create id
              expect(result.payload).toHaveProperty('id')

              // Should classify transaction
              expect(result.transaction_classify).toEqual('MASTER_QUEUE_ADD')

              // Not an empty string so be informative
              expect(result.message).not.toBe('')

              // Should return success code
              expect(result.statusCode.customCode).toEqual(
                modCodes.Global.success
              )
            })
        }
      )

      it(
        testCaption('DATA', 'data', 'Should replace code if not defined'),
        async () => {
          jest.spyOn(masterQueueService, 'add')
          const dataTest = mockMasterQueue()
          delete dataTest.code
          await masterQueueService
            .add(dataTest, mockAccount())
            .then((result: GlobalResponse) => {
              // Should create id
              expect(result.payload).toHaveProperty('id')

              expect(result.payload).toHaveProperty('code')

              expect(result.payload['code']).not.toBe('')

              // Should classify transaction
              expect(result.transaction_classify).toEqual('MASTER_QUEUE_ADD')

              // Not an empty string so be informative
              expect(result.message).not.toBe('')

              // Should return success code
              expect(result.statusCode.customCode).toEqual(
                modCodes.Global.success
              )
            })
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Response error on add data', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(masterQueueModel, 'create').mockImplementationOnce(() => {
            throw new Error()
          })

          await expect(async () => {
            await masterQueueService.add(mockMasterQueue(), mockAccount())
          }).rejects.toThrow(Error)
        }
      )
    }
  )

  describe(testCaption('EDIT DATA', 'data', 'Master Queue - Edit data'), () => {
    it(
      testCaption('HANDLING', 'data', 'Should edit master queue', {
        tab: 1,
      }),
      async () => {
        jest.spyOn(masterQueueModel, 'findOneAndUpdate')

        await masterQueueService
          .edit(
            {
              ...mockMasterQueue(),
              __v: 0,
            },
            accountDocArray[0].id
          )
          .then((result: GlobalResponse) => {
            // Should create id
            expect(result.payload).toHaveProperty('id')

            // Should classify transaction
            expect(result.transaction_classify).toEqual('MASTER_QUEUE_EDIT')

            // Not an empty string so be informative
            expect(result.message).not.toBe('')

            // Should return success code
            expect(result.statusCode.customCode).toEqual(
              modCodes.Global.success
            )
          })
      }
    )

    it(
      testCaption('HANDLING', 'data', 'Response error on edit data', {
        tab: 1,
      }),
      async () => {
        const targetID = mockMasterItemUnit().id
        jest
          .spyOn(masterQueueModel, 'findOneAndUpdate')
          .mockImplementationOnce(() => {
            throw new Error()
          })

        await expect(async () => {
          await masterQueueService.edit(
            {
              ...mockMasterQueue(),
              __v: 0,
            },
            targetID
          )
        }).rejects.toThrow(Error)
      }
    )
  })

  describe(
    testCaption('DELETE DATA', 'data', 'Master Queue - Delete data'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should delete master queue', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')

          jest.spyOn(masterQueueModel, 'findOneAndUpdate')

          await masterQueueService
            .delete(masterQueueDocArray[0].id)
            .then((result: GlobalResponse) => {
              // Should classify transaction
              expect(result.transaction_classify).toEqual('MASTER_QUEUE_DELETE')

              // Not an empty string so be informative
              expect(result.message).not.toBe('')

              // Should return success code
              expect(result.statusCode.customCode).toEqual(
                modCodes.Global.success
              )
            })
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Response error on delete data', {
          tab: 1,
        }),
        async () => {
          const targetID = mockMasterItemUnit().id

          jest
            .spyOn(masterQueueModel, 'findOneAndUpdate')
            .mockImplementationOnce(() => {
              throw new Error()
            })

          await expect(async () => {
            await masterQueueService.delete(targetID)
          }).rejects.toThrow(Error)
        }
      )
    }
  )

  afterAll(async () => {
    jest.clearAllMocks()
  })
})
