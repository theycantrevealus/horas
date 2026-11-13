import { MongooseModule } from '@nestjs/mongoose'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import { RepositoryModule } from '@utility/database/module'
import { ChangeHistoryModule } from '@utility/history/module'
import { REPOSITORY_COMMITTEE_MEMBERSHIP } from '@repository/token'
import { CommitteeMembershipRepositoryMongo } from './committee-membership'
import {
  CommitteeMembershipEntity,
  CommitteeMembershipSchema,
} from './schema/committee-membership'

/**
 * Registers the committee membership repository under `REPOSITORY_COMMITTEE_MEMBERSHIP`.
 */
export const CommitteeMembershipRepositoryModule =
  RepositoryModule.forFeature({
    imports: [
      MongooseModule.forFeature(
        [
          {
            name: CommitteeMembershipEntity.name,
            schema: CommitteeMembershipSchema,
          },
        ],
        MONGO_MAIN_CONNECTION,
      ),
      ChangeHistoryModule,
    ],
    repositories: [
      {
        provide: REPOSITORY_COMMITTEE_MEMBERSHIP,
        useClass: CommitteeMembershipRepositoryMongo,
      },
    ],
  })
