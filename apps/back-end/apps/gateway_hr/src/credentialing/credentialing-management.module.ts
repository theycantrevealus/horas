import { Module } from '@nestjs/common'
import { WorkforceModule } from '@workforce/workforce.module'
import { ApplicationController } from './application.controller'

/**
 * HTTP side of group 4.2: credential applications.
 */
@Module({
  imports: [WorkforceModule],
  controllers: [ApplicationController],
})
export class CredentialingManagementModule {}
