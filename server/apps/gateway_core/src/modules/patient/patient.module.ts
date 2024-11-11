import { AccountService } from '@gateway_core/account/account.service'
import { PatientController } from '@gateway_core/patient/patient.controller'
import { PatientService } from '@gateway_core/patient/patient.service'
import { LogActivity, LogActivitySchema } from '@log/schemas/log.activity'
import { LogLogin, LogLoginSchema } from '@log/schemas/log.login'
import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { Account, AccountSchema } from '@schemas/account/account.model'
import { Authority, AuthoritySchema } from '@schemas/account/authority.model'
import { Patient, PatientSchema } from '@schemas/patient/patient'
import { MongoMiddlewarePatient } from '@schemas/patient/patient.middleware'
import { AuthModule } from '@security/auth.module'

@Module({
  imports: [
    MongooseModule.forFeature(
      [
        { name: Patient.name, schema: PatientSchema },
        { name: Account.name, schema: AccountSchema },
        { name: Authority.name, schema: AuthoritySchema },
        { name: LogLogin.name, schema: LogLoginSchema },
        { name: LogActivity.name, schema: LogActivitySchema },
      ],
      'primary'
    ),
    AuthModule,
  ],
  controllers: [PatientController],
  providers: [MongoMiddlewarePatient, PatientService, AccountService],
  exports: [PatientService],
})
export class PatientModule {}
