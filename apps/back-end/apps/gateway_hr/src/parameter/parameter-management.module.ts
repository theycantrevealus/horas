import { Module } from '@nestjs/common'
import { WorkforceModule } from '@workforce/workforce.module'
import { ParameterController } from './parameter.controller'

/**
 * HTTP side of group 1.6: HR parameters.
 */
@Module({
  imports: [WorkforceModule],
  controllers: [ParameterController],
})
export class ParameterManagementModule {}
