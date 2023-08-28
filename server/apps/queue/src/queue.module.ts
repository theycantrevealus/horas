import { ApplicationConfig } from '@configuration/environtment'
import { MongoConfig } from '@configuration/mongo'
import { SocketConfig } from '@configuration/socket'
import { AccountModule } from '@core/account/account.module'
import { Account, AccountSchema } from '@core/account/schemas/account.model'
import { MasterItem, MasterItemSchema } from '@core/master/schemas/master.item'
import {
  MasterItemBatch,
  MasterItemBatchSchema,
} from '@core/master/schemas/master.item.batch'
import {
  MasterStockPoint,
  MasterStockPointSchema,
} from '@core/master/schemas/master.stock.point'
import {
  OperationQueue,
  OperationQueueSchema,
} from '@core/operation/queue/schemas/queue'
import {
  InventoryStockLog,
  InventoryStockLogSchema,
} from '@inventory/schemas/stock.log'
import { LogService } from '@log/log.service'
import { LogActivity, LogActivitySchema } from '@log/schemas/log.activity'
import { LogLogin, LogLoginSchema } from '@log/schemas/log.login'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { ClientsModule } from '@nestjs/microservices'
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose'
import { AuthModule } from '@security/auth.module'
import { SocketIoClientProvider } from '@socket/socket.provider'
import { SocketIoClientProxyService } from '@socket/socket.proxy'
import { DecoratorProcessorService } from '@utility/decorator'
import { environmentIdentifier, environmentName } from '@utility/environtment'
import { KafkaConn } from '@utility/kafka'
import { WinstonModule } from '@utility/logger/module'
import { TimeManagement } from '@utility/time'
import { WinstonCustomTransports } from '@utility/transport.winston'

import { ConsumerQueueController } from './queue.controller'
import { ConsumerQueueService } from './queue.service'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: environmentIdentifier,
      load: [ApplicationConfig, MongoConfig, SocketConfig],
    }),
    ClientsModule.registerAsync([KafkaConn.m_item[0]]),
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
        uri: configService.get<string>('mongo.uri'),
        dbName: configService.get<string>('mongo.db_name'),
        user: configService.get<string>('mongo.db_user'),
        pass: configService.get<string>('mongo.db_password'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeatureAsync([
      {
        name: OperationQueue.name,
        useFactory: () => {
          const schema = OperationQueueSchema
          const time = new TimeManagement()
          schema.pre('save', function (next) {
            if (this.isNew) {
              this.__v = 0
            }

            if (this.isModified()) {
              this.increment()
              return next()
            } else {
              return next(new Error('Invalid document'))
            }
          })

          schema.pre('findOneAndUpdate', async function (next) {
            const update = this.getUpdate()
            const docToUpdate = await this.model.findOne(this.getQuery())
            if (docToUpdate) {
              update['updated_at'] = time.getTimezone('Asia/Jakarta')
              update['$inc'] = { __v: 1 }
            }
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
      { name: MasterItem.name, schema: MasterItemSchema },
      { name: MasterItemBatch.name, schema: MasterItemBatchSchema },
      { name: MasterStockPoint.name, schema: MasterStockPointSchema },
      { name: InventoryStockLog.name, schema: InventoryStockLogSchema },
    ]),
    AuthModule,
    AccountModule,
  ],
  controllers: [ConsumerQueueController],
  providers: [
    DecoratorProcessorService,
    SocketIoClientProvider,
    SocketIoClientProxyService,
    LogService,
    ConsumerQueueService,
  ],
})
export class ConsumerQueueModule {}
