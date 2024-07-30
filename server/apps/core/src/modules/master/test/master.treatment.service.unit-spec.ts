import { mockAccount } from '@core/account/mock/account.mock'
import { mockAuthority } from '@core/account/mock/authority.mock'
import {
  masterTreatmentDocArray,
  mockMasterTreatment,
  mockMasterTreatmentModel,
} from '@core/master/mock/master.treatment.mock'
import { MasterTreatmentService } from '@core/master/services/master.treatment.service'
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
  MasterTreatment,
  MasterTreatmentDocument,
} from '@schemas/master/master.treatment'
import { AuthService } from '@security/auth.service'
import { GlobalResponse } from '@utility/dto/response'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { modCodes } from '@utility/modules'
import { testCaption } from '@utility/string'
import { Model } from 'mongoose'

describe('Master Treatment Service', () => {
  let configService: ConfigService
  let masterTreatmentService: MasterTreatmentService
  let masterTreatmentModel: Model<MasterTreatment>

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [],
      providers: [
        MasterTreatmentService,
        AuthService,
        JwtService,
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
          provide: getModelToken(MasterTreatment.name, 'primary'),
          useValue: mockMasterTreatmentModel,
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

    masterTreatmentService = module.get<MasterTreatmentService>(
      MasterTreatmentService
    )
    masterTreatmentModel = module.get<Model<MasterTreatmentDocument>>(
      getModelToken(MasterTreatment.name, 'primary')
    )

    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it(
    testCaption('SERVICE STATE', 'component', 'Service should be defined'),
    () => {
      expect(masterTreatmentService).toBeDefined()
    }
  )

  describe(
    testCaption('GET DATA', 'data', 'Master Treatment - Fetch list'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Response validity', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(masterTreatmentModel, 'aggregate').mockReturnValue({
            exec: jest.fn().mockReturnValue(masterTreatmentDocArray),
          } as any)
          await masterTreatmentService
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
                'MASTER_TREATMENT_LIST'
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
              expect(result.payload['data']).toEqual(masterTreatmentDocArray)
            })
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Response error on fetch data', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(masterTreatmentModel, 'aggregate').mockImplementation({
            exec: jest.fn().mockRejectedValue(new Error()),
          } as any)

          await expect(
            masterTreatmentService.all({
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
    testCaption('GET DETAIL', 'data', 'Master Treatment - Fetch detail'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Response validity', {
          tab: 1,
        }),
        async () => {
          const findMock = masterTreatmentDocArray[0]
          masterTreatmentModel.findOne = jest
            .fn()
            .mockImplementationOnce(() => {
              return Promise.resolve(findMock)
            })

          await masterTreatmentService
            .detail(findMock.id)
            .then((result: GlobalResponse) => {
              // Deep equality check
              expect(result.payload).toEqual(findMock)

              // Should classify transaction
              expect(result.transaction_classify).toEqual(
                'MASTER_TREATMENT_GET'
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
          const targetData = masterTreatmentDocArray[0]

          jest
            .spyOn(masterTreatmentModel, 'findOne')
            .mockImplementationOnce(() => {
              throw new Error()
            })

          await expect(async () => {
            await masterTreatmentService.detail(targetData.id)
          }).rejects.toThrow(Error)
        }
      )
    }
  )

  describe(
    testCaption('ADD DATA', 'data', 'Master Treatment - Add new data'),
    () => {
      it(
        testCaption('DATA', 'data', 'Should add new master treatment'),
        async () => {
          jest.spyOn(masterTreatmentModel, 'create')

          await masterTreatmentService
            .add(mockMasterTreatment(), mockAccount())
            .then((result: GlobalResponse) => {
              // Should create id
              expect(result.payload).toHaveProperty('id')

              // Should classify transaction
              expect(result.transaction_classify).toEqual(
                'MASTER_TREATMENT_ADD'
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
          jest.spyOn(masterTreatmentService, 'add')
          const dataTest = mockMasterTreatment()
          delete dataTest.code
          await masterTreatmentService
            .add(dataTest, mockAccount())
            .then((result: GlobalResponse) => {
              // Should create id
              expect(result.payload).toHaveProperty('id')

              expect(result.payload).toHaveProperty('code')

              expect(result.payload['code']).not.toBe('')

              // Should classify transaction
              expect(result.transaction_classify).toEqual(
                'MASTER_TREATMENT_ADD'
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
            .spyOn(masterTreatmentModel, 'create')
            .mockImplementationOnce(() => {
              throw new Error()
            })

          await expect(async () => {
            await masterTreatmentService.add(
              mockMasterTreatment(),
              mockAccount()
            )
          }).rejects.toThrow(Error)
        }
      )
    }
  )

  describe(
    testCaption('EDIT DATA', 'data', 'Master Treatment - Edit data'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should edit master treatment', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(masterTreatmentModel, 'findOneAndUpdate')

          await masterTreatmentService
            .edit(
              {
                ...mockMasterTreatment(),
                __v: 0,
              },
              masterTreatmentDocArray[0].id
            )
            .then((result: GlobalResponse) => {
              // Should create id
              expect(result.payload).toHaveProperty('id')

              // Should classify transaction
              expect(result.transaction_classify).toEqual(
                'MASTER_TREATMENT_EDIT'
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
        testCaption('HANDLING', 'data', 'Response error if data is not found', {
          tab: 1,
        }),
        async () => {
          jest
            .spyOn(masterTreatmentModel, 'findOneAndUpdate')
            .mockReturnValue(null)

          await expect(async () => {
            await masterTreatmentService.edit(
              {
                ...mockMasterTreatment(),
                __v: 0,
              },
              masterTreatmentDocArray[0].id
            )
          }).rejects.toThrow(Error)
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Response error on edit data', {
          tab: 1,
        }),
        async () => {
          const targetID = mockMasterTreatment().id
          jest
            .spyOn(masterTreatmentModel, 'findOneAndUpdate')
            .mockImplementationOnce(() => {
              throw new Error()
            })

          await expect(async () => {
            await masterTreatmentService.edit(
              {
                ...mockMasterTreatment(),
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
    testCaption('DELETE DATA', 'data', 'Master treatment - Delete data'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should delete master treatment', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')

          jest
            .spyOn(masterTreatmentModel, 'findOneAndUpdate')
            .mockResolvedValue({
              statusCode: {
                defaultCode: HttpStatus.OK,
                customCode: modCodes.Global.success,
                classCode: '',
              },
              message: 'Delete success message',
              payload: {},
              transaction_classify: 'MASTER_TREATMENT_DELETE',
              transaction_id: '',
            } satisfies GlobalResponse)

          await masterTreatmentService
            .delete(masterTreatmentDocArray[0].id)
            .then((result: GlobalResponse) => {
              // Should classify transaction
              expect(result.transaction_classify).toEqual(
                'MASTER_TREATMENT_DELETE'
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
          const targetID = mockMasterTreatment().id
          jest
            .spyOn(masterTreatmentModel, 'findOneAndUpdate')
            .mockImplementationOnce(() => {
              throw new Error()
            })

          await expect(async () => {
            await masterTreatmentService.delete(targetID)
          }).rejects.toThrow(Error)
        }
      )
    }
  )

  afterAll(async () => {
    jest.clearAllMocks()
  })
})
