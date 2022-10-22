import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CoreMenuModel } from '@/models/core.menu.model'
import { AuthModule } from '@/auth/auth.module'
import { LoggingInterceptor } from '@/interceptors/logging.interceptor'
import { AccountModel } from '@/models/account.model'
import { CoreLogActivityModel } from '@/models/core.logging.activity.model'
import { CoreLogLoginModel } from '@/models/core.logging.login.model'
import { AccountService } from '@/account/account.service'
import { AccountPrivilegesModel } from '@/models/account.privileges.model'
import { AccountPermissionModel } from '@/models/account.permission.model'
import { Corei18nModel } from '@/models/core.i18n.model'
import { Corei18nService } from './i18n.service'
import { Corei18nController } from './i18n.controller'
import { Corei18nComponentModel } from '@/models/core.i18n.compontent.model'

@Module({
  controllers: [Corei18nController],
  imports: [
    TypeOrmModule.forFeature(
      [
        Corei18nModel,
        Corei18nComponentModel,
        CoreMenuModel,
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
  providers: [Corei18nService, AccountService, LoggingInterceptor],
  exports: [Corei18nService],
})
export class Corei18nModule {}
