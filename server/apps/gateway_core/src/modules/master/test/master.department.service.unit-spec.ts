import { mockAccount } from '@gateway_core/account/mock/account.mock'
import { mockAuthority } from '@gateway_core/account/mock/authority.mock'
import {
  masterDepartmentDocArray,
  mockMasterDepartment,
  mockMasterDepartmentModel,
} from '@gateway_core/master/mock/master.department.mock'
import { MasterDepartmentService } from '@gateway_core/master/services/master.department.service'
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
  MasterDepartment,
  MasterDepartmentDocument,
} from '@schemas/master/master.department'
import { AuthService } from '@security/auth.service'
import { GlobalResponse } from '@utility/dto/response'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { modCodes } from '@utility/modules'
import { testCaption } from '@utility/string'
import { Model } from 'mongoose'

describe('Master Department Service', () => {
  let configService: ConfigService
  let masterDepartmentService: MasterDepartmentService
  let masterDepartmentModel: Model<MasterDepartment>

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [],
      providers: [
        MasterDepartmentService,
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
          provide: getModelToken(MasterDepartment.name, 'primary'),
          useValue: mockMasterDepartmentModel,
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

    masterDepartmentService = module.get<MasterDepartmentService>(
      MasterDepartmentService
    )
    masterDepartmentModel = module.get<Model<MasterDepartmentDocument>>(
      getModelToken(MasterDepartment.name, 'primary')
    )

    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it(
    testCaption('SERVICE STATE', 'component', 'Service should be defined'),
    () => {
      expect(masterDepartmentService).toBeDefined()
    }
  )

  describe(
    testCaption('GET DATA', 'data', 'Master Department - Fetch list'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Response validity', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(masterDepartmentModel, 'aggregate').mockReturnValue({
            exec: jest.fn().mockReturnValue(masterDepartmentDocArray),
          } as any)
          await masterDepartmentService
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
                'MASTER_DEPARTMENT_LIST'
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
              expect(result.payload['data']).toEqual(masterDepartmentDocArray)
            })
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Response error on fetch data', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(masterDepartmentModel, 'aggregate').mockImplementation({
            exec: jest.fn().mockRejectedValue(new Error()),
          } as any)

          await expect(
            masterDepartmentService.all({
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
    testCaption('GET DETAIL', 'data', 'Master Department - Fetch detail'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Response validity', {
          tab: 1,
        }),
        async () => {
          const findMock = masterDepartmentDocArray[0]
          masterDepartmentModel.findOne = jest
            .fn()
            .mockImplementationOnce(() => {
              return Promise.resolve(findMock)
            })

          await masterDepartmentService
            .detail(findMock.id)
            .then((result: GlobalResponse) => {
              // Deep equality check
              expect(result.payload).toEqual(findMock)

              // Should classify transaction
              expect(result.transaction_classify).toEqual(
                'MASTER_DEPARTMENT_GET'
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
          const targetData = masterDepartmentDocArray[0]

          jest
            .spyOn(masterDepartmentModel, 'findOne')
            .mockImplementationOnce(() => {
              throw new Error()
            })

          await expect(async () => {
            await masterDepartmentService.detail(targetData.id)
          }).rejects.toThrow(Error)
        }
      )
    }
  )

  describe(
    testCaption('ADD DATA', 'data', 'Master Department - Add new data'),
    () => {
      it(
        testCaption('DATA', 'data', 'Should add new master department'),
        async () => {
          jest.spyOn(masterDepartmentModel, 'create')

          await masterDepartmentService
            .add(mockMasterDepartment(), mockAccount())
            .then((result: GlobalResponse) => {
              // Should create id
              expect(result.payload).toHaveProperty('id')

              // Should classify transaction
              expect(result.transaction_classify).toEqual(
                'MASTER_DEPARTMENT_ADD'
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
          jest.spyOn(masterDepartmentService, 'add')
          const dataTest = mockMasterDepartment()
          delete dataTest.code
          await masterDepartmentService
            .add(dataTest, mockAccount())
            .then((result: GlobalResponse) => {
              // Should create id
              expect(result.payload).toHaveProperty('id')

              expect(result.payload).toHaveProperty('code')

              expect(result.payload['code']).not.toBe('')

              // Should classify transaction
              expect(result.transaction_classify).toEqual(
                'MASTER_DEPARTMENT_ADD'
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
            .spyOn(masterDepartmentModel, 'create')
            .mockImplementationOnce(() => {
              throw new Error()
            })

          await expect(async () => {
            await masterDepartmentService.add(
              mockMasterDepartment(),
              mockAccount()
            )
          }).rejects.toThrow(Error)
        }
      )
    }
  )

  describe(
    testCaption('EDIT DATA', 'data', 'Master Department - Edit data'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should edit master department', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(masterDepartmentModel, 'findOneAndUpdate')

          await masterDepartmentService
            .edit(
              {
                ...mockMasterDepartment(),
                __v: 0,
              },
              masterDepartmentDocArray[0].id
            )
            .then((result: GlobalResponse) => {
              // Should create id
              expect(result.payload).toHaveProperty('id')

              // Should classify transaction
              expect(result.transaction_classify).toEqual(
                'MASTER_DEPARTMENT_EDIT'
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
            .spyOn(masterDepartmentModel, 'findOneAndUpdate')
            .mockReturnValue(null)

          await expect(async () => {
            await masterDepartmentService.edit(
              {
                ...mockMasterDepartment(),
                __v: 0,
              },
              masterDepartmentDocArray[0].id
            )
          }).rejects.toThrow(Error)
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Response error on edit data', {
          tab: 1,
        }),
        async () => {
          const targetID = mockMasterDepartment().id
          jest
            .spyOn(masterDepartmentModel, 'findOneAndUpdate')
            .mockImplementationOnce(() => {
              throw new Error()
            })

          await expect(async () => {
            await masterDepartmentService.edit(
              {
                ...mockMasterDepartment(),
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
    testCaption('DELETE DATA', 'data', 'Master department - Delete data'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should delete master department', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')

          jest
            .spyOn(masterDepartmentModel, 'findOneAndUpdate')
            .mockResolvedValue({
              statusCode: {
                defaultCode: HttpStatus.OK,
                customCode: modCodes.Global.success,
                classCode: '',
              },
              message: 'Delete success message',
              payload: {},
              transaction_classify: 'MASTER_DEPARTMENT_DELETE',
              transaction_id: '',
            } satisfies GlobalResponse)

          await masterDepartmentService
            .delete(masterDepartmentDocArray[0].id)
            .then((result: GlobalResponse) => {
              // Should classify transaction
              expect(result.transaction_classify).toEqual(
                'MASTER_DEPARTMENT_DELETE'
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
          const targetID = mockMasterDepartment().id
          jest
            .spyOn(masterDepartmentModel, 'findOneAndUpdate')
            .mockImplementationOnce(() => {
              throw new Error()
            })

          await expect(async () => {
            await masterDepartmentService.delete(targetID)
          }).rejects.toThrow(Error)
        }
      )
    }
  )

  afterAll(async () => {
    jest.clearAllMocks()
  })
})
