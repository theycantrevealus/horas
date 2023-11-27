import { ApplicationConfig } from '@configuration/environtment'
import { MongoConfig } from '@configuration/mongo'
import { AccountModule } from '@core/account/account.module'
import { MasterItemBrandController } from '@core/master/controllers/master.item.brand.controller'
import { MasterItemCategoryController } from '@core/master/controllers/master.item.category.controller'
import { MasterItemController } from '@core/master/controllers/master.item.controller'
import { MasterItemSupplierController } from '@core/master/controllers/master.item.supplier.controller'
import { MasterItemUnitController } from '@core/master/controllers/master.item.unit.controller'
import { MasterQueueController } from '@core/master/controllers/master.queue.controller'
import { MasterStockPointController } from '@core/master/controllers/master.stock.point.controller'
import { MasterItem, MasterItemSchema } from '@core/master/schemas/master.item'
import {
  MasterItemBrand,
  MasterItemBrandSchema,
} from '@core/master/schemas/master.item.brand'
import {
  MasterItemCategory,
  MasterItemCategorySchema,
} from '@core/master/schemas/master.item.category'
import {
  MasterItemSupplier,
  MasterItemSupplierSchema,
} from '@core/master/schemas/master.item.supplier'
import {
  MasterItemUnit,
  MasterItemUnitSchema,
} from '@core/master/schemas/master.item.unit'
import {
  MasterQueue,
  MasterQueueSchema,
} from '@core/master/schemas/master.queue.machine'
import {
  MasterStockPoint,
  MasterStockPointSchema,
} from '@core/master/schemas/master.stock.point'
import { MasterItemBrandService } from '@core/master/services/master.item.brand.service'
import { MasterItemCategoryService } from '@core/master/services/master.item.category.service'
import { MasterItemService } from '@core/master/services/master.item.service'
import { MasterItemSupplierService } from '@core/master/services/master.item.supplier.service'
import { MasterItemUnitService } from '@core/master/services/master.item.unit.service'
import { MasterQueueService } from '@core/master/services/master.queue.service'
import { MasterStockPointService } from '@core/master/services/master.stock.point.service'
import { LogActivity, LogActivitySchema } from '@log/schemas/log.activity'
import { LogLogin, LogLoginSchema } from '@log/schemas/log.login'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ClientsModule } from '@nestjs/microservices'
import { MongooseModule } from '@nestjs/mongoose'
import { AuthModule } from '@security/auth.module'
import { environmentIdentifier } from '@utility/environtment'
import { KafkaConn } from '@utility/kafka'
import { TimeManagement } from '@utility/time'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: environmentIdentifier,
      load: [ApplicationConfig, MongoConfig],
    }),
    ClientsModule.registerAsync([KafkaConn.m_item[0]]),
    MongooseModule.forFeatureAsync([
      {
        name: MasterItem.name,
        useFactory: () => {
          const schema = MasterItemSchema
          const time = new TimeManagement()
          schema.pre('save', function (next) {
            if (this.isNew) {
              this.id = `item-${this._id}`
              this.__v = 0
            }

            if (this.isModified()) {
              this.increment()
              this.updated_at = time.getTimezone('Asia/Jakarta')
              return next()
            } else {
              return next()
              //return next(new Error('Invalid document'))
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
        name: MasterItemSupplier.name,
        useFactory: () => {
          const schema = MasterItemSupplierSchema
          const time = new TimeManagement()
          schema.pre('save', function (next) {
            if (this.isNew) {
              this.id = `supplier-${this._id}`
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
        name: MasterItemCategory.name,
        useFactory: () => {
          const schema = MasterItemCategorySchema
          const time = new TimeManagement()
          schema.pre('save', function (next) {
            if (this.isNew) {
              this.id = `item_category-${this._id}`
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
        name: MasterItemUnit.name,
        useFactory: () => {
          const schema = MasterItemUnitSchema
          const time = new TimeManagement()
          schema.pre('save', function (next) {
            if (this.isNew) {
              this.id = `item_unit-${this._id}`
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
        name: MasterItemBrand.name,
        useFactory: () => {
          const schema = MasterItemBrandSchema
          const time = new TimeManagement()
          schema.pre('save', function (next) {
            if (this.isNew) {
              this.id = `brand-${this._id}`
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
        name: MasterStockPoint.name,
        useFactory: () => {
          const schema = MasterStockPointSchema
          const time = new TimeManagement()
          schema.pre('save', function (next) {
            if (this.isNew) {
              this.id = `stock_point-${this._id}`
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
        name: MasterQueue.name,
        useFactory: () => {
          const schema = MasterQueueSchema
          const time = new TimeManagement()
          schema.pre('save', function (next) {
            if (this.isNew) {
              this.id = `queue-${this._id}`
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
      { name: LogLogin.name, schema: LogLoginSchema },
      { name: LogActivity.name, schema: LogActivitySchema },
    ]),
    AuthModule,
    AccountModule,
  ],
  controllers: [
    MasterItemSupplierController,
    MasterItemBrandController,
    MasterItemCategoryController,
    MasterStockPointController,
    MasterItemUnitController,
    MasterItemController,
    MasterQueueController,
  ],
  providers: [
    MasterItemSupplierService,
    MasterItemBrandService,
    MasterItemCategoryService,
    MasterStockPointService,
    MasterItemUnitService,
    MasterItemService,
    MasterQueueService,
  ],
  exports: [
    MasterItemSupplierService,
    MasterItemBrandService,
    MasterItemCategoryService,
    MasterStockPointService,
    MasterItemUnitService,
    MasterItemService,
    MasterQueueService,
  ],
})
export class MasterModule {}
