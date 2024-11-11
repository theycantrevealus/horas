import { ApplicationConfig } from '@configuration/environtment'
import { KafkaConfig } from '@configuration/kafka'
import { MongoConfig } from '@configuration/mongo'
import { RedisConfig } from '@configuration/redis'
import { ClientDecoratorProcessorService } from '@decorators/kafka/client'
import { AccountModule } from '@gateway_core/account/account.module'
import { LogActivity, LogActivitySchema } from '@log/schemas/log.activity'
import { LogLogin, LogLoginSchema } from '@log/schemas/log.login'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose'
import {
  MasterQueue,
  MasterQueueSchema,
} from '@schemas/master/master.queue.machine'
import { AuthModule } from '@security/auth.module'
import { environmentIdentifier, environmentName } from '@utility/environtment'
import { WinstonModule } from '@utility/logger/module'
import { WinstonCustomTransports } from '@utility/transport.winston'

import { GatewayQueueController } from './gateway_queue.controller'
import { GatewayQueueService } from './gateway_queue.service'

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
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      connectionName: 'primary',
      useFactory: async (
        configService: ConfigService
      ): Promise<MongooseModuleOptions> => ({
        uri: `${configService.get<string>(
          'mongo.primary.uri'
        )}?${configService.get<string>('mongo.primary.replica_set') !== '' ? `replicaSet=${configService.get<string>('mongo.primary.replica_set')}` : ''}`,
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature(
      [
        { name: MasterQueue.name, schema: MasterQueueSchema },

        { name: LogLogin.name, schema: LogLoginSchema },
        { name: LogActivity.name, schema: LogActivitySchema },
      ],
      'primary'
    ),
    AuthModule,
    AccountModule,
  ],
  controllers: [GatewayQueueController],
  providers: [ClientDecoratorProcessorService, GatewayQueueService],
})
export class GatewayQueueModule {}
