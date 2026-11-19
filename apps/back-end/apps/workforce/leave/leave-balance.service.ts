import { Inject, Injectable } from '@nestjs/common'
import { withChangeReason } from '@utility/history/reason'
import { AppLogger } from '@utility/logger/service'
import { isLocalDate } from '@utility/validation/local-date'
import { type EmployeeRepository } from '@repository/interface/employee'
import { type EmploymentContractRepository } from '@repository/interface/employment-contract'
import {
  type LeaveLedgerQuery,
  type LeaveLedgerRepository,
} from '@repository/interface/leave-ledger'
import { type ClosedDatePeriod } from '@repository/model/common/calendar'
import { type Coding } from '@repository/model/common/coding'
import { type LeaveLedgerEntry } from '@repository/model/leave-ledger-entry'
import {
  REPOSITORY_EMPLOYEE,
  REPOSITORY_EMPLOYMENT_CONTRACT,
  REPOSITORY_LEAVE_LEDGER,
} from '@repository/token'
import { systemSuffix } from '../concept/system-rules'
import { observe } from '../observe'
import {
  ForbiddenError,
  InvalidRequestError,
  NotFoundError,
} from '../workforce.error'
import { summarizeBalance, type LeaveBalanceSummary } from './balance'
import { entitlementPeriod } from './entitlement-period'
import { isHalfSteps } from './leave-policy-rules'
import { LeavePlaceService } from './leave-place'
import { LeavePolicyService } from './leave-policy.service'
import { serviceStart } from './service-start'

const NAME = 'LeaveBalanceService'

/**
 * Most days one HR adjustment may add or remove.
 */
const MAX_ADJUSTMENT_DAYS = 366

/**
 * Longest reason of an adjustment.
 */
const MAX_REASON_LENGTH = 500

/**
 * Most leave policies read to find the types with a balance.
 */
const POLICY_LIMIT = 100

/**
 * The balance of one leave type in one entitlement period.
 *
 * @property leaveType - The leave type.
 * @property period - The entitlement period that holds the date asked for.
 */
export interface LeaveBalanceView extends LeaveBalanceSummary {
  leaveType: Coding
  period: ClosedDatePeriod
}

/**
 * Data of an HR adjustment.
 *
 * @property leaveType - The leave type.
 * @property periodStart - First day of the entitlement period to adjust.
 * @property days - Days to add (positive) or remove (negative), in steps of 0.5.
 * @property reason - Why, kept in the change history.
 */
export interface AdjustLeaveInput {
  leaveType: Coding
  periodStart: string
  days: number
  reason: string
}

/**
 * Leave balances (HR plan 8.2): the balance per leave type, the ledger behind it, and HR
 * adjustments. A balance is summed from the ledger on every read; nothing is stored as a number.
 */
@Injectable()
export class LeaveBalanceService {
  /**
   * @param employees - Employee repository.
   * @param contracts - Employment contract repository, for the start of continuous service.
   * @param ledger - Leave ledger repository.
   * @param policies - Leave policies, for the types with a balance.
   * @param place - Finds today in the employee's time zone.
   * @param logger - Logger of this service.
   */
  constructor(
    @Inject(REPOSITORY_EMPLOYEE) private readonly employees: EmployeeRepository,
    @Inject(REPOSITORY_EMPLOYMENT_CONTRACT)
    private readonly contracts: EmploymentContractRepository,
    @Inject(REPOSITORY_LEAVE_LEDGER)
    private readonly ledger: LeaveLedgerRepository,
    @Inject(LeavePolicyService) private readonly policies: LeavePolicyService,
    @Inject(LeavePlaceService) private readonly place: LeavePlaceService,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /**
   * Answers the balance of every leave type that has a `period` policy in force on a date, for the
   * entitlement period that holds the date. An employee with no contract in force today has none.
   * Writes no log entry (a read).
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - The employee.
   * @param onDate - A local date; today in the employee's zone when omitted.
   * @returns The balances, ordered by leave type code.
   * @throws NotFoundError `employee_not_found`.
   * @throws InvalidRequestError `invalid_date`.
   */
  async balances(
    tenantId: string,
    employeeId: string,
    onDate?: string,
  ): Promise<LeaveBalanceView[]> {
    await this.loadEmployee(tenantId, employeeId)
    if (onDate !== undefined && !isLocalDate(onDate)) {
      throw new InvalidRequestError('invalid_date', 'The date is not valid.')
    }
    const { today } = await this.place.of(tenantId, employeeId)
    const date = onDate ?? today
    const start = serviceStart(
      await this.contracts.findByEmployee(tenantId, employeeId),
      today,
    )
    if (start === null) {
      return []
    }
    const views: LeaveBalanceView[] = []
    const inForce = await this.policies.list(tenantId, {
      onDate: date,
      limit: POLICY_LIMIT,
    })
    // One after another: the reads share one request and stay in a stable order.
    for (const policy of inForce) {
      const rule = policy.balance
      if (rule.kind !== 'period') {
        continue
      }
      const period = entitlementPeriod(rule.period, start, date)
      const entries = await this.ledger.findByEmployeeTypeAndPeriod(
        tenantId,
        employeeId,
        policy.leave_type,
        period.start,
      )
      views.push({
        leaveType: { ...policy.leave_type },
        period,
        ...summarizeBalance(entries, 0),
      })
    }
    return views
  }

  /**
   * Answers the balances of the signed-in employee. Needs an account linked to an employee. Writes no
   * log entry (a read).
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - The employee linked to the account, or `null`.
   * @param onDate - A local date; today in the employee's zone when omitted.
   * @returns The balances.
   * @throws ForbiddenError `employee_required`.
   */
  ownBalances(
    tenantId: string,
    employeeId: string | null,
    onDate?: string,
  ): Promise<LeaveBalanceView[]> {
    if (employeeId === null) {
      throw new ForbiddenError(
        'employee_required',
        'This needs an account linked to an employee.',
      )
    }
    return this.balances(tenantId, employeeId, onDate)
  }

  /**
   * Answers the balance of one leave type and entitlement period. The leave request services of 8.3
   * use it with `planUse` (`./balance`). Writes no log entry (a read).
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - The employee.
   * @param leaveType - The leave type.
   * @param periodStart - First day of the entitlement period.
   * @returns The balance; `pending` is 0 until requests exist (8.3).
   */
  async summary(
    tenantId: string,
    employeeId: string,
    leaveType: Coding,
    periodStart: string,
  ): Promise<LeaveBalanceSummary> {
    const entries = await this.ledger.findByEmployeeTypeAndPeriod(
      tenantId,
      employeeId,
      leaveType,
      periodStart,
    )
    return summarizeBalance(entries, 0)
  }

  /**
   * Lists the ledger entries of an employee, oldest first. Writes no log entry (a read).
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - The employee.
   * @param query - Optional filters and paging.
   * @returns The entries.
   * @throws NotFoundError `employee_not_found`.
   */
  async ledgerOf(
    tenantId: string,
    employeeId: string,
    query: LeaveLedgerQuery,
  ): Promise<LeaveLedgerEntry[]> {
    await this.loadEmployee(tenantId, employeeId)
    return this.ledger.findByEmployee(tenantId, employeeId, query)
  }

  /**
   * HR Manager adds or removes days with a reason (HR plan 8.2 LB7). The days go into an existing
   * period (one the employee has a grant for) as an `adjustment` entry, and may take the balance
   * below zero (`HR-LEV-032`). The reason is kept in the change history, not in the entry.
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - The employee.
   * @param input - Leave type, period, days and reason.
   * @returns The new entry.
   * @throws NotFoundError `employee_not_found`.
   * @throws InvalidRequestError `invalid_days`, `reason_required`, `invalid_reason`,
   * `invalid_leave_type` or `period_not_found`.
   */
  adjust(
    tenantId: string,
    employeeId: string,
    input: AdjustLeaveInput,
  ): Promise<LeaveLedgerEntry> {
    return observe(this.logger, 'leave_adjust', `${NAME}.adjust`, async () => {
      await this.loadEmployee(tenantId, employeeId)
      if (
        !isHalfSteps(Math.abs(input.days), 0.5, MAX_ADJUSTMENT_DAYS)
      ) {
        throw new InvalidRequestError(
          'invalid_days',
          'The days must be a multiple of 0.5, not zero, and at most 366 in size.',
        )
      }
      const reason = typeof input.reason === 'string' ? input.reason.trim() : ''
      if (reason.length === 0) {
        throw new InvalidRequestError(
          'reason_required',
          'An adjustment needs a reason.',
        )
      }
      if (reason.length > MAX_REASON_LENGTH) {
        throw new InvalidRequestError(
          'invalid_reason',
          'The reason must have at most 500 characters.',
        )
      }
      if (systemSuffix(input.leaveType.system) !== 'leave-type') {
        throw new InvalidRequestError(
          'invalid_leave_type',
          'The leave type must be a code of a leave type system.',
        )
      }
      const entries = await this.ledger.findByEmployeeTypeAndPeriod(
        tenantId,
        employeeId,
        input.leaveType,
        input.periodStart,
      )
      const grant = entries.find((entry) => entry.kind === 'grant')
      if (!grant) {
        throw new InvalidRequestError(
          'period_not_found',
          'The employee has no entitlement for this leave type and period.',
        )
      }
      return withChangeReason(reason, () =>
        this.ledger.append({
          tenant_id: tenantId,
          employee_id: employeeId,
          leave_type: {
            system: input.leaveType.system,
            code: input.leaveType.code,
          },
          period: { start: grant.period.start, end: grant.period.end },
          kind: 'adjustment',
          days: input.days,
          bucket: 'own',
          expires_on: null,
          source: { kind: 'adjustment', ref_id: null, date: null },
          dedupe_key: null,
        }),
      )
    })
  }

  /**
   * Loads an employee of the caller's tenant.
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - The employee.
   * @throws NotFoundError `employee_not_found`.
   */
  private async loadEmployee(
    tenantId: string,
    employeeId: string,
  ): Promise<void> {
    const employee = await this.employees.findOne(employeeId)
    if (!employee || employee.tenant_id !== tenantId || employee.deleted_at) {
      throw new NotFoundError(
        'employee_not_found',
        'The employee was not found.',
      )
    }
  }
}
