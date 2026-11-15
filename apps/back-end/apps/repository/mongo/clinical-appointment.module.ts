import { MongooseModule } from '@nestjs/mongoose'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import { RepositoryModule } from '@utility/database/module'
import { ChangeHistoryModule } from '@utility/history/module'
import { REPOSITORY_CLINICAL_APPOINTMENT } from '@repository/token'
import { ClinicalAppointmentRepositoryMongo } from './clinical-appointment'
import { ClinicalAppointmentEntity, ClinicalAppointmentSchema } from './schema/clinical-appointment'

/**
 * Registers the a clinical appointment (SPK) repository under `REPOSITORY_CLINICAL_APPOINTMENT`.
 */
export const ClinicalAppointmentRepositoryModule = RepositoryModule.forFeature({
  imports: [
    MongooseModule.forFeature(
      [{ name: ClinicalAppointmentEntity.name, schema: ClinicalAppointmentSchema }],
      MONGO_MAIN_CONNECTION,
    ),
    ChangeHistoryModule,
  ],
  repositories: [
    { provide: REPOSITORY_CLINICAL_APPOINTMENT, useClass: ClinicalAppointmentRepositoryMongo },
  ],
})
