import { Module } from '@nestjs/common'
import { ClinicalAppointmentRepositoryModule } from '@repository/mongo/clinical-appointment.module'
import { CodeConceptRepositoryModule } from '@repository/mongo/code-concept.module'
import { EmployeeRepositoryModule } from '@repository/mongo/employee.module'
import { EmploymentContractRepositoryModule } from '@repository/mongo/employment-contract.module'
import { FacilityRepositoryModule } from '@repository/mongo/facility.module'
import { HrParameterRepositoryModule } from '@repository/mongo/hr-parameter.module'
import { LeaveLedgerRepositoryModule } from '@repository/mongo/leave-ledger.module'
import { LeavePolicyRepositoryModule } from '@repository/mongo/leave-policy.module'
import { OrganizationRepositoryModule } from '@repository/mongo/organization.module'
import { OrganizationUnitRepositoryModule } from '@repository/mongo/organization-unit.module'
import { PrivilegeGrantRepositoryModule } from '@repository/mongo/privilege-grant.module'
import { ProfessionalLicenseRepositoryModule } from '@repository/mongo/professional-license.module'
import { RosterAssignmentRepositoryModule } from '@repository/mongo/roster-assignment.module'
import { RosterRepositoryModule } from '@repository/mongo/roster.module'
import { LoggerModule } from '@utility/logger/module'
import { CodeConceptService } from '../concept/code-concept.service'
import { EligibilityService } from '../eligibility/eligibility.service'
import { ParameterService } from '../parameter/parameter.service'
import { AppointmentExpiryJob } from './appointment-expiry.job'
import { EligibilitySweepJob } from './eligibility-sweep.job'
import { HR_JOBS, type HrJob } from './job'
import { LeaveGrantJob } from './leave-grant.job'
import { LeavePeriodJob } from './leave-period.job'
import { LicenseExpiryJob } from './license-expiry.job'

/**
 * The scheduled HR jobs (`.claude/design/plans/gateway-hr-7-worker-expiry-jobs.md`). It imports only
 * the repository modules the jobs read and write, so the application that runs them (the worker)
 * needs neither the JWT secret nor the encryption keys. It provides the ordered job list as
 * `HR_JOBS`. The connection module (transactions, event outbox) is global.
 */
@Module({
  imports: [
    LoggerModule,
    ProfessionalLicenseRepositoryModule,
    CodeConceptRepositoryModule,
    EmployeeRepositoryModule,
    HrParameterRepositoryModule,
    OrganizationRepositoryModule,
    OrganizationUnitRepositoryModule,
    RosterRepositoryModule,
    RosterAssignmentRepositoryModule,
    ClinicalAppointmentRepositoryModule,
    PrivilegeGrantRepositoryModule,
    FacilityRepositoryModule,
    EmploymentContractRepositoryModule,
    LeavePolicyRepositoryModule,
    LeaveLedgerRepositoryModule,
  ],
  providers: [
    LicenseExpiryJob,
    AppointmentExpiryJob,
    CodeConceptService,
    ParameterService,
    EligibilityService,
    EligibilitySweepJob,
    LeaveGrantJob,
    LeavePeriodJob,
    {
      provide: HR_JOBS,
      inject: [
        LicenseExpiryJob,
        AppointmentExpiryJob,
        EligibilitySweepJob,
        LeaveGrantJob,
        LeavePeriodJob,
      ],
      /**
       * Lists the jobs in the order a pass runs them.
       *
       * @param licenseExpiry - The licence expiry job.
       * @param appointmentExpiry - The SPK expiry job.
       * @param eligibilitySweep - The eligibility sweep job.
       * @param leaveGrant - The leave grant job.
       * @param leavePeriod - The leave period job.
       * @returns The jobs.
       */
      useFactory: (
        licenseExpiry: LicenseExpiryJob,
        appointmentExpiry: AppointmentExpiryJob,
        eligibilitySweep: EligibilitySweepJob,
        leaveGrant: LeaveGrantJob,
        leavePeriod: LeavePeriodJob,
      ): HrJob[] => [
        licenseExpiry,
        appointmentExpiry,
        eligibilitySweep,
        leaveGrant,
        leavePeriod,
      ],
    },
  ],
  exports: [HR_JOBS],
})
export class WorkforceJobsModule {}
