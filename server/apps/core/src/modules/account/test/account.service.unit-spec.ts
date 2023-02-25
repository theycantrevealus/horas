import { AccountSignInDTO } from '@core/account/dto/account.signin'
import { IAccount } from '@core/account/interface/account'
import { accountStub } from '@core/account/mock/account.stub'
import {
  AccountDocument,
  AccountModel,
} from '@core/account/schemas/account.model'
import { createMock } from '@golevelup/ts-jest'
import { LogLogin } from '@log/schemas/log.login'
import { getConnectionToken, getModelToken } from '@nestjs/mongoose'
import { Test, TestingModule } from '@nestjs/testing'
import { AuthService } from '@security/auth.service'
import { GlobalResponse } from '@utility/dto/response'
import { close, connect } from '@utility/mongoose'
import { TimeManagement } from '@utility/time'
import { Connection, Model, Query, Types } from 'mongoose'

import { AccountService } from '../account.service'

describe('Account Service', () => {
  let service: AccountService
  let connection: Connection
  let model: Model<AccountDocument>

  const mockAccount = (
    first_name = 'Ventus',
    last_name = 'Doe',
    email = '',
    phone = '123',
    access: Types.ObjectId[] = [],
    created_by: AccountModel,
    created_at: Date = new TimeManagement().getTimezone('Asia/Jakarta'),
    updated_at: Date = new TimeManagement().getTimezone('Asia/Jakarta'),
    deleted_at: Date | null = null
  ): IAccount => accountStub()

  const mockAccountDoc = (
    mock?: Partial<AccountModel>
  ): Partial<AccountDocument> => ({
    first_name: mock?.first_name || 'UPDATEDJohn',
    last_name: mock?.last_name || 'UPDATEDDoe',
    email: mock?.email || 'johndoe@example.com',
    password: mock?.password || '',
    phone: mock?.phone || '0822996633112',
    access: mock?.access || [],
    created_by: mock?.created_by || null,
    created_at:
      mock?.created_by || new TimeManagement().getTimezone('Asia/Jakarta'),
    updated_at:
      mock?.updated_at || new TimeManagement().getTimezone('Asia/Jakarta'),
    deleted_at:
      mock?.deleted_at ||
      new TimeManagement().getTimezone('Asia/Jakarta') ||
      null,
  })

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [await connect()],
      providers: [
        AccountService,
        {
          provide: getModelToken(AccountModel.name),
          // notice that only the functions we call from the model are mocked
          useValue: {
            new: jest.fn(),
            constructor: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            create: jest.fn(),
            remove: jest.fn(),
            exec: jest.fn(),
            then: jest.fn(),
          },
        },
        {
          provide: getModelToken(LogLogin.name),
          // notice that only the functions we call from the model are mocked
          useValue: {
            new: jest.fn(),
            constructor: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            create: jest.fn(),
            remove: jest.fn(),
            exec: jest.fn(),
          },
        },
        {
          provide: AuthService,
          useValue: {
            create_token: jest.fn().mockImplementation(),
            validate_token: jest.fn().mockImplementation(),
          },
        },
      ],
    }).compile()

    service = module.get<AccountService>(AccountService)
    await connect()
    connection = await module.get(getConnectionToken())
    model = module.get<Model<AccountDocument>>(getModelToken(AccountModel.name))
  })

  beforeEach(() => {
    expect(service).toBeDefined()
  })

  it('Login test', async () => {
    jest.spyOn(model, 'findOne').mockReturnValueOnce(
      createMock<Query<AccountDocument, AccountDocument>>({
        exec: jest.fn().mockResolvedValueOnce(mockAccountDoc(accountStub())),
      } as any)
    )

    const findMockAccount = accountStub()
    const detail = (await service.signin({
      email: accountStub().email,
      password: '12345678',
    } satisfies AccountSignInDTO)) satisfies GlobalResponse

    console.log(detail)

    expect(detail.payload).toHaveProperty('first_name')
    //toEqual(findMockAccount.first_name)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  afterAll(async () => {
    await close()
    await connection.close()
  })
})
