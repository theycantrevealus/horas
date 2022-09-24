import { AccountController } from '@/account/account.controller'
import { AuthModule } from '@/auth/auth.module'
import { LoggingInterceptor } from '@/interceptors/logging.interceptor'
import { AccountAuthorityModel } from '@/models/account.authority.model'
import { AccountModel } from '@/models/account.model'
import { AccountPermissionModel } from '@/models/account.permission.model'
import { AccountPrivilegesModel } from '@/models/account.privileges.model'
import { CoreLogActivityModel } from '@/models/core.logging.activity.model'
import { CoreLogLoginModel } from '@/models/core.logging.login.model'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { CLIService } from './cli.service'
import entities from '@configs/entities'
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt'
import postgresql from '@/configs/postgresql'
import redis from '@configs/redis'
import application from '@configs/application'
import { AccountModule } from '@/account/account.module'
import { CommandModule } from 'nestjs-command'
import { SeedStartedCommand } from './commands/seed.starter.command'
import { AccountService } from '@/account/account.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AccountModel,
      AccountPrivilegesModel,
      AccountPermissionModel,
      CoreLogLoginModel,
      CoreLogActivityModel,
    ]),
    AuthModule,
    CommandModule,
  ],
  controllers: [],
  providers: [SeedStartedCommand, AccountService, LoggingInterceptor],
  exports: [SeedStartedCommand],
})
export class CLIModule {
  constructor(private dataSource: DataSource) {
    //
  }
}
