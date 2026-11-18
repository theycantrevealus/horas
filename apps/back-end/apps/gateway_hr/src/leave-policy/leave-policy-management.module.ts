import { Module } from '@nestjs/common'
import { WorkforceModule } from '@workforce/workforce.module'
import { LeavePolicyController } from './leave-policy.controller'

/**
 * HTTP side of group 8.1: leave policies.
 */
@Module({
  imports: [WorkforceModule],
  controllers: [LeavePolicyController],
})
export class LeavePolicyManagementModule {}
