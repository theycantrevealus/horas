import { MongooseModule } from '@nestjs/mongoose'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import { RepositoryModule } from '@utility/database/module'
import { ChangeHistoryModule } from '@utility/history/module'
import { REPOSITORY_PRACTICE_SCHEDULE_EXCEPTION } from '@repository/token'
import { PracticeScheduleExceptionRepositoryMongo } from './practice-schedule-exception'
import {
  PracticeScheduleExceptionEntity,
  PracticeScheduleExceptionSchema,
} from './schema/practice-schedule-exception'

/**
 * Registers the practice schedule exception repository under
 * `REPOSITORY_PRACTICE_SCHEDULE_EXCEPTION`.
 */
export const PracticeScheduleExceptionRepositoryModule =
  RepositoryModule.forFeature({
    imports: [
      MongooseModule.forFeature(
        [
          {
            name: PracticeScheduleExceptionEntity.name,
            schema: PracticeScheduleExceptionSchema,
          },
        ],
        MONGO_MAIN_CONNECTION,
      ),
      ChangeHistoryModule,
    ],
    repositories: [
      {
        provide: REPOSITORY_PRACTICE_SCHEDULE_EXCEPTION,
        useClass: PracticeScheduleExceptionRepositoryMongo,
      },
    ],
  })
