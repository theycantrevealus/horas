import { Module } from '@nestjs/common'
import { WorkforceModule } from '@workforce/workforce.module'
import { CoverageController } from './coverage.controller'

/**
 * HTTP side of group 5.3: coverage requirements.
 */
@Module({
  imports: [WorkforceModule],
  controllers: [CoverageController],
})
export class CoverageManagementModule {}
