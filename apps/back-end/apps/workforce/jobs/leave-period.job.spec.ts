import { Types } from 'mongoose'
import { RepositoryUnavailableError } from '@utility/database/error'
import { systemActor } from '@utility/history/actor'
import { getRequestContext, runWithRequestContext } from '@utility/logger/context'
import { type LeaveLedgerEntry } from '@repository/model/leave-ledger-entry'
import { type LeavePolicy } from '@repository/model/leave-policy'
import {
  InMemoryEmploymentContracts,
  InMemoryLeaveLedger,
  InMemoryLeavePolicies,
} from '../testing/in-memory'
import { LeavePeriodJob } from './leave-period.job'

describe('LeavePeriodJob', () => {
  const tenantA = new Types.ObjectId().toHexString()
  const tenantB = new Types.ObjectId().toHexString()
  const organizationId = new Types.ObjectId().toHexString()
  // 2026-11-19 in UTC.
  const now = new Date('2026-11-19T05:00:00Z')
  const actor = { account_id: 'a1', display_name: 'Admin', kind: 'account' as const }
  let contracts: InMemoryEmploymentContracts
  let policies: InMemoryLeavePolicies
  let ledger: InMemoryLeaveLedger
  let job: LeavePeriodJob

  const annual = { system: 'id.leave-type', code: 'tahunan' }
  const withCarry = { kind: 'period' as const, period: 'service_year' as const, days: 12, min_service_months: 12, carry_over: { max_days: 6, expires_after_months: 6 }, deduct_collective_leave: false }

  /**
   * Runs `work` as a seed request.
   *
   * @param work - Code to run.
   * @returns What `work` returns.
   */
  function seed<T>(work: () => Promise<T>): Promise<T> {
    return runWithRequestContext({ correlationId: 'seed', actor }, work)
  }

  /**
   * Adds an active contract and returns the employee it belongs to.
   *
   * @param start - First day of the contract.
   * @param tenant - Tenant of the record.
   * @returns The employee identifier.
   */
  async function addEmployee(start: string, tenant = tenantA): Promise<string> {
    const employeeId = new Types.ObjectId().toHexString()
    await seed(() =>
      contracts.create({
        tenant_id: tenant, employee_id: employeeId, organization_id: organizationId, contract_number: `C${employeeId.slice(-6)}`,
        employment_type: { system: 'id.employment-type', code: 'pkwtt' }, period: { start, end: null }, probation_end_date: null, fte: 1,
        working_time_scheme: null, status: 'active', previous_contract_id: null, termination: null, document: null,
      }),
    )
    return employeeId
  }

  /**
   * Stores a policy version.
   *
   * @param override - Fields that replace the annual leave defaults.
   * @param tenant - Tenant of the record.
   */
  function addPolicy(override: Partial<LeavePolicy> = {}, tenant = tenantA) {
    return seed(() =>
      policies.create({
        tenant_id: tenant, leave_type: annual, effective_from: '2020-01-01', balance: withCarry, counting: 'working_days', half_days: false,
        paid: true, employment_types: [], approval: { steps: 'one_step', two_step_above_days: null }, notice_days: 0, retroactive_days: 0,
        max_days_per_request: 366, proof: null, notes: null, source: { kind: 'manual', bundle_id: null }, ...override,
      }),
    )
  }

  /**
   * Posts a ledger entry directly.
   *
   * @param employeeId - The employee.
   * @param kind - What the entry does.
   * @param days - Signed days.
   * @param override - Other fields.
   * @returns The entry.
   */
  function post(employeeId: string, kind: LeaveLedgerEntry['kind'], days: number, override: Partial<LeaveLedgerEntry> = {}) {
    return seed(() =>
      ledger.append({
        tenant_id: tenantA, employee_id: employeeId, leave_type: annual, period: { start: '2025-11-19', end: '2026-11-18' }, kind, days,
        bucket: 'own', expires_on: null, source: { kind: 'job', ref_id: null, date: null }, dedupe_key: null, ...override,
      }),
    )
  }

  /**
   * @param employeeId - The employee.
   * @returns The ledger entries of the employee, oldest first.
   */
  function entriesOf(employeeId: string) {
    return ledger.findByEmployee(tenantA, employeeId, { limit: 100 })
  }

  /**
   * An employee whose period 2025-11-19 to 2026-11-18 ended yesterday, with a grant of 12 days.
   *
   * @returns The employee identifier.
   */
  async function endedYesterday(): Promise<string> {
    const employeeId = await addEmployee('2024-11-19')
    await post(employeeId, 'grant', 12)
    return employeeId
  }

  beforeEach(async () => {
    contracts = new InMemoryEmploymentContracts()
    policies = new InMemoryLeavePolicies()
    ledger = new InMemoryLeaveLedger()
    job = new LeavePeriodJob(contracts, policies, ledger, { run: (work: () => Promise<unknown>) => work() } as never)
    await addPolicy()
  })

  it('carries over up to the limit and lets the rest lapse, once, when a period has ended', async () => {
    const employeeId = await endedYesterday()
    await post(employeeId, 'use', -2)

    expect(await job.run(now, 50)).toEqual({ count: 1, failed: 0, more: false })
    expect(await job.run(now, 50)).toEqual({ count: 0, failed: 0, more: false })

    const entries = await entriesOf(employeeId)
    expect(entries).toHaveLength(4)
    expect(entries.find((entry) => entry.kind === 'carry_over')).toMatchObject({
      tenant_id: tenantA,
      employee_id: employeeId,
      leave_type: annual,
      period: { start: '2026-11-19', end: '2027-11-18' },
      days: 6,
      bucket: 'carry_over',
      expires_on: '2027-05-18',
      source: { kind: 'job', ref_id: null, date: null },
      dedupe_key: `${employeeId}:tahunan:carry_over:2025-11-19`,
    })
    expect(entries.find((entry) => entry.kind === 'expiry')).toMatchObject({
      period: { start: '2025-11-19', end: '2026-11-18' },
      days: -4,
      bucket: 'own',
      expires_on: null,
      dedupe_key: `${employeeId}:tahunan:expiry:2026-11-18`,
    })
  })

  it('carries over everything when the left-over days are within the limit, and lets everything lapse without a carry-over rule', async () => {
    const small = await endedYesterday()
    await post(small, 'use', -7)
    await addPolicy({ leave_type: { system: 'id.leave-type', code: 'cuti-b' }, balance: { ...withCarry, carry_over: null } })
    const none = await addEmployee('2024-11-19')
    await post(none, 'grant', 10, { leave_type: { system: 'id.leave-type', code: 'cuti-b' } })

    await job.run(now, 50)

    expect((await entriesOf(small)).filter((entry) => entry.kind !== 'grant' && entry.kind !== 'use').map((entry) => [entry.kind, entry.days])).toEqual([['carry_over', 5]])
    expect((await entriesOf(none)).filter((entry) => entry.kind !== 'grant').map((entry) => [entry.kind, entry.days, entry.bucket])).toEqual([['expiry', -10, 'own']])
  })

  it('posts nothing when nothing is left or the balance is negative', async () => {
    const spent = await endedYesterday()
    await post(spent, 'use', -12)
    const overdrawn = await endedYesterday()
    await post(overdrawn, 'adjustment', -15)

    expect(await job.run(now, 50)).toEqual({ count: 0, failed: 0, more: false })

    expect(await entriesOf(spent)).toHaveLength(2)
    expect(await entriesOf(overdrawn)).toHaveLength(2)
  })

  it('looks back 7 days: a period that ended 7 days ago is closed, 8 days ago and today are not', async () => {
    const seven = await addEmployee('2024-11-13')
    await post(seven, 'grant', 12, { period: { start: '2025-11-13', end: '2026-11-12' } })
    const eight = await addEmployee('2024-11-12')
    await post(eight, 'grant', 12, { period: { start: '2025-11-12', end: '2026-11-11' } })
    const today = await addEmployee('2024-11-20')
    await post(today, 'grant', 12, { period: { start: '2025-11-20', end: '2026-11-19' } })

    expect((await job.run(now, 50)).count).toBe(1)

    expect(await entriesOf(seven)).toHaveLength(3)
    expect(await entriesOf(eight)).toHaveLength(1)
    expect(await entriesOf(today)).toHaveLength(1)
  })

  it('posts nothing for an employee with no contract in force, so the days stay for the final settlement', async () => {
    const employeeId = new Types.ObjectId().toHexString()
    await post(employeeId, 'grant', 12)

    expect(await job.run(now, 50)).toEqual({ count: 0, failed: 0, more: false })

    expect(await entriesOf(employeeId)).toHaveLength(1)
  })

  it('applies the policy version in force on the last day of the period, not one that starts later', async () => {
    await addPolicy({ effective_from: '2026-06-01', balance: { ...withCarry, carry_over: { max_days: 2, expires_after_months: 3 } } })
    await addPolicy({ effective_from: '2026-11-19', balance: { ...withCarry, carry_over: { max_days: 9, expires_after_months: 12 } } })
    const employeeId = await endedYesterday()

    await job.run(now, 50)

    expect((await entriesOf(employeeId)).find((entry) => entry.kind === 'carry_over')).toMatchObject({ days: 2, expires_on: '2027-02-18' })
  })

  it('lets everything lapse when the version in force has no yearly balance, or the tenant has no policy', async () => {
    const stranger = await addEmployee('2024-11-19', tenantB)
    await post(stranger, 'grant', 12, { tenant_id: tenantB })

    await job.run(now, 50)

    expect(await ledger.findByEmployee(tenantB, stranger, { limit: 10 })).toMatchObject([{ kind: 'grant' }, { kind: 'expiry', days: -12, tenant_id: tenantB }])
  })

  it('lets carried-over days lapse the day after they expire, only what is left, once', async () => {
    const employeeId = await addEmployee('2024-11-19')
    const period = { start: '2026-11-19', end: '2027-11-18' }
    await post(employeeId, 'grant', 12, { period })
    await post(employeeId, 'carry_over', 3, { period, bucket: 'carry_over', expires_on: '2026-11-18' })
    await post(employeeId, 'use', -1, { period, bucket: 'carry_over' })

    expect(await job.run(now, 50)).toEqual({ count: 1, failed: 0, more: false })
    expect(await job.run(now, 50)).toEqual({ count: 0, failed: 0, more: false })

    const lapse = (await entriesOf(employeeId)).filter((entry) => entry.kind === 'expiry')
    expect(lapse).toMatchObject([{ days: -2, bucket: 'carry_over', period, expires_on: null, dedupe_key: `${employeeId}:tahunan:expiry_carry:2026-11-18` }])
  })

  it('leaves carried-over days that expire today or are all used', async () => {
    const stillOpen = await addEmployee('2024-11-19')
    await post(stillOpen, 'carry_over', 3, { period: { start: '2026-11-19', end: '2027-11-18' }, bucket: 'carry_over', expires_on: '2026-11-19' })
    const used = await addEmployee('2024-11-19')
    await post(used, 'carry_over', 3, { period: { start: '2026-11-19', end: '2027-11-18' }, bucket: 'carry_over', expires_on: '2026-11-18' })
    await post(used, 'use', -3, { period: { start: '2026-11-19', end: '2027-11-18' }, bucket: 'carry_over' })

    expect(await job.run(now, 50)).toEqual({ count: 0, failed: 0, more: false })
  })

  it('stops after the batch size, and counts a failing record without stopping the others', async () => {
    const first = await endedYesterday()
    const second = await endedYesterday()

    const one = await job.run(now, 1)
    const two = await job.run(now, 1)
    const three = await job.run(now, 1)

    expect([one, two, three].map((result) => [result.count, result.more])).toEqual([[1, true], [1, false], [0, false]])
    // Each employee has a grant, a carry-over and an expiry.
    expect((await entriesOf(first)).length + (await entriesOf(second)).length).toBe(6)
    const broken = await endedYesterday()
    const fine = await endedYesterday()
    const append = ledger.append.bind(ledger)
    const spy = vi.spyOn(ledger, 'append').mockImplementation(async (entry) => {
      if (entry.employee_id === broken) {
        throw new RepositoryUnavailableError('down', { operation: 'x' })
      }
      return append(entry)
    })

    const result = await job.run(now, 50)

    expect(result).toEqual({ count: 1, failed: 1, more: false, error: 'RepositoryUnavailableError', retryable: true })
    expect((await entriesOf(fine)).length).toBeGreaterThan(1)
    spy.mockRestore()
    expect(await job.run(now, 50)).toMatchObject({ count: 1, failed: 0 })
    expect((await entriesOf(broken)).length).toBeGreaterThan(1)
  })

  it('writes each entry with the system actor, its own reason and a correlation id', async () => {
    await endedYesterday()
    const seen: { kind: string; actor?: unknown; reason?: string; correlationId?: string }[] = []
    const append = ledger.append.bind(ledger)
    vi.spyOn(ledger, 'append').mockImplementation(async (entry) => {
      const context = getRequestContext()
      seen.push({ kind: entry.kind, actor: context?.actor, reason: context?.reason, correlationId: context?.correlationId })
      return append(entry)
    })

    await job.run(now, 50)

    expect(seen.map((item) => [item.kind, item.reason])).toEqual([['carry_over', 'leave_carried_over'], ['expiry', 'leave_expired']])
    for (const item of seen) {
      expect(item.actor).toEqual(systemActor('leave-period-job'))
      expect(item.correlationId).toMatch(/^[0-9a-f-]{36}$/)
    }
  })
})
