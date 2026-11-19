import { randomUUID } from 'node:crypto'
import { Inject, Injectable } from '@nestjs/common'
import {
  RepositoryConflictError,
  RepositoryError,
} from '@utility/database/error'
import { systemActor } from '@utility/history/actor'
import { withChangeReason } from '@utility/history/reason'
import { runWithRequestContext } from '@utility/logger/context'
import { todayUtc } from '@utility/validation/local-date'
import { type EmployeeRepository } from '@repository/interface/employee'
import { type EmploymentContractRepository } from '@repository/interface/employment-contract'
import { type LeaveLedgerRepository } from '@repository/interface/leave-ledger'
import { type LeavePolicyRepository } from '@repository/interface/leave-policy'
import { type ClosedDatePeriod } from '@repository/model/common/calendar'
import { type EmploymentContract } from '@repository/model/employment-contract'
import { type LeavePolicy } from '@repository/model/leave-policy'
import {
  REPOSITORY_EMPLOYEE,
  REPOSITORY_EMPLOYMENT_CONTRACT,
  REPOSITORY_LEAVE_LEDGER,
  REPOSITORY_LEAVE_POLICY,
} from '@repository/token'
import { addDays } from '../credentialing/appointment-rules'
import { entitlementPeriod, hasMinService } from '../leave/entitlement-period'
import { versionsInForce } from '../leave/policy-in-force'
import { serviceStart } from '../leave/service-start'
import { ParameterService } from '../parameter/parameter.service'
import { type HrJob, type JobPassResult } from './job'

/**
 * System actor of the job, as written in the change history.
 */
const ACTOR = 'leave-grant-job'

/**
 * Reason kept with each grant.
 */
const REASON = 'leave_granted'

/**
 * Contracts read per page.
 */
const PAGE_SIZE = 200

/**
 * Lead days used when the parameter is not a whole number (the catalog default).
 */
const DEFAULT_LEAD_DAYS = 60

/**
 * Most policy versions read for one tenant. A tenant has a few dozen leave types with a handful of
 * versions each.
 */
const POLICY_LIMIT = 1000

/**
 * What one pass has read already, so a tenant's policies and lead days are read once per pass.
 */
interface Memo {
  versions: Map<string, LeavePolicy[]>
  lead: Map<string, number>
}

/**
 * Posts the yearly leave entitlement of employees (HR spec 9.4.5, plan 8.2 LB3). For each employee
 * with a contract in force and each leave type with a `period` policy, it grants the days of the
 * period that holds today, and of the next period once it starts within `LEAVE_GRANT_LEAD_DAYS`, when
 * the employee has served the policy's minimum months by the period's first day and the employee's
 * employment type is allowed. A separated employee gets nothing. A grant is posted once: its
 * `dedupe_key` is unique, so a second pass changes nothing. Today is the UTC date; the lead days
 * make the zone irrelevant. Each grant is its own write with its tenant, a system actor and its own
 * correlation id.
 */
@Injectable()
export class LeaveGrantJob implements HrJob {
  readonly name = 'leave-grant'

  /**
   * @param contracts - Employment contract repository, for the employees to look at.
   * @param employees - Employee repository, for the status.
   * @param policies - Leave policy repository.
   * @param ledger - Leave ledger repository.
   * @param parameters - HR parameters, for the lead days.
   */
  constructor(
    @Inject(REPOSITORY_EMPLOYMENT_CONTRACT)
    private readonly contracts: EmploymentContractRepository,
    @Inject(REPOSITORY_EMPLOYEE) private readonly employees: EmployeeRepository,
    @Inject(REPOSITORY_LEAVE_POLICY)
    private readonly policies: LeavePolicyRepository,
    @Inject(REPOSITORY_LEAVE_LEDGER)
    private readonly ledger: LeaveLedgerRepository,
    @Inject(ParameterService) private readonly parameters: ParameterService,
  ) {}

  /**
   * Grants what is due, stopping once `batchSize` grants were posted.
   *
   * @param now - The current time.
   * @param batchSize - Most grants to post.
   * @returns What the pass did.
   */
  async run(now: Date, batchSize: number): Promise<JobPassResult> {
    const today = todayUtc(now)
    const memo: Memo = { versions: new Map(), lead: new Map() }
    const result: JobPassResult = { count: 0, failed: 0, more: false }
    let after: string | null = null
    for (;;) {
      const page: EmploymentContract[] = await this.contracts.findActiveForJobs(
        after,
        PAGE_SIZE,
      )
      for (const contract of page) {
        if (result.count >= batchSize) {
          result.more = true
          return result
        }
        try {
          await this.grantFor(contract, today, memo, result)
        } catch (error: unknown) {
          result.failed += 1
          result.error = error instanceof Error ? error.name : 'UnknownError'
          result.retryable =
            error instanceof RepositoryError ? error.retryable : true
        }
      }
      if (page.length < PAGE_SIZE) {
        return result
      }
      after = page[page.length - 1]!.id
    }
  }

  /**
   * Grants the periods of one employee that are due.
   *
   * @param contract - The employee's active contract.
   * @param today - Today as a local date.
   * @param memo - What was already read in this pass.
   * @param result - The pass result; each posted grant counts.
   */
  private async grantFor(
    contract: EmploymentContract,
    today: string,
    memo: Memo,
    result: JobPassResult,
  ): Promise<void> {
    const end = contract.period.end
    if (contract.period.start > today || (end !== null && end < today)) {
      return
    }
    const versions = await this.versionsOf(contract.tenant_id, memo)
    const current = versionsInForce(versions, today).filter(
      (version) => version.balance.kind === 'period',
    )
    if (current.length === 0) {
      return
    }
    const employee = await this.employees.findOne(contract.employee_id)
    if (
      !employee ||
      employee.tenant_id !== contract.tenant_id ||
      employee.deleted_at ||
      employee.employment_status === 'separated'
    ) {
      return
    }
    const start = serviceStart(
      await this.contracts.findByEmployee(contract.tenant_id, employee.id),
      today,
    )
    if (start === null) {
      return
    }
    const lead = await this.leadDays(contract.tenant_id, memo)
    for (const version of current) {
      const rule = version.balance
      if (rule.kind !== 'period') {
        continue
      }
      const period = entitlementPeriod(rule.period, start, today)
      await this.grant(contract, start, period, version, result)
      const next = entitlementPeriod(rule.period, start, addDays(period.end, 1))
      if (next.start <= addDays(today, lead)) {
        // The version in force on the first day of the coming period decides its days.
        const coming = versionsInForce(versions, next.start).find(
          (candidate) =>
            candidate.leave_type.system === version.leave_type.system &&
            candidate.leave_type.code === version.leave_type.code,
        )
        if (
          coming &&
          coming.balance.kind === 'period' &&
          coming.balance.period === rule.period
        ) {
          await this.grant(contract, start, next, coming, result)
        }
      }
    }
  }

  /**
   * Posts the grant of one period when the employee qualifies and has not got it yet.
   *
   * @param contract - The employee's active contract.
   * @param start - First day of the employee's continuous service.
   * @param period - The entitlement period.
   * @param policy - The policy version that decides the days.
   * @param result - The pass result; a posted grant counts.
   */
  private async grant(
    contract: EmploymentContract,
    start: string,
    period: ClosedDatePeriod,
    policy: LeavePolicy,
    result: JobPassResult,
  ): Promise<void> {
    const rule = policy.balance
    if (
      rule.kind !== 'period' ||
      !hasMinService(start, period.start, rule.min_service_months)
    ) {
      return
    }
    const type = contract.employment_type
    if (
      policy.employment_types.length > 0 &&
      !policy.employment_types.some(
        (allowed) => allowed.system === type.system && allowed.code === type.code,
      )
    ) {
      return
    }
    try {
      await runWithRequestContext(
        { correlationId: randomUUID(), actor: systemActor(ACTOR) },
        () =>
          withChangeReason(REASON, () =>
            this.ledger.append({
              tenant_id: contract.tenant_id,
              employee_id: contract.employee_id,
              leave_type: {
                system: policy.leave_type.system,
                code: policy.leave_type.code,
              },
              period: { start: period.start, end: period.end },
              kind: 'grant',
              days: rule.days,
              bucket: 'own',
              expires_on: null,
              source: { kind: 'job', ref_id: null, date: null },
              dedupe_key: `${contract.employee_id}:${policy.leave_type.code}:grant:${period.start}`,
            }),
          ),
      )
      result.count += 1
    } catch (error: unknown) {
      // Granted by an earlier pass: the key is unique, so there is nothing to do.
      if (!(error instanceof RepositoryConflictError)) {
        throw error
      }
    }
  }

  /**
   * Reads the policy versions of a tenant once per pass.
   *
   * @param tenantId - The tenant.
   * @param memo - What was already read in this pass.
   * @returns Every version of the tenant.
   */
  private async versionsOf(tenantId: string, memo: Memo): Promise<LeavePolicy[]> {
    let versions = memo.versions.get(tenantId)
    if (!versions) {
      versions = await this.policies.findByFilter(tenantId, {
        limit: POLICY_LIMIT,
      })
      memo.versions.set(tenantId, versions)
    }
    return versions
  }

  /**
   * Reads `LEAVE_GRANT_LEAD_DAYS` of a tenant once per pass.
   *
   * @param tenantId - The tenant.
   * @param memo - What was already read in this pass.
   * @returns The days; the catalog default when the value is not a whole number.
   */
  private async leadDays(tenantId: string, memo: Memo): Promise<number> {
    let days = memo.lead.get(tenantId)
    if (days === undefined) {
      const { value } = await this.parameters.resolve(tenantId, {
        key: 'LEAVE_GRANT_LEAD_DAYS',
      })
      days =
        typeof value === 'number' && Number.isInteger(value) && value >= 0
          ? value
          : DEFAULT_LEAD_DAYS
      memo.lead.set(tenantId, days)
    }
    return days
  }
}
