import { MongooseModule } from '@nestjs/mongoose'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import { RepositoryModule } from '@utility/database/module'
import { ChangeHistoryModule } from '@utility/history/module'
import { REPOSITORY_ROSTER_ASSIGNMENT } from '@repository/token'
import { RosterAssignmentRepositoryMongo } from './roster-assignment'
import {
  RosterAssignmentEntity,
  RosterAssignmentSchema,
} from './schema/roster-assignment'

/**
 * Registers the roster assignment repository under `REPOSITORY_ROSTER_ASSIGNMENT`.
 */
export const RosterAssignmentRepositoryModule = RepositoryModule.forFeature({
  imports: [
    MongooseModule.forFeature(
      [
        {
          name: RosterAssignmentEntity.name,
          schema: RosterAssignmentSchema,
        },
      ],
      MONGO_MAIN_CONNECTION,
    ),
    ChangeHistoryModule,
  ],
  repositories: [
    {
      provide: REPOSITORY_ROSTER_ASSIGNMENT,
      useClass: RosterAssignmentRepositoryMongo,
    },
  ],
})
