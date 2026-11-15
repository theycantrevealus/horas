import { Module } from '@nestjs/common'
import { WorkforceModule } from '@workforce/workforce.module'
import { PrivilegeController } from './privilege.controller'

/**
 * HTTP side of group 4.1: the privilege catalog.
 */
@Module({
  imports: [WorkforceModule],
  controllers: [PrivilegeController],
})
export class PrivilegeManagementModule {}
