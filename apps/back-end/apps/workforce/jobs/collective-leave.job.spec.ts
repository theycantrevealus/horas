import { Types } from 'mongoose'
import { RepositoryUnavailableError } from '@utility/database/error'
import { systemActor } from '@utility/history/actor'
import { getRequestContext, runWithRequestContext } from '@utility/logger/context'
import { type EmploymentContract } from '@repository/model/employment-contract'
import { type HolidayEntry } from '@repository/model/holiday-calendar'
import { type LeaveLedgerEntry } from '@repository/model/leave-ledger-entry'
import { type LeavePolicy } from '@repository/model/leave-policy'
import { type RosterAssignment } from '@repository/model/roster-assignment'
import {
  InMemoryEmploymentContracts,
  InMemoryFacilities,
  InMemoryHolidayCalendars,
  InMemoryLeaveLedger,
  InMemoryLeavePolicies,
  InMemoryPositionAssignments,
  InMemoryRosterAssignments,
} from '../testing/in-memory'
import { CollectiveLeaveJob } from './collective-leave.job'

describe('CollectiveLeaveJob', () => {
  const tenantA = new Types.ObjectId().toHexString()
  const tenantB = new Types.ObjectId().toHexString()
  const organizationId = new Types.ObjectId().toHexString()
  // 2026-11-19 in UTC; the collective day of most tests is yesterday.
  const now = new Date('2026-11-19T05:00:00Z')
  const actor = { account_id: 'a1', display_name: 'Admin', kind: 'account' as const }
  let calendars: InMemoryHolidayCalendars
  let facilities: InMemoryFacilities
  let assignments: InMemoryPositionAssignments
  let contracts: InMemoryEmploymentContracts
  let rosterAssignments: InMemoryRosterAssignments
  let policies: InMemoryLeavePolicies
  let ledger: InMemoryLeaveLedger
  let job: CollectiveLeaveJob

  const annual = { system: 'id.leave-type', code: 'tahunan' }
  const pkwtt = { system: 'id.employment-type', code: 'pkwtt' }
  const pkwt = { system: 'id.employment-type', code: 'pkwt' }
  const deducting = { kind: 'period' as const, period: 'service_year' as const, days: 12, min_service_months: 12, carry_over: null, deduct_collective_leave: true }

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
   * Adds a facility that uses holiday calendars.
   *
   * @param codes - The calendar codes.
   * @param tenant - Tenant of the record.
   * @returns The facility identifier.
   */
  async function addFacility(codes: string[] = ['id-national'], tenant = tenantA): Promise<string> {
    const facility = await seed(() =>
      facilities.create({
        tenant_id: tenant, organization_id: organizationId, code: `f-${new Types.ObjectId().toHexString()}`, name: [{ locale: 'en', text: 'RS' }],
        address: null, timezone: 'Asia/Jakarta', holiday_calendar_codes: codes, external_ids: [], status: 'active',
      }),
    )
    return facility.id
  }

  /**
   * Adds a holiday calendar with days.
   *
   * @param days - Dates and kinds of the days.
   * @param override - Tenant, code and entry status.
   */
  function addCalendar(days: [string, HolidayEntry['kind']][], override: { tenant?: string | null; code?: string; status?: HolidayEntry['status'] } = {}) {
    return seed(() =>
      calendars.create({
        ...(override.tenant === null ? {} : { tenant_id: override.tenant ?? tenantA }),
        code: override.code ?? 'id-national', year: 2026, country: 'ID', subdivision: null, last_import_id: null,
        holidays: days.map(([date, kind]) => ({ date, name: [{ locale: 'en', text: 'Cuti bersama' }], kind, source: 'manual' as const, status: override.status ?? 'active', import_id: null })),
      }),
    )
  }

  /**
   * Adds an employee with an active contract and an open primary assignment in a facility, and a
   * grant of 12 days in the period that holds the collective day.
   *
   * @param facilityId - The facility.
   * @param options - Contract start and type, tenant, whether the assignment is primary and the grant.
   * @returns The employee identifier.
   */
  async function addEmployee(facilityId: string, options: { start?: string; type?: typeof pkwtt; tenant?: string; primary?: boolean; grant?: number | null; contractStatus?: EmploymentContract['status'] } = {}): Promise<string> {
    const tenant = options.tenant ?? tenantA
    const employeeId = new Types.ObjectId().toHexString()
    const contract = await seed(() =>
      contracts.create({
        tenant_id: tenant, employee_id: employeeId, organization_id: organizationId, contract_number: `C${employeeId.slice(-6)}`,
        employment_type: options.type ?? pkwtt, period: { start: options.start ?? '2024-03-15', end: null }, probation_end_date: null, fte: 1,
        working_time_scheme: null, status: options.contractStatus ?? 'active', previous_contract_id: null, termination: null, document: null,
      }),
    )
    await seed(() =>
      assignments.create({
        tenant_id: tenant, employee_id: employeeId, contract_id: contract.id, position_id: new Types.ObjectId().toHexString(), unit_id: new Types.ObjectId().toHexString(),
        facility_id: facilityId, is_primary: options.primary ?? true, is_head_of_unit: false, kind: { system: 'id.assignment-kind', code: 'hire' },
        period: { start: '2024-03-15', end: null }, fte: 1, status: 'active', is_open: true, decision_ref: null,
      }),
    )
    if (options.grant !== null) {
      await post(employeeId, 'grant', options.grant ?? 12, { tenant_id: tenant })
    }
    return employeeId
  }

  /**
   * Stores a policy version.
   *
   * @param override - Fields that replace the deducting annual leave defaults.
   * @param tenant - Tenant of the record.
   */
  function addPolicy(override: Partial<LeavePolicy> = {}, tenant = tenantA) {
    return seed(() =>
      policies.create({
        tenant_id: tenant, leave_type: annual, effective_from: '2020-01-01', balance: deducting, counting: 'working_days', half_days: false, paid: true,
        employment_types: [], approval: { steps: 'one_step', two_step_above_days: null }, notice_days: 0, retroactive_days: 0, max_days_per_request: 366,
        proof: null, notes: null, source: { kind: 'manual', bundle_id: null }, ...override,
      }),
    )
  }

  /**
   * Posts a ledger entry directly, by default into the period 2026-03-15 to 2027-03-14.
   *
   * @param employeeId - The employee.
   * @param kind - What the entry does.
   * @param days - Signed days.
   * @param override - Other fields.
   */
  function post(employeeId: string, kind: LeaveLedgerEntry['kind'], days: number, override: Partial<LeaveLedgerEntry> = {}) {
    return seed(() =>
      ledger.append({
        tenant_id: tenantA, employee_id: employeeId, leave_type: annual, period: { start: '2026-03-15', end: '2027-03-14' }, kind, days, bucket: 'own',
        expires_on: null, source: { kind: 'job', ref_id: null, date: null }, dedupe_key: null, ...override,
      }),
    )
  }

  /**
   * Plans a shift for an employee on a date.
   *
   * @param employeeId - The employee.
   * @param date - The date.
   * @param type - Shift type.
   */
  function plan(employeeId: string, date: string, type: 'regular' | 'off' = 'regular') {
    return seed(() =>
      rosterAssignments.create({
        tenant_id: tenantA, roster_id: new Types.ObjectId().toHexString(), unit_id: new Types.ObjectId().toHexString(), facility_id: new Types.ObjectId().toHexString(),
        employee_id: employeeId, date, shift: { definition_id: new Types.ObjectId().toHexString(), code: 'P', type, start_time: '07:00', end_time: '15:00', paid_minutes: 480, is_night: false },
        starts_at: new Date(`${date}T00:00:00Z`), ends_at: new Date(`${date}T08:00:00Z`), role: 'staff', status: 'planned', source: { kind: 'roster', ref_id: null },
        change_reason: null, revision: 1, overtime: null, flag: null, is_flagged: false,
      } as Omit<RosterAssignment, 'id'> as never),
    )
  }

  /**
   * @param employeeId - The employee.
   * @returns The employee's ledger entries.
   */
  function entriesOf(employeeId: string) {
    return ledger.findByEmployee(tenantA, employeeId, { limit: 100 })
  }

  let facilityId: string

  beforeEach(async () => {
    calendars = new InMemoryHolidayCalendars()
    facilities = new InMemoryFacilities()
    assignments = new InMemoryPositionAssignments()
    contracts = new InMemoryEmploymentContracts()
    rosterAssignments = new InMemoryRosterAssignments()
    policies = new InMemoryLeavePolicies()
    ledger = new InMemoryLeaveLedger()
    job = new CollectiveLeaveJob(calendars, facilities, assignments, contracts, rosterAssignments, policies, ledger, { run: (work: () => Promise<unknown>) => work() } as never)
    await addPolicy()
    facilityId = await addFacility()
    await addCalendar([['2026-11-18', 'collective_leave']])
  })

  it('deducts one day, once, from an employee who did not work on a collective leave day', async () => {
    const nurse = await addEmployee(facilityId)

    expect(await job.run(now, 50)).toEqual({ count: 1, failed: 0, more: false })
    expect(await job.run(now, 50)).toEqual({ count: 0, failed: 0, more: false })

    expect((await entriesOf(nurse)).filter((entry) => entry.kind === 'use')).toMatchObject([
      {
        tenant_id: tenantA,
        employee_id: nurse,
        leave_type: annual,
        period: { start: '2026-03-15', end: '2027-03-14' },
        days: -1,
        bucket: 'own',
        expires_on: null,
        source: { kind: 'collective_leave', ref_id: null, date: '2026-11-18' },
        dedupe_key: `${nurse}:tahunan:collective:2026-11-18`,
      },
    ])
  })

  it('keeps the day of an employee who worked, and deducts from one with only a day off planned', async () => {
    const worked = await addEmployee(facilityId)
    await plan(worked, '2026-11-18', 'regular')
    const dayOff = await addEmployee(facilityId)
    await plan(dayOff, '2026-11-18', 'off')

    await job.run(now, 50)

    expect((await entriesOf(worked)).filter((entry) => entry.kind === 'use')).toEqual([])
    expect((await entriesOf(dayOff)).filter((entry) => entry.kind === 'use')).toHaveLength(1)
  })

  it('uses carried-over days first, and splits a day over the two kinds of days when only half a day is carried over', async () => {
    const carrying = await addEmployee(facilityId)
    await post(carrying, 'carry_over', 3, { bucket: 'carry_over', expires_on: '2027-05-18' })
    const half = await addEmployee(facilityId)
    await post(half, 'carry_over', 0.5, { bucket: 'carry_over', expires_on: '2027-05-18' })

    await job.run(now, 50)

    expect((await entriesOf(carrying)).filter((entry) => entry.kind === 'use').map((entry) => [entry.bucket, entry.days, entry.dedupe_key])).toEqual([
      ['carry_over', -1, `${carrying}:tahunan:collective:2026-11-18:carry`],
    ])
    expect((await entriesOf(half)).filter((entry) => entry.kind === 'use').map((entry) => [entry.bucket, entry.days]).sort((left, right) => String(left).localeCompare(String(right)))).toEqual([['carry_over', -0.5], ['own', -0.5]])
  })

  it('deducts nothing when less than a day is left, so the balance never goes below zero', async () => {
    const nearlyOut = await addEmployee(facilityId, { grant: 0.5 })
    const none = await addEmployee(facilityId, { grant: null })

    expect(await job.run(now, 50)).toEqual({ count: 0, failed: 0, more: false })

    expect(await entriesOf(nearlyOut)).toHaveLength(1)
    expect(await entriesOf(none)).toEqual([])
  })

  it('deducts only for a leave type whose policy takes collective leave from the balance, and only for yearly balances', async () => {
    await addPolicy({ effective_from: '2026-11-01', balance: { ...deducting, deduct_collective_leave: false } })
    const off = await addEmployee(facilityId)

    expect(await job.run(now, 50)).toEqual({ count: 0, failed: 0, more: false })
    expect((await entriesOf(off)).filter((entry) => entry.kind === 'use')).toEqual([])
    await addPolicy({ leave_type: { system: 'id.leave-type', code: 'sakit' }, balance: { kind: 'none' } })
    expect(await job.run(now, 50)).toEqual({ count: 0, failed: 0, more: false })
  })

  it('uses the version in force on the collective day', async () => {
    await addPolicy({ effective_from: '2026-11-19', balance: { ...deducting, deduct_collective_leave: false } })
    const nurse = await addEmployee(facilityId)

    await job.run(now, 50)

    expect((await entriesOf(nurse)).filter((entry) => entry.kind === 'use')).toHaveLength(1)
  })

  it('looks back 7 days and deducts each collective day once', async () => {
    // 2026-11-12 is 7 days back, 2026-11-11 is 8 days back, 2026-11-19 is today.
    await addCalendar([['2026-11-12', 'collective_leave'], ['2026-11-11', 'collective_leave'], ['2026-11-19', 'collective_leave']], { code: 'id-extra' })
    const both = await addFacility(['id-national', 'id-extra'])
    const nurse = await addEmployee(both)

    await job.run(now, 50)
    await job.run(now, 50)

    expect((await entriesOf(nurse)).filter((entry) => entry.kind === 'use').map((entry) => entry.source.date ?? '').sort((left, right) => left.localeCompare(right))).toEqual(['2026-11-12', '2026-11-18'])
  })

  it('ignores other kinds of days, removed days, platform calendars and facilities that do not use the calendar', async () => {
    const other = await addFacility(['id-jk'])
    const outsider = await addEmployee(other)
    const publicDay = new InMemoryHolidayCalendars()
    job = new CollectiveLeaveJob(publicDay, facilities, assignments, contracts, rosterAssignments, policies, ledger, { run: (work: () => Promise<unknown>) => work() } as never)
    await seed(() => publicDay.create({ tenant_id: tenantA, code: 'id-national', year: 2026, country: 'ID', subdivision: null, last_import_id: null, holidays: [
      { date: '2026-11-18', name: [{ locale: 'en', text: 'Libur' }], kind: 'public', source: 'manual', status: 'active', import_id: null },
      { date: '2026-11-17', name: [{ locale: 'en', text: 'Cuti' }], kind: 'collective_leave', source: 'manual', status: 'removed', import_id: null },
    ] }))
    await seed(() => publicDay.create({ code: 'id-national', year: 2026, country: 'ID', subdivision: null, last_import_id: null, holidays: [
      { date: '2026-11-18', name: [{ locale: 'en', text: 'Cuti' }], kind: 'collective_leave', source: 'manual', status: 'active', import_id: null },
    ] }))
    const nurse = await addEmployee(facilityId)

    expect(await job.run(now, 50)).toEqual({ count: 0, failed: 0, more: false })
    expect(await entriesOf(nurse)).toHaveLength(1)
    expect(await entriesOf(outsider)).toHaveLength(1)
  })

  it('deducts only from employees whose open primary assignment is in a facility that uses the calendar', async () => {
    const secondary = await addEmployee(facilityId, { primary: false })
    const other = await addFacility(['id-jk'])
    const elsewhere = await addEmployee(other)

    expect(await job.run(now, 50)).toEqual({ count: 0, failed: 0, more: false })

    expect(await entriesOf(secondary)).toHaveLength(1)
    expect(await entriesOf(elsewhere)).toHaveLength(1)
  })

  it('deducts only for an allowed employment type, and only for an employee employed on that day', async () => {
    await addPolicy({ effective_from: '2026-11-10', employment_types: [pkwtt] })
    const fixedTerm = await addEmployee(facilityId, { type: pkwt })
    const later = await addEmployee(facilityId, { start: '2026-11-19' })
    const permanent = await addEmployee(facilityId)

    await job.run(now, 50)

    expect((await entriesOf(fixedTerm)).filter((entry) => entry.kind === 'use')).toEqual([])
    expect((await entriesOf(later)).filter((entry) => entry.kind === 'use')).toEqual([])
    expect((await entriesOf(permanent)).filter((entry) => entry.kind === 'use')).toHaveLength(1)
  })

  it('handles each tenant with its own calendars, facilities and policies', async () => {
    const facilityB = await addFacility(['id-national'], tenantB)
    const inB = await addEmployee(facilityB, { tenant: tenantB })

    expect(await job.run(now, 50)).toEqual({ count: 0, failed: 0, more: false })
    expect(await ledger.findByEmployee(tenantB, inB, { limit: 10 })).toHaveLength(1)
    await addPolicy({}, tenantB)
    await addCalendar([['2026-11-18', 'collective_leave']], { tenant: tenantB })
    expect((await job.run(now, 50)).count).toBe(1)
    expect((await ledger.findByEmployee(tenantB, inB, { limit: 10 })).filter((entry) => entry.kind === 'use')[0]?.tenant_id).toBe(tenantB)
  })

  it('stops after the batch size, and counts a failing employee without stopping the others', async () => {
    const first = await addEmployee(facilityId)
    const second = await addEmployee(facilityId)

    const one = await job.run(now, 1)
    const two = await job.run(now, 1)

    expect([one, two].map((result) => [result.count, result.more])).toEqual([[1, true], [1, false]])
    expect((await entriesOf(first)).length + (await entriesOf(second)).length).toBe(4)
    const broken = await addEmployee(facilityId)
    const fine = await addEmployee(facilityId)
    const append = ledger.append.bind(ledger)
    const spy = vi.spyOn(ledger, 'append').mockImplementation(async (entry) => {
      if (entry.employee_id === broken) {
        throw new RepositoryUnavailableError('down', { operation: 'x' })
      }
      return append(entry)
    })

    const result = await job.run(now, 50)

    expect(result).toEqual({ count: 1, failed: 1, more: false, error: 'RepositoryUnavailableError', retryable: true })
    expect((await entriesOf(fine)).filter((entry) => entry.kind === 'use')).toHaveLength(1)
    spy.mockRestore()
    expect(await job.run(now, 50)).toMatchObject({ count: 1, failed: 0 })
  })

  it('writes each deduction with the system actor, the reason and its own correlation id', async () => {
    await addEmployee(facilityId)
    const seen: { actor?: unknown; reason?: string; correlationId?: string }[] = []
    const append = ledger.append.bind(ledger)
    vi.spyOn(ledger, 'append').mockImplementation(async (entry) => {
      const context = getRequestContext()
      seen.push({ actor: context?.actor, reason: context?.reason, correlationId: context?.correlationId })
      return append(entry)
    })

    await job.run(now, 50)

    expect(seen).toHaveLength(1)
    expect(seen[0]?.actor).toEqual(systemActor('collective-leave-job'))
    expect(seen[0]?.reason).toBe('collective_leave')
    expect(seen[0]?.correlationId).toMatch(/^[0-9a-f-]{36}$/)
  })
})
