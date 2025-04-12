import { AccountService } from '@gateway_core/account/account.service'
import {
  accountDocArray,
  mockAccount,
  mockAccountModel,
} from '@gateway_core/account/mock/account.mock'
import { mockAuthority } from '@gateway_core/account/mock/authority.mock'
import {
  masterItemSupplierDocArray,
  mockMasterItemSupplier,
  mockMasterItemSupplierModel,
} from '@gateway_core/master/mock/master.item.supplier.mock'
import { MasterItemSupplierService } from '@gateway_core/master/services/master.item.supplier.service'
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
  MasterItemSupplier,
  MasterItemSupplierDocument,
} from '@schemas/master/master.item.supplier'
import { AuthService } from '@security/auth.service'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { testCaption } from '@utility/string'
import { Model } from 'mongoose'

describe('Master Item Supplier Service', () => {
  let masterItemSupplierService: MasterItemSupplierService
  let configService: ConfigService
  let masterItemSupplierModel: Model<MasterItemSupplier>

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [],
      providers: [
        MasterItemSupplierService,
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
            get: jest.fn(() => {
              return null
            }),
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
          provide: getModelToken(MasterItemSupplier.name, 'primary'),
          useValue: mockMasterItemSupplierModel,
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

    masterItemSupplierService = module.get<MasterItemSupplierService>(
      MasterItemSupplierService
    )
    configService = module.get<ConfigService>(ConfigService)
    masterItemSupplierModel = module.get<Model<MasterItemSupplierDocument>>(
      getModelToken(MasterItemSupplier.name, 'primary')
    )

    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it(
    testCaption('SERVICE STATE', 'component', 'Service should be defined'),
    () => {
      expect(masterItemSupplierService).toBeDefined()
    }
  )

  describe(
    testCaption('GET DATA', 'data', 'Master Item Supplier - Fetch list'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Response validity', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(masterItemSupplierModel, 'aggregate').mockReturnValue({
            exec: jest.fn().mockReturnValue(masterItemSupplierDocArray),
          } as any)
          await masterItemSupplierService
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
              expect(result.data).toEqual(masterItemSupplierDocArray)
            })
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Response error on fetch data', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(JSON, 'parse').mockImplementation(() => ({}))
          jest.spyOn(masterItemSupplierModel, 'aggregate').mockImplementation({
            exec: jest.fn().mockRejectedValue(new Error()),
          } as any)

          await expect(masterItemSupplierService.all('')).rejects.toThrow(Error)
        }
      )
    }
  )

  describe(
    testCaption('GET DETAIL', 'data', 'Master Item Supplier - Fetch detail'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Response validity', {
          tab: 1,
        }),
        async () => {
          const findMock = masterItemSupplierDocArray[0]
          masterItemSupplierModel.findOne = jest
            .fn()
            .mockImplementationOnce(() => {
              return Promise.resolve(findMock)
            })

          await masterItemSupplierService.detail(findMock.id).then((result) => {
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
          jest.spyOn(masterItemSupplierModel, 'findOne').mockResolvedValue(null)
          await expect(async () => {
            await masterItemSupplierService.detail(mockMasterItemSupplier().id)
          }).rejects.toThrow(NotFoundException)
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Response error on get detail data', {
          tab: 1,
        }),
        async () => {
          const targetData = masterItemSupplierDocArray[0]

          jest
            .spyOn(masterItemSupplierModel, 'findOne')
            .mockRejectedValue(() => {
              throw new Error()
            })

          await expect(async () => {
            await masterItemSupplierService.detail(targetData.id)
          }).rejects.toThrow(Error)
        }
      )
    }
  )

  describe(
    testCaption('ADD DATA', 'data', 'Master Item Supplier - Add new data'),
    () => {
      it(
        testCaption('DATA', 'data', 'Should add new master item supplier'),
        async () => {
          jest.spyOn(masterItemSupplierModel, 'create')

          await masterItemSupplierService
            .add(mockMasterItemSupplier(), mockAccount())
            .then((result) => {
              // Should create id
              expect(result).toHaveProperty('id')
            })
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Response error on add data', {
          tab: 1,
        }),
        async () => {
          jest
            .spyOn(masterItemSupplierModel, 'create')
            .mockRejectedValue(() => {
              throw new Error()
            })

          await expect(async () => {
            await masterItemSupplierService.add(
              mockMasterItemSupplier(),
              mockAccount()
            )
          }).rejects.toThrow(Error)
        }
      )
    }
  )

  describe(
    testCaption('EDIT DATA', 'data', 'Master Item Supplier - Edit data'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should edit master item supplier', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(masterItemSupplierModel, 'findOneAndUpdate')

          await masterItemSupplierService
            .edit(
              {
                ...mockMasterItemSupplier(),
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
          const targetID = mockMasterItemSupplier().id
          jest
            .spyOn(masterItemSupplierModel, 'findOneAndUpdate')
            .mockResolvedValue(null)

          await expect(async () => {
            await masterItemSupplierService.edit(
              {
                ...mockMasterItemSupplier(),
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
          const targetID = mockMasterItemSupplier().id
          jest
            .spyOn(masterItemSupplierModel, 'findOneAndUpdate')
            .mockImplementationOnce(() => {
              throw new Error()
            })

          await expect(async () => {
            await masterItemSupplierService.edit(
              {
                ...mockMasterItemSupplier(),
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
    testCaption('DELETE DATA', 'data', 'Master item supplier - Delete data'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Response error if data is not found', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')
          const targetID = mockMasterItemSupplier().id
          jest
            .spyOn(masterItemSupplierModel, 'findOneAndUpdate')
            .mockResolvedValue(null)

          await expect(async () => {
            await masterItemSupplierService.delete(targetID)
          }).rejects.toThrow(NotFoundException)
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Response error on delete data', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(configService, 'get').mockReturnValue('Asia/Jakarta')
          const targetID = mockMasterItemSupplier().id
          jest
            .spyOn(masterItemSupplierModel, 'findOneAndUpdate')
            .mockRejectedValue(new Error())

          await expect(async () => {
            await masterItemSupplierService.delete(targetID)
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
            .spyOn(masterItemSupplierModel, 'findOneAndUpdate')
            .mockResolvedValue(masterItemSupplierDocArray[0])

          await masterItemSupplierService
            .delete(masterItemSupplierDocArray[0].id)
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
