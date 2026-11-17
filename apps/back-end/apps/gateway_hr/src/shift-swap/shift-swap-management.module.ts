import { Module } from '@nestjs/common'
import { WorkforceModule } from '@workforce/workforce.module'
import { ShiftSwapController } from './shift-swap.controller'

/**
 * HTTP side of group 5.7: shift swap requests.
 */
@Module({
  imports: [WorkforceModule],
  controllers: [ShiftSwapController],
})
export class ShiftSwapManagementModule {}
