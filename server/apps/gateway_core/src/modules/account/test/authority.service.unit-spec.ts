import { AuthorityService } from '@gateway_core/account/authority.service'
import {
  accountDocArray,
  mockAccount,
  mockAccountModel,
} from '@gateway_core/account/mock/account.mock'
import {
  authorityDocArray,
  mockAuthority,
  mockAuthorityModel,
} from '@gateway_core/account/mock/authority.mock'
import { LogActivity } from '@log/schemas/log.activity'
import { LogLogin } from '@log/schemas/log.login'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { getModelToken } from '@nestjs/mongoose'
import { Test, TestingModule } from '@nestjs/testing'
import { Account } from '@schemas/account/account.model'
import { Authority, AuthorityDocument } from '@schemas/account/authority.model'
import { AuthService } from '@security/auth.service'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { mockResponse } from '@utility/mock/response'
import { modCodes } from '@utility/modules'
import { testCaption } from '@utility/string'
import { Model } from 'mongoose'

describe('Authority Service', () => {
  let authorityService: AuthorityService
  let authorityModel: Model<Authority>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [],
      providers: [
        AuthorityService,
        JwtService,
        AuthService,
        ConfigService,
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
          provide: getModelToken(Account.name, 'primary'),
          useValue: mockAccountModel,
        },
        {
          provide: getModelToken(Authority.name, 'primary'),
          useValue: mockAuthorityModel,
        },
        { provide: getModelToken(LogActivity.name, 'primary'), useValue: {} },
        { provide: getModelToken(LogLogin.name, 'primary'), useValue: {} },
      ],
    }).compile()

    authorityService = module.get<AuthorityService>(AuthorityService)
    authorityModel = module.get<Model<AuthorityDocument>>(
      getModelToken(Authority.name, 'primary')
    )
  })

  it(
    testCaption('SERVICE STATE', 'component', 'Service should be defined'),
    () => {
      expect(authorityService).toBeDefined()
    }
  )

  describe(
    testCaption('GET DATA', 'data', 'Authority - Fetch authority list'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Response validity', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(authorityModel, 'aggregate').mockReturnValue({
            exec: jest.fn().mockReturnValue(authorityDocArray),
          } as any)
          await authorityService
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
              expect(result.data).toEqual(authorityDocArray)
            })
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Response error on fetch data', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(JSON, 'parse').mockImplementation(() => ({}))

          jest.spyOn(authorityModel, 'aggregate').mockImplementation({
            exec: jest.fn().mockRejectedValue(new Error()),
          } as any)

          await expect(authorityService.all('')).rejects.toThrow(Error)
        }
      )
    }
  )

  describe(
    testCaption('GET DETAIL', 'data', 'Authority - Fetch authority detail'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Response validity', {
          tab: 1,
        }),
        async () => {
          const findMockAuthority = authorityDocArray[0]
          authorityModel.findOne = jest.fn().mockImplementationOnce(() => {
            return Promise.resolve(findMockAuthority)
          })

          await authorityService.detail(findMockAuthority.id).then((result) => {
            // Deep equality check
            expect(result).toEqual(findMockAuthority)
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
          jest.spyOn(authorityModel, 'findOne').mockResolvedValue(null)
          await expect(async () => {
            await authorityService.detail(mockAuthority().id)
          }).rejects.toThrow(NotFoundException)
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Response error on get detail data', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(authorityModel, 'findOne').mockRejectedValue(new Error())
          await expect(async () => {
            await authorityService.detail(mockAuthority().id)
          }).rejects.toThrow(Error)
        }
      )
    }
  )

  describe(
    testCaption('ADD DATA', 'data', 'Authority - Add new authority'),
    () => {
      it(testCaption('DATA', 'data', 'Should add new authority'), async () => {
        jest.spyOn(authorityModel, 'create')

        await authorityService
          .add(
            {
              code: mockAuthority().code,
              name: mockAuthority().name,
            },
            mockAccount()
          )
          .then((result) => {
            // Should create id
            expect(result).toHaveProperty('id')
          })
      })

      it(
        testCaption('HANDLING', 'data', 'Response error on add data', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(authorityModel, 'create').mockRejectedValue(new Error())
          await expect(async () => {
            await authorityService.add(
              {
                code: mockAuthority().code,
                name: mockAuthority().name,
              },
              mockAccount()
            )
          }).rejects.toThrow(Error)
        }
      )
    }
  )

  describe(
    testCaption('EDIT DATA', 'data', 'Authority - Edit authority'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should edit authority', { tab: 1 }),
        async () => {
          jest.spyOn(authorityModel, 'findOneAndUpdate')

          await authorityService
            .edit(
              {
                code: mockAuthority().code,
                name: mockAuthority().name,
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
          const targetID = mockAuthority().id
          jest.spyOn(authorityModel, 'findOneAndUpdate').mockResolvedValue(null)

          await expect(async () => {
            await authorityService.edit(
              {
                code: mockAuthority().code,
                name: mockAuthority().name,
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
          const targetID = mockAuthority().id
          const mockError = mockResponse({
            code: modCodes['Authority'].defaultResponseCode,
            message: 'Authority failed to update',
            payload: {},
            transaction_id: targetID,
            transaction_classify: 'AUTHORITY_EDIT',
          })

          jest
            .spyOn(authorityModel, 'findOneAndUpdate')
            .mockImplementationOnce(() => {
              throw new Error(JSON.stringify(mockError))
            })

          await expect(async () => {
            await authorityService.edit(
              {
                code: mockAuthority().code,
                name: mockAuthority().name,
                __v: 0,
              },
              targetID
            )
          }).rejects.toThrowError(new Error(JSON.stringify(mockError)))
        }
      )
    }
  )

  describe(
    testCaption('DELETE DATA', 'data', 'Authority - Delete authority'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Response error if data is not found', {
          tab: 1,
        }),
        async () => {
          const targetID = mockAuthority().id
          jest.spyOn(authorityModel, 'findOneAndUpdate').mockResolvedValue(null)

          await expect(async () => {
            await authorityService.delete(targetID)
          }).rejects.toThrow(NotFoundException)
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Response error on delete data', {
          tab: 1,
        }),
        async () => {
          const targetID = mockAuthority().id
          jest
            .spyOn(authorityModel, 'findOneAndUpdate')
            .mockRejectedValue(new Error())

          await expect(async () => {
            await authorityService.delete(targetID)
          }).rejects.toThrow(Error)
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Should success delete authority', {
          tab: 1,
        }),
        async () => {
          jest
            .spyOn(authorityModel, 'findOneAndUpdate')
            .mockResolvedValue(authorityDocArray[0])

          await authorityService
            .delete(authorityDocArray[0].id)
            .then((result) => {
              // Should return code if document found
              expect(result).toHaveProperty('code')
            })
        }
      )
    }
  )

  afterEach(async () => {
    jest.clearAllMocks()
  })

  afterAll(async () => {
    jest.clearAllMocks()
  })
})
