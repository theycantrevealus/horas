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
import { type LeaveLedgerRepository } from '@repository/interface/leave-ledger'
import { type LeavePolicyRepository } from '@repository/interface/leave-policy'
import { type LeaveLedgerEntry } from '@repository/model/leave-ledger-entry'
import { type LeavePolicy } from '@repository/model/leave-policy'
import {
  REPOSITORY_EMPLOYMENT_CONTRACT,
  REPOSITORY_LEAVE_LEDGER,
  REPOSITORY_LEAVE_POLICY,
} from '@repository/token'
import { addDays } from '../credentialing/appointment-rules'
import { summarizeBalance } from '../leave/balance'
import { addMonths } from '../leave/dates'
import { entitlementPeriod } from '../leave/entitlement-period'
import { versionsInForce } from '../leave/policy-in-force'
import { serviceStart } from '../leave/service-start'
import { type HrJob, type JobPassResult } from './job'

/**
 * System actor of the job, as written in the change history.
 */
const ACTOR = 'leave-period-job'

/**
 * Reason kept with a carry-over.
 */
const CARRIED_REASON = 'leave_carried_over'

/**
 * Reason kept with an expiry.
 */
const EXPIRED_REASON = 'leave_expired'

/**
 * Days looked back, so a day the worker was down is caught up (plan 8.2 LB4).
 */
const LOOKBACK_DAYS = 7

/**
 * Entries read per page.
 */
const PAGE_SIZE = 200

/**
 * Most policy versions read for one tenant.
 */
const POLICY_LIMIT = 1000

/**
 * Closes entitlement periods (HR spec 9.4.5 step 5, plan 8.2 LB4). For each period that ended in the
 * last 7 days it carries over the unused days of the period up to the limit of the policy version
 * that was in force on the last day (into the next period, usable until `expires_on`), and lets the
 * rest lapse. It also lets carried-over days lapse the day after `expires_on`. Every entry has a
 * unique key, so a second pass posts nothing. An employee with no contract in force today is left
 * alone: what happens to the unused days at separation is the final settlement (HR spec 9.10). The
 * old period keeps the carried days as its own balance; only the next period shows them.
 */
@Injectable()
export class LeavePeriodJob implements HrJob {
  readonly name = 'leave-period'

  /**
   * @param contracts - Employment contract repository, for the start of continuous service.
   * @param policies - Leave policy repository.
   * @param ledger - Leave ledger repository.
   * @param transactions - Transaction manager, so a carry-over and its expiry post together.
   */
  constructor(
    @Inject(REPOSITORY_EMPLOYMENT_CONTRACT)
    private readonly contracts: EmploymentContractRepository,
    @Inject(REPOSITORY_LEAVE_POLICY)
    private readonly policies: LeavePolicyRepository,
    @Inject(REPOSITORY_LEAVE_LEDGER)
    private readonly ledger: LeaveLedgerRepository,
    @Inject(TRANSACTION_MANAGER)
    private readonly transactions: TransactionManager,
  ) {}

  /**
   * Closes the periods and carry-overs that are due, stopping once `batchSize` were handled.
   *
   * @param now - The current time.
   * @param batchSize - Most periods and carry-overs to handle.
   * @returns What the pass did.
   */
  async run(now: Date, batchSize: number): Promise<JobPassResult> {
    const today = todayUtc(now)
    const from = addDays(today, -LOOKBACK_DAYS)
    const to = addDays(today, -1)
    const versions = new Map<string, LeavePolicy[]>()
    const result: JobPassResult = { count: 0, failed: 0, more: false }
    const handle = async (work: () => Promise<void>): Promise<void> => {
      try {
        await work()
      } catch (error: unknown) {
        result.failed += 1
        result.error = error instanceof Error ? error.name : 'UnknownError'
        result.retryable =
          error instanceof RepositoryError ? error.retryable : true
      }
    }
    const scan = async (
      read: (after: string | null) => Promise<LeaveLedgerEntry[]>,
      process: (entry: LeaveLedgerEntry) => Promise<void>,
    ): Promise<boolean> => {
      let after: string | null = null
      for (;;) {
        const page: LeaveLedgerEntry[] = await read(after)
        for (const entry of page) {
          if (result.count >= batchSize) {
            result.more = true
            return true
          }
          await handle(() => process(entry))
        }
        if (page.length < PAGE_SIZE) {
          return false
        }
        after = page[page.length - 1]!.id
      }
    }
    const full = await scan(
      (after) =>
        this.ledger.findGrantsEndedBetween(from, to, after, PAGE_SIZE),
      (grant) => this.closePeriod(grant, today, versions, result),
    )
    if (!full) {
      await scan(
        (after) =>
          this.ledger.findCarryOversExpiringBetween(from, to, after, PAGE_SIZE),
        (carried) => this.lapseCarryOver(carried, result),
      )
    }
    return result
  }

  /**
   * Carries over and expires the unused days of one ended period.
   *
   * @param grant - The grant of the period that ended.
   * @param today - Today as a local date.
   * @param versions - Policy versions already read in this pass, per tenant.
   * @param result - The pass result; a closed period counts.
   */
  private async closePeriod(
    grant: LeaveLedgerEntry,
    today: string,
    versions: Map<string, LeavePolicy[]>,
    result: JobPassResult,
  ): Promise<void> {
    const code = grant.leave_type.code
    const carryKey = `${grant.employee_id}:${code}:carry_over:${grant.period.start}`
    const expiryKey = `${grant.employee_id}:${code}:expiry:${grant.period.end}`
    const entries = await this.ledger.findByEmployeeTypeAndPeriod(
      grant.tenant_id,
      grant.employee_id,
      grant.leave_type,
      grant.period.start,
    )
    if (
      entries.some(
        (entry) => entry.dedupe_key === carryKey || entry.dedupe_key === expiryKey,
      )
    ) {
      return
    }
    const left = summarizeBalance(entries, 0).ownLeft
    if (left <= 0) {
      return
    }
    const start = serviceStart(
      await this.contracts.findByEmployee(grant.tenant_id, grant.employee_id),
      today,
    )
    if (start === null) {
      return
    }
    const all = await this.versionsOf(grant.tenant_id, versions)
    const version = versionsInForce(all, grant.period.end).find(
      (candidate) =>
        candidate.leave_type.system === grant.leave_type.system &&
        candidate.leave_type.code === code,
    )
    const rule = version?.balance.kind === 'period' ? version.balance : null
    const carryRule = rule?.carry_over ?? null
    const carry = carryRule ? Math.min(left, carryRule.max_days) : 0
    const lapse = left - carry
    const base = {
      tenant_id: grant.tenant_id,
      employee_id: grant.employee_id,
      leave_type: { system: grant.leave_type.system, code },
      source: { kind: 'job' as const, ref_id: null, date: null },
    }
    try {
      await runWithRequestContext(
        { correlationId: randomUUID(), actor: systemActor(ACTOR) },
        () =>
          this.transactions.run(async () => {
            if (carry > 0 && rule && carryRule) {
              const next = entitlementPeriod(
                rule.period,
                start,
                addDays(grant.period.end, 1),
              )
              await withChangeReason(CARRIED_REASON, () =>
                this.ledger.append({
                  ...base,
                  period: next,
                  kind: 'carry_over',
                  days: carry,
                  bucket: 'carry_over',
                  expires_on: addDays(
                    addMonths(next.start, carryRule.expires_after_months),
                    -1,
                  ),
                  dedupe_key: carryKey,
                }),
              )
            }
            if (lapse > 0) {
              await withChangeReason(EXPIRED_REASON, () =>
                this.ledger.append({
                  ...base,
                  period: {
                    start: grant.period.start,
                    end: grant.period.end,
                  },
                  kind: 'expiry',
                  days: -lapse,
                  bucket: 'own',
                  expires_on: null,
                  dedupe_key: expiryKey,
                }),
              )
            }
          }),
      )
      result.count += 1
    } catch (error: unknown) {
      // Closed by an earlier pass: the keys are unique, so there is nothing to do.
      if (!(error instanceof RepositoryConflictError)) {
        throw error
      }
    }
  }

  /**
   * Lets the carried-over days that are left lapse, the day after they expire.
   *
   * @param carried - The carry-over entry whose last usable day has passed.
   * @param result - The pass result; a lapse counts.
   */
  private async lapseCarryOver(
    carried: LeaveLedgerEntry,
    result: JobPassResult,
  ): Promise<void> {
    const key = `${carried.employee_id}:${carried.leave_type.code}:expiry_carry:${carried.expires_on}`
    const entries = await this.ledger.findByEmployeeTypeAndPeriod(
      carried.tenant_id,
      carried.employee_id,
      carried.leave_type,
      carried.period.start,
    )
    if (entries.some((entry) => entry.dedupe_key === key)) {
      return
    }
    const left = summarizeBalance(entries, 0).carryOverLeft
    if (left <= 0) {
      return
    }
    try {
      await runWithRequestContext(
        { correlationId: randomUUID(), actor: systemActor(ACTOR) },
        () =>
          withChangeReason(EXPIRED_REASON, () =>
            this.ledger.append({
              tenant_id: carried.tenant_id,
              employee_id: carried.employee_id,
              leave_type: {
                system: carried.leave_type.system,
                code: carried.leave_type.code,
              },
              period: {
                start: carried.period.start,
                end: carried.period.end,
              },
              kind: 'expiry',
              days: -left,
              bucket: 'carry_over',
              expires_on: null,
              source: { kind: 'job', ref_id: null, date: null },
              dedupe_key: key,
            }),
          ),
      )
      result.count += 1
    } catch (error: unknown) {
      if (!(error instanceof RepositoryConflictError)) {
        throw error
      }
    }
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
