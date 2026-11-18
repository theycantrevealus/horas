import { MongooseModule } from '@nestjs/mongoose'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import { RepositoryModule } from '@utility/database/module'
import { ChangeHistoryModule } from '@utility/history/module'
import { REPOSITORY_CPD_RECORD } from '@repository/token'
import { CpdRecordRepositoryMongo } from './cpd-record'
import { CpdRecordEntity, CpdRecordSchema } from './schema/cpd-record'

/**
 * Registers the CPD record repository under `REPOSITORY_CPD_RECORD`.
 */
export const CpdRecordRepositoryModule = RepositoryModule.forFeature({
  imports: [
    MongooseModule.forFeature(
      [{ name: CpdRecordEntity.name, schema: CpdRecordSchema }],
      MONGO_MAIN_CONNECTION,
    ),
    ChangeHistoryModule,
  ],
  repositories: [
    { provide: REPOSITORY_CPD_RECORD, useClass: CpdRecordRepositoryMongo },
  ],
})
