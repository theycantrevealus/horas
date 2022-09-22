import { Module } from '@nestjs/common'
import { MenuController } from './menu.controller'
import { MenuService } from './menu.service'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthService } from '../auth/auth.service'
import { MenuGroupController } from './menu.group.controller'
import { MenuGroupService } from './menu.group.service'
import { MenuPermissionController } from './menu.permission.controller'
import { MenuPermissionService } from './menu.permission.service'
import { CoreMenuModel } from '@/models/core.menu.model'
import { CoreMenuGroupModel } from '@/models/core.menu.group.model'
import { CoreMenuPermissionModel } from '@/models/core.menu.permission.model'
import { AuthModule } from '@/auth/auth.module'
import { LoggingInterceptor } from '@/interceptors/logging.interceptor'
import { AccountModel } from '@/models/account.model'
import { CoreLogActivityModel } from '@/models/core.logging.activity.model'
import { CoreLogLoginModel } from '@/models/core.logging.login.model'
import { AccountService } from '@/account/account.service'
import { AccountPrivilegesModel } from '@/models/account.privileges.model'
import { AccountPermissionModel } from '@/models/account.permission.model'

@Module({
  controllers: [MenuController, MenuGroupController, MenuPermissionController],
  imports: [
    TypeOrmModule.forFeature(
      [
        CoreMenuModel,
        CoreMenuGroupModel,
        CoreMenuPermissionModel,
        AccountModel,
        AccountPrivilegesModel,
        AccountPermissionModel,
        CoreLogLoginModel,
        CoreLogActivityModel,
      ],
      'default'
    ),
    AuthModule,
  ],
  providers: [
    MenuService,
    MenuGroupService,
    MenuPermissionService,
    MenuPermissionService,
    AccountService,
    LoggingInterceptor,
  ],
  exports: [
    MenuService,
    MenuGroupService,
    MenuPermissionService,
    MenuPermissionService,
  ],
})
export class MenuModule {}
