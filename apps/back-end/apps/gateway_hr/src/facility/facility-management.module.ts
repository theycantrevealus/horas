import { Module } from '@nestjs/common'
import { WorkforceModule } from '@workforce/workforce.module'
import { FacilityController } from './facility.controller'

/**
 * HTTP side of group 1.2: facilities.
 */
@Module({
  imports: [WorkforceModule],
  controllers: [FacilityController],
})
export class FacilityManagementModule {}
