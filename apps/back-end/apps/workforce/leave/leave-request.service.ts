import { Inject, Injectable } from '@nestjs/common'
import { RepositoryConflictError } from '@utility/database/error'
import {
  TRANSACTION_MANAGER,
  type TransactionManager,
} from '@utility/database/transaction'
import { AppLogger } from '@utility/logger/service'
import { isLocalDate, todayUtc } from '@utility/validation/local-date'
import { type EmployeeRepository } from '@repository/interface/employee'
import { type EmploymentContractRepository } from '@repository/interface/employment-contract'
import { type HolidayCalendarRepository } from '@repository/interface/holiday-calendar'
import { type LeaveRequestRepository } from '@repository/interface/leave-request'
import { type LeaveRequestDetailRepository } from '@repository/interface/leave-request-detail'
import { type RosterAssignmentRepository } from '@repository/interface/roster-assignment'
import { type RosterRepository } from '@repository/interface/roster'
import { type ClosedDatePeriod } from '@repository/model/common/calendar'
import { type Coding } from '@repository/model/common/coding'
import { type Employee } from '@repository/model/employee'
import { type LeavePolicy } from '@repository/model/leave-policy'
import {
  type LeaveDay,
  type LeaveDeciders,
  type LeaveRequest,
  type LeaveRequestStatus,
} from '@repository/model/leave-request'
import {
  REPOSITORY_EMPLOYEE,
  REPOSITORY_EMPLOYMENT_CONTRACT,
  REPOSITORY_HOLIDAY_CALENDAR,
  REPOSITORY_LEAVE_REQUEST,
  REPOSITORY_LEAVE_REQUEST_DETAIL,
  REPOSITORY_ROSTER,
  REPOSITORY_ROSTER_ASSIGNMENT,
} from '@repository/token'
import { addDays } from '../assignment/assignment-rules'
import { CodeConceptService } from '../concept/code-concept.service'
import { systemSuffix } from '../concept/system-rules'
import { SeparationCalendar } from '../separation/separation-calendar'
import { observe } from '../observe'
import { ParameterService } from '../parameter/parameter.service'
import {
  ConflictError,
  ForbiddenError,
  InvalidRequestError,
  NotFoundError,
} from '../workforce.error'
import { countDays, totalOf } from './day-count'
import { LeaveDeciderService } from './decider'
import { entitlementPeriod } from './entitlement-period'
import {
  isFirstDecider,
  isRequester,
  leaveRequestNotFound,
} from './leave-access'
import { LeaveBalanceService } from './leave-balance.service'
import { type LeaveCaller } from './leave-caller'
import { LeavePlaceService, type LeavePlace } from './leave-place'
import { LeavePolicyService } from './leave-policy.service'
import {
  OPEN_STATUSES,
  checkPeriod,
  checkRequestDates,
  maxDaysOf,
  needsSecondStep,
} from './leave-request-rules'
import { serviceStart } from './service-start'

const NAME = 'LeaveRequestService'

/**
 * Longest reason of a request.
 */
const MAX_REASON_LENGTH = 1000

/**
 * The working week used when the parameter does not hold a list of ISO weekdays.
 */
const DEFAULT_WORKING_WEEK = [1, 2, 3, 4, 5]

/**
 * Most rosters of one unit read for a period of at most 366 days.
 */
const ROSTER_LIMIT = 100

/**
 * The dates of a leave request as sent.
 *
 * @property employeeId - The employee to request for, when HR requests on their behalf.
 * @property leaveType - The leave type.
 * @property start - First date.
 * @property end - Last date.
 * @property halfDays - A half first or last day; none when missing.
 */
export interface LeaveRequestInput {
  employeeId?: string
  leaveType: Coding
  start: string
  end: string
  halfDays?: { first: boolean; last: boolean }
}

/**
 * A new request.
 *
 * @property reason - The requester's reason, 1 to 1000 characters; kept apart (HR spec 14).
 */
export interface CreateLeaveRequestInput extends LeaveRequestInput {
  reason: string
}

/**
 * What a preview answers: the breakdown and the first rule broken, without writing.
 *
 * @property valid - Whether the request would be accepted now.
 * @property problem - The first rule broken, or `null`.
 * @property days - The day breakdown, as far as it could be worked out.
 * @property totalDays - The counted days, or `null` when no count was made.
 * @property entitlementPeriod - The period the days are charged to, or `null`.
 * @property available - Days left for a new request, or `null` when not checked.
 * @property deciders - Who would decide, or `null` when not reached.
 */
export interface LeavePreview {
  valid: boolean
  problem: { code: string; message: string } | null
  days: LeaveDay[]
  totalDays: number | null
  entitlementPeriod: ClosedDatePeriod | null
  available: number | null
  deciders: {
    first: { kind: LeaveDeciders['first']['kind']; unitId: string | null }
    second: boolean
  } | null
}

/**
 * Filters and paging of the request list.
 *
 * @property unitId - Only requests made from this unit.
 * @property employeeId - Only requests of this employee.
 * @property status - Only requests in this status.
 * @property from - Only requests whose period reaches this date or later.
 * @property to - Only requests whose period starts on or before this date.
 * @property waitingForMe - Only requests that wait for the caller's decision; the other filters are
 * not applied.
 * @property proofOverdue - Only requests whose proof is overdue today.
 * @property limit - Page size.
 * @property offset - Items to skip.
 */
export interface ListLeaveRequestsQuery {
  unitId?: string
  employeeId?: string
  status?: LeaveRequestStatus
  from?: string
  to?: string
  waitingForMe?: boolean
  proofOverdue?: boolean
  limit?: number
  offset?: number
}

/**
 * Filters and paging of an employee's own requests.
 */
export type ListOwnLeaveRequestsQuery = Pick<
  ListLeaveRequestsQuery,
  'status' | 'from' | 'to' | 'limit' | 'offset'
>

/**
 * Everything worked out for a request, kept as far as it got.
 */
interface Evaluation {
  employee: Employee
  place: LeavePlace
  policy: LeavePolicy
  days: LeaveDay[]
  totalDays: number
  entitlementPeriod: ClosedDatePeriod | null
  available: number | null
  deciders: LeaveDeciders
  proofDueOn: string | null
}

/**
 * Leave requests (HR plan 8.3, part B1): preview, create, and read. The first rule broken refuses a
 * request, in the order of HR plan 8.3 LR1 to LR6. The reason is kept in the separate detail and
 * never shown here or logged.
 */
@Injectable()
export class LeaveRequestService {
  /**
   * @param requests - Leave request repository.
   * @param details - Leave request detail repository.
   * @param employees - Employee repository.
   * @param contracts - Employment contract repository, for the employment type and service.
   * @param rosters - Roster repository, for the dates a roster covers.
   * @param rosterAssignments - Roster assignment repository, for the requester's shifts.
   * @param calendars - Holiday calendar repository, for holidays and collective leave days.
   * @param concepts - Code concepts, for the leave type.
   * @param policies - Leave policies.
   * @param balances - Leave balances, for the days available.
   * @param place - Finds the requester's unit, facility and today.
   * @param decider - Chooses who decides the first step.
   * @param parameters - HR parameters, for the working week.
   * @param transactions - Transaction manager, so a request and its detail are written together.
   * @param logger - Logger of this service.
   */
  constructor(
    @Inject(REPOSITORY_LEAVE_REQUEST)
    private readonly requests: LeaveRequestRepository,
    @Inject(REPOSITORY_LEAVE_REQUEST_DETAIL)
    private readonly details: LeaveRequestDetailRepository,
    @Inject(REPOSITORY_EMPLOYEE) private readonly employees: EmployeeRepository,
    @Inject(REPOSITORY_EMPLOYMENT_CONTRACT)
    private readonly contracts: EmploymentContractRepository,
    @Inject(REPOSITORY_ROSTER) private readonly rosters: RosterRepository,
    @Inject(REPOSITORY_ROSTER_ASSIGNMENT)
    private readonly rosterAssignments: RosterAssignmentRepository,
    @Inject(REPOSITORY_HOLIDAY_CALENDAR)
    private readonly calendars: HolidayCalendarRepository,
    @Inject(CodeConceptService) private readonly concepts: CodeConceptService,
    @Inject(LeavePolicyService) private readonly policies: LeavePolicyService,
    @Inject(LeaveBalanceService) private readonly balances: LeaveBalanceService,
    @Inject(LeavePlaceService) private readonly place: LeavePlaceService,
    @Inject(LeaveDeciderService) private readonly decider: LeaveDeciderService,
    @Inject(ParameterService) private readonly parameters: ParameterService,
    @Inject(TRANSACTION_MANAGER)
    private readonly transactions: TransactionManager,
    @Inject(SeparationCalendar) private readonly separation: SeparationCalendar,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /**
   * Answers what a request would be, without writing anything: the day breakdown, the entitlement,
   * the days available and the deciders, or the first rule it breaks. Writes no log entry.
   *
   * @param tenantId - Tenant of the caller.
   * @param caller - The caller.
   * @param input - The request.
   * @returns The preview.
   * @throws NotFoundError `employee_not_found`.
   * @throws ForbiddenError `employee_required` or `permission_required`.
   */
  async preview(
    tenantId: string,
    caller: LeaveCaller,
    input: LeaveRequestInput,
  ): Promise<LeavePreview> {
    const requesterId = this.requester(caller, input.employeeId)
    const partial: Partial<Evaluation> = {}
    let problem: LeavePreview['problem'] = null
    try {
      await this.evaluate(tenantId, requesterId, input, partial)
    } catch (error: unknown) {
      if (
        !(error instanceof InvalidRequestError || error instanceof ConflictError)
      ) {
        throw error
      }
      problem = { code: error.code, message: error.message }
    }
    return {
      valid: problem === null,
      problem,
      days: partial.days ?? [],
      totalDays: partial.totalDays ?? null,
      entitlementPeriod: partial.entitlementPeriod ?? null,
      available: partial.available ?? null,
      deciders: partial.deciders
        ? {
            first: {
              kind: partial.deciders.first.kind,
              unitId: partial.deciders.first.unit_id,
            },
            second: partial.deciders.second,
          }
        : null,
    }
  }

  /**
   * Makes a leave request and its detail (HR plan 8.3 LR1 to LR6). The request starts `requested`
   * with its days reserved. The overlap check reads then writes, so two simultaneous requests can
   * both pass.
   *
   * @param tenantId - Tenant of the caller.
   * @param caller - The caller.
   * @param input - The request.
   * @returns The created request, without the reason.
   * @throws NotFoundError `employee_not_found`.
   * @throws ForbiddenError `employee_required` or `permission_required`.
   * @throws InvalidRequestError `reason_required`, `invalid_reason`, `employee_not_assignable`,
   * `invalid_leave_type`, `no_policy`, `employment_type_not_allowed`, `invalid_period`,
   * `period_too_long`, `notice_too_short`, `too_late`, `half_day_not_allowed`, `invalid_half_days`,
   * `too_many_days`, `crosses_period`, `insufficient_balance`, `no_service` and the concept
   * service's `unknown_code`, `code_retired` or `code_not_in_period`.
   * @throws ConflictError `leave_overlaps`.
   */
  create(
    tenantId: string,
    caller: LeaveCaller,
    input: CreateLeaveRequestInput,
  ): Promise<LeaveRequest> {
    return observe(
      this.logger,
      'leave_request_create',
      `${NAME}.create`,
      async () => {
        const requesterId = this.requester(caller, input.employeeId)
        const reason = this.checkReason(input.reason)
        const evaluation = await this.evaluate(tenantId, requesterId, input, {})
        const { employee, place, policy } = evaluation
        try {
          return await this.transactions.run(async () => {
            const request = await this.requests.create({
              tenant_id: tenantId,
              employee_id: employee.id,
              unit_id: place.unit?.id ?? null,
              facility_id: place.facility?.id ?? null,
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
              period: { start: input.start, end: input.end },
              half_days: {
                first: input.halfDays?.first ?? false,
                last: input.halfDays?.last ?? false,
              },
              days: evaluation.days,
              total_days: evaluation.totalDays,
              entitlement_period: evaluation.entitlementPeriod,
              deciders: evaluation.deciders,
              replacement: null,
              decisions: [],
              status: 'requested',
              status_since: new Date(),
              proof_due_on: evaluation.proofDueOn,
              proof_received: false,
              cover: null,
            })
            await this.details.create({
              tenant_id: tenantId,
              request_id: request.id,
              employee_id: employee.id,
              reason,
              proof: null,
            })
            return request
          })
        } catch (error: unknown) {
          if (error instanceof RepositoryConflictError) {
            throw new ConflictError(
              'leave_overlaps',
              'The request was changed by someone else. Try again.',
            )
          }
          throw error
        }
      },
    )
  }

  /**
   * Lists requests. A holder of `workforce.leave-request:read` lists every request of the tenant
   * with the filters; anyone may ask for what waits for their own decision (`waitingForMe`): a Head
   * with `workforce.leave-request:decide` the requests of the units they head, HR Manager the first
   * steps that fall to HR and every second step. Writes no log entry (a read).
   *
   * @param tenantId - Tenant of the caller.
   * @param caller - The caller.
   * @param query - Filters and paging.
   * @returns The requests, latest first, without reasons or proofs.
   * @throws ForbiddenError `permission_required`.
   */
  async list(
    tenantId: string,
    caller: LeaveCaller,
    query: ListLeaveRequestsQuery,
  ): Promise<LeaveRequest[]> {
    if (query.waitingForMe) {
      const unitIds =
        caller.canDecide && caller.employeeId
          ? await this.decider.headedUnits(tenantId, caller.employeeId)
          : []
      return this.requests.findWaiting(
        tenantId,
        { unitIds, hr: caller.canApproveHr },
        query.limit ?? 10,
        query.offset ?? 0,
      )
    }
    if (!caller.canRead) {
      throw new ForbiddenError(
        'permission_required',
        'You do not have permission to list leave requests.',
      )
    }
    return this.requests.findByFilter(tenantId, {
      employeeId: query.employeeId,
      unitId: query.unitId,
      status: query.status,
      from: query.from,
      to: query.to,
      proofOverdueBefore: query.proofOverdue ? todayUtc() : undefined,
      limit: query.limit,
      offset: query.offset,
    })
  }

  /**
   * Lists the signed-in employee's own requests, latest first. Writes no log entry (a read).
   *
   * @param tenantId - Tenant of the caller.
   * @param caller - The caller.
   * @param query - Filters and paging.
   * @returns The requests, without reasons or proofs.
   * @throws ForbiddenError `employee_required`.
   */
  async listOwn(
    tenantId: string,
    caller: LeaveCaller,
    query: ListOwnLeaveRequestsQuery,
  ): Promise<LeaveRequest[]> {
    if (caller.employeeId === null) {
      throw new ForbiddenError(
        'employee_required',
        'This needs an account linked to an employee.',
      )
    }
    return this.requests.findByFilter(tenantId, {
      employeeId: caller.employeeId,
      status: query.status,
      from: query.from,
      to: query.to,
      limit: query.limit,
      offset: query.offset,
    })
  }

  /**
   * Reads one request, without the reason and the proof. The requester, the Head who has to decide
   * it, HR Manager and a holder of `workforce.leave-request:read` may; everyone else gets the answer
   * of a missing request. Writes no log entry (a read).
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Request identifier.
   * @param caller - The caller.
   * @returns The request.
   * @throws NotFoundError `leave_request_not_found`.
   */
  async get(
    tenantId: string,
    id: string,
    caller: LeaveCaller,
  ): Promise<LeaveRequest> {
    const request = await this.requests.findOne(id)
    if (!request || request.tenant_id !== tenantId || request.deleted_at) {
      throw leaveRequestNotFound()
    }
    if (
      !(
        caller.canRead ||
        caller.canApproveHr ||
        isRequester(caller, request) ||
        (await isFirstDecider(this.decider, tenantId, caller, request))
      )
    ) {
      throw leaveRequestNotFound()
    }
    return request
  }

  /**
   * Finds who the request is for: the caller's own employee, or the employee HR names when the
   * caller may write on their behalf.
   *
   * @param caller - The caller.
   * @param employeeId - The employee named, if any.
   * @returns The employee identifier.
   * @throws ForbiddenError `employee_required` or `permission_required`.
   */
  private requester(caller: LeaveCaller, employeeId: string | undefined): string {
    if (employeeId === undefined || employeeId === caller.employeeId) {
      if (caller.employeeId === null) {
        throw new ForbiddenError(
          'employee_required',
          'This needs an account linked to an employee.',
        )
      }
      return caller.employeeId
    }
    if (!caller.canWrite) {
      throw new ForbiddenError(
        'permission_required',
        'You do not have permission to request leave for another employee.',
      )
    }
    return employeeId
  }

  /**
   * Checks and trims the reason.
   *
   * @param reason - The reason as sent.
   * @returns The reason.
   * @throws InvalidRequestError `reason_required` or `invalid_reason`.
   */
  private checkReason(reason: unknown): string {
    const text = typeof reason === 'string' ? reason.trim() : ''
    if (text.length === 0) {
      throw new InvalidRequestError('reason_required', 'A request needs a reason.')
    }
    if (text.length > MAX_REASON_LENGTH) {
      throw new InvalidRequestError(
        'invalid_reason',
        'The reason must have at most 1000 characters.',
      )
    }
    return text
  }

  /**
   * Works a request out and refuses it at the first rule it breaks (HR plan 8.3 LR1 to LR6). What
   * was worked out before the refusal is kept in `partial`, so a preview can show it.
   *
   * @param tenantId - Tenant of the caller.
   * @param requesterId - The employee the request is for.
   * @param input - The request.
   * @param partial - Receives what is worked out, step by step.
   * @returns Everything worked out.
   */
  private async evaluate(
    tenantId: string,
    requesterId: string,
    input: LeaveRequestInput,
    partial: Partial<Evaluation>,
  ): Promise<Evaluation> {
    const employee = await this.loadEmployee(tenantId, requesterId)
    partial.employee = employee
    if (
      employee.employment_status !== 'probation' &&
      employee.employment_status !== 'active'
    ) {
      throw new InvalidRequestError(
        'employee_not_assignable',
        'Only an employee on probation or active can request leave.',
      )
    }
    await this.separation.assertCanPlan(tenantId, requesterId, input.end)
    if (systemSuffix(input.leaveType.system) !== 'leave-type') {
      throw new InvalidRequestError(
        'invalid_leave_type',
        'The leave type must be a code of a leave type system.',
      )
    }
    await this.concepts.assertActive(tenantId, input.leaveType)
    checkPeriod(input.start, input.end)
    const place = await this.place.of(tenantId, employee.id)
    partial.place = place
    const policy = await this.policies.inForce(
      tenantId,
      input.leaveType,
      input.start,
    )
    if (!policy) {
      throw new InvalidRequestError(
        'no_policy',
        'No leave policy is in force for this leave type on that date.',
      )
    }
    partial.policy = policy
    await this.checkEmploymentType(tenantId, employee.id, policy)
    const halfDays = {
      first: input.halfDays?.first ?? false,
      last: input.halfDays?.last ?? false,
    }
    checkRequestDates({
      start: input.start,
      end: input.end,
      halfDays,
      policy: {
        noticeDays: policy.notice_days,
        retroactiveDays: policy.retroactive_days,
        halfDays: policy.half_days,
      },
      today: place.today,
    })
    const clash = await this.requests.findOverlapping(
      tenantId,
      employee.id,
      input.start,
      input.end,
      OPEN_STATUSES,
    )
    if (clash.length > 0) {
      throw new ConflictError(
        'leave_overlaps',
        'The employee already has a leave request on one of these dates.',
      )
    }
    const days = await this.count(tenantId, employee.id, place, policy, input, halfDays)
    partial.days = days
    const totalDays = totalOf(days)
    partial.totalDays = totalDays
    if (totalDays > maxDaysOf(policy)) {
      throw new InvalidRequestError(
        'too_many_days',
        'The request counts more days than this leave type allows.',
      )
    }
    const entitlement = await this.checkEntitlement(
      tenantId,
      employee.id,
      policy,
      input,
      totalDays,
      place.today,
      partial,
    )
    const deciders: LeaveDeciders = {
      first: await this.decider.chooseFirst(tenantId, employee.id, place.unit),
      second: needsSecondStep(policy.approval, totalDays),
    }
    partial.deciders = deciders
    return {
      employee,
      place,
      policy,
      days,
      totalDays,
      entitlementPeriod: entitlement,
      available: partial.available ?? null,
      deciders,
      proofDueOn: policy.proof ? addDays(input.start, policy.proof.due_days) : null,
    }
  }

  /**
   * Checks the employment type of the employee against the policy.
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - The employee.
   * @param policy - The policy in force.
   * @throws InvalidRequestError `employment_type_not_allowed`.
   */
  async checkEmploymentType(
    tenantId: string,
    employeeId: string,
    policy: LeavePolicy,
  ): Promise<void> {
    if (policy.employment_types.length === 0) {
      return
    }
    const contract = await this.contracts.findActiveByEmployee(tenantId, employeeId)
    const type = contract?.employment_type
    if (
      !type ||
      !policy.employment_types.some(
        (allowed) => allowed.system === type.system && allowed.code === type.code,
      )
    ) {
      throw new InvalidRequestError(
        'employment_type_not_allowed',
        'This leave type is not open to the employee\'s employment type.',
      )
    }
  }

  /**
   * Checks the entitlement of a yearly policy: the request stays inside one period and the days are
   * available, counting the days other requests hold (HR plan 8.3 LR5).
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - The employee.
   * @param policy - The policy in force.
   * @param input - The request.
   * @param totalDays - The counted days.
   * @param today - Today in the employee's zone.
   * @param partial - Receives the entitlement and the days available.
   * @param excludeRequestId - A request whose reservation is not counted: the one being decided or
   * changed.
   * @returns The entitlement period, or `null` for a policy without a yearly balance.
   * @throws InvalidRequestError `no_service`, `crosses_period` or `insufficient_balance`.
   */
  async checkEntitlement(
    tenantId: string,
    employeeId: string,
    policy: LeavePolicy,
    input: LeaveRequestInput,
    totalDays: number,
    today: string,
    partial: Partial<Evaluation> = {},
    excludeRequestId?: string,
  ): Promise<ClosedDatePeriod | null> {
    const rule = policy.balance
    if (rule.kind !== 'period') {
      return null
    }
    const start = serviceStart(
      await this.contracts.findByEmployee(tenantId, employeeId),
      today,
    )
    if (start === null) {
      throw new InvalidRequestError(
        'no_service',
        'The employee has no contract in force.',
      )
    }
    const period = entitlementPeriod(rule.period, start, input.start)
    partial.entitlementPeriod = period
    if (input.end > period.end) {
      throw new InvalidRequestError(
        'crosses_period',
        'A leave cannot run past the end of its entitlement period. Make two requests.',
      )
    }
    const summary = await this.balances.summary(
      tenantId,
      employeeId,
      input.leaveType,
      period.start,
      excludeRequestId,
    )
    partial.available = summary.available
    if (totalDays > summary.available) {
      throw new InvalidRequestError(
        'insufficient_balance',
        'The request counts more days than are available.',
      )
    }
    return period
  }

  /**
   * Counts the days of a leave from the roster, the working week and the holidays (HR spec 9.4.6).
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - The employee.
   * @param place - The employee's unit and facility.
   * @param policy - The policy in force.
   * @param input - The request.
   * @param halfDays - A half first or last day.
   * @returns The day breakdown.
   */
  private async count(
    tenantId: string,
    employeeId: string,
    place: LeavePlace,
    policy: LeavePolicy,
    input: LeaveRequestInput,
    halfDays: { first: boolean; last: boolean },
  ): Promise<LeaveDay[]> {
    const base = {
      counting: policy.counting,
      start: input.start,
      end: input.end,
      halfDays,
    }
    if (policy.counting === 'calendar_days') {
      return countDays({
        ...base,
        rosterDays: new Map(),
        workingWeek: [],
        holidays: new Map(),
      })
    }
    return countDays({
      ...base,
      rosterDays: await this.rosterDays(tenantId, employeeId, place, input),
      workingWeek: await this.workingWeek(tenantId, place, input.start),
      holidays: await this.holidays(tenantId, place, input),
    })
  }

  /**
   * Finds, for the dates a roster of the employee's unit covers, whether the employee has a planned
   * working shift. A closed roster is a past period and is not read.
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - The employee.
   * @param place - The employee's unit and facility.
   * @param input - The request.
   * @returns Working or not, by covered date.
   */
  private async rosterDays(
    tenantId: string,
    employeeId: string,
    place: LeavePlace,
    input: LeaveRequestInput,
  ): Promise<Map<string, boolean>> {
    const covered = new Map<string, boolean>()
    if (!place.unit) {
      return covered
    }
    const rosters = (
      await this.rosters.findByFilter(tenantId, {
        unitId: place.unit.id,
        from: input.start,
        to: input.end,
        limit: ROSTER_LIMIT,
      })
    ).filter((roster) => roster.status !== 'closed')
    if (rosters.length === 0) {
      return covered
    }
    const planned = await this.rosterAssignments.findPlannedByEmployeeBetween(
      tenantId,
      employeeId,
      input.start,
      input.end,
    )
    const working = new Set(
      planned
        .filter((assignment) => assignment.shift.type !== 'off')
        .map((assignment) => assignment.date),
    )
    for (const roster of rosters) {
      const first = roster.period.start > input.start ? roster.period.start : input.start
      const last = roster.period.end < input.end ? roster.period.end : input.end
      for (let date = first; date <= last; date = addDays(date, 1)) {
        covered.set(date, working.has(date))
      }
    }
    return covered
  }

  /**
   * Reads the working week of the facility.
   *
   * @param tenantId - Tenant of the caller.
   * @param place - The employee's unit and facility.
   * @param date - The first date of the leave.
   * @returns ISO weekdays; the default week when the value is not a list of weekdays.
   */
  private async workingWeek(
    tenantId: string,
    place: LeavePlace,
    date: string,
  ): Promise<number[]> {
    const { value } = await this.parameters.resolve(tenantId, {
      key: 'LEAVE_WORKING_WEEK',
      ...(place.facility ? { facilityId: place.facility.id } : {}),
      date,
    })
    return Array.isArray(value) &&
      value.length > 0 &&
      value.every((day) => Number.isInteger(day) && day >= 1 && day <= 7)
      ? (value as number[])
      : DEFAULT_WORKING_WEEK
  }

  /**
   * Reads the facility's holidays inside the leave. A collective leave day wins over a public or
   * local one on the same date.
   *
   * @param tenantId - Tenant of the caller.
   * @param place - The employee's unit and facility.
   * @param input - The request.
   * @returns The holidays by date.
   */
  private async holidays(
    tenantId: string,
    place: LeavePlace,
    input: LeaveRequestInput,
  ): Promise<Map<string, 'public' | 'local' | 'collective_leave'>> {
    const holidays = new Map<string, 'public' | 'local' | 'collective_leave'>()
    if (!place.facility) {
      return holidays
    }
    const firstYear = Number(input.start.slice(0, 4))
    const lastYear = Number(input.end.slice(0, 4))
    for (const code of place.facility.holiday_calendar_codes) {
      for (let year = firstYear; year <= lastYear; year += 1) {
        const calendar = await this.calendars.findByCodeAndYear(tenantId, code, year)
        for (const holiday of calendar?.holidays ?? []) {
          if (
            holiday.status === 'active' &&
            holiday.date >= input.start &&
            holiday.date <= input.end &&
            (!holidays.has(holiday.date) || holiday.kind === 'collective_leave')
          ) {
            holidays.set(holiday.date, holiday.kind)
          }
        }
      }
    }
    return holidays
  }

  /**
   * Loads an employee of the caller's tenant.
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - The employee.
   * @returns The employee.
   * @throws NotFoundError `employee_not_found`.
   */
  private async loadEmployee(
    tenantId: string,
    employeeId: string,
  ): Promise<Employee> {
    const employee = isLocalDate(employeeId) ? null : await this.employees.findOne(employeeId)
    if (!employee || employee.tenant_id !== tenantId || employee.deleted_at) {
      throw new NotFoundError('employee_not_found', 'The employee was not found.')
    }
    return employee
  }
}
