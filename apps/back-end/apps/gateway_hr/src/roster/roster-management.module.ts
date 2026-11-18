import { Module } from '@nestjs/common'
import { WorkforceModule } from '@workforce/workforce.module'
import { RosterController } from './roster.controller'

/**
 * HTTP side of group 5.4: rosters and their lifecycle.
 */
@Module({
  imports: [WorkforceModule],
  controllers: [RosterController],
})
export class RosterManagementModule {}
