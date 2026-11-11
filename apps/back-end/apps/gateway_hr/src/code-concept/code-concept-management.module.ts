import { Module } from '@nestjs/common'
import { WorkforceModule } from '@workforce/workforce.module'
import { CodeConceptController } from './code-concept.controller'

/**
 * HTTP side of group 1.3: code concepts.
 */
@Module({
  imports: [WorkforceModule],
  controllers: [CodeConceptController],
})
export class CodeConceptManagementModule {}
