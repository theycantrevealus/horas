import { Types } from 'mongoose'
import { runWithRequestContext } from '@utility/logger/context'
import { type AppLogger } from '@utility/logger/service'
import { CodeConceptService } from '../concept/code-concept.service'
import {
  InMemoryCodeConcepts,
  InMemoryCpdRecords,
  InMemoryEmployees,
} from '../testing/in-memory'
import { CpdService, type RegisterCpdInput } from './cpd.service'

describe('CpdService', () => {
  const tenantId = new Types.ObjectId().toHexString()
  const otherTenantId = new Types.ObjectId().toHexString()
  const log = vi.fn()
  const warn = vi.fn()
  const error = vi.fn()
  const debug = vi.fn()
  let records: InMemoryCpdRecords
  let employees: InMemoryEmployees
  let concepts: InMemoryCodeConcepts
  let service: CpdService
  let employeeId: string

  const skp = { system: 'id.credit-system', code: 'skp' }
  const learning = { system: 'id.cpd-category', code: 'learning' }
  const evidence = {
    file_id: 'file-1',
    content_type: 'application/pdf',
    sha256: 'a'.repeat(64),
  }

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
   * Adds a code concept.
   *
   * @param system - Code system.
   * @param code - Code.
   * @param status - Concept status.
   */
  async function addConcept(
    system: string,
    code: string,
    status: 'active' | 'retired' = 'active',
  ) {
    await asAdmin(() =>
      concepts.create({
        system,
        code,
        display: [{ locale: 'en', text: code }],
        properties: {},
        mappings: [],
        period: null,
        status,
      }),
    )
  }

  /**
   * Adds an employee.
   *
   * @param status - Employment status.
   * @param tenant - Tenant of the employee.
   * @returns The employee.
   */
  function addEmployee(
    status: 'active' | 'separated' = 'active',
    tenant = tenantId,
  ) {
    return asAdmin(() =>
      employees.create({
        tenant_id: tenant,
        employee_number: `E${new Types.ObjectId().toHexString()}`,
        name: { use: 'official', text: 'Siti', given: [], prefix: [], suffix: [] },
        other_names: [],
        display_name: 'Siti',
        administrative_gender: null,
        workforce_category: { system: 'id.workforce-category', code: 'tenaga_medis' },
        is_clinical: true,
        profession: { system: 'id.profession', code: 'dokter' },
        specialties: [],
        clinical_level: null,
        employment_status: status,
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
   * Records credits through the service as HR.
   *
   * @param override - Fields that replace the defaults.
   * @returns The record.
   */
  function record(override: Partial<RegisterCpdInput> = {}) {
    return asAdmin(() =>
      service.create(tenantId, {
        employeeId,
        creditSystem: skp,
        activity: { title: 'Seminar jantung', category: learning, provider: 'IDI' },
        activityDate: '2026-03-01',
        points: 12.5,
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
    records = new InMemoryCpdRecords()
    employees = new InMemoryEmployees()
    concepts = new InMemoryCodeConcepts()
    const logger = { log, warn, error, debug } as unknown as AppLogger
    service = new CpdService(
      records,
      employees,
      new CodeConceptService(concepts, logger),
      logger,
    )
    await addConcept('id.credit-system', 'skp')
    await addConcept('id.credit-system', 'lama', 'retired')
    await addConcept('id.cpd-category', 'learning')
    await addConcept('id.cpd-category', 'service')
    employeeId = (await addEmployee()).id
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('recording by HR', () => {
    it('records accepted credits, with trimmed text, no evidence needed, and logs one entry without values', async () => {
      const created = await record({
        activity: { title: '  Seminar jantung ', category: learning, provider: ' ' },
        reason: 'Alasan Rahasia',
      })

      expect(created).toMatchObject({
        tenant_id: tenantId,
        employee_id: employeeId,
        credit_system: { code: 'skp' },
        activity: {
          title: 'Seminar jantung',
          category: { code: 'learning' },
          provider: null,
        },
        activity_date: '2026-03-01',
        points: 12.5,
        evidence: null,
        source: 'manual',
        status: 'accepted',
      })
      expect(log).toHaveBeenCalledTimes(1)
      expect(log.mock.calls[0]?.[0]).toMatchObject({
        event: 'cpd_record_create',
        outcome: 'success',
      })
      expect(JSON.stringify(log.mock.calls)).not.toContain('Seminar jantung')
      expect(JSON.stringify(log.mock.calls)).not.toContain('Alasan Rahasia')
    })

    it('keeps evidence when it is given, lower-casing the hash', async () => {
      const created = await record({
        evidence: { ...evidence, sha256: 'A'.repeat(64) },
      })

      expect(created.evidence).toEqual({ ...evidence, sha256: 'a'.repeat(64) })
    })

    it.each([
      ['invalid_points', { points: 0 }],
      ['invalid_points', { points: -1 }],
      ['invalid_points', { points: 501 }],
      ['invalid_points', { points: 1.234 }],
      ['invalid_activity', { activity: { title: '  ', category: learning } }],
      ['invalid_activity', { activity: { title: 'x'.repeat(201), category: learning } }],
      ['invalid_activity', { activity: { title: 'ok', category: learning, provider: 'x'.repeat(201) } }],
      ['invalid_activity_date', { activityDate: '2026-02-30' }],
      ['invalid_activity_date', { activityDate: '1900-01-01' }],
      ['invalid_activity_date', { activityDate: '2026-03-12' }],
      ['invalid_document', { evidence: { ...evidence, content_type: 'text/html' } }],
      ['invalid_credit_system', { creditSystem: { system: 'id.unit-type', code: 'skp' } }],
      ['invalid_category', { activity: { title: 'ok', category: { system: 'id.unit-type', code: 'x' } } }],
      ['unknown_code', { creditSystem: { system: 'id.credit-system', code: 'nonsense' } }],
      ['code_retired', { creditSystem: { system: 'id.credit-system', code: 'lama' } }],
      ['unknown_code', { activity: { title: 'ok', category: { system: 'id.cpd-category', code: 'nonsense' } } }],
    ])('rejects %s', async (code, override) => {
      expect(await rejection(() => record(override))).toMatchObject({ code })
      expect(await records.findByEmployee(tenantId, employeeId)).toEqual([])
    })

    it('accepts tomorrow as the activity date and a half point', async () => {
      expect(
        await record({ activityDate: '2026-03-11', points: 0.5 }),
      ).toMatchObject({ points: 0.5 })
    })

    it('rejects a missing, foreign or separated employee', async () => {
      const foreign = await addEmployee('active', otherTenantId)
      const separated = await addEmployee('separated')

      for (const id of [new Types.ObjectId().toHexString(), 'bad', foreign.id]) {
        expect(await rejection(() => record({ employeeId: id }))).toMatchObject({
          code: 'employee_not_found',
        })
      }
      expect(
        await rejection(() => record({ employeeId: separated.id })),
      ).toMatchObject({ code: 'employee_separated' })
    })
  })

  describe('self-service', () => {
    const own = (override: Partial<RegisterCpdInput> = {}) => ({
      creditSystem: skp,
      activity: { title: 'Webinar', category: learning },
      activityDate: '2026-03-01',
      points: 2,
      evidence,
      ...override,
    })

    it('submits the own record for review, ignoring any employee id in the body', async () => {
      const other = await addEmployee()

      const created = await asAdmin(() =>
        service.createOwn(tenantId, employeeId, own({ employeeId: other.id })),
      )

      expect(created).toMatchObject({
        employee_id: employeeId,
        status: 'submitted',
        evidence: { file_id: 'file-1' },
      })
      expect(log.mock.calls[0]?.[0]).toMatchObject({ event: 'cpd_record_submit' })
    })

    it('needs evidence, and answers 404 when the account has no employee or one of another tenant', async () => {
      const foreign = await addEmployee('active', otherTenantId)

      expect(
        await rejection(() =>
          asAdmin(() => service.createOwn(tenantId, employeeId, own({ evidence: null }))),
        ),
      ).toMatchObject({ code: 'evidence_required' })
      for (const id of [null, foreign.id, 'bad']) {
        expect(
          await rejection(() => asAdmin(() => service.createOwn(tenantId, id, own()))),
        ).toMatchObject({ code: 'employee_not_found' })
      }
    })
  })

  describe('review', () => {
    /**
     * Submits a record for the employee.
     *
     * @returns The submitted record.
     */
    function submitted() {
      return asAdmin(() =>
        service.createOwn(tenantId, employeeId, {
          creditSystem: skp,
          activity: { title: 'Webinar', category: learning },
          activityDate: '2026-03-01',
          points: 2,
          evidence,
        }),
      )
    }

    const review = (
      id: string,
      input: Parameters<CpdService['review']>[2],
      reviewer: string | null = null,
      tenant = tenantId,
    ) => asAdmin(() => service.review(tenant, id, input, reviewer))

    it('accepts a submitted record and logs one entry without values', async () => {
      const pending = await submitted()
      log.mockClear()

      const accepted = await review(pending.id, {
        outcome: 'accept',
        reason: 'Catatan Rahasia',
        version: pending.version,
      })

      expect(accepted.status).toBe('accepted')
      expect(log.mock.calls[0]?.[0]).toMatchObject({
        event: 'cpd_record_review',
        outcome: 'success',
      })
      expect(JSON.stringify(log.mock.calls)).not.toContain('Catatan Rahasia')
    })

    it('rejects a submitted or accepted record with a reason, and a rejected one is final', async () => {
      const pending = await submitted()
      const hrEntry = await record()

      expect(
        await review(pending.id, { outcome: 'reject', reason: 'Sertifikat tidak sah' }),
      ).toMatchObject({ status: 'rejected' })
      expect(
        await review(hrEntry.id, { outcome: 'reject', reason: 'Salah ketik' }),
      ).toMatchObject({ status: 'rejected' })
      for (const outcome of ['accept', 'reject'] as const) {
        expect(
          await rejection(() =>
            review(pending.id, { outcome, reason: 'lagi' }),
          ),
        ).toMatchObject({ code: 'invalid_transition' })
      }
    })

    it('does not accept an accepted record again', async () => {
      const hrEntry = await record()

      expect(
        await rejection(() => review(hrEntry.id, { outcome: 'accept' })),
      ).toMatchObject({ code: 'invalid_transition' })
    })

    it('needs a reason for a rejection and keeps it short', async () => {
      const pending = await submitted()

      expect(
        await rejection(() => review(pending.id, { outcome: 'reject', reason: '  ' })),
      ).toMatchObject({ code: 'reason_required' })
      expect(
        await rejection(() =>
          review(pending.id, { outcome: 'reject', reason: 'x'.repeat(501) }),
        ),
      ).toMatchObject({ code: 'invalid_reason' })
      expect((await records.findOne(pending.id))?.status).toBe('submitted')
    })

    it('refuses the holder as reviewer', async () => {
      const pending = await submitted()

      expect(
        await rejection(() => review(pending.id, { outcome: 'accept' }, employeeId)),
      ).toMatchObject({ code: 'reviewer_is_holder' })
      expect(
        await review(pending.id, { outcome: 'accept' }, new Types.ObjectId().toHexString()),
      ).toMatchObject({ status: 'accepted' })
    })

    it('rejects a stale version and changes nothing', async () => {
      const pending = await submitted()

      expect(
        await rejection(() =>
          review(pending.id, { outcome: 'accept', version: pending.version + 5 }),
        ),
      ).toMatchObject({ code: 'stale_version' })
      expect((await records.findOne(pending.id))?.status).toBe('submitted')
    })

    it('answers 404 for a missing, malformed or foreign record', async () => {
      const pending = await submitted()

      for (const [tenant, id] of [
        [tenantId, new Types.ObjectId().toHexString()],
        [tenantId, 'bad'],
        [otherTenantId, pending.id],
      ]) {
        expect(
          await rejection(() =>
            review(id as string, { outcome: 'accept' }, null, tenant as string),
          ),
        ).toMatchObject({ code: 'cpd_record_not_found' })
      }
    })
  })

  describe('list', () => {
    it('lists an employee’s records newest first, by credit system and status with paging, and writes no log entry', async () => {
      const older = await record({ activityDate: '2026-01-01' })
      const newer = await record({ activityDate: '2026-03-01' })
      await asAdmin(() => records.update(older.id, { status: 'rejected' }))
      log.mockClear()

      const all = await service.listByEmployee(tenantId, employeeId, {})
      const accepted = await service.listByEmployee(tenantId, employeeId, {
        status: 'accepted',
      })
      const none = await service.listByEmployee(tenantId, employeeId, {
        creditSystem: 'cme',
      })
      const page = await service.listByEmployee(tenantId, employeeId, {
        limit: 1,
        offset: 1,
      })

      expect(all.map((item) => item.id)).toEqual([newer.id, older.id])
      expect(accepted.map((item) => item.id)).toEqual([newer.id])
      expect(none).toEqual([])
      expect(page.map((item) => item.id)).toEqual([older.id])
      expect([log, warn, error, debug].flatMap((fn) => fn.mock.calls)).toEqual([])
    })

    it('answers 404 for a missing, malformed or foreign employee, without logging', async () => {
      const foreign = await addEmployee('active', otherTenantId)

      for (const id of [new Types.ObjectId().toHexString(), 'bad', foreign.id]) {
        await expect(service.listByEmployee(tenantId, id, {})).rejects.toMatchObject({
          code: 'employee_not_found',
        })
      }
      expect([log, warn, error, debug].flatMap((fn) => fn.mock.calls)).toEqual([])
    })
  })
})
