import { MongooseModule } from '@nestjs/mongoose'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import { RepositoryModule } from '@utility/database/module'
import { ChangeHistoryModule } from '@utility/history/module'
import { REPOSITORY_POSITION } from '@repository/token'
import { PositionRepositoryMongo } from './position'
import { PositionEntity, PositionSchema } from './schema/position'

/**
 * Registers the position repository under `REPOSITORY_POSITION`.
 */
export const PositionRepositoryModule = RepositoryModule.forFeature({
  imports: [
    MongooseModule.forFeature(
      [{ name: PositionEntity.name, schema: PositionSchema }],
      MONGO_MAIN_CONNECTION,
    ),
    ChangeHistoryModule,
  ],
  repositories: [
    { provide: REPOSITORY_POSITION, useClass: PositionRepositoryMongo },
  ],
})
