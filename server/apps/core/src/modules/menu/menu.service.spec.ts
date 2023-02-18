import { AccountModule } from '@core/account/account.module'
import { MenuModel, MenuSchema } from '@core/menu/schemas/menu.model'
import { getConnectionToken, MongooseModule } from '@nestjs/mongoose'
import { Test, TestingModule } from '@nestjs/testing'
import { AuthModule } from '@security/auth.module'
import {
  closeInMongodConnection,
  rootMongooseTestModule,
} from '@utility/mongoose'
import { Connection } from 'mongoose'

import { MenuService } from './menu.service'

describe('MenuService', () => {
  let service: MenuService
  let connection: Connection

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MenuService],
      imports: [
        rootMongooseTestModule(),
        MongooseModule.forFeature([
          { name: MenuModel.name, schema: MenuSchema },
        ]),
        AuthModule,
        AccountModule,
      ],
    }).compile()

    service = module.get<MenuService>(MenuService)
    connection = module.get(getConnectionToken())
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  afterAll(async () => {
    await closeInMongodConnection()
    await connection.close()
  })
})
