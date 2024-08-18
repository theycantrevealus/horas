import { AccountService } from '@gateway_core/account/account.service'
import { PatientController } from '@gateway_core/patient/patient.controller'
import { PatientService } from '@gateway_core/patient/patient.service'
import {
  Patient,
  PatientSchema,
} from '@gateway_core/patient/schema/patient.model'
import { LogActivity, LogActivitySchema } from '@log/schemas/log.activity'
import { LogLogin, LogLoginSchema } from '@log/schemas/log.login'
import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { Account, AccountSchema } from '@schemas/account/account.model'
import { Authority, AuthoritySchema } from '@schemas/account/authority.model'
import { AuthModule } from '@security/auth.module'
import { KafkaProducer } from '@utility/kafka/avro/producer'
import { TimeManagement } from '@utility/time'

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: Patient.name,
        useFactory: () => {
          const schema = PatientSchema
          const time = new TimeManagement()
          schema.pre('save', function (next) {
            if (this.isNew) {
              this.id = `patient-${this._id}`
              this.__v = 0
            }

            if (this.isModified()) {
              this.increment()
              this.id = `patient-${this._id}`
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
        name: Account.name,
        useFactory: () => AccountSchema,
      },
      {
        name: Authority.name,
        useFactory: () => AuthoritySchema,
      },
      {
        name: LogActivity.name,
        useFactory: () => LogActivitySchema,
      },
      {
        name: LogLogin.name,
        useFactory: () => LogLoginSchema,
      },
    ]),
    AuthModule,
  ],
  controllers: [PatientController],
  providers: [PatientService, AccountService, KafkaProducer],
  exports: [PatientService],
})
export class PatientModule {}
