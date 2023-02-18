import {
  AccountModel,
  AccountSchema,
} from '@core/account/schemas/account.model'
import { LogActivity, LogActivitySchema } from '@log/schemas/log.activity'
import { LogLogin, LogLoginSchema } from '@log/schemas/log.login'
import { getConnectionToken, MongooseModule } from '@nestjs/mongoose'
import { Test, TestingModule } from '@nestjs/testing'
import { AuthModule } from '@security/auth.module'
import {
  closeInMongodConnection,
  rootMongooseTestModule,
} from '@utility/mongoose'
import { Connection } from 'mongoose'

import { AccountService } from './account.service'

describe('AccountService', () => {
  let service: AccountService
  let connection: Connection

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AccountService],
      imports: [
        rootMongooseTestModule(),
        MongooseModule.forFeature([
          { name: AccountModel.name, schema: AccountSchema },
          { name: LogLogin.name, schema: LogLoginSchema },
          { name: LogActivity.name, schema: LogActivitySchema },
        ]),
        AuthModule,
      ],
    }).compile()

    connection = module.get(getConnectionToken())
    service = module.get<AccountService>(AccountService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  afterEach(async () => {
    await closeInMongodConnection()
    await connection.close(true)
  })
})
