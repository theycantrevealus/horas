import { Module } from '@nestjs/common'
import { WorkforceModule } from '@workforce/workforce.module'
import { HolidayController } from './holiday.controller'

/**
 * HTTP side of group 5.2: holiday calendars.
 */
@Module({
  imports: [WorkforceModule],
  controllers: [HolidayController],
})
export class HolidayManagementModule {}
