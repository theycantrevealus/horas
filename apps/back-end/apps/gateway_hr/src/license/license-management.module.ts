import { Module } from '@nestjs/common'
import { WorkforceModule } from '@workforce/workforce.module'
import {
  EmployeeLicensesController,
  LicenseController,
} from './license.controller'

/**
 * HTTP side of group 3.1: professional licences.
 */
@Module({
  imports: [WorkforceModule],
  controllers: [LicenseController, EmployeeLicensesController],
})
export class LicenseManagementModule {}
