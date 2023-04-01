import { ApplicationConfig } from '@configuration/environtment'
import { MongoConfig } from '@configuration/mongo'
import { AccountModule } from '@core/account/account.module'
import { Account, AccountSchema } from '@core/account/schemas/account.model'
import { MasterItemBrandController } from '@core/master/master.item.brand.controller'
import { MasterItemBrandService } from '@core/master/master.item.brand.service'
import { MasterItemCategoryController } from '@core/master/master.item.category.controller'
import { MasterItemCategoryService } from '@core/master/master.item.category.service'
import { MasterItemController } from '@core/master/master.item.controller'
import { MasterItemService } from '@core/master/master.item.service'
import { MasterItemSupplierController } from '@core/master/master.item.supplier.controller'
import { MasterItemSupplierService } from '@core/master/master.item.supplier.service'
import { MasterItemUnitController } from '@core/master/master.item.unit.controller'
import { MasterItemUnitService } from '@core/master/master.item.unit.service'
import { MasterStockPointController } from '@core/master/master.stock.point.controller'
import { MasterStockPointService } from '@core/master/master.stock.point.service'
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
  MasterStockPoint,
  MasterStockPointSchema,
} from '@core/master/schemas/master.stock.point'
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
    ]),
    MongooseModule.forFeature([
      { name: Account.name, schema: AccountSchema },
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
  ],
  providers: [
    MasterItemSupplierService,
    MasterItemBrandService,
    MasterItemCategoryService,
    MasterStockPointService,
    MasterItemUnitService,
    MasterItemService,
  ],
  exports: [
    MasterItemSupplierService,
    MasterItemBrandService,
    MasterItemCategoryService,
    MasterStockPointService,
    MasterItemUnitService,
    MasterItemService,
  ],
})
export class MasterModule {}
