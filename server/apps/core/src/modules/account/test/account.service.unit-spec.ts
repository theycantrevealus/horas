import { AccountAddDTO } from '@core/account/dto/account.add'
import { AccountEditDTO } from '@core/account/dto/account.edit'
import {
  accountDocArray,
  mockAccount,
  mockAccountDoc,
  mockAccountModel,
} from '@core/account/mock/account.mock'
import { Account, AccountDocument } from '@core/account/schemas/account.model'
import { createMock } from '@golevelup/ts-jest'
import { LogActivity } from '@log/schemas/log.activity'
import { LogLogin } from '@log/schemas/log.login'
import { CacheModule } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { getModelToken } from '@nestjs/mongoose'
import { Test, TestingModule } from '@nestjs/testing'
import { AuthService } from '@security/auth.service'
import { GlobalResponse } from '@utility/dto/response'
import { testCaption } from '@utility/string'
import * as redisStore from 'cache-manager-ioredis'
import { Model, Query, Types } from 'mongoose'

import { AccountService } from '../account.service'

describe('Account Service', () => {
  let service: AccountService
  let model: Model<Account>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        CacheModule.registerAsync({
          isGlobal: true,
          imports: [ConfigModule],
          useFactory: async (configService: ConfigService) => {
            return {
              store: redisStore,
              host: configService.get<string>('redis.host'),
              port: configService.get<string>('redis.port'),
              username: configService.get<string>('redis.username'),
              password: configService.get<string>('redis.password'),
              isGlobal: true,
            }
          },
          inject: [ConfigService],
        }),
      ],
      controllers: [],
      providers: [
        AccountService,
        AuthService,
        JwtService,
        {
          provide: getModelToken(Account.name),
          useValue: mockAccountModel,
        },
        { provide: getModelToken(LogActivity.name), useValue: {} },
        { provide: getModelToken(LogLogin.name), useValue: {} },
      ],
    }).compile()

    service = module.get<AccountService>(AccountService)
    model = module.get<Model<AccountDocument>>(getModelToken(Account.name))

    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it(
    testCaption('SERVICE STATE', 'component', 'Service should be defined'),
    () => {
      expect(service).toBeDefined()
    }
  )

  it(testCaption('DATA', 'data', 'Should list all account'), async () => {
    jest.spyOn(model, 'aggregate').mockReturnValue({
      exec: jest.fn().mockReturnValue(accountDocArray),
    } as any)

    const accounts = await service.all({
      first: 0,
      rows: 10,
      sortField: 'created_at',
      sortOrder: 1,
      filters: {},
    })

    expect(accounts.payload.data).toEqual(accountDocArray)
  })

  it(testCaption('DATA', 'data', 'Should show account detail'), async () => {
    jest.spyOn(model, 'findOne').mockReturnValueOnce(
      createMock<Query<AccountDocument, AccountDocument>>({
        exec: jest.fn().mockResolvedValueOnce(accountDocArray[0]),
      }) as any
    )

    const findMockAccount = accountDocArray[0]
    const foundAccount = await service.find({
      first_name: accountDocArray[0].first_name,
    })
    expect(foundAccount).toEqual(findMockAccount)
  })

  it(testCaption('DATA', 'data', 'Should create a new account'), async () => {
    jest.spyOn(model, 'create').mockImplementationOnce(() => {
      return Promise.resolve(accountDocArray[0])
    })

    const newAccount = (await service.add(
      new AccountAddDTO({ ...mockAccount(), __v: 0 }),
      mockAccount()
    )) satisfies GlobalResponse
    expect(newAccount.payload).toHaveProperty('first_name')
  })

  it(testCaption('DATA', 'data', 'Should edit account data'), async () => {
    jest.spyOn(model, 'findOneAndUpdate').mockReturnValueOnce(
      createMock<Query<AccountDocument, AccountDocument>>({
        exec: jest.fn().mockResolvedValueOnce(mockAccountDoc()),
      }) as any
    )

    const data = (await service.edit(
      new AccountEditDTO({
        email: accountDocArray[1].email,
        first_name: accountDocArray[1].first_name,
        last_name: accountDocArray[1].last_name,
        phone: accountDocArray[1].phone,
        __v: 0,
      }),
      new Types.ObjectId().toString()
    )) satisfies GlobalResponse
    expect(data.payload).toHaveProperty('first_name')
  })

  afterAll(async () => {
    jest.clearAllMocks()
  })
})
