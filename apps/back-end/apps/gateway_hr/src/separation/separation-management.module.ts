import { Module } from '@nestjs/common'
import { WorkforceModule } from '@workforce/workforce.module'
import { SeparationController } from './separation.controller'

/**
 * HTTP side of group 9: separations (record, change, cancel, read, impact and checklist).
 */
@Module({
  imports: [WorkforceModule],
  controllers: [SeparationController],
})
export class SeparationManagementModule {}
