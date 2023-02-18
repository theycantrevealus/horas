import { AccountService } from '@core/account/account.service'
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

import { AccountController } from './account.controller'

describe('AccountController', () => {
  let controller: AccountController
  let module: TestingModule
  let connection: Connection

  beforeAll(async () => {
    module = await Test.createTestingModule({
      controllers: [AccountController],
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
    connection = await module.get(getConnectionToken())
    controller = module.get<AccountController>(AccountController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  afterEach(async () => {
    await closeInMongodConnection()
    await module.close()
    await connection.close(true)
  })
})
