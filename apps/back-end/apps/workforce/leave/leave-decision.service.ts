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
import { type LeaveLedgerRepository } from '@repository/interface/leave-ledger'
import { type LeavePolicyRepository } from '@repository/interface/leave-policy'
import { type LeaveRequestRepository } from '@repository/interface/leave-request'
import {
  type LeaveDay,
  type LeaveDecision,
  type LeaveReplacement,
  type LeaveRequest,
} from '@repository/model/leave-request'
import {
  REPOSITORY_EMPLOYEE,
  REPOSITORY_LEAVE_LEDGER,
  REPOSITORY_LEAVE_POLICY,
  REPOSITORY_LEAVE_REQUEST,
} from '@repository/token'
import { observe } from '../observe'
import {
  ConflictError,
  ForbiddenError,
  InvalidRequestError,
} from '../workforce.error'
import { totalOf } from './day-count'
import { LeaveDeciderService } from './decider'
import { isRequester, leaveRequestNotFound } from './leave-access'
import { LeaveBalanceService } from './leave-balance.service'
import { type LeaveCaller } from './leave-caller'
import { LEAVE_EFFECTS, type LeaveEffects } from './leave-effects'
import { LeavePlaceService } from './leave-place'
import { postUses, reverseUses } from './leave-posting'
import { assertTransition, maxDaysOf } from './leave-request-rules'

const NAME = 'LeaveDecisionService'

/**
 * Longest reason of a decision, a cancellation or a replacement note.
 */
const MAX_REASON_LENGTH = 500

/**
 * Most days one correction can name: a request spans at most 366 days.
 */
const MAX_DAY_CHANGES = 366

/**
 * The first step names a replacement or says why there is none.
 *
 * @property replacementEmployeeId - The replacement, an employee of the tenant.
 * @property noReplacementReason - Why there is no replacement.
 * @property version - Version of the request the caller read.
 */
export interface ApproveLeaveInput {
  replacementEmployeeId?: string
  noReplacementReason?: string
  version?: number
}

/**
 * A rejection.
 *
 * @property reason - Why, 1 to 500 characters.
 * @property version - Version of the request the caller read.
 */
export interface RejectLeaveInput {
  reason: string
  version?: number
}

/**
 * A cancellation.
 *
 * @property reason - Why; required for an approved leave.
 * @property version - Version of the request the caller read.
 */
export interface CancelLeaveInput {
  reason?: string
  version?: number
}

/**
 * The Head's correction of the counted days.
 *
 * @property days - The dates to change and their new count.
 * @property version - Version of the request the caller read.
 */
export interface AdjustLeaveDaysInput {
  days: { date: string; count: number }[]
  version?: number
}

/**
 * Decisions on leave requests (HR plan 8.3 Task 4): the Head's correction of the counted days,
 * approval and rejection at each step, and cancellation. Approval posts the `use` entries of the
 * ledger and cancellation reverses them, in the same transaction as the status (LR7, LR10). The
 * reason of a rejection and the replacement note are kept in the request's `decisions` and
 * `replacement`, and appear in no log.
 */
@Injectable()
export class LeaveDecisionService {
  /**
   * @param requests - Leave request repository.
   * @param employees - Employee repository, to check the replacement.
   * @param ledger - Leave ledger repository.
   * @param policies - Leave policy repository, for the limits the Head's correction must respect.
   * @param balances - Leave balances, for the days available.
   * @param place - Finds the requester's today.
   * @param decider - Finds who decides the first step now.
   * @param effects - What the leave does outside the ledger (group 8.4).
   * @param transactions - Transaction manager, so a decision and its postings are written together.
   * @param logger - Logger of this service.
   */
  constructor(
    @Inject(REPOSITORY_LEAVE_REQUEST)
    private readonly requests: LeaveRequestRepository,
    @Inject(REPOSITORY_EMPLOYEE) private readonly employees: EmployeeRepository,
    @Inject(REPOSITORY_LEAVE_LEDGER)
    private readonly ledger: LeaveLedgerRepository,
    @Inject(REPOSITORY_LEAVE_POLICY)
    private readonly policies: LeavePolicyRepository,
    @Inject(LeaveBalanceService) private readonly balances: LeaveBalanceService,
    @Inject(LeavePlaceService) private readonly place: LeavePlaceService,
    @Inject(LeaveDeciderService) private readonly decider: LeaveDeciderService,
    @Inject(LEAVE_EFFECTS) private readonly effects: LeaveEffects,
    @Inject(TRANSACTION_MANAGER)
    private readonly transactions: TransactionManager,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /**
   * Corrects the counted days of a request that waits for the first step (HR plan 8.3 LR9). Only
   * the first-step decider may. The balance is checked again with the new total.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Request identifier.
   * @param input - The dates to change and the version read.
   * @param caller - The caller.
   * @returns The updated request.
   * @throws NotFoundError `leave_request_not_found`.
   * @throws ForbiddenError `employee_required`, `decider_is_requester` or `not_the_decider`.
   * @throws InvalidRequestError `invalid_transition`, `invalid_days`, `date_outside_period`,
   * `duplicate_date`, `invalid_count`, `too_many_days` or `insufficient_balance`.
   * @throws ConflictError `stale_version`.
   */
  adjustDays(
    tenantId: string,
    id: string,
    input: AdjustLeaveDaysInput,
    caller: LeaveCaller,
  ): Promise<LeaveRequest> {
    return observe(
      this.logger,
      'leave_days_adjust',
      `${NAME}.adjustDays`,
      async () => {
        const request = await this.load(tenantId, id)
        if (request.status !== 'requested') {
          throw this.invalidTransition()
        }
        await this.authorize(tenantId, caller, request, 'first')
        this.checkVersion(request, input.version)
        const days = this.applyDayChanges(request, input.days)
        const total = totalOf(days)
        if (total <= 0) {
          throw new InvalidRequestError(
            'invalid_days',
            'At least one day must still count. Reject the request instead.',
          )
        }
        await this.checkLimits(tenantId, request, total)
        return this.write(() =>
          this.requests.update(
            request.id,
            { days, total_days: total },
            { expectedVersion: request.version },
          ),
        )
      },
    )
  }

  /**
   * Approves the step a request waits for (HR plan 8.3 LR7). The first step names a replacement or
   * says why there is none; the last step posts the `use` entries and calls the leave effects, all
   * in one transaction with the status. Two approvals sent at once: one wins, the other answers 409
   * `stale_version` and posts nothing.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Request identifier.
   * @param input - The replacement of the first step, and the version read.
   * @param caller - The caller.
   * @returns The updated request.
   * @throws NotFoundError `leave_request_not_found`.
   * @throws ForbiddenError `employee_required`, `decider_is_requester`, `not_the_decider` or
   * `same_decider`.
   * @throws InvalidRequestError `invalid_transition`, `replacement_required`, `invalid_replacement`,
   * `replacement_not_allowed`, `invalid_reason`, `too_many_days` or `insufficient_balance`.
   * @throws ConflictError `stale_version`.
   */
  approve(
    tenantId: string,
    id: string,
    input: ApproveLeaveInput,
    caller: LeaveCaller,
  ): Promise<LeaveRequest> {
    return observe(
      this.logger,
      'leave_request_approve',
      `${NAME}.approve`,
      async () => {
        const request = await this.load(tenantId, id)
        const step = this.stepOf(request)
        await this.authorize(tenantId, caller, request, step)
        this.checkVersion(request, input.version)
        const replacement =
          step === 'first'
            ? await this.checkReplacement(tenantId, request, input)
            : this.refuseReplacement(request, input)
        await this.checkLimits(tenantId, request, request.total_days)
        const last = step === 'second' || !request.deciders.second
        const now = new Date()
        const decision: LeaveDecision = {
          step,
          outcome: 'approved',
          by: this.actor(),
          at: now,
          reason: null,
        }
        return this.write(() =>
          this.transactions.run(async () => {
            const updated = await this.requests.update(
              request.id,
              {
                status: last ? 'approved' : 'head_approved',
                status_since: now,
                decisions: [...request.decisions, decision],
                replacement,
              },
              { expectedVersion: request.version },
            )
            if (last) {
              await postUses(this.ledger, this.balances, tenantId, updated)
              await this.effects.onApproved(updated)
              // The effects keep the cover on the request, so read it again.
              return (await this.requests.findOne(updated.id)) ?? updated
            }
            return updated
          }),
        )
      },
    )
  }

  /**
   * Rejects the step a request waits for (HR plan 8.3 LR8). The days it reserved are free again.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Request identifier.
   * @param input - The reason and the version read.
   * @param caller - The caller.
   * @returns The updated request.
   * @throws NotFoundError `leave_request_not_found`.
   * @throws ForbiddenError `employee_required`, `decider_is_requester`, `not_the_decider` or
   * `same_decider`.
   * @throws InvalidRequestError `invalid_transition`, `reason_required` or `invalid_reason`.
   * @throws ConflictError `stale_version`.
   */
  reject(
    tenantId: string,
    id: string,
    input: RejectLeaveInput,
    caller: LeaveCaller,
  ): Promise<LeaveRequest> {
    return observe(
      this.logger,
      'leave_request_reject',
      `${NAME}.reject`,
      async () => {
        const request = await this.load(tenantId, id)
        const step = this.stepOf(request)
        await this.authorize(tenantId, caller, request, step)
        const reason = this.checkReason(input.reason, true) as string
        this.checkVersion(request, input.version)
        assertTransition(request.status, 'rejected')
        const now = new Date()
        const decision: LeaveDecision = {
          step,
          outcome: 'rejected',
          by: this.actor(),
          at: now,
          reason,
        }
        return this.write(() =>
          this.requests.update(
            request.id,
            {
              status: 'rejected',
              status_since: now,
              decisions: [...request.decisions, decision],
            },
            { expectedVersion: request.version },
          ),
        )
      },
    )
  }

  /**
   * Cancels a request (HR plan 8.3 LR10). The requester or a holder of
   * `workforce.leave-request:write` may. An approved leave that has not started needs a reason; its
   * `use` entries are reversed and the leave effects are called, in one transaction with the status.
   * A leave that has started cannot be cancelled here.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Request identifier.
   * @param input - The reason and the version read.
   * @param caller - The caller.
   * @returns The updated request.
   * @throws NotFoundError `leave_request_not_found`.
   * @throws InvalidRequestError `invalid_transition`, `leave_started`, `reason_required` or
   * `invalid_reason`.
   * @throws ConflictError `stale_version`.
   */
  cancel(
    tenantId: string,
    id: string,
    input: CancelLeaveInput,
    caller: LeaveCaller,
  ): Promise<LeaveRequest> {
    return observe(
      this.logger,
      'leave_request_cancel',
      `${NAME}.cancel`,
      async () => {
        const request = await this.load(tenantId, id)
        if (!(isRequester(caller, request) || caller.canWrite)) {
          throw leaveRequestNotFound()
        }
        assertTransition(request.status, 'cancelled')
        const approved = request.status === 'approved'
        const reason = this.checkReason(input.reason, approved)
        if (approved) {
          const { today } = await this.place.of(tenantId, request.employee_id)
          if (request.period.start <= today) {
            throw new InvalidRequestError(
              'leave_started',
              'A leave that has started cannot be cancelled.',
            )
          }
        }
        this.checkVersion(request, input.version)
        const now = new Date()
        const run = () =>
          this.transactions.run(async () => {
            const updated = await this.requests.update(
              request.id,
              { status: 'cancelled', status_since: now },
              { expectedVersion: request.version },
            )
            if (approved) {
              await reverseUses(this.ledger, tenantId, updated)
              await this.effects.onCancelled(updated)
            }
            return updated
          })
        return this.write(() =>
          reason === null ? run() : withChangeReason(reason, run),
        )
      },
    )
  }

  /**
   * Checks the limits a request must still respect when it is decided or corrected: the policy's
   * days per request and the days available, without the request's own reservation (HR plan 8.3
   * LR5, LR7, LR9).
   *
   * @param tenantId - Tenant of the caller.
   * @param request - The request.
   * @param totalDays - The total days to check, which a correction may have changed.
   * @throws InvalidRequestError `too_many_days` or `insufficient_balance`.
   */
  private async checkLimits(
    tenantId: string,
    request: LeaveRequest,
    totalDays: number,
  ): Promise<void> {
    const policy = await this.policies.findOne(request.policy_id)
    if (policy && policy.tenant_id === tenantId) {
      if (totalDays > maxDaysOf(policy)) {
        throw new InvalidRequestError(
          'too_many_days',
          'The request counts more days than this leave type allows.',
        )
      }
    }
    if (request.rules.balance_kind === 'period' && request.entitlement_period) {
      const summary = await this.balances.summary(
        tenantId,
        request.employee_id,
        request.leave_type,
        request.entitlement_period.start,
        request.id,
      )
      if (totalDays > summary.available) {
        throw new InvalidRequestError(
          'insufficient_balance',
          'The request counts more days than are available.',
        )
      }
    }
  }

  /**
   * Applies the Head's changes to the day breakdown (HR plan 8.3 LR9).
   *
   * @param request - The request.
   * @param changes - The dates to change and their new count.
   * @returns The new breakdown; the changed days are marked as set by the Head.
   * @throws InvalidRequestError `invalid_days`, `date_outside_period`, `duplicate_date` or
   * `invalid_count`.
   */
  private applyDayChanges(
    request: LeaveRequest,
    changes: AdjustLeaveDaysInput['days'],
  ): LeaveDay[] {
    if (
      !Array.isArray(changes) ||
      changes.length === 0 ||
      changes.length > MAX_DAY_CHANGES
    ) {
      throw new InvalidRequestError(
        'invalid_days',
        'Send between 1 and 366 days to change.',
      )
    }
    const byDate = new Map(request.days.map((day) => [day.date, day]))
    const seen = new Set<string>()
    const next = new Map(byDate)
    for (const change of changes) {
      const day = byDate.get(change.date)
      if (!day) {
        throw new InvalidRequestError(
          'date_outside_period',
          'A date is not one of the days of the request.',
        )
      }
      if (seen.has(change.date)) {
        throw new InvalidRequestError(
          'duplicate_date',
          'A date was sent more than once.',
        )
      }
      seen.add(change.date)
      const halfAllowed =
        (change.date === request.period.start && request.half_days.first) ||
        (change.date === request.period.end && request.half_days.last)
      if (!(change.count === 0 || change.count === 1 || (change.count === 0.5 && halfAllowed))) {
        throw new InvalidRequestError(
          'invalid_count',
          'A day counts 0 or 1, and 0.5 only for a half first or last day.',
        )
      }
      const count = change.count as LeaveDay['count']
      next.set(change.date, {
        date: change.date,
        count,
        why:
          count > 0
            ? request.rules.counting === 'calendar_days'
              ? 'calendar_day'
              : 'working'
            : day.why === 'working' || day.why === 'calendar_day'
              ? 'rest_day'
              : day.why,
        set_by: 'head',
      })
    }
    return request.days.map((day) => next.get(day.date) as LeaveDay)
  }

  /**
   * Checks the replacement of the first step: an employee on probation or active who is not the
   * requester, or a reason why there is none, not both and not neither.
   *
   * @param tenantId - Tenant of the caller.
   * @param request - The request.
   * @param input - What the caller sent.
   * @returns The replacement to store.
   * @throws InvalidRequestError `replacement_required`, `invalid_replacement` or `invalid_reason`.
   */
  private async checkReplacement(
    tenantId: string,
    request: LeaveRequest,
    input: ApproveLeaveInput,
  ): Promise<LeaveReplacement> {
    const named = input.replacementEmployeeId !== undefined
    const none = input.noReplacementReason !== undefined
    if (named === none) {
      throw new InvalidRequestError(
        'replacement_required',
        'Name a replacement, or say why there is none.',
      )
    }
    if (none) {
      return {
        employee_id: null,
        none_reason: this.checkReason(input.noReplacementReason, true) as string,
      }
    }
    const id = input.replacementEmployeeId as string
    const employee = await this.employees.findOne(id)
    if (
      !employee ||
      employee.tenant_id !== tenantId ||
      employee.deleted_at ||
      employee.id === request.employee_id ||
      (employee.employment_status !== 'probation' &&
        employee.employment_status !== 'active')
    ) {
      throw new InvalidRequestError(
        'invalid_replacement',
        'The replacement must be another employee on probation or active.',
      )
    }
    return { employee_id: employee.id, none_reason: null }
  }

  /**
   * The second step takes no replacement; the first step's stays.
   *
   * @param request - The request.
   * @param input - What the caller sent.
   * @returns The replacement already stored.
   * @throws InvalidRequestError `replacement_not_allowed`.
   */
  private refuseReplacement(
    request: LeaveRequest,
    input: ApproveLeaveInput,
  ): LeaveReplacement | null {
    if (
      input.replacementEmployeeId !== undefined ||
      input.noReplacementReason !== undefined
    ) {
      throw new InvalidRequestError(
        'replacement_not_allowed',
        'The replacement is named at the first step only.',
      )
    }
    return request.replacement
  }

  /**
   * Checks a free-text reason.
   *
   * @param reason - The reason as sent.
   * @param required - Whether a missing reason is refused.
   * @returns The trimmed reason, or `null` when it is optional and missing.
   * @throws InvalidRequestError `reason_required` or `invalid_reason`.
   */
  private checkReason(reason: unknown, required: boolean): string | null {
    const text = typeof reason === 'string' ? reason.trim() : ''
    if (text.length === 0) {
      if (required) {
        throw new InvalidRequestError('reason_required', 'A reason is required.')
      }
      return null
    }
    if (text.length > MAX_REASON_LENGTH) {
      throw new InvalidRequestError(
        'invalid_reason',
        'The reason must have at most 500 characters.',
      )
    }
    return text
  }

  /**
   * Finds the step a request waits for.
   *
   * @param request - The request.
   * @returns `first` for `requested`, `second` for `head_approved`.
   * @throws InvalidRequestError `invalid_transition`.
   */
  private stepOf(request: LeaveRequest): 'first' | 'second' {
    if (request.status === 'requested') {
      return 'first'
    }
    if (request.status === 'head_approved') {
      return 'second'
    }
    throw this.invalidTransition()
  }

  /**
   * Checks that the caller decides this step (HR plan 8.3 LR6, LR7). The first step is the current
   * Head of the stored unit, or HR Manager when the decider is HR Manager; the second is HR Manager,
   * never the person who gave the first (`HR-LEV-010`). Nobody decides their own leave.
   *
   * @param tenantId - Tenant of the caller.
   * @param caller - The caller.
   * @param request - The request.
   * @param step - The step being decided.
   * @throws ForbiddenError `employee_required`, `decider_is_requester`, `not_the_decider` or
   * `same_decider`.
   */
  private async authorize(
    tenantId: string,
    caller: LeaveCaller,
    request: LeaveRequest,
    step: 'first' | 'second',
  ): Promise<void> {
    if (caller.employeeId === null) {
      throw new ForbiddenError(
        'employee_required',
        'This needs an account linked to an employee.',
      )
    }
    if (caller.employeeId === request.employee_id) {
      throw new ForbiddenError(
        'decider_is_requester',
        'Nobody decides their own leave.',
      )
    }
    if (step === 'second') {
      if (!caller.canApproveHr) {
        throw this.notTheDecider()
      }
      if (request.decisions.some((decision) => decision.by.account_id === caller.accountId)) {
        throw new ForbiddenError(
          'same_decider',
          'The second step must be given by someone other than the first.',
        )
      }
      return
    }
    const first = await this.decider.resolve(tenantId, request.deciders.first)
    const allowed =
      first.kind === 'hr_manager'
        ? caller.canApproveHr
        : caller.canDecide && first.employeeId === caller.employeeId
    if (!allowed) {
      throw this.notTheDecider()
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
   * Checks the version the caller read.
   *
   * @param request - The request as stored.
   * @param version - The version the caller read, if sent.
   * @throws ConflictError `stale_version`.
   */
  private checkVersion(request: LeaveRequest, version: number | undefined): void {
    if (version !== undefined && version !== request.version) {
      throw this.stale()
    }
  }

  /**
   * Runs a write and turns a repository rejection into a workforce error.
   *
   * @param work - The write.
   * @returns What the write returns.
   * @throws ConflictError `stale_version`.
   * @throws NotFoundError `leave_request_not_found`.
   */
  private async write<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work()
    } catch (error: unknown) {
      if (error instanceof RepositoryConflictError) {
        throw this.stale()
      }
      if (error instanceof RepositoryNotFoundError) {
        throw leaveRequestNotFound()
      }
      throw error
    }
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
   * @returns The error for a move the status does not allow.
   */
  private invalidTransition(): InvalidRequestError {
    return new InvalidRequestError(
      'invalid_transition',
      'The request cannot move to that status.',
    )
  }

  /**
   * @returns The error for a caller who does not decide the step.
   */
  private notTheDecider(): ForbiddenError {
    return new ForbiddenError(
      'not_the_decider',
      'You do not decide this step of the request.',
    )
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
