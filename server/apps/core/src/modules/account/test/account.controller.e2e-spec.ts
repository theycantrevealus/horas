import { AccountController } from '@core/account/account.controller'
import {
  accountArray,
  mockAccount,
  mockAccountModel,
  mockAccountService,
} from '@core/account/mock/account.mock'
import { Account } from '@core/account/schemas/account.model'
import { Authority } from '@core/account/schemas/authority.model'
import { JwtAuthGuard } from '@guards/jwt'
import { LogActivity } from '@log/schemas/log.activity'
import { LogLogin } from '@log/schemas/log.login'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { CanActivate, HttpStatus } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { getModelToken } from '@nestjs/mongoose'
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify'
import { Test, TestingModule } from '@nestjs/testing'
import { AuthService } from '@security/auth.service'
import { ApiQueryGeneral } from '@utility/dto/prime'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { testCaption } from '@utility/string'
import { Logger } from 'winston'

import { AccountService } from '../account.service'

describe('Account Controller', () => {
  const mock_Guard: CanActivate = { canActivate: jest.fn(() => true) }
  let app: NestFastifyApplication
  let controller: AccountController
  let logger: Logger

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountController],
      providers: [
        {
          provide: AccountService,
          useValue: mockAccountService,
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
          provide: CACHE_MANAGER,
          useValue: {
            get: () => accountArray[0],
            set: () => jest.fn(),
          },
        },
        { provide: AuthService, useValue: {} },
        {
          provide: getModelToken(Account.name),
          useValue: mockAccountModel,
        },
        {
          provide: getModelToken(Authority.name),
          useValue: {},
        },
        { provide: getModelToken(LogLogin.name), useValue: {} },
        { provide: getModelToken(LogActivity.name), useValue: {} },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mock_Guard)
      .compile()

    app = module.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    )
    await app.init()
    await app.getHttpAdapter().getInstance().ready()

    controller = app.get<AccountController>(AccountController)
    logger = app.get<Logger>(WINSTON_MODULE_PROVIDER)

    jest.clearAllMocks()
  })

  it(
    testCaption(
      'CONTROLLER STATE',
      'component',
      'Controller should be defined'
    ),
    () => {
      expect(controller).toBeDefined()
    }
  )

  describe(
    testCaption('FLOW', 'data', 'Account - Get account data lazy loaded'),
    () => {
      it(
        testCaption('FLOW', 'data', 'Should return data', {
          tab: 0,
        }),
        async () => {
          return app
            .inject({
              method: 'GET',
              headers: {
                authorization: 'Bearer ey...',
              },
              url: '/account',
              query: `lazyEvent=${ApiQueryGeneral.primeDT.example}`,
            })
            .then((result) => {
              expect(result.statusCode).toEqual(HttpStatus.OK)
              expect(logger.verbose).toHaveBeenCalled()
            })
        }
      )
    }
  )

  it(
    testCaption('FLOW', 'feature', 'Should return success add', {
      tab: 0,
    }),
    async () => {
      const data = mockAccount()
      delete data.id
      delete data.code
      delete data.created_by
      delete data.created_at
      delete data.updated_at
      delete data.deleted_at
      delete data.access
      delete data.permission
      return app
        .inject({
          method: 'POST',
          url: '/account',
          body: data,
        })
        .then((result) => {
          expect(result.statusCode).toEqual(HttpStatus.CREATED)
          expect(logger.verbose).toHaveBeenCalled()
        })
    }
  )

  // it(testCaption('FLOW', 'feature', 'Should return success edit'), async () => {
  //   const data = new AccountEditDTO({
  //     email: accountDocArray[1].email,
  //     first_name: accountDocArray[1].first_name,
  //     last_name: accountDocArray[1].last_name,
  //     phone: accountDocArray[1].phone,
  //     __v: 0,
  //   })
  //   const id = `account-${new Types.ObjectId().toString()}`
  //
  //   return app
  //     .inject({
  //       method: 'PATCH',
  //       url: `/account/${id}`,
  //       body: data,
  //     })
  //     .then((result) => {
  //       expect(result.statusCode).toEqual(HttpStatus.OK)
  //       expect(logger.verbose).toHaveBeenCalled()
  //     })
  // })
  //
  // it(testCaption('FLOW', 'feature', 'Should return detail'), async () => {
  //   const id = `account-${new Types.ObjectId().toString()}`
  //   return app
  //     .inject({
  //       method: 'GET',
  //       url: `/account/${id}`,
  //     })
  //     .then((result) => {
  //       expect(result.statusCode).toEqual(HttpStatus.OK)
  //       expect(logger.verbose).toHaveBeenCalled()
  //     })
  // })
  //
  // it(
  //   testCaption('FLOW', 'feature', 'Should return delete success'),
  //   async () => {
  //     const id = `account-${new Types.ObjectId().toString()}`
  //     return app
  //       .inject({
  //         method: 'DELETE',
  //         url: `/account/${id}`,
  //       })
  //       .then((result) => {
  //         expect(result.statusCode).toEqual(HttpStatus.OK)
  //         expect(logger.verbose).toHaveBeenCalled()
  //       })
  //   }
  // )

  afterAll(async () => {
    await app.close()
  })
})
