import { AccountService } from '@gateway_core/account/account.service'
import {
  accountDocArray,
  mockAccount,
  mockAccountModel,
} from '@gateway_core/account/mock/account.mock'
import { mockAuthority } from '@gateway_core/account/mock/authority.mock'
import {
  masterItemCategoryDocArray,
  mockMasterItemCategory,
  mockMasterItemCategoryModel,
} from '@gateway_core/master/mock/master.item.category.mock'
import { MasterItemCategoryService } from '@gateway_core/master/services/master.item.category.service'
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
  MasterItemCategory,
  MasterItemCategoryDocument,
} from '@schemas/master/master.item.category'
import { IMasterItemCategory } from '@schemas/master/master.item.category.interface'
import { AuthService } from '@security/auth.service'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { testCaption } from '@utility/string'
import { Model } from 'mongoose'

describe('Master Item Category Service', () => {
  let masterItemCategoryService: MasterItemCategoryService
  let configService: ConfigService
  let masterItemCategoryModel: Model<MasterItemCategory>
  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [],
      providers: [
        MasterItemCategoryService,
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
          provide: getModelToken(MasterItemCategory.name, 'primary'),
          useValue: mockMasterItemCategoryModel,
        },
        {
          provide: getModelToken(Account.name, 'primary'),
          useValue: mockAccountModel,
        },
        {
          provide: getModelToken(Authority.name, 'primary'),
          useValue: mockAuthority,
        },
        { provide: getModelToken(LogActivity.name, 'primary'), useValue: {} },
        { provide: getModelToken(LogLogin.name, 'primary'), useValue: {} },
      ],
    }).compile()

    masterItemCategoryService = module.get<MasterItemCategoryService>(
      MasterItemCategoryService
    )
    configService = module.get<ConfigService>(ConfigService)
    masterItemCategoryModel = module.get<Model<MasterItemCategoryDocument>>(
      getModelToken(MasterItemCategory.name, 'primary')
    )

    jest.clearAllMocks()
  })

  it(
    testCaption('SERVICE STATE', 'component', 'Service should be defined'),
    () => {
      expect(masterItemCategoryService).toBeDefined()
    }
  )

  describe(
    testCaption('GET DATA', 'data', 'Master Item Category - Fetch list'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Response validity', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(masterItemCategoryModel, 'aggregate').mockReturnValue({
            exec: jest.fn().mockReturnValue(masterItemCategoryDocArray),
          } as any)
          await masterItemCategoryService
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
              expect(result.data).toEqual(masterItemCategoryDocArray)
            })
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Response error on fetch data', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(JSON, 'parse').mockImplementation(() => ({}))

          jest.spyOn(masterItemCategoryModel, 'aggregate').mockImplementation({
            exec: jest.fn().mockRejectedValue(new Error()),
          } as any)

          await expect(masterItemCategoryService.all('')).rejects.toThrow(Error)
        }
      )
    }
  )

  describe(
    testCaption('GET DETAIL', 'data', 'Master Item Category - Fetch detail'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Response validity', {
          tab: 1,
        }),
        async () => {
          const findMock = masterItemCategoryDocArray[0]
          masterItemCategoryModel.findOne = jest
            .fn()
            .mockImplementationOnce(() => {
              return Promise.resolve(findMock)
            })

          await masterItemCategoryService.detail(findMock.id).then((result) => {
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
          jest.spyOn(masterItemCategoryModel, 'findOne').mockResolvedValue(null)
          await expect(async () => {
            await masterItemCategoryService.detail(
              masterItemCategoryDocArray[0].id
            )
          }).rejects.toThrow(NotFoundException)
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Response error on get detail data', {
          tab: 1,
        }),
        async () => {
          const targetData = masterItemCategoryDocArray[0]

          jest
            .spyOn(masterItemCategoryModel, 'findOne')
            .mockRejectedValue(() => {
              throw new Error()
            })

          await expect(async () => {
            await masterItemCategoryService.detail(targetData.id)
          }).rejects.toThrow(Error)
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Response validity', {
          tab: 1,
        }),
        async () => {
          const findMock = masterItemCategoryDocArray[0]
          masterItemCategoryModel.findOne = jest
            .fn()
            .mockImplementationOnce(() => {
              return Promise.resolve(findMock)
            })

          await masterItemCategoryService
            .find({ code: findMock.code })
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
          jest.spyOn(masterItemCategoryModel, 'findOne').mockResolvedValue(null)
          await expect(async () => {
            await masterItemCategoryService.find({
              code: masterItemCategoryDocArray[0].code,
            })
          }).rejects.toThrow(NotFoundException)
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Response error on get detail data', {
          tab: 1,
        }),
        async () => {
          const targetData = masterItemCategoryDocArray[0]

          jest
            .spyOn(masterItemCategoryModel, 'findOne')
            .mockRejectedValue(() => {
              throw new Error()
            })

          await expect(async () => {
            await masterItemCategoryService.find({ code: targetData.code })
          }).rejects.toThrow(Error)
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Response validity', {
          tab: 1,
        }),
        async () => {
          // const addCall = jest.spyOn(masterItemCategoryService, 'add')
          const findMock = masterItemCategoryDocArray[0]
          masterItemCategoryModel.findOne = jest
            .fn()
            .mockImplementationOnce(() => {
              return Promise.resolve(findMock)
            })

          await masterItemCategoryService
            .upsert({ name: mockMasterItemCategory().name }, mockAccount())
            .then((result: IMasterItemCategory) => {
              expect(result).not.toBe('')
            })
        }
      )
    }
  )

  describe(
    testCaption('ADD DATA', 'data', 'Master Item Category - Add new data'),
    () => {
      it(
        testCaption('DATA', 'data', 'Should add new master item category'),
        async () => {
          jest.spyOn(masterItemCategoryModel, 'create')

          await masterItemCategoryService
            .add(mockMasterItemCategory(), mockAccount())
            .then((result) => {
              // Should create id
              expect(result).toHaveProperty('id')
            })
        }
      )

      it(
        testCaption('DATA', 'data', 'Should replace code if not defined'),
        async () => {
          jest.spyOn(masterItemCategoryService, 'add')
          const dataTest = mockMasterItemCategory()
          delete dataTest.code
          await masterItemCategoryService
            .add(dataTest, mockAccount())
            .then((result) => {
              // Should create id
              expect(result).toHaveProperty('id')

              expect(result).toHaveProperty('code')
            })
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Response error on add data', {
          tab: 1,
        }),
        async () => {
          jest
            .spyOn(masterItemCategoryModel, 'create')
            .mockRejectedValue(() => {
              throw new Error()
            })

          await expect(async () => {
            await masterItemCategoryService.add(
              mockMasterItemCategory(),
              mockAccount()
            )
          }).rejects.toThrow(Error)
        }
      )
    }
  )

  describe(
    testCaption('EDIT DATA', 'data', 'Master Item Category - Edit data'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should edit master item category', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(masterItemCategoryModel, 'findOneAndUpdate')

          await masterItemCategoryService
            .edit(
              {
                ...mockMasterItemCategory(),
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
          const targetID = mockMasterItemCategory().id
          jest
            .spyOn(masterItemCategoryModel, 'findOneAndUpdate')
            .mockResolvedValue(null)

          await expect(async () => {
            await masterItemCategoryService.edit(
              { ...mockMasterItemCategory(), __v: 0 },
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
          const targetID = mockMasterItemCategory().id
          jest
            .spyOn(masterItemCategoryModel, 'findOneAndUpdate')
            .mockRejectedValue(() => {
              throw new Error()
            })

          await expect(async () => {
            await masterItemCategoryService.edit(
              {
                ...mockMasterItemCategory(),
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
    testCaption('DELETE DATA', 'data', 'Master item category - Delete data'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Response error if data is not found', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')
          const targetID = mockMasterItemCategory().id
          jest
            .spyOn(masterItemCategoryModel, 'findOneAndUpdate')
            .mockResolvedValue(null)

          await expect(async () => {
            await masterItemCategoryService.delete(targetID)
          }).rejects.toThrow(NotFoundException)
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Response error on delete data', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')
          const targetID = mockMasterItemCategory().id
          jest
            .spyOn(masterItemCategoryModel, 'findOneAndUpdate')
            .mockRejectedValue(new Error())

          await expect(async () => {
            await masterItemCategoryService.delete(targetID)
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
            .spyOn(masterItemCategoryModel, 'findOneAndUpdate')
            .mockResolvedValue(masterItemCategoryDocArray[0])

          await masterItemCategoryService
            .delete(masterItemCategoryDocArray[0].id)
            .then((result) => {
              // Should return code if document found
              expect(result).toHaveProperty('name')
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
