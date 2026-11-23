import { Inject, Injectable } from '@nestjs/common'
import {
  RepositoryConflictError,
  RepositoryNotFoundError,
} from '@utility/database/error'
import {
  TRANSACTION_MANAGER,
  type TransactionManager,
} from '@utility/database/transaction'
import { type ActorRef } from '@utility/history/actor'
import { withChangeReason } from '@utility/history/reason'
import { getRequestContext } from '@utility/logger/context'
import { AppLogger } from '@utility/logger/service'
import { type EmployeeRepository } from '@repository/interface/employee'
import { type LeaveRequestRepository } from '@repository/interface/leave-request'
import { type OrganizationUnitRepository } from '@repository/interface/organization-unit'
import { type PracticeScheduleExceptionRepository } from '@repository/interface/practice-schedule-exception'
import { type RosterAssignmentRepository } from '@repository/interface/roster-assignment'
import { type RosterRepository } from '@repository/interface/roster'
import { type Employee } from '@repository/model/employee'
import { type LeaveRequest } from '@repository/model/leave-request'
import { type Roster } from '@repository/model/roster'
import {
  type RosterAssignment,
  type RosterRole,
} from '@repository/model/roster-assignment'
import {
  REPOSITORY_EMPLOYEE,
  REPOSITORY_LEAVE_REQUEST,
  REPOSITORY_ORGANIZATION_UNIT,
  REPOSITORY_PRACTICE_SCHEDULE_EXCEPTION,
  REPOSITORY_ROSTER,
  REPOSITORY_ROSTER_ASSIGNMENT,
} from '@repository/token'
import { addDays } from '../assignment/assignment-rules'
import { EligibilityService } from '../eligibility/eligibility.service'
import { observe } from '../observe'
import { ParameterService } from '../parameter/parameter.service'
import {
  assertAssignable,
  assertEligible,
  assertRole,
  firstWorkingTimeViolation,
  toWorkingShift,
} from '../rostering/assignment-checks'
import { readWorkingTimeLimits } from '../rostering/working-time-limits'
import {
  ConflictError,
  ForbiddenError,
  InvalidRequestError,
  WorkforceError,
} from '../workforce.error'
import { LeaveDeciderService } from './decider'
import { decidesFirstStep, leaveRequestNotFound } from './leave-access'
import { LeaveCalendar } from './leave-calendar'
import { type LeaveCaller } from './leave-caller'
import { LeavePlaceService } from './leave-place'

const NAME = 'LeaveCoverService'

/**
 * Most items one confirmation may carry.
 */
const MAX_ITEMS = 200

/**
 * One shift an approved leave cancelled, checked as a shift of the replacement.
 *
 * @property assignmentId - The cancelled assignment.
 * @property rosterId - Its roster.
 * @property date - Its date.
 * @property shiftCode - Its shift code.
 * @property role - Its role.
 * @property status - `available`, `past`, `roster_locked`, `roster_closed`, `no_replacement`, or the
 * code of the first rule the replacement would break.
 */
export interface CoverItem {
  assignmentId: string
  rosterId: string
  date: string
  shiftCode: string
  role: RosterRole
  status: string
}

/**
 * A session of the requester that was moved onto a leave day by hand, which the Head must settle.
 *
 * @property scheduleId - The practice schedule.
 * @property date - The leave day it was moved onto.
 * @property startTime - Its start.
 * @property endTime - Its end.
 */
export interface MovedInSession {
  scheduleId: string
  date: string
  startTime: string
  endTime: string
}

/**
 * The cover the Head can confirm.
 *
 * @property items - The cancelled shifts and whether the replacement can take each.
 * @property movedInSessions - Sessions moved onto a leave day by hand; nothing cancels them.
 * @property confirmed - Whether the cover was already confirmed.
 */
export interface LeaveCoverProposal {
  items: CoverItem[]
  movedInSessions: MovedInSession[]
  confirmed: boolean
}

/**
 * The Head's choice of shifts to cover.
 *
 * @property items - The cancelled assignments to give to the replacement, with an optional new role.
 * @property version - Version of the request the caller read.
 */
export interface ConfirmCoverInput {
  items: { assignmentId: string; role?: RosterRole }[]
  version?: number
}

/**
 * What a confirmation did.
 *
 * @property created - The assignments created for the replacement.
 * @property refused - The items that failed the checks, with the code.
 */
export interface ConfirmCoverResult {
  created: string[]
  refused: { assignmentId: string; code: string }[]
}

/**
 * The cover of an approved leave by the replacement the Head named (HR plan 8.4 LK3, LK4). The
 * proposal checks each cancelled shift as an assignment of the replacement added by hand; the
 * confirmation creates the ones that pass, once, in one transaction. A refused shift is reported and
 * never blocks the others. Only the first-step decider may; the leave type is never written to a
 * roster.
 */
@Injectable()
export class LeaveCoverService {
  /**
   * @param requests - Leave request repository.
   * @param rosterAssignments - Roster assignment repository.
   * @param rosters - Roster repository.
   * @param units - Organization unit repository.
   * @param employees - Employee repository.
   * @param exceptions - Practice schedule exception repository, for sessions moved onto a leave day.
   * @param eligibility - Eligibility service.
   * @param parameters - HR parameters, for the working-time limits.
   * @param leave - Tells whether the replacement is on leave.
   * @param decider - Finds who decides the first step.
   * @param place - Finds the requester's today.
   * @param transactions - Transaction manager.
   * @param logger - Logger of this service.
   */
  constructor(
    @Inject(REPOSITORY_LEAVE_REQUEST)
    private readonly requests: LeaveRequestRepository,
    @Inject(REPOSITORY_ROSTER_ASSIGNMENT)
    private readonly rosterAssignments: RosterAssignmentRepository,
    @Inject(REPOSITORY_ROSTER) private readonly rosters: RosterRepository,
    @Inject(REPOSITORY_ORGANIZATION_UNIT)
    private readonly units: OrganizationUnitRepository,
    @Inject(REPOSITORY_EMPLOYEE) private readonly employees: EmployeeRepository,
    @Inject(REPOSITORY_PRACTICE_SCHEDULE_EXCEPTION)
    private readonly exceptions: PracticeScheduleExceptionRepository,
    @Inject(EligibilityService)
    private readonly eligibility: EligibilityService,
    @Inject(ParameterService) private readonly parameters: ParameterService,
    @Inject(LeaveCalendar) private readonly leave: LeaveCalendar,
    @Inject(LeaveDeciderService) private readonly decider: LeaveDeciderService,
    @Inject(LeavePlaceService) private readonly place: LeavePlaceService,
    @Inject(TRANSACTION_MANAGER)
    private readonly transactions: TransactionManager,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /**
   * Checks the cancelled shifts of an approved leave against the replacement now. The first-step
   * decider and a holder of `workforce.leave-request:read` may ask. Writes no log entry (a read).
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Request identifier.
   * @param caller - The caller.
   * @returns The proposal.
   * @throws NotFoundError `leave_request_not_found`.
   * @throws InvalidRequestError `invalid_transition` for a request that is not approved.
   */
  async proposal(
    tenantId: string,
    id: string,
    caller: LeaveCaller,
  ): Promise<LeaveCoverProposal> {
    const request = await this.load(tenantId, id)
    if (
      !(
        caller.canRead ||
        (await decidesFirstStep(this.decider, tenantId, caller, request))
      )
    ) {
      throw leaveRequestNotFound()
    }
    this.assertApproved(request)
    const { today } = await this.place.of(tenantId, request.employee_id)
    const replacement = await this.replacementOf(tenantId, request)
    const items: CoverItem[] = []
    for (const assignment of await this.cancelledOf(request)) {
      items.push({
        assignmentId: assignment.id,
        rosterId: assignment.roster_id,
        date: assignment.date,
        shiftCode: assignment.shift.code,
        role: assignment.role,
        status: await this.statusOf(tenantId, assignment, replacement, today),
      })
    }
    return {
      items,
      movedInSessions: await this.movedIn(request),
      confirmed: request.cover?.confirmed != null,
    }
  }

  /**
   * Gives the chosen cancelled shifts to the replacement (HR plan 8.4 LK4). Each item is checked
   * again inside the transaction; the ones that pass become assignments of the replacement with the
   * cancelled shift's snapshot, the source `leave_cover` and the given role or the old one; a
   * published roster takes one new revision. A refused item is reported, not created. Once per
   * request.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Request identifier.
   * @param input - The items and the version read.
   * @param caller - The caller.
   * @returns The created assignments and the refused items.
   * @throws NotFoundError `leave_request_not_found`.
   * @throws ForbiddenError `not_the_decider` or `actor_required`.
   * @throws InvalidRequestError `invalid_transition`, `no_replacement`, `invalid_items`,
   * `duplicate_item`, `not_in_cover` or `invalid_role`.
   * @throws ConflictError `cover_confirmed` or `stale_version`.
   */
  confirm(
    tenantId: string,
    id: string,
    input: ConfirmCoverInput,
    caller: LeaveCaller,
  ): Promise<ConfirmCoverResult> {
    return observe(
      this.logger,
      'leave_cover_confirm',
      `${NAME}.confirm`,
      async () => {
        const request = await this.load(tenantId, id)
        if (!(await decidesFirstStep(this.decider, tenantId, caller, request))) {
          throw new ForbiddenError(
            'not_the_decider',
            'You do not decide this leave.',
          )
        }
        this.assertApproved(request)
        if (request.cover?.confirmed != null) {
          throw new ConflictError(
            'cover_confirmed',
            'The cover of this leave was already confirmed.',
          )
        }
        if (input.version !== undefined && input.version !== request.version) {
          throw this.stale()
        }
        const replacement = await this.replacementOf(tenantId, request)
        if (!replacement) {
          throw new InvalidRequestError(
            'no_replacement',
            'The leave has no replacement to cover the shifts.',
          )
        }
        const chosen = await this.pickItems(request, input.items)
        const actor = this.actor()
        const { today } = await this.place.of(tenantId, request.employee_id)
        try {
          return await withChangeReason('leave_cover', () =>
            this.transactions.run(async () => {
              const result: ConfirmCoverResult = { created: [], refused: [] }
              const raised = new Map<string, number>()
              for (const { assignment, role } of chosen) {
                const status = await this.statusOf(
                  tenantId,
                  assignment,
                  replacement,
                  today,
                )
                if (status !== 'available') {
                  result.refused.push({ assignmentId: assignment.id, code: status })
                  continue
                }
                const revision = await this.revisionFor(assignment, raised)
                const created = await this.rosterAssignments.create({
                  tenant_id: tenantId,
                  roster_id: assignment.roster_id,
                  unit_id: assignment.unit_id,
                  facility_id: assignment.facility_id,
                  employee_id: replacement.id,
                  date: assignment.date,
                  shift: assignment.shift,
                  starts_at: assignment.starts_at,
                  ends_at: assignment.ends_at,
                  role: role ?? assignment.role,
                  status: 'planned',
                  source: { kind: 'leave_cover', ref_id: request.id },
                  cancellation: null,
                  change_reason: raised.has(assignment.roster_id)
                    ? 'leave_cover'
                    : null,
                  revision,
                  overtime: null,
                  flag: null,
                  is_flagged: false,
                })
                result.created.push(created.id)
              }
              await this.requests.update(
                request.id,
                {
                  cover: {
                    cancelled_assignment_ids:
                      request.cover?.cancelled_assignment_ids ?? [],
                    confirmed: this.confirmation(actor, result.created),
                  },
                },
                { expectedVersion: request.version },
              )
              return result
            }),
          )
        } catch (error: unknown) {
          if (error instanceof RepositoryConflictError) {
            throw this.stale()
          }
          if (error instanceof RepositoryNotFoundError) {
            throw leaveRequestNotFound()
          }
          throw error
        }
      },
      'log',
      (result) => ({
        created: result.created.length,
        refused: result.refused.length,
      }),
    )
  }

  /**
   * Checks one cancelled shift as an assignment of the replacement added by hand (HR plan 8.4 LK3).
   *
   * @param tenantId - Tenant of the caller.
   * @param assignment - The cancelled assignment.
   * @param replacement - The replacement, or `null` when the Head named none.
   * @param today - Today in the requester's zone.
   * @returns `available`, or the reason it cannot be given.
   */
  private async statusOf(
    tenantId: string,
    assignment: RosterAssignment,
    replacement: Employee | null,
    today: string,
  ): Promise<string> {
    if (assignment.date < today) {
      return 'past'
    }
    const roster = await this.rosters.findOne(assignment.roster_id)
    if (!roster || roster.tenant_id !== tenantId || roster.status === 'closed') {
      return 'roster_closed'
    }
    if (roster.status !== 'draft' && roster.status !== 'published') {
      return 'roster_locked'
    }
    if (!replacement) {
      return 'no_replacement'
    }
    try {
      await this.assertReplaceable(tenantId, roster, assignment, replacement)
      return 'available'
    } catch (error: unknown) {
      if (error instanceof WorkforceError) {
        return error.code
      }
      throw error
    }
  }

  /**
   * Applies the rules of an assignment added by hand to the replacement (HR plan 8.4 LK3): status,
   * leave, general clinical eligibility, one shift a day in the roster and the working-time rules,
   * without overtime.
   *
   * @param tenantId - Tenant of the caller.
   * @param roster - The roster of the cancelled assignment.
   * @param assignment - The cancelled assignment.
   * @param replacement - The replacement.
   * @throws InvalidRequestError the rule that is broken.
   * @throws ConflictError `assignment_exists`.
   */
  private async assertReplaceable(
    tenantId: string,
    roster: Roster,
    assignment: RosterAssignment,
    replacement: Employee,
  ): Promise<void> {
    assertAssignable(replacement)
    if (await this.leave.isOnLeave(tenantId, replacement.id, assignment.date)) {
      throw new InvalidRequestError(
        'on_leave',
        'The replacement is on approved leave on that date.',
      )
    }
    const unit = await this.units.findOne(assignment.unit_id)
    if (!unit || unit.tenant_id !== tenantId) {
      throw new InvalidRequestError('unit_not_found', 'The unit was not found.')
    }
    await assertEligible(
      this.eligibility,
      tenantId,
      replacement,
      unit,
      assignment.date,
    )
    if (
      await this.rosterAssignments.findPlannedByEmployeeAndDate(
        tenantId,
        roster.id,
        replacement.id,
        assignment.date,
      )
    ) {
      throw new ConflictError(
        'assignment_exists',
        'The replacement already has a shift on this date in this roster.',
      )
    }
    const limits = await readWorkingTimeLimits(
      this.parameters,
      tenantId,
      unit.id,
    )
    const others = (
      await this.rosterAssignments.findPlannedByEmployeeBetween(
        tenantId,
        replacement.id,
        addDays(assignment.date, -8),
        addDays(assignment.date, 8),
      )
    ).map((other) => toWorkingShift(other))
    firstWorkingTimeViolation(toWorkingShift(assignment), others, limits, false)
  }

  /**
   * Raises the revision of a published roster once for the confirmation, and tells which revision a
   * created assignment carries.
   *
   * @param assignment - The cancelled assignment whose roster is meant.
   * @param raised - The rosters already raised in this confirmation, with their new revision.
   * @returns The revision the new assignment carries.
   */
  private async revisionFor(
    assignment: RosterAssignment,
    raised: Map<string, number>,
  ): Promise<number> {
    const known = raised.get(assignment.roster_id)
    if (known !== undefined) {
      return known
    }
    const roster = await this.rosters.findOne(assignment.roster_id)
    if (!roster) {
      throw leaveRequestNotFound()
    }
    if (roster.status !== 'published') {
      return roster.revision
    }
    const revision = roster.revision + 1
    await this.rosters.update(
      roster.id,
      { revision },
      { expectedVersion: roster.version },
    )
    raised.set(roster.id, revision)
    return revision
  }

  /**
   * Finds the cancelled assignments the confirmation names, and checks that they are the request's
   * own.
   *
   * @param request - The request.
   * @param items - What the caller sent.
   * @returns The assignments and the role asked for each.
   * @throws InvalidRequestError `invalid_items`, `duplicate_item`, `not_in_cover` or `invalid_role`.
   */
  private async pickItems(
    request: LeaveRequest,
    items: ConfirmCoverInput['items'],
  ): Promise<{ assignment: RosterAssignment; role: RosterRole | undefined }[]> {
    if (!Array.isArray(items) || items.length === 0 || items.length > MAX_ITEMS) {
      throw new InvalidRequestError(
        'invalid_items',
        'Send between 1 and 200 shifts to cover.',
      )
    }
    const own = new Map(
      (await this.cancelledOf(request)).map((assignment) => [assignment.id, assignment]),
    )
    const seen = new Set<string>()
    return items.map((item) => {
      if (seen.has(item.assignmentId)) {
        throw new InvalidRequestError(
          'duplicate_item',
          'A shift was sent more than once.',
        )
      }
      seen.add(item.assignmentId)
      const assignment = own.get(item.assignmentId)
      if (!assignment) {
        throw new InvalidRequestError(
          'not_in_cover',
          'A shift is not one the leave cancelled.',
        )
      }
      if (item.role !== undefined) {
        assertRole(item.role)
      }
      return { assignment, role: item.role }
    })
  }

  /**
   * Loads the assignments the approval cancelled.
   *
   * @param request - The request.
   * @returns The assignments, by date.
   */
  private async cancelledOf(request: LeaveRequest): Promise<RosterAssignment[]> {
    const found: RosterAssignment[] = []
    for (const id of request.cover?.cancelled_assignment_ids ?? []) {
      const assignment = await this.rosterAssignments.findOne(id)
      if (assignment && assignment.tenant_id === request.tenant_id) {
        found.push(assignment)
      }
    }
    return found.sort((left, right) => left.date.localeCompare(right.date))
  }

  /**
   * Lists the sessions of the requester moved onto a leave day by hand.
   *
   * @param request - The request.
   * @returns The sessions.
   */
  private async movedIn(request: LeaveRequest): Promise<MovedInSession[]> {
    const found: MovedInSession[] = []
    for (const day of request.days.filter((item) => item.count === 1)) {
      const touching = await this.exceptions.findByEmployeeAndDate(
        request.tenant_id,
        request.employee_id,
        day.date,
      )
      for (const exception of touching) {
        if (
          exception.kind === 'moved' &&
          exception.moved_to?.date === day.date &&
          exception.source.kind === 'manual'
        ) {
          found.push({
            scheduleId: exception.schedule_id,
            date: day.date,
            startTime: exception.moved_to.start_time,
            endTime: exception.moved_to.end_time,
          })
        }
      }
    }
    return found
  }

  /**
   * Loads the replacement the Head named at the first step.
   *
   * @param tenantId - Tenant of the caller.
   * @param request - The request.
   * @returns The employee, or `null` when none was named or the record is gone.
   */
  private async replacementOf(
    tenantId: string,
    request: LeaveRequest,
  ): Promise<Employee | null> {
    const id = request.replacement?.employee_id
    if (!id) {
      return null
    }
    const employee = await this.employees.findOne(id)
    return employee && employee.tenant_id === tenantId && !employee.deleted_at
      ? employee
      : null
  }

  /**
   * Builds the confirmation stored on the request.
   *
   * @param actor - Who confirmed.
   * @param created - The assignments created.
   * @returns The confirmation.
   */
  private confirmation(
    actor: ActorRef,
    created: string[],
  ): NonNullable<NonNullable<LeaveRequest['cover']>['confirmed']> {
    return { by: actor, at: new Date(), created_assignment_ids: created }
  }

  /**
   * Checks that the request is approved.
   *
   * @param request - The request.
   * @throws InvalidRequestError `invalid_transition`.
   */
  private assertApproved(request: LeaveRequest): void {
    if (request.status !== 'approved') {
      throw new InvalidRequestError(
        'invalid_transition',
        'Only an approved leave has a cover.',
      )
    }
  }

  /**
   * Loads a request of the caller's tenant.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Request identifier.
   * @returns The request.
   * @throws NotFoundError `leave_request_not_found`.
   */
  private async load(tenantId: string, id: string): Promise<LeaveRequest> {
    const request = await this.requests.findOne(id)
    if (!request || request.tenant_id !== tenantId || request.deleted_at) {
      throw leaveRequestNotFound()
    }
    return request
  }

  /**
   * @returns The signed-in actor.
   * @throws ForbiddenError `actor_required`.
   */
  private actor(): ActorRef {
    const actor = getRequestContext()?.actor
    if (!actor) {
      throw new ForbiddenError('actor_required', 'A signed-in actor is required.')
    }
    return actor
  }

  /**
   * @returns The error for a request changed by someone else.
   */
  private stale(): ConflictError {
    return new ConflictError(
      'stale_version',
      'The request was changed by someone else. Reload it and try again.',
    )
  }
}
