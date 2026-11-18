import { MongooseModule } from '@nestjs/mongoose'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import { RepositoryModule } from '@utility/database/module'
import { ChangeHistoryModule } from '@utility/history/module'
import { REPOSITORY_POSITION_ASSIGNMENT } from '@repository/token'
import { PositionAssignmentRepositoryMongo } from './position-assignment'
import {
  PositionAssignmentEntity,
  PositionAssignmentSchema,
} from './schema/position-assignment'

/**
 * Registers the position assignment repository under `REPOSITORY_POSITION_ASSIGNMENT`.
 */
export const PositionAssignmentRepositoryModule = RepositoryModule.forFeature({
  imports: [
    MongooseModule.forFeature(
      [
        {
          name: PositionAssignmentEntity.name,
          schema: PositionAssignmentSchema,
        },
      ],
      MONGO_MAIN_CONNECTION,
    ),
    ChangeHistoryModule,
  ],
  repositories: [
    {
      provide: REPOSITORY_POSITION_ASSIGNMENT,
      useClass: PositionAssignmentRepositoryMongo,
    },
  ],
})
