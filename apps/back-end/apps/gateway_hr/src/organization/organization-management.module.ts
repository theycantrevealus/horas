import { Module } from '@nestjs/common'
import { WorkforceModule } from '@workforce/workforce.module'
import { OrganizationController } from './organization.controller'

/**
 * HTTP side of group 1.1: organizations.
 */
@Module({
  imports: [WorkforceModule],
  controllers: [OrganizationController],
})
export class OrganizationManagementModule {}
