import { ApplicationConfig } from '@configuration/environtment'
import { KafkaConfig } from '@configuration/kafka'
import { MongoConfig } from '@configuration/mongo'
import { RedisConfig } from '@configuration/redis'
import { SocketConfig } from '@configuration/socket'
import { ClientDecoratorProcessorService } from '@decorators/kafka/client'
import { LogActivity, LogActivitySchema } from '@log/schemas/log.activity'
import { LogLogin, LogLoginSchema } from '@log/schemas/log.login'
import { CACHE_MANAGER, CacheModule } from '@nestjs/cache-manager'
import { Inject, Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import {
  InjectModel,
  MongooseModule,
  MongooseModuleOptions,
} from '@nestjs/mongoose'
import { Config, ConfigDocument, ConfigSchema } from '@schemas/config/config'
import { ConfigGroup, ConfigGroupSchema } from '@schemas/config/config.group'
import { Queue, QueueSchema } from '@schemas/management/queue'
import { MongoMiddlewareQueue } from '@schemas/management/queue.middleware'
import {
  MasterQueueMachine,
  MasterQueueMachineSchema,
} from '@schemas/master/master.queue.machine'
import {
  MasterReceptionistCounter,
  MasterReceptionistCounterSchema,
} from '@schemas/master/master.receptionist.counter'
import { AuthModule } from '@security/auth.module'
import { SocketIoClientProvider } from '@socket/socket.provider'
import { SocketIoClientProxyService } from '@socket/socket.proxy'
import { environmentIdentifier, environmentName } from '@utility/environtment'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { WinstonModule } from '@utility/logger/module'
import { WinstonCustomTransports } from '@utility/transport.winston'
import { Cache } from 'cache-manager'
import * as redisStore from 'cache-manager-ioredis'
import { Model } from 'mongoose'
import { Logger } from 'winston'

import { GatewayQueueController } from './gateway_queue.controller'
import { GatewayQueueService } from './gateway_queue.service'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: environmentIdentifier,
      load: [
        ApplicationConfig,
        MongoConfig,
        KafkaConfig,
        RedisConfig,
        SocketConfig,
      ],
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
        { name: MasterQueueMachine.name, schema: MasterQueueMachineSchema },
        {
          name: MasterReceptionistCounter.name,
          schema: MasterReceptionistCounterSchema,
        },
        { name: Queue.name, schema: QueueSchema },

        { name: Config.name, schema: ConfigSchema },
        { name: ConfigGroup.name, schema: ConfigGroupSchema },
        { name: LogLogin.name, schema: LogLoginSchema },
        { name: LogActivity.name, schema: LogActivitySchema },
      ],
      'primary'
    ),
    AuthModule,
  ],
  controllers: [GatewayQueueController],
  providers: [
    ClientDecoratorProcessorService,
    SocketIoClientProvider,
    SocketIoClientProxyService,
    GatewayQueueService,
    MongoMiddlewareQueue,
  ],
  exports: [GatewayQueueService],
})
export class GatewayQueueModule {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,

    @InjectModel(Config.name, 'primary')
    private readonly configModel: Model<ConfigDocument>,

    @Inject(ConfigService)
    private readonly configService: ConfigService,

    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger
  ) {
    this.logger.verbose(
      `Application loaded with ${this.configService.get<string>(
        'application.timezone'
      )} localization`
    )
    this.logger.verbose(`Mode ${environmentName}`)
  }
}
