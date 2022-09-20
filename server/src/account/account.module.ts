import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AccountModel } from '@/models/account.model'
import { AccountController } from './account.controller'
import { AccountService } from './account.service'
import { AccountAuthorityModel } from '@/models/account.authority.model'
import { AccountPermissionModel } from '@/models/account.permission.model'
import { AccountPrivilegesModel } from '@/models/account.privileges.model'
import { CoreLogActivityModel } from '@/models/core.logging.activity.model'
import { CoreLogLoginModel } from '@/models/core.logging.login.model'
import { AuthModule } from '@/auth/auth.module'
import { DataSource } from 'typeorm'
import { LoggingInterceptor } from '@/interceptors/logging.interceptor'

@Module({
  imports: [
    TypeOrmModule.forFeature(
      [
        AccountModel,
        AccountAuthorityModel,
        AccountPermissionModel,
        AccountPrivilegesModel,
        AccountPermissionModel,

        CoreLogLoginModel,
        CoreLogActivityModel,
      ],
      'default'
    ),
    AuthModule,
  ],
  controllers: [AccountController],
  providers: [AccountService, LoggingInterceptor],
  exports: [AccountService],
})
export class AccountModule {
  constructor(private dataSource: DataSource) {
    //
  }
}
