import { MongooseModule } from '@nestjs/mongoose'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import { RepositoryModule } from '@utility/database/module'
import { ChangeHistoryModule } from '@utility/history/module'
import { REPOSITORY_SEPARATION_DETAIL } from '@repository/token'
import { SeparationDetailRepositoryMongo } from './separation-detail'
import {
  SeparationDetailEntity,
  SeparationDetailSchema,
} from './schema/separation-detail'

/**
 * Registers the separation detail repository on the main Mongo connection.
 */
export const SeparationDetailRepositoryModule = RepositoryModule.forFeature({
  imports: [
    MongooseModule.forFeature(
      [{ name: SeparationDetailEntity.name, schema: SeparationDetailSchema }],
      MONGO_MAIN_CONNECTION,
    ),
    ChangeHistoryModule,
  ],
  repositories: [
    {
      provide: REPOSITORY_SEPARATION_DETAIL,
      useClass: SeparationDetailRepositoryMongo,
    },
  ],
})
