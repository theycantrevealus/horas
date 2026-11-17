import { Module } from '@nestjs/common'
import { WorkforceModule } from '@workforce/workforce.module'
import { CsvBodyParser } from '../http/csv-body'
import { RosterImportController } from './roster-import.controller'

/**
 * HTTP side of group 5.6: the roster CSV import.
 */
@Module({
  imports: [WorkforceModule],
  controllers: [RosterImportController],
  providers: [CsvBodyParser],
})
export class RosterImportManagementModule {}
