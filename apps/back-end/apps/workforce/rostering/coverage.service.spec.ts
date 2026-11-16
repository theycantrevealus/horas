import { Types } from 'mongoose'
import { runWithRequestContext } from '@utility/logger/context'
import { type AppLogger } from '@utility/logger/service'
import { type CoverageRequirement } from '@repository/model/coverage-requirement'
import { CodeConceptService } from '../concept/code-concept.service'
import {
  InMemoryCodeConcepts,
  InMemoryCoverageRequirements,
  InMemoryFacilities,
  InMemoryOrganizationUnits,
  InMemoryShiftDefinitions,
} from '../testing/in-memory'
import { CoverageService, type CreateCoverageInput } from './coverage.service'

describe('CoverageService', () => {
  const tenantId = new Types.ObjectId().toHexString()
  const otherTenantId = new Types.ObjectId().toHexString()
  const organizationId = new Types.ObjectId().toHexString()
  const log = vi.fn()
  const warn = vi.fn()
  const error = vi.fn()
  const debug = vi.fn()
  let requirements: InMemoryCoverageRequirements
  let units: InMemoryOrganizationUnits
  let shifts: InMemoryShiftDefinitions
  let facilities: InMemoryFacilities
  let concepts: InMemoryCodeConcepts
  let service: CoverageService
  let facilityId: string
  let unitId: string
  let shiftId: string

  const nurse = { system: 'id.profession', code: 'perawat' }
  const level = { system: 'id.clinical-level', code: 'pk2' }

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
  async function addConcept(system: string, code: string, status: 'active' | 'retired' = 'active') {
    await asAdmin(() =>
      concepts.create({ system, code, display: [{ locale: 'en', text: code }], properties: {}, mappings: [], period: null, status }),
    )
  }

  /**
   * Adds a facility.
   *
   * @param timezone - Its time zone.
   * @returns The facility identifier.
   */
  async function addFacility(timezone = 'Asia/Jakarta') {
    const facility = await asAdmin(() =>
      facilities.create({
        tenant_id: tenantId,
        organization_id: organizationId,
        code: `f-${new Types.ObjectId().toHexString()}`,
        name: [{ locale: 'en', text: 'RS' }],
        address: null,
        timezone,
        holiday_calendar_codes: [],
        external_ids: [],
        status: 'active',
      }),
    )
    return facility.id
  }

  /**
   * Adds a unit.
   *
   * @param facility - Its facility.
   * @param override - Status and tenant.
   * @returns The unit identifier.
   */
  async function addUnit(facility: string, override: { status?: 'active' | 'closed'; tenant?: string } = {}) {
    const unit = await asAdmin(() =>
      units.create({
        tenant_id: override.tenant ?? tenantId,
        organization_id: organizationId,
        facility_id: facility,
        code: `u-${new Types.ObjectId().toHexString()}`,
        name: [{ locale: 'en', text: 'Ward' }],
        type: { system: 'id.unit-type', code: 'ward' },
        parent_id: null,
        ancestor_ids: [],
        is_clinical: true,
        external_ids: [],
        period: { start: '2026-01-01', end: null },
        status: override.status ?? 'active',
      }),
    )
    return unit.id
  }

  /**
   * Adds a shift.
   *
   * @param override - Fields that replace the defaults of a regular morning shift.
   * @returns The shift identifier.
   */
  async function addShift(
    override: Partial<{ facility_id: string; unit_ids: string[]; type: 'regular' | 'off' | 'on_call_onsite'; status: 'active' | 'retired'; tenant_id: string }> = {},
  ) {
    const off = override.type === 'off'
    const shift = await asAdmin(() =>
      shifts.create({
        tenant_id: override.tenant_id ?? tenantId,
        facility_id: override.facility_id ?? facilityId,
        code: `S${new Types.ObjectId().toHexString().slice(-6)}`.toUpperCase(),
        name: [{ locale: 'en', text: 'Shift' }],
        type: override.type ?? 'regular',
        start_time: off ? null : '07:00',
        end_time: off ? null : '14:00',
        paid_minutes: off ? 0 : 420,
        is_night: false,
        unit_ids: override.unit_ids ?? [],
        status: override.status ?? 'active',
      }),
    )
    return shift.id
  }

  /**
   * Adds a requirement through the service; the defaults ask for 3 nurses of level pk2 or higher.
   *
   * @param override - Fields that replace the defaults.
   * @returns The requirement.
   */
  function create(override: Partial<CreateCoverageInput> = {}) {
    return asAdmin(() =>
      service.create(tenantId, {
        unitId,
        shiftId,
        dayPattern: 'all',
        match: { profession: nurse, minClinicalLevel: level },
        minCount: 3,
        teamLeaderRequired: true,
        period: { start: '2099-01-01' },
        ...override,
      }),
    )
  }

  /**
   * Stores a requirement directly.
   *
   * @param override - Fields that replace the defaults.
   * @returns The requirement.
   */
  function store(override: Partial<CoverageRequirement> = {}) {
    return asAdmin(() =>
      requirements.create({
        tenant_id: tenantId,
        unit_id: unitId,
        shift_definition_id: shiftId,
        day_pattern: 'all',
        match: { workforce_category: null, profession: null, specialty: null, min_clinical_level: null },
        min_count: 1,
        team_leader_required: false,
        period: { start: '2099-01-01', end: null },
        status: 'active',
        ...override,
      }),
    )
  }

  beforeEach(async () => {
    vi.resetAllMocks()
    requirements = new InMemoryCoverageRequirements()
    units = new InMemoryOrganizationUnits()
    shifts = new InMemoryShiftDefinitions()
    facilities = new InMemoryFacilities()
    concepts = new InMemoryCodeConcepts()
    const logger = { log, warn, error, debug } as unknown as AppLogger
    service = new CoverageService(requirements, units, shifts, facilities, new CodeConceptService(concepts, logger), logger)
    await addConcept('id.profession', 'perawat')
    await addConcept('id.profession', 'lama', 'retired')
    await addConcept('id.workforce-category', 'tenaga_keperawatan')
    await addConcept('id.specialty', 'bedah')
    await addConcept('id.clinical-level', 'pk2')
    facilityId = await addFacility()
    unitId = await addUnit(facilityId)
    shiftId = await addShift()
  })

  describe('create', () => {
    it('adds a requirement with cleaned criteria, and writes one log entry without values', async () => {
      const created = await create({ period: { start: '2099-01-01', end: '2099-12-31' }, reason: 'Alasan Rahasia' })

      expect(created).toMatchObject({
        tenant_id: tenantId,
        unit_id: unitId,
        shift_definition_id: shiftId,
        day_pattern: 'all',
        match: { workforce_category: null, profession: nurse, specialty: null, min_clinical_level: level },
        min_count: 3,
        team_leader_required: true,
        period: { start: '2099-01-01', end: '2099-12-31' },
        status: 'active',
      })
      expect(log).toHaveBeenCalledTimes(1)
      expect(log.mock.calls[0]?.[0]).toMatchObject({ event: 'coverage_create', outcome: 'success' })
      const written = JSON.stringify([log.mock.calls, warn.mock.calls, error.mock.calls])
      for (const text of ['Alasan Rahasia', 'perawat', '2099-01-01']) {
        expect(written).not.toContain(text)
      }
    })

    it('adds a requirement with no criteria, an open end and no team leader, and uses the on-call shifts', async () => {
      const onCall = await addShift({ type: 'on_call_onsite' })

      const created = await create({ shiftId: onCall, match: undefined, teamLeaderRequired: undefined })

      expect(created).toMatchObject({
        match: { workforce_category: null, profession: null, specialty: null, min_clinical_level: null },
        team_leader_required: false,
        period: { start: '2099-01-01', end: null },
      })
    })

    it.each([
      ['invalid_day_pattern', { dayPattern: 'weekends' }],
      ['invalid_min_count', { minCount: 0 }],
      ['invalid_min_count', { minCount: 100 }],
      ['invalid_min_count', { minCount: 1.5 }],
      ['invalid_period', { period: { start: '2099-02-30' } }],
      ['invalid_period', { period: { start: '2099-03-02', end: '2099-03-01' } }],
      ['invalid_period', { period: { start: '1999-12-31' } }],
      ['invalid_category', { match: { workforceCategory: nurse } }],
      ['invalid_profession', { match: { profession: { system: 'id.specialty', code: 'bedah' } } }],
      ['invalid_specialty', { match: { specialty: nurse } }],
      ['invalid_clinical_level', { match: { minClinicalLevel: nurse } }],
      ['unknown_code', { match: { profession: { system: 'id.profession', code: 'tidak-ada' } } }],
      ['code_retired', { match: { profession: { system: 'id.profession', code: 'lama' } } }],
    ])('refuses %s and stores nothing', async (code, override) => {
      expect(await rejection(() => create(override as Partial<CreateCoverageInput>))).toMatchObject({ code })
      expect(await requirements.findByFilter(tenantId)).toEqual([])
      expect(warn.mock.calls[0]?.[0]).toMatchObject({ event: 'coverage_create', outcome: 'failure', code })
    })

    it('accepts every criterion together', async () => {
      const created = await create({
        match: { workforceCategory: { system: 'id.workforce-category', code: 'tenaga_keperawatan' }, profession: nurse, specialty: { system: 'id.specialty', code: 'bedah' }, minClinicalLevel: level },
      })
      expect(created.match.specialty).toEqual({ system: 'id.specialty', code: 'bedah' })
    })

    it('refuses a unit that is missing, malformed, foreign or closed', async () => {
      const foreign = await addUnit(facilityId, { tenant: otherTenantId })
      const closed = await addUnit(facilityId, { status: 'closed' })

      for (const id of [foreign, new Types.ObjectId().toHexString(), 'bad']) {
        expect(await rejection(() => create({ unitId: id }))).toMatchObject({ code: 'unit_not_found' })
      }
      expect(await rejection(() => create({ unitId: closed }))).toMatchObject({ code: 'unit_closed' })
    })

    it('refuses a shift that is missing, foreign, retired, of another facility, not usable by the unit, or an off shift', async () => {
      const otherFacility = await addFacility()
      const otherUnit = await addUnit(facilityId)

      const foreignShift = await addShift({ tenant_id: otherTenantId })
      for (const id of [foreignShift, new Types.ObjectId().toHexString(), 'bad']) {
        expect(await rejection(() => create({ shiftId: id }))).toMatchObject({ code: 'shift_not_found' })
      }
      const retired = await addShift({ status: 'retired' })
      const elsewhere = await addShift({ facility_id: otherFacility })
      const restricted = await addShift({ unit_ids: [otherUnit] })
      const off = await addShift({ type: 'off' })
      expect(await rejection(() => create({ shiftId: retired }))).toMatchObject({ code: 'shift_retired' })
      expect(await rejection(() => create({ shiftId: elsewhere }))).toMatchObject({ code: 'shift_outside_facility' })
      expect(await rejection(() => create({ shiftId: restricted }))).toMatchObject({ code: 'shift_unit_not_allowed' })
      expect(await rejection(() => create({ shiftId: off }))).toMatchObject({ code: 'shift_not_countable' })
      const allowed = await addShift({ unit_ids: [unitId] })
      expect((await create({ shiftId: allowed })).unit_id).toBe(unitId)
    })

    it('refuses an identical active requirement with an overlapping period, and allows the rest', async () => {
      await create({ period: { start: '2099-03-01', end: '2099-03-31' } })

      expect(await rejection(() => create({ period: { start: '2099-03-31', end: null } }))).toMatchObject({ kind: 'conflict', code: 'requirement_exists' })
      await create({ period: { start: '2099-04-01', end: null } })
      await create({ period: { start: '2099-03-01', end: '2099-03-31' }, dayPattern: 'weekdays' })
      await create({ period: { start: '2099-03-01', end: '2099-03-31' }, match: { profession: nurse } })
      await create({ period: { start: '2099-03-01', end: '2099-03-31' }, shiftId: await addShift() })
      await create({ period: { start: '2099-03-01', end: '2099-03-31' }, unitId: await addUnit(facilityId) })
    })

    it('does not count a retired requirement as a duplicate', async () => {
      const first = await create()
      await asAdmin(() => service.retire(tenantId, first.id, {}))

      await create()
    })
  })

  describe('update', () => {
    it('changes every field of a requirement that has not started, and checks the whole again', async () => {
      const created = await create()

      const updated = await asAdmin(() =>
        service.update(tenantId, created.id, {
          dayPattern: 'weekdays',
          match: { profession: nurse },
          minCount: 5,
          teamLeaderRequired: false,
          periodEnd: '2099-12-31',
          reason: 'Alasan Rahasia',
        }),
      )

      expect(updated).toMatchObject({
        day_pattern: 'weekdays',
        match: { workforce_category: null, profession: nurse, specialty: null, min_clinical_level: null },
        min_count: 5,
        team_leader_required: false,
        period: { start: '2099-01-01', end: '2099-12-31' },
        unit_id: unitId,
        shift_definition_id: shiftId,
      })
      expect(log.mock.calls.at(-1)?.[0]).toMatchObject({ event: 'coverage_update', outcome: 'success' })
      expect(JSON.stringify([log.mock.calls, warn.mock.calls])).not.toContain('Alasan Rahasia')
    })

    it('clears the end of the period with null, and replaces the criteria as a whole', async () => {
      const created = await create({ period: { start: '2099-01-01', end: '2099-06-30' } })

      const updated = await asAdmin(() => service.update(tenantId, created.id, { periodEnd: null, match: {} }))

      expect(updated.period.end).toBeNull()
      expect(updated.match).toEqual({ workforce_category: null, profession: null, specialty: null, min_clinical_level: null })
    })

    it('lets a requirement that has started change only its last day', async () => {
      const started = await store({ period: { start: '2020-01-01', end: null } })

      for (const input of [{ minCount: 2 }, { dayPattern: 'weekdays' as const }, { match: {} }, { teamLeaderRequired: true }, { minCount: 2, periodEnd: '2099-12-31' }]) {
        expect(await rejection(() => asAdmin(() => service.update(tenantId, started.id, input)))).toMatchObject({ code: 'requirement_in_force' })
      }
      const ended = await asAdmin(() => service.update(tenantId, started.id, { periodEnd: '2030-12-31' }))
      expect(ended.period).toEqual({ start: '2020-01-01', end: '2030-12-31' })
      expect(ended.min_count).toBe(1)
    })

    it('reads "today" in the time zone of the unit\'s facility', async () => {
      const sydney = await addFacility('Pacific/Kiritimati')
      const unit = await addUnit(sydney)
      const shift = await addShift({ facility_id: sydney })
      const tomorrowUtc = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10)
      const todayInKiritimati = new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Kiritimati' }).format(new Date())
      const requirement = await store({ unit_id: unit, shift_definition_id: shift, period: { start: todayInKiritimati, end: null } })

      expect(await rejection(() => asAdmin(() => service.update(tenantId, requirement.id, { minCount: 2 })))).toMatchObject({ code: 'requirement_in_force' })
      expect(tomorrowUtc >= todayInKiritimati).toBe(true)
    })

    it('refuses an empty update, a retired requirement, a bad period end and a bad field', async () => {
      const created = await create()
      const retired = await store({ status: 'retired' })

      expect(await rejection(() => asAdmin(() => service.update(tenantId, created.id, {})))).toMatchObject({ code: 'empty_update' })
      expect(await rejection(() => asAdmin(() => service.update(tenantId, retired.id, { minCount: 2 })))).toMatchObject({ code: 'requirement_retired' })
      expect(await rejection(() => asAdmin(() => service.update(tenantId, created.id, { periodEnd: '2098-12-31' })))).toMatchObject({ code: 'invalid_period' })
      expect(await rejection(() => asAdmin(() => service.update(tenantId, created.id, { minCount: 0 })))).toMatchObject({ code: 'invalid_min_count' })
      expect(await rejection(() => asAdmin(() => service.update(tenantId, created.id, { match: { profession: { system: 'id.profession', code: 'lama' } } })))).toMatchObject({ code: 'code_retired' })
      expect((await requirements.findOne(created.id))?.min_count).toBe(3)
    })

    it('refuses a change that would duplicate another active requirement, and ignores itself', async () => {
      await create({ dayPattern: 'weekdays', match: {} })
      const other = await create({ dayPattern: 'all', match: {} })

      expect(await rejection(() => asAdmin(() => service.update(tenantId, other.id, { dayPattern: 'weekdays' })))).toMatchObject({ code: 'requirement_exists' })
      const same = await asAdmin(() => service.update(tenantId, other.id, { dayPattern: 'all', minCount: 9 }))
      expect(same.min_count).toBe(9)
    })

    it('refuses a stale version, and answers not found for a missing, malformed or foreign requirement', async () => {
      const created = await create()
      const foreign = await store({ tenant_id: otherTenantId })

      expect(await rejection(() => asAdmin(() => service.update(tenantId, created.id, { minCount: 2, version: created.version + 5 })))).toMatchObject({ code: 'stale_version' })
      for (const id of [foreign.id, new Types.ObjectId().toHexString(), 'bad']) {
        expect(await rejection(() => asAdmin(() => service.update(tenantId, id, { minCount: 2 })))).toMatchObject({ code: 'requirement_not_found' })
      }
      expect((await asAdmin(() => service.update(tenantId, created.id, { minCount: 2, version: created.version }))).min_count).toBe(2)
    })
  })

  describe('retire', () => {
    it('retires a requirement for good, keeps it in the list, and logs one entry', async () => {
      const created = await create()

      const retired = await asAdmin(() => service.retire(tenantId, created.id, { reason: 'Salah isi' }))

      expect(retired.status).toBe('retired')
      expect((await service.list(tenantId, { status: 'retired' })).map((item) => item.id)).toEqual([created.id])
      expect(log.mock.calls.at(-1)?.[0]).toMatchObject({ event: 'coverage_retire', outcome: 'success' })
      expect(JSON.stringify(log.mock.calls)).not.toContain('Salah isi')
      expect(await rejection(() => asAdmin(() => service.retire(tenantId, created.id, {})))).toMatchObject({ code: 'requirement_retired' })
      expect(await rejection(() => asAdmin(() => service.update(tenantId, created.id, { minCount: 2 })))).toMatchObject({ code: 'requirement_retired' })
    })

    it('answers 409 for a stale version and not found for a missing, malformed or foreign requirement', async () => {
      const created = await create()
      const foreign = await store({ tenant_id: otherTenantId })

      expect(await rejection(() => asAdmin(() => service.retire(tenantId, created.id, { version: created.version + 5 })))).toMatchObject({ code: 'stale_version' })
      for (const id of [foreign.id, new Types.ObjectId().toHexString(), 'bad']) {
        expect(await rejection(() => asAdmin(() => service.retire(tenantId, id, {})))).toMatchObject({ code: 'requirement_not_found' })
      }
      expect((await requirements.findOne(created.id))?.status).toBe('active')
    })
  })

  describe('list', () => {
    it('lists the tenant\'s requirements by unit, shift and period start, never another tenant\'s, and writes no log entry', async () => {
      const later = await store({ period: { start: '2099-06-01', end: null } })
      const earlier = await store({ period: { start: '2099-01-01', end: '2099-05-31' } })
      await store({ tenant_id: otherTenantId })

      const found = await service.list(tenantId, { limit: 100 })

      expect(found.map((item) => item.id)).toEqual([earlier.id, later.id])
      expect([log, warn, error, debug].every((spy) => spy.mock.calls.length === 0)).toBe(true)
    })

    it('filters by unit, shift, status, day pattern and the date a period covers, and pages', async () => {
      const otherUnit = await addUnit(facilityId)
      const otherShift = await addShift()
      const march = await store({ period: { start: '2099-03-01', end: '2099-03-31' }, day_pattern: 'weekdays' })
      const open = await store({ period: { start: '2099-03-15', end: null }, unit_id: otherUnit })
      const retired = await store({ status: 'retired', shift_definition_id: otherShift })

      const ids = async (query: Parameters<CoverageService['list']>[1]) => (await service.list(tenantId, query)).map((item) => item.id).sort()
      expect(await ids({ unitId: otherUnit })).toEqual([open.id])
      expect(await ids({ shiftId: otherShift })).toEqual([retired.id])
      expect(await ids({ status: 'retired' })).toEqual([retired.id])
      expect(await ids({ dayPattern: 'weekdays' })).toEqual([march.id])
      expect(await ids({ onDate: '2099-03-20' })).toEqual([march.id, open.id, retired.id].sort())
      expect(await ids({ onDate: '2099-04-01' })).toEqual([open.id, retired.id].sort())
      expect(await ids({ onDate: '2099-02-01' })).toEqual([retired.id])
      expect(await ids({ onDate: '2098-12-31' })).toEqual([])
      expect(await service.list(tenantId, { limit: 1, offset: 1 })).toHaveLength(1)
    })
  })
})
