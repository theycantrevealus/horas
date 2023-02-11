import { ApplicationConfig } from '@configuration/environtment'
import { MongoConfig } from '@configuration/mongo'
import { AccountModule } from '@core/account/account.module'
import {
  AccountModel,
  AccountSchema,
} from '@core/account/schemas/account.model'
import { MasterItemSupplierController } from '@core/master/master.item.supplier.controller'
import { MasterItemSupplierService } from '@core/master/master.item.supplier.service'
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
    ]),
    MongooseModule.forFeature([
      { name: AccountModel.name, schema: AccountSchema },
      { name: LogLogin.name, schema: LogLoginSchema },
      { name: LogActivity.name, schema: LogActivitySchema },
    ]),
    AuthModule,
    AccountModule,
  ],
  controllers: [MasterItemSupplierController],
  providers: [MasterItemSupplierService],
  exports: [MasterItemSupplierService],
})
export class MasterModule {}
