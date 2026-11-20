import { Types } from 'mongoose'
import { runWithRequestContext } from '@utility/logger/context'
import { type Roster } from '@repository/model/roster'
import { InMemoryOrganizationUnits, InMemoryRosterAssignments, InMemoryRosters } from '../testing/in-memory'
import { DutyService } from './duty.service'

describe('DutyService', () => {
  const tenantId = new Types.ObjectId().toHexString()
  const otherTenantId = new Types.ObjectId().toHexString()
  const organizationId = new Types.ObjectId().toHexString()
  const facilityId = new Types.ObjectId().toHexString()
  let assignments: InMemoryRosterAssignments
  let rosters: InMemoryRosters
  let units: InMemoryOrganizationUnits
  let service: DutyService
  let unitId: string
  let published: Roster

  /**
   * Runs `work` as a signed-in request.
   *
   * @param work - Code to run.
   * @returns What `work` returns.
   */
  function asAdmin<T>(work: () => Promise<T>): Promise<T> {
    return runWithRequestContext({ correlationId: 'c1', actor: { account_id: 'a1', display_name: 'Admin', kind: 'account' } }, work)
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
   * Stores a roster of the unit.
   *
   * @param status - Its status.
   * @param period - Its period.
   * @returns The roster.
   */
  function addRoster(status: Roster['status'], period = { start: '2099-03-01', end: '2099-03-31' }) {
    return asAdmin(() =>
      rosters.create({
        tenant_id: tenantId,
        unit_id: unitId,
        facility_id: facilityId,
        period,
        status,
        revision: 0,
        prepared_by: { account_id: 'a1', display_name: 'Admin', kind: 'account' },
        submitted: null,
        approved: null,
        published: null,
        closed: null,
        return_reason: null,
        coverage_overrides: [],
        validation: null,
      }),
    )
  }

  /**
   * Stores an assignment starting at a UTC hour of a day.
   *
   * @param roster - The roster.
   * @param employee - The employee.
   * @param date - The day.
   * @param override - Hours, status, flag and tenant.
   * @returns The assignment.
   */
  function assign(roster: Roster, employee: string, date: string, override: { from?: number; to?: number; status?: 'planned' | 'cancelled'; flagged?: boolean; off?: boolean; tenant?: string; role?: 'staff' | 'team_leader' } = {}) {
    const day = Date.parse(`${date}T00:00:00Z`)
    return asAdmin(() =>
      assignments.create({
        tenant_id: override.tenant ?? tenantId,
        roster_id: roster.id,
        unit_id: roster.unit_id,
        facility_id: facilityId,
        employee_id: employee,
        date,
        shift: { definition_id: new Types.ObjectId().toHexString(), code: 'P', type: override.off ? 'off' : 'regular', start_time: null, end_time: null, paid_minutes: 0, is_night: false },
        starts_at: override.off ? null : new Date(day + (override.from ?? 0) * 3_600_000),
        ends_at: override.off ? null : new Date(day + (override.to ?? 8) * 3_600_000),
        role: override.role ?? 'staff',
        status: override.status ?? 'planned',
        source: { kind: 'roster', ref_id: null },
        cancellation: null,
        change_reason: null,
        revision: 0,
        overtime: null,
        flag: null,
        is_flagged: override.flagged ?? false,
      }),
    )
  }

  beforeEach(async () => {
    assignments = new InMemoryRosterAssignments()
    rosters = new InMemoryRosters()
    units = new InMemoryOrganizationUnits()
    service = new DutyService(assignments, rosters, units)
    unitId = (
      await asAdmin(() =>
        units.create({ tenant_id: tenantId, organization_id: organizationId, facility_id: facilityId, code: 'ward-a', name: [{ locale: 'en', text: 'Ward' }], type: { system: 'id.unit-type', code: 'ward' }, parent_id: null, ancestor_ids: [], is_clinical: true, external_ids: [], period: { start: '2026-01-01', end: null }, status: 'active' }),
      )
    ).id
    published = await addRoster('published')
  })

  describe('onDuty', () => {
    const noon = new Date('2099-03-10T12:00:00Z')

    it('answers who is on duty at the moment, with the role, from published rosters', async () => {
      const a = await assign(published, 'e1', '2099-03-10', { from: 8, to: 16 })
      const b = await assign(published, 'e2', '2099-03-10', { from: 10, to: 18, role: 'team_leader' })
      await assign(published, 'e3', '2099-03-10', { from: 13, to: 21 })
      await assign(published, 'e4', '2099-03-10', { from: 0, to: 12 })

      const found = await service.onDuty(tenantId, unitId, noon)

      expect(found.map((item) => item.id)).toEqual([a.id, b.id])
      expect(found[1]?.role).toBe('team_leader')
    })

    it('includes the start and excludes the end of a shift', async () => {
      const starting = await assign(published, 'e1', '2099-03-10', { from: 12, to: 20 })
      await assign(published, 'e2', '2099-03-10', { from: 4, to: 12 })
      expect((await service.onDuty(tenantId, unitId, noon)).map((item) => item.id)).toEqual([starting.id])
    })

    it('leaves out unpublished rosters, cancelled and flagged assignments, days off, other units and other tenants', async () => {
      const draft = await addRoster('draft', { start: '2099-04-01', end: '2099-04-30' })
      await assign(draft, 'e1', '2099-03-10', { from: 8, to: 16 })
      await assign(published, 'e2', '2099-03-10', { from: 8, to: 16, status: 'cancelled' })
      await assign(published, 'e3', '2099-03-10', { from: 8, to: 16, flagged: true })
      await assign(published, 'e4', '2099-03-10', { off: true })
      await assign(published, 'e5', '2099-03-10', { from: 8, to: 16, tenant: otherTenantId })
      const other = await asAdmin(() => rosters.create(Object.assign({}, published, { unit_id: new Types.ObjectId().toHexString(), period: { start: '2099-05-01', end: '2099-05-31' } }) as never))
      await assign(other, 'e6', '2099-03-10', { from: 8, to: 16 })
      const closed = await addRoster('closed', { start: '2099-06-01', end: '2099-06-30' })
      const kept = await assign(closed, 'e7', '2099-03-10', { from: 8, to: 16 })

      expect((await service.onDuty(tenantId, unitId, noon)).map((item) => item.id)).toEqual([kept.id])
    })

    it('answers not found for a missing, malformed or foreign unit', async () => {
      const foreign = await asAdmin(() => units.create({ tenant_id: otherTenantId, organization_id: organizationId, facility_id: facilityId, code: 'x', name: [{ locale: 'en', text: 'X' }], type: { system: 'id.unit-type', code: 'ward' }, parent_id: null, ancestor_ids: [], is_clinical: true, external_ids: [], period: { start: '2026-01-01', end: null }, status: 'active' }))
      for (const id of [foreign.id, new Types.ObjectId().toHexString(), 'bad']) {
        expect(await rejection(() => service.onDuty(tenantId, id, noon))).toMatchObject({ kind: 'not_found', code: 'unit_not_found' })
      }
    })

    it('uses the current time when no moment is given', async () => {
      expect(await service.onDuty(tenantId, unitId)).toEqual([])
    })
  })

  describe('myRoster', () => {
    it('answers the employee\'s own planned shifts of published rosters in the range, ordered by date and start', async () => {
      const second = await assign(published, 'me', '2099-03-11', { from: 8, to: 16 })
      const first = await assign(published, 'me', '2099-03-10', { from: 8, to: 16 })
      await assign(published, 'me', '2099-03-10', { from: 0, to: 4 })
      await assign(published, 'me', '2099-03-20', { from: 8, to: 16 })
      await assign(published, 'someone', '2099-03-10', { from: 8, to: 16 })
      await assign(published, 'me', '2099-03-12', { from: 8, to: 16, status: 'cancelled' })
      const draft = await addRoster('draft', { start: '2099-04-01', end: '2099-04-30' })
      await assign(draft, 'me', '2099-03-10', { from: 20, to: 24 })

      const found = await service.myRoster(tenantId, 'me', '2099-03-10', '2099-03-15')

      expect(found.map((item) => item.date)).toEqual(['2099-03-10', '2099-03-10', '2099-03-11'])
      expect(found.at(0)?.starts_at?.getUTCHours()).toBe(0)
      expect(found.at(1)?.id).toBe(first.id)
      expect(found.at(2)?.id).toBe(second.id)
    })

    it('needs an employee linked to the account', async () => {
      expect(await rejection(() => service.myRoster(tenantId, null, '2099-03-10', '2099-03-15'))).toMatchObject({ kind: 'forbidden', code: 'employee_required' })
    })

    it('refuses a bad range: not dates, backwards, or longer than 62 days', async () => {
      for (const [from, to] of [['x', '2099-03-15'], ['2099-03-10', '2099-02-30'], ['2099-03-15', '2099-03-10'], ['2099-03-01', '2099-05-03']]) {
        expect(await rejection(() => service.myRoster(tenantId, 'me', from as string, to as string))).toMatchObject({ code: 'invalid_range' })
      }
      expect(await service.myRoster(tenantId, 'me', '2099-03-01', '2099-05-01')).toEqual([])
      expect(await service.myRoster(tenantId, 'me', '2099-03-10', '2099-03-10')).toEqual([])
    })
  })
})
