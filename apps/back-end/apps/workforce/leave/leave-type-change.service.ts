import { Inject, Injectable } from '@nestjs/common'
import {
  RepositoryConflictError,
  RepositoryNotFoundError,
} from '@utility/database/error'
import {
  TRANSACTION_MANAGER,
  type TransactionManager,
} from '@utility/database/transaction'
import { withChangeReason } from '@utility/history/reason'
import { AppLogger } from '@utility/logger/service'
import { type LeaveRequestRepository } from '@repository/interface/leave-request'
import { type LeaveLedgerRepository } from '@repository/interface/leave-ledger'
import { type Coding } from '@repository/model/common/coding'
import { type LeaveDay, type LeaveRequest } from '@repository/model/leave-request'
import {
  REPOSITORY_LEAVE_LEDGER,
  REPOSITORY_LEAVE_REQUEST,
} from '@repository/token'
import { CodeConceptService } from '../concept/code-concept.service'
import { systemSuffix } from '../concept/system-rules'
import { observe } from '../observe'
import { ConflictError, InvalidRequestError } from '../workforce.error'
import { totalOf } from './day-count'
import { leaveRequestNotFound } from './leave-access'
import { LeavePlaceService } from './leave-place'
import { LeavePolicyService } from './leave-policy.service'
import { postUses, reverseUses } from './leave-posting'
import { LeaveBalanceService } from './leave-balance.service'
import { LeaveRequestService } from './leave-request.service'
import { maxDaysOf } from './leave-request-rules'

const NAME = 'LeaveTypeChangeService'

/**
 * Longest reason of a change.
 */
const MAX_REASON_LENGTH = 500

/**
 * A change of leave type.
 *
 * @property leaveType - The new leave type.
 * @property reason - Why, 1 to 500 characters; kept in the change history.
 * @property version - Version of the request the caller read.
 */
export interface ChangeLeaveTypeInput {
  leaveType: Coding
  reason: string
  version?: number
}

/**
 * Changes the leave type of an approved request (HR plan 8.3 LR12): a nurse who fell ill during
 * annual leave, or a leave that HR booked under the wrong type. The old type's days are reversed
 * and the new type's days used in one transaction with the new type, policy and rules, so a failure
 * writes nothing. The roster is not touched.
 */
@Injectable()
export class LeaveTypeChangeService {
  /**
   * @param requests - Leave request repository.
   * @param ledger - Leave ledger repository.
   * @param concepts - Code concepts, for the leave type.
   * @param policies - Leave policies, for the policy in force on the first date.
   * @param balances - Leave balances, for the carried-over days left.
   * @param requestRules - The request service, whose employment type and entitlement checks apply.
   * @param place - Finds the requester's today.
   * @param transactions - Transaction manager, so the type and the postings are written together.
   * @param logger - Logger of this service.
   */
  constructor(
    @Inject(REPOSITORY_LEAVE_REQUEST)
    private readonly requests: LeaveRequestRepository,
    @Inject(REPOSITORY_LEAVE_LEDGER)
    private readonly ledger: LeaveLedgerRepository,
    @Inject(CodeConceptService) private readonly concepts: CodeConceptService,
    @Inject(LeavePolicyService) private readonly policies: LeavePolicyService,
    @Inject(LeaveBalanceService) private readonly balances: LeaveBalanceService,
    @Inject(LeaveRequestService)
    private readonly requestRules: LeaveRequestService,
    @Inject(LeavePlaceService) private readonly place: LeavePlaceService,
    @Inject(TRANSACTION_MANAGER)
    private readonly transactions: TransactionManager,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /**
   * Changes the leave type of an approved request. The new type needs a policy in force on the
   * first date that is open to the employee's employment type; its limits and balance are checked as
   * for a new request. A new type that counts calendar days recounts the days.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Request identifier.
   * @param input - The new type, the reason and the version read.
   * @returns The updated request.
   * @throws NotFoundError `leave_request_not_found`.
   * @throws InvalidRequestError `invalid_transition` for a request that is not approved,
   * `reason_required`, `invalid_reason`, `invalid_leave_type`, `same_type`, `no_policy`,
   * `employment_type_not_allowed`, `too_many_days`, `no_service`, `crosses_period`,
   * `insufficient_balance` and the concept service's `unknown_code`, `code_retired` or
   * `code_not_in_period`.
   * @throws ConflictError `stale_version`.
   */
  change(
    tenantId: string,
    id: string,
    input: ChangeLeaveTypeInput,
  ): Promise<LeaveRequest> {
    return observe(
      this.logger,
      'leave_type_change',
      `${NAME}.change`,
      async () => {
        const request = await this.load(tenantId, id)
        if (request.status !== 'approved') {
          throw new InvalidRequestError(
            'invalid_transition',
            'Only an approved leave can change its type.',
          )
        }
        const reason = this.checkReason(input.reason)
        await this.checkType(tenantId, request, input.leaveType)
        if (input.version !== undefined && input.version !== request.version) {
          throw this.stale()
        }
        const policy = await this.policies.inForce(
          tenantId,
          input.leaveType,
          request.period.start,
        )
        if (!policy) {
          throw new InvalidRequestError(
            'no_policy',
            'No leave policy is in force for this leave type on that date.',
          )
        }
        await this.requestRules.checkEmploymentType(
          tenantId,
          request.employee_id,
          policy,
        )
        const days = this.recount(request, policy.counting)
        const totalDays = totalOf(days)
        if (totalDays > maxDaysOf(policy)) {
          throw new InvalidRequestError(
            'too_many_days',
            'The request counts more days than the new leave type allows.',
          )
        }
        const { today } = await this.place.of(tenantId, request.employee_id)
        const entitlement = await this.requestRules.checkEntitlement(
          tenantId,
          request.employee_id,
          policy,
          {
            leaveType: input.leaveType,
            start: request.period.start,
            end: request.period.end,
          },
          totalDays,
          today,
          {},
          request.id,
        )
        try {
          return await withChangeReason(reason, () =>
            this.transactions.run(async () => {
              const updated = await this.requests.update(
                request.id,
                {
                  leave_type: {
                    system: input.leaveType.system,
                    code: input.leaveType.code,
                  },
                  policy_id: policy.id,
                  rules: {
                    balance_kind: policy.balance.kind,
                    counting: policy.counting,
                    steps: policy.approval.steps,
                  },
                  days,
                  total_days: totalDays,
                  entitlement_period: entitlement,
                },
                { expectedVersion: request.version },
              )
              await reverseUses(this.ledger, tenantId, updated)
              await postUses(this.ledger, this.balances, tenantId, updated)
              return updated
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
    )
  }

  /**
   * Keeps the day breakdown, unless the new policy counts calendar days: then every date counts,
   * a half first or last day as half (HR plan 8.3 LR12).
   *
   * @param request - The request.
   * @param counting - How the new policy counts days.
   * @returns The breakdown to store.
   */
  private recount(
    request: LeaveRequest,
    counting: 'working_days' | 'calendar_days',
  ): LeaveDay[] {
    if (counting !== 'calendar_days') {
      return request.days
    }
    return request.days.map((day) => ({
      date: day.date,
      count:
        (request.half_days.first && day.date === request.period.start) ||
        (request.half_days.last && day.date === request.period.end)
          ? 0.5
          : 1,
      why: 'calendar_day',
      set_by: 'policy',
    }))
  }

  /**
   * Checks the new leave type: a code of a leave type system, active, and not the current type.
   *
   * @param tenantId - Tenant of the caller.
   * @param request - The request.
   * @param leaveType - The new type.
   * @throws InvalidRequestError `invalid_leave_type`, `same_type` and the concept service's codes.
   */
  private async checkType(
    tenantId: string,
    request: LeaveRequest,
    leaveType: Coding,
  ): Promise<void> {
    if (systemSuffix(leaveType.system) !== 'leave-type') {
      throw new InvalidRequestError(
        'invalid_leave_type',
        'The leave type must be a code of a leave type system.',
      )
    }
    if (
      leaveType.system === request.leave_type.system &&
      leaveType.code === request.leave_type.code
    ) {
      throw new InvalidRequestError(
        'same_type',
        'The request already has this leave type.',
      )
    }
    await this.concepts.assertActive(tenantId, leaveType)
  }

  /**
   * Checks the reason.
   *
   * @param reason - The reason as sent.
   * @returns The trimmed reason.
   * @throws InvalidRequestError `reason_required` or `invalid_reason`.
   */
  private checkReason(reason: unknown): string {
    const text = typeof reason === 'string' ? reason.trim() : ''
    if (text.length === 0) {
      throw new InvalidRequestError('reason_required', 'A reason is required.')
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
   * @returns The error for a request changed by someone else.
   */
  private stale(): ConflictError {
    return new ConflictError(
      'stale_version',
      'The request was changed by someone else. Reload it and try again.',
    )
  }
}
