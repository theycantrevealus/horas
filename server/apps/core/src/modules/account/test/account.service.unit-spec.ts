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
  let accountService: AccountService
  let authService: AuthService
  let cacheManager: Cache
  let accountModel: Model<Account>

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

    accountService = module.get<AccountService>(AccountService)
    authService = module.get<AuthService>(AuthService)
    cacheManager = module.get(CACHE_MANAGER)
    accountModel = module.get<Model<AccountDocument>>(
      getModelToken(Account.name)
    )
  })

  it(
    testCaption('SERVICE STATE', 'component', 'Service should be defined'),
    () => {
      expect(accountService).toBeDefined()
    }
  )

  describe(testCaption('SIGN IN', 'data', 'Account - Sign in'), () => {
    it(
      testCaption('HANDLING', 'data', 'Correct credential', {
        tab: 1,
      }),
      async () => {
        const dataSet = accountDocArray[0]

        jest.spyOn(accountService, 'accountFind').mockReturnValue(
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

        await accountService
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

        expect(accountService.accountFind).toHaveBeenCalled()

        // jest.spyOn(cacheManager, 'set')

        const sampleRedisData = Promise.resolve({
          name: '',
          setter: '',
          remark: '',
          __v: 0,
        })

        jest
          .spyOn(cacheManager, 'get')
          .mockImplementation(() => sampleRedisData)

        await cacheManager.get('test').then((testData) => {
          expect(testData).toHaveProperty('setter')
        })

        jest.spyOn(accountService, 'configMeta').mockResolvedValue({
          data: 'test',
        })

        await expect(async () => {
          await accountService.configMeta()
        }).toBeInstanceOf(Object)
      }
    )

    it(
      testCaption('HANDLING', 'data', 'Wrong credential', {
        tab: 1,
      }),
      async () => {
        const mockError = mockResponse({
          code: modCodes[AccountService.name],
          message: 'Sign in failed',
          payload: {},
          transaction_id: '',
          transaction_classify: 'ACCOUNT_SIGNIN',
        })

        const dataSet = accountDocArray[0]

        jest.spyOn(accountService, 'accountFind').mockReturnValue(
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
          await accountService.signIn({
            email: dataSet.email,
            password: dataSet.password,
          })
        }).rejects.toThrowError(new Error(JSON.stringify(mockError)))

        expect(accountService.accountFind).toHaveBeenCalled()
      }
    )

    it(
      testCaption('HANDLING', 'data', 'Config meta', {
        tab: 1,
      }),
      async () => {
        const configMock = {
          setter: {
            APPLICATION_LOGO: {
              name: '',
              setter: '',
              remark: '',
              __v: 0,
            },
            APPLICATION_ICON: {
              name: '',
              setter: '',
              remark: '',
              __v: 0,
            },
          },
        }

        const cacheGetter = jest
          .spyOn(cacheManager, 'get')
          .mockResolvedValue(configMock)

        // const configGetter = jest.spyOn(configService, 'get')

        await accountService.configMeta().then(() => {
          expect(cacheGetter).toHaveBeenCalledTimes(
            Object.keys(configMock.setter).length + 1
          )
        })
      }
    )

    it(
      testCaption('HANDLING', 'data', 'Response error on find data', {
        tab: 1,
      }),
      async () => {
        const mockError = mockResponse({
          code: modCodes[AccountService.name],
          message: 'Sign in failed',
          payload: {},
          transaction_id: '',
          transaction_classify: 'ACCOUNT_SIGNIN',
        })

        jest.spyOn(cacheManager, 'get').mockImplementationOnce(() => {
          throw new Error(JSON.stringify(mockError))
        })

        await expect(accountService.configMeta()).rejects.toThrow(Error)
      }
    )

    it(
      testCaption('HANDLING', 'data', 'Auth service error', {
        tab: 1,
      }),
      async () => {
        const mockError = mockResponse({
          code: modCodes[AccountService.name],
          message: 'Sign in failed',
          payload: {},
          transaction_id: '',
          transaction_classify: 'ACCOUNT_SIGNIN',
        })
        const dataSet = accountDocArray[0]

        jest.spyOn(accountService, 'accountFind').mockReturnValue(
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

        jest.spyOn(accountService, 'configMeta').mockResolvedValue([])

        await expect(async () => {
          await accountService.signIn({
            email: dataSet.email,
            password: dataSet.password,
          })
        }).rejects.toThrowError(new Error(JSON.stringify(mockError)))

        expect(accountService.accountFind).toHaveBeenCalled()
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
          jest.spyOn(accountModel, 'aggregate').mockReturnValue({
            exec: jest.fn().mockReturnValue(accountDocArray),
          } as any)
          await accountService
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
        testCaption('HANDLING', 'data', 'Response error on find data', {
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

          jest.spyOn(accountModel, 'aggregate').mockReturnValue({
            exec: jest
              .fn()
              .mockRejectedValue(new Error(JSON.stringify(mockError))),
          } as any)

          await expect(
            accountService.accountAll(`{
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
          accountModel.findOne = jest.fn().mockImplementationOnce(() => {
            return Promise.resolve(findMockAccount)
          })

          await accountService
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
          accountModel.findOne = jest.fn().mockImplementationOnce(() => {
            return Promise.resolve(findMockAccount)
          })

          await accountService
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
        testCaption('HANDLING', 'data', 'Response error on find data', {
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

          jest.spyOn(accountModel, 'findOne').mockImplementationOnce(() => {
            throw new Error(JSON.stringify(mockError))
          })

          await expect(async () => {
            await accountService.accountDetail(targetData.id)
          }).rejects.toThrowError(new Error(JSON.stringify(mockError)))
        }
      )

      it(
        testCaption('HANDLING', 'data', 'Response error on get data detail', {
          tab: 1,
        }),
        async () => {
          const targetData = mockAccount()
          const mockError = mockResponse({
            code: modCodes[AccountService.name],
            message: 'Account detail failed to fetch',
            payload: {},
            transaction_id: '',
            transaction_classify: 'ACCOUNT_FIND',
          })

          jest.spyOn(accountModel, 'findOne').mockImplementationOnce(() => {
            throw new Error(JSON.stringify(mockError))
          })

          await expect(async () => {
            await accountService.accountFind({ id: targetData.id })
          }).rejects.toThrowError(new Error(JSON.stringify(mockError)))
        }
      )
    }
  )

  describe(testCaption('ADD DATA', 'data', 'Account - Add new account'), () => {
    it(testCaption('DATA', 'data', 'Should add new account'), async () => {
      jest.spyOn(accountModel, 'create')

      await accountService
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

    it(testCaption('DATA', 'data', 'Should add new account'), async () => {
      jest.spyOn(accountService, 'accountAdd')

      await accountService
        .accountAdd(
          {
            first_name: mockAccount().first_name,
            last_name: mockAccount().last_name,
            phone: mockAccount().phone,
            email: mockAccount().email,
            password: '',
            authority: mockAccount().authority,
          },
          mockAccount()
        )
        .then((result: GlobalResponse) => {
          expect(result.payload).toHaveProperty('password')

          const passwordIfEmpty = result.payload['password']
          expect(passwordIfEmpty).not.toEqual('')

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
      testCaption('HANDLING', 'data', 'Response error on create data', {
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

        jest.spyOn(accountModel, 'create').mockImplementationOnce(() => {
          throw new Error(JSON.stringify(mockError))
        })

        await expect(async () => {
          await accountService.accountAdd(
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
        jest.spyOn(accountModel, 'findOneAndUpdate')

        await accountService
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
      testCaption('HANDLING', 'data', 'Response error on update data', {
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
          .spyOn(accountModel, 'findOneAndUpdate')
          .mockImplementationOnce(() => {
            throw new Error(JSON.stringify(mockError))
          })

        await expect(async () => {
          await accountService.accountEdit(
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
        }).rejects.toThrow(Error)
      }
    )
  })

  describe(
    testCaption(
      'UPDATE DATA',
      'data',
      'Account - Update access and permission'
    ),
    () => {
      it(
        testCaption(
          'HANDLING',
          'data',
          'Should edit account access and permission',
          { tab: 1 }
        ),
        async () => {
          jest.spyOn(accountModel, 'findOneAndUpdate')
          jest.spyOn(accountModel, 'find').mockReturnValue({
            exec: jest.fn().mockReturnValue(accountDocArray),
          } as any)
          // jest.spyOn(accountModel, 'updateMany')
          await accountService
            .accountUpdateAccess('menu-id', {
              name: 'TestMenu',
              url: 'menuurltest',
              identifier: 'menuidentifier',
              permission: [
                {
                  domIdentity: 'domIdentity',
                  dispatchName: 'dispatchName',
                  menu: {
                    id: 'menuID',
                    name: 'menuName',
                    url: 'menuURL',
                    identifier: 'menuIdentifier',
                  },
                },
              ],
            })
            .then((result: GlobalResponse) => {
              expect(result.statusCode.customCode).toEqual(
                modCodes.Global.success
              )
            })

          jest.spyOn(accountModel, 'find').mockReturnValue({
            exec: jest.fn().mockReturnValue([]),
          } as any)

          await accountService
            .accountUpdateAccess('menu-id', {
              name: 'TestMenu',
              url: 'menuurltest',
              identifier: 'menuidentifier',
              permission: [
                {
                  domIdentity: 'domIdentity',
                  dispatchName: 'dispatchName',
                  menu: {
                    id: 'menuID',
                    name: 'menuName',
                    url: 'menuURL',
                    identifier: 'menuIdentifier',
                  },
                },
              ],
            })
            .then((result: GlobalResponse) => {
              expect(result.statusCode.customCode).not.toEqual(
                modCodes.Global.failed
              )
            })
        }
      )

      it(
        testCaption(
          'HANDLING',
          'data',
          'Response error on update access and permission',
          {
            tab: 1,
          }
        ),
        async () => {
          const targetID = mockAccount().id
          const mockError = mockResponse({
            code: modCodes[AccountService.name],
            message: 'Account access and permission failed to updated',
            payload: {},
            transaction_id: targetID,
            transaction_classify: 'ACCOUNT_UPDATE_ACCESS_PERMISSION',
          })

          jest
            .spyOn(accountModel, 'findOneAndUpdate')
            .mockImplementationOnce(() => {
              throw new Error(JSON.stringify(mockError))
            })

          await expect(async () => {
            await accountService.accountUpdateAccess(targetID, {})
          }).rejects.toThrowError(new Error(JSON.stringify(mockError)))
        }
      )
    }
  )

  describe(
    testCaption('DELETE DATA', 'data', 'Account - Delete account'),
    () => {
      it(
        testCaption('HANDLING', 'data', 'Should delete account data', {
          tab: 1,
        }),
        async () => {
          jest.spyOn(accountModel, 'findOneAndUpdate')

          await accountService
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
        testCaption('HANDLING', 'data', 'Response error on delete data', {
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
            .spyOn(accountModel, 'findOneAndUpdate')
            .mockImplementationOnce(() => {
              throw new Error(JSON.stringify(mockError))
            })

          await expect(async () => {
            await accountService.accountDelete(targetID)
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
