import { Module } from '@nestjs/common'
import { WorkforceModule } from '@workforce/workforce.module'
import { PracticeExceptionController } from './practice-exception.controller'
import { PracticeScheduleController } from './practice-schedule.controller'

/**
 * HTTP side of group 5.8: practice schedules.
 */
@Module({
  imports: [WorkforceModule],
  controllers: [PracticeScheduleController, PracticeExceptionController],
})
export class PracticeScheduleManagementModule {}
