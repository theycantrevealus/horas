import { Types } from 'mongoose'
import { runWithRequestContext } from '@utility/logger/context'
import { type AppLogger } from '@utility/logger/service'
import { type ShiftDefinition } from '@repository/model/shift-definition'
import {
  InMemoryFacilities,
  InMemoryOrganizationUnits,
  InMemoryShiftDefinitions,
} from '../testing/in-memory'
import { type CreateShiftInput, ShiftService } from './shift.service'

describe('ShiftService', () => {
  const tenantId = new Types.ObjectId().toHexString()
  const otherTenantId = new Types.ObjectId().toHexString()
  const organizationId = new Types.ObjectId().toHexString()
  const log = vi.fn()
  const warn = vi.fn()
  const error = vi.fn()
  const debug = vi.fn()
  let shifts: InMemoryShiftDefinitions
  let facilities: InMemoryFacilities
  let units: InMemoryOrganizationUnits
  let service: ShiftService
  let facilityId: string
  let otherFacilityId: string
  let unitId: string

  const name = [{ locale: 'id-ID', text: 'Malam' }]

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
   * Adds a facility.
   *
   * @param override - Status and tenant.
   * @returns The facility identifier.
   */
  async function addFacility(
    override: { status?: 'active' | 'inactive'; tenant?: string } = {},
  ): Promise<string> {
    const facility = await asAdmin(() =>
      facilities.create({
        tenant_id: override.tenant ?? tenantId,
        organization_id: organizationId,
        code: `f-${new Types.ObjectId().toHexString()}`,
        name: [{ locale: 'en', text: 'RS' }],
        address: null,
        timezone: 'Asia/Jakarta',
        holiday_calendar_codes: [],
        external_ids: [],
        status: override.status ?? 'active',
      }),
    )
    return facility.id
  }

  /**
   * Adds a unit.
   *
   * @param facility - Facility of the unit.
   * @param status - Unit status.
   * @param tenant - Tenant of the unit.
   * @returns The unit identifier.
   */
  async function addUnit(
    facility: string,
    status: 'active' | 'closed' = 'active',
    tenant = tenantId,
  ): Promise<string> {
    const unit = await asAdmin(() =>
      units.create({
        tenant_id: tenant,
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
        status,
      }),
    )
    return unit.id
  }

  /**
   * Defines a shift through the service; the defaults make a night shift of 10 hours.
   *
   * @param override - Fields that replace the defaults.
   * @returns The shift.
   */
  function create(override: Partial<CreateShiftInput> = {}) {
    return asAdmin(() =>
      service.create(tenantId, {
        facilityId,
        code: 'M',
        name,
        type: 'regular',
        startTime: '21:00',
        endTime: '07:00',
        paidMinutes: 540,
        isNight: true,
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
    shifts = new InMemoryShiftDefinitions()
    facilities = new InMemoryFacilities()
    units = new InMemoryOrganizationUnits()
    const logger = { log, warn, error, debug } as unknown as AppLogger
    service = new ShiftService(shifts, facilities, units, logger)
    facilityId = await addFacility()
    otherFacilityId = await addFacility()
    unitId = await addUnit(facilityId)
  })

  /**
   * Stores a shift of a tenant directly.
   *
   * @param override - Fields that replace the defaults.
   * @returns The shift.
   */
  function store(override: Partial<ShiftDefinition> = {}) {
    return asAdmin(() =>
      shifts.create({
        tenant_id: tenantId,
        facility_id: facilityId,
        code: 'P',
        name,
        type: 'regular',
        start_time: '07:00',
        end_time: '14:00',
        paid_minutes: 420,
        is_night: false,
        unit_ids: [],
        status: 'active',
        ...override,
      }),
    )
  }

  describe('create', () => {
    it('defines a shift with a cleaned code, and writes one log entry without values', async () => {
      const created = await create({ code: ' m ', reason: 'Alasan Rahasia' })

      expect(created).toMatchObject({
        tenant_id: tenantId,
        facility_id: facilityId,
        code: 'M',
        name,
        type: 'regular',
        start_time: '21:00',
        end_time: '07:00',
        paid_minutes: 540,
        is_night: true,
        unit_ids: [],
        status: 'active',
      })
      expect(log).toHaveBeenCalledTimes(1)
      expect(log.mock.calls[0]?.[0]).toMatchObject({ event: 'shift_create', outcome: 'success' })
      const written = JSON.stringify([log.mock.calls, warn.mock.calls, error.mock.calls])
      for (const text of ['Alasan Rahasia', 'Malam', '21:00']) {
        expect(written).not.toContain(text)
      }
    })

    it('defines an off shift without times, an on-call shift paid for part of its time, and defaults the night flag', async () => {
      const off = await create({ code: 'L', type: 'off', startTime: null, endTime: null, paidMinutes: undefined, isNight: undefined })
      expect(off).toMatchObject({ type: 'off', start_time: null, end_time: null, paid_minutes: 0, is_night: false })
      const onCall = await create({ code: 'OC', type: 'on_call_remote', startTime: '17:00', endTime: '07:00', paidMinutes: undefined, isNight: undefined })
      expect(onCall).toMatchObject({ type: 'on_call_remote', paid_minutes: 0, is_night: false })
      const onSite = await create({ code: 'OS', type: 'on_call_onsite', startTime: '08:00', endTime: '16:00', paidMinutes: 240 })
      expect(onSite.paid_minutes).toBe(240)
    })

    it('keeps an off shift free of times, paid minutes and the night flag', async () => {
      const off = (override: Partial<CreateShiftInput>) => create({ code: 'L', type: 'off', startTime: null, endTime: null, paidMinutes: 0, isNight: false, ...override })

      expect(await rejection(() => off({ startTime: '07:00' }))).toMatchObject({ kind: 'invalid', code: 'invalid_times' })
      expect(await rejection(() => off({ endTime: '15:00' }))).toMatchObject({ code: 'invalid_times' })
      expect(await rejection(() => off({ paidMinutes: 60 }))).toMatchObject({ code: 'invalid_paid' })
      expect(await rejection(() => off({ isNight: true }))).toMatchObject({ code: 'night_not_allowed' })
    })

    it('checks the times: needed, well formed and different', async () => {
      for (const override of [
        { startTime: undefined },
        { endTime: undefined },
        { startTime: null },
        { startTime: '7:00' },
        { endTime: '24:00' },
        { startTime: '07:00', endTime: '07:00' },
      ] as Partial<CreateShiftInput>[]) {
        expect(await rejection(() => create(override))).toMatchObject({ kind: 'invalid', code: 'invalid_times' })
      }
    })

    it('checks the paid minutes against the length of the shift, which may cross midnight', async () => {
      expect(await rejection(() => create({ paidMinutes: undefined }))).toMatchObject({ code: 'paid_required' })
      expect(await rejection(() => create({ paidMinutes: 0 }))).toMatchObject({ code: 'paid_required' })
      expect(await rejection(() => create({ paidMinutes: 601 }))).toMatchObject({ code: 'paid_exceeds_duration' })
      for (const paidMinutes of [-1, 1.5, Number.NaN, '60' as unknown as number]) {
        expect(await rejection(() => create({ paidMinutes }))).toMatchObject({ code: 'invalid_paid' })
      }
      expect((await create({ paidMinutes: 600 })).paid_minutes).toBe(600)
      expect(await rejection(() => create({ code: 'P', startTime: '07:00', endTime: '14:00', paidMinutes: 421 }))).toMatchObject({ code: 'paid_exceeds_duration' })
      expect((await create({ code: 'P', startTime: '07:00', endTime: '14:00', paidMinutes: 420 })).paid_minutes).toBe(420)
    })

    it('checks the type, the code and the name', async () => {
      expect(await rejection(() => create({ type: 'weird' as never }))).toMatchObject({ code: 'invalid_type' })
      for (const code of ['', '  ', 'TOOLONGCODE', 'P-1', 'P 1']) {
        expect(await rejection(() => create({ code }))).toMatchObject({ code: 'invalid_code' })
      }
      for (const bad of [[], [{ locale: 'id-ID', text: ' ' }], [{ locale: 'id-ID', text: 'a' }, { locale: 'id-ID', text: 'b' }], [{ locale: 'id-ID', text: 'x'.repeat(201) }]]) {
        expect(await rejection(() => create({ name: bad }))).toMatchObject({ code: 'invalid_name' })
      }
    })

    it('needs an active facility of the tenant, and answers the same for a foreign, missing and malformed one', async () => {
      const inactive = await addFacility({ status: 'inactive' })
      const foreign = await addFacility({ tenant: otherTenantId })
      expect(await rejection(() => create({ facilityId: inactive }))).toMatchObject({ code: 'facility_inactive' })
      for (const id of [foreign, new Types.ObjectId().toHexString(), 'bad']) {
        expect(await rejection(() => create({ facilityId: id }))).toMatchObject({ kind: 'invalid', code: 'facility_not_found' })
      }
    })

    it('checks the units: active, of the facility, of the tenant, without repeats, and at most 100', async () => {
      const closed = await addUnit(facilityId, 'closed')
      const elsewhere = await addUnit(otherFacilityId)
      const foreign = await addUnit(facilityId, 'active', otherTenantId)
      expect((await create({ unitIds: [unitId] })).unit_ids).toEqual([unitId])
      expect(await rejection(() => create({ code: 'A', unitIds: [closed] }))).toMatchObject({ code: 'unit_closed' })
      expect(await rejection(() => create({ code: 'A', unitIds: [elsewhere] }))).toMatchObject({ code: 'unit_outside_facility' })
      for (const id of [foreign, new Types.ObjectId().toHexString(), 'bad']) {
        expect(await rejection(() => create({ code: 'A', unitIds: [id] }))).toMatchObject({ code: 'unit_not_found' })
      }
      expect(await rejection(() => create({ code: 'A', unitIds: [unitId, unitId] }))).toMatchObject({ code: 'duplicate_unit' })
      const many = Array.from({ length: 101 }, () => new Types.ObjectId().toHexString())
      expect(await rejection(() => create({ code: 'A', unitIds: many }))).toMatchObject({ code: 'invalid_units' })
    })

    it('answers 409 for a code that exists in the facility, retired shifts included, and allows it in another facility', async () => {
      const first = await create()
      expect(await rejection(() => create({ code: 'm' }))).toMatchObject({ kind: 'conflict', code: 'shift_exists' })
      await asAdmin(() => service.retire(tenantId, first.id, {}))
      expect(await rejection(() => create())).toMatchObject({ code: 'shift_exists' })
      expect((await create({ facilityId: otherFacilityId })).facility_id).toBe(otherFacilityId)
    })
  })

  describe('update', () => {
    it('replaces the fields that are sent and keeps the rest, never the facility, the code or the type', async () => {
      const created = await create({ unitIds: [unitId] })

      const updated = await asAdmin(() =>
        service.update(tenantId, created.id, { name: [{ locale: 'en', text: 'Night' }], startTime: '22:00', endTime: '06:00', paidMinutes: 420, reason: 'Jam baru' }),
      )

      expect(updated).toMatchObject({
        id: created.id,
        facility_id: facilityId,
        code: 'M',
        type: 'regular',
        name: [{ locale: 'en', text: 'Night' }],
        start_time: '22:00',
        end_time: '06:00',
        paid_minutes: 420,
        is_night: true,
        unit_ids: [unitId],
        status: 'active',
      })
      expect(log.mock.calls.at(-1)?.[0]).toMatchObject({ event: 'shift_update', outcome: 'success' })
      expect(JSON.stringify(log.mock.calls)).not.toContain('Jam baru')
    })

    it('checks the whole shift again: new times against the stored paid minutes, and the night flag, units and an empty unit list', async () => {
      const created = await create({ unitIds: [unitId] })
      expect(await rejection(() => asAdmin(() => service.update(tenantId, created.id, { startTime: '03:00', endTime: '05:00' })))).toMatchObject({ code: 'paid_exceeds_duration' })
      expect(await rejection(() => asAdmin(() => service.update(tenantId, created.id, { startTime: '03:00' })))).toMatchObject({ code: 'paid_exceeds_duration' })
      expect(await rejection(() => asAdmin(() => service.update(tenantId, created.id, { startTime: '07:00', endTime: '07:00' })))).toMatchObject({ code: 'invalid_times' })
      const changed = await asAdmin(() => service.update(tenantId, created.id, { isNight: false, unitIds: [] }))
      expect(changed).toMatchObject({ is_night: false, unit_ids: [] })
      const elsewhere = await addUnit(otherFacilityId)
      expect(await rejection(() => asAdmin(() => service.update(tenantId, created.id, { unitIds: [elsewhere] })))).toMatchObject({ code: 'unit_outside_facility' })
    })

    it('keeps an off shift free of times, and checks the units only when they are sent', async () => {
      const off = await create({ code: 'L', type: 'off', startTime: null, endTime: null, paidMinutes: 0, isNight: false })
      expect(await rejection(() => asAdmin(() => service.update(tenantId, off.id, { startTime: '07:00', endTime: '15:00' })))).toMatchObject({ code: 'invalid_times' })
      expect(await rejection(() => asAdmin(() => service.update(tenantId, off.id, { isNight: true })))).toMatchObject({ code: 'night_not_allowed' })
      expect((await asAdmin(() => service.update(tenantId, off.id, { name: [{ locale: 'en', text: 'Day off' }] }))).name[0]?.text).toBe('Day off')

      const shift = await create({ unitIds: [unitId] })
      await asAdmin(() => units.update(unitId, { status: 'closed' }))
      expect((await asAdmin(() => service.update(tenantId, shift.id, { name: [{ locale: 'en', text: 'Renamed' }] }))).unit_ids).toEqual([unitId])
    })

    it('needs a field, an active shift and a current version, and answers 404 for a missing, malformed or foreign shift', async () => {
      const created = await create()
      expect(await rejection(() => asAdmin(() => service.update(tenantId, created.id, {})))).toMatchObject({ code: 'empty_update' })
      expect(await rejection(() => asAdmin(() => service.update(tenantId, created.id, { isNight: false, version: created.version + 5 })))).toMatchObject({ kind: 'conflict', code: 'stale_version' })
      await asAdmin(() => service.retire(tenantId, created.id, {}))
      expect(await rejection(() => asAdmin(() => service.update(tenantId, created.id, { isNight: false })))).toMatchObject({ kind: 'invalid', code: 'shift_retired' })

      const foreign = await store({ tenant_id: otherTenantId, code: 'F' })
      for (const id of [new Types.ObjectId().toHexString(), 'bad', foreign.id]) {
        expect(await rejection(() => asAdmin(() => service.update(tenantId, id, { isNight: true })))).toMatchObject({ kind: 'not_found', code: 'shift_not_found' })
      }
    })
  })

  describe('retire', () => {
    it('retires a shift for good, keeps it in the list, and logs one entry', async () => {
      const created = await create()

      const retired = await asAdmin(() => service.retire(tenantId, created.id, { reason: 'Tidak dipakai' }))

      expect(retired.status).toBe('retired')
      expect((await service.list(tenantId, { status: 'retired' })).map((shift) => shift.id)).toEqual([created.id])
      expect(log.mock.calls.at(-1)?.[0]).toMatchObject({ event: 'shift_retire', outcome: 'success' })
      expect(JSON.stringify(log.mock.calls)).not.toContain('Tidak dipakai')
      expect(await rejection(() => asAdmin(() => service.retire(tenantId, created.id, {})))).toMatchObject({ code: 'shift_retired' })
    })

    it('answers 409 for a stale version and 404 for a missing, malformed or foreign shift', async () => {
      const created = await create()
      expect(await rejection(() => asAdmin(() => service.retire(tenantId, created.id, { version: created.version + 5 })))).toMatchObject({ code: 'stale_version' })
      for (const id of [new Types.ObjectId().toHexString(), 'bad']) {
        expect(await rejection(() => asAdmin(() => service.retire(tenantId, id, {})))).toMatchObject({ code: 'shift_not_found' })
      }
      expect((await shifts.findOne(created.id))?.status).toBe('active')
    })
  })

  describe('list', () => {
    it('lists the tenant\'s shifts ordered by facility and code, never another tenant\'s, and writes no log entry', async () => {
      const second = await store({ code: 'S' })
      const first = await store({ code: 'M', is_night: true })
      const elsewhere = await store({ facility_id: otherFacilityId, code: 'A' })
      await store({ tenant_id: otherTenantId, code: 'X' })

      const found = await service.list(tenantId, { limit: 100 })

      expect(found.map((shift) => shift.id).sort()).toEqual([second.id, first.id, elsewhere.id].sort())
      const inFacility = found.filter((shift) => shift.facility_id === facilityId).map((shift) => shift.code)
      expect(inFacility).toEqual(['M', 'S'])
      expect([log, warn, error, debug].every((spy) => spy.mock.calls.length === 0)).toBe(true)
    })

    it('filters by facility, status, type and the unit that may use the shift, and pages', async () => {
      const anyUnit = await store({ code: 'P' })
      const forUnit = await store({ code: 'S', unit_ids: [unitId] })
      const other = await addUnit(facilityId)
      const forOther = await store({ code: 'M', unit_ids: [other] })
      const off = await store({ code: 'L', type: 'off', start_time: null, end_time: null, paid_minutes: 0 })
      const retired = await store({ code: 'Z', status: 'retired' })
      const elsewhere = await store({ facility_id: otherFacilityId, code: 'E' })

      const ids = async (query: object) => (await service.list(tenantId, { limit: 100, ...query })).map((shift) => shift.id)

      expect(await ids({ facilityId: otherFacilityId })).toEqual([elsewhere.id])
      expect(await ids({ facilityId, status: 'retired' })).toEqual([retired.id])
      expect(await ids({ facilityId, type: 'off' })).toEqual([off.id])
      expect((await ids({ unitId })).sort()).toEqual([anyUnit.id, forUnit.id, off.id, retired.id, elsewhere.id].sort())
      expect((await ids({ facilityId, unitId })).sort()).toEqual([anyUnit.id, forUnit.id, off.id, retired.id].sort())
      expect(await ids({ facilityId, unitId: other })).not.toContain(forUnit.id)
      expect(await ids({ facilityId, unitId: other })).toContain(forOther.id)
      expect(await service.list(tenantId, { facilityId, limit: 2 })).toHaveLength(2)
      expect(await service.list(tenantId, { facilityId, limit: 2, offset: 3 })).toHaveLength(2)
      expect(await service.list(tenantId, { facilityId, limit: 2, offset: 4 })).toHaveLength(1)
    })
  })
})
