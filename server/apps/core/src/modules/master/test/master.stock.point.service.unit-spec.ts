import { AccountService } from '@core/account/account.service'
import {
  accountDocArray,
  mockAccount,
  mockAccountModel,
} from '@core/account/mock/account.mock'
import { mockAuthority } from '@core/account/mock/authority,mock'
import { Account } from '@core/account/schemas/account.model'
import { Authority } from '@core/account/schemas/authority.model'
import {
  masterStockPointDocArray,
  mockMasterStockPoint,
  mockMasterStockPointModel,
} from '@core/master/mock/master.stock.point.mock'
import {
  MasterStockPoint,
  MasterStockPointDocument,
} from '@core/master/schemas/master.stock.point'
import { MasterStockPointService } from '@core/master/services/master.stock.point.service'
import { LogActivity } from '@log/schemas/log.activity'
import { LogLogin } from '@log/schemas/log.login'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { getModelToken } from '@nestjs/mongoose'
import { Test, TestingModule } from '@nestjs/testing'
import { AuthService } from '@security/auth.service'
import { GlobalResponse } from '@utility/dto/response'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { modCodes } from '@utility/modules'
import { testCaption } from '@utility/string'
import { Model } from 'mongoose'

describe('Master Stock Point Service', () => {
  let masterStockPointService: MasterStockPointService
  let masterStockPointModel: Model<MasterStockPoint>

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [],
      providers: [
        MasterStockPointService,
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
          provide: getModelToken(MasterStockPoint.name),
          useValue: mockMasterStockPointModel,
        },
        {
          provide: getModelToken(Account.name),
          useValue: mockAccountModel,
        },
        {
          provide: getModelToken(Authority.name),
          useValue: mockAuthority,
        },
        {
          provide: getModelToken(Authority.name),
          useValue: mockAuthority,
        },
        { provide: getModelToken(LogActivity.name), useValue: {} },
        { provide: getModelToken(LogLogin.name), useValue: {} },
      ],
    }).compile()

    masterStockPointService = module.get<MasterStockPointService>(
      MasterStockPointService
    )
    masterStockPointModel = module.get<Model<MasterStockPointDocument>>(
      getModelToken(MasterStockPoint.name)
    )

    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it(
    testCaption('SERVICE STATE', 'component', 'Service should be defined'),
    () => {
      expect(masterStockPointService).toBeDefined()
    }
  )

  describe(
    testCaption('GET DATA', 'data', 'Master Stock Point - Fetch list'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Response validity', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(masterStockPointModel, 'aggregate').mockReturnValue({
            exec: jest.fn().mockReturnValue(masterStockPointDocArray),
          } as any)
          await masterStockPointService
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
                'MASTER_STOCK_POINT_LIST'
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
              expect(result.payload).toEqual(masterStockPointDocArray)
            })
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Response error on fetch data', {
          tab: 1,
        }),
        async () => {
          jest
            .spyOn(mockMasterStockPointModel, 'aggregate')
            .mockImplementation({
              exec: jest.fn().mockRejectedValue(new Error()),
            } as any)

          await expect(
            masterStockPointService.all({
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
    testCaption('GET DETAIL', 'data', 'Master Stock Point - Fetch detail'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Response validity', {
          tab: 1,
        }),
        async () => {
          const findMock = masterStockPointDocArray[0]
          masterStockPointModel.findOne = jest
            .fn()
            .mockImplementationOnce(() => {
              return Promise.resolve(findMock)
            })

          await masterStockPointService
            .detail(findMock.id)
            .then((result: GlobalResponse) => {
              // Deep equality check
              expect(result.payload).toEqual(findMock)

              // Should classify transaction
              expect(result.transaction_classify).toEqual(
                'MASTER_STOCK_POINT_GET'
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
          const targetData = masterStockPointDocArray[0]

          jest
            .spyOn(masterStockPointModel, 'findOne')
            .mockImplementationOnce(() => {
              throw new Error()
            })

          await expect(async () => {
            await masterStockPointService.detail(targetData.id)
          }).rejects.toThrow(Error)
        }
      )
    }
  )

  describe(
    testCaption('ADD DATA', 'data', 'Master Stock Point - Add new data'),
    () => {
      it(
        testCaption('DATA', 'data', 'Should add new master stock point'),
        async () => {
          jest.spyOn(masterStockPointModel, 'create')

          await masterStockPointService
            .add(mockMasterStockPoint(), mockAccount())
            .then((result: GlobalResponse) => {
              // Should create id
              expect(result.payload).toHaveProperty('id')

              // Should classify transaction
              expect(result.transaction_classify).toEqual(
                'MASTER_STOCK_POINT_ADD'
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
          jest.spyOn(masterStockPointService, 'add')
          const dataTest = mockMasterStockPoint()
          delete dataTest.code
          await masterStockPointService
            .add(dataTest, mockAccount())
            .then((result: GlobalResponse) => {
              // Should create id
              expect(result.payload).toHaveProperty('id')

              expect(result.payload).toHaveProperty('code')

              expect(result.payload['code']).not.toBe('')

              // Should classify transaction
              expect(result.transaction_classify).toEqual(
                'MASTER_STOCK_POINT_ADD'
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
            .spyOn(masterStockPointModel, 'create')
            .mockImplementationOnce(() => {
              throw new Error()
            })

          await expect(async () => {
            await masterStockPointService.add(
              mockMasterStockPoint(),
              mockAccount()
            )
          }).rejects.toThrow(Error)
        }
      )
    }
  )

  describe(
    testCaption('EDIT DATA', 'data', 'Master Stock Point - Edit data'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should edit master stock point', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(masterStockPointModel, 'findOneAndUpdate')

          await masterStockPointService
            .edit(
              {
                ...mockMasterStockPoint(),
                __v: 0,
              },
              accountDocArray[0].id
            )
            .then((result: GlobalResponse) => {
              // Should create id
              expect(result.payload).toHaveProperty('id')

              // Should classify transaction
              expect(result.transaction_classify).toEqual(
                'MASTER_STOCK_POINT_EDIT'
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
          const targetID = mockMasterStockPoint().id
          jest
            .spyOn(masterStockPointModel, 'findOneAndUpdate')
            .mockImplementationOnce(() => {
              throw new Error()
            })

          await expect(async () => {
            await masterStockPointService.edit(
              {
                ...mockMasterStockPoint(),
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
    testCaption('DELETE DATA', 'data', 'Master Stock Point - Delete data'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should delete master stock point', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(masterStockPointModel, 'findOneAndUpdate')

          await masterStockPointService
            .delete(masterStockPointDocArray[0].id)
            .then((result: GlobalResponse) => {
              // Should classify transaction
              expect(result.transaction_classify).toEqual(
                'MASTER_STOCK_POINT_DELETE'
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
          const targetID = mockMasterStockPoint().id

          jest
            .spyOn(masterStockPointModel, 'findOneAndUpdate')
            .mockImplementationOnce(() => {
              throw new Error()
            })

          await expect(async () => {
            await masterStockPointService.delete(targetID)
          }).rejects.toThrow(Error)
        }
      )
    }
  )

  afterAll(async () => {
    jest.clearAllMocks()
  })
})
