import { ApplicationConfig } from '@configuration/environtment'
import { MongoConfig } from '@configuration/mongo'
import { AccountModule } from '@core/account/account.module'
import { LOVController } from '@core/lov/lov.controller'
import { LOVService } from '@core/lov/lov.service'
import { LOV, LOVSchema } from '@core/lov/schemas/lov'
import { LogActivity, LogActivitySchema } from '@log/schemas/log.activity'
import { LogLogin, LogLoginSchema } from '@log/schemas/log.login'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { MongooseModule } from '@nestjs/mongoose'
import { AuthModule } from '@security/auth.module'
import { environmentIdentifier } from '@utility/environtment'
import { TimeManagement } from '@utility/time'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: environmentIdentifier,
      load: [ApplicationConfig, MongoConfig],
    }),
    MongooseModule.forFeatureAsync([
      {
        name: LOV.name,
        useFactory: () => {
          const schema = LOVSchema
          const time = new TimeManagement()
          schema.pre('save', function (next) {
            if (this.isNew) {
              this.id = `lov-${this._id}`
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
  controllers: [LOVController],
  providers: [LOVService],
  exports: [LOVService],
})
export class LOVModule {}
