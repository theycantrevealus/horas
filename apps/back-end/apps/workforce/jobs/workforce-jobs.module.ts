import { Module } from '@nestjs/common'
import { ProfessionalLicenseRepositoryModule } from '@repository/mongo/professional-license.module'
import { HR_JOBS, type HrJob } from './job'
import { LicenseExpiryJob } from './license-expiry.job'

/**
 * The scheduled HR jobs (`.claude/design/plans/gateway-hr-7-worker-expiry-jobs.md`). It imports only
 * the repository modules the jobs read and write, so the application that runs them (the worker)
 * needs neither the JWT secret nor the encryption keys. It provides the ordered job list as
 * `HR_JOBS`. The connection module (transactions, event outbox) is global.
 */
@Module({
  imports: [ProfessionalLicenseRepositoryModule],
  providers: [
    LicenseExpiryJob,
    {
      provide: HR_JOBS,
      inject: [LicenseExpiryJob],
      /**
       * Lists the jobs in the order a pass runs them.
       *
       * @param licenseExpiry - The licence expiry job.
       * @returns The jobs.
       */
      useFactory: (licenseExpiry: LicenseExpiryJob): HrJob[] => [licenseExpiry],
    },
  ],
  exports: [HR_JOBS],
})
export class WorkforceJobsModule {}
