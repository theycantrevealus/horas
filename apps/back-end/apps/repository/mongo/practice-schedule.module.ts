import { MongooseModule } from '@nestjs/mongoose'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import { RepositoryModule } from '@utility/database/module'
import { ChangeHistoryModule } from '@utility/history/module'
import { REPOSITORY_PRACTICE_SCHEDULE } from '@repository/token'
import { PracticeScheduleRepositoryMongo } from './practice-schedule'
import {
  PracticeScheduleEntity,
  PracticeScheduleSchema,
} from './schema/practice-schedule'

/**
 * Registers the practice schedule repository under `REPOSITORY_PRACTICE_SCHEDULE`.
 */
export const PracticeScheduleRepositoryModule = RepositoryModule.forFeature({
  imports: [
    MongooseModule.forFeature(
      [
        {
          name: PracticeScheduleEntity.name,
          schema: PracticeScheduleSchema,
        },
      ],
      MONGO_MAIN_CONNECTION,
    ),
    ChangeHistoryModule,
  ],
  repositories: [
    {
      provide: REPOSITORY_PRACTICE_SCHEDULE,
      useClass: PracticeScheduleRepositoryMongo,
    },
  ],
})
