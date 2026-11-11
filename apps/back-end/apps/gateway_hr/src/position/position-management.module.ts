import { Module } from '@nestjs/common'
import { WorkforceModule } from '@workforce/workforce.module'
import { PositionController } from './position.controller'

/**
 * HTTP side of group 1.5: positions.
 */
@Module({
  imports: [WorkforceModule],
  controllers: [PositionController],
})
export class PositionManagementModule {}
