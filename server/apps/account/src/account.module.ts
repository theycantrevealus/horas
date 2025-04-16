import { ApplicationConfig } from '@configuration/environtment'
import { KafkaConfig } from '@configuration/kafka'
import { MongoConfig } from '@configuration/mongo'
import { RedisConfig } from '@configuration/redis'
import { SocketIoClientProvider } from '@gateway_socket/socket.provider'
import { SocketIoClientProxyService } from '@gateway_socket/socket.proxy'
import { LogActivity, LogActivitySchema } from '@log/schemas/log.activity'
import { LogLogin, LogLoginSchema } from '@log/schemas/log.login'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { MongooseModule } from '@nestjs/mongoose'
import { MongoMiddlewareAccount } from '@schemas/account/account.middleware'
import { Account, AccountSchema } from '@schemas/account/account.model'
import { MongoMiddlewareAuthority } from '@schemas/account/authority.middleware'
import { Authority, AuthoritySchema } from '@schemas/account/authority.model'
import { AuthService } from '@security/auth.service'
import { DecoratorProcessorService } from '@utility/decorator'
import { environmentIdentifier, environmentName } from '@utility/environtment'
import { KafkaProvider } from '@utility/kafka'
import { WinstonModule } from '@utility/logger/module'
import { WinstonCustomTransports } from '@utility/transport.winston'

import { AccountController } from './account.controller'
import { AccountService } from './account.service'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: environmentIdentifier,
      load: [ApplicationConfig, MongoConfig, KafkaConfig, RedisConfig],
    }),
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        return {
          handleRejections: true,
          handleExceptions: true,
          colorize: configService.get<boolean>('application.log.colorize'),
          transports: WinstonCustomTransports[environmentName],
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
    KafkaProvider(
      ['ACCOUNT_SERVICE'],
      [
        {
          configClass: 'kafka.account',
          producerModeOnly: false,
          schema: [
            {
              topic: 'account',
              headers: 'account/header.avsc',
              key: 'global/key.avsc',
              value: 'account/value.avsc',
            },
          ],
        },
      ]
    ),
  ],
  controllers: [AccountController],
  providers: [
    MongoMiddlewareAccount,
    MongoMiddlewareAuthority,
    AuthService,
    JwtService,
    AccountService,
    DecoratorProcessorService,
    SocketIoClientProvider,
    SocketIoClientProxyService,
  ],
})
export class AccountModule {}
