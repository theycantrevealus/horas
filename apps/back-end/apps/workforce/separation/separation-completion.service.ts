import { Inject, Injectable } from '@nestjs/common'
import {
  RepositoryConflictError,
  RepositoryNotFoundError,
} from '@utility/database/error'
import {
  TRANSACTION_MANAGER,
  type TransactionManager,
} from '@utility/database/transaction'
import { EVENT_OUTBOX, type EventOutbox, newEvent } from '@utility/events/event'
import { type ActorRef } from '@utility/history/actor'
import { withChangeReason } from '@utility/history/reason'
import { getRequestContext } from '@utility/logger/context'
import { AppLogger } from '@utility/logger/service'
import { type ClinicalAppointmentRepository } from '@repository/interface/clinical-appointment'
import { type CommitteeMembershipRepository } from '@repository/interface/committee-membership'
import { type CredentialApplicationRepository } from '@repository/interface/credential-application'
import { type EmployeeRepository } from '@repository/interface/employee'
import { type EmploymentContractRepository } from '@repository/interface/employment-contract'
import { type LeaveLedgerRepository } from '@repository/interface/leave-ledger'
import { type LeaveRequestRepository } from '@repository/interface/leave-request'
import { type PositionAssignmentRepository } from '@repository/interface/position-assignment'
import { type PracticeScheduleRepository } from '@repository/interface/practice-schedule'
import { type PracticeScheduleExceptionRepository } from '@repository/interface/practice-schedule-exception'
import { type PrivilegeGrantRepository } from '@repository/interface/privilege-grant'
import { type RosterAssignmentRepository } from '@repository/interface/roster-assignment'
import { type RosterRepository } from '@repository/interface/roster'
import { type SeparationRepository } from '@repository/interface/separation'
import { type StatusDecision } from '@repository/model/common/decision'
import { type Employee } from '@repository/model/employee'
import { type EmploymentContract } from '@repository/model/employment-contract'
import {
  type Separation,
  type SeparationCompletion,
} from '@repository/model/separation'
import {
  type ContractEventPayload,
  type EmployeeStatusChangedPayload,
  type WorkforceEventType,
  WORKFORCE_EVENTS,
} from '@repository/model/workforce-event'
import {
  REPOSITORY_CLINICAL_APPOINTMENT,
  REPOSITORY_COMMITTEE_MEMBERSHIP,
  REPOSITORY_CREDENTIAL_APPLICATION,
  REPOSITORY_EMPLOYEE,
  REPOSITORY_EMPLOYMENT_CONTRACT,
  REPOSITORY_LEAVE_LEDGER,
  REPOSITORY_LEAVE_REQUEST,
  REPOSITORY_POSITION_ASSIGNMENT,
  REPOSITORY_PRACTICE_SCHEDULE,
  REPOSITORY_PRACTICE_SCHEDULE_EXCEPTION,
  REPOSITORY_PRIVILEGE_GRANT,
  REPOSITORY_ROSTER,
  REPOSITORY_ROSTER_ASSIGNMENT,
  REPOSITORY_SEPARATION,
} from '@repository/token'
import { addDays } from '../assignment/assignment-rules'
import { flagDependents } from '../appointment/supervisor-links'
import { LeaveBalanceService } from '../leave/leave-balance.service'
import { cutLeaveAfter, reverseDays, reverseUses } from '../leave/leave-posting'
import { observe } from '../observe'
import { cancelPlannedAssignments } from '../rostering/roster-cancellation'
import {
  ConflictError,
  ForbiddenError,
  InvalidRequestError,
  NotFoundError,
} from '../workforce.error'

const NAME = 'SeparationCompletionService'

/**
 * The reason every record closed by a separation carries in the change history and, where the
 * record has one, in its own reason field.
 */
const REASON = 'separation'

/**
 * Completes a separation (HR spec 9.10.4.3, HR plan 9 SP4): everything that still names the
 * employee after the last working day is closed in one transaction, the employee becomes
 * `separated`, and the settlement is computed. Either all of it happens or none of it, so a failure
 * is retried and never leaves an employee half separated (`HR-SEP-004`). The service makes no rule
 * check beyond the separation being planned: a separation is never refused because of a roster, a
 * leave or an SPK. The caller runs it inside a request context with an actor (the worker job or HR).
 */
@Injectable()
export class SeparationCompletionService {
  /**
   * @param separations - Separation repository.
   * @param employees - Employee repository.
   * @param rosters - Roster repository.
   * @param rosterAssignments - Roster assignment repository.
   * @param schedules - Practice schedule repository.
   * @param exceptions - Practice schedule exception repository.
   * @param leaveRequests - Leave request repository.
   * @param ledger - Leave ledger repository.
   * @param appointments - Clinical appointment (SPK) repository.
   * @param grants - Privilege grant repository.
   * @param applications - Credential application repository.
   * @param memberships - Committee membership repository.
   * @param positionAssignments - Position assignment repository.
   * @param contracts - Employment contract repository.
   * @param balances - Leave balances, for the settlement.
   * @param events - Event outbox, written in the same transaction as the data.
   * @param transactions - Transaction manager.
   * @param logger - Logger of this service.
   */
  constructor(
    @Inject(REPOSITORY_SEPARATION)
    private readonly separations: SeparationRepository,
    @Inject(REPOSITORY_EMPLOYEE) private readonly employees: EmployeeRepository,
    @Inject(REPOSITORY_ROSTER) private readonly rosters: RosterRepository,
    @Inject(REPOSITORY_ROSTER_ASSIGNMENT)
    private readonly rosterAssignments: RosterAssignmentRepository,
    @Inject(REPOSITORY_PRACTICE_SCHEDULE)
    private readonly schedules: PracticeScheduleRepository,
    @Inject(REPOSITORY_PRACTICE_SCHEDULE_EXCEPTION)
    private readonly exceptions: PracticeScheduleExceptionRepository,
    @Inject(REPOSITORY_LEAVE_REQUEST)
    private readonly leaveRequests: LeaveRequestRepository,
    @Inject(REPOSITORY_LEAVE_LEDGER)
    private readonly ledger: LeaveLedgerRepository,
    @Inject(REPOSITORY_CLINICAL_APPOINTMENT)
    private readonly appointments: ClinicalAppointmentRepository,
    @Inject(REPOSITORY_PRIVILEGE_GRANT)
    private readonly grants: PrivilegeGrantRepository,
    @Inject(REPOSITORY_CREDENTIAL_APPLICATION)
    private readonly applications: CredentialApplicationRepository,
    @Inject(REPOSITORY_COMMITTEE_MEMBERSHIP)
    private readonly memberships: CommitteeMembershipRepository,
    @Inject(REPOSITORY_POSITION_ASSIGNMENT)
    private readonly positionAssignments: PositionAssignmentRepository,
    @Inject(REPOSITORY_EMPLOYMENT_CONTRACT)
    private readonly contracts: EmploymentContractRepository,
    @Inject(LeaveBalanceService) private readonly balances: LeaveBalanceService,
    @Inject(EVENT_OUTBOX) private readonly events: EventOutbox,
    @Inject(TRANSACTION_MANAGER)
    private readonly transactions: TransactionManager,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /**
   * Completes a planned separation.
   *
   * @param tenantId - Tenant of the separation.
   * @param separationId - Separation identifier.
   * @returns The completed separation, with what was closed and the settlement.
   * @throws NotFoundError `separation_not_found` or `employee_not_found`.
   * @throws InvalidRequestError `separation_not_planned`.
   * @throws ForbiddenError `actor_required`.
   * @throws ConflictError `stale_version`.
   */
  complete(tenantId: string, separationId: string): Promise<Separation> {
    return observe(
      this.logger,
      'separation_complete',
      `${NAME}.complete`,
      async () => {
        const actor = this.actor()
        const separation = await this.load(tenantId, separationId)
        if (separation.status !== 'planned') {
          throw new InvalidRequestError(
            'separation_not_planned',
            'Only a planned separation can be completed.',
          )
        }
        const employee = await this.loadEmployee(tenantId, separation.employee_id)
        try {
          return await withChangeReason(REASON, () =>
            this.transactions.run(() =>
              this.closeEverything(separation, employee, actor),
            ),
          )
        } catch (error: unknown) {
          if (error instanceof RepositoryConflictError) {
            throw new ConflictError(
              'stale_version',
              'The separation was changed by someone else. Reload it and try again.',
            )
          }
          if (error instanceof RepositoryNotFoundError) {
            throw this.notFound()
          }
          throw error
        }
      },
      'log',
      (completed) => (completed.completion ? { ...completed.completion.counts } : {}),
    )
  }

  /**
   * Completes an immediate separation that is still planned, for example after the completion in the
   * request that recorded it failed (a dismissal or a death takes effect when it is recorded).
   *
   * @param tenantId - Tenant of the separation.
   * @param separationId - Separation identifier.
   * @returns The completed separation.
   * @throws NotFoundError `separation_not_found`.
   * @throws InvalidRequestError `separation_not_immediate` or `separation_not_planned`.
   */
  async completeImmediate(
    tenantId: string,
    separationId: string,
  ): Promise<Separation> {
    const separation = await this.load(tenantId, separationId)
    if (!separation.immediate) {
      throw new InvalidRequestError(
        'separation_not_immediate',
        'Only an immediate separation is completed by hand; the others complete the day after the last working day.',
      )
    }
    return this.complete(tenantId, separationId)
  }

  /**
   * Closes everything that names the employee after the last working day, then the employee and the
   * separation. Runs inside the transaction of `complete`; every repository call is sequential.
   *
   * @param separation - The planned separation.
   * @param employee - The employee who is leaving.
   * @param actor - Who completes it.
   * @returns The completed separation.
   */
  private async closeEverything(
    separation: Separation,
    employee: Employee,
    actor: ActorRef,
  ): Promise<Separation> {
    const tenantId = separation.tenant_id
    const day = separation.last_working_day
    const now = new Date()
    const counts: SeparationCompletion['counts'] = {
      assignments: 0,
      sessions: 0,
      leave_requests: 0,
      appointments: 0,
      memberships: 0,
      position_assignments: 0,
    }
    counts.leave_requests = await this.closeLeave(employee.id, tenantId, day, now)
    // The settlement is read while the contract is still in force and after the leave is closed.
    const settlement = await this.settle(tenantId, employee.id, day)
    counts.assignments = await this.cancelShifts(separation, employee.id)
    counts.sessions = await this.endSessions(tenantId, employee.id, day)
    counts.appointments = await this.revokeAppointments(
      tenantId,
      employee.id,
      addDays(day, 1),
    )
    await this.withdrawApplications(tenantId, employee.id, now)
    counts.memberships = await this.endMemberships(tenantId, employee.id, day)
    counts.position_assignments = await this.endPositions(
      tenantId,
      employee.id,
      day,
    )
    await this.closeContract(separation, employee)
    await this.separate(separation, employee, day)
    return this.separations.update(
      separation.id,
      {
        status: 'completed',
        status_since: now,
        completion: { at: now, by: actor, counts },
        settlement: { leave: settlement, notes: null },
      },
      { expectedVersion: separation.version },
    )
  }

  /**
   * Cancels the open leave requests that end after the last working day, and ends the approved
   * ones that run past it on that day, giving the days back (HR spec 9.10.4.3 step 3).
   *
   * @param employeeId - The employee.
   * @param tenantId - Tenant of the separation.
   * @param day - The last working day.
   * @param now - The time of completion.
   * @returns How many requests were cancelled or ended.
   */
  private async closeLeave(
    employeeId: string,
    tenantId: string,
    day: string,
    now: Date,
  ): Promise<number> {
    const open = await this.leaveRequests.findOpenByEmployeeEndingAfter(
      tenantId,
      employeeId,
      day,
    )
    for (const request of open) {
      if (request.status !== 'approved' || request.period.start > day) {
        await this.leaveRequests.update(request.id, {
          status: 'cancelled',
          status_since: now,
        })
        if (request.status === 'approved') {
          await reverseUses(this.ledger, tenantId, request)
        }
        continue
      }
      const { days, total, removed } = cutLeaveAfter(request, day)
      const updated = await this.leaveRequests.update(request.id, {
        period: { start: request.period.start, end: day },
        half_days: { first: request.half_days.first, last: false },
        days,
        total_days: total,
      })
      await reverseDays(this.ledger, tenantId, updated, removed)
    }
    return open.length
  }

  /**
   * Finds the days left of each yearly leave type on the last working day, negative when more was
   * taken than earned (HR spec 9.10.2). No amounts: pay is HR spec 9.7.
   *
   * @param tenantId - Tenant of the separation.
   * @param employeeId - The employee.
   * @param day - The last working day.
   * @returns One item per yearly leave type with a balance.
   */
  private async settle(
    tenantId: string,
    employeeId: string,
    day: string,
  ): Promise<NonNullable<Separation['settlement']>['leave']> {
    const views = await this.balances.balances(tenantId, employeeId, day)
    return views.map((view) => ({
      leave_type: {
        system: view.leaveType.system,
        code: view.leaveType.code,
      },
      period: { start: view.period.start, end: view.period.end },
      days_left: view.available,
    }))
  }

  /**
   * Cancels the planned roster assignments after the last working day (step 1).
   *
   * @param separation - The separation.
   * @param employeeId - The employee.
   * @returns How many assignments were cancelled.
   */
  private async cancelShifts(
    separation: Separation,
    employeeId: string,
  ): Promise<number> {
    const planned = await this.rosterAssignments.findPlannedByEmployeeAfter(
      separation.tenant_id,
      employeeId,
      separation.last_working_day,
    )
    const cancelled = await cancelPlannedAssignments(
      this.rosters,
      separation.tenant_id,
      planned,
      (items) =>
        this.rosterAssignments.cancelForSeparation(
          separation.tenant_id,
          items,
          separation.id,
        ),
    )
    return cancelled.length
  }

  /**
   * Ends the practice schedules that run past the last working day on that day, and undoes the
   * exceptions that move a session onto a later date (step 2).
   *
   * @param tenantId - Tenant of the separation.
   * @param employeeId - The doctor.
   * @param day - The last working day.
   * @returns How many schedules were ended.
   */
  private async endSessions(
    tenantId: string,
    employeeId: string,
    day: string,
  ): Promise<number> {
    const running = await this.schedules.findByEmployeeRunningAfter(
      tenantId,
      employeeId,
      day,
    )
    for (const schedule of running) {
      await this.schedules.update(schedule.id, {
        period: {
          start: schedule.period.start,
          end: schedule.period.start > day ? schedule.period.start : day,
        },
        status: 'ended',
      })
    }
    for (const moved of await this.exceptions.findMovedAfterByEmployee(
      tenantId,
      employeeId,
      day,
    )) {
      await this.exceptions.deleteSoft(moved.id)
    }
    return running.length
  }

  /**
   * Revokes the current SPKs and their grants from the day after the last working day, and flags
   * the supervised grants that named their full grants (step 4).
   *
   * @param tenantId - Tenant of the separation.
   * @param employeeId - The practitioner.
   * @param effective - The day after the last working day.
   * @returns How many SPKs were revoked.
   */
  private async revokeAppointments(
    tenantId: string,
    employeeId: string,
    effective: string,
  ): Promise<number> {
    const decision: StatusDecision = {
      effective_date: effective,
      reason: REASON,
      decision_ref: null,
    }
    const current = (
      await this.appointments.findByEmployee(tenantId, employeeId)
    ).filter(
      (appointment) =>
        appointment.is_current &&
        (appointment.status === 'active' || appointment.status === 'suspended'),
    )
    const now = new Date()
    for (const appointment of current) {
      await this.appointments.update(appointment.id, {
        status: 'revoked',
        is_current: false,
        revocation: decision,
      })
      const lost: string[] = []
      for (const grant of await this.grants.findByAppointment(
        tenantId,
        appointment.id,
      )) {
        if (grant.status === 'revoked') {
          continue
        }
        await this.grants.update(grant.id, {
          status: 'revoked',
          status_change: decision,
        })
        if (grant.condition === 'full') {
          lost.push(grant.id)
        }
      }
      await flagDependents(this.grants, tenantId, lost, now)
    }
    return current.length
  }

  /**
   * Withdraws the open credential applications (step 4).
   *
   * @param tenantId - Tenant of the separation.
   * @param employeeId - The applicant.
   * @param now - The time of completion.
   */
  private async withdrawApplications(
    tenantId: string,
    employeeId: string,
    now: Date,
  ): Promise<void> {
    for (const application of await this.applications.findOpenByEmployee(
      tenantId,
      employeeId,
    )) {
      await this.applications.update(application.id, {
        status: 'withdrawn',
        status_since: now,
        withdrawal_reason: REASON,
      })
    }
  }

  /**
   * Ends the active committee seats on the last working day (step 5).
   *
   * @param tenantId - Tenant of the separation.
   * @param employeeId - The member.
   * @param day - The last working day.
   * @returns How many seats were ended.
   */
  private async endMemberships(
    tenantId: string,
    employeeId: string,
    day: string,
  ): Promise<number> {
    const seats = await this.memberships.findActiveByEmployee(tenantId, employeeId)
    for (const seat of seats) {
      await this.memberships.update(seat.id, {
        status: 'ended',
        period: {
          start: seat.period.start,
          end: seat.period.start > day ? seat.period.start : day,
        },
      })
    }
    return seats.length
  }

  /**
   * Ends the open position assignments on the last working day (step 5).
   *
   * @param tenantId - Tenant of the separation.
   * @param employeeId - The employee.
   * @param day - The last working day.
   * @returns How many assignments were ended.
   */
  private async endPositions(
    tenantId: string,
    employeeId: string,
    day: string,
  ): Promise<number> {
    const open = await this.positionAssignments.findOpenByEmployee(
      tenantId,
      employeeId,
    )
    for (const assignment of open) {
      await this.positionAssignments.update(assignment.id, {
        status: 'ended',
        is_open: false,
        period: {
          start: assignment.period.start,
          end: assignment.period.start > day ? assignment.period.start : day,
        },
      })
    }
    return open.length
  }

  /**
   * Ends or terminates the contract in force on the last working day, by the action the separation
   * type implies, and writes the contract event (step 6).
   *
   * @param separation - The separation.
   * @param employee - The employee.
   */
  private async closeContract(
    separation: Separation,
    employee: Employee,
  ): Promise<void> {
    const contract = await this.contracts.findActiveByEmployee(
      separation.tenant_id,
      employee.id,
    )
    if (!contract) {
      return
    }
    const day = separation.last_working_day
    const closed =
      separation.contract_action === 'terminate'
        ? await this.contracts.update(contract.id, {
            status: 'terminated',
            termination: {
              date: day < contract.period.start ? contract.period.start : day,
              reason: {
                system: separation.type.system,
                code: separation.type.code,
              },
              notes: null,
            },
          })
        : await this.contracts.update(contract.id, {
            status: 'ended',
            period: {
              start: contract.period.start,
              end:
                contract.period.end !== null && contract.period.end <= day
                  ? contract.period.end
                  : day < contract.period.start
                    ? contract.period.start
                    : day,
            },
          })
    await this.announceContract(
      separation.contract_action === 'terminate'
        ? WORKFORCE_EVENTS.CONTRACT_TERMINATED
        : WORKFORCE_EVENTS.CONTRACT_ENDED,
      closed,
    )
  }

  /**
   * Sets the employee `separated` on the last working day, clears the summaries that point to the
   * contract and the primary assignment, and writes the status event that identity reacts to.
   *
   * @param separation - The separation.
   * @param employee - The employee as read.
   * @param day - The last working day.
   */
  private async separate(
    separation: Separation,
    employee: Employee,
    day: string,
  ): Promise<void> {
    const updated = await this.employees.update(employee.id, {
      employment_status: 'separated',
      employment_status_since: day,
      separation_date: day,
      current_employment: null,
      primary_assignment: null,
    })
    const payload: EmployeeStatusChangedPayload = {
      employee_id: updated.id,
      from_status: employee.employment_status,
      to_status: 'separated',
      effective_date: day,
    }
    await this.events.append(
      newEvent({
        tenantId: separation.tenant_id,
        type: WORKFORCE_EVENTS.EMPLOYEE_STATUS_CHANGED,
        aggregate: {
          type: 'employee',
          id: updated.id,
          version: updated.version,
        },
        payload: { ...payload },
      }),
    )
  }

  /**
   * Writes a contract event into the outbox, inside the transaction of the completion.
   *
   * @param type - Event name.
   * @param contract - The contract after the change.
   */
  private async announceContract(
    type: WorkforceEventType,
    contract: EmploymentContract,
  ): Promise<void> {
    const payload: ContractEventPayload = {
      contract_id: contract.id,
      employee_id: contract.employee_id,
      organization_id: contract.organization_id,
    }
    await this.events.append(
      newEvent({
        tenantId: contract.tenant_id,
        type,
        aggregate: {
          type: 'employment_contract',
          id: contract.id,
          version: contract.version,
        },
        payload: { ...payload },
      }),
    )
  }

  /**
   * Loads a separation of the caller's tenant.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Separation identifier.
   * @returns The separation.
   * @throws NotFoundError `separation_not_found`.
   */
  private async load(tenantId: string, id: string): Promise<Separation> {
    const separation = await this.separations.findOne(id)
    if (!separation || separation.tenant_id !== tenantId || separation.deleted_at) {
      throw this.notFound()
    }
    return separation
  }

  /**
   * Loads the employee of a separation.
   *
   * @param tenantId - Tenant of the separation.
   * @param employeeId - The employee.
   * @returns The employee.
   * @throws NotFoundError `employee_not_found`.
   */
  private async loadEmployee(
    tenantId: string,
    employeeId: string,
  ): Promise<Employee> {
    const employee = await this.employees.findOne(employeeId)
    if (!employee || employee.tenant_id !== tenantId || employee.deleted_at) {
      throw new NotFoundError('employee_not_found', 'The employee was not found.')
    }
    return employee
  }

  /**
   * @returns The signed-in actor, or the system actor of the job.
   * @throws ForbiddenError `actor_required`.
   */
  private actor(): ActorRef {
    const actor = getRequestContext()?.actor
    if (!actor) {
      throw new ForbiddenError('actor_required', 'An acting account is required.')
    }
    return actor
  }

  /**
   * @returns The error for a missing, malformed or foreign separation.
   */
  private notFound(): NotFoundError {
    return new NotFoundError(
      'separation_not_found',
      'The separation was not found.',
    )
  }
}
