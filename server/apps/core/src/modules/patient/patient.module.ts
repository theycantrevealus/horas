import { Patient, PatientSchema } from '@core/patient/schema/patient.model'
import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { TimeManagement } from '@utility/time'

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: Patient.name,
        useFactory: () => {
          const schema = PatientSchema
          const time = new TimeManagement()
          schema.post('save', function (next) {
            this.code = `patient-${this._id}`
          })
        },
      },
    ]),
  ],
})
export class PatientModule {}
