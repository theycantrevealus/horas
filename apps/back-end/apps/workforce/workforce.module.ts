import { Module } from '@nestjs/common'
import { LoggerModule } from '@utility/logger/module'
import { FacilityRepositoryModule } from '@repository/mongo/facility.module'
import { OrganizationRepositoryModule } from '@repository/mongo/organization.module'
import { FacilityService } from './structure/facility.service'
import { OrganizationService } from './structure/organization.service'

/**
 * Workforce (HR) domain module. Transport-neutral: gateways import it and expose its services.
 * Each HR area adds its repositories and services here as it is built.
 */
@Module({
  imports: [
    LoggerModule,
    OrganizationRepositoryModule,
    FacilityRepositoryModule,
  ],
  providers: [OrganizationService, FacilityService],
  exports: [OrganizationService, FacilityService],
})
export class WorkforceModule {}
