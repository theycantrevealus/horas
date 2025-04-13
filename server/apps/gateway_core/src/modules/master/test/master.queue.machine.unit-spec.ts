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
} from '@gateway_core/master/mock/master.queue.machine.mock'
import { MasterQueueMachineService } from '@gateway_core/master/services/master.queue.machine.service'
import { LogActivity } from '@log/schemas/log.activity'
import { LogLogin } from '@log/schemas/log.login'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { getModelToken } from '@nestjs/mongoose'
import { Test, TestingModule } from '@nestjs/testing'
import { Account } from '@schemas/account/account.model'
import { Authority } from '@schemas/account/authority.model'
import {
  MasterQueueMachine,
  MasterQueueMachineDocument,
} from '@schemas/master/master.queue.machine'
import { AuthService } from '@security/auth.service'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { testCaption } from '@utility/string'
import { Model } from 'mongoose'

describe('Master Queue Service', () => {
  let masterQueueService: MasterQueueMachineService
  let configService: ConfigService
  let masterQueueModel: Model<MasterQueueMachine>

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [],
      providers: [
        MasterQueueMachineService,
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
          provide: getModelToken(MasterQueueMachine.name, 'primary'),
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

    masterQueueService = module.get<MasterQueueMachineService>(
      MasterQueueMachineService
    )
    configService = module.get<ConfigService>(ConfigService)
    masterQueueModel = module.get<Model<MasterQueueMachineDocument>>(
      getModelToken(MasterQueueMachine.name, 'primary')
    )

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
          .then((result) => {
            // Should be an array of data
            expect(result.data).toBeInstanceOf(Array)

            // Data should be defined
            expect(result.data).toEqual(masterQueueDocArray)
          })
      }
    )

    it(
      testCaption('HANDLING', 'data', 'Response error on fetch data', {
        tab: 1,
      }),
      async () => {
        jest.spyOn(JSON, 'parse').mockImplementation(() => ({}))

        jest.spyOn(mockMasterQueueModel, 'aggregate').mockImplementation({
          exec: jest.fn().mockRejectedValue(new Error()),
        } as any)

        await expect(masterQueueService.all(``)).rejects.toThrow(Error)
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

          await masterQueueService.detail(findMock.id).then((result) => {
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
          jest.spyOn(masterQueueModel, 'findOne').mockResolvedValue(null)
          await expect(async () => {
            await masterQueueService.detail(mockMasterQueue().id)
          }).rejects.toThrow(NotFoundException)
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Response error on get detail data', {
          tab: 1,
        }),
        async () => {
          const targetData = masterQueueDocArray[0]

          jest.spyOn(masterQueueModel, 'findOne').mockRejectedValue(() => {
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
            .then((result) => {
              // Should create id
              expect(result).toHaveProperty('id')
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
            .then((result) => {
              // Should create id
              expect(result).toHaveProperty('id')

              expect(result).toHaveProperty('code')

              expect(result.code).not.toBe('')
            })
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Response error on add data', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(masterQueueModel, 'create').mockRejectedValue(() => {
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
        const targetID = mockMasterQueue().id
        jest.spyOn(masterQueueModel, 'findOneAndUpdate').mockResolvedValue(null)

        await expect(async () => {
          await masterQueueService.edit(
            {
              ...mockMasterQueue(),
              __v: 0,
            },
            targetID
          )
        }).rejects.toThrow(NotFoundException)
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
        testCaption('HANDLING', 'data', 'Response error if data is not found', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')
          const targetID = mockMasterItemUnit().id
          jest
            .spyOn(masterQueueModel, 'findOneAndUpdate')
            .mockResolvedValue(null)

          await expect(async () => {
            await masterQueueService.delete(targetID)
          }).rejects.toThrow(NotFoundException)
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Response error on delete data', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')
          const targetID = mockMasterItemUnit().id
          jest
            .spyOn(masterQueueModel, 'findOneAndUpdate')
            .mockRejectedValue(new Error())

          await expect(async () => {
            await masterQueueService.delete(targetID)
          }).rejects.toThrow(Error)
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Should success delete data', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')
          jest
            .spyOn(masterQueueModel, 'findOneAndUpdate')
            .mockResolvedValue(masterQueueDocArray[0])

          await masterQueueService
            .delete(masterQueueDocArray[0].id)
            .then((result) => {
              // Should return code if document found
              expect(result).toHaveProperty('code')
            })
        }
      )
    }
  )

  afterEach(() => {
    jest.clearAllMocks()
  })

  afterAll(async () => {
    jest.clearAllMocks()
  })
})
