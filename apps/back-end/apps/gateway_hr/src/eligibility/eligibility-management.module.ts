import { Module } from '@nestjs/common'
import { WorkforceModule } from '@workforce/workforce.module'
import { EligibilityController } from './eligibility.controller'

/**
 * HTTP side of group 6: clinical eligibility.
 */
@Module({
  imports: [WorkforceModule],
  controllers: [EligibilityController],
})
export class EligibilityManagementModule {}
