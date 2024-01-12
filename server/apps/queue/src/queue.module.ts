import { ApplicationConfig } from '@configuration/environtment'
import { MongoConfig } from '@configuration/mongo'
import { SocketConfig } from '@configuration/socket'
import { AccountModule } from '@core/account/account.module'
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
import { Inject, Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { ClientsModule } from '@nestjs/microservices'
import { MongooseModule } from '@nestjs/mongoose'
import { AuthModule } from '@security/auth.module'
import { SocketIoClientProvider } from '@socket/socket.provider'
import { SocketIoClientProxyService } from '@socket/socket.proxy'
import { DecoratorProcessorService } from '@utility/decorator'
import { environmentIdentifier, environmentName } from '@utility/environtment'
import { KafkaConn } from '@utility/kafka'
import { WinstonModule } from '@utility/logger/module'
import { MongodbConfigService } from '@utility/mongoose'
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
    ClientsModule.registerAsync([KafkaConn.queue[0]]),
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        return {
          // levels: {
          //   error: await configService.get<number>('log.error.level'),
          //   warn: await configService.get<number>('log.error.warn'),
          //   verbose: await configService.get<number>('log.error.verbose'),
          // },
          transports: WinstonCustomTransports[environmentName],
        }
      },
      inject: [ConfigService],
    }),
    MongooseModule.forRootAsync({
      useClass: MongodbConfigService,
      imports: [ConfigModule],
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
export class ConsumerQueueModule {
  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService
  ) {}
}
