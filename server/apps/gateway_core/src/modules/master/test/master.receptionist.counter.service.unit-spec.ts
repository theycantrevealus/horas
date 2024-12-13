import { AccountService } from '@gateway_core/account/account.service'
import {
  accountDocArray,
  mockAccount,
} from '@gateway_core/account/mock/account.mock'
import { mockAuthority } from '@gateway_core/account/mock/authority.mock'
import {
  masterReceptionistCounterDocArray,
  mockMasterReceptionistCounter,
  mockMasterReceptionistCounterModel,
} from '@gateway_core/master/mock/master.receptionist.counter.mock'
import { MasterReceptionistCounterService } from '@gateway_core/master/services/master.receptionist.counter.service'
import { LogActivity } from '@log/schemas/log.activity'
import { LogLogin } from '@log/schemas/log.login'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { HttpStatus } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { getModelToken } from '@nestjs/mongoose'
import { Test, TestingModule } from '@nestjs/testing'
import { Account } from '@schemas/account/account.model'
import { Authority } from '@schemas/account/authority.model'
import {
  MasterReceptionistCounter,
  MasterReceptionistCounterDocument,
} from '@schemas/master/master.receptionist.counter'
import { AuthService } from '@security/auth.service'
import { GlobalResponse } from '@utility/dto/response'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { modCodes } from '@utility/modules'
import { testCaption } from '@utility/string'
import { Model } from 'mongoose'

describe('Master Receptionist Counter Service', () => {
  let configService: ConfigService
  let masterReceptionistCounterService: MasterReceptionistCounterService
  let masterReceptionistCounterModel: Model<MasterReceptionistCounter>

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [],
      providers: [
        MasterReceptionistCounterService,
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
          provide: getModelToken(MasterReceptionistCounter.name, 'primary'),
          useValue: mockMasterReceptionistCounterModel,
        },
        {
          provide: getModelToken(Account.name, 'primary'),
          useValue: {},
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

    masterReceptionistCounterService =
      module.get<MasterReceptionistCounterService>(
        MasterReceptionistCounterService
      )
    masterReceptionistCounterModel = module.get<
      Model<MasterReceptionistCounterDocument>
    >(getModelToken(MasterReceptionistCounter.name, 'primary'))

    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it(
    testCaption('SERVICE STATE', 'component', 'Service should be defined'),
    () => {
      expect(masterReceptionistCounterService).toBeDefined()
    }
  )

  describe(
    testCaption('GET DATA', 'data', 'Master Receptionist Counter - Fetch list'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Response validity', {
          tab: 1,
        }),
        async () => {
          jest
            .spyOn(masterReceptionistCounterModel, 'aggregate')
            .mockReturnValue({
              exec: jest
                .fn()
                .mockReturnValue(masterReceptionistCounterDocArray),
            } as any)
          await masterReceptionistCounterService
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
              expect(result.transaction_classify).toEqual(
                'MASTER_RECEPTIONIST_COUNTER_LIST'
              )

              // Not an empty string so be informative
              expect(result.message).not.toBe('')

              // Should return success code
              expect(result.statusCode.customCode).toEqual(
                modCodes.Global.success
              )

              // Should be an array of data
              expect(result.payload['data']).toBeInstanceOf(Array)

              // Data should be defined
              expect(result.payload['data']).toEqual(
                masterReceptionistCounterDocArray
              )
            })
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Response error on fetch data', {
          tab: 1,
        }),
        async () => {
          jest
            .spyOn(masterReceptionistCounterModel, 'aggregate')
            .mockImplementation({
              exec: jest.fn().mockRejectedValue(new Error()),
            } as any)

          await expect(
            masterReceptionistCounterService.all({
              first: 0,
              rows: 10,
              sortField: 'created_at',
              sortOrder: 1,
              filters: {},
            })
          ).rejects.toThrow(Error)
        }
      )
    }
  )

  describe(
    testCaption(
      'GET DETAIL',
      'data',
      'Master Receptionist Counter - Fetch detail'
    ),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Response validity', {
          tab: 1,
        }),
        async () => {
          const findMock = masterReceptionistCounterDocArray[0]
          masterReceptionistCounterModel.findOne = jest
            .fn()
            .mockImplementationOnce(() => {
              return Promise.resolve(findMock)
            })

          await masterReceptionistCounterService
            .detail(findMock.id)
            .then((result: GlobalResponse) => {
              // Deep equality check
              expect(result.payload).toEqual(findMock)

              // Should classify transaction
              expect(result.transaction_classify).toEqual(
                'MASTER_RECEPTIONIST_COUNTER_GET'
              )

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
          const targetData = masterReceptionistCounterDocArray[0]

          jest
            .spyOn(masterReceptionistCounterModel, 'findOne')
            .mockImplementationOnce(() => {
              throw new Error()
            })

          await expect(async () => {
            await masterReceptionistCounterService.detail(targetData.id)
          }).rejects.toThrow(Error)
        }
      )
    }
  )

  describe(
    testCaption(
      'ADD DATA',
      'data',
      'Master Receptionist Counter - Add new data'
    ),
    () => {
      it(
        testCaption(
          'DATA',
          'data',
          'Should add new master receptionist counter'
        ),
        async () => {
          jest.spyOn(masterReceptionistCounterModel, 'create')

          await masterReceptionistCounterService
            .add(mockMasterReceptionistCounter(), mockAccount())
            .then((result: GlobalResponse) => {
              // Should create id
              expect(result.payload).toHaveProperty('id')

              // Should classify transaction
              expect(result.transaction_classify).toEqual(
                'MASTER_RECEPTIONIST_COUNTER_ADD'
              )

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
          jest.spyOn(masterReceptionistCounterService, 'add')
          const dataTest = mockMasterReceptionistCounter()
          delete dataTest.code
          await masterReceptionistCounterService
            .add(dataTest, mockAccount())
            .then((result: GlobalResponse) => {
              // Should create id
              expect(result.payload).toHaveProperty('id')

              expect(result.payload).toHaveProperty('code')

              expect(result.payload['code']).not.toBe('')

              // Should classify transaction
              expect(result.transaction_classify).toEqual(
                'MASTER_RECEPTIONIST_COUNTER_ADD'
              )

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
          jest
            .spyOn(masterReceptionistCounterModel, 'create')
            .mockImplementationOnce(() => {
              throw new Error()
            })

          await expect(async () => {
            await masterReceptionistCounterService.add(
              mockMasterReceptionistCounter(),
              mockAccount()
            )
          }).rejects.toThrow(Error)
        }
      )
    }
  )

  describe(
    testCaption('EDIT DATA', 'data', 'Master Receptionist Counter - Edit data'),
    () => {
      it(
        testCaption(
          'HANDLING',
          'data',
          'Should edit master receptionist counter',
          {
            tab: 1,
          }
        ),
        async () => {
          jest.spyOn(masterReceptionistCounterModel, 'findOneAndUpdate')

          await masterReceptionistCounterService
            .edit(
              {
                ...mockMasterReceptionistCounter(),
                __v: 0,
              },
              accountDocArray[0].id
            )
            .then((result: GlobalResponse) => {
              // Should create id
              expect(result.payload).toHaveProperty('id')

              // Should classify transaction
              expect(result.transaction_classify).toEqual(
                'MASTER_RECEPTIONIST_COUNTER_EDIT'
              )

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
          const targetID = mockMasterReceptionistCounter().id
          jest
            .spyOn(masterReceptionistCounterModel, 'findOneAndUpdate')
            .mockImplementationOnce(() => {
              throw new Error()
            })

          await expect(async () => {
            await masterReceptionistCounterService.edit(
              {
                ...mockMasterReceptionistCounter(),
                __v: 0,
              },
              targetID
            )
          }).rejects.toThrow(Error)
        }
      )
    }
  )

  describe(
    testCaption(
      'DELETE DATA',
      'data',
      'Master receptionist counter - Delete data'
    ),
    () => {
      it(
        testCaption(
          'HANDLING',
          'data',
          'Should delete master receptionist counter',
          {
            tab: 1,
          }
        ),
        async () => {
          jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')

          jest
            .spyOn(masterReceptionistCounterModel, 'findOneAndUpdate')
            .mockResolvedValue({
              statusCode: {
                defaultCode: HttpStatus.OK,
                customCode: modCodes.Global.success,
                classCode: '',
              },
              message: 'Delete success message',
              payload: {},
              transaction_classify: 'MASTER_RECEPTIONIST_COUNTER_DELETE',
              transaction_id: '',
            } satisfies GlobalResponse)

          await masterReceptionistCounterService
            .delete(masterReceptionistCounterDocArray[0].id)
            .then((result: GlobalResponse) => {
              // Should classify transaction
              expect(result.transaction_classify).toEqual(
                'MASTER_RECEPTIONIST_COUNTER_DELETE'
              )

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
          const targetID = mockMasterReceptionistCounter().id

          jest
            .spyOn(masterReceptionistCounterModel, 'findOneAndUpdate')
            .mockImplementationOnce(() => {
              throw new Error()
            })

          await expect(async () => {
            await masterReceptionistCounterService.delete(targetID)
          }).rejects.toThrow(Error)
        }
      )
    }
  )

  afterAll(async () => {
    jest.clearAllMocks()
  })
})
