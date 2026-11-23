import { Inject, Injectable } from '@nestjs/common'
import { type ClinicalAppointmentRepository } from '@repository/interface/clinical-appointment'
import { type CommitteeMembershipRepository } from '@repository/interface/committee-membership'
import { type EmploymentContractRepository } from '@repository/interface/employment-contract'
import { type LeaveRequestRepository } from '@repository/interface/leave-request'
import { type PositionAssignmentRepository } from '@repository/interface/position-assignment'
import { type PracticeScheduleRepository } from '@repository/interface/practice-schedule'
import { type PrivilegeGrantRepository } from '@repository/interface/privilege-grant'
import { type RosterAssignmentRepository } from '@repository/interface/roster-assignment'
import { type SeparationRepository } from '@repository/interface/separation'
import {
  REPOSITORY_CLINICAL_APPOINTMENT,
  REPOSITORY_COMMITTEE_MEMBERSHIP,
  REPOSITORY_EMPLOYMENT_CONTRACT,
  REPOSITORY_LEAVE_REQUEST,
  REPOSITORY_POSITION_ASSIGNMENT,
  REPOSITORY_PRACTICE_SCHEDULE,
  REPOSITORY_PRIVILEGE_GRANT,
  REPOSITORY_ROSTER_ASSIGNMENT,
  REPOSITORY_SEPARATION,
} from '@repository/token'
import { InvalidRequestError, NotFoundError } from '../workforce.error'

/**
 * Identifiers and the count of one kind of record a completion would close.
 *
 * @property count - How many.
 * @property ids - Their identifiers.
 */
export interface ImpactItems {
  count: number
  ids: string[]
}

/**
 * What the completion of a planned separation would close (HR plan 9 SP4): identifiers and counts,
 * never names or values.
 *
 * @property lastWorkingDay - The last day that is kept.
 * @property assignments - Planned roster assignments after it.
 * @property sessions - Practice schedules that run past it.
 * @property leaveRequests - Open leave requests that end after it.
 * @property appointments - Current SPKs.
 * @property grants - Active and suspended grants of those SPKs.
 * @property memberships - Active committee seats.
 * @property positionAssignments - Open position assignments.
 * @property contract - The contract in force, or `null`.
 */
export interface SeparationImpact {
  lastWorkingDay: string
  assignments: ImpactItems
  sessions: ImpactItems
  leaveRequests: ImpactItems
  appointments: ImpactItems
  grants: ImpactItems
  memberships: ImpactItems
  positionAssignments: ImpactItems
  contract: { id: string } | null
}

/**
 * Turns records into their count and identifiers.
 *
 * @param records - The records.
 * @returns The count and the identifiers.
 */
function items(records: { id: string }[]): ImpactItems {
  return { count: records.length, ids: records.map((record) => record.id) }
}

/**
 * Tells HR what completing a separation will close, so a Head can arrange cover first (HR spec
 * 9.10.4.1). It changes nothing and writes no log entry (a read).
 */
@Injectable()
export class SeparationImpactService {
  /**
   * @param separations - Separation repository.
   * @param rosterAssignments - Roster assignment repository.
   * @param schedules - Practice schedule repository.
   * @param leaveRequests - Leave request repository.
   * @param appointments - Clinical appointment (SPK) repository.
   * @param grants - Privilege grant repository.
   * @param memberships - Committee membership repository.
   * @param positionAssignments - Position assignment repository.
   * @param contracts - Employment contract repository.
   */
  constructor(
    @Inject(REPOSITORY_SEPARATION)
    private readonly separations: SeparationRepository,
    @Inject(REPOSITORY_ROSTER_ASSIGNMENT)
    private readonly rosterAssignments: RosterAssignmentRepository,
    @Inject(REPOSITORY_PRACTICE_SCHEDULE)
    private readonly schedules: PracticeScheduleRepository,
    @Inject(REPOSITORY_LEAVE_REQUEST)
    private readonly leaveRequests: LeaveRequestRepository,
    @Inject(REPOSITORY_CLINICAL_APPOINTMENT)
    private readonly appointments: ClinicalAppointmentRepository,
    @Inject(REPOSITORY_PRIVILEGE_GRANT)
    private readonly grants: PrivilegeGrantRepository,
    @Inject(REPOSITORY_COMMITTEE_MEMBERSHIP)
    private readonly memberships: CommitteeMembershipRepository,
    @Inject(REPOSITORY_POSITION_ASSIGNMENT)
    private readonly positionAssignments: PositionAssignmentRepository,
    @Inject(REPOSITORY_EMPLOYMENT_CONTRACT)
    private readonly contracts: EmploymentContractRepository,
  ) {}

  /**
   * Lists what completing a planned separation would close.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Separation identifier.
   * @returns The impact.
   * @throws NotFoundError `separation_not_found`.
   * @throws InvalidRequestError `separation_not_planned`.
   */
  async impact(tenantId: string, id: string): Promise<SeparationImpact> {
    const separation = await this.separations.findOne(id)
    if (
      !separation ||
      separation.tenant_id !== tenantId ||
      separation.deleted_at
    ) {
      throw new NotFoundError(
        'separation_not_found',
        'The separation was not found.',
      )
    }
    if (separation.status !== 'planned') {
      throw new InvalidRequestError(
        'separation_not_planned',
        'Only a planned separation has an impact.',
      )
    }
    const employeeId = separation.employee_id
    const day = separation.last_working_day
    const appointments = (
      await this.appointments.findByEmployee(tenantId, employeeId)
    ).filter((appointment) => appointment.is_current)
    const grants: string[] = []
    for (const appointment of appointments) {
      for (const grant of await this.grants.findByAppointment(
        tenantId,
        appointment.id,
      )) {
        if (grant.status === 'active' || grant.status === 'suspended') {
          grants.push(grant.id)
        }
      }
    }
    const contract = await this.contracts.findActiveByEmployee(
      tenantId,
      employeeId,
    )
    return {
      lastWorkingDay: day,
      assignments: items(
        await this.rosterAssignments.findPlannedByEmployeeAfter(
          tenantId,
          employeeId,
          day,
        ),
      ),
      sessions: items(
        await this.schedules.findByEmployeeRunningAfter(tenantId, employeeId, day),
      ),
      leaveRequests: items(
        await this.leaveRequests.findOpenByEmployeeEndingAfter(
          tenantId,
          employeeId,
          day,
        ),
      ),
      appointments: items(appointments),
      grants: { count: grants.length, ids: grants },
      memberships: items(
        await this.memberships.findActiveByEmployee(tenantId, employeeId),
      ),
      positionAssignments: items(
        await this.positionAssignments.findOpenByEmployee(tenantId, employeeId),
      ),
      contract: contract ? { id: contract.id } : null,
    }
  }
}
