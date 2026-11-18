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
import { todayInZone } from '@utility/validation/local-date'
import { type EmployeeRepository } from '@repository/interface/employee'
import { type FacilityRepository } from '@repository/interface/facility'
import { type OrganizationUnitRepository } from '@repository/interface/organization-unit'
import { type RosterRepository } from '@repository/interface/roster'
import { type RosterAssignmentRepository } from '@repository/interface/roster-assignment'
import {
  type ShiftSwapRequestRepository,
  type SwapQuery,
} from '@repository/interface/shift-swap-request'
import { type Employee } from '@repository/model/employee'
import { type OrganizationUnit } from '@repository/model/organization-unit'
import { type Roster } from '@repository/model/roster'
import { type RosterAssignment } from '@repository/model/roster-assignment'
import {
  type ShiftSwapRequest,
  type SwapStatus,
} from '@repository/model/shift-swap-request'
import {
  REPOSITORY_EMPLOYEE,
  REPOSITORY_FACILITY,
  REPOSITORY_ORGANIZATION_UNIT,
  REPOSITORY_ROSTER,
  REPOSITORY_ROSTER_ASSIGNMENT,
  REPOSITORY_SHIFT_SWAP_REQUEST,
} from '@repository/token'
import { cleanReason } from '../credentialing/application-support'
import { addDays } from '../credentialing/appointment-rules'
import { EligibilityService } from '../eligibility/eligibility.service'
import { observe } from '../observe'
import { ParameterService } from '../parameter/parameter.service'
import {
  ConflictError,
  ForbiddenError,
  InvalidRequestError,
  NotFoundError,
} from '../workforce.error'
import {
  assertAssignable,
  assertEligible,
  firstWorkingTimeViolation,
  toWorkingShift,
} from './assignment-checks'
import { readWorkingTimeLimits } from './working-time-limits'

const NAME = 'SwapService'

/**
 * The statuses in which a request is still open.
 */
const OPEN: readonly SwapStatus[] = ['requested', 'accepted_by_counterpart']

/**
 * Data of a new swap request.
 *
 * @property assignmentId - The requester's assignment.
 * @property counterpartEmployeeId - Who takes over.
 * @property counterpartAssignmentId - The counterpart's assignment to trade, or missing to hand over.
 * @property reason - Why, 1 to 500 characters.
 */
export interface CreateSwapInput {
  assignmentId: string
  counterpartEmployeeId: string
  counterpartAssignmentId?: string
  reason: string
}

/**
 * Data of the Head of Unit's decision.
 *
 * @property version - Version the caller read.
 * @property reason - Why; required to reject, optional to approve (1 to 500 characters).
 */
export interface SwapDecisionInput {
  version?: number
  reason?: string
}

/**
 * Optional version of a move.
 *
 * @property version - Version the caller read.
 */
export interface SwapMoveInput {
  version?: number
}

/**
 * Everything a request needs to be checked: its assignments and the people, roster and unit.
 */
interface SwapContext {
  roster: Roster
  unit: OrganizationUnit
  requester: Employee
  counterpart: Employee
  requesterAssignment: RosterAssignment
  counterpartAssignment: RosterAssignment | null
}

/**
 * Shift swap requests (HR plan 5.7): the requester asks, the counterpart accepts or the requester
 * cancels, the Head of Unit approves or rejects, and two lists. Every request is checked against the rules of HR spec 8.5 for the schedules it would leave (`HR-ROS-001`,
 * `002`, `010` to `013`, `015`, `016`). Nothing is deleted.
 */
@Injectable()
export class SwapService {
  /**
   * @param swaps - Shift swap request repository.
   * @param assignments - Roster assignment repository.
   * @param rosters - Roster repository.
   * @param units - Organization unit repository.
   * @param facilities - Facility repository, for the time zone.
   * @param employees - Employee repository.
   * @param eligibility - General clinical eligibility.
   * @param parameters - HR parameters (the working-time limits).
   * @param transactions - Transaction manager of the main connection.
   * @param logger - Logger of this service.
   */
  constructor(
    @Inject(REPOSITORY_SHIFT_SWAP_REQUEST)
    private readonly swaps: ShiftSwapRequestRepository,
    @Inject(REPOSITORY_ROSTER_ASSIGNMENT)
    private readonly assignments: RosterAssignmentRepository,
    @Inject(REPOSITORY_ROSTER) private readonly rosters: RosterRepository,
    @Inject(REPOSITORY_ORGANIZATION_UNIT)
    private readonly units: OrganizationUnitRepository,
    @Inject(REPOSITORY_FACILITY)
    private readonly facilities: FacilityRepository,
    @Inject(REPOSITORY_EMPLOYEE) private readonly employees: EmployeeRepository,
    @Inject(EligibilityService)
    private readonly eligibility: EligibilityService,
    @Inject(ParameterService) private readonly parameters: ParameterService,
    @Inject(TRANSACTION_MANAGER)
    private readonly transactions: TransactionManager,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /**
   * Lists the requests of the tenant, latest first. Writes no log entry (a read).
   *
   * @param tenantId - Tenant of the caller.
   * @param query - Optional filters and paging.
   * @returns The requests.
   */
  list(tenantId: string, query: SwapQuery): Promise<ShiftSwapRequest[]> {
    return this.swaps.findByFilter(tenantId, query)
  }

  /**
   * Lists the requests of the signed-in employee, as requester or counterpart. Writes no log entry.
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - The employee linked to the caller's account, or `null`.
   * @param query - Optional status and paging.
   * @returns The requests.
   * @throws ForbiddenError `employee_required`.
   */
  listOwn(
    tenantId: string,
    employeeId: string | null,
    query: Pick<SwapQuery, 'status' | 'limit' | 'offset'>,
  ): Promise<ShiftSwapRequest[]> {
    return this.swaps.findByFilter(tenantId, {
      ...query,
      employeeId: this.requireEmployee(employeeId),
    })
  }

  /**
   * Asks to trade or hand over one of the caller's shifts (HR plan 5.7 SW3 to SW9).
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - The employee linked to the caller's account, or `null`.
   * @param input - The request.
   * @returns The created request.
   * @throws ForbiddenError `employee_required`.
   * @throws NotFoundError `roster_assignment_not_found`.
   * @throws InvalidRequestError `reason_required`, `invalid_reason`, `assignment_not_yours`,
   * `employee_not_found`, `counterpart_not_found`, `counterpart_is_requester`,
   * `counterpart_assignment_mismatch`, `different_roster`, `roster_not_published`, `unit_closed`,
   * `assignment_not_planned`, `assignment_flagged`, `assignment_in_past`, `employee_not_assignable`,
   * `not_eligible_*`, `overlap`, `rest_too_short`, `overtime_consent_required`,
   * `overtime_limit_exceeded` or `too_many_nights`.
   * @throws ConflictError `swap_exists` or `assignment_exists`.
   */
  create(
    tenantId: string,
    employeeId: string | null,
    input: CreateSwapInput,
  ): Promise<ShiftSwapRequest> {
    return observe(
      this.logger,
      'swap_create',
      `${NAME}.create`,
      async () => {
        const caller = this.requireEmployee(employeeId)
        const reason = cleanReason(input.reason)
        const context = await this.gather(
          tenantId,
          input.assignmentId,
          input.counterpartEmployeeId,
          input.counterpartAssignmentId ?? null,
          caller,
        )
        await this.assertNoOpenRequest(tenantId, context)
        await this.checkResult(tenantId, context)
        return this.swaps.create({
          tenant_id: tenantId,
          unit_id: context.roster.unit_id,
          roster_id: context.roster.id,
          requester: {
            employee_id: context.requester.id,
            assignment_id: context.requesterAssignment.id,
          },
          counterpart: {
            employee_id: context.counterpart.id,
            assignment_id: context.counterpartAssignment?.id ?? null,
          },
          reason,
          status: 'requested',
          counterpart_accepted_at: null,
          decision: null,
          resulting_assignment_ids: [],
        })
      },
    )
  }

  /**
   * The named counterpart accepts. The result is checked again against the schedules as they are
   * now (HR plan 5.7 SW9).
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - The employee linked to the caller's account, or `null`.
   * @param id - Request identifier.
   * @param input - Optional version.
   * @returns The accepted request.
   * @throws ForbiddenError `employee_required` or `not_the_counterpart`.
   * @throws NotFoundError `swap_not_found`.
   * @throws InvalidRequestError `invalid_transition` or any rule of `create`.
   * @throws ConflictError `stale_version`.
   */
  accept(
    tenantId: string,
    employeeId: string | null,
    id: string,
    input: SwapMoveInput,
  ): Promise<ShiftSwapRequest> {
    return observe(
      this.logger,
      'swap_accept',
      `${NAME}.accept`,
      async () => {
        const caller = this.requireEmployee(employeeId)
        const swap = await this.load(tenantId, id)
        if (swap.counterpart?.employee_id !== caller) {
          throw new ForbiddenError(
            'not_the_counterpart',
            'Only the counterpart can accept this request.',
          )
        }
        this.assertMove(swap, ['requested'])
        this.assertVersion(swap, input.version)
        const context = await this.gather(
          tenantId,
          swap.requester.assignment_id ?? '',
          swap.counterpart.employee_id,
          swap.counterpart.assignment_id,
          undefined,
        )
        await this.checkResult(tenantId, context)
        return this.move(swap, {
          status: 'accepted_by_counterpart',
          counterpart_accepted_at: new Date(),
        })
      },
    )
  }

  /**
   * The requester withdraws the request, while it is open.
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - The employee linked to the caller's account, or `null`.
   * @param id - Request identifier.
   * @param input - Optional version.
   * @returns The cancelled request.
   * @throws ForbiddenError `employee_required` or `not_the_requester`.
   * @throws NotFoundError `swap_not_found`.
   * @throws InvalidRequestError `invalid_transition`.
   * @throws ConflictError `stale_version`.
   */
  cancel(
    tenantId: string,
    employeeId: string | null,
    id: string,
    input: SwapMoveInput,
  ): Promise<ShiftSwapRequest> {
    return observe(
      this.logger,
      'swap_cancel',
      `${NAME}.cancel`,
      async () => {
        const caller = this.requireEmployee(employeeId)
        const swap = await this.load(tenantId, id)
        if (swap.requester.employee_id !== caller) {
          throw new ForbiddenError(
            'not_the_requester',
            'Only the requester can cancel this request.',
          )
        }
        this.assertMove(swap, OPEN)
        this.assertVersion(swap, input.version)
        return this.move(swap, { status: 'cancelled' })
      },
    )
  }

  /**
   * The Head of Unit approves (HR plan 5.7 SW9 to SW11). The result is checked again against the
   * schedules as they are now. In one transaction the original assignments are cancelled, the new
   * ones are created with the source `swap`, the roster's revision goes up and the request is
   * marked approved.
   *
   * @param tenantId - Tenant of the caller.
   * @param deciderEmployeeId - The employee linked to the caller's account, or `null`.
   * @param id - Request identifier.
   * @param input - Optional version and reason.
   * @returns The approved request.
   * @throws NotFoundError `swap_not_found`.
   * @throws ForbiddenError `decider_is_party` or `actor_required`.
   * @throws InvalidRequestError `invalid_transition`, `invalid_reason` or any rule of `create`.
   * @throws ConflictError `stale_version` or `assignment_exists`.
   */
  approve(
    tenantId: string,
    deciderEmployeeId: string | null,
    id: string,
    input: SwapDecisionInput,
  ): Promise<ShiftSwapRequest> {
    return observe(
      this.logger,
      'swap_approve',
      `${NAME}.approve`,
      async () => {
        const swap = await this.load(tenantId, id)
        this.assertNotParty(swap, deciderEmployeeId)
        this.assertMove(swap, ['accepted_by_counterpart'])
        this.assertVersion(swap, input.version)
        const reason =
          input.reason === undefined ? null : cleanReason(input.reason)
        const actor = this.actor()
        const context = await this.gather(
          tenantId,
          swap.requester.assignment_id ?? '',
          swap.counterpart?.employee_id ?? '',
          swap.counterpart?.assignment_id ?? null,
          undefined,
        )
        await this.checkResult(tenantId, context)
        return this.apply(swap, context, { by: actor, at: new Date(), reason })
      },
    )
  }

  /**
   * The Head of Unit rejects, with a reason, while the request is open.
   *
   * @param tenantId - Tenant of the caller.
   * @param deciderEmployeeId - The employee linked to the caller's account, or `null`.
   * @param id - Request identifier.
   * @param input - The reason and an optional version.
   * @returns The rejected request.
   * @throws NotFoundError `swap_not_found`.
   * @throws ForbiddenError `decider_is_party` or `actor_required`.
   * @throws InvalidRequestError `invalid_transition`, `reason_required` or `invalid_reason`.
   * @throws ConflictError `stale_version`.
   */
  reject(
    tenantId: string,
    deciderEmployeeId: string | null,
    id: string,
    input: SwapDecisionInput,
  ): Promise<ShiftSwapRequest> {
    return observe(
      this.logger,
      'swap_reject',
      `${NAME}.reject`,
      async () => {
        const swap = await this.load(tenantId, id)
        this.assertNotParty(swap, deciderEmployeeId)
        this.assertMove(swap, OPEN)
        this.assertVersion(swap, input.version)
        const reason = cleanReason(input.reason ?? '')
        const actor = this.actor()
        return this.move(swap, {
          status: 'rejected',
          decision: { by: actor, at: new Date(), reason },
        })
      },
    )
  }

  /**
   * Writes an approval in one transaction (HR plan 5.7 SW10): the roster's revision, the
   * cancelled assignments, the new ones and the request itself.
   *
   * @param swap - The request as read.
   * @param context - The loaded records, already checked.
   * @param decision - Who approved, when and why.
   * @returns The approved request.
   * @throws ConflictError `stale_version`.
   */
  private async apply(
    swap: ShiftSwapRequest,
    context: SwapContext,
    decision: NonNullable<ShiftSwapRequest['decision']>,
  ): Promise<ShiftSwapRequest> {
    const { roster, requesterAssignment: given, counterpartAssignment: traded } = context
    const revision = roster.revision + 1
    const leaving = traded ? [given, traded] : [given]
    const slots: { employeeId: string; slot: RosterAssignment }[] = [
      { employeeId: context.counterpart.id, slot: given },
      ...(traded ? [{ employeeId: context.requester.id, slot: traded }] : []),
    ]
    return this.transactions.run(() =>
      withChangeReason('shift_swap', async () => {
        try {
          await this.rosters.update(
            roster.id,
            { revision },
            { expectedVersion: roster.version },
          )
          for (const old of leaving) {
            await this.assignments.update(
              old.id,
              { status: 'cancelled', change_reason: 'shift_swap', revision },
              { expectedVersion: old.version },
            )
          }
        } catch (error: unknown) {
          throw this.translate(error)
        }
        const created: string[] = []
        for (const { employeeId, slot } of slots) {
          const next = await this.assignments.create({
            tenant_id: slot.tenant_id,
            roster_id: slot.roster_id,
            unit_id: slot.unit_id,
            facility_id: slot.facility_id,
            employee_id: employeeId,
            date: slot.date,
            shift: slot.shift,
            starts_at: slot.starts_at,
            ends_at: slot.ends_at,
            role: slot.role,
            status: 'planned',
            source: { kind: 'swap', ref_id: swap.id },
            change_reason: 'shift_swap',
            revision,
            overtime: null,
            flag: null,
            is_flagged: false,
          })
          created.push(next.id)
        }
        try {
          return await this.swaps.update(
            swap.id,
            { status: 'approved', decision, resulting_assignment_ids: created },
            { expectedVersion: swap.version },
          )
        } catch (error: unknown) {
          throw this.translate(error)
        }
      }),
    )
  }

  /**
   * Refuses a decision by one of the two people the request is about (HR plan 5.7 SW11).
   *
   * @param swap - The request.
   * @param deciderEmployeeId - The employee linked to the decider's account, or `null`.
   * @throws ForbiddenError `decider_is_party`.
   */
  private assertNotParty(
    swap: ShiftSwapRequest,
    deciderEmployeeId: string | null,
  ): void {
    if (
      deciderEmployeeId !== null &&
      (deciderEmployeeId === swap.requester.employee_id ||
        deciderEmployeeId === swap.counterpart?.employee_id)
    ) {
      throw new ForbiddenError(
        'decider_is_party',
        'You cannot decide a request you are part of.',
      )
    }
  }

  /**
   * @returns The signed-in actor.
   * @throws ForbiddenError `actor_required`.
   */
  private actor(): ActorRef {
    const actor = getRequestContext()?.actor
    if (!actor) {
      throw new ForbiddenError(
        'actor_required',
        'A signed-in actor is required.',
      )
    }
    return actor
  }

  /**
   * Turns a repository rejection of a write into a workforce error.
   *
   * @param error - What the repository threw.
   * @returns The error to throw instead.
   */
  private translate(error: unknown): unknown {
    if (error instanceof RepositoryConflictError) {
      return this.stale()
    }
    if (error instanceof RepositoryNotFoundError) {
      return this.notFound()
    }
    return error
  }

  /**
   * Loads everything a request needs and checks what does not depend on the schedules: the
   * assignments belong to the right people, are of one published roster, and can still be swapped
   * (HR plan 5.7 SW4, SW5).
   *
   * @param tenantId - Tenant of the caller.
   * @param assignmentId - The requester's assignment.
   * @param counterpartEmployeeId - The counterpart.
   * @param counterpartAssignmentId - The counterpart's assignment, or `null` for a hand-over.
   * @param caller - The requester's employee when creating (the assignment must be theirs).
   * @returns The loaded records.
   */
  private async gather(
    tenantId: string,
    assignmentId: string,
    counterpartEmployeeId: string,
    counterpartAssignmentId: string | null,
    caller: string | undefined,
  ): Promise<SwapContext> {
    const requesterAssignment = await this.loadAssignment(tenantId, assignmentId)
    if (
      caller !== undefined &&
      requesterAssignment.employee_id !== caller
    ) {
      throw new InvalidRequestError(
        'assignment_not_yours',
        'The assignment is not yours.',
      )
    }
    if (requesterAssignment.employee_id === counterpartEmployeeId) {
      throw new InvalidRequestError(
        'counterpart_is_requester',
        'The counterpart must be another employee.',
      )
    }
    const requester = await this.loadEmployee(
      tenantId,
      requesterAssignment.employee_id,
      'employee_not_found',
    )
    const counterpart = await this.loadEmployee(
      tenantId,
      counterpartEmployeeId,
      'counterpart_not_found',
    )
    let counterpartAssignment: RosterAssignment | null = null
    if (counterpartAssignmentId !== null) {
      counterpartAssignment = await this.loadAssignment(
        tenantId,
        counterpartAssignmentId,
      )
      if (counterpartAssignment.employee_id !== counterpart.id) {
        throw new InvalidRequestError(
          'counterpart_assignment_mismatch',
          'The assignment is not the counterpart\'s.',
        )
      }
      if (counterpartAssignment.roster_id !== requesterAssignment.roster_id) {
        throw new InvalidRequestError(
          'different_roster',
          'Both assignments must be in the same roster.',
        )
      }
    }
    const roster = await this.rosters.findOne(requesterAssignment.roster_id)
    if (!roster || roster.tenant_id !== tenantId || roster.deleted_at) {
      throw new NotFoundError(
        'roster_assignment_not_found',
        'The assignment was not found.',
      )
    }
    if (roster.status !== 'published') {
      throw new InvalidRequestError(
        'roster_not_published',
        'A shift can be swapped only in a published roster.',
      )
    }
    const unit = await this.units.findOne(roster.unit_id)
    const facility = await this.facilities.findOne(roster.facility_id)
    if (!unit || unit.tenant_id !== tenantId || !facility) {
      throw new NotFoundError(
        'roster_assignment_not_found',
        'The assignment was not found.',
      )
    }
    if (unit.status !== 'active') {
      throw new InvalidRequestError('unit_closed', 'The unit is closed.')
    }
    const today = todayInZone(facility.timezone)
    for (const assignment of [requesterAssignment, counterpartAssignment]) {
      if (!assignment) {
        continue
      }
      if (assignment.status !== 'planned') {
        throw new InvalidRequestError(
          'assignment_not_planned',
          'The assignment is cancelled.',
        )
      }
      if (assignment.is_flagged) {
        throw new InvalidRequestError(
          'assignment_flagged',
          'An assignment with an unresolved flag cannot be swapped.',
        )
      }
      if (assignment.date < today) {
        throw new InvalidRequestError(
          'assignment_in_past',
          'A shift in the past cannot be swapped.',
        )
      }
    }
    return {
      roster,
      unit,
      requester,
      counterpart,
      requesterAssignment,
      counterpartAssignment,
    }
  }

  /**
   * Refuses a request when one of its assignments is already in an open request (HR plan 5.7 SW6).
   *
   * @param tenantId - Tenant of the caller.
   * @param context - The loaded records.
   * @throws ConflictError `swap_exists`.
   */
  private async assertNoOpenRequest(
    tenantId: string,
    context: SwapContext,
  ): Promise<void> {
    const ids = [
      context.requesterAssignment.id,
      ...(context.counterpartAssignment ? [context.counterpartAssignment.id] : []),
    ]
    if ((await this.swaps.findOpenByAssignments(tenantId, ids)).length > 0) {
      throw new ConflictError(
        'swap_exists',
        'An assignment of this request is already in an open swap request.',
      )
    }
  }

  /**
   * Checks the schedules the request would leave (HR plan 5.7 SW7, SW8): the counterpart takes the
   * requester's shift, and in a trade the requester takes the counterpart's. The assignments that
   * are replaced are taken out of each schedule.
   *
   * @param tenantId - Tenant of the caller.
   * @param context - The loaded records.
   * @throws InvalidRequestError the rule that is broken.
   * @throws ConflictError `assignment_exists`.
   */
  private async checkResult(
    tenantId: string,
    context: SwapContext,
  ): Promise<void> {
    const { requesterAssignment: given, counterpartAssignment: traded } = context
    await this.checkReceiver(tenantId, context, context.counterpart, given, traded ? [traded.id] : [])
    if (traded) {
      await this.checkReceiver(tenantId, context, context.requester, traded, [given.id])
    }
  }

  /**
   * Checks one employee taking over a shift.
   *
   * @param tenantId - Tenant of the caller.
   * @param context - The loaded records.
   * @param employee - Who takes the shift.
   * @param slot - The assignment whose shift, date and role are taken.
   * @param leaving - Assignments of this employee that stop existing with the swap.
   * @throws InvalidRequestError the rule that is broken.
   * @throws ConflictError `assignment_exists`.
   */
  private async checkReceiver(
    tenantId: string,
    context: SwapContext,
    employee: Employee,
    slot: RosterAssignment,
    leaving: string[],
  ): Promise<void> {
    assertAssignable(employee)
    await assertEligible(
      this.eligibility,
      tenantId,
      employee,
      context.unit,
      slot.date,
    )
    const same = await this.assignments.findPlannedByEmployeeAndDate(
      tenantId,
      context.roster.id,
      employee.id,
      slot.date,
    )
    if (same && !leaving.includes(same.id)) {
      throw new ConflictError(
        'assignment_exists',
        'The employee already has a shift on this date in this roster.',
      )
    }
    const limits = await readWorkingTimeLimits(
      this.parameters,
      tenantId,
      context.unit.id,
    )
    const others = (
      await this.assignments.findPlannedByEmployeeBetween(
        tenantId,
        employee.id,
        addDays(slot.date, -8),
        addDays(slot.date, 8),
      )
    )
      .filter((other) => !leaving.includes(other.id))
      .map((other) => toWorkingShift(other))
    firstWorkingTimeViolation(toWorkingShift(slot), others, limits, false)
  }

  /**
   * Writes a move of the request with the version it was read at.
   *
   * @param swap - The request as read.
   * @param changes - The new status and what goes with it.
   * @returns The request after the move.
   * @throws ConflictError `stale_version`.
   * @throws NotFoundError `swap_not_found`.
   */
  private async move(
    swap: ShiftSwapRequest,
    changes: Partial<
      Pick<
        ShiftSwapRequest,
        'status' | 'counterpart_accepted_at' | 'decision'
      >
    >,
  ): Promise<ShiftSwapRequest> {
    try {
      return await this.swaps.update(swap.id, changes, {
        expectedVersion: swap.version,
      })
    } catch (error: unknown) {
      throw this.translate(error)
    }
  }

  /**
   * Refuses a move the status does not allow.
   *
   * @param swap - The request.
   * @param from - The statuses the move may start from.
   * @throws InvalidRequestError `invalid_transition`.
   */
  private assertMove(swap: ShiftSwapRequest, from: readonly SwapStatus[]): void {
    if (!from.includes(swap.status)) {
      throw new InvalidRequestError(
        'invalid_transition',
        'The request cannot make this move from its status.',
      )
    }
  }

  /**
   * Checks the version the caller read.
   *
   * @param swap - The request.
   * @param version - Version the caller sent, if any.
   * @throws ConflictError `stale_version`.
   */
  private assertVersion(swap: ShiftSwapRequest, version: number | undefined): void {
    if (version !== undefined && version !== swap.version) {
      throw this.stale()
    }
  }

  /**
   * @param employeeId - The employee linked to the account, or `null`.
   * @returns The employee identifier.
   * @throws ForbiddenError `employee_required`.
   */
  private requireEmployee(employeeId: string | null): string {
    if (!employeeId) {
      throw new ForbiddenError(
        'employee_required',
        'Your account is not linked to an employee.',
      )
    }
    return employeeId
  }

  /**
   * Loads a request of the caller's tenant.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Request identifier.
   * @returns The request.
   * @throws NotFoundError `swap_not_found`.
   */
  private async load(tenantId: string, id: string): Promise<ShiftSwapRequest> {
    const swap = await this.swaps.findOne(id)
    if (!swap || swap.tenant_id !== tenantId || swap.deleted_at) {
      throw this.notFound()
    }
    return swap
  }

  /**
   * Loads an assignment of the caller's tenant.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Assignment identifier.
   * @returns The assignment.
   * @throws NotFoundError `roster_assignment_not_found`.
   */
  private async loadAssignment(
    tenantId: string,
    id: string,
  ): Promise<RosterAssignment> {
    const assignment = await this.assignments.findOne(id)
    if (
      !assignment ||
      assignment.tenant_id !== tenantId ||
      assignment.deleted_at
    ) {
      throw new NotFoundError(
        'roster_assignment_not_found',
        'The assignment was not found.',
      )
    }
    return assignment
  }

  /**
   * Loads an employee of the tenant.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Employee identifier.
   * @param code - The code to answer when there is none.
   * @returns The employee.
   * @throws InvalidRequestError the given code.
   */
  private async loadEmployee(
    tenantId: string,
    id: string,
    code: string,
  ): Promise<Employee> {
    const employee = await this.employees.findOne(id)
    if (!employee || employee.tenant_id !== tenantId || employee.deleted_at) {
      throw new InvalidRequestError(code, 'The employee was not found.')
    }
    return employee
  }

  /**
   * @returns The not-found error for a request.
   */
  private notFound(): NotFoundError {
    return new NotFoundError('swap_not_found', 'The swap request was not found.')
  }

  /**
   * @returns The conflict for a stale version.
   */
  private stale(): ConflictError {
    return new ConflictError(
      'stale_version',
      'The request was changed by someone else. Read it again and retry.',
    )
  }
}
