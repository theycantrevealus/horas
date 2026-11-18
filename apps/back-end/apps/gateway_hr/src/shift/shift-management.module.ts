import { Module } from '@nestjs/common'
import { WorkforceModule } from '@workforce/workforce.module'
import { ShiftController } from './shift.controller'

/**
 * HTTP side of group 5.1: shift definitions.
 */
@Module({
  imports: [WorkforceModule],
  controllers: [ShiftController],
})
export class ShiftManagementModule {}
