import { MongooseModule } from '@nestjs/mongoose'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import { RepositoryModule } from '@utility/database/module'
import { ChangeHistoryModule } from '@utility/history/module'
import { REPOSITORY_FACILITY } from '@repository/token'
import { FacilityRepositoryMongo } from './facility'
import { FacilityEntity, FacilitySchema } from './schema/facility'

/**
 * Registers the facility repository under `REPOSITORY_FACILITY`.
 */
export const FacilityRepositoryModule = RepositoryModule.forFeature({
  imports: [
    MongooseModule.forFeature(
      [{ name: FacilityEntity.name, schema: FacilitySchema }],
      MONGO_MAIN_CONNECTION,
    ),
    ChangeHistoryModule,
  ],
  repositories: [
    { provide: REPOSITORY_FACILITY, useClass: FacilityRepositoryMongo },
  ],
})
