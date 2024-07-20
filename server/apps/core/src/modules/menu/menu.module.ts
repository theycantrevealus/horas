import { AccountModule } from '@core/account/account.module'
import { MenuController } from '@core/menu/menu.controller'
import { MenuGroupController } from '@core/menu/menu.group.controller'
import { MenuGroupService } from '@core/menu/menu.group.service'
import { MenuService } from '@core/menu/menu.service'
import { LogActivity, LogActivitySchema } from '@log/schemas/log.activity'
import { LogLogin, LogLoginSchema } from '@log/schemas/log.login'
import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { Menu, MenuSchema } from '@schemas/menu/menu'
import { MenuGroup, MenuGroupSchema } from '@schemas/menu/menu.group'
import { MongoMiddlewareMenuGroup } from '@schemas/menu/menu.group.middleware'
import { MongoMiddlewareMenu } from '@schemas/menu/menu.middleware'
import { AuthModule } from '@security/auth.module'

@Module({
  imports: [
    AuthModule,
    AccountModule,
    MongooseModule.forFeature(
      [
        { name: Menu.name, schema: MenuSchema },
        { name: MenuGroup.name, schema: MenuGroupSchema },
        { name: LogLogin.name, schema: LogLoginSchema },
        { name: LogActivity.name, schema: LogActivitySchema },
      ],
      'primary'
    ),
  ],
  controllers: [MenuGroupController, MenuController],
  providers: [
    MongoMiddlewareMenu,
    MongoMiddlewareMenuGroup,
    MenuGroupService,
    MenuService,
  ],
  exports: [MenuGroupService, MenuService],
})
export class MenuModule {}
