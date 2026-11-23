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
import { isLocalDate } from '@utility/validation/local-date'
import { type LeaveLedgerRepository } from '@repository/interface/leave-ledger'
import { type LeaveRequestRepository } from '@repository/interface/leave-request'
import { type LeaveRequest } from '@repository/model/leave-request'
import {
  REPOSITORY_LEAVE_LEDGER,
  REPOSITORY_LEAVE_REQUEST,
} from '@repository/token'
import { observe } from '../observe'
import { ConflictError, InvalidRequestError } from '../workforce.error'
import { totalOf } from './day-count'
import { leaveRequestNotFound } from './leave-access'
import { LEAVE_EFFECTS, type LeaveEffects } from './leave-effects'
import { LeavePlaceService } from './leave-place'
import { heldDays } from './leave-posting'

const NAME = 'LeaveEndEarlyService'

/**
 * Longest reason of the change.
 */
const MAX_REASON_LENGTH = 500

/**
 * Ending a leave early.
 *
 * @property lastDate - The last day of the leave now.
 * @property reason - Why, 1 to 500 characters; kept in the change history.
 * @property version - Version of the request the caller read.
 */
export interface EndLeaveEarlyInput {
  lastDate: string
  reason: string
  version?: number
}

/**
 * Ends an approved leave that has started before its last day, for example a nurse called back to
 * work (HR plan 8.4 LK6). The days after the new last date are given back to the balance and the
 * leave's practice session exceptions after it are undone, in one transaction with the new period.
 * The shifts the leave cancelled are not restored (`HR-LEV-023`).
 */
@Injectable()
export class LeaveEndEarlyService {
  /**
   * @param requests - Leave request repository.
   * @param ledger - Leave ledger repository.
   * @param place - Finds the requester's today.
   * @param effects - What the leave does outside the ledger (group 8.4).
   * @param transactions - Transaction manager.
   * @param logger - Logger of this service.
   */
  constructor(
    @Inject(REPOSITORY_LEAVE_REQUEST)
    private readonly requests: LeaveRequestRepository,
    @Inject(REPOSITORY_LEAVE_LEDGER)
    private readonly ledger: LeaveLedgerRepository,
    @Inject(LeavePlaceService) private readonly place: LeavePlaceService,
    @Inject(LEAVE_EFFECTS) private readonly effects: LeaveEffects,
    @Inject(TRANSACTION_MANAGER)
    private readonly transactions: TransactionManager,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /**
   * Ends an approved leave early. The period and the day breakdown are cut after `lastDate`, the
   * total is recounted, the days removed are reversed in the ledger (own days first, then
   * carried-over days) and the leave effects undo the session exceptions after `lastDate`.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Request identifier.
   * @param input - The last date, the reason and the version read.
   * @returns The updated request.
   * @throws NotFoundError `leave_request_not_found`.
   * @throws InvalidRequestError `invalid_transition` for a request that is not approved,
   * `leave_not_started`, `invalid_last_date`, `reason_required` or `invalid_reason`.
   * @throws ConflictError `stale_version`.
   */
  endEarly(
    tenantId: string,
    id: string,
    input: EndLeaveEarlyInput,
  ): Promise<LeaveRequest> {
    return observe(
      this.logger,
      'leave_end_early',
      `${NAME}.endEarly`,
      async () => {
        const request = await this.load(tenantId, id)
        if (request.status !== 'approved') {
          throw new InvalidRequestError(
            'invalid_transition',
            'Only an approved leave can be ended early.',
          )
        }
        const reason = this.checkReason(input.reason)
        const { today } = await this.place.of(tenantId, request.employee_id)
        if (request.period.start > today) {
          throw new InvalidRequestError(
            'leave_not_started',
            'The leave has not started. Cancel it instead.',
          )
        }
        const lastDate = input.lastDate
        if (
          !isLocalDate(lastDate) ||
          lastDate < request.period.start ||
          lastDate >= request.period.end
        ) {
          throw new InvalidRequestError(
            'invalid_last_date',
            'The last date must be from the first day of the leave to the day before its end.',
          )
        }
        if (input.version !== undefined && input.version !== request.version) {
          throw this.stale()
        }
        const days = request.days.filter((day) => day.date <= lastDate)
        const total = totalOf(days)
        const removed = request.total_days - total
        try {
          return await withChangeReason(reason, () =>
            this.transactions.run(async () => {
              const updated = await this.requests.update(
                request.id,
                {
                  period: { start: request.period.start, end: lastDate },
                  half_days: { first: request.half_days.first, last: false },
                  days,
                  total_days: total,
                },
                { expectedVersion: request.version },
              )
              await this.giveBack(tenantId, updated, removed)
              await this.effects.onShortened(updated, lastDate)
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
   * Reverses days in the ledger, own days first and then carried-over days. A request without a
   * yearly entitlement posted nothing, so nothing is reversed.
   *
   * @param tenantId - Tenant of the caller.
   * @param request - The shortened request.
   * @param removed - The days no longer taken.
   */
  private async giveBack(
    tenantId: string,
    request: LeaveRequest,
    removed: number,
  ): Promise<void> {
    if (removed <= 0) {
      return
    }
    const held = heldDays(await this.ledger.findByRequest(tenantId, request.id))
    let left = Math.round(removed * 2)
    for (const bucket of ['own', 'carry_over'] as const) {
      for (const item of held.filter((entry) => entry.bucket === bucket)) {
        const give = Math.min(left, Math.round(item.days * 2))
        if (give <= 0) {
          continue
        }
        left -= give
        await this.ledger.append({
          tenant_id: tenantId,
          employee_id: request.employee_id,
          leave_type: item.leave_type,
          period: item.period,
          kind: 'reversal',
          days: give / 2,
          bucket: item.bucket,
          expires_on: null,
          source: { kind: 'request', ref_id: request.id, date: null },
          dedupe_key: null,
        })
      }
    }
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
