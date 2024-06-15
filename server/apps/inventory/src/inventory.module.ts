import { ApplicationConfig } from '@configuration/environtment'
import { KafkaConfig } from '@configuration/kafka'
import { MongoConfig } from '@configuration/mongo'
import { SocketConfig } from '@configuration/socket'
import { PurchaseOrderController } from '@inventory/purchase.order.controller'
import { PurchaseOrderService } from '@inventory/purchase.order.service'
import { PuchaseOrderModelProvider } from '@inventory/schemas/purchase_order.provider'
import { LogActivity, LogActivitySchema } from '@log/schemas/log.activity'
import { LogLogin, LogLoginSchema } from '@log/schemas/log.login'
import { CacheModule } from '@nestjs/cache-manager'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose'
import { AuthService } from '@security/auth.service'
import { SocketIoClientProvider } from '@socket/socket.provider'
import { SocketIoClientProxyService } from '@socket/socket.proxy'
import { DecoratorProcessorService } from '@utility/decorator'
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
      load: [ApplicationConfig, MongoConfig, KafkaConfig, SocketConfig],
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
      useFactory: async (
        configService: ConfigService
      ): Promise<MongooseModuleOptions> => ({
        uri: configService.get<string>('mongo.primary.uri'),
        dbName: configService.get<string>('mongo.primary.db_name'),
        user: configService.get<string>('mongo.primary.db_user'),
        pass: configService.get<string>('mongo.primary.db_password'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (
        configService: ConfigService
      ): Promise<MongooseModuleOptions> => ({
        uri: configService.get<string>('mongo.secondary.uri'),
        dbName: configService.get<string>('mongo.secondary.db_name'),
        user: configService.get<string>('mongo.secondary.db_user'),
        pass: configService.get<string>('mongo.secondary.db_password'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeatureAsync([PuchaseOrderModelProvider]),
    MongooseModule.forFeature([
      { name: LogLogin.name, schema: LogLoginSchema },
      { name: LogActivity.name, schema: LogActivitySchema },
    ]),
    KafkaProvider(
      ['INVENTORY_SERVICE'],
      [
        {
          configClass: 'kafka.inventory',
          producerModeOnly: false,
          schema: [
            {
              topic: 'purchase_order',
              headers: 'inventory/purchase_order/header.avsc',
              key: 'global/key.avsc',
              value: 'inventory/purchase_order/value.avsc',
            },
          ],
        },
      ]
    ),
  ],
  controllers: [PurchaseOrderController],
  providers: [
    JwtService,
    AuthService,
    PurchaseOrderService,
    DecoratorProcessorService,
    SocketIoClientProvider,
    SocketIoClientProxyService,
  ],
})
export class InventoryModule {}
