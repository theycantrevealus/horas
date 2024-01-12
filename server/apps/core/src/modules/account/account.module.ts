import { AuthorityController } from '@core/account/authority.controller'
import { AccountModelProvider } from '@core/account/schemas/account.provider'
import { AuthorityModelProvider } from '@core/account/schemas/authority.provider'
import { LogActivity, LogActivitySchema } from '@log/schemas/log.activity'
import { LogLogin, LogLoginSchema } from '@log/schemas/log.login'
import { CacheModule } from '@nestjs/cache-manager'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { MongooseModule } from '@nestjs/mongoose'
import { AuthModule } from '@security/auth.module'
import { KafkaModuleOption } from '@utility/kafka/avro/interface'
import { KafkaModule } from '@utility/kafka/avro/module'
import { KafkaProducer } from '@utility/kafka/avro/producer'
import { KafkaAvroResponseDeserializer } from '@utility/kafka/avro/schema-registry.deserializer'
import { KafkaAvroRequestSerializer } from '@utility/kafka/avro/schema-registry.serializer'
import * as redisStore from 'cache-manager-ioredis'
import * as fs from 'fs'
import { join } from 'path'

import { AccountController } from './account.controller'
import { AccountService } from './account.service'

@Module({
  imports: [
    KafkaModule.registerAsync(['ACCOUNT_SERVICE'], {
      useFactory: async (configService: ConfigService) => {
        return [
          {
            name: configService.get<string>('kafka.account.service'),
            options: {
              consumer: {
                groupId: configService.get<string>('kafka.account.cons_group'),
              },
              deserializer: new KafkaAvroResponseDeserializer({
                host: configService.get<string>('schema_registry.host'),
              }),
              serializer: new KafkaAvroRequestSerializer({
                config: {
                  host: configService.get<string>('schema_registry.host'),
                },
                schemas: [
                  {
                    topic: configService.get<string>(
                      'kafka.account.topic.account'
                    ),
                    key: join(
                      __dirname,
                      '../apps/utility/kafka/avro/schema/account/key.avsc'
                    ),
                    value: join(
                      __dirname,
                      '../apps/utility/kafka/avro/schema/account/value.avsc'
                    ),
                  },
                ],
              }),
              client: {
                clientId: configService.get<string>('kafka.account.client'),
                brokers: configService
                  .get<string>('kafka.account.broker')
                  .split(','),
                ssl: {
                  secureProtocol: configService.get<string>(
                    'kafka.account.ssl.protocol'
                  ),
                  rejectUnauthorized: false,
                  ca: [
                    fs.readFileSync(
                      configService.get<string>('kafka.account.ssl.ca'),
                      'utf-8'
                    ),
                  ],
                  key: fs.readFileSync(
                    configService.get<string>('kafka.account.ssl.key'),
                    'utf-8'
                  ),
                  passphrase: configService.get<string>(
                    'kafka.account.ssl.passphrase'
                  ),
                },
                sasl: {
                  mechanism: 'scram-sha-512',
                  username: configService.get<string>(
                    'kafka.account.sasl.username'
                  ),
                  password: configService.get<string>(
                    'kafka.account.sasl.password'
                  ),
                },
              },
            },
          } as KafkaModuleOption,
        ]
      },
      inject: [ConfigService],
    }),
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
    MongooseModule.forFeatureAsync([
      AccountModelProvider,
      AuthorityModelProvider,
    ]),
    MongooseModule.forFeature([
      { name: LogLogin.name, schema: LogLoginSchema },
      { name: LogActivity.name, schema: LogActivitySchema },
    ]),
    AuthModule,
  ],
  controllers: [AccountController, AuthorityController],
  providers: [AccountService, KafkaProducer],
  exports: [AccountService],
})
export class AccountModule {}
