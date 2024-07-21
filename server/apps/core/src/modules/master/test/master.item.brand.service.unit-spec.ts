import { AccountService } from '@core/account/account.service'
import { accountDocArray, mockAccount } from '@core/account/mock/account.mock'
import { mockAuthority } from '@core/account/mock/authority.mock'
import {
  masterItemBrandDocArray,
  mockMasterItemBrand,
  mockMasterItemBrandModel,
} from '@core/master/mock/master.item.brand.mock'
import { MasterItemBrandService } from '@core/master/services/master.item.brand.service'
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
  MasterItemBrand,
  MasterItemBrandDocument,
} from '@schemas/master/master.item.brand'
import { AuthService } from '@security/auth.service'
import { GlobalResponse } from '@utility/dto/response'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { modCodes } from '@utility/modules'
import { testCaption } from '@utility/string'
import { Model } from 'mongoose'

describe('Master Item Brand Service', () => {
  let configService: ConfigService
  let masterItemBrandService: MasterItemBrandService
  let masterItemBrandModel: Model<MasterItemBrand>

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [],
      providers: [
        MasterItemBrandService,
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
          provide: getModelToken(MasterItemBrand.name, 'primary'),
          useValue: mockMasterItemBrandModel,
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

    masterItemBrandService = module.get<MasterItemBrandService>(
      MasterItemBrandService
    )
    masterItemBrandModel = module.get<Model<MasterItemBrandDocument>>(
      getModelToken(MasterItemBrand.name, 'primary')
    )

    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it(
    testCaption('SERVICE STATE', 'component', 'Service should be defined'),
    () => {
      expect(masterItemBrandService).toBeDefined()
    }
  )

  describe(
    testCaption('GET DATA', 'data', 'Master Item Brand - Fetch list'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Response validity', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(masterItemBrandModel, 'aggregate').mockReturnValue({
            exec: jest.fn().mockReturnValue(masterItemBrandDocArray),
          } as any)
          await masterItemBrandService
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
                'MASTER_ITEM_BRAND_LIST'
              )

              // Not an empty string so be informative
              expect(result.message).not.toBe('')

              // Should return success code
              expect(result.statusCode.customCode).toEqual(
                modCodes.Global.success
              )

              // Should be an array of data
              expect(result.payload).toBeInstanceOf(Array)

              // Data should be defined
              expect(result.payload).toEqual(masterItemBrandDocArray)
            })
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Response error on fetch data', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(masterItemBrandModel, 'aggregate').mockImplementation({
            exec: jest.fn().mockRejectedValue(new Error()),
          } as any)

          await expect(
            masterItemBrandService.all({
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
    testCaption('GET DETAIL', 'data', 'Master Item Brand - Fetch detail'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Response validity', {
          tab: 1,
        }),
        async () => {
          const findMock = masterItemBrandDocArray[0]
          masterItemBrandModel.findOne = jest
            .fn()
            .mockImplementationOnce(() => {
              return Promise.resolve(findMock)
            })

          await masterItemBrandService
            .detail(findMock.id)
            .then((result: GlobalResponse) => {
              // Deep equality check
              expect(result.payload).toEqual(findMock)

              // Should classify transaction
              expect(result.transaction_classify).toEqual(
                'MASTER_ITEM_BRAND_GET'
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
          const targetData = masterItemBrandDocArray[0]

          jest
            .spyOn(masterItemBrandModel, 'findOne')
            .mockImplementationOnce(() => {
              throw new Error()
            })

          await expect(async () => {
            await masterItemBrandService.detail(targetData.id)
          }).rejects.toThrow(Error)
        }
      )
    }
  )

  describe(
    testCaption('ADD DATA', 'data', 'Master Item Brand - Add new data'),
    () => {
      it(
        testCaption('DATA', 'data', 'Should add new master item brand'),
        async () => {
          jest.spyOn(masterItemBrandModel, 'create')

          await masterItemBrandService
            .add(mockMasterItemBrand(), mockAccount())
            .then((result: GlobalResponse) => {
              // Should create id
              expect(result.payload).toHaveProperty('id')

              // Should classify transaction
              expect(result.transaction_classify).toEqual(
                'MASTER_ITEM_BRAND_ADD'
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
          jest.spyOn(masterItemBrandService, 'add')
          const dataTest = mockMasterItemBrand()
          delete dataTest.code
          await masterItemBrandService
            .add(dataTest, mockAccount())
            .then((result: GlobalResponse) => {
              // Should create id
              expect(result.payload).toHaveProperty('id')

              expect(result.payload).toHaveProperty('code')

              expect(result.payload['code']).not.toBe('')

              // Should classify transaction
              expect(result.transaction_classify).toEqual(
                'MASTER_ITEM_BRAND_ADD'
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
            .spyOn(masterItemBrandModel, 'create')
            .mockImplementationOnce(() => {
              throw new Error()
            })

          await expect(async () => {
            await masterItemBrandService.add(
              mockMasterItemBrand(),
              mockAccount()
            )
          }).rejects.toThrow(Error)
        }
      )
    }
  )

  describe(
    testCaption('EDIT DATA', 'data', 'Master Item Brand - Edit data'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should edit master item brand', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(masterItemBrandModel, 'findOneAndUpdate')

          await masterItemBrandService
            .edit(
              {
                ...mockMasterItemBrand(),
                __v: 0,
              },
              accountDocArray[0].id
            )
            .then((result: GlobalResponse) => {
              // Should create id
              expect(result.payload).toHaveProperty('id')

              // Should classify transaction
              expect(result.transaction_classify).toEqual(
                'MASTER_ITEM_BRAND_EDIT'
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
          const targetID = mockMasterItemBrand().id
          jest
            .spyOn(masterItemBrandModel, 'findOneAndUpdate')
            .mockImplementationOnce(() => {
              throw new Error()
            })

          await expect(async () => {
            await masterItemBrandService.edit(
              {
                ...mockMasterItemBrand(),
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
    testCaption('DELETE DATA', 'data', 'Master item brand - Delete data'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should delete master item brand', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(masterItemBrandModel, 'findOneAndUpdate')
          jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')
          await masterItemBrandService
            .delete(masterItemBrandDocArray[0].id)
            .then((result: GlobalResponse) => {
              // Should classify transaction
              expect(result.transaction_classify).toEqual(
                'MASTER_ITEM_BRAND_DELETE'
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
          const targetID = mockMasterItemBrand().id

          jest
            .spyOn(masterItemBrandModel, 'findOneAndUpdate')
            .mockImplementationOnce(() => {
              throw new Error()
            })

          await expect(async () => {
            await masterItemBrandService.delete(targetID)
          }).rejects.toThrow(Error)
        }
      )
    }
  )

  afterAll(async () => {
    jest.clearAllMocks()
  })
})
