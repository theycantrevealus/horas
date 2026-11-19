import { Module } from '@nestjs/common'
import { ChangeHistoryModule } from '@utility/history/module'
import { LoggerModule } from '@utility/logger/module'
import { CodeConceptRepositoryModule } from '@repository/mongo/code-concept.module'
import { CommitteeMembershipRepositoryModule } from '@repository/mongo/committee-membership.module'
import { CpdRecordRepositoryModule } from '@repository/mongo/cpd-record.module'
import { ClinicalAppointmentRepositoryModule } from '@repository/mongo/clinical-appointment.module'
import { CredentialApplicationRepositoryModule } from '@repository/mongo/credential-application.module'
import { CredentialAssessmentRepositoryModule } from '@repository/mongo/credential-assessment.module'
import { PrivilegeGrantRepositoryModule } from '@repository/mongo/privilege-grant.module'
import { CoverageRequirementRepositoryModule } from '@repository/mongo/coverage-requirement.module'
import { LeaveLedgerRepositoryModule } from '@repository/mongo/leave-ledger.module'
import { LeavePolicyRepositoryModule } from '@repository/mongo/leave-policy.module'
import { RosterAssignmentRepositoryModule } from '@repository/mongo/roster-assignment.module'
import { PracticeScheduleRepositoryModule } from '@repository/mongo/practice-schedule.module'
import { PracticeScheduleExceptionRepositoryModule } from '@repository/mongo/practice-schedule-exception.module'
import { ShiftSwapRequestRepositoryModule } from '@repository/mongo/shift-swap-request.module'
import { RosterRepositoryModule } from '@repository/mongo/roster.module'
import { HolidayCalendarRepositoryModule } from '@repository/mongo/holiday-calendar.module'
import { HrImportRepositoryModule } from '@repository/mongo/hr-import.module'
import { ShiftDefinitionRepositoryModule } from '@repository/mongo/shift-definition.module'
import { CpdSummaryRepositoryModule } from '@repository/mongo/cpd-summary.module'
import { FacilityRepositoryModule } from '@repository/mongo/facility.module'
import { OrganizationUnitRepositoryModule } from '@repository/mongo/organization-unit.module'
import { EmploymentContractRepositoryModule } from '@repository/mongo/employment-contract.module'
import { EmployeePrivateProfileRepositoryModule } from '@repository/mongo/employee-private-profile.module'
import { EmployeeRepositoryModule } from '@repository/mongo/employee.module'
import { HrParameterRepositoryModule } from '@repository/mongo/hr-parameter.module'
import { PositionAssignmentRepositoryModule } from '@repository/mongo/position-assignment.module'
import { PrivilegeCatalogRepositoryModule } from '@repository/mongo/privilege-catalog.module'
import { ProfessionalLicenseRepositoryModule } from '@repository/mongo/professional-license.module'
import { PositionRepositoryModule } from '@repository/mongo/position.module'
import { OrganizationRepositoryModule } from '@repository/mongo/organization.module'
import { AssignmentService } from './assignment/assignment.service'
import { CommitteeMembershipService } from './committee/committee-membership.service'
import { CodeConceptService } from './concept/code-concept.service'
import { ApplicationService } from './credentialing/application.service'
import { AppointmentService } from './appointment/appointment.service'
import { GrantService } from './appointment/grant.service'
import { StatusService } from './appointment/status.service'
import { EligibilityQueryService } from './eligibility/eligibility-query.service'
import { EligibilityService } from './eligibility/eligibility.service'
import { RosterAssignmentService } from './rostering/roster-assignment.service'
import { CoverageService } from './rostering/coverage.service'
import { LeaveBalanceService } from './leave/leave-balance.service'
import { LeavePlaceService } from './leave/leave-place'
import { LeavePolicyService } from './leave/leave-policy.service'
import { HrImportService } from './import/hr-import.service'
import { DutyService } from './rostering/duty.service'
import { PracticeExceptionService } from './rostering/practice-exception.service'
import { PracticeScheduleService } from './rostering/practice-schedule.service'
import { RosterImportService } from './rostering/roster-import.service'
import { SwapService } from './rostering/swap.service'
import { RosterValidationService } from './rostering/roster-validation.service'
import { RosterService } from './rostering/roster.service'
import { HolidayImportService } from './rostering/holiday-import.service'
import { HolidayService } from './rostering/holiday.service'
import { ShiftService } from './rostering/shift.service'
import { AssessmentService } from './credentialing/assessment.service'
import { DecisionService } from './credentialing/decision.service'
import { ReviewService } from './credentialing/review.service'
import { CpdService } from './credit/cpd.service'
import { CpdSummaryService } from './credit/cpd-summary.service'
import { FacilityService } from './structure/facility.service'
import { OrganizationService } from './structure/organization.service'
import { ContractService } from './contract/contract.service'
import { EmployeeService } from './employee/employee.service'
import { PrivateProfileService } from './private-profile/private-profile.service'
import { LicenseService } from './license/license.service'
import { PrivilegeService } from './privilege/privilege.service'
import { ParameterService } from './parameter/parameter.service'
import { PositionService } from './structure/position.service'
import { UnitService } from './structure/unit.service'

/**
 * Workforce (HR) domain module. Transport-neutral: gateways import it and expose its services.
 * Each HR area adds its repositories and services here as it is built.
 */
@Module({
  imports: [
    LoggerModule,
    ChangeHistoryModule,
    OrganizationRepositoryModule,
    FacilityRepositoryModule,
    CodeConceptRepositoryModule,
    OrganizationUnitRepositoryModule,
    PositionRepositoryModule,
    HrParameterRepositoryModule,
    EmployeeRepositoryModule,
    EmployeePrivateProfileRepositoryModule,
    EmploymentContractRepositoryModule,
    PositionAssignmentRepositoryModule,
    CommitteeMembershipRepositoryModule,
    ProfessionalLicenseRepositoryModule,
    CpdRecordRepositoryModule,
    CpdSummaryRepositoryModule,
    PrivilegeCatalogRepositoryModule,
    CredentialApplicationRepositoryModule,
    CredentialAssessmentRepositoryModule,
    ClinicalAppointmentRepositoryModule,
    PrivilegeGrantRepositoryModule,
    ShiftDefinitionRepositoryModule,
    HolidayCalendarRepositoryModule,
    HrImportRepositoryModule,
    CoverageRequirementRepositoryModule,
    RosterRepositoryModule,
    RosterAssignmentRepositoryModule,
    ShiftSwapRequestRepositoryModule,
    PracticeScheduleRepositoryModule,
    PracticeScheduleExceptionRepositoryModule,
    LeavePolicyRepositoryModule,
    LeaveLedgerRepositoryModule,
  ],
  providers: [
    OrganizationService,
    FacilityService,
    CodeConceptService,
    UnitService,
    PositionService,
    ParameterService,
    EmployeeService,
    PrivateProfileService,
    ContractService,
    AssignmentService,
    CommitteeMembershipService,
    LicenseService,
    CpdService,
    CpdSummaryService,
    PrivilegeService,
    ApplicationService,
    ReviewService,
    AssessmentService,
    DecisionService,
    AppointmentService,
    GrantService,
    StatusService,
    ShiftService,
    HolidayService,
    HolidayImportService,
    CoverageService,
    RosterService,
    RosterAssignmentService,
    RosterValidationService,
    RosterImportService,
    SwapService,
    PracticeScheduleService,
    PracticeExceptionService,
    HrImportService,
    DutyService,
    EligibilityService,
    EligibilityQueryService,
    LeavePolicyService,
    LeavePlaceService,
    LeaveBalanceService,
  ],
  exports: [
    OrganizationService,
    FacilityService,
    CodeConceptService,
    UnitService,
    PositionService,
    ParameterService,
    EmployeeService,
    PrivateProfileService,
    ContractService,
    AssignmentService,
    CommitteeMembershipService,
    LicenseService,
    CpdService,
    CpdSummaryService,
    PrivilegeService,
    ApplicationService,
    ReviewService,
    AssessmentService,
    DecisionService,
    AppointmentService,
    GrantService,
    StatusService,
    ShiftService,
    HolidayService,
    HolidayImportService,
    CoverageService,
    RosterService,
    RosterAssignmentService,
    RosterValidationService,
    RosterImportService,
    SwapService,
    PracticeScheduleService,
    PracticeExceptionService,
    HrImportService,
    DutyService,
    EligibilityService,
    EligibilityQueryService,
    LeavePolicyService,
    LeavePlaceService,
    LeaveBalanceService,
  ],
})
export class WorkforceModule {}
