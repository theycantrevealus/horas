import { ApplicationConfig } from '@configuration/environtment'
import { KafkaConfig } from '@configuration/kafka'
import { MongoConfig } from '@configuration/mongo'
import { RedisConfig } from '@configuration/redis'
import { AccountModule } from '@core/account/account.module'
import { LicenseController } from '@core/license/license.controller'
import { LicenseService } from '@core/license/license.service'
import { License, LicenseSchema } from '@core/license/schemas/license'
import { LogActivity, LogActivitySchema } from '@log/schemas/log.activity'
import { LogLogin, LogLoginSchema } from '@log/schemas/log.login'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { MongooseModule } from '@nestjs/mongoose'
import { AuthModule } from '@security/auth.module'
import { environmentIdentifier } from '@utility/environtment'
import { TimeManagement } from '@utility/time'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: environmentIdentifier,
      load: [ApplicationConfig, MongoConfig, KafkaConfig, RedisConfig],
    }),
    MongooseModule.forFeatureAsync([
      {
        name: License.name,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => {
          const schema = LicenseSchema
          const time = new TimeManagement()
          const timezone: string = configService.get<string>(
            'application.timezone'
          )
          schema.pre('save', function (next) {
            if (this.isNew) {
              this.id = `license-${this._id}`
              this.__v = 0
            }

            if (this.isModified()) {
              this.increment()
              this.updated_at = time.getTimezone(timezone)
              return next()
            } else {
              return next(new Error('Invalid document'))
            }
          })

          schema.pre('findOneAndUpdate', function (next) {
            const update = this.getUpdate()
            update['updated_at'] = time.getTimezone(timezone)
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
  controllers: [LicenseController],
  providers: [LicenseService],
  exports: [LicenseService],
})
export class LicenseModule {
  constructor() {}
}
