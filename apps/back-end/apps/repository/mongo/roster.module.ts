import { MongooseModule } from '@nestjs/mongoose'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import { RepositoryModule } from '@utility/database/module'
import { ChangeHistoryModule } from '@utility/history/module'
import { REPOSITORY_ROSTER } from '@repository/token'
import { RosterRepositoryMongo } from './roster'
import { RosterEntity, RosterSchema } from './schema/roster'

/**
 * Registers the roster repository under `REPOSITORY_ROSTER`.
 */
export const RosterRepositoryModule = RepositoryModule.forFeature({
  imports: [
    MongooseModule.forFeature(
      [{ name: RosterEntity.name, schema: RosterSchema }],
      MONGO_MAIN_CONNECTION,
    ),
    ChangeHistoryModule,
  ],
  repositories: [{ provide: REPOSITORY_ROSTER, useClass: RosterRepositoryMongo }],
})
