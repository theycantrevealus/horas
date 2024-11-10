import { ApplicationConfig } from '@configuration/environtment'
import { KafkaConfig } from '@configuration/kafka'
import { MongoConfig } from '@configuration/mongo'
import { RedisConfig } from '@configuration/redis'
import { ClientDecoratorProcessorService } from '@decorators/kafka/client'
import { AccountModule } from '@gateway_core/account/account.module'
import { LOVModule } from '@gateway_core/lov/lov.module'
import { MasterModule } from '@gateway_core/master/master.module'
import { MenuModule } from '@gateway_core/menu/menu.module'
import { PatientModule } from '@gateway_core/patient/patient.module'
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
import {
  Config,
  ConfigDocument,
  ConfigSchema,
  IConfig,
} from '@schemas/config/config'
import { ConfigGroup, ConfigGroupSchema } from '@schemas/config/config.group'
import { MongoMiddlewareConfigGroup } from '@schemas/config/config.group.middleware'
import { MongoMiddlewareConfig } from '@schemas/config/config.middleware'
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

import { CoreConfigGroupController } from './core.config.group.controller'
import { CoreConfigGroupService } from './core.config.group.service'
import { GatewayCoreController } from './gateway.core.controller'
import { GatewayCoreService } from './gateway.core.service'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: environmentIdentifier,
      load: [ApplicationConfig, MongoConfig, KafkaConfig, RedisConfig],
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
    // MongooseModule.forRootAsync({
    //   imports: [ConfigModule],
    //   connectionName: 'secondary',
    //   useFactory: async (
    //     configService: ConfigService
    //   ): Promise<MongooseModuleOptions> => ({
    //     uri: `${configService.get<string>(
    //       'mongo.primary.uri'
    //     )}/?replicaSet=rs0&readPreference=secondary`,
    //   }),
    //   inject: [ConfigService],
    // }),
    MongooseModule.forFeature(
      [
        { name: Config.name, schema: ConfigSchema },
        { name: ConfigGroup.name, schema: ConfigGroupSchema },
        { name: LogLogin.name, schema: LogLoginSchema },
        { name: LogActivity.name, schema: LogActivitySchema },
      ],
      'primary'
    ),
    // KafkaProvider(
    //   ['ACCOUNT_SERVICE', 'INVENTORY_SERVICE'],
    //   [
    //     {
    //       configClass: 'kafka.account',
    //       producerModeOnly: true,
    //       schema: [
    //         {
    //           topic: 'account',
    //           headers: 'account/header.avsc',
    //           key: 'global/key.avsc',
    //           value: 'account/value.avsc',
    //         },
    //       ],
    //     },
    //     {
    //       configClass: 'kafka.inventory',
    //       producerModeOnly: true,
    //       schema: [
    //         {
    //           topic: 'purchase_order',
    //           headers: 'inventory/purchase_order/header.avsc',
    //           key: 'global/key.avsc',
    //           value: 'inventory/purchase_order/value.avsc',
    //         },
    //       ],
    //     },
    //   ]
    // ),
    AuthModule,
    AccountModule,
    LOVModule,
    MasterModule,
    // LicenseModule,
    PatientModule,
    MenuModule,
    // i18nModule,
    // GatewayInventoryModule,
    // BpjsModule,
    // OperationQueueModule,
  ],
  controllers: [GatewayCoreController, CoreConfigGroupController],
  providers: [
    ClientDecoratorProcessorService,
    MongoMiddlewareConfig,
    MongoMiddlewareConfigGroup,
    // MongoMiddlewareLOV,
    GatewayCoreService,
    CoreConfigGroupService,
    SocketIoClientProvider,
    SocketIoClientProxyService,
  ],
})
export class GatewayCoreModule {
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
    this.loadConfiguration().then(() => {})
  }

  async loadConfiguration() {
    this.logger.verbose('LOADING SYSTEM CONFIGURATION')
    const config = await this.configModel.find().exec()
    if (config.length > 0) {
      const configSet = []
      await Promise.all(
        config.map(async (e) => {
          if (configSet.indexOf(e.name) < 0) {
            configSet.push(e.name)
          }

          const keyCheck: IConfig = await this.cacheManager.get(e.name)
          if (keyCheck) {
            this.logger.verbose(
              `Checking for [${e.name}] version (${keyCheck.__v}) -> ${e.__v}`
            )
            if (keyCheck.__v !== e.__v) {
              this.logger.verbose(`[${e.name}] Updating configuration`)
              await this.cacheManager
                .set(e.name, {
                  setter: e.setter,
                  __v: e.__v,
                })
                .then(() => {
                  this.logger.warn(e.setter)
                  this.logger.verbose(`[${e.name}] configuration updated`)
                })
            } else {
              this.logger.verbose(`[${e.name}] configuration up to date}`)
            }
          } else {
            await this.cacheManager
              .set(e.name, {
                setter: e.setter,
                __v: e.__v,
              })
              .then(() => {
                this.logger.verbose(`[${e.name}] configuration set`)
              })
          }
        })
      ).then(async () => {
        await this.cacheManager.set('CONFIGURATION_META', {
          setter: configSet,
          __v: 0,
        })
      })
    } else {
      this.logger.verbose('NO CONFIGURATION FOUND')
    }
    this.logger.verbose('LAUNCHING APPLICATION')
  }
}
