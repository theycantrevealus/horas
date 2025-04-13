import { AccountService } from '@gateway_core/account/account.service'
import {
  accountDocArray,
  mockAccount,
  mockAccountModel,
} from '@gateway_core/account/mock/account.mock'
import { mockAuthority } from '@gateway_core/account/mock/authority.mock'
import {
  masterStockPointDocArray,
  mockMasterStockPoint,
  mockMasterStockPointModel,
} from '@gateway_core/master/mock/master.stock.point.mock'
import { MasterStockPointService } from '@gateway_core/master/services/master.stock.point.service'
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
  MasterStockPoint,
  MasterStockPointDocument,
} from '@schemas/master/master.stock.point'
import { AuthService } from '@security/auth.service'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { testCaption } from '@utility/string'
import { Model } from 'mongoose'

describe('Master Stock Point Service', () => {
  let masterStockPointService: MasterStockPointService
  let configService: ConfigService
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
          provide: getModelToken(MasterStockPoint.name, 'primary'),
          useValue: mockMasterStockPointModel,
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

    masterStockPointService = module.get<MasterStockPointService>(
      MasterStockPointService
    )
    configService = module.get<ConfigService>(ConfigService)
    masterStockPointModel = module.get<Model<MasterStockPointDocument>>(
      getModelToken(MasterStockPoint.name, 'primary')
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
            .then((result) => {
              // Should be an array of data
              expect(result.data).toBeInstanceOf(Array)

              // Data should be defined
              expect(result.data).toEqual(masterStockPointDocArray)
            })
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Response error on fetch data', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(JSON, 'parse').mockImplementation(() => ({}))
          jest
            .spyOn(mockMasterStockPointModel, 'aggregate')
            .mockImplementation({
              exec: jest.fn().mockRejectedValue(new Error()),
            } as any)

          await expect(masterStockPointService.all('')).rejects.toThrow(Error)
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

          await masterStockPointService.detail(findMock.id).then((result) => {
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
          jest.spyOn(masterStockPointModel, 'findOne').mockResolvedValue(null)
          await expect(async () => {
            await masterStockPointService.detail(mockMasterStockPoint().id)
          }).rejects.toThrow(NotFoundException)
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
    testCaption('FIND', 'data', 'Master Stock Point - Find master stock point'),
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
            .find({
              id: findMock.id,
            })
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
          jest.spyOn(masterStockPointModel, 'findOne').mockResolvedValue(null)
          await expect(async () => {
            await masterStockPointService.find(mockMasterStockPoint().id)
          }).rejects.toThrow(NotFoundException)
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Response error on find data', {
          tab: 1,
        }),
        async () => {
          const targetData = masterStockPointDocArray[0]

          jest.spyOn(masterStockPointModel, 'findOne').mockRejectedValue(() => {
            throw new Error()
          })

          await expect(async () => {
            await masterStockPointService.find({ id: targetData.id })
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
            .then((result) => {
              // Should create id
              expect(result).toHaveProperty('id')
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
          jest.spyOn(masterStockPointModel, 'create').mockRejectedValue(() => {
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
          const targetID = mockMasterStockPoint().id
          jest
            .spyOn(masterStockPointModel, 'findOneAndUpdate')
            .mockResolvedValue(null)

          await expect(async () => {
            await masterStockPointService.edit(
              {
                ...mockMasterStockPoint(),
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
          const targetID = mockMasterStockPoint().id
          jest
            .spyOn(masterStockPointModel, 'findOneAndUpdate')
            .mockRejectedValue(() => {
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
        testCaption('HANDLING', 'data', 'Response error if data is not found', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')
          const targetID = mockMasterStockPoint().id
          jest
            .spyOn(masterStockPointModel, 'findOneAndUpdate')
            .mockResolvedValue(null)

          await expect(async () => {
            await masterStockPointService.delete(targetID)
          }).rejects.toThrow(NotFoundException)
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Response error on delete data', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')
          const targetID = mockMasterStockPoint().id
          jest
            .spyOn(masterStockPointModel, 'findOneAndUpdate')
            .mockRejectedValue(new Error())

          await expect(async () => {
            await masterStockPointService.delete(targetID)
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
            .spyOn(masterStockPointModel, 'findOneAndUpdate')
            .mockResolvedValue(masterStockPointDocArray[0])

          await masterStockPointService
            .delete(masterStockPointDocArray[0].id)
            .then((result) => {
              // Should return code if document found
              expect(result).toHaveProperty('name')
            })
        }
      )
    }
  )

  afterAll(async () => {
    jest.clearAllMocks()
  })
})
