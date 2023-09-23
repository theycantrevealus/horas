import {
  accountDocArray,
  mockAccount,
  mockAccountModel,
} from '@core/account/mock/account.mock'
import { mockAuthority } from '@core/account/mock/authority,mock'
import { Account, AccountDocument } from '@core/account/schemas/account.model'
import { Authority } from '@core/account/schemas/authority.model'
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
import * as bcrypt from 'bcrypt'
import { Cache } from 'cache-manager'
import { Model } from 'mongoose'

import { AccountService } from '../account.service'

describe('Account Service', () => {
  let service: AccountService
  let authService: AuthService
  let cacheManager: Cache
  let modelAccount: Model<Account>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [],
      providers: [
        AccountService,
        JwtService,
        AuthService,
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: () => jest.fn().mockResolvedValue('Test'),
            set: () => jest.fn().mockResolvedValue('Test'),
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
          useValue: mockAuthority,
        },
        { provide: getModelToken(LogActivity.name), useValue: {} },
        { provide: getModelToken(LogLogin.name), useValue: {} },
      ],
    }).compile()

    service = module.get<AccountService>(AccountService)
    authService = module.get<AuthService>(AuthService)
    cacheManager = module.get(CACHE_MANAGER)
    modelAccount = module.get<Model<AccountDocument>>(
      getModelToken(Account.name)
    )
  })

  it(
    testCaption('SERVICE STATE', 'component', 'Service should be defined'),
    () => {
      expect(service).toBeDefined()
    }
  )

  describe(testCaption('SIGN IN', 'data', 'Account - Sign in'), () => {
    it(
      testCaption('HANDLING', 'data', 'Correct credential', {
        tab: 1,
      }),
      async () => {
        const dataSet = accountDocArray[0]

        jest.spyOn(service, 'accountFind').mockReturnValue(
          Promise.resolve(
            mockResponse({
              code: modCodes[AccountService.name],
              message: 'Account detail failed to fetch',
              payload: dataSet,
              transaction_id: dataSet.id,
              transaction_classify: 'ACCOUNT_GET',
            })
          )
        )

        jest
          .spyOn(bcrypt, 'compare')
          .mockImplementation(() => Promise.resolve(true))

        jest.spyOn(cacheManager, 'set')

        jest.spyOn(cacheManager, 'get')

        jest.spyOn(service, 'configMeta').mockResolvedValue([])

        await service
          .signIn({
            email: dataSet.email,
            password: dataSet.password,
          })
          .then((result: GlobalResponse) => {
            expect(result.payload).toHaveProperty('token')

            expect(result.statusCode.customCode).toEqual(
              modCodes['Global'].success
            )
          })

        expect(service.accountFind).toHaveBeenCalled()
      }
    )

    it(
      testCaption('HANDLING', 'data', 'Wrong credential', {
        tab: 1,
      }),
      async () => {
        const mockError = mockResponse({
          code: modCodes[AccountService.name],
          message: 'Sign in failed. Account not found',
          payload: {},
          transaction_id: '',
          transaction_classify: 'ACCOUNT_SIGNIN',
        })

        const dataSet = accountDocArray[0]

        jest.spyOn(service, 'accountFind').mockReturnValue(
          Promise.resolve(
            mockResponse({
              code: modCodes[AccountService.name],
              message: 'Account detail failed to fetch',
              payload: dataSet,
              transaction_id: dataSet.id,
              transaction_classify: 'ACCOUNT_GET',
            })
          )
        )

        jest
          .spyOn(bcrypt, 'compare')
          .mockImplementation(() => Promise.resolve(false))

        await expect(async () => {
          await service.signIn({
            email: dataSet.email,
            password: dataSet.password,
          })
        }).rejects.toThrowError(new Error(JSON.stringify(mockError)))

        expect(service.accountFind).toHaveBeenCalled()
      }
    )

    it(
      testCaption('HANDLING', 'data', 'Config meta', {
        tab: 1,
      }),
      async () => {
        const configMock = {
          setter: {
            APPLICATION_LOGO: '1',
            APPLICATION_ICON: '1',
          },
        }

        const cacheGetter = jest
          .spyOn(cacheManager, 'get')
          .mockResolvedValue(configMock)

        // const configGetter = jest.spyOn(configService, 'get')

        await service.configMeta().then(() => {
          expect(cacheGetter).toHaveBeenCalledTimes(
            Object.keys(configMock.setter).length
          )
        })
      }
    )

    it(
      testCaption('HANDLING', 'data', 'Auth service error', {
        tab: 1,
      }),
      async () => {
        const mockError = mockResponse({
          code: modCodes[AccountService.name],
          message: 'Sign in failed. Account not found',
          payload: {},
          transaction_id: '',
          transaction_classify: 'ACCOUNT_SIGNIN',
        })
        const dataSet = accountDocArray[0]

        jest.spyOn(service, 'accountFind').mockReturnValue(
          Promise.resolve(
            mockResponse({
              code: modCodes[AccountService.name],
              message: 'Account detail failed to fetch',
              payload: dataSet,
              transaction_id: dataSet.id,
              transaction_classify: 'ACCOUNT_GET',
            })
          )
        )

        jest
          .spyOn(bcrypt, 'compare')
          .mockImplementation(() => Promise.resolve(true))

        jest
          .spyOn(authService, 'create_token')
          .mockRejectedValue(new Error(JSON.stringify(mockError)))

        jest.spyOn(cacheManager, 'set')

        jest.spyOn(cacheManager, 'get')

        jest.spyOn(service, 'configMeta').mockResolvedValue([])

        await expect(async () => {
          await service.signIn({
            email: dataSet.email,
            password: dataSet.password,
          })
        }).rejects.toThrowError(new Error(JSON.stringify(mockError)))

        expect(service.accountFind).toHaveBeenCalled()
      }
    )
  })

  describe(
    testCaption('GET DATA', 'data', 'Account - Fetch account list'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Response validity', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(modelAccount, 'aggregate').mockReturnValue({
            exec: jest.fn().mockReturnValue(accountDocArray),
          } as any)
          await service
            .accountAll(
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
              expect(result.transaction_classify).toEqual('ACCOUNT_GET')

              // Not an empty string so be informative
              expect(result.message).not.toBe('')

              // Should return success code
              expect(result.statusCode.customCode).toEqual(
                modCodes.Global.success
              )

              // Should be an array of data
              expect(result.payload).toBeInstanceOf(Array)

              // Data should be defined
              expect(result.payload).toEqual(accountDocArray)
            })
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Response error', {
          tab: 1,
        }),
        async () => {
          const mockError = mockResponse({
            code: modCodes[AccountService.name],
            message: 'Account failed to fetch',
            payload: {},
            transaction_id: '',
            transaction_classify: 'ACCOUNT_GET',
          })

          jest.spyOn(modelAccount, 'aggregate').mockReturnValue({
            exec: jest
              .fn()
              .mockRejectedValue(new Error(JSON.stringify(mockError))),
          } as any)

          await expect(
            service.accountAll(`{
              "first": 0,
              "rows": 10,
              "sortField": "created_at",
              "sortOrder": 1,
              "filters": {}
            }`)
          ).rejects.toThrowError(new Error(JSON.stringify(mockError)))
        }
      )
    }
  )

  describe(
    testCaption('GET DETAIL', 'data', 'Account - Fetch account detail'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Detail - Response validity', {
          tab: 1,
        }),
        async () => {
          const findMockAccount = accountDocArray[0]
          modelAccount.findOne = jest.fn().mockImplementationOnce(() => {
            return Promise.resolve(findMockAccount)
          })

          await service
            .accountDetail(findMockAccount.id)
            .then((result: GlobalResponse) => {
              // Deep equality check
              expect(result.payload).toEqual(findMockAccount)

              // Should classify transaction
              expect(result.transaction_classify).toEqual('ACCOUNT_GET')

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
        testCaption('HANDLING', 'data', 'Find - Response validity', {
          tab: 1,
        }),
        async () => {
          const findMockAccount = mockAccount()
          modelAccount.findOne = jest.fn().mockImplementationOnce(() => {
            return Promise.resolve(findMockAccount)
          })

          await service
            .accountFind({
              id: findMockAccount.id,
            })
            .then((result: GlobalResponse) => {
              // Deep equality check
              expect(result.payload).toEqual(findMockAccount)

              // Should classify transaction
              expect(result.transaction_classify).toEqual('ACCOUNT_FIND')

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
        testCaption('HANDLING', 'data', 'Response error', {
          tab: 1,
        }),
        async () => {
          const targetData = mockAccount()
          const mockError = mockResponse({
            code: modCodes[AccountService.name],
            message: 'Account detail failed to fetch',
            payload: {},
            transaction_id: targetData.id,
            transaction_classify: 'ACCOUNT_GET',
          })

          jest.spyOn(modelAccount, 'findOne').mockImplementationOnce(() => {
            throw new Error(JSON.stringify(mockError))
          })

          await expect(async () => {
            await service.accountDetail(targetData.id)
          }).rejects.toThrowError(new Error(JSON.stringify(mockError)))
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Response error', {
          tab: 1,
        }),
        async () => {
          const targetData = mockAccount()
          const mockError = mockResponse({
            code: modCodes[AccountService.name],
            message: 'Account not found',
            payload: {},
            transaction_id: '',
            transaction_classify: 'ACCOUNT_FIND',
          })

          jest.spyOn(modelAccount, 'findOne').mockImplementationOnce(() => {
            throw new Error(JSON.stringify(mockError))
          })

          await expect(async () => {
            await service.accountFind({ id: targetData.id })
          }).rejects.toThrowError(new Error(JSON.stringify(mockError)))
        }
      )
    }
  )

  describe(testCaption('ADD DATA', 'data', 'Account - Add new account'), () => {
    it(testCaption('DATA', 'data', 'Should add new account'), async () => {
      jest.spyOn(modelAccount, 'create')

      await service
        .accountAdd(
          {
            first_name: mockAccount().first_name,
            last_name: mockAccount().last_name,
            phone: mockAccount().phone,
            email: mockAccount().email,
            password: mockAccount().password,
            authority: mockAccount().authority,
          },
          mockAccount()
        )
        .then((result: GlobalResponse) => {
          // Should create id
          expect(result.payload).toHaveProperty('id')

          // Should classify transaction
          expect(result.transaction_classify).toEqual('ACCOUNT_ADD')

          // Not an empty string so be informative
          expect(result.message).not.toBe('')

          // Should return success code
          expect(result.statusCode.customCode).toEqual(modCodes.Global.success)
        })
    })

    it(
      testCaption('HANDLING', 'data', 'Response error', {
        tab: 1,
      }),
      async () => {
        const mockError = mockResponse({
          code: modCodes[AccountService.name],
          message: 'Account failed to create',
          payload: {},
          transaction_id: '',
          transaction_classify: 'ACCOUNT_ADD',
        })

        jest.spyOn(modelAccount, 'create').mockImplementationOnce(() => {
          throw new Error(JSON.stringify(mockError))
        })

        await expect(async () => {
          await service.accountAdd(
            {
              email: mockAccount().email,
              phone: mockAccount().phone,
              first_name: mockAccount().first_name,
              last_name: mockAccount().last_name,
              password: '',
              authority: mockAccount().authority,
            },
            mockAccount()
          )
        }).rejects.toThrowError(new Error(JSON.stringify(mockError)))
      }
    )
  })

  describe(testCaption('EDIT DATA', 'data', 'Account - Edit account'), () => {
    it(
      testCaption('HANDLING', 'data', 'Should edit account data', { tab: 1 }),
      async () => {
        jest.spyOn(modelAccount, 'findOneAndUpdate')

        await service
          .accountEdit(
            {
              email: accountDocArray[1].email,
              first_name: accountDocArray[1].first_name,
              last_name: accountDocArray[1].last_name,
              phone: accountDocArray[1].phone,
              authority: accountDocArray[1].authority,
              __v: 0,
            },
            accountDocArray[0].id
          )
          .then((result: GlobalResponse) => {
            // Should create id
            expect(result.payload).toHaveProperty('id')

            // Should classify transaction
            expect(result.transaction_classify).toEqual('ACCOUNT_EDIT')

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
      testCaption('HANDLING', 'data', 'Response error', {
        tab: 1,
      }),
      async () => {
        const targetID = mockAccount().id
        const mockError = mockResponse({
          code: modCodes[AccountService.name],
          message: 'Account failed to update',
          payload: {},
          transaction_id: targetID,
          transaction_classify: 'ACCOUNT_EDIT',
        })

        jest
          .spyOn(modelAccount, 'findOneAndUpdate')
          .mockImplementationOnce(() => {
            throw new Error(JSON.stringify(mockError))
          })

        await expect(async () => {
          await service.accountEdit(
            {
              email: mockAccount().email,
              phone: mockAccount().phone,
              first_name: mockAccount().first_name,
              last_name: mockAccount().last_name,
              authority: mockAccount().authority,
              __v: 0,
            },
            targetID
          )
        }).rejects.toThrowError(new Error(JSON.stringify(mockError)))
      }
    )
  })

  describe(
    testCaption('DELETE DATA', 'data', 'Account - Delete account'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should delete account data', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(modelAccount, 'findOneAndUpdate')

          await service
            .accountDelete(accountDocArray[0].id)
            .then((result: GlobalResponse) => {
              // Should classify transaction
              expect(result.transaction_classify).toEqual('ACCOUNT_DELETE')

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
        testCaption('HANDLING', 'data', 'Response error', {
          tab: 1,
        }),
        async () => {
          const targetID = mockAccount().id
          const mockError = mockResponse({
            code: modCodes[AccountService.name],
            message: 'Account failed to delete',
            payload: {},
            transaction_id: targetID,
            transaction_classify: 'ACCOUNT_DELETE',
          })

          jest
            .spyOn(modelAccount, 'findOneAndUpdate')
            .mockImplementationOnce(() => {
              throw new Error(JSON.stringify(mockError))
            })

          await expect(async () => {
            await service.accountDelete(targetID)
          }).rejects.toThrowError(new Error(JSON.stringify(mockError)))
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
