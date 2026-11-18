import { MongooseModule } from '@nestjs/mongoose'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import { RepositoryModule } from '@utility/database/module'
import { ChangeHistoryModule } from '@utility/history/module'
import { REPOSITORY_CPD_SUMMARY } from '@repository/token'
import { CpdSummaryRepositoryMongo } from './cpd-summary'
import { CpdSummaryEntity, CpdSummarySchema } from './schema/cpd-summary'

/**
 * Registers the CPD summary repository under `REPOSITORY_CPD_SUMMARY`.
 */
export const CpdSummaryRepositoryModule = RepositoryModule.forFeature({
  imports: [
    MongooseModule.forFeature(
      [{ name: CpdSummaryEntity.name, schema: CpdSummarySchema }],
      MONGO_MAIN_CONNECTION,
    ),
    ChangeHistoryModule,
  ],
  repositories: [
    { provide: REPOSITORY_CPD_SUMMARY, useClass: CpdSummaryRepositoryMongo },
  ],
})
