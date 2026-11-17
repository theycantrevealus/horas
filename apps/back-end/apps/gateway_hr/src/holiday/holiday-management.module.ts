import { Module } from '@nestjs/common'
import { WorkforceModule } from '@workforce/workforce.module'
import { CsvBodyParser } from '../http/csv-body'
import { HolidayController } from './holiday.controller'

/**
 * HTTP side of group 5.2: holiday calendars and their CSV import.
 */
@Module({
  imports: [WorkforceModule],
  controllers: [HolidayController],
  providers: [CsvBodyParser],
})
export class HolidayManagementModule {}
