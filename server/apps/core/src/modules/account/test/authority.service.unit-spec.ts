import {
  accountDocArray,
  mockAccount,
  mockAccountModel,
} from '@core/account/mock/account.mock'
import {
  authorityDocArray,
  mockAuthority,
  mockAuthorityModel,
} from '@core/account/mock/authority,mock'
import { Account } from '@core/account/schemas/account.model'
import {
  Authority,
  AuthorityDocument,
} from '@core/account/schemas/authority.model'
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
import { mockResponse } from '@utility/mock/response'
import { modCodes } from '@utility/modules'
import { testCaption } from '@utility/string'
import { Model } from 'mongoose'

import { AccountService } from '../account.service'

describe('Authority Service', () => {
  let accountService: AccountService
  let authorityModel: Model<Authority>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [],
      providers: [
        AccountService,
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
          provide: getModelToken(Account.name),
          useValue: mockAccountModel,
        },
        {
          provide: getModelToken(Authority.name),
          useValue: mockAuthorityModel,
        },
        { provide: getModelToken(LogActivity.name), useValue: {} },
        { provide: getModelToken(LogLogin.name), useValue: {} },
      ],
    }).compile()

    accountService = module.get<AccountService>(AccountService)
    authorityModel = module.get<Model<AuthorityDocument>>(
      getModelToken(Authority.name)
    )
  })

  afterEach(async () => {
    jest.clearAllMocks()
  })

  it(
    testCaption('SERVICE STATE', 'component', 'Service should be defined'),
    () => {
      expect(accountService).toBeDefined()
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
          await accountService
            .authorityAll(
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
              expect(result.transaction_classify).toEqual('AUTHORITY_GET')

              // Not an empty string so be informative
              expect(result.message).not.toBe('')

              // Should return success code
              expect(result.statusCode.customCode).toEqual(
                modCodes.Global.success
              )

              // Should be an array of data
              expect(result.payload).toBeInstanceOf(Array)

              // Data should be defined
              expect(result.payload).toEqual(authorityDocArray)
            })
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Response error on fetch data', {
          tab: 1,
        }),
        async () => {
          const mockError = mockResponse({
            code: modCodes[AccountService.name],
            message: 'Authority failed to fetch',
            payload: {},
            transaction_id: '',
            transaction_classify: 'AUTHORITY_GET',
          })

          jest.spyOn(authorityModel, 'aggregate').mockImplementation({
            exec: jest
              .fn()
              .mockRejectedValue(new Error(JSON.stringify(mockError))),
          } as any)

          await expect(
            accountService.authorityAll({
              first: 0,
              rows: 10,
              sortField: 'created_at',
              sortOrder: 1,
              filters: {},
              custom_filter: '123',
            })
          ).rejects.toThrow(Error)
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

          await accountService
            .authorityDetail(findMockAuthority.id)
            .then((result: GlobalResponse) => {
              // Deep equality check
              expect(result.payload).toEqual(findMockAuthority)

              // Should classify transaction
              expect(result.transaction_classify).toEqual('AUTHORITY_GET')

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
          const targetData = mockAuthority()
          const mockError = mockResponse({
            code: modCodes[AccountService.name],
            message: 'Authority detail failed to fetch',
            payload: {},
            transaction_id: targetData.id,
            transaction_classify: 'AUTHORITY_GET',
          })

          jest.spyOn(authorityModel, 'findOne').mockImplementationOnce(() => {
            throw new Error(JSON.stringify(mockError))
          })

          await expect(async () => {
            await accountService.authorityDetail(targetData.id)
          }).rejects.toThrowError(new Error(JSON.stringify(mockError)))
        }
      )
    }
  )

  describe(
    testCaption('ADD DATA', 'data', 'Authority - Add new authority'),
    () => {
      it(testCaption('DATA', 'data', 'Should add new authority'), async () => {
        jest.spyOn(authorityModel, 'create')

        await accountService
          .authorityAdd(
            {
              code: mockAuthority().code,
              name: mockAuthority().name,
            },
            mockAccount()
          )
          .then((result: GlobalResponse) => {
            // Should create id
            expect(result.payload).toHaveProperty('id')

            // Should classify transaction
            expect(result.transaction_classify).toEqual('AUTHORITY_ADD')

            // Not an empty string so be informative
            expect(result.message).not.toBe('')

            // Should return success code
            expect(result.statusCode.customCode).toEqual(
              modCodes.Global.success
            )
          })
      })

      it(
        testCaption('HANDLING', 'data', 'Response error on add data', {
          tab: 1,
        }),
        async () => {
          const mockError = mockResponse({
            code: modCodes[AccountService.name],
            message: 'Authority failed to create',
            payload: {},
            transaction_id: '',
            transaction_classify: 'AUTHORITY_ADD',
          })

          jest.spyOn(authorityModel, 'create').mockImplementationOnce(() => {
            throw new Error(JSON.stringify(mockError))
          })

          await expect(async () => {
            await accountService.authorityAdd(
              {
                code: mockAuthority().code,
                name: mockAuthority().name,
              },
              mockAccount()
            )
          }).rejects.toThrowError(new Error(JSON.stringify(mockError)))
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

          await accountService
            .authorityEdit(
              {
                code: mockAuthority().code,
                name: mockAuthority().name,
                __v: 0,
              },
              accountDocArray[0].id
            )
            .then((result: GlobalResponse) => {
              // Should create id
              expect(result.payload).toHaveProperty('id')

              // Should classify transaction
              expect(result.transaction_classify).toEqual('AUTHORITY_EDIT')

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
          const targetID = mockAuthority().id
          const mockError = mockResponse({
            code: modCodes[AccountService.name],
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
            await accountService.authorityEdit(
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
        testCaption('HANDLING', 'data', 'Should delete authority', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(authorityModel, 'findOneAndUpdate')

          await accountService
            .authorityDelete(authorityDocArray[0].id)
            .then((result: GlobalResponse) => {
              // Should classify transaction
              expect(result.transaction_classify).toEqual('AUTHORITY_DELETE')

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
          const targetID = mockAuthority().id
          const mockError = mockResponse({
            code: modCodes[AccountService.name],
            message: 'Authority failed to delete',
            payload: {},
            transaction_id: targetID,
            transaction_classify: 'AUTHORITY_DELETE',
          })

          jest
            .spyOn(authorityModel, 'findOneAndUpdate')
            .mockImplementationOnce(() => {
              throw new Error(JSON.stringify(mockError))
            })

          await expect(async () => {
            await accountService.authorityDelete(targetID)
          }).rejects.toThrowError(new Error(JSON.stringify(mockError)))
        }
      )
    }
  )

  afterAll(async () => {
    jest.clearAllMocks()
  })
})
