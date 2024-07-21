import { AccountService } from '@core/account/account.service'
import {
  accountDocArray,
  mockAccount,
  mockAccountModel,
} from '@core/account/mock/account.mock'
import { mockAuthority } from '@core/account/mock/authority.mock'
import {
  masterItemDocArray,
  mockMasterItem,
  mockMasterItemModel,
} from '@core/master/mock/master.item.mock'
import { MasterItemService } from '@core/master/services/master.item.service'
import { LogActivity } from '@log/schemas/log.activity'
import { LogLogin } from '@log/schemas/log.login'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { getModelToken } from '@nestjs/mongoose'
import { Test, TestingModule } from '@nestjs/testing'
import { Account } from '@schemas/account/account.model'
import { Authority } from '@schemas/account/authority.model'
import { MasterItem, MasterItemDocument } from '@schemas/master/master.item'
import { AuthService } from '@security/auth.service'
import { M_ITEM_SERVICE } from '@utility/constants'
import { GlobalResponse } from '@utility/dto/response'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { modCodes } from '@utility/modules'
import { testCaption } from '@utility/string'
import { Model } from 'mongoose'

describe('Master Item Service', () => {
  let masterItemService: MasterItemService
  let masterItemModel: Model<MasterItem>

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [],
      providers: [
        MasterItemService,
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
          provide: M_ITEM_SERVICE,
          useValue: {
            emit: jest.fn(),
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
          provide: getModelToken(MasterItem.name, 'primary'),
          useValue: mockMasterItemModel,
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

    masterItemService = module.get<MasterItemService>(MasterItemService)
    masterItemModel = module.get<Model<MasterItemDocument>>(
      getModelToken(MasterItem.name, 'primary')
    )

    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it(
    testCaption('SERVICE STATE', 'component', 'Service should be defined'),
    () => {
      expect(masterItemService).toBeDefined()
    }
  )

  describe(testCaption('GET DATA', 'data', 'Master Item - Fetch list'), () => {
    it(
      testCaption('HANDLING', 'data', 'Response validity', {
        tab: 1,
      }),
      async () => {
        jest.spyOn(masterItemModel, 'aggregate').mockReturnValue({
          exec: jest.fn().mockReturnValue(masterItemDocArray),
        } as any)
        await masterItemService
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
            expect(result.transaction_classify).toEqual('MASTER_ITEM_LIST')

            // Not an empty string so be informative
            expect(result.message).not.toBe('')

            // Should return success code
            expect(result.statusCode.customCode).toEqual(
              modCodes.Global.success
            )

            // Should be an array of data
            expect(result.payload).toBeInstanceOf(Object)

            // Data should be defined
            expect(result.payload['data']).toEqual(masterItemDocArray)
          })
      }
    )

    it(
      testCaption('HANDLING', 'data', 'Response error on fetch data', {
        tab: 1,
      }),
      async () => {
        jest.spyOn(masterItemModel, 'aggregate').mockImplementation({
          exec: jest.fn().mockRejectedValue(new Error()),
        } as any)

        await expect(
          masterItemService.all({
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
    testCaption('GET DETAIL', 'data', 'Master Item - Fetch detail'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Response validity', {
          tab: 1,
        }),
        async () => {
          const findMock = masterItemDocArray[0]
          masterItemModel.findOne = jest.fn().mockImplementationOnce(() => {
            return Promise.resolve(findMock)
          })

          await masterItemService
            .detail(findMock.id)
            .then((result: GlobalResponse) => {
              // Deep equality check
              expect(result.payload).toEqual(findMock)

              // Should classify transaction
              expect(result.transaction_classify).toEqual('MASTER_ITEM_GET')

              // Not an empty string so be informative
              expect(result.message).not.toBe('')

              // Should return success code
              expect(result.statusCode.customCode).toEqual(
                modCodes.Global.success
              )
            })

          const findAll = masterItemDocArray
          masterItemModel.findOne = jest.fn().mockImplementationOnce(() => {
            return Promise.resolve(findAll)
          })

          await masterItemService
            .find({
              name: findMock.name,
            })
            .then((result) => {
              expect(result.payload).toEqual(findAll)
            })
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Response error on get detail data', {
          tab: 1,
        }),
        async () => {
          const targetData = masterItemDocArray[0]

          jest.spyOn(masterItemModel, 'findOne').mockImplementationOnce(() => {
            throw new Error()
          })

          await expect(async () => {
            await masterItemService.detail(targetData.id)
          }).rejects.toThrow(Error)
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Response error on get find data', {
          tab: 1,
        }),
        async () => {
          const targetData = masterItemDocArray[0]

          jest.spyOn(masterItemModel, 'findOne').mockImplementationOnce(() => {
            throw new Error()
          })

          await expect(async () => {
            await masterItemService.find({ id: targetData.id })
          }).rejects.toThrow(Error)
        }
      )
    }
  )

  describe(
    testCaption('ADD DATA', 'data', 'Master Item - Add new data'),
    () => {
      it(
        testCaption('DATA', 'data', 'Should add new master item'),
        async () => {
          jest.spyOn(masterItemModel, 'create')

          await masterItemService
            .add(mockMasterItem(), mockAccount())
            .then((result: GlobalResponse) => {
              // Should create id
              expect(result.payload).toHaveProperty('id')

              // Should classify transaction
              expect(result.transaction_classify).toEqual('MASTER_ITEM_ADD')

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
          jest.spyOn(masterItemService, 'add')
          const dataTest = mockMasterItem()
          delete dataTest.code
          await masterItemService
            .add(dataTest, mockAccount())
            .then((result: GlobalResponse) => {
              // Should create id
              expect(result.payload).toHaveProperty('id')

              expect(result.payload).toHaveProperty('code')

              expect(result.payload['code']).not.toBe('')

              // Should classify transaction
              expect(result.transaction_classify).toEqual('MASTER_ITEM_ADD')

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
          jest.spyOn(masterItemModel, 'create').mockImplementationOnce(() => {
            throw new Error()
          })

          await expect(async () => {
            await masterItemService.add(mockMasterItem(), mockAccount())
          }).rejects.toThrow(Error)
        }
      )
    }
  )

  describe(testCaption('EDIT DATA', 'data', 'Master Item - Edit data'), () => {
    it(
      testCaption('HANDLING', 'data', 'Should edit master item', {
        tab: 1,
      }),
      async () => {
        jest.spyOn(masterItemModel, 'findOneAndUpdate')

        await masterItemService
          .edit(
            {
              ...mockMasterItem(),
              __v: 0,
            },
            accountDocArray[0].id
          )
          .then((result: GlobalResponse) => {
            // Should create id
            expect(result.payload).toHaveProperty('id')

            // Should classify transaction
            expect(result.transaction_classify).toEqual('MASTER_ITEM_EDIT')

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
        const targetID = mockMasterItem().id
        jest
          .spyOn(masterItemModel, 'findOneAndUpdate')
          .mockImplementationOnce(() => {
            throw new Error()
          })

        await expect(async () => {
          await masterItemService.edit(
            {
              ...mockMasterItem(),
              __v: 0,
            },
            targetID
          )
        }).rejects.toThrow(Error)
      }
    )
  })

  describe(
    testCaption('DELETE DATA', 'data', 'Master item - Delete data'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should delete master item', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(masterItemModel, 'findOneAndUpdate')

          await masterItemService
            .delete(masterItemDocArray[0].id)
            .then((result: GlobalResponse) => {
              // Should classify transaction
              expect(result.transaction_classify).toEqual('MASTER_ITEM_DELETE')

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
          const targetID = mockMasterItem().id

          jest
            .spyOn(masterItemModel, 'findOneAndUpdate')
            .mockImplementationOnce(() => {
              throw new Error()
            })

          await expect(async () => {
            await masterItemService.delete(targetID)
          }).rejects.toThrow(Error)
        }
      )
    }
  )

  afterAll(async () => {
    jest.clearAllMocks()
  })
})
