import { type CoverageRequirement } from '@repository/model/coverage-requirement'
import { type Employee } from '@repository/model/employee'
import { type RosterAssignment } from '@repository/model/roster-assignment'
import { daysOf, employeeMatches, findCoverageGaps, isWeekend, requirementApplies } from './coverage-check'

const none = { workforce_category: null, profession: null, specialty: null, min_clinical_level: null }
const nurse = { system: 'id.profession', code: 'perawat' }
const doctor = { system: 'id.profession', code: 'dokter' }
const pk2 = { system: 'id.clinical-level', code: 'pk2' }
const pk4 = { system: 'id.clinical-level', code: 'pk4' }
const ranks: Record<string, number> = { pk2: 2, pk4: 4 }
const rank = (coding: { code: string }) => ranks[coding.code] ?? null

/**
 * Builds the employee fields the matching reads.
 *
 * @param override - Fields that replace the defaults of a nurse of level pk2.
 * @returns The employee.
 */
function employee(override: Partial<Employee> = {}): Employee {
  return {
    id: 'e1',
    workforce_category: { system: 'id.workforce-category', code: 'tenaga_keperawatan' },
    profession: nurse,
    specialties: [],
    clinical_level: pk2,
    ...override,
  } as Employee
}

/**
 * Builds a requirement.
 *
 * @param override - Fields that replace the defaults (3 nurses, every day, from March 2099).
 * @returns The requirement.
 */
function requirement(override: Partial<CoverageRequirement> = {}): CoverageRequirement {
  return {
    id: 'r1',
    shift_definition_id: 's1',
    day_pattern: 'all',
    match: { ...none },
    min_count: 2,
    team_leader_required: false,
    period: { start: '2099-03-01', end: null },
    status: 'active',
    ...override,
  } as CoverageRequirement
}

/**
 * Builds an assignment.
 *
 * @param employeeId - The employee.
 * @param date - The day.
 * @param override - Fields that replace the defaults.
 * @returns The assignment.
 */
function assignment(employeeId: string, date: string, override: Partial<RosterAssignment> = {}): RosterAssignment {
  return { id: `${employeeId}-${date}`, employee_id: employeeId, date, shift: { definition_id: 's1' }, role: 'staff', status: 'planned', ...override } as RosterAssignment
}

describe('isWeekend and daysOf', () => {
  it('knows Saturday and Sunday', () => {
    // 2099-03-07 is a Saturday, 2099-03-08 a Sunday, 2099-03-09 a Monday.
    expect([isWeekend('2099-03-06'), isWeekend('2099-03-07'), isWeekend('2099-03-08'), isWeekend('2099-03-09')]).toEqual([false, true, true, false])
  })

  it('lists every day of a period', () => {
    expect(daysOf({ start: '2099-02-27', end: '2099-03-02' })).toEqual(['2099-02-27', '2099-02-28', '2099-03-01', '2099-03-02'])
    expect(daysOf({ start: '2099-03-01', end: '2099-03-01' })).toEqual(['2099-03-01'])
  })
})

describe('requirementApplies', () => {
  const holidays = new Set(['2099-03-10'])

  it('checks the period, both ends included, and an open end', () => {
    const bounded = requirement({ period: { start: '2099-03-05', end: '2099-03-07' } })
    expect(['2099-03-04', '2099-03-05', '2099-03-07', '2099-03-08'].map((day) => requirementApplies(bounded, day, holidays))).toEqual([false, true, true, false])
    expect(requirementApplies(requirement(), '2100-01-01', holidays)).toBe(true)
  })

  it('applies the day pattern: all, weekdays, and weekends with holidays', () => {
    const weekdays = requirement({ day_pattern: 'weekdays' })
    const off = requirement({ day_pattern: 'weekends_holidays' })
    // Saturday 2099-03-07, Monday 2099-03-09, a holiday on Tuesday 2099-03-10.
    expect(['2099-03-07', '2099-03-09', '2099-03-10'].map((day) => requirementApplies(weekdays, day, holidays))).toEqual([false, true, true])
    expect(['2099-03-07', '2099-03-09', '2099-03-10'].map((day) => requirementApplies(off, day, holidays))).toEqual([true, false, true])
    expect(requirementApplies(requirement(), '2099-03-07', holidays)).toBe(true)
  })
})

describe('employeeMatches', () => {
  it('matches anyone when no criterion is set', () => {
    expect(employeeMatches(employee(), none, rank)).toBe(true)
  })

  it('checks the category, the profession and the specialty one by one', () => {
    expect(employeeMatches(employee(), { ...none, workforce_category: { system: 'id.workforce-category', code: 'tenaga_keperawatan' } }, rank)).toBe(true)
    expect(employeeMatches(employee(), { ...none, workforce_category: { system: 'id.workforce-category', code: 'tenaga_medis' } }, rank)).toBe(false)
    expect(employeeMatches(employee(), { ...none, profession: nurse }, rank)).toBe(true)
    expect(employeeMatches(employee(), { ...none, profession: doctor }, rank)).toBe(false)
    expect(employeeMatches(employee({ profession: null }), { ...none, profession: nurse }, rank)).toBe(false)
    const bedah = { system: 'id.specialty', code: 'bedah' }
    expect(employeeMatches(employee({ specialties: [{ coding: bedah, is_primary: true }] }), { ...none, specialty: bedah }, rank)).toBe(true)
    expect(employeeMatches(employee(), { ...none, specialty: bedah }, rank)).toBe(false)
  })

  it('means "this level or higher" by rank, and falls back to the same code without ranks', () => {
    expect(employeeMatches(employee({ clinical_level: pk4 }), { ...none, min_clinical_level: pk2 }, rank)).toBe(true)
    expect(employeeMatches(employee({ clinical_level: pk2 }), { ...none, min_clinical_level: pk4 }, rank)).toBe(false)
    expect(employeeMatches(employee({ clinical_level: null }), { ...none, min_clinical_level: pk2 }, rank)).toBe(false)
    expect(employeeMatches(employee({ clinical_level: pk2 }), { ...none, min_clinical_level: pk2 }, () => null)).toBe(true)
    expect(employeeMatches(employee({ clinical_level: pk4 }), { ...none, min_clinical_level: pk2 }, () => null)).toBe(false)
  })
})

describe('findCoverageGaps', () => {
  const base = { dates: ['2099-03-09', '2099-03-10'], holidays: new Set<string>(), rank }

  it('reports a day whose count is below the minimum, and none when it is met', () => {
    const employees = new Map([['e1', employee({ id: 'e1' })], ['e2', employee({ id: 'e2' })]])
    const gaps = findCoverageGaps({ ...base, requirements: [requirement()], employees, assignments: [assignment('e1', '2099-03-09'), assignment('e2', '2099-03-09'), assignment('e1', '2099-03-10')] })

    expect(gaps).toEqual([{ date: '2099-03-10', shiftId: 's1', requirementId: 'r1', reason: 'min_count', required: 2, actual: 1 }])
  })

  it('counts only the employees that match, and only the shift of the requirement', () => {
    const employees = new Map([['e1', employee({ id: 'e1' })], ['e2', employee({ id: 'e2', profession: doctor })]])
    const gaps = findCoverageGaps({
      ...base,
      dates: ['2099-03-09'],
      requirements: [requirement({ match: { ...none, profession: nurse }, min_count: 2 })],
      employees,
      assignments: [assignment('e1', '2099-03-09'), assignment('e2', '2099-03-09'), assignment('e1', '2099-03-09', { shift: { definition_id: 's2' } as never, id: 'x' })],
    })
    expect(gaps[0]).toMatchObject({ reason: 'min_count', required: 2, actual: 1 })
  })

  it('skips days a requirement does not apply to', () => {
    // 2099-03-07 is a Saturday: a weekday requirement is not checked.
    const gaps = findCoverageGaps({ ...base, dates: ['2099-03-07'], requirements: [requirement({ day_pattern: 'weekdays' })], employees: new Map(), assignments: [] })
    expect(gaps).toEqual([])
  })

  it('needs exactly one team leader who meets the profession and the level', () => {
    const employees = new Map([['e1', employee({ id: 'e1', clinical_level: pk4 })], ['e2', employee({ id: 'e2', clinical_level: pk2 })], ['e3', employee({ id: 'e3', clinical_level: pk4 })]])
    const required = requirement({ min_count: 1, team_leader_required: true, match: { ...none, profession: nurse, min_clinical_level: pk4 } })
    const run = (assignments: RosterAssignment[]) => findCoverageGaps({ ...base, dates: ['2099-03-09'], requirements: [required], employees, assignments })

    expect(run([assignment('e1', '2099-03-09', { role: 'team_leader' })])).toEqual([])
    expect(run([assignment('e1', '2099-03-09')])).toEqual([expect.objectContaining({ reason: 'team_leader', required: 1, actual: 0 })])
    expect(run([assignment('e1', '2099-03-09', { role: 'team_leader' }), assignment('e3', '2099-03-09', { role: 'team_leader' })])).toEqual([expect.objectContaining({ reason: 'team_leader', actual: 2 })])
    // The leader is a nurse of level pk2, below the pk4 the requirement asks for.
    expect(run([assignment('e1', '2099-03-09'), assignment('e2', '2099-03-09', { role: 'team_leader' })]).map((gap) => gap.reason)).toEqual(['team_leader'])
  })

  it('reports both a shortfall and a missing team leader on the same day', () => {
    const gaps = findCoverageGaps({ ...base, dates: ['2099-03-09'], requirements: [requirement({ min_count: 2, team_leader_required: true })], employees: new Map(), assignments: [] })
    expect(gaps.map((gap) => gap.reason)).toEqual(['min_count', 'team_leader'])
  })
})
