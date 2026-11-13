import { Module } from '@nestjs/common'
import { WorkforceModule } from '@workforce/workforce.module'
import { CommitteeMembershipController } from './committee-membership.controller'

/**
 * HTTP side of group 2.5: committee memberships.
 */
@Module({
  imports: [WorkforceModule],
  controllers: [CommitteeMembershipController],
})
export class CommitteeMembershipManagementModule {}
