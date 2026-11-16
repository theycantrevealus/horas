import { MongooseModule } from '@nestjs/mongoose'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import { RepositoryModule } from '@utility/database/module'
import { ChangeHistoryModule } from '@utility/history/module'
import { REPOSITORY_HOLIDAY_CALENDAR } from '@repository/token'
import { HolidayCalendarRepositoryMongo } from './holiday-calendar'
import {
  HolidayCalendarEntity,
  HolidayCalendarSchema,
} from './schema/holiday-calendar'

/**
 * Registers the holiday calendar repository under `REPOSITORY_HOLIDAY_CALENDAR`.
 */
export const HolidayCalendarRepositoryModule = RepositoryModule.forFeature({
  imports: [
    MongooseModule.forFeature(
      [{ name: HolidayCalendarEntity.name, schema: HolidayCalendarSchema }],
      MONGO_MAIN_CONNECTION,
    ),
    ChangeHistoryModule,
  ],
  repositories: [
    {
      provide: REPOSITORY_HOLIDAY_CALENDAR,
      useClass: HolidayCalendarRepositoryMongo,
    },
  ],
})
