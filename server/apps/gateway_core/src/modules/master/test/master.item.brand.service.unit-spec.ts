import { AccountService } from '@gateway_core/account/account.service'
import {
  accountDocArray,
  mockAccount,
} from '@gateway_core/account/mock/account.mock'
import { mockAuthority } from '@gateway_core/account/mock/authority.mock'
import {
  masterItemBrandDocArray,
  mockMasterItemBrand,
  mockMasterItemBrandModel,
} from '@gateway_core/master/mock/master.item.brand.mock'
import { MasterItemBrandService } from '@gateway_core/master/services/master.item.brand.service'
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
  MasterItemBrand,
  MasterItemBrandDocument,
} from '@schemas/master/master.item.brand'
import { AuthService } from '@security/auth.service'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { testCaption } from '@utility/string'
import { Model } from 'mongoose'

describe('Master Item Brand Service', () => {
  let masterItemBrandService: MasterItemBrandService
  let configService: ConfigService
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

    masterItemBrandService = module.get<MasterItemBrandService>(
      MasterItemBrandService
    )
    configService = module.get<ConfigService>(ConfigService)
    masterItemBrandModel = module.get<Model<MasterItemBrandDocument>>(
      getModelToken(MasterItemBrand.name, 'primary')
    )

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
            .then((result) => {
              // Should be an array of data
              expect(result.data).toBeInstanceOf(Array)

              // Data should be defined
              expect(result.data).toEqual(masterItemBrandDocArray)
            })
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Response error on fetch data', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(JSON, 'parse').mockImplementation(() => ({}))
          jest.spyOn(masterItemBrandModel, 'aggregate').mockImplementation({
            exec: jest.fn().mockRejectedValue(new Error()),
          } as any)

          await expect(masterItemBrandService.all('')).rejects.toThrow(Error)
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

          await masterItemBrandService.detail(findMock.id).then((result) => {
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
          jest.spyOn(masterItemBrandModel, 'findOne').mockResolvedValue(null)
          await expect(async () => {
            await masterItemBrandService.detail(masterItemBrandDocArray[0].id)
          }).rejects.toThrow(NotFoundException)
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Response error on get detail data', {
          tab: 1,
        }),
        async () => {
          const targetData = masterItemBrandDocArray[0]

          jest.spyOn(masterItemBrandModel, 'findOne').mockRejectedValue(() => {
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
            .then((result) => {
              // Should create id
              expect(result).toHaveProperty('id')
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
          jest.spyOn(masterItemBrandModel, 'create').mockRejectedValue(() => {
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
          const targetID = mockMasterItemBrand().id
          jest
            .spyOn(masterItemBrandModel, 'findOneAndUpdate')
            .mockResolvedValue(null)

          await expect(async () => {
            await masterItemBrandService.edit(
              {
                ...mockMasterItemBrand(),
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
          const targetID = mockMasterItemBrand().id
          jest
            .spyOn(masterItemBrandModel, 'findOneAndUpdate')
            .mockRejectedValue(() => {
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
    testCaption('DELETE DATA', 'data', 'Master Item Brand - Delete data'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Response error if data is not found', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')
          const targetID = mockMasterItemBrand().id
          jest
            .spyOn(masterItemBrandModel, 'findOneAndUpdate')
            .mockResolvedValue(null)

          await expect(async () => {
            await masterItemBrandService.delete(targetID)
          }).rejects.toThrow(NotFoundException)
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Response error on delete data', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')
          const targetID = mockMasterItemBrand().id
          jest
            .spyOn(masterItemBrandModel, 'findOneAndUpdate')
            .mockRejectedValue(new Error())

          await expect(async () => {
            await masterItemBrandService.delete(targetID)
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
            .spyOn(masterItemBrandModel, 'findOneAndUpdate')
            .mockResolvedValue(masterItemBrandDocArray[0])

          await masterItemBrandService
            .delete(masterItemBrandDocArray[0].id)
            .then((result) => {
              // Should return name if document found
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
