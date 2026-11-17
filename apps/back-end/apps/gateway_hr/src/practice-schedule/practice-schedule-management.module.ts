import { Module } from '@nestjs/common'
import { WorkforceModule } from '@workforce/workforce.module'
import { PracticeScheduleController } from './practice-schedule.controller'

/**
 * HTTP side of group 5.8: practice schedules.
 */
@Module({
  imports: [WorkforceModule],
  controllers: [PracticeScheduleController],
})
export class PracticeScheduleManagementModule {}
