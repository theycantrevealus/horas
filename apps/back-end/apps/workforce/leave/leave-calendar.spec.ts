import { createLeaveWorld, type LeaveWorld } from '../testing/leave-world'
import { LeaveCalendar } from './leave-calendar'
import type { LeaveDay } from '@repository/model/leave-request'

describe('LeaveCalendar', () => {
  let world: LeaveWorld
  let calendar: LeaveCalendar

  /**
   * A breakdown of the days of a leave.
   *
   * @param counts - Date and count.
   * @returns The breakdown.
   */
  function days(counts: [string, LeaveDay['count']][]): LeaveDay[] {
    return counts.map(([date, count]) => ({ date, count, why: 'working' as const, set_by: 'working_week' as const }))
  }

  beforeEach(async () => {
    world = await createLeaveWorld()
    calendar = new LeaveCalendar(world.repos.requests)
  })

  it('is true on a whole day of an approved leave, and false on a half day, a day that does not count and outside the period', async () => {
    await world.addRequest(world.nurse, { status: 'approved', period: { start: '2026-12-01', end: '2026-12-04' }, days: days([['2026-12-01', 1], ['2026-12-02', 0.5], ['2026-12-03', 0], ['2026-12-04', 1]]) })

    expect(await calendar.isOnLeave(world.tenantId, world.nurse.id, '2026-12-01')).toBe(true)
    expect(await calendar.isOnLeave(world.tenantId, world.nurse.id, '2026-12-04')).toBe(true)
    expect(await calendar.isOnLeave(world.tenantId, world.nurse.id, '2026-12-02')).toBe(false)
    expect(await calendar.isOnLeave(world.tenantId, world.nurse.id, '2026-12-03')).toBe(false)
    expect(await calendar.isOnLeave(world.tenantId, world.nurse.id, '2026-12-05')).toBe(false)
  })

  it('ignores pending, rejected and cancelled requests, other people and other tenants', async () => {
    for (const status of ['requested', 'head_approved', 'rejected', 'cancelled'] as const) {
      await world.addRequest(world.nurse, { status, period: { start: '2026-12-10', end: '2026-12-10' }, days: days([['2026-12-10', 1]]) })
    }
    await world.addRequest(world.headU, { status: 'approved', period: { start: '2026-12-11', end: '2026-12-11' }, days: days([['2026-12-11', 1]]) })

    expect(await calendar.isOnLeave(world.tenantId, world.nurse.id, '2026-12-10')).toBe(false)
    expect(await calendar.isOnLeave(world.tenantId, world.nurse.id, '2026-12-11')).toBe(false)
    expect(await calendar.isOnLeave(world.otherTenantId, world.headU.id, '2026-12-11')).toBe(false)
  })
})
