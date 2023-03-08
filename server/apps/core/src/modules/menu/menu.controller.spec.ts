// import { AccountService } from '@core/account/account.service'
// import { Account, AccountSchema } from '@core/account/schemas/account.model'
// import { MenuService } from '@core/menu/menu.service'
// import {
//   MenuGroupModel,
//   MenuGroupSchema,
// } from '@core/menu/schemas/menu.group.model'
// import { MenuModel, MenuSchema } from '@core/menu/schemas/menu.model'
// import { LogActivity, LogActivitySchema } from '@log/schemas/log.activity'
// import { LogLogin, LogLoginSchema } from '@log/schemas/log.login'
// import { getConnectionToken, MongooseModule } from '@nestjs/mongoose'
// import { Test, TestingModule } from '@nestjs/testing'
// import { AuthModule } from '@security/auth.module'
// import {
//   closeInMongodConnection,
//   rootMongooseTestModule,
// } from '@utility/mongoose'
// import { Connection } from 'mongoose'
//
// import { MenuController } from './menu.controller'
//
// describe('MenuController', () => {
//   let controller: MenuController
//   let connection: Connection
//
//   beforeAll(async () => {
//     const module: TestingModule = await Test.createTestingModule({
//       controllers: [MenuController],
//       providers: [MenuService, AccountService],
//       imports: [
//         rootMongooseTestModule(),
//         MongooseModule.forFeature([
//           { name: MenuModel.name, schema: MenuSchema },
//           { name: MenuGroupModel.name, schema: MenuGroupSchema },
//           { name: LogLogin.name, schema: LogLoginSchema },
//           { name: LogActivity.name, schema: LogActivitySchema },
//           { name: Account.name, schema: AccountSchema },
//         ]),
//         AuthModule,
//       ],
//     }).compile()
//
//     controller = module.get<MenuController>(MenuController)
//     connection = module.get(getConnectionToken())
//   })
//
//   it('should be defined', () => {
//     expect(controller).toBeDefined()
//   })
//
//   afterEach(async () => {
//     await closeInMongodConnection()
//     await connection.close(true)
//   })
// })
