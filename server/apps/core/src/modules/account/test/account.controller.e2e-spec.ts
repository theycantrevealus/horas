import { AccountController } from '@core/account/account.controller'
import { AccountAddDTO } from '@core/account/dto/account.add'
import { AccountEditDTO } from '@core/account/dto/account.edit'
import {
  accountDocArray,
  mockAccount,
  mockAccountModel,
  mockAccountService,
} from '@core/account/mock/account.mock'
import { Account } from '@core/account/schemas/account.model'
import { JwtAuthGuard } from '@guards/jwt'
import { LogActivity } from '@log/schemas/log.activity'
import { CanActivate } from '@nestjs/common'
import { getModelToken } from '@nestjs/mongoose'
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify'
import { Test, TestingModule } from '@nestjs/testing'
import { AuthService } from '@security/auth.service'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { testCaption } from '@utility/string'
import { Types } from 'mongoose'

import { AccountService } from '../account.service'

describe('Account Controller', () => {
  const mock_Guard: CanActivate = { canActivate: jest.fn(() => true) }
  let app: NestFastifyApplication
  let controller: AccountController

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountController],
      providers: [
        {
          provide: WINSTON_MODULE_PROVIDER,
          useValue: {
            log: jest.fn(),
            warn: jest.fn(),
            verbose: jest.fn(),
            error: jest.fn(),
          },
        },
        { provide: AccountService, useValue: mockAccountService },
        { provide: AuthService, useValue: {} },
        { provide: getModelToken(Account.name), useValue: mockAccountModel },
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

    controller = module.get<AccountController>(AccountController)

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

  it(
    testCaption('FLOW', 'feature', 'Should return success add', {
      tab: 0,
    }),
    async () => {
      const data = new AccountAddDTO(mockAccount())
      return app
        .inject({
          method: 'POST',
          url: '/account',
          body: data,
        })
        .then((result) => {
          expect(result.statusCode).toEqual(200)
        })
    }
  )

  it(
    testCaption(
      'FLOW',
      'feature',
      '[Negative Test] Should return success add',
      {
        tab: 1,
      }
    ),
    async () => {
      const data = new AccountAddDTO(mockAccount())
      return app
        .inject({
          method: 'POST',
          url: '/account',
          validate: true,
          body: data,
        })
        .then((result) => {
          console.log(result.body)
          expect(result.statusCode).toEqual(200)
        })
    }
  )

  it(testCaption('FLOW', 'feature', 'Should return success edit'), async () => {
    const data = new AccountEditDTO({
      email: accountDocArray[1].email,
      first_name: accountDocArray[1].first_name,
      last_name: accountDocArray[1].last_name,
      phone: accountDocArray[1].phone,
      __v: 0,
    })
    const id = `account-${new Types.ObjectId().toString()}`

    return app
      .inject({
        method: 'PATCH',
        url: `/account/${id}`,
        body: data,
      })
      .then((result) => {
        expect(result.statusCode).toEqual(200)
      })
  })

  it(
    testCaption('FLOW', 'feature', 'Should pass detail to service'),
    async () => {
      const id = new Types.ObjectId().toString()
      return app
        .inject({
          method: 'GET',
          url: `/account/${id}`,
        })
        .then((result) => {
          expect(result.statusCode).toEqual(200)
        })
    }
  )

  it(
    testCaption('FLOW', 'feature', 'Should pass delete to service'),
    async () => {
      const id = `account-${new Types.ObjectId().toString()}`
      return app
        .inject({
          method: 'DELETE',
          url: `/account/${id}`,
        })
        .then((result) => {
          expect(result.statusCode).toEqual(200)
        })
    }
  )

  afterAll(async () => {
    await app.close()
  })
})
