import { Types } from 'mongoose'
import { runWithRequestContext } from '@utility/logger/context'
import { type AppLogger } from '@utility/logger/service'
import { CodeConceptService } from '../concept/code-concept.service'
import {
  InMemoryCodeConcepts,
  InMemoryCpdRecords,
  InMemoryCpdSummaries,
  InMemoryEmployees,
} from '../testing/in-memory'
import {
  CpdSummaryService,
  type SetCpdSummaryInput,
} from './cpd-summary.service'

describe('CpdSummaryService', () => {
  const tenantId = new Types.ObjectId().toHexString()
  const otherTenantId = new Types.ObjectId().toHexString()
  const log = vi.fn()
  const warn = vi.fn()
  const error = vi.fn()
  const debug = vi.fn()
  let summaries: InMemoryCpdSummaries
  let records: InMemoryCpdRecords
  let employees: InMemoryEmployees
  let concepts: InMemoryCodeConcepts
  let service: CpdSummaryService
  let employeeId: string

  const skp = { system: 'id.credit-system', code: 'skp' }

  /**
   * Runs `work` as a signed-in request.
   *
   * @param work - Code to run.
   * @returns What `work` returns.
   */
  function asAdmin<T>(work: () => Promise<T>): Promise<T> {
    return runWithRequestContext(
      {
        correlationId: 'c1',
        actor: { account_id: 'a1', display_name: 'Admin', kind: 'account' },
      },
      work,
    )
  }

  /**
   * Adds an employee.
   *
   * @param override - Status, tenant and profession.
   * @returns The employee.
   */
  function addEmployee(
    override: {
      status?: 'active' | 'separated'
      tenant?: string
      profession?: boolean
    } = {},
  ) {
    return asAdmin(() =>
      employees.create({
        tenant_id: override.tenant ?? tenantId,
        employee_number: `E${new Types.ObjectId().toHexString()}`,
        name: { use: 'official', text: 'Siti', given: [], prefix: [], suffix: [] },
        other_names: [],
        display_name: 'Siti',
        administrative_gender: null,
        workforce_category: { system: 'id.workforce-category', code: 'tenaga_medis' },
        is_clinical: true,
        profession:
          override.profession === false
            ? null
            : { system: 'id.profession', code: 'dokter' },
        specialties: [],
        clinical_level: null,
        employment_status: override.status ?? 'active',
        employment_status_since: '2026-01-01',
        current_employment: null,
        primary_assignment: null,
        original_hire_date: '2026-01-01',
        separation_date: null,
        practitioner_ids: [],
        work_contacts: [],
        photo: null,
        preferred_language: null,
      }),
    )
  }

  /**
   * Adds a credit record.
   *
   * @param override - Fields that replace the defaults.
   * @returns The record.
   */
  function addRecord(
    override: { date?: string; points?: number; status?: 'accepted' | 'rejected' | 'submitted'; code?: string } = {},
  ) {
    return asAdmin(() =>
      records.create({
        tenant_id: tenantId,
        employee_id: employeeId,
        credit_system: { system: 'id.credit-system', code: override.code ?? 'skp' },
        activity: {
          title: 'Seminar',
          category: { system: 'id.cpd-category', code: 'learning' },
          provider: null,
        },
        activity_date: override.date ?? '2026-03-01',
        points: override.points ?? 10,
        evidence: null,
        source: 'manual',
        status: override.status ?? 'accepted',
      }),
    )
  }

  /**
   * Sets a platform total through the service; override fields to change it.
   *
   * @param override - Fields that replace the defaults.
   * @param code - The credit system code of the path.
   * @returns The total.
   */
  function setTotal(override: Partial<SetCpdSummaryInput> = {}, code = 'skp') {
    return asAdmin(() =>
      service.set(tenantId, employeeId, code, {
        creditSystem: skp,
        cycle: { start: '2026-01-01', end: '2030-12-31' },
        totalPoints: 42.5,
        ...override,
      }),
    )
  }

  /**
   * Captures the rejection of a call.
   *
   * @param work - The call.
   * @returns The thrown error.
   */
  async function rejection(work: () => Promise<unknown>) {
    try {
      await work()
    } catch (thrown: unknown) {
      return thrown
    }
    throw new Error('Expected a rejection')
  }

  beforeEach(async () => {
    vi.resetAllMocks()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-03-10T12:00:00Z'))
    summaries = new InMemoryCpdSummaries()
    records = new InMemoryCpdRecords()
    employees = new InMemoryEmployees()
    concepts = new InMemoryCodeConcepts()
    const logger = { log, warn, error, debug } as unknown as AppLogger
    service = new CpdSummaryService(
      summaries,
      records,
      employees,
      new CodeConceptService(concepts, logger),
      logger,
    )
    for (const [code, status] of [
      ['skp', 'active'],
      ['lama', 'retired'],
    ] as const) {
      await asAdmin(() =>
        concepts.create({
          system: 'id.credit-system',
          code,
          display: [{ locale: 'en', text: code }],
          properties: {},
          mappings: [],
          period: null,
          status,
        }),
      )
    }
    employeeId = (await addEmployee()).id
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('set', () => {
    it('creates the total from the platform, copying the employee profession, and logs one entry without values', async () => {
      const created = await setTotal({ checkedAt: new Date('2026-03-09T00:00:00Z') })

      expect(created).toMatchObject({
        tenant_id: tenantId,
        employee_id: employeeId,
        credit_system: { code: 'skp' },
        profession: { code: 'dokter' },
        cycle: { start: '2026-01-01', end: '2030-12-31' },
        total_points: 42.5,
        source: 'external_platform',
        accepted_points: 0,
      })
      expect(created.checked_at).toEqual(new Date('2026-03-09T00:00:00Z'))
      expect(log).toHaveBeenCalledTimes(1)
      expect(log.mock.calls[0]?.[0]).toMatchObject({
        event: 'cpd_summary_set',
        outcome: 'success',
      })
      expect(JSON.stringify(log.mock.calls)).not.toContain('42.5')
    })

    it('defaults the read time to now and replaces an earlier total instead of adding a second', async () => {
      const first = await setTotal()
      const second = await setTotal({
        cycle: { start: '2027-01-01', end: '2031-12-31' },
        totalPoints: 60,
      })

      expect(first.checked_at).toEqual(new Date('2026-03-10T12:00:00Z'))
      expect(second).toMatchObject({
        id: first.id,
        total_points: 60,
        cycle: { start: '2027-01-01', end: '2031-12-31' },
      })
      expect(await summaries.findByEmployee(tenantId, employeeId)).toHaveLength(1)
    })

    it('shows the accepted points of the cycle: only accepted, only that credit system, only inside the cycle', async () => {
      await addRecord({ date: '2026-02-01', points: 10 })
      await addRecord({ date: '2026-06-15', points: 5.25 })
      await addRecord({ date: '2026-07-01', points: 99, status: 'rejected' })
      await addRecord({ date: '2026-07-02', points: 98, status: 'submitted' })
      await addRecord({ date: '2025-12-31', points: 97 })
      await addRecord({ date: '2031-01-01', points: 96 })
      await addRecord({ date: '2026-08-01', points: 95, code: 'cme' })

      const created = await setTotal()

      expect(created.accepted_points).toBe(15.25)
    })

    it.each([
      ['invalid_credit_system', { creditSystem: { system: 'id.unit-type', code: 'skp' } }],
      ['invalid_cycle', { cycle: { start: '2026-02-30', end: '2030-12-31' } }],
      ['invalid_cycle', { cycle: { start: '2030-12-31', end: '2026-01-01' } }],
      ['invalid_cycle', { cycle: { start: '1900-01-01', end: '2030-12-31' } }],
      ['invalid_cycle', { cycle: { start: '2026-01-01', end: '2050-01-01' } }],
      ['invalid_total', { totalPoints: -1 }],
      ['invalid_total', { totalPoints: 10001 }],
      ['invalid_total', { totalPoints: 1.234 }],
      ['invalid_checked_at', { checkedAt: new Date('2026-03-11T00:00:00Z') }],
    ])('rejects %s', async (code, override) => {
      expect(await rejection(() => setTotal(override))).toMatchObject({ code })
      expect(await summaries.findByEmployee(tenantId, employeeId)).toEqual([])
    })

    it('rejects a retired credit system and a path that differs from the body', async () => {
      expect(
        await rejection(() =>
          setTotal({ creditSystem: { system: 'id.credit-system', code: 'lama' } }, 'lama'),
        ),
      ).toMatchObject({ code: 'code_retired' })
      expect(
        await rejection(() =>
          setTotal({ creditSystem: { system: 'id.credit-system', code: 'nonsense' } }, 'nonsense'),
        ),
      ).toMatchObject({ code: 'unknown_code' })
      expect(await rejection(() => setTotal({}, 'cme'))).toMatchObject({
        code: 'credit_system_mismatch',
      })
    })

    it('accepts a zero total', async () => {
      expect(await setTotal({ totalPoints: 0 })).toMatchObject({ total_points: 0 })
    })

    it('answers 404 for a missing, malformed or foreign employee, and refuses a separated one or one with no profession', async () => {
      const foreign = await addEmployee({ tenant: otherTenantId })
      const separated = await addEmployee({ status: 'separated' })
      const noProfession = await addEmployee({ profession: false })
      const body = {
        creditSystem: skp,
        cycle: { start: '2026-01-01', end: '2030-12-31' },
        totalPoints: 1,
      }

      for (const id of [new Types.ObjectId().toHexString(), 'bad', foreign.id]) {
        expect(
          await rejection(() => asAdmin(() => service.set(tenantId, id, 'skp', body))),
        ).toMatchObject({ code: 'employee_not_found' })
      }
      expect(
        await rejection(() => asAdmin(() => service.set(tenantId, separated.id, 'skp', body))),
      ).toMatchObject({ code: 'employee_separated' })
      expect(
        await rejection(() => asAdmin(() => service.set(tenantId, noProfession.id, 'skp', body))),
      ).toMatchObject({ code: 'profession_required' })
    })
  })

  describe('list', () => {
    it('lists the stored totals with their accepted points, writes no log entry, and shows no total for a system that has only records', async () => {
      await addRecord({ points: 7 })
      await addRecord({ code: 'cme', points: 3 })
      await setTotal()
      log.mockClear()

      const list = await service.list(tenantId, employeeId)

      expect(list).toHaveLength(1)
      expect(list[0]).toMatchObject({
        credit_system: { code: 'skp' },
        total_points: 42.5,
        accepted_points: 7,
      })
      expect([log, warn, error, debug].flatMap((fn) => fn.mock.calls)).toEqual([])
    })

    it('answers 404 for a missing, malformed or foreign employee, without logging', async () => {
      const foreign = await addEmployee({ tenant: otherTenantId })

      for (const id of [new Types.ObjectId().toHexString(), 'bad', foreign.id]) {
        await expect(service.list(tenantId, id)).rejects.toMatchObject({
          code: 'employee_not_found',
        })
      }
      expect([log, warn, error, debug].flatMap((fn) => fn.mock.calls)).toEqual([])
    })

    it('returns an empty list for an employee with no totals', async () => {
      expect(await service.list(tenantId, employeeId)).toEqual([])
    })
  })
})
