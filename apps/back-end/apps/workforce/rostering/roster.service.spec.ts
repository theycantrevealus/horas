import { Types } from 'mongoose'
import { RepositoryConflictError } from '@utility/database/error'
import { runWithRequestContext } from '@utility/logger/context'
import { type AppLogger } from '@utility/logger/service'
import { type Roster } from '@repository/model/roster'
import { type ParameterService } from '../parameter/parameter.service'
import {
  InMemoryFacilities,
  InMemoryOrganizationUnits,
  InMemoryRosters,
} from '../testing/in-memory'
import { InvalidRequestError } from '../workforce.error'
import { RosterService } from './roster.service'

describe('RosterService', () => {
  const tenantId = new Types.ObjectId().toHexString()
  const otherTenantId = new Types.ObjectId().toHexString()
  const organizationId = new Types.ObjectId().toHexString()
  const log = vi.fn()
  const warn = vi.fn()
  const error = vi.fn()
  const debug = vi.fn()
  const gate = vi.fn()
  let rosters: InMemoryRosters
  let units: InMemoryOrganizationUnits
  let facilities: InMemoryFacilities
  let service: RosterService
  let settings: { period: string; approval: boolean }
  let facilityId: string
  let unitId: string

  const march = { start: '2099-03-01', end: '2099-03-31' }

  /**
   * Runs `work` as the signed-in account `account`.
   *
   * @param account - Account identifier; `null` for a system actor.
   * @param work - Code to run.
   * @returns What `work` returns.
   */
  function as<T>(account: string | null, work: () => Promise<T>): Promise<T> {
    return runWithRequestContext(
      {
        correlationId: 'c1',
        actor: { account_id: account, display_name: account ?? 'System', kind: account ? 'account' : 'system' },
      },
      work,
    )
  }
  const asHead = <T>(work: () => Promise<T>) => as('head', work)
  const asBoss = <T>(work: () => Promise<T>) => as('boss', work)

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
   * Adds a facility.
   *
   * @param timezone - Its time zone.
   * @returns The facility identifier.
   */
  async function addFacility(timezone = 'Asia/Jakarta') {
    const facility = await asHead(() =>
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
    const unit = await asHead(() =>
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
   * Creates a roster through the service as the Head of Unit.
   *
   * @param override - Unit, period and reason.
   * @returns The roster.
   */
  function create(override: { unitId?: string; period?: { start: string; end: string }; reason?: string } = {}) {
    return asHead(() => service.create(tenantId, { unitId, period: march, ...override }))
  }

  /**
   * Stores a roster directly.
   *
   * @param override - Fields that replace the defaults.
   * @returns The roster.
   */
  function store(override: Partial<Roster> = {}) {
    return asHead(() =>
      rosters.create({
        tenant_id: tenantId,
        unit_id: unitId,
        facility_id: facilityId,
        period: march,
        status: 'draft',
        revision: 0,
        prepared_by: { account_id: 'head', display_name: 'head', kind: 'account' },
        submitted: null,
        approved: null,
        published: null,
        closed: null,
        return_reason: null,
        coverage_overrides: [],
        validation: null,
        ...override,
      }),
    )
  }

  beforeEach(async () => {
    vi.resetAllMocks()
    settings = { period: 'month', approval: true }
    rosters = new InMemoryRosters()
    units = new InMemoryOrganizationUnits()
    facilities = new InMemoryFacilities()
    const parameters = {
      resolve: async (_tenant: string, { key }: { key: string }) => ({
        value: key === 'ROSTER_PERIOD' ? settings.period : settings.approval,
      }),
    } as unknown as ParameterService
    const logger = { log, warn, error, debug } as unknown as AppLogger
    gate.mockResolvedValue({ checked_at: new Date(), violations: 0, coverage_gaps: 0 })
    service = new RosterService(rosters, units, facilities, parameters, { gate } as never, logger)
    facilityId = await addFacility()
    unitId = await addUnit(facilityId)
  })

  describe('create', () => {
    it('creates an empty draft prepared by the caller, copies the facility, and writes one log entry without values', async () => {
      const created = await create({ reason: 'Alasan Rahasia' })

      expect(created).toMatchObject({
        tenant_id: tenantId,
        unit_id: unitId,
        facility_id: facilityId,
        period: march,
        status: 'draft',
        revision: 0,
        prepared_by: { account_id: 'head' },
        submitted: null,
        approved: null,
        published: null,
        closed: null,
        return_reason: null,
        coverage_overrides: [],
        validation: null,
      })
      expect(log).toHaveBeenCalledTimes(1)
      expect(log.mock.calls[0]?.[0]).toMatchObject({ event: 'roster_create', outcome: 'success' })
      const written = JSON.stringify([log.mock.calls, warn.mock.calls, error.mock.calls])
      for (const text of ['Alasan Rahasia', '2099-03-01']) {
        expect(written).not.toContain(text)
      }
    })

    it('reads the period length from ROSTER_PERIOD', async () => {
      expect(await rejection(() => create({ period: { start: '2099-03-02', end: '2099-03-08' } }))).toMatchObject({ code: 'invalid_period' })
      settings.period = 'week'
      expect((await create({ period: { start: '2099-03-02', end: '2099-03-08' } })).period.end).toBe('2099-03-08')
      expect(await rejection(() => create({ period: march }))).toMatchObject({ code: 'invalid_period' })
      settings.period = 'two_weeks'
      expect((await create({ period: { start: '2099-04-06', end: '2099-04-19' } })).period.start).toBe('2099-04-06')
    })

    it.each([
      { start: '2099-03-02', end: '2099-03-31' },
      { start: '2099-03-01', end: '2099-03-30' },
      { start: '2099-02-01', end: '2099-02-29' },
      { start: '2099-03-31', end: '2099-03-01' },
      { start: 'nope', end: '2099-03-31' },
    ])('refuses a period that is not a calendar month: %j', async (period) => {
      expect(await rejection(() => create({ period }))).toMatchObject({ kind: 'invalid', code: 'invalid_period' })
      expect(await rosters.findByFilter(tenantId)).toEqual([])
      expect(warn.mock.calls[0]?.[0]).toMatchObject({ event: 'roster_create', outcome: 'failure', code: 'invalid_period' })
    })

    it('allows a period that started in the past', async () => {
      expect((await create({ period: { start: '2020-01-01', end: '2020-01-31' } })).status).toBe('draft')
    })

    it('refuses a unit that is missing, malformed, foreign or closed', async () => {
      const foreign = await addUnit(facilityId, { tenant: otherTenantId })
      const closed = await addUnit(facilityId, { status: 'closed' })

      for (const id of [foreign, new Types.ObjectId().toHexString(), 'bad']) {
        expect(await rejection(() => create({ unitId: id }))).toMatchObject({ code: 'unit_not_found' })
      }
      expect(await rejection(() => create({ unitId: closed }))).toMatchObject({ code: 'unit_closed' })
    })

    it('refuses a second roster with the same start, and one that overlaps, but allows other units, months and tenants', async () => {
      await create()

      expect(await rejection(() => create())).toMatchObject({ kind: 'conflict', code: 'roster_exists' })
      settings.period = 'week'
      expect(await rejection(() => create({ period: { start: '2099-03-09', end: '2099-03-15' } }))).toMatchObject({ kind: 'conflict', code: 'roster_overlaps' })
      settings.period = 'month'
      await create({ period: { start: '2099-04-01', end: '2099-04-30' } })
      await create({ unitId: await addUnit(facilityId) })
      const foreignFacility = await addFacility()
      const foreignUnit = await addUnit(foreignFacility, { tenant: otherTenantId })
      await as('head', () => service.create(otherTenantId, { unitId: foreignUnit, period: march }))
    })

    it('refuses to create without an acting account', async () => {
      expect(await rejection(() => service.create(tenantId, { unitId, period: march }))).toMatchObject({ code: 'actor_required' })
    })

    it('turns a duplicate key at write time into roster_exists', async () => {
      const spy = vi.spyOn(rosters, 'create').mockRejectedValueOnce(new RepositoryConflictError('dup', { operation: 'x' }))
      expect(await rejection(() => create())).toMatchObject({ code: 'roster_exists' })
      spy.mockRestore()
    })
  })

  describe('lifecycle with approval required', () => {
    it('goes draft, submitted, approved, published with a stamp at each step, and logs one entry per step without values', async () => {
      const draft = await create()

      const submitted = await asHead(() => service.submit(tenantId, draft.id, { reason: 'Alasan Rahasia' }))
      expect(submitted).toMatchObject({ status: 'submitted', submitted: { by: { account_id: 'head' } }, approved: null })
      const approved = await asBoss(() => service.approve(tenantId, draft.id, {}))
      expect(approved).toMatchObject({ status: 'approved', approved: { by: { account_id: 'boss' } } })
      const published = await asHead(() => service.publish(tenantId, draft.id, {}))
      expect(published).toMatchObject({ status: 'published', revision: 1, published: { by: { account_id: 'head' } } })
      expect(published.approved?.by.account_id).toBe('boss')

      expect(log.mock.calls.map((call) => (call[0] as { event: string }).event)).toEqual(['roster_create', 'roster_submit', 'roster_approve', 'roster_publish'])
      expect(JSON.stringify([log.mock.calls, warn.mock.calls])).not.toContain('Alasan Rahasia')
    })

    it('refuses a draft that is published without approval, and a submit of a roster that is not a draft', async () => {
      const draft = await create()

      expect(await rejection(() => asHead(() => service.publish(tenantId, draft.id, {})))).toMatchObject({ code: 'approval_required' })
      await asHead(() => service.submit(tenantId, draft.id, {}))
      expect(await rejection(() => asHead(() => service.submit(tenantId, draft.id, {})))).toMatchObject({ code: 'invalid_transition' })
      expect(await rejection(() => asHead(() => service.publish(tenantId, draft.id, {})))).toMatchObject({ code: 'invalid_transition' })
      expect((await rosters.findOne(draft.id))?.status).toBe('submitted')
    })

    it('refuses the approval of a draft, of a published roster, and by the person who prepared it', async () => {
      const draft = await create()
      expect(await rejection(() => asBoss(() => service.approve(tenantId, draft.id, {})))).toMatchObject({ code: 'invalid_transition' })

      await asHead(() => service.submit(tenantId, draft.id, {}))
      expect(await rejection(() => asHead(() => service.approve(tenantId, draft.id, {})))).toMatchObject({ kind: 'forbidden', code: 'approver_is_preparer' })
      expect((await rosters.findOne(draft.id))?.status).toBe('submitted')
      await asBoss(() => service.approve(tenantId, draft.id, {}))
      await asHead(() => service.publish(tenantId, draft.id, {}))
      expect(await rejection(() => asBoss(() => service.approve(tenantId, draft.id, {})))).toMatchObject({ code: 'invalid_transition' })
    })

    it('refuses to publish an approved roster whose validation was cleared, until it is validated again', async () => {
      const draft = await asHead(() => service.create(tenantId, { unitId, period: march }))
      await asHead(() => service.submit(tenantId, draft.id, {}))
      await asBoss(() => service.approve(tenantId, draft.id, {}))
      await asHead(() => rosters.update(draft.id, { validation: null }))

      expect(await rejection(() => asHead(() => service.publish(tenantId, draft.id, {})))).toMatchObject({ kind: 'invalid', code: 'validation_required' })
      await asHead(() => rosters.update(draft.id, { validation: { checked_at: new Date(), violations: 0, coverage_gaps: 0 } }))
      expect((await asHead(() => service.publish(tenantId, draft.id, {}))).status).toBe('published')
    })

    it('does not block the approval of a roster prepared by a system actor', async () => {
      const draft = await as(null, () => service.create(tenantId, { unitId, period: march }))
      await asHead(() => service.submit(tenantId, draft.id, {}))
      expect((await asBoss(() => service.approve(tenantId, draft.id, {}))).status).toBe('approved')
    })
  })

  describe('lifecycle without approval', () => {
    beforeEach(() => {
      settings.approval = false
    })

    it('publishes a draft directly and refuses to submit it', async () => {
      const draft = await create()

      expect(await rejection(() => asHead(() => service.submit(tenantId, draft.id, {})))).toMatchObject({ code: 'approval_not_required' })
      const published = await asHead(() => service.publish(tenantId, draft.id, {}))
      expect(published).toMatchObject({ status: 'published', revision: 1 })
      expect(published.submitted).toBeNull()
      expect(published.approved).toBeNull()
    })

    it('lets a roster that was submitted or approved before the setting changed be approved and published', async () => {
      settings.approval = true
      const first = await create()
      await asHead(() => service.submit(tenantId, first.id, {}))
      const second = await create({ period: { start: '2099-04-01', end: '2099-04-30' } })
      await asHead(() => service.submit(tenantId, second.id, {}))
      await asBoss(() => service.approve(tenantId, second.id, {}))
      settings.approval = false

      expect((await asBoss(() => service.approve(tenantId, first.id, {}))).status).toBe('approved')
      expect((await asHead(() => service.publish(tenantId, first.id, {}))).status).toBe('published')
      expect((await asHead(() => service.publish(tenantId, second.id, {}))).status).toBe('published')
    })

    it('refuses to publish a roster that is submitted but not approved', async () => {
      settings.approval = true
      const draft = await create()
      await asHead(() => service.submit(tenantId, draft.id, {}))
      settings.approval = false

      expect(await rejection(() => asHead(() => service.publish(tenantId, draft.id, {})))).toMatchObject({ code: 'invalid_transition' })
    })
  })

  describe('the validation gate', () => {
    it('stores the validation summary of the gate when a roster is submitted', async () => {
      const summary = { checked_at: new Date('2099-01-01T00:00:00Z'), violations: 0, coverage_gaps: 0 }
      gate.mockResolvedValueOnce(summary)
      const draft = await create()

      const submitted = await asHead(() => service.submit(tenantId, draft.id, {}))

      expect(submitted.validation).toEqual(summary)
      expect(gate).toHaveBeenCalledTimes(1)
      expect(gate.mock.calls[0]?.[0]).toBe(tenantId)
    })

    it('refuses to submit a roster the gate refuses, and writes nothing', async () => {
      const draft = await create()
      gate.mockRejectedValueOnce(new InvalidRequestError('roster_invalid', 'No.'))

      expect(await rejection(() => asHead(() => service.submit(tenantId, draft.id, {})))).toMatchObject({ code: 'roster_invalid' })
      gate.mockRejectedValueOnce(new InvalidRequestError('coverage_gaps', 'No.'))
      expect(await rejection(() => asHead(() => service.submit(tenantId, draft.id, {})))).toMatchObject({ code: 'coverage_gaps' })

      const stored = await rosters.findOne(draft.id)
      expect(stored).toMatchObject({ status: 'draft', submitted: null, validation: null })
      expect(warn.mock.calls.at(-1)?.[0]).toMatchObject({ event: 'roster_submit', outcome: 'failure', code: 'coverage_gaps' })
    })

    it('runs the gate when a draft is published without approval, and refuses the same way', async () => {
      settings.approval = false
      const draft = await create()
      gate.mockRejectedValueOnce(new InvalidRequestError('roster_invalid', 'No.'))
      expect(await rejection(() => asHead(() => service.publish(tenantId, draft.id, {})))).toMatchObject({ code: 'roster_invalid' })
      expect((await rosters.findOne(draft.id))?.status).toBe('draft')

      const published = await asHead(() => service.publish(tenantId, draft.id, {}))
      expect(published.status).toBe('published')
      expect(published.validation).toMatchObject({ violations: 0, coverage_gaps: 0 })
    })

    it('does not run the gate again when an approved roster is published, and keeps its validation', async () => {
      const draft = await create()
      await asHead(() => service.submit(tenantId, draft.id, {}))
      await asBoss(() => service.approve(tenantId, draft.id, {}))
      gate.mockClear()

      const published = await asHead(() => service.publish(tenantId, draft.id, {}))

      expect(gate).not.toHaveBeenCalled()
      expect(published.validation).toMatchObject({ violations: 0, coverage_gaps: 0 })
    })

    it('does not run the gate for a refused move', async () => {
      const draft = await create()
      await rejection(() => asHead(() => service.publish(tenantId, draft.id, {})))
      await rejection(() => asBoss(() => service.approve(tenantId, draft.id, {})))
      expect(gate).not.toHaveBeenCalled()
    })
  })

  describe('return', () => {
    it('takes a submitted or an approved roster back to draft with the reason, and clears the stamps', async () => {
      const first = await create()
      await asHead(() => service.submit(tenantId, first.id, {}))
      const returned = await asBoss(() => service.return(tenantId, first.id, { reason: ' Jadwal kurang ' }))
      expect(returned).toMatchObject({ status: 'draft', return_reason: 'Jadwal kurang', submitted: null, approved: null })

      const resubmitted = await asHead(() => service.submit(tenantId, first.id, {}))
      expect(resubmitted).toMatchObject({ status: 'submitted', return_reason: null })
      await asBoss(() => service.approve(tenantId, first.id, {}))
      const again = await asBoss(() => service.return(tenantId, first.id, { reason: 'Salah bulan' }))
      expect(again).toMatchObject({ status: 'draft', return_reason: 'Salah bulan', approved: null })
      expect(log.mock.calls.map((call) => (call[0] as { event: string }).event)).toContain('roster_return')
      expect(JSON.stringify([log.mock.calls, warn.mock.calls])).not.toContain('Jadwal kurang')
    })

    it('needs a reason of 1 to 500 characters, and only a submitted or approved roster can be returned', async () => {
      const draft = await create()
      await asHead(() => service.submit(tenantId, draft.id, {}))

      expect(await rejection(() => asBoss(() => service.return(tenantId, draft.id, { reason: '   ' })))).toMatchObject({ code: 'reason_required' })
      expect(await rejection(() => asBoss(() => service.return(tenantId, draft.id, { reason: 'x'.repeat(501) })))).toMatchObject({ code: 'invalid_reason' })
      expect((await rosters.findOne(draft.id))?.status).toBe('submitted')

      const plain = await create({ period: { start: '2099-04-01', end: '2099-04-30' } })
      const published = await store({ unit_id: await addUnit(facilityId), status: 'published' })
      const closed = await store({ unit_id: await addUnit(facilityId), status: 'closed' })
      for (const id of [plain.id, published.id, closed.id]) {
        expect(await rejection(() => asBoss(() => service.return(tenantId, id, { reason: 'Salah' })))).toMatchObject({ code: 'invalid_transition' })
      }
    })
  })

  describe('close', () => {
    it('closes a published roster after its last day, and refuses before', async () => {
      const past = await store({ status: 'published', revision: 1, period: { start: '2020-01-01', end: '2020-01-31' } })
      const running = await store({ unit_id: await addUnit(facilityId), status: 'published', revision: 1 })

      const closed = await asHead(() => service.close(tenantId, past.id, { reason: 'Alasan Rahasia' }))
      expect(closed).toMatchObject({ status: 'closed', closed: { by: { account_id: 'head' } } })
      expect(await rejection(() => asHead(() => service.close(tenantId, running.id, {})))).toMatchObject({ code: 'period_not_ended' })
      expect(await rejection(() => asHead(() => service.close(tenantId, past.id, {})))).toMatchObject({ code: 'invalid_transition' })
      expect(JSON.stringify([log.mock.calls, warn.mock.calls])).not.toContain('Alasan Rahasia')
    })

    it('refuses to close a roster that is not published', async () => {
      const draft = await store({ period: { start: '2020-01-01', end: '2020-01-31' } })
      expect(await rejection(() => asHead(() => service.close(tenantId, draft.id, {})))).toMatchObject({ code: 'invalid_transition' })
    })

    it('reads "today" in the facility\'s zone: the last day is still open on that day', async () => {
      const kiritimati = await addFacility('Pacific/Kiritimati')
      const unit = await addUnit(kiritimati)
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Kiritimati' }).format(new Date())
      const lastDay = await store({ unit_id: unit, facility_id: kiritimati, status: 'published', period: { start: '2020-01-01', end: today } })

      expect(await rejection(() => asHead(() => service.close(tenantId, lastDay.id, {})))).toMatchObject({ code: 'period_not_ended' })
    })
  })

  describe('versions, tenants and reads', () => {
    it('refuses a stale version on every move, and a write that lost a race', async () => {
      const draft = await create()

      expect(await rejection(() => asHead(() => service.submit(tenantId, draft.id, { version: draft.version + 5 })))).toMatchObject({ code: 'stale_version' })
      expect((await rosters.findOne(draft.id))?.status).toBe('draft')
      const spy = vi.spyOn(rosters, 'update').mockRejectedValueOnce(new RepositoryConflictError('race', { operation: 'x' }))
      expect(await rejection(() => asHead(() => service.submit(tenantId, draft.id, {})))).toMatchObject({ code: 'stale_version' })
      spy.mockRestore()
      expect((await asHead(() => service.submit(tenantId, draft.id, { version: draft.version }))).status).toBe('submitted')
    })

    it('answers not found for a missing, malformed or foreign roster on every call', async () => {
      const foreign = await store({ tenant_id: otherTenantId, unit_id: await addUnit(facilityId, { tenant: otherTenantId }) })

      for (const id of [foreign.id, new Types.ObjectId().toHexString(), 'bad']) {
        for (const call of [
          () => service.get(tenantId, id),
          () => asHead(() => service.submit(tenantId, id, {})),
          () => asBoss(() => service.approve(tenantId, id, {})),
          () => asBoss(() => service.return(tenantId, id, { reason: 'x' })),
          () => asHead(() => service.publish(tenantId, id, {})),
          () => asHead(() => service.close(tenantId, id, {})),
        ]) {
          expect(await rejection(call)).toMatchObject({ kind: 'not_found', code: 'roster_not_found' })
        }
      }
    })

    it('gets a roster and lists the tenant\'s rosters, latest period first, with filters, and writes no log entry', async () => {
      const older = await store({ period: { start: '2099-02-01', end: '2099-02-28' } })
      const newer = await store({ period: { start: '2099-04-01', end: '2099-04-30' } })
      const otherUnit = await addUnit(facilityId)
      const elsewhere = await store({ unit_id: otherUnit, status: 'published' })
      await store({ tenant_id: otherTenantId, unit_id: await addUnit(facilityId, { tenant: otherTenantId }) })

      expect((await service.get(tenantId, older.id)).id).toBe(older.id)
      const ids = async (query: Parameters<RosterService['list']>[1]) => (await service.list(tenantId, query)).map((item) => item.id)
      expect(await ids({ limit: 100 })).toEqual([newer.id, elsewhere.id, older.id])
      expect(await ids({ unitId: otherUnit })).toEqual([elsewhere.id])
      expect(await ids({ facilityId })).toHaveLength(3)
      expect(await ids({ status: 'published' })).toEqual([elsewhere.id])
      expect(await ids({ from: '2099-03-15', to: '2099-03-20' })).toEqual([elsewhere.id])
      expect(await ids({ from: '2099-04-30' })).toEqual([newer.id])
      expect(await ids({ to: '2099-02-01' })).toEqual([older.id])
      expect(await ids({ limit: 1, offset: 1 })).toHaveLength(1)
      expect([log, warn, error, debug].every((spy) => spy.mock.calls.length === 0)).toBe(true)
    })
  })
})
