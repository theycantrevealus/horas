import { ApplicationConfig } from '@configuration/environtment'
import { MongoConfig } from '@configuration/mongo'
import { AccountModule } from '@core/account/account.module'
import { Account, AccountSchema } from '@core/account/schemas/account.model'
import { MasterItemBrandController } from '@core/master/master.item.brand.controller'
import { MasterItemBrandService } from '@core/master/master.item.brand.service'
import { MasterItemSupplierController } from '@core/master/master.item.supplier.controller'
import { MasterItemSupplierService } from '@core/master/master.item.supplier.service'
import {
  MasterItemBrandModel,
  MasterItemBrandSchema,
} from '@core/master/schemas/master.item.brand'
import {
  MasterItemSupplierModel,
  MasterItemSupplierSchema,
} from '@core/master/schemas/master.item.supplier'
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
        name: MasterItemSupplierModel.name,
        useFactory: () => {
          const schema = MasterItemSupplierSchema
          schema.pre('save', function (next) {
            if (this.isModified()) {
              this.increment()
              this.updated_at = new TimeManagement().getTimezone('Asia/Jakarta')
              return next()
            } else {
              return next(new Error('Invalid document'))
            }
          })

          return schema
        },
      },
      {
        name: MasterItemBrandModel.name,
        useFactory: () => {
          const schema = MasterItemBrandSchema
          schema.pre('save', function (next) {
            if (this.isModified()) {
              this.increment()
              this.updated_at = new TimeManagement().getTimezone('Asia/Jakarta')
              return next()
            } else {
              return next(new Error('Invalid document'))
            }
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
  controllers: [MasterItemSupplierController, MasterItemBrandController],
  providers: [MasterItemSupplierService, MasterItemBrandService],
  exports: [MasterItemSupplierService, MasterItemBrandService],
})
export class MasterModule {}