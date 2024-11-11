import { ApplicationConfig } from '@configuration/environtment'
import { KafkaConfig } from '@configuration/kafka'
import { MongoConfig } from '@configuration/mongo'
import { RedisConfig } from '@configuration/redis'
import { ClientDecoratorProcessorService } from '@decorators/kafka/client'
import { GeneralReceiveNoteModule } from '@gateway_inventory/general_receive_note/general.receive.note.module'
import { PurchaseOrderModule } from '@gateway_inventory/purchase_order/purchase.order.module'
import { StockModule } from '@gateway_inventory/stock/stock.module'
import { LogActivity, LogActivitySchema } from '@log/schemas/log.activity'
import { LogLogin, LogLoginSchema } from '@log/schemas/log.login'
import { BullModule, BullRootModuleOptions } from '@nestjs/bull'
import { CacheModule } from '@nestjs/cache-manager'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose'
import { AuthModule } from '@security/auth.module'
import { environmentIdentifier, environmentName } from '@utility/environtment'
import { KafkaProvider } from '@utility/kafka'
import { WinstonModule } from '@utility/logger/module'
import { WinstonCustomTransports } from '@utility/transport.winston'
import * as redisStore from 'cache-manager-ioredis'

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
        )}?replicaSet=dbrs`,
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature(
      [
        { name: LogLogin.name, schema: LogLoginSchema },
        { name: LogActivity.name, schema: LogActivitySchema },
      ],
      'primary'
    ),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (
        configService: ConfigService
      ): Promise<BullRootModuleOptions> => {
        if (configService.get<string>('redis.password') !== '') {
          return {
            redis: {
              host: configService.get<string>('redis.host'),
              port: +configService.get<number>('redis.port'),
              password: configService.get<string>('redis.password'),
            },
          }
        } else {
          return {
            redis: {
              host: configService.get<string>('redis.host'),
              port: +configService.get<number>('redis.port'),
            },
          }
        }
      },
      inject: [ConfigService],
    }),
    KafkaProvider(
      ['STOCK_SERVICE'],
      [
        {
          configClass: 'kafka.stock',
          producerModeOnly: true,
          schema: [
            {
              topic: 'stock',
              headers: 'stock/movement/header.avsc',
              key: 'global/key.avsc',
              value: 'stock/movement/value.avsc',
            },
          ],
        },
      ]
    ),
    AuthModule,
    GeneralReceiveNoteModule,
    PurchaseOrderModule,
    StockModule,
  ],
  controllers: [],
  providers: [ClientDecoratorProcessorService],
  exports: [],
})
export class GatewayInventoryModule {}
