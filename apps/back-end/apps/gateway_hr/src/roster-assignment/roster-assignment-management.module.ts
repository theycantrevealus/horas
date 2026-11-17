import { Module } from '@nestjs/common'
import { WorkforceModule } from '@workforce/workforce.module'
import { RosterAssignmentController } from './roster-assignment.controller'

/**
 * HTTP side of group 5.5: the assignments of a roster.
 */
@Module({
  imports: [WorkforceModule],
  controllers: [RosterAssignmentController],
})
export class RosterAssignmentManagementModule {}
