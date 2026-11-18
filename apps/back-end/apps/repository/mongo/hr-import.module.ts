import { MongooseModule } from '@nestjs/mongoose'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import { RepositoryModule } from '@utility/database/module'
import { ChangeHistoryModule } from '@utility/history/module'
import { REPOSITORY_HR_IMPORT } from '@repository/token'
import { HrImportRepositoryMongo } from './hr-import'
import { HrImportEntity, HrImportSchema } from './schema/hr-import'

/**
 * Registers the HR import repository under `REPOSITORY_HR_IMPORT`.
 */
export const HrImportRepositoryModule = RepositoryModule.forFeature({
  imports: [
    MongooseModule.forFeature(
      [{ name: HrImportEntity.name, schema: HrImportSchema }],
      MONGO_MAIN_CONNECTION,
    ),
    ChangeHistoryModule,
  ],
  repositories: [
    { provide: REPOSITORY_HR_IMPORT, useClass: HrImportRepositoryMongo },
  ],
})
