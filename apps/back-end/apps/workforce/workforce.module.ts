import { Module } from '@nestjs/common'
import { LoggerModule } from '@utility/logger/module'
import { OrganizationRepositoryModule } from '@repository/mongo/organization.module'
import { OrganizationService } from './structure/organization.service'

/**
 * Workforce (HR) domain module. Transport-neutral: gateways import it and expose its services.
 * Each HR area adds its repositories and services here as it is built.
 */
@Module({
  imports: [LoggerModule, OrganizationRepositoryModule],
  providers: [OrganizationService],
  exports: [OrganizationService],
})
export class WorkforceModule {}
