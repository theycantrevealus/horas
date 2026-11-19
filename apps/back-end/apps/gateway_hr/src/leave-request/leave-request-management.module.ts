import { Module } from '@nestjs/common'
import { WorkforceModule } from '@workforce/workforce.module'
import { LeaveRequestController } from './leave-request.controller'

/**
 * HTTP side of group 8.3: leave requests (preview, create, read and proof).
 */
@Module({
  imports: [WorkforceModule],
  controllers: [LeaveRequestController],
})
export class LeaveRequestManagementModule {}
