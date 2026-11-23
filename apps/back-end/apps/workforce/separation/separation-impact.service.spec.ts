import { Types } from 'mongoose'
import {
  InMemoryClinicalAppointments,
  InMemoryCommitteeMemberships,
  InMemoryPracticeSchedules,
  InMemoryPrivilegeGrants,
  InMemorySeparations,
} from '../testing/in-memory'
import { createLeaveWorld, type LeaveWorld } from '../testing/leave-world'
import { InvalidRequestError, NotFoundError } from '../workforce.error'
import { SeparationImpactService } from './separation-impact.service'

describe('SeparationImpactService', () => {
  let world: LeaveWorld
  let separations: InMemorySeparations
  let appointments: InMemoryClinicalAppointments
  let grants: InMemoryPrivilegeGrants
  let memberships: InMemoryCommitteeMemberships
  let schedules: InMemoryPracticeSchedules
  let service: SeparationImpactService

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
   * Stores a planned separation of the nurse.
   *
   * @param override - Fields that replace the defaults.
   * @returns The separation.
   */
  function addSeparation(override: object = {}) {
    return world.seed(() =>
      separations.create({
        tenant_id: world.tenantId, employee_id: world.nurse.id, facility_id: world.facilityId, type: { system: 'id.separation-type', code: 'resignation' }, contract_action: 'end',
        last_working_day: '2026-12-31', notice_received_on: null, immediate: false, status: 'planned', status_since: new Date(), completion: null, checklist: [], settlement: null, ...override,
      } as never),
    )
  }

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-23T05:00:00Z'))
    world = await createLeaveWorld()
    separations = new InMemorySeparations()
    appointments = new InMemoryClinicalAppointments()
    grants = new InMemoryPrivilegeGrants()
    memberships = new InMemoryCommitteeMemberships()
    schedules = new InMemoryPracticeSchedules()
    service = new SeparationImpactService(
      separations, world.repos.rosterAssignments, schedules, world.repos.requests, appointments, grants, memberships, world.repos.assignments, world.repos.contracts,
    )
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('lists exactly what completion would close: what is after the last working day, and what is current', async () => {
    const separation = await addSeparation()
    const roster = await world.addRoster(world.ward, { start: '2026-12-28', end: '2027-01-03' }, 'published', { employee: world.nurse, dates: ['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02'] })
    const planned = (await world.repos.rosterAssignments.findByRoster(world.tenantId, roster.id)).filter((item) => item.date > '2026-12-31')
    const schedule = await world.seed(() => schedules.create({ tenant_id: world.tenantId, employee_id: world.nurse.id, unit_id: world.ward.id, facility_id: world.facilityId, day_of_week: 1, start_time: '08:00', end_time: '12:00', quota: null, period: { start: '2026-01-01', end: null }, status: 'active' }))
    await world.seed(() => schedules.create({ tenant_id: world.tenantId, employee_id: world.nurse.id, unit_id: world.ward.id, facility_id: world.facilityId, day_of_week: 2, start_time: '08:00', end_time: '12:00', quota: null, period: { start: '2026-01-01', end: '2026-12-31' }, status: 'ended' }))
    const open = await world.addRequest(world.nurse, { status: 'approved', period: { start: '2026-12-29', end: '2027-01-05' } })
    await world.addRequest(world.nurse, { status: 'approved', period: { start: '2026-12-01', end: '2026-12-31' } })
    await world.addRequest(world.nurse, { status: 'rejected', period: { start: '2027-02-01', end: '2027-02-02' } })
    const spk = await world.seed(() => appointments.create({ tenant_id: world.tenantId, employee_id: world.nurse.id, appointment_number: 'SPK-1', valid_period: { start: '2026-01-01', end: '2028-12-31' }, status: 'active', is_current: true } as never))
    await world.seed(() => appointments.create({ tenant_id: world.tenantId, employee_id: world.nurse.id, appointment_number: 'SPK-0', valid_period: { start: '2023-01-01', end: '2025-12-31' }, status: 'expired', is_current: false } as never))
    const grant = await world.seed(() => grants.create({ tenant_id: world.tenantId, appointment_id: spk.id, catalog_item_id: new Types.ObjectId().toHexString(), code: 'G1', status: 'active' } as never))
    const suspended = await world.seed(() => grants.create({ tenant_id: world.tenantId, appointment_id: spk.id, catalog_item_id: new Types.ObjectId().toHexString(), code: 'G2', status: 'suspended' } as never))
    await world.seed(() => grants.create({ tenant_id: world.tenantId, appointment_id: spk.id, catalog_item_id: new Types.ObjectId().toHexString(), code: 'G3', status: 'revoked' } as never))
    const seat = await world.seed(() => memberships.create({ tenant_id: world.tenantId, employee_id: world.nurse.id, facility_id: world.facilityId, committee: { system: 'id.committee', code: 'kredensial' }, role: { system: 'id.committee-role', code: 'member' }, status: 'active' } as never))
    await world.seed(() => memberships.create({ tenant_id: world.tenantId, employee_id: world.nurse.id, facility_id: world.facilityId, committee: { system: 'id.committee', code: 'etik' }, role: { system: 'id.committee-role', code: 'member' }, status: 'ended' } as never))
    const positions = await world.repos.assignments.findOpenByEmployee(world.tenantId, world.nurse.id)
    const contract = await world.repos.contracts.findActiveByEmployee(world.tenantId, world.nurse.id)

    const impact = await service.impact(world.tenantId, separation.id)

    expect(impact.lastWorkingDay).toBe('2026-12-31')
    expect(impact.assignments).toEqual({ count: 2, ids: planned.map((item) => item.id) })
    expect(impact.sessions).toEqual({ count: 1, ids: [schedule.id] })
    expect(impact.leaveRequests).toEqual({ count: 1, ids: [open.id] })
    expect(impact.appointments).toEqual({ count: 1, ids: [spk.id] })
    expect(impact.grants.ids.sort()).toEqual([grant.id, suspended.id].sort())
    expect(impact.memberships).toEqual({ count: 1, ids: [seat.id] })
    expect(impact.positionAssignments).toEqual({ count: positions.length, ids: positions.map((item) => item.id) })
    expect(impact.contract).toEqual(contract ? { id: contract.id } : null)
  })

  it('answers zero for an employee with nothing after the last working day', async () => {
    const separation = await addSeparation({ employee_id: (await world.addEmployee()).id })

    const impact = await service.impact(world.tenantId, separation.id)

    for (const key of ['assignments', 'sessions', 'leaveRequests', 'appointments', 'grants', 'memberships'] as const) {
      expect(impact[key]).toEqual({ count: 0, ids: [] })
    }
  })

  it('answers 404 for a missing, malformed or foreign separation, and 422 for one that is not planned', async () => {
    const separation = await addSeparation()
    const done = await addSeparation({ employee_id: (await world.addEmployee()).id, status: 'completed' })

    expect(((await rejection(() => service.impact(world.tenantId, new Types.ObjectId().toHexString()))) as NotFoundError).code).toBe('separation_not_found')
    expect(((await rejection(() => service.impact(world.tenantId, 'bad'))) as NotFoundError).code).toBe('separation_not_found')
    expect(((await rejection(() => service.impact(world.otherTenantId, separation.id))) as NotFoundError).code).toBe('separation_not_found')
    expect(((await rejection(() => service.impact(world.tenantId, done.id))) as InvalidRequestError).code).toBe('separation_not_planned')
  })

  it('never reads the records of another tenant', async () => {
    const separation = await addSeparation()
    await world.seed(() => memberships.create({ tenant_id: world.otherTenantId, employee_id: world.nurse.id, facility_id: world.facilityId, committee: { system: 'id.committee', code: 'kredensial' }, role: { system: 'id.committee-role', code: 'member' }, status: 'active' } as never))
    await world.seed(() => appointments.create({ tenant_id: world.otherTenantId, employee_id: world.nurse.id, appointment_number: 'SPK-9', valid_period: { start: '2026-01-01', end: '2028-12-31' }, status: 'active', is_current: true } as never))

    const impact = await service.impact(world.tenantId, separation.id)

    expect(impact.memberships.count).toBe(0)
    expect(impact.appointments.count).toBe(0)
  })
})
