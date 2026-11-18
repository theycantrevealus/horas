import { Module } from '@nestjs/common'
import { WorkforceModule } from '@workforce/workforce.module'
import {
  AssignmentController,
  EmployeeAssignmentsController,
  UnitAssignmentsController,
} from './assignment.controller'

/**
 * HTTP side of group 2.4: position assignments.
 */
@Module({
  imports: [WorkforceModule],
  controllers: [
    AssignmentController,
    EmployeeAssignmentsController,
    UnitAssignmentsController,
  ],
})
export class AssignmentManagementModule {}
