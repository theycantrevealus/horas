import { Types } from 'mongoose'
import { RepositoryUnavailableError } from '@utility/database/error'
import { systemActor } from '@utility/history/actor'
import { getRequestContext, runWithRequestContext } from '@utility/logger/context'
import { type Employee } from '@repository/model/employee'
import { type EmploymentContract } from '@repository/model/employment-contract'
import { type LeavePolicy } from '@repository/model/leave-policy'
import {
  InMemoryEmployees,
  InMemoryEmploymentContracts,
  InMemoryLeaveLedger,
  InMemoryLeavePolicies,
} from '../testing/in-memory'
import { LeaveGrantJob } from './leave-grant.job'

describe('LeaveGrantJob', () => {
  const tenantA = new Types.ObjectId().toHexString()
  const tenantB = new Types.ObjectId().toHexString()
  const organizationId = new Types.ObjectId().toHexString()
  // 2026-11-19 in UTC.
  const now = new Date('2026-11-19T05:00:00Z')
  const actor = { account_id: 'a1', display_name: 'Admin', kind: 'account' as const }
  let employees: InMemoryEmployees
  let contracts: InMemoryEmploymentContracts
  let policies: InMemoryLeavePolicies
  let ledger: InMemoryLeaveLedger
  let lead: unknown
  let job: LeaveGrantJob

  const pkwtt = { system: 'id.employment-type', code: 'pkwtt' }
  const pkwt = { system: 'id.employment-type', code: 'pkwt' }
  const annual = { system: 'id.leave-type', code: 'tahunan' }

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
   * Adds an employee with an active contract.
   *
   * @param start - First day of the contract.
   * @param options - Tenant, status, employment type and contract end.
   * @returns The employee.
   */
  async function addEmployee(
    start: string,
    options: { tenant?: string; status?: Employee['employment_status']; type?: typeof pkwtt; end?: string | null; contractStatus?: EmploymentContract['status'] } = {},
  ): Promise<Employee> {
    const tenant = options.tenant ?? tenantA
    const employee = await seed(() =>
      employees.create({
        tenant_id: tenant,
        employee_number: `E${new Types.ObjectId().toHexString().slice(-6)}`,
        name: { use: 'official', text: 'Siti', given: [], prefix: [], suffix: [] },
        other_names: [],
        display_name: 'Siti',
        administrative_gender: null,
        workforce_category: { system: 'id.workforce-category', code: 'tenaga_keperawatan' },
        is_clinical: false,
        profession: null,
        specialties: [],
        clinical_level: null,
        employment_status: options.status ?? 'active',
        employment_status_since: start,
        current_employment: null,
        primary_assignment: null,
        original_hire_date: start,
        separation_date: null,
        practitioner_ids: [],
        work_contacts: [],
        photo: null,
        preferred_language: null,
      }),
    )
    await seed(() =>
      contracts.create({
        tenant_id: tenant,
        employee_id: employee.id,
        organization_id: organizationId,
        contract_number: `C${new Types.ObjectId().toHexString().slice(-6)}`,
        employment_type: options.type ?? pkwtt,
        period: { start, end: options.end ?? null },
        probation_end_date: null,
        fte: 1,
        working_time_scheme: null,
        status: options.contractStatus ?? 'active',
        previous_contract_id: null,
        termination: null,
        document: null,
      }),
    )
    return employee
  }

  /**
   * Stores a policy version.
   *
   * @param override - Fields that replace the annual leave defaults.
   * @param tenant - Tenant of the record.
   * @returns The policy.
   */
  function addPolicy(override: Partial<LeavePolicy> = {}, tenant = tenantA) {
    return seed(() =>
      policies.create({
        tenant_id: tenant,
        leave_type: annual,
        effective_from: '2020-01-01',
        balance: { kind: 'period', period: 'service_year', days: 12, min_service_months: 12, carry_over: null, deduct_collective_leave: false },
        counting: 'working_days',
        half_days: false,
        paid: true,
        employment_types: [],
        approval: { steps: 'one_step', two_step_above_days: null },
        notice_days: 0,
        retroactive_days: 0,
        max_days_per_request: 366,
        proof: null,
        notes: null,
        source: { kind: 'manual', bundle_id: null },
        ...override,
      }),
    )
  }

  /**
   * @param employee - The employee.
   * @returns The employee's ledger entries.
   */
  function entriesOf(employee: Employee) {
    return ledger.findByEmployee(employee.tenant_id, employee.id, { limit: 100 })
  }

  beforeEach(async () => {
    employees = new InMemoryEmployees()
    contracts = new InMemoryEmploymentContracts()
    policies = new InMemoryLeavePolicies()
    ledger = new InMemoryLeaveLedger()
    lead = 60
    job = new LeaveGrantJob(
      contracts,
      employees,
      policies,
      ledger,
      { resolve: async () => ({ value: lead }) } as never,
    )
    await addPolicy()
  })

  it('grants the days of the current period once, and a second pass changes nothing', async () => {
    const nurse = await addEmployee('2024-03-15')

    expect(await job.run(now, 50)).toEqual({ count: 1, failed: 0, more: false })
    expect(await job.run(now, 50)).toEqual({ count: 0, failed: 0, more: false })

    expect(await entriesOf(nurse)).toMatchObject([
      {
        tenant_id: tenantA,
        employee_id: nurse.id,
        leave_type: annual,
        period: { start: '2026-03-15', end: '2027-03-14' },
        kind: 'grant',
        days: 12,
        bucket: 'own',
        expires_on: null,
        source: { kind: 'job', ref_id: null, date: null },
        dedupe_key: `${nurse.id}:tahunan:grant:2026-03-15`,
      },
    ])
  })

  it('posts the grant of the coming period ahead of time when it starts within the lead days', async () => {
    const nurse = await addEmployee('2024-12-01')

    expect((await job.run(now, 50)).count).toBe(2)

    expect((await entriesOf(nurse)).map((entry) => entry.period.start)).toEqual(['2025-12-01', '2026-12-01'])
    lead = 30
    const later = await addEmployee('2024-12-20')
    await job.run(now, 50)
    expect((await entriesOf(later)).map((entry) => entry.period.start)).toEqual(['2025-12-20'])
  })

  it('grants the coming period of an employee who reaches the minimum service on its first day', async () => {
    const nurse = await addEmployee('2025-12-30')

    await job.run(now, 50)

    expect((await entriesOf(nurse)).map((entry) => entry.period)).toEqual([{ start: '2026-12-30', end: '2027-12-29' }])
    lead = 30
    const farther = await addEmployee('2026-01-01')
    await job.run(now, 50)
    expect(await entriesOf(farther)).toEqual([])
  })

  it('grants nothing before the minimum service is reached', async () => {
    const newcomer = await addEmployee('2026-06-01')

    expect(await job.run(now, 50)).toEqual({ count: 0, failed: 0, more: false })

    expect(await entriesOf(newcomer)).toEqual([])
  })

  it('grants a calendar-year policy for the year and, within the lead days, the next year', async () => {
    const calendar = new InMemoryLeavePolicies()
    job = new LeaveGrantJob(contracts, employees, calendar, ledger, { resolve: async () => ({ value: lead }) } as never)
    await seed(() =>
      calendar.create({
        tenant_id: tenantA, leave_type: { system: 'id.leave-type', code: 'cuti-tahun' }, effective_from: '2020-01-01',
        balance: { kind: 'period', period: 'calendar_year', days: 10, min_service_months: 12, carry_over: null, deduct_collective_leave: false },
        counting: 'working_days', half_days: false, paid: true, employment_types: [], approval: { steps: 'one_step', two_step_above_days: null },
        notice_days: 0, retroactive_days: 0, max_days_per_request: 366, proof: null, notes: null, source: { kind: 'manual', bundle_id: null },
      }),
    )
    const nurse = await addEmployee('2024-03-15')

    expect((await job.run(now, 50)).count).toBe(2)

    expect((await entriesOf(nurse)).map((entry) => entry.period)).toEqual([
      { start: '2026-01-01', end: '2026-12-31' },
      { start: '2027-01-01', end: '2027-12-31' },
    ])
  })

  it('uses the version in force on the first day of the coming period, and today\'s version for the current one', async () => {
    await addPolicy({ effective_from: '2026-12-15', balance: { kind: 'period', period: 'service_year', days: 14, min_service_months: 12, carry_over: null, deduct_collective_leave: false } })
    const nurse = await addEmployee('2023-12-20')

    await job.run(now, 50)

    expect((await entriesOf(nurse)).map((entry) => [entry.period.start, entry.days])).toEqual([
      ['2025-12-20', 12],
      ['2026-12-20', 14],
    ])
  })

  it('grants only to the employment types the policy allows', async () => {
    await policies.findByFilter(tenantA, { limit: 10 }).then(async ([existing]) => {
      await seed(() => policies.update(existing!.id, { employment_types: [pkwtt] }))
    })
    const permanent = await addEmployee('2024-03-15')
    const fixedTerm = await addEmployee('2024-03-15', { type: pkwt })

    await job.run(now, 50)

    expect(await entriesOf(permanent)).toHaveLength(1)
    expect(await entriesOf(fixedTerm)).toEqual([])
  })

  it('grants nothing to a separated employee, and still grants to a suspended one', async () => {
    const separated = await addEmployee('2024-03-15', { status: 'separated' })
    const suspended = await addEmployee('2024-03-15', { status: 'suspended' })

    await job.run(now, 50)

    expect(await entriesOf(separated)).toEqual([])
    expect(await entriesOf(suspended)).toHaveLength(1)
  })

  it('grants nothing when the active contract is not in force today', async () => {
    const lapsed = await addEmployee('2024-03-15', { end: '2026-06-30' })
    const future = await addEmployee('2027-01-01')

    await job.run(now, 50)

    expect(await entriesOf(lapsed)).toEqual([])
    expect(await entriesOf(future)).toEqual([])
  })

  it('never grants policies without a yearly balance, and handles each tenant with its own policies', async () => {
    await addPolicy({ leave_type: { system: 'id.leave-type', code: 'sakit' }, balance: { kind: 'none' } })
    await addPolicy({ leave_type: { system: 'id.leave-type', code: 'menikah' }, balance: { kind: 'per_event', days: 3 } })
    const inA = await addEmployee('2024-03-15')
    const inB = await addEmployee('2024-03-15', { tenant: tenantB })

    await job.run(now, 50)

    expect((await entriesOf(inA)).map((entry) => entry.leave_type.code)).toEqual(['tahunan'])
    expect(await entriesOf(inB)).toEqual([])
    await addPolicy({}, tenantB)
    await job.run(now, 50)
    expect((await entriesOf(inB)).map((entry) => [entry.tenant_id, entry.leave_type.code])).toEqual([[tenantB, 'tahunan']])
  })

  it('reads the lead days of each tenant and falls back to 60 when the value is not a whole number', async () => {
    lead = 'soon'
    const nurse = await addEmployee('2024-12-01')

    await job.run(now, 50)

    expect((await entriesOf(nurse)).map((entry) => entry.period.start)).toEqual(['2025-12-01', '2026-12-01'])
  })

  it('stops after the batch size and goes on where the next pass finds work', async () => {
    const nurses = [await addEmployee('2024-03-15'), await addEmployee('2024-03-15'), await addEmployee('2024-03-15')]

    const first = await job.run(now, 1)
    const second = await job.run(now, 1)
    const third = await job.run(now, 1)
    const fourth = await job.run(now, 1)

    expect([first, second, third].map((result) => [result.count, result.more])).toEqual([[1, true], [1, true], [1, false]])
    expect(fourth).toEqual({ count: 0, failed: 0, more: false })
    for (const nurse of nurses) {
      expect(await entriesOf(nurse)).toHaveLength(1)
    }
  })

  it('counts a failing employee, keeps going, and retries it on the next pass', async () => {
    const broken = await addEmployee('2024-03-15')
    const fine = await addEmployee('2024-03-15')
    const append = ledger.append.bind(ledger)
    const spy = vi.spyOn(ledger, 'append').mockImplementation(async (entry) => {
      if (entry.employee_id === broken.id) {
        throw new RepositoryUnavailableError('down', { operation: 'x' })
      }
      return append(entry)
    })

    const result = await job.run(now, 50)

    expect(result).toEqual({ count: 1, failed: 1, more: false, error: 'RepositoryUnavailableError', retryable: true })
    expect(await entriesOf(fine)).toHaveLength(1)
    spy.mockRestore()
    expect(await job.run(now, 50)).toMatchObject({ count: 1, failed: 0 })
    expect(await entriesOf(broken)).toHaveLength(1)
  })

  it('writes each grant with the system actor, the reason and its own correlation id', async () => {
    await addEmployee('2024-03-15')
    const seen: { actor?: unknown; reason?: string; correlationId?: string }[] = []
    const append = ledger.append.bind(ledger)
    vi.spyOn(ledger, 'append').mockImplementation(async (entry) => {
      const context = getRequestContext()
      seen.push({ actor: context?.actor, reason: context?.reason, correlationId: context?.correlationId })
      return append(entry)
    })

    await job.run(now, 50)

    expect(seen).toHaveLength(1)
    expect(seen[0]?.actor).toEqual(systemActor('leave-grant-job'))
    expect(seen[0]?.reason).toBe('leave_granted')
    expect(seen[0]?.correlationId).toMatch(/^[0-9a-f-]{36}$/)
  })
})
