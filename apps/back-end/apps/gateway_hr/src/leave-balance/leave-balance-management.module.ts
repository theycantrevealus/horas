import { Module } from '@nestjs/common'
import { WorkforceModule } from '@workforce/workforce.module'
import { LeaveBalanceController } from './leave-balance.controller'

/**
 * HTTP side of group 8.2: leave balances and adjustments.
 */
@Module({
  imports: [WorkforceModule],
  controllers: [LeaveBalanceController],
})
export class LeaveBalanceManagementModule {}
