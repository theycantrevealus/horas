import { Module } from '@nestjs/common'
import { WorkforceModule } from '@workforce/workforce.module'
import {
  CpdRecordController,
  EmployeeCpdController,
} from './cpd.controller'

/**
 * HTTP side of group 3.2: professional credits.
 */
@Module({
  imports: [WorkforceModule],
  controllers: [CpdRecordController, EmployeeCpdController],
})
export class CpdManagementModule {}
