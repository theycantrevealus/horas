import { MongooseModule } from '@nestjs/mongoose'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import { RepositoryModule } from '@utility/database/module'
import { ChangeHistoryModule } from '@utility/history/module'
import { REPOSITORY_HR_PARAMETER } from '@repository/token'
import { HrParameterRepositoryMongo } from './hr-parameter'
import { HrParameterEntity, HrParameterSchema } from './schema/hr-parameter'

/**
 * Registers the HR parameter repository under `REPOSITORY_HR_PARAMETER`.
 */
export const HrParameterRepositoryModule = RepositoryModule.forFeature({
  imports: [
    MongooseModule.forFeature(
      [{ name: HrParameterEntity.name, schema: HrParameterSchema }],
      MONGO_MAIN_CONNECTION,
    ),
    ChangeHistoryModule,
  ],
  repositories: [
    {
      provide: REPOSITORY_HR_PARAMETER,
      useClass: HrParameterRepositoryMongo,
    },
  ],
})
