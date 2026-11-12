import { Module } from '@nestjs/common'
import { WorkforceModule } from '@workforce/workforce.module'
import { EmployeeController } from './employee.controller'

/**
 * HTTP side of group 2.1: employee records.
 */
@Module({
  imports: [WorkforceModule],
  controllers: [EmployeeController],
})
export class EmployeeManagementModule {}
