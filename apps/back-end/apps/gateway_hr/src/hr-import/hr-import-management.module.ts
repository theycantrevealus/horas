import { Module } from '@nestjs/common'
import { WorkforceModule } from '@workforce/workforce.module'
import { HrImportController } from './hr-import.controller'

/**
 * HTTP side of group 5.6: viewing and cancelling an import, of any kind.
 */
@Module({
  imports: [WorkforceModule],
  controllers: [HrImportController],
})
export class HrImportManagementModule {}
