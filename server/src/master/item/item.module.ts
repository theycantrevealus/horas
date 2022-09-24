import { Module } from '@nestjs/common'
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
import { MasterItemService } from './item.serivce'
import { TypeOrmModule } from '@nestjs/typeorm'
import { MasterItemModel } from '@/models/master.item.model'
import { MasterItemController } from './item.controller'

@Module({
  controllers: [MasterItemController],
  imports: [
    TypeOrmModule.forFeature(
      [
        MasterItemModel,
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
  providers: [MasterItemService, AccountService, LoggingInterceptor],
  exports: [MasterItemService],
})
export class MasterItemModule {}
