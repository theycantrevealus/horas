import { Module } from '@nestjs/common'
import { LoggerModule } from '@utility/logger/module'
import { CodeConceptRepositoryModule } from '@repository/mongo/code-concept.module'
import { FacilityRepositoryModule } from '@repository/mongo/facility.module'
import { OrganizationUnitRepositoryModule } from '@repository/mongo/organization-unit.module'
import { OrganizationRepositoryModule } from '@repository/mongo/organization.module'
import { CodeConceptService } from './concept/code-concept.service'
import { FacilityService } from './structure/facility.service'
import { OrganizationService } from './structure/organization.service'
import { UnitService } from './structure/unit.service'

/**
 * Workforce (HR) domain module. Transport-neutral: gateways import it and expose its services.
 * Each HR area adds its repositories and services here as it is built.
 */
@Module({
  imports: [
    LoggerModule,
    OrganizationRepositoryModule,
    FacilityRepositoryModule,
    CodeConceptRepositoryModule,
    OrganizationUnitRepositoryModule,
  ],
  providers: [
    OrganizationService,
    FacilityService,
    CodeConceptService,
    UnitService,
  ],
  exports: [
    OrganizationService,
    FacilityService,
    CodeConceptService,
    UnitService,
  ],
})
export class WorkforceModule {}
