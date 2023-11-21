import {
  Authority,
  AuthoritySchema,
} from '@core/account/schemas/authority.model'
import { LogActivity, LogActivitySchema } from '@log/schemas/log.activity'
import { LogLogin, LogLoginSchema } from '@log/schemas/log.login'
import { CacheModule } from '@nestjs/cache-manager'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { MongooseModule } from '@nestjs/mongoose'
import { AuthModule } from '@security/auth.module'
import * as redisStore from 'cache-manager-ioredis'

import { AccountController } from './account.controller'
import { AccountService } from './account.service'
import { Account, AccountSchema } from './schemas/account.model'

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
    MongooseModule.forFeature([
      { name: Account.name, schema: AccountSchema },
      { name: Authority.name, schema: AuthoritySchema },
      { name: LogLogin.name, schema: LogLoginSchema },
      { name: LogActivity.name, schema: LogActivitySchema },
    ]),
    AuthModule,
  ],
  controllers: [AccountController],
  providers: [AccountService],
  exports: [AccountService],
})
export class AccountModule {}
