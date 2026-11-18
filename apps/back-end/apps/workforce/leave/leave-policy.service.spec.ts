import { Types } from 'mongoose'
import { runWithRequestContext } from '@utility/logger/context'
import { type AppLogger } from '@utility/logger/service'
import { type LeavePolicy } from '@repository/model/leave-policy'
import { CodeConceptService } from '../concept/code-concept.service'
import { InMemoryCodeConcepts, InMemoryLeavePolicies } from '../testing/in-memory'
import { ConflictError, InvalidRequestError, NotFoundError } from '../workforce.error'
import {
  LeavePolicyService,
  type CreateLeavePolicyInput,
} from './leave-policy.service'

describe('LeavePolicyService', () => {
  const tenantId = new Types.ObjectId().toHexString()
  const otherTenantId = new Types.ObjectId().toHexString()
  const log = vi.fn()
  const warn = vi.fn()
  const error = vi.fn()
  const debug = vi.fn()
  let policies: InMemoryLeavePolicies
  let concepts: InMemoryCodeConcepts
  let conceptService: CodeConceptService
  let service: LeavePolicyService

  const annualType = { system: 'id.leave-type', code: 'tahunan' }
  const sickType = { system: 'id.leave-type', code: 'sakit' }
  const pkwtt = { system: 'id.employment-type', code: 'pkwtt' }

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
    return undefined
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
   * Adds a policy version through the service; the defaults are annual leave of 12 days.
   *
   * @param override - Fields that replace the defaults.
   * @returns The policy.
   */
  function create(override: Partial<CreateLeavePolicyInput> = {}) {
    return asAdmin(() =>
      service.create(tenantId, {
        leaveType: annualType,
        effectiveFrom: '2099-01-01',
        balance: {
          kind: 'period',
          period: 'service_year',
          days: 12,
          minServiceMonths: 12,
          carryOver: null,
          deductCollectiveLeave: false,
        },
        counting: 'working_days',
        halfDays: true,
        paid: true,
        employmentTypes: [pkwtt],
        approval: { steps: 'one_step', twoStepAboveDays: null },
        noticeDays: 0,
        retroactiveDays: 0,
        maxDaysPerRequest: 12,
        proof: null,
        notes: null,
        ...override,
      }),
    )
  }

  /**
   * Stores a policy directly, for versions that are already in force.
   *
   * @param effectiveFrom - Start date of the version.
   * @param code - Leave type code.
   * @param tenant - Tenant of the record.
   * @returns The policy.
   */
  function store(effectiveFrom: string, code = 'tahunan', tenant = tenantId) {
    return asAdmin(() =>
      policies.create({
        tenant_id: tenant,
        leave_type: { system: 'id.leave-type', code },
        effective_from: effectiveFrom,
        balance: { kind: 'none' },
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
      } as never),
    )
  }

  /**
   * @returns Everything the logger received, as text.
   */
  function written(): string {
    return JSON.stringify([
      log.mock.calls,
      warn.mock.calls,
      error.mock.calls,
      debug.mock.calls,
    ])
  }

  beforeEach(async () => {
    vi.resetAllMocks()
    policies = new InMemoryLeavePolicies()
    concepts = new InMemoryCodeConcepts()
    const logger = { log, warn, error, debug } as unknown as AppLogger
    conceptService = new CodeConceptService(concepts, logger)
    service = new LeavePolicyService(
      policies,
      conceptService,
      { run: (work: () => Promise<unknown>) => work() } as never,
      logger,
    )
    await addConcept('id.leave-type', 'tahunan')
    await addConcept('id.leave-type', 'sakit')
    await addConcept('id.leave-type', 'lama', 'retired')
    await addConcept('id.employment-type', 'pkwtt')
  })

  describe('create', () => {
    it('adds a manual policy version and writes one log entry without values', async () => {
      const created = await create({ notes: 'PKB Rahasia', reason: 'Alasan Rahasia' })

      expect(created).toMatchObject({
        tenant_id: tenantId,
        leave_type: annualType,
        effective_from: '2099-01-01',
        balance: { kind: 'period', period: 'service_year', days: 12, min_service_months: 12 },
        counting: 'working_days',
        employment_types: [pkwtt],
        source: { kind: 'manual', bundle_id: null },
        notes: 'PKB Rahasia',
      })
      expect(log).toHaveBeenCalledTimes(1)
      expect(log.mock.calls[0]?.[0]).toMatchObject({ event: 'leave_policy_create', outcome: 'success' })
      for (const text of ['PKB Rahasia', 'Alasan Rahasia', 'tahunan', '2099-01-01']) {
        expect(written()).not.toContain(text)
      }
    })

    it.each([
      ['invalid_leave_type', { leaveType: { system: 'id.profession', code: 'perawat' } }],
      ['unknown_code', { leaveType: { system: 'id.leave-type', code: 'tidak_ada' } }],
      ['code_retired', { leaveType: { system: 'id.leave-type', code: 'lama' } }],
      ['invalid_date', { effectiveFrom: '2099-02-30' }],
      ['invalid_date', { effectiveFrom: '1999-12-31' }],
      ['effective_in_past', { effectiveFrom: '2020-01-01' }],
      ['invalid_counting', { counting: 'fortnights' }],
      ['unknown_code', { employmentTypes: [{ system: 'id.employment-type', code: 'tidak_ada' }] }],
    ])('refuses %s', async (code, override) => {
      const thrown = await rejection(() => create(override))

      expect(thrown).toBeInstanceOf(InvalidRequestError)
      expect((thrown as InvalidRequestError).code).toBe(code)
      expect(warn).toHaveBeenCalledTimes(1)
      expect(warn.mock.calls[0]?.[0]).toMatchObject({ event: 'leave_policy_create', outcome: 'failure', code })
    })

    it('answers policy_exists for a second version of the same type and date, and allows the same date for another type', async () => {
      await create()

      const thrown = await rejection(() => create())

      expect(thrown).toBeInstanceOf(ConflictError)
      expect((thrown as ConflictError).code).toBe('policy_exists')
      await expect(create({ leaveType: sickType, balance: { kind: 'none' } })).resolves.toBeDefined()
    })
  })

  describe('update', () => {
    it('changes the rules of a version that is not in force yet and keeps what was not sent', async () => {
      const created = await create()

      const updated = await asAdmin(() =>
        service.update(tenantId, created.id, { paid: false, notes: 'PKB art. 9', version: created.version }),
      )

      expect(updated).toMatchObject({
        paid: false,
        notes: 'PKB art. 9',
        counting: 'working_days',
        balance: { kind: 'period', days: 12 },
        leave_type: annualType,
        effective_from: '2099-01-01',
      })
      expect(log.mock.calls.at(-1)?.[0]).toMatchObject({ event: 'leave_policy_update', outcome: 'success' })
    })

    it('checks the merged rules, so a balance that no longer matches the request limit is refused', async () => {
      const created = await create()

      const thrown = await rejection(() =>
        asAdmin(() => service.update(tenantId, created.id, { balance: { kind: 'per_event', days: 3 } })),
      )

      expect((thrown as InvalidRequestError).code).toBe('invalid_max_days')
    })

    it('refuses a version that is in force (today or earlier)', async () => {
      const inForce = await store('2020-01-01')

      const thrown = await rejection(() =>
        asAdmin(() => service.update(tenantId, inForce.id, { paid: false })),
      )

      expect((thrown as InvalidRequestError).code).toBe('policy_in_force')
    })

    it('refuses an empty update, a stale version and an unknown employment type', async () => {
      const created = await create()

      expect(((await rejection(() => asAdmin(() => service.update(tenantId, created.id, {})))) as InvalidRequestError).code).toBe('empty_update')
      const stale = await rejection(() =>
        asAdmin(() => service.update(tenantId, created.id, { paid: false, version: created.version + 5 })),
      )
      expect(stale).toBeInstanceOf(ConflictError)
      expect((stale as ConflictError).code).toBe('stale_version')
      const unknown = await rejection(() =>
        asAdmin(() =>
          service.update(tenantId, created.id, { employmentTypes: [{ system: 'id.employment-type', code: 'tidak_ada' }] }),
        ),
      )
      expect((unknown as InvalidRequestError).code).toBe('unknown_code')
    })

    it('answers not found for another tenant, a missing and a malformed identifier', async () => {
      const foreign = await store('2099-01-01', 'tahunan', otherTenantId)

      for (const id of [foreign.id, new Types.ObjectId().toHexString(), 'bad']) {
        const thrown = await rejection(() => asAdmin(() => service.update(tenantId, id, { paid: false })))
        expect(thrown).toBeInstanceOf(NotFoundError)
        expect((thrown as NotFoundError).code).toBe('leave_policy_not_found')
      }
    })
  })

  describe('import', () => {
    beforeEach(async () => {
      await asAdmin(() => conceptService.import(tenantId, 'id'))
    })

    it('creates the 13 versions of the Indonesian bundle, then creates none and skips 13', async () => {
      const first = await asAdmin(() => service.import(tenantId, { bundle: 'id', effectiveFrom: '2099-01-01' }))
      const second = await asAdmin(() => service.import(tenantId, { bundle: 'id', effectiveFrom: '2099-01-01' }))

      expect(first).toEqual({ created: 13, skipped: 0 })
      expect(second).toEqual({ created: 0, skipped: 13 })
      const all = await policies.findByFilter(tenantId, { limit: 100 })
      expect(all).toHaveLength(13)
      expect(all.every((policy) => policy.source.kind === 'bundle' && policy.source.bundle_id === 'id')).toBe(true)
      expect(log.mock.calls.filter(([entry]) => entry.event === 'leave_policy_import')).toHaveLength(2)
      expect(log.mock.calls.at(-1)?.[0]).toMatchObject({ created: 0, skipped: 13 })
    })

    it('refuses with concepts_missing before writing anything when a concept is missing or retired', async () => {
      const bare = new InMemoryCodeConcepts()
      const logger = { log, warn, error, debug } as unknown as AppLogger
      const lonely = new LeavePolicyService(policies, new CodeConceptService(bare, logger), { run: (work: () => Promise<unknown>) => work() } as never, logger)

      const thrown = await rejection(() => asAdmin(() => lonely.import(tenantId, { bundle: 'id', effectiveFrom: '2099-01-01' })))

      expect((thrown as InvalidRequestError).code).toBe('concepts_missing')
      expect(await policies.findByFilter(tenantId, { limit: 100 })).toHaveLength(0)
    })

    it('refuses an unknown bundle and a past or invalid date', async () => {
      const code = async (input: { bundle: string; effectiveFrom: string }) =>
        ((await rejection(() => asAdmin(() => service.import(tenantId, input)))) as InvalidRequestError).code
      expect(await code({ bundle: 'xx', effectiveFrom: '2099-01-01' })).toBe('unknown_bundle')
      expect(await code({ bundle: 'id', effectiveFrom: '2020-01-01' })).toBe('effective_in_past')
      expect(await code({ bundle: 'id', effectiveFrom: '2099-13-01' })).toBe('invalid_date')
    })
  })

  describe('reads', () => {
    it('lists by filter, latest version first, never another tenant, and writes no log entry', async () => {
      await store('2020-01-01', 'tahunan')
      await store('2099-01-01', 'tahunan')
      await store('2020-01-01', 'sakit')
      await store('2020-01-01', 'tahunan', otherTenantId)

      const all = await service.list(tenantId, {})
      const annual = await service.list(tenantId, { leaveTypeSystem: 'id.leave-type', leaveTypeCode: 'tahunan' })

      expect(all.map((policy) => `${policy.leave_type.code}@${policy.effective_from}`)).toEqual([
        'sakit@2020-01-01',
        'tahunan@2099-01-01',
        'tahunan@2020-01-01',
      ])
      expect(annual).toHaveLength(2)
      expect(log).not.toHaveBeenCalled()
      expect(warn).not.toHaveBeenCalled()
      expect(error).not.toHaveBeenCalled()
      expect(debug).not.toHaveBeenCalled()
    })

    it('keeps with onDate only the version in force of each type on that date', async () => {
      await store('2020-01-01', 'tahunan')
      await store('2099-01-01', 'tahunan')
      await store('2030-01-01', 'sakit')

      const onDate = (date: string): Promise<LeavePolicy[]> => service.list(tenantId, { onDate: date })

      expect((await onDate('2025-06-01')).map((policy) => `${policy.leave_type.code}@${policy.effective_from}`)).toEqual(['tahunan@2020-01-01'])
      expect((await onDate('2099-01-01')).map((policy) => `${policy.leave_type.code}@${policy.effective_from}`)).toEqual([
        'sakit@2030-01-01',
        'tahunan@2099-01-01',
      ])
      expect(await onDate('2019-12-31')).toEqual([])
    })

    it('answers the version in force of a type, or null, for the other leave services', async () => {
      await store('2020-01-01', 'tahunan')
      await store('2099-01-01', 'tahunan')

      expect((await service.inForce(tenantId, annualType, '2050-01-01'))?.effective_from).toBe('2020-01-01')
      expect(await service.inForce(tenantId, annualType, '2019-12-31')).toBeNull()
      expect(await service.inForce(otherTenantId, annualType, '2050-01-01')).toBeNull()
    })
  })
})
