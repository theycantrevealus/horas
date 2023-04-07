import { ApplicationConfig } from '@configuration/environtment'
import { MongoConfig } from '@configuration/mongo'
import { AccountModule } from '@core/account/account.module'
import { Account, AccountSchema } from '@core/account/schemas/account.model'
import { GeneralReceiveNoteController } from '@core/inventory/general.receive.note.controller'
import { GeneralReceiveNoteService } from '@core/inventory/general.receive.note.service'
import { PurchaseOrderController } from '@core/inventory/purchase.order.controller'
import { PurchaseOrderService } from '@core/inventory/purchase.order.service'
import {
  GeneralReceiveNote,
  GeneralReceiveNoteSchema,
} from '@core/inventory/schemas/general.receive.note'
import {
  PurchaseOrder,
  PurchaseOrderSchema,
} from '@core/inventory/schemas/purchase.order'
import {
  InventoryStock,
  InventoryStockSchema,
} from '@core/inventory/schemas/stock'
import { MasterItemService } from '@core/master/master.item.service'
import { MasterItem, MasterItemSchema } from '@core/master/schemas/master.item'
import { LogActivity, LogActivitySchema } from '@log/schemas/log.activity'
import { LogLogin, LogLoginSchema } from '@log/schemas/log.login'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { MongooseModule } from '@nestjs/mongoose'
import { AuthModule } from '@security/auth.module'
import { TimeManagement } from '@utility/time'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `${process.cwd()}/environment/${
        process.env.NODE_ENV === 'development' ? '' : process.env.NODE_ENV
      }.env`,
      load: [ApplicationConfig, MongoConfig],
    }),
    MongooseModule.forFeatureAsync([
      {
        name: InventoryStock.name,
        useFactory: () => {
          const schema = InventoryStockSchema
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

          schema.pre('findOneAndUpdate', function (next) {
            const update = this.getUpdate()
            update['$inc'] = { __v: 1 }
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
              this.id = `purchase_order-${this._id}`
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
              this.id = `general_receive_note-${this._id}`
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
    ]),
    MongooseModule.forFeature([
      { name: Account.name, schema: AccountSchema },
      { name: LogLogin.name, schema: LogLoginSchema },
      { name: LogActivity.name, schema: LogActivitySchema },
      { name: MasterItem.name, schema: MasterItemSchema },
    ]),
    AuthModule,
    AccountModule,
  ],
  controllers: [PurchaseOrderController, GeneralReceiveNoteController],
  providers: [
    PurchaseOrderService,
    MasterItemService,
    GeneralReceiveNoteService,
  ],
  exports: [PurchaseOrderService, GeneralReceiveNoteService],
})
export class InventoryModule {}
