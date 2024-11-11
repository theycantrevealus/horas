import { AuthorityController } from '@gateway_core/account/authority.controller'
import { AuthorityService } from '@gateway_core/account/authority.service'
import { LogActivity, LogActivitySchema } from '@log/schemas/log.activity'
import { LogLogin, LogLoginSchema } from '@log/schemas/log.login'
import { CacheModule } from '@nestjs/cache-manager'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { MongooseModule } from '@nestjs/mongoose'
import { MongoMiddlewareAccount } from '@schemas/account/account.middleware'
import { Account, AccountSchema } from '@schemas/account/account.model'
import { MongoMiddlewareAuthority } from '@schemas/account/authority.middleware'
import { Authority, AuthoritySchema } from '@schemas/account/authority.model'
import { AuthModule } from '@security/auth.module'
import * as redisStore from 'cache-manager-ioredis'

import { AccountController } from './account.controller'
import { AccountService } from './account.service'

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        return {
          store: redisStore,
          host: configService.get<string>('redis.host'),
          port: configService.get<string>('redis.port'),
          username: configService.get<string>('redis.username'),
          password: configService.get<string>('redis.password'),
          isGlobal: true,
        }
      },
      inject: [ConfigService],
    }),
    MongooseModule.forFeature(
      [
        { name: Account.name, schema: AccountSchema },
        { name: Authority.name, schema: AuthoritySchema },
        { name: LogLogin.name, schema: LogLoginSchema },
        { name: LogActivity.name, schema: LogActivitySchema },
      ],
      'primary'
    ),
    AuthModule,
  ],
  controllers: [AccountController, AuthorityController],
  providers: [
    AccountService,
    AuthorityService,
    MongoMiddlewareAuthority,
    MongoMiddlewareAccount,
  ],
  exports: [AccountService, AuthorityService],
})
export class AccountModule {}
