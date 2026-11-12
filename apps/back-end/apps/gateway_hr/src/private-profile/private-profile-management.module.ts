import { Module } from '@nestjs/common'
import { WorkforceModule } from '@workforce/workforce.module'
import { PrivateProfileController } from './private-profile.controller'

/**
 * HTTP side of group 2.2: the confidential profile of an employee.
 */
@Module({
  imports: [WorkforceModule],
  controllers: [PrivateProfileController],
})
export class PrivateProfileManagementModule {}
