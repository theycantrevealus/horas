import { Module } from '@nestjs/common'
import { ClinicalAppointmentRepositoryModule } from '@repository/mongo/clinical-appointment.module'
import { FacilityRepositoryModule } from '@repository/mongo/facility.module'
import { PrivilegeGrantRepositoryModule } from '@repository/mongo/privilege-grant.module'
import { ProfessionalLicenseRepositoryModule } from '@repository/mongo/professional-license.module'
import { AppointmentExpiryJob } from './appointment-expiry.job'
import { HR_JOBS, type HrJob } from './job'
import { LicenseExpiryJob } from './license-expiry.job'

/**
 * The scheduled HR jobs (`.claude/design/plans/gateway-hr-7-worker-expiry-jobs.md`). It imports only
 * the repository modules the jobs read and write, so the application that runs them (the worker)
 * needs neither the JWT secret nor the encryption keys. It provides the ordered job list as
 * `HR_JOBS`. The connection module (transactions, event outbox) is global.
 */
@Module({
  imports: [
    ProfessionalLicenseRepositoryModule,
    ClinicalAppointmentRepositoryModule,
    PrivilegeGrantRepositoryModule,
    FacilityRepositoryModule,
  ],
  providers: [
    LicenseExpiryJob,
    AppointmentExpiryJob,
    {
      provide: HR_JOBS,
      inject: [LicenseExpiryJob, AppointmentExpiryJob],
      /**
       * Lists the jobs in the order a pass runs them.
       *
       * @param licenseExpiry - The licence expiry job.
       * @param appointmentExpiry - The SPK expiry job.
       * @returns The jobs.
       */
      useFactory: (
        licenseExpiry: LicenseExpiryJob,
        appointmentExpiry: AppointmentExpiryJob,
      ): HrJob[] => [licenseExpiry, appointmentExpiry],
    },
  ],
  exports: [HR_JOBS],
})
export class WorkforceJobsModule {}
