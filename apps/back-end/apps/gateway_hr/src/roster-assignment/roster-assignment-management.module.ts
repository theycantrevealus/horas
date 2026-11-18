import { Module } from '@nestjs/common'
import { WorkforceModule } from '@workforce/workforce.module'
import { DutyController } from './duty.controller'
import { RosterAssignmentController } from './roster-assignment.controller'

/**
 * HTTP side of group 5.5: the assignments of a roster, who is on duty and my own roster.
 */
@Module({
  imports: [WorkforceModule],
  controllers: [RosterAssignmentController, DutyController],
})
export class RosterAssignmentManagementModule {}
