import { randomUUID } from 'node:crypto'
import { Inject, Injectable } from '@nestjs/common'
import {
  RepositoryConflictError,
  RepositoryError,
} from '@utility/database/error'
import {
  TRANSACTION_MANAGER,
  type TransactionManager,
} from '@utility/database/transaction'
import { systemActor } from '@utility/history/actor'
import { withChangeReason } from '@utility/history/reason'
import { runWithRequestContext } from '@utility/logger/context'
import { todayUtc } from '@utility/validation/local-date'
import { type EmploymentContractRepository } from '@repository/interface/employment-contract'
import { type FacilityRepository } from '@repository/interface/facility'
import { type HolidayCalendarRepository } from '@repository/interface/holiday-calendar'
import { type LeaveLedgerRepository } from '@repository/interface/leave-ledger'
import { type LeavePolicyRepository } from '@repository/interface/leave-policy'
import { type PositionAssignmentRepository } from '@repository/interface/position-assignment'
import { type RosterAssignmentRepository } from '@repository/interface/roster-assignment'
import { type EmploymentContract } from '@repository/model/employment-contract'
import { type HolidayCalendar } from '@repository/model/holiday-calendar'
import { type LeavePolicy } from '@repository/model/leave-policy'
import { type PositionAssignment } from '@repository/model/position-assignment'
import {
  REPOSITORY_EMPLOYMENT_CONTRACT,
  REPOSITORY_FACILITY,
  REPOSITORY_HOLIDAY_CALENDAR,
  REPOSITORY_LEAVE_LEDGER,
  REPOSITORY_LEAVE_POLICY,
  REPOSITORY_POSITION_ASSIGNMENT,
  REPOSITORY_ROSTER_ASSIGNMENT,
} from '@repository/token'
import { addDays } from '../credentialing/appointment-rules'
import { planUse, summarizeBalance } from '../leave/balance'
import { entitlementPeriod } from '../leave/entitlement-period'
import { versionsInForce } from '../leave/policy-in-force'
import { serviceStart } from '../leave/service-start'
import { type HrJob, type JobPassResult } from './job'

/**
 * System actor of the job, as written in the change history.
 */
const ACTOR = 'collective-leave-job'

/**
 * Reason kept with each deduction.
 */
const REASON = 'collective_leave'

/**
 * Days looked back, so a day the worker was down is caught up (plan 8.2 LB5).
 */
const LOOKBACK_DAYS = 7

/**
 * Assignments read per page.
 */
const PAGE_SIZE = 200

/**
 * Most facilities of one tenant that use one calendar.
 */
const FACILITY_LIMIT = 500

/**
 * Most policy versions read for one tenant.
 */
const POLICY_LIMIT = 1000

/**
 * Takes collective leave days (*cuti bersama*) from the leave balance (HR spec 9.4.2, `HR-LEV-031`,
 * plan 8.2 LB5). For each collective leave day of the last 7 days in a tenant's holiday calendar, it
 * posts one day of use for each employee whose open primary assignment is in a facility that uses the
 * calendar, when the policy in force that day takes collective leave from the balance, the employee
 * was employed that day with an allowed employment type, had no planned working shift (a day off does
 * not count) and has at least a day left, so a balance never goes below zero. Carried-over days are
 * used first. Each use has a unique key, so a second pass posts nothing. Only tenant calendars are
 * read: platform calendars are not built. Each deduction is its own write with its tenant, a system
 * actor and its own correlation id.
 */
@Injectable()
export class CollectiveLeaveJob implements HrJob {
  readonly name = 'collective-leave'

  /**
   * @param calendars - Holiday calendar repository.
   * @param facilities - Facility repository.
   * @param assignments - Position assignment repository, for the staff of a facility.
   * @param contracts - Employment contract repository, for service and employment type.
   * @param rosterAssignments - Roster assignment repository, to see who worked.
   * @param policies - Leave policy repository.
   * @param ledger - Leave ledger repository.
   * @param transactions - Transaction manager, so a day split over two kinds posts together.
   */
  constructor(
    @Inject(REPOSITORY_HOLIDAY_CALENDAR)
    private readonly calendars: HolidayCalendarRepository,
    @Inject(REPOSITORY_FACILITY)
    private readonly facilities: FacilityRepository,
    @Inject(REPOSITORY_POSITION_ASSIGNMENT)
    private readonly assignments: PositionAssignmentRepository,
    @Inject(REPOSITORY_EMPLOYMENT_CONTRACT)
    private readonly contracts: EmploymentContractRepository,
    @Inject(REPOSITORY_ROSTER_ASSIGNMENT)
    private readonly rosterAssignments: RosterAssignmentRepository,
    @Inject(REPOSITORY_LEAVE_POLICY)
    private readonly policies: LeavePolicyRepository,
    @Inject(REPOSITORY_LEAVE_LEDGER)
    private readonly ledger: LeaveLedgerRepository,
    @Inject(TRANSACTION_MANAGER)
    private readonly transactions: TransactionManager,
  ) {}

  /**
   * Deducts what is due, stopping once `batchSize` deductions were posted.
   *
   * @param now - The current time.
   * @param batchSize - Most deductions to post.
   * @returns What the pass did.
   */
  async run(now: Date, batchSize: number): Promise<JobPassResult> {
    const today = todayUtc(now)
    const versions = new Map<string, LeavePolicy[]>()
    const result: JobPassResult = { count: 0, failed: 0, more: false }
    for (let back = LOOKBACK_DAYS; back >= 1; back -= 1) {
      const date = addDays(today, -back)
      const calendars = await this.calendars.findWithKindOnDate(
        'collective_leave',
        date,
      )
      for (const calendar of calendars) {
        if (!calendar.tenant_id) {
          continue
        }
        if (await this.runCalendar(calendar, date, versions, result, batchSize)) {
          return result
        }
      }
    }
    return result
  }

  /**
   * Deducts for the staff of every facility that uses a calendar on one collective day.
   *
   * @param calendar - A tenant calendar with a collective leave day on `date`.
   * @param date - The collective leave day.
   * @param versions - Policy versions already read in this pass, per tenant.
   * @param result - The pass result.
   * @param batchSize - Most deductions to post.
   * @returns True when the batch is full and the pass must stop.
   */
  private async runCalendar(
    calendar: HolidayCalendar,
    date: string,
    versions: Map<string, LeavePolicy[]>,
    result: JobPassResult,
    batchSize: number,
  ): Promise<boolean> {
    const tenantId = calendar.tenant_id!
    const facilities = await this.facilities.findByCalendarCode(
      tenantId,
      calendar.code,
      FACILITY_LIMIT,
    )
    for (const facility of facilities) {
      let after: string | null = null
      for (;;) {
        const page: PositionAssignment[] =
          await this.assignments.findOpenPrimaryByFacility(
            tenantId,
            facility.id,
            after,
            PAGE_SIZE,
          )
        for (const assignment of page) {
          if (result.count >= batchSize) {
            result.more = true
            return true
          }
          try {
            await this.deduct(tenantId, assignment.employee_id, date, versions, result)
          } catch (error: unknown) {
            result.failed += 1
            result.error = error instanceof Error ? error.name : 'UnknownError'
            result.retryable =
              error instanceof RepositoryError ? error.retryable : true
          }
        }
        if (page.length < PAGE_SIZE) {
          break
        }
        after = page[page.length - 1]!.id
      }
    }
    return false
  }

  /**
   * Takes the collective leave day of one employee from each balance that takes it.
   *
   * @param tenantId - The tenant.
   * @param employeeId - The employee.
   * @param date - The collective leave day.
   * @param versions - Policy versions already read in this pass, per tenant.
   * @param result - The pass result; a posted deduction counts.
   */
  private async deduct(
    tenantId: string,
    employeeId: string,
    date: string,
    versions: Map<string, LeavePolicy[]>,
    result: JobPassResult,
  ): Promise<void> {
    const taking = versionsInForce(await this.versionsOf(tenantId, versions), date)
      .filter(
        (version) =>
          version.balance.kind === 'period' &&
          version.balance.deduct_collective_leave,
      )
    if (taking.length === 0) {
      return
    }
    const contracts = await this.contracts.findByEmployee(tenantId, employeeId)
    const start = serviceStart(contracts, date)
    const employment = this.contractOn(contracts, date)
    if (start === null || !employment) {
      return
    }
    let worked: boolean | undefined
    for (const version of taking) {
      const rule = version.balance
      if (rule.kind !== 'period') {
        continue
      }
      const type = employment.employment_type
      if (
        version.employment_types.length > 0 &&
        !version.employment_types.some(
          (allowed) => allowed.system === type.system && allowed.code === type.code,
        )
      ) {
        continue
      }
      const period = entitlementPeriod(rule.period, start, date)
      const entries = await this.ledger.findByEmployeeTypeAndPeriod(
        tenantId,
        employeeId,
        version.leave_type,
        period.start,
      )
      const key = `${employeeId}:${version.leave_type.code}:collective:${date}`
      if (
        entries.some(
          (entry) => entry.dedupe_key === key || entry.dedupe_key === `${key}:carry`,
        )
      ) {
        continue
      }
      const summary = summarizeBalance(entries, 0)
      if (summary.ownLeft + summary.carryOverLeft < 1) {
        continue
      }
      worked ??= await this.hasWorked(tenantId, employeeId, date)
      if (worked) {
        return
      }
      await this.post(tenantId, employeeId, version, period, date, key, planUse(summary, 1), result)
    }
  }

  /**
   * Posts the day of use, split over the carried-over days and the days of the period.
   *
   * @param tenantId - The tenant.
   * @param employeeId - The employee.
   * @param version - The policy version.
   * @param period - The entitlement period.
   * @param date - The collective leave day.
   * @param key - Key of the part taken from the days of the period.
   * @param parts - How the day is split.
   * @param result - The pass result; a posted deduction counts.
   */
  private async post(
    tenantId: string,
    employeeId: string,
    version: LeavePolicy,
    period: { start: string; end: string },
    date: string,
    key: string,
    parts: { bucket: 'own' | 'carry_over'; days: number }[],
    result: JobPassResult,
  ): Promise<void> {
    try {
      await runWithRequestContext(
        { correlationId: randomUUID(), actor: systemActor(ACTOR) },
        () =>
          withChangeReason(REASON, () =>
            this.transactions.run(async () => {
              for (const part of parts) {
                await this.ledger.append({
                  tenant_id: tenantId,
                  employee_id: employeeId,
                  leave_type: {
                    system: version.leave_type.system,
                    code: version.leave_type.code,
                  },
                  period: { start: period.start, end: period.end },
                  kind: 'use',
                  days: -part.days,
                  bucket: part.bucket,
                  expires_on: null,
                  source: { kind: 'collective_leave', ref_id: null, date },
                  dedupe_key: part.bucket === 'own' ? key : `${key}:carry`,
                })
              }
            }),
          ),
      )
      result.count += 1
    } catch (error: unknown) {
      // Taken by an earlier pass: the keys are unique, so there is nothing to do.
      if (!(error instanceof RepositoryConflictError)) {
        throw error
      }
    }
  }

  /**
   * Tells whether an employee had a planned working shift on a date, in any roster and unit. A day
   * off is not work.
   *
   * @param tenantId - The tenant.
   * @param employeeId - The employee.
   * @param date - The date.
   * @returns True when a planned shift that is not a day off exists.
   */
  private async hasWorked(
    tenantId: string,
    employeeId: string,
    date: string,
  ): Promise<boolean> {
    const planned = await this.rosterAssignments.findPlannedByEmployeeBetween(
      tenantId,
      employeeId,
      date,
      date,
    )
    return planned.some((assignment) => assignment.shift.type !== 'off')
  }

  /**
   * Finds the contract that ran on a date: not a draft, started by then and not ended before it.
   *
   * @param contracts - The employee's contracts.
   * @param date - The date.
   * @returns The contract, or `undefined` when none ran.
   */
  private contractOn(
    contracts: EmploymentContract[],
    date: string,
  ): EmploymentContract | undefined {
    return contracts.find((contract) => {
      const end = contract.termination?.date ?? contract.period.end
      return (
        contract.status !== 'draft' &&
        contract.period.start <= date &&
        (end === null || end >= date)
      )
    })
  }

  /**
   * Reads the policy versions of a tenant once per pass.
   *
   * @param tenantId - The tenant.
   * @param memo - Versions already read in this pass.
   * @returns Every version of the tenant.
   */
  private async versionsOf(
    tenantId: string,
    memo: Map<string, LeavePolicy[]>,
  ): Promise<LeavePolicy[]> {
    let versions = memo.get(tenantId)
    if (!versions) {
      versions = await this.policies.findByFilter(tenantId, {
        limit: POLICY_LIMIT,
      })
      memo.set(tenantId, versions)
    }
    return versions
  }
}
