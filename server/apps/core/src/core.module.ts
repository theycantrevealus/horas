import { ApplicationConfig } from '@configuration/environtment'
import { KafkaConfig } from '@configuration/kafka'
import { MongoConfig } from '@configuration/mongo'
import { RedisConfig } from '@configuration/redis'
import { AccountModule } from '@core/account/account.module'
import { Account, AccountSchema } from '@core/account/schemas/account.model'
import { i18nModule } from '@core/i18n/i18n.module'
import { GatewayInventoryModule } from '@core/inventory/inventory.module'
import { LOVModule } from '@core/lov/lov.module'
import { MasterModule } from '@core/master/master.module'
import { MenuModule } from '@core/menu/menu.module'
import { PatientModule } from '@core/patient/patient.module'
import { LogActivity, LogActivitySchema } from '@log/schemas/log.activity'
import { LogLogin, LogLoginSchema } from '@log/schemas/log.login'
import { CACHE_MANAGER, CacheModule, Inject, Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import {
  InjectModel,
  MongooseModule,
  MongooseModuleOptions,
} from '@nestjs/mongoose'
import { AuthModule } from '@security/auth.module'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { WinstonModule } from '@utility/logger/module'
import { TimeManagement } from '@utility/time'
import { Cache } from 'cache-manager'
import * as redisStore from 'cache-manager-ioredis'
import { Model } from 'mongoose'
import * as winston from 'winston'
import { Logger } from 'winston'

import { CoreController } from './core.controller'
import { CoreService } from './core.service'
import { Config, ConfigDocument, ConfigSchema, IConfig } from './schemas/config'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `${process.cwd()}/environment/${
        !process.env.NODE_ENV || process.env.NODE_ENV === ''
          ? ''
          : process.env.NODE_ENV
      }.env`,
      load: [ApplicationConfig, MongoConfig, KafkaConfig, RedisConfig],
    }),
    CacheModule.registerAsync({
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
        const today = new TimeManagement()
        return {
          levels: {
            error: 0,
            warn: 1,
            verbose: 3,
          },
          transports: [
            new winston.transports.Console({
              level: configService
                .get<string>('application.log.verbose')
                .toString(),
              format: winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
                winston.format.printf((data) => {
                  return JSON.stringify({
                    timestamp: data.timestamp,
                    level: data.level,
                    message: data.message,
                  })
                })
              ),
            }),
            // new winston.transports.File({
            //   filename: `logs/${configService.get<string>(
            //     'application.log.verbose'
            //   )}/${today.getDate().toString()}.txt`,
            //   level: configService
            //     .get<string>('application.log.verbose')
            //     .toString(),
            //   format: winston.format.combine(
            //     winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
            //     winston.format.printf((data) => {
            //       return JSON.stringify({
            //         timestamp: data.timestamp,
            //         level: data.level,
            //         message: data.message,
            //       })
            //     })
            //   ),
            // }),
            // new winston.transports.File({
            //   filename: `logs/${configService.get<string>(
            //     'application.log.warn'
            //   )}/${today.getDate().toString()}.txt`,
            //   level: configService
            //     .get<string>('application.log.warn')
            //     .toString(),
            //   format: winston.format.combine(
            //     winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
            //     winston.format.printf((data) => {
            //       return JSON.stringify({
            //         timestamp: data.timestamp,
            //         level: data.level,
            //         message: data.message,
            //       })
            //     })
            //   ),
            // }),
            // new winston.transports.File({
            //   filename: `logs/${configService.get<string>(
            //     'application.log.error'
            //   )}/${today.getDate().toString()}.txt`,
            //   level: configService
            //     .get<string>('application.log.error')
            //     .toString(),
            //   handleExceptions: true,
            //   format: winston.format.combine(
            //     winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
            //     winston.format.printf((data) => {
            //       return JSON.stringify({
            //         timestamp: data.timestamp,
            //         level: data.level,
            //         message: data.message,
            //       })
            //     })
            //   ),
            // }),
          ],
        }
      },
      inject: [ConfigService],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (
        configService: ConfigService
      ): Promise<MongooseModuleOptions> => ({
        uri: configService.get<string>('mongo.uri'),
        dbName: configService.get<string>('mongo.db_name'),
        user: configService.get<string>('mongo.db_user'),
        pass: configService.get<string>('mongo.db_password'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeatureAsync([
      {
        name: Config.name,
        useFactory: () => {
          const schema = ConfigSchema
          schema.pre('save', function (next) {
            if (this.isNew) {
              this.id = `config-${this._id}`
              this.__v = 0
            }

            if (this.isModified()) {
              this.increment()
              return next()
            } else {
              return next(new Error('Invalid document'))
            }
          })

          schema.pre('findOneAndUpdate', function (next) {
            const update = this.getUpdate()
            update['$inc'] = { __v: 1 }
            next()
          })

          return schema
        },
      },
    ]),
    MongooseModule.forFeature([
      { name: Account.name, schema: AccountSchema },
      { name: LogLogin.name, schema: LogLoginSchema },
      { name: LogActivity.name, schema: LogActivitySchema },
    ]),
    AuthModule,
    AccountModule,
    LOVModule,
    PatientModule,
    MenuModule,
    MasterModule,
    i18nModule,
    GatewayInventoryModule,
  ],
  controllers: [CoreController],
  providers: [CoreService],
})
export class CoreModule {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectModel(Config.name)
    private readonly configModel: Model<ConfigDocument>,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger
  ) {
    this.loadConfiguration().then(() => {
      // this.logger.verbose('Verbose this')
      // this.logger.warn('Warn this')
      // this.logger.debug('Debug me')
      // throw new Error('Test Error')
      //
    })
  }

  async loadConfiguration() {
    this.logger.verbose('LOADING SYSTEM CONFIGURATION')
    const config = await this.configModel.find().exec()
    if (config.length > 0) {
      await Promise.all(
        config.map(async (e) => {
          const keyCheck: IConfig = await this.cacheManager.get(e.name)
          if (keyCheck) {
            this.logger.verbose(
              `Checking for [${e.name}] version (${keyCheck.__v}) -> ${e.__v}`
            )
            if (keyCheck.__v !== e.__v) {
              this.logger.verbose(`Updating [${e.name}] configuration`)
              await this.cacheManager
                .set(e.name, {
                  setter: e.setter,
                  __v: e.__v,
                })
                .then(() => {
                  this.logger.verbose(`[${e.name}] configuration updated`)
                })
            } else {
              this.logger.verbose(`[${e.name}] configuration up to date`)
            }
          } else {
            await this.cacheManager.set(e.name, e.setter).then(() => {
              this.logger.verbose(`[${e.name}] configuration set`)
            })
          }
        })
      )
    } else {
      this.logger.verbose('NO CONFIGURATION FOUND')
    }
    this.logger.verbose('LAUNCHING APPLICATION')
  }
}
