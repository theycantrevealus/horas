import { ApplicationConfig } from '@configuration/environtment'
import { MongoConfig } from '@configuration/mongo'
import { SocketConfig } from '@configuration/socket'
import { AccountModule } from '@core/account/account.module'
import { Account, AccountSchema } from '@core/account/schemas/account.model'
import { MasterItemService } from '@core/master/master.item.service'
import { MasterStockPointService } from '@core/master/master.stock.point.service'
import { MasterItem, MasterItemSchema } from '@core/master/schemas/master.item'
import {
  MasterItemBatch,
  MasterItemBatchSchema,
} from '@core/master/schemas/master.item.batch'
import {
  MasterStockPoint,
  MasterStockPointSchema,
} from '@core/master/schemas/master.stock.point'
import { GeneralReceiveNoteController } from '@inventory/general.receive.note.controller'
import { GeneralReceiveNoteService } from '@inventory/general.receive.note.service'
import { InventoryService } from '@inventory/inventory.service'
import { PurchaseOrderController } from '@inventory/purchase.order.controller'
import { PurchaseOrderService } from '@inventory/purchase.order.service'
import {
  GeneralReceiveNote,
  GeneralReceiveNoteSchema,
} from '@inventory/schemas/general.receive.note'
import {
  PurchaseOrder,
  PurchaseOrderSchema,
} from '@inventory/schemas/purchase.order'
import { InventoryStock, InventoryStockSchema } from '@inventory/schemas/stock'
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
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose'
import { AuthModule } from '@security/auth.module'
import { SocketIoClientProvider } from '@socket/socket.provider'
import { SocketIoClientProxyService } from '@socket/socket.proxy'
import { KafkaConn } from '@utility/kafka'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { WinstonModule } from '@utility/logger/module'
import { TimeManagement } from '@utility/time'
import * as winston from 'winston'
import { Logger } from 'winston'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `${process.cwd()}/environment/${
        process.env.NODE_ENV === '' ? '' : process.env.NODE_ENV
      }.env`,
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
          transports: [
            new winston.transports.Console({
              level: 'warn',
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
            new winston.transports.Console({
              level: 'verbose',
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
        name: InventoryStock.name,
        useFactory: () => {
          const schema = InventoryStockSchema
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
      {
        name: PurchaseOrder.name,
        useFactory: () => {
          const schema = PurchaseOrderSchema
          const time = new TimeManagement()
          schema.pre('save', function (next) {
            if (this.isNew) {
              this.__v = 0
            }

            if (this.isModified()) {
              this.increment()
              this.updated_at = time.getTimezone('Asia/Jakarta')
              return next()
            } else {
              return next(new Error('Invalid document'))
            }
          })

          schema.pre('findOneAndUpdate', function (next) {
            const update = this.getUpdate()
            update['updated_at'] = time.getTimezone('Asia/Jakarta')
            update['$inc'] = { __v: 1 }
            next()
          })

          return schema
        },
      },
      {
        name: GeneralReceiveNote.name,
        useFactory: () => {
          const schema = GeneralReceiveNoteSchema
          const time = new TimeManagement()
          schema.pre('save', function (next) {
            if (this.isNew) {
              this.__v = 0
            }

            if (this.isModified()) {
              this.increment()
              this.updated_at = time.getTimezone('Asia/Jakarta')
              return next()
            } else {
              return next(new Error('Invalid document'))
            }
          })

          schema.pre('findOneAndUpdate', function (next) {
            const update = this.getUpdate()
            update['updated_at'] = time.getTimezone('Asia/Jakarta')
            update['$inc'] = { __v: 1 }
            next()
          })

          return schema
        },
      },
      {
        name: MasterItemBatch.name,
        useFactory: () => {
          const schema = MasterItemBatchSchema
          const time = new TimeManagement()
          schema.pre('save', function (next) {
            if (this.isNew) {
              this.id = `item_batch-${this._id}`
              this.__v = 0
            }

            if (this.isModified()) {
              this.increment()
              this.updated_at = time.getTimezone('Asia/Jakarta')
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
            } else {
              update['id'] = `item_batch-${update['_id']}`
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
  controllers: [PurchaseOrderController, GeneralReceiveNoteController],
  providers: [
    LogService,
    InventoryService,
    PurchaseOrderService,
    GeneralReceiveNoteService,
    MasterItemService,
    MasterStockPointService,
    SocketIoClientProvider,
    SocketIoClientProxyService,
  ],
  exports: [PurchaseOrderService, GeneralReceiveNoteService],
})
export class InventoryModule {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger
  ) {
    //
  }
}
