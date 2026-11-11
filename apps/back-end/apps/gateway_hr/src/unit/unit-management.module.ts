import { Module } from '@nestjs/common'
import { WorkforceModule } from '@workforce/workforce.module'
import { UnitController } from './unit.controller'

/**
 * HTTP side of group 1.4: organization units.
 */
@Module({
  imports: [WorkforceModule],
  controllers: [UnitController],
})
export class UnitManagementModule {}
