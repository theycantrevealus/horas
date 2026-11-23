import { InMemorySeparations } from '../testing/in-memory'
import { InvalidRequestError } from '../workforce.error'
import { SeparationCalendar } from './separation-calendar'

describe('SeparationCalendar', () => {
  const tenantId = 'aaaaaaaaaaaaaaaaaaaaaaaa'
  const employeeId = 'bbbbbbbbbbbbbbbbbbbbbbbb'
  let separations: InMemorySeparations
  let calendar: SeparationCalendar

  /**
   * Stores a separation of the employee.
   *
   * @param status - Separation status.
   * @param tenant - Tenant of the record.
   */
  function add(status: 'planned' | 'completed' | 'cancelled', tenant = tenantId) {
    return separations.create({ tenant_id: tenant, employee_id: employeeId, last_working_day: '2026-12-31', status } as never)
  }

  beforeEach(() => {
    separations = new InMemorySeparations()
    calendar = new SeparationCalendar(separations)
  })

  it('is true only for a date after the last working day of a planned or completed separation', async () => {
    await add('planned')

    expect(await calendar.isLeavingBefore(tenantId, employeeId, '2027-01-01')).toBe(true)
    expect(await calendar.isLeavingBefore(tenantId, employeeId, '2026-12-31')).toBe(false)
    expect(await calendar.isLeavingBefore(tenantId, employeeId, '2026-06-01')).toBe(false)
  })

  it('counts a completed separation and ignores a cancelled one, another employee and another tenant', async () => {
    await add('cancelled')
    expect(await calendar.isLeavingBefore(tenantId, employeeId, '2027-06-01')).toBe(false)
    await add('completed')
    expect(await calendar.isLeavingBefore(tenantId, employeeId, '2027-06-01')).toBe(true)
    expect(await calendar.isLeavingBefore(tenantId, 'cccccccccccccccccccccccc', '2027-06-01')).toBe(false)
    expect(await calendar.isLeavingBefore('dddddddddddddddddddddddd', employeeId, '2027-06-01')).toBe(false)
  })

  it('refuses a planned date after the last day with employee_leaving, and any credential application of a leaving employee', async () => {
    await add('planned')
    const code = async (work: () => Promise<void>) => ((await work().catch((error: unknown) => error)) as InvalidRequestError).code

    expect(await code(() => calendar.assertCanPlan(tenantId, employeeId, '2027-01-01'))).toBe('employee_leaving')
    await expect(calendar.assertCanPlan(tenantId, employeeId, '2026-12-31')).resolves.toBeUndefined()
    expect(await code(() => calendar.assertNotLeaving(tenantId, employeeId))).toBe('employee_leaving')
    await expect(calendar.assertNotLeaving(tenantId, 'cccccccccccccccccccccccc')).resolves.toBeUndefined()
  })
})
