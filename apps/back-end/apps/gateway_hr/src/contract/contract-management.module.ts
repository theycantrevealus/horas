import { Module } from '@nestjs/common'
import { WorkforceModule } from '@workforce/workforce.module'
import {
  ContractController,
  EmployeeContractsController,
} from './contract.controller'

/**
 * HTTP side of group 2.3: employment contracts.
 */
@Module({
  imports: [WorkforceModule],
  controllers: [ContractController, EmployeeContractsController],
})
export class ContractManagementModule {}
