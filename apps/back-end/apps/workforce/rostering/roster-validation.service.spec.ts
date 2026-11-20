import { Types } from 'mongoose'
import { RepositoryConflictError } from '@utility/database/error'
import { runWithRequestContext } from '@utility/logger/context'
import { type AppLogger } from '@utility/logger/service'
import { type CoverageRequirement } from '@repository/model/coverage-requirement'
import { type Employee } from '@repository/model/employee'
import { type Roster } from '@repository/model/roster'
import { type RosterAssignment } from '@repository/model/roster-assignment'
import { type CodeConceptService } from '../concept/code-concept.service'
import { type EligibilityService } from '../eligibility/eligibility.service'
import { type ParameterService } from '../parameter/parameter.service'
import {
  InMemoryCoverageRequirements,
  InMemoryEmployees,
  InMemoryFacilities,
  InMemoryHolidayCalendars,
  InMemoryOrganizationUnits,
  InMemoryRosterAssignments,
  InMemoryRosters,
} from '../testing/in-memory'
import { RosterValidationService } from './roster-validation.service'

describe('RosterValidationService', () => {
  const tenantId = new Types.ObjectId().toHexString()
  const otherTenantId = new Types.ObjectId().toHexString()
  const organizationId = new Types.ObjectId().toHexString()
  const shiftA = new Types.ObjectId().toHexString()
  const shiftB = new Types.ObjectId().toHexString()
  const log = vi.fn()
  const warn = vi.fn()
  const error = vi.fn()
  const debug = vi.fn()
  let assignments: InMemoryRosterAssignments
  let rosters: InMemoryRosters
  let units: InMemoryOrganizationUnits
  let facilities: InMemoryFacilities
  let employees: InMemoryEmployees
  let requirements: InMemoryCoverageRequirements
  let calendars: InMemoryHolidayCalendars
  let service: RosterValidationService
  let limits: Record<string, number>
  let eligible: { value: { eligible: true } | { eligible: false; failed: string } }
  let ranks: Record<string, number>
  let facilityId: string
  let unitId: string
  let roster: Roster
  let nurse: Employee

  // 2099-03-02 is a Monday; 2099-03-07 and 2099-03-08 are the weekend.
  const march = { start: '2099-03-01', end: '2099-03-31' }

  /**
   * Runs `work` as the signed-in account `head`.
   *
   * @param work - Code to run.
   * @returns What `work` returns.
   */
  function asHead<T>(work: () => Promise<T>): Promise<T> {
    return runWithRequestContext(
      { correlationId: 'c1', actor: { account_id: 'head', display_name: 'Head', kind: 'account' } },
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
   * Adds an employee.
   *
   * @param override - Fields that replace the defaults of a nurse who is not clinical.
   * @returns The employee.
   */
  function addEmployee(override: Partial<Employee> = {}) {
    return asHead(() =>
      employees.create({
        tenant_id: tenantId,
        employee_number: `E${new Types.ObjectId().toHexString()}`,
        name: { use: 'official', text: 'Siti', given: [], prefix: [], suffix: [] },
        other_names: [],
        display_name: 'Siti',
        administrative_gender: null,
        workforce_category: { system: 'id.workforce-category', code: 'tenaga_keperawatan' },
        is_clinical: false,
        profession: { system: 'id.profession', code: 'perawat' },
        specialties: [],
        clinical_level: { system: 'id.clinical-level', code: 'pk2' },
        employment_status: 'active',
        employment_status_since: '2026-01-01',
        current_employment: null,
        primary_assignment: null,
        original_hire_date: '2026-01-01',
        separation_date: null,
        practitioner_ids: [],
        work_contacts: [],
        photo: null,
        preferred_language: null,
        ...override,
      }),
    )
  }

  /**
   * Adds an assignment directly.
   *
   * @param employee - The employee.
   * @param date - The day the shift starts.
   * @param override - Shift times as UTC hours, role, status, roster and overtime.
   * @returns The assignment.
   */
  function assign(
    employee: Employee,
    date: string,
    override: { from?: number; to?: number; night?: boolean; paid?: number; role?: RosterAssignment['role']; status?: 'planned' | 'cancelled'; roster?: Roster; shift?: string; type?: 'regular' | 'off'; consent?: boolean } = {},
  ) {
    const from = override.from ?? 0
    const to = override.to ?? 8
    const off = override.type === 'off'
    const day = Date.parse(`${date}T00:00:00Z`)
    return asHead(() =>
      assignments.create({
        tenant_id: tenantId,
        roster_id: (override.roster ?? roster).id,
        unit_id: (override.roster ?? roster).unit_id,
        facility_id: facilityId,
        employee_id: employee.id,
        date,
        shift: { definition_id: override.shift ?? shiftA, code: 'P', type: override.type ?? 'regular', start_time: off ? null : '07:00', end_time: off ? null : '15:00', paid_minutes: off ? 0 : override.paid ?? (to - from) * 60, is_night: override.night ?? false },
        starts_at: off ? null : new Date(day + from * 3_600_000),
        ends_at: off ? null : new Date(day + to * 3_600_000),
        role: override.role ?? 'staff',
        status: override.status ?? 'planned',
        source: { kind: 'roster', ref_id: null },
        cancellation: null,
        change_reason: null,
        revision: 0,
        overtime: override.consent ? { minutes: 0, consent: { at: new Date(), document: null } } : null,
        flag: null,
        is_flagged: false,
      }),
    )
  }

  /**
   * Adds a coverage requirement of the unit.
   *
   * @param override - Fields that replace the defaults (2 staff on shift A, every day).
   * @returns The requirement.
   */
  function addRequirement(override: Partial<CoverageRequirement> = {}) {
    return asHead(() =>
      requirements.create({
        tenant_id: tenantId,
        unit_id: unitId,
        shift_definition_id: shiftA,
        day_pattern: 'all',
        match: { workforce_category: null, profession: null, specialty: null, min_clinical_level: null },
        min_count: 2,
        team_leader_required: false,
        period: { start: '2099-03-02', end: '2099-03-02' },
        status: 'active',
        ...override,
      }),
    )
  }

  /**
   * Stores a roster of the unit.
   *
   * @param override - Fields that replace the defaults.
   * @returns The roster.
   */
  function addRoster(override: Partial<Roster> = {}) {
    return asHead(() =>
      rosters.create({
        tenant_id: tenantId,
        unit_id: unitId,
        facility_id: facilityId,
        period: march,
        status: 'draft',
        revision: 0,
        prepared_by: { account_id: 'head', display_name: 'Head', kind: 'account' },
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

  /**
   * Adds a unit of the facility.
   *
   * @param override - Fields that replace the defaults.
   * @returns The unit.
   */
  function addUnit(override: { is_clinical?: boolean; status?: 'active' | 'closed' } = {}) {
    return asHead(() =>
      units.create({
        tenant_id: tenantId,
        organization_id: organizationId,
        facility_id: facilityId,
        code: `u-${new Types.ObjectId().toHexString()}`,
        name: [{ locale: 'en', text: 'Ward' }],
        type: { system: 'id.unit-type', code: 'ward' },
        parent_id: null,
        ancestor_ids: [],
        is_clinical: override.is_clinical ?? false,
        external_ids: [],
        period: { start: '2026-01-01', end: null },
        status: override.status ?? 'active',
      }),
    )
  }

  beforeEach(async () => {
    vi.resetAllMocks()
    limits = { MIN_REST_HOURS: 8, MAX_WEEKLY_HOURS: 40, MAX_OVERTIME_HOURS_WEEK: 18, MAX_CONSECUTIVE_NIGHTS: 3 }
    eligible = { value: { eligible: true } }
    ranks = { pk2: 2, pk4: 4 }
    assignments = new InMemoryRosterAssignments()
    rosters = new InMemoryRosters()
    units = new InMemoryOrganizationUnits()
    facilities = new InMemoryFacilities()
    employees = new InMemoryEmployees()
    requirements = new InMemoryCoverageRequirements()
    calendars = new InMemoryHolidayCalendars()
    const parameters = { resolve: async (_tenant: string, { key }: { key: string }) => ({ value: limits[key] }) } as unknown as ParameterService
    const concepts = { resolve: async (_tenant: string, _system: string, code: string) => ({ properties: { rank: ranks[code] } }) } as unknown as CodeConceptService
    const eligibility = { general: async () => eligible.value } as unknown as EligibilityService
    const logger = { log, warn, error, debug } as unknown as AppLogger
    service = new RosterValidationService(assignments, rosters, units, facilities, employees, requirements, calendars, concepts, eligibility, parameters, logger)
    facilityId = (
      await asHead(() =>
        facilities.create({
          tenant_id: tenantId,
          organization_id: organizationId,
          code: 'rs-sehat',
          name: [{ locale: 'en', text: 'RS' }],
          address: null,
          timezone: 'Asia/Jakarta',
          holiday_calendar_codes: ['id-national'],
          external_ids: [],
          status: 'active',
        }),
      )
    ).id
    unitId = (await addUnit()).id
    roster = await addRoster()
    nurse = await addEmployee()
  })

  describe('report: the rules of an employee', () => {
    it('finds nothing in an empty roster, and nothing in a roster that follows every rule', async () => {
      expect((await service.report(tenantId, roster)).summary).toEqual({ violations: 0, coverageGaps: 0, overridden: 0 })
      await assign(nurse, '2099-03-02')
      await assign(nurse, '2099-03-03')
      expect((await service.report(tenantId, roster)).violations).toEqual([])
    })

    it('flags an employee who is no longer on probation or active (HR-ROS-001), once per assignment', async () => {
      const gone = await addEmployee({ employment_status: 'suspended' })
      const first = await assign(gone, '2099-03-02')
      await assign(gone, '2099-03-03')

      const report = await service.report(tenantId, roster)

      expect(report.violations).toHaveLength(2)
      expect(report.violations[0]).toEqual({ rule: 'HR-ROS-001', code: 'employee_not_assignable', employeeId: gone.id, date: '2099-03-02', assignmentId: first.id })
    })

    it('flags a clinical employee in a clinical unit who is not eligible, naming the condition (HR-ROS-002)', async () => {
      const clinicalUnit = await addUnit({ is_clinical: true })
      const clinicalRoster = await addRoster({ unit_id: clinicalUnit.id, period: { start: '2099-04-01', end: '2099-04-30' } })
      const clinical = await addEmployee({ is_clinical: true })
      await assign(clinical, '2099-04-06', { roster: clinicalRoster })
      eligible.value = { eligible: false, failed: 'sip' }

      const report = await service.report(tenantId, clinicalRoster)

      expect(report.violations).toEqual([expect.objectContaining({ rule: 'HR-ROS-002', code: 'not_eligible_sip', employeeId: clinical.id })])
      // A non-clinical employee, or a non-clinical unit, is not checked.
      await assign(nurse, '2099-04-07', { roster: clinicalRoster })
      expect((await service.report(tenantId, clinicalRoster)).violations).toHaveLength(1)
      await assign(clinical, '2099-03-06')
      expect((await service.report(tenantId, roster)).violations).toEqual([])
    })

    it('flags an overlap once, on the later assignment, across rosters and units (HR-ROS-010, 016)', async () => {
      const elsewhere = await addRoster({ unit_id: (await addUnit()).id })
      await assign(nurse, '2099-03-02', { roster: elsewhere })
      const later = await assign(nurse, '2099-03-02', { from: 4, to: 12 })

      const report = await service.report(tenantId, roster)

      expect(report.violations).toEqual([{ rule: 'HR-ROS-010', code: 'overlap', employeeId: nurse.id, date: '2099-03-02', assignmentId: later.id }])
      expect((await service.report(tenantId, elsewhere)).violations).toEqual([])
    })

    it('flags too short a rest (HR-ROS-011) and respects MIN_REST_HOURS', async () => {
      await assign(nurse, '2099-03-02', { from: 0, to: 8 })
      await assign(nurse, '2099-03-02', { from: 14, to: 20, roster: await addRoster({ unit_id: (await addUnit()).id }) })
      const second = await assign(nurse, '2099-03-03', { from: 2, to: 6 })

      const report = await service.report(tenantId, roster)

      expect(report.violations.map((item) => [item.rule, item.code, item.assignmentId])).toEqual([['HR-ROS-011', 'rest_too_short', second.id]])
      limits.MIN_REST_HOURS = 2
      expect((await service.report(tenantId, roster)).violations).toEqual([])
    })

    it('flags weekly overtime without consent, and above the weekly limit even with it (HR-ROS-013)', async () => {
      const long = (date: string, consent = false) => assign(nurse, date, { from: 0, to: 10, consent })
      for (const date of ['2099-03-02', '2099-03-03', '2099-03-04', '2099-03-05']) {
        await long(date)
      }
      const fifth = await assign(nurse, '2099-03-06', { from: 0, to: 8 })

      let report = await service.report(tenantId, roster)
      expect(report.violations).toEqual([expect.objectContaining({ rule: 'HR-ROS-013', code: 'overtime_consent_required', assignmentId: fifth.id })])
      await asHead(() => assignments.update(fifth.id, { overtime: { minutes: 480, consent: { at: new Date(), document: null } } }))
      report = await service.report(tenantId, roster)
      expect(report.violations).toEqual([])
      await assign(nurse, '2099-03-07', { from: 0, to: 12, consent: true })
      report = await service.report(tenantId, roster)
      expect(report.violations.map((item) => item.code)).toEqual(['overtime_limit_exceeded'])
    })

    it('flags a night run that is too long, on the night that breaks it (HR-ROS-015)', async () => {
      for (const date of ['2099-03-02', '2099-03-03', '2099-03-04']) {
        await assign(nurse, date, { from: 14, to: 24, night: true })
      }
      expect((await service.report(tenantId, roster)).violations).toEqual([])
      const fourth = await assign(nurse, '2099-03-05', { from: 14, to: 24, night: true })

      const report = await service.report(tenantId, roster)

      expect(report.violations).toEqual([expect.objectContaining({ rule: 'HR-ROS-015', code: 'too_many_nights', assignmentId: fourth.id })])
    })

    it('flags 7 days in a row without a rest day, once, with no assignment (HR-ROS-014); a day off is a rest day', async () => {
      for (let day = 2; day <= 8; day += 1) {
        await assign(nurse, `2099-03-0${day}`, { from: 0, to: 5 })
      }
      const report = await service.report(tenantId, roster)
      expect(report.violations).toEqual([{ rule: 'HR-ROS-014', code: 'no_rest_day', employeeId: nurse.id, date: '2099-03-08', assignmentId: null }])

      const rested = await addEmployee()
      for (let day = 2; day <= 8; day += 1) {
        await assign(rested, `2099-03-0${day}`, day === 5 ? { type: 'off' } : { from: 0, to: 5 })
      }
      expect((await service.report(tenantId, roster)).violations.filter((item) => item.employeeId === rested.id)).toEqual([])
    })

    it('does not count cancelled assignments, and sorts the violations by day, employee and code', async () => {
      await assign(nurse, '2099-03-02', { status: 'cancelled' })
      await assign(nurse, '2099-03-02')
      expect((await service.report(tenantId, roster)).violations).toEqual([])
      const a = await addEmployee({ employment_status: 'suspended' })
      const b = await addEmployee({ employment_status: 'separated' })
      await assign(b, '2099-03-05')
      await assign(a, '2099-03-05')
      await assign(a, '2099-03-04')
      const order = (await service.report(tenantId, roster)).violations.map((item) => [item.date, item.employeeId === a.id ? 'a' : 'b'])
      expect(order[0]).toEqual(['2099-03-04', 'a'])
      expect(order.map((item) => item[0])).toEqual(order.map((item) => item[0]).sort())
    })
  })

  describe('report: coverage', () => {
    it('reports a day whose count is below the minimum, and counts only planned assignments of the shift', async () => {
      const requirement = await addRequirement()
      await assign(nurse, '2099-03-02')
      await assign(await addEmployee(), '2099-03-02', { status: 'cancelled' })
      await assign(await addEmployee(), '2099-03-02', { shift: shiftB })

      const report = await service.report(tenantId, roster)

      expect(report.coverageGaps).toEqual([{ date: '2099-03-02', shiftId: shiftA, requirementId: requirement.id, reason: 'min_count', required: 2, actual: 1, overridden: false }])
      expect(report.summary).toEqual({ violations: 0, coverageGaps: 1, overridden: 0 })
      await assign(await addEmployee(), '2099-03-02')
      expect((await service.report(tenantId, roster)).coverageGaps).toEqual([])
    })

    it('counts the level of an employee by rank, and the team leader by profession and level', async () => {
      const requirement = await addRequirement({
        match: { workforce_category: null, profession: { system: 'id.profession', code: 'perawat' }, specialty: null, min_clinical_level: { system: 'id.clinical-level', code: 'pk4' } },
        min_count: 1,
        team_leader_required: true,
      })
      const junior = await addEmployee()
      const senior = await addEmployee({ clinical_level: { system: 'id.clinical-level', code: 'pk4' } })
      await assign(junior, '2099-03-02', { role: 'team_leader' })

      let report = await service.report(tenantId, roster)
      expect(report.coverageGaps.map((gap) => gap.reason)).toEqual(['min_count', 'team_leader'])
      await assign(senior, '2099-03-02')
      report = await service.report(tenantId, roster)
      expect(report.coverageGaps.map((gap) => gap.reason)).toEqual(['team_leader'])
      const seniorShift = (await assignments.findByRoster(tenantId, roster.id, { employeeId: senior.id }))[0]
      const juniorShift = (await assignments.findByRoster(tenantId, roster.id, { employeeId: junior.id }))[0]
      await asHead(() => assignments.update(seniorShift?.id ?? '', { role: 'team_leader' }))
      await asHead(() => assignments.update(juniorShift?.id ?? '', { role: 'staff' }))
      expect((await service.report(tenantId, roster)).coverageGaps).toEqual([])
      expect(requirement.id).toBeTruthy()
    })

    it('applies the day pattern: weekdays skip the weekend, and weekends_holidays include the facility holidays', async () => {
      const weekdays = await addRequirement({ day_pattern: 'weekdays', min_count: 1, period: { start: '2099-03-06', end: '2099-03-09' } })
      const off = await addRequirement({ day_pattern: 'weekends_holidays', min_count: 1, shift_definition_id: shiftB, period: { start: '2099-03-06', end: '2099-03-10' } })
      await asHead(() =>
        calendars.create({
          tenant_id: tenantId,
          code: 'id-national',
          year: 2099,
          country: 'ID',
          subdivision: null,
          holidays: [{ date: '2099-03-10', name: [{ locale: 'id-ID', text: 'Libur' }], kind: 'public', source: 'manual', status: 'active', import_id: null }, { date: '2099-03-06', name: [{ locale: 'id-ID', text: 'Dihapus' }], kind: 'public', source: 'manual', status: 'removed', import_id: null }],
          last_import_id: null,
        }),
      )

      const report = await service.report(tenantId, roster)

      // Friday 03-06 and Monday 03-09 for the weekday requirement; weekend 03-07, 03-08 and holiday 03-10 for the other.
      expect(report.coverageGaps.filter((gap) => gap.requirementId === weekdays.id).map((gap) => gap.date)).toEqual(['2099-03-06', '2099-03-09'])
      expect(report.coverageGaps.filter((gap) => gap.requirementId === off.id).map((gap) => gap.date)).toEqual(['2099-03-07', '2099-03-08', '2099-03-10'])
    })

    it('marks a gap that an override accepted, and counts it separately', async () => {
      const requirement = await addRequirement()
      await asHead(() => rosters.update(roster.id, { coverage_overrides: [{ date: '2099-03-02', shift_definition_id: shiftA, requirement_id: requirement.id, reason: 'Cuti', by: { account_id: 'a', display_name: 'A', kind: 'account' }, at: new Date() }] }))

      const report = await service.report(tenantId, (await rosters.findOne(roster.id)) as Roster)

      expect(report.coverageGaps).toEqual([expect.objectContaining({ date: '2099-03-02', overridden: true })])
      expect(report.summary).toEqual({ violations: 0, coverageGaps: 0, overridden: 1 })
    })

    it('does not check coverage of a closed unit or against a retired requirement', async () => {
      await addRequirement({ status: 'retired' })
      expect((await service.report(tenantId, roster)).coverageGaps).toEqual([])
      await addRequirement()
      await asHead(() => units.update(unitId, { status: 'closed' }))
      expect((await service.report(tenantId, roster)).coverageGaps).toEqual([])
    })
  })

  describe('report with assignments that are not stored yet', () => {
    it('counts them for coverage and for the rules of their employee, without storing anything', async () => {
      await addRequirement()
      await assign(nurse, '2099-03-02')
      const other = await addEmployee()
      const stored = await assign(other, '2099-03-03')
      const planned = { ...stored, id: 'import-0', employee_id: other.id, date: '2099-03-02' } as RosterAssignment

      const withExtra = await service.report(tenantId, roster, [planned])
      const without = await service.report(tenantId, roster)

      expect(without.coverageGaps).toHaveLength(1)
      expect(withExtra.coverageGaps).toEqual([])
      expect(await assignments.findByRoster(tenantId, roster.id)).toHaveLength(2)

      const clash = { ...planned, id: 'import-1', date: '2099-03-03', starts_at: stored.starts_at, ends_at: stored.ends_at } as RosterAssignment
      const overlapping = await service.report(tenantId, roster, [clash])
      expect(overlapping.violations.map((item) => item.code)).toContain('overlap')
    })
  })

  describe('validate', () => {
    it('stores the summary on the roster, answers the report, and logs one entry with counts only', async () => {
      await addRequirement()
      const gone = await addEmployee({ employment_status: 'suspended' })
      await assign(gone, '2099-03-02')

      const answer = await asHead(() => service.validate(tenantId, roster.id))

      expect(answer.summary).toEqual({ violations: 1, coverageGaps: 1, overridden: 0 })
      expect(answer.violations[0]).toMatchObject({ code: 'employee_not_assignable' })
      expect(answer.checkedAt).toBeInstanceOf(Date)
      const stored = await rosters.findOne(roster.id)
      expect(stored?.validation).toEqual({ checked_at: answer.checkedAt, violations: 1, coverage_gaps: 1 })
      expect(stored?.status).toBe('draft')
      expect(log).toHaveBeenCalledTimes(1)
      expect(log.mock.calls[0]?.[0]).toMatchObject({ event: 'roster_validate', outcome: 'success', violations: 1, coverageGaps: 1, overridden: 0 })
      expect(JSON.stringify([log.mock.calls, warn.mock.calls])).not.toContain(gone.id)
    })

    it('answers not found for a missing, malformed or foreign roster, and a stale version when the roster changed meanwhile', async () => {
      const foreign = await asHead(() => rosters.create(Object.assign({}, roster, { tenant_id: otherTenantId, unit_id: new Types.ObjectId().toHexString() }) as never))
      for (const id of [foreign.id, new Types.ObjectId().toHexString(), 'bad']) {
        expect(await rejection(() => asHead(() => service.validate(tenantId, id)))).toMatchObject({ code: 'roster_not_found' })
      }
      const spy = vi.spyOn(rosters, 'update').mockRejectedValueOnce(new RepositoryConflictError('race', { operation: 'x' }))
      expect(await rejection(() => asHead(() => service.validate(tenantId, roster.id)))).toMatchObject({ code: 'stale_version' })
      spy.mockRestore()
    })
  })

  describe('addOverride', () => {
    let requirementId: string
    const gap = () => ({ date: '2099-03-02', shiftId: shiftA, requirementId, reason: 'Kekurangan perawat' })

    beforeEach(async () => {
      requirementId = (await addRequirement()).id
    })

    it('accepts an existing gap with a reason, stamps who and when, and logs one entry without values', async () => {
      const updated = await asHead(() => service.addOverride(tenantId, roster.id, gap()))

      expect(updated.coverage_overrides).toEqual([expect.objectContaining({ date: '2099-03-02', shift_definition_id: shiftA, requirement_id: requirementId, reason: 'Kekurangan perawat', by: { account_id: 'head', display_name: 'Head', kind: 'account' } })])
      expect((await service.report(tenantId, updated)).summary.overridden).toBe(1)
      expect(log.mock.calls.at(-1)?.[0]).toMatchObject({ event: 'coverage_override', outcome: 'success' })
      expect(JSON.stringify([log.mock.calls, warn.mock.calls])).not.toContain('Kekurangan perawat')
    })

    it('refuses a gap that does not exist, one that was accepted already, and a missing or long reason', async () => {
      expect(await rejection(() => asHead(() => service.addOverride(tenantId, roster.id, { ...gap(), date: '2099-03-03' })))).toMatchObject({ code: 'no_such_gap' })
      expect(await rejection(() => asHead(() => service.addOverride(tenantId, roster.id, { ...gap(), requirementId: new Types.ObjectId().toHexString() })))).toMatchObject({ code: 'no_such_gap' })
      expect(await rejection(() => asHead(() => service.addOverride(tenantId, roster.id, { ...gap(), reason: '  ' })))).toMatchObject({ code: 'reason_required' })
      expect(await rejection(() => asHead(() => service.addOverride(tenantId, roster.id, { ...gap(), reason: 'x'.repeat(501) })))).toMatchObject({ code: 'invalid_reason' })
      await asHead(() => service.addOverride(tenantId, roster.id, gap()))
      expect(await rejection(() => asHead(() => service.addOverride(tenantId, roster.id, gap())))).toMatchObject({ kind: 'conflict', code: 'override_exists' })
      expect((await rosters.findOne(roster.id))?.coverage_overrides).toHaveLength(1)
    })

    it('works while the roster is a draft, submitted or approved, and not after', async () => {
      await asHead(() => requirements.update(requirementId, { period: { start: '2099-03-02', end: '2099-05-31' } }))
      for (const status of ['submitted', 'approved'] as const) {
        const other = await addRoster({ unit_id: unitId, period: status === 'submitted' ? { start: '2099-04-01', end: '2099-04-30' } : { start: '2099-05-01', end: '2099-05-31' }, status })
        const date = status === 'submitted' ? '2099-04-01' : '2099-05-01'
        expect((await asHead(() => service.addOverride(tenantId, other.id, { ...gap(), date }))).coverage_overrides).toHaveLength(1)
      }
      for (const status of ['published', 'closed'] as const) {
        const done = await addRoster({ unit_id: (await addUnit()).id, status })
        expect(await rejection(() => asHead(() => service.addOverride(tenantId, done.id, gap())))).toMatchObject({ code: 'override_not_allowed' })
      }
    })

    it('answers not found for a foreign roster, a stale version, and needs an acting account', async () => {
      const foreign = await asHead(() => rosters.create(Object.assign({}, roster, { tenant_id: otherTenantId, unit_id: new Types.ObjectId().toHexString() }) as never))
      expect(await rejection(() => asHead(() => service.addOverride(tenantId, foreign.id, gap())))).toMatchObject({ code: 'roster_not_found' })
      expect(await rejection(() => asHead(() => service.addOverride(tenantId, roster.id, { ...gap(), version: roster.version + 5 })))).toMatchObject({ code: 'stale_version' })
      expect(await rejection(() => service.addOverride(tenantId, roster.id, gap()))).toMatchObject({ code: 'actor_required' })
    })
  })

  describe('gate', () => {
    it('passes a roster with no violation and no open gap, and answers the summary to store', async () => {
      await assign(nurse, '2099-03-02')

      const summary = await service.gate(tenantId, roster)

      expect(summary).toEqual({ checked_at: expect.any(Date), violations: 0, coverage_gaps: 0 })
    })

    it('refuses a roster with a violation, and one with a coverage gap, but passes the gap once it is accepted', async () => {
      const requirement = await addRequirement()
      expect(await rejection(() => service.gate(tenantId, roster))).toMatchObject({ kind: 'invalid', code: 'coverage_gaps' })
      await asHead(() => service.addOverride(tenantId, roster.id, { date: '2099-03-02', shiftId: shiftA, requirementId: requirement.id, reason: 'Diterima' }))
      const accepted = (await rosters.findOne(roster.id)) as Roster
      expect(await service.gate(tenantId, accepted)).toMatchObject({ violations: 0, coverage_gaps: 0 })

      await assign(await addEmployee({ employment_status: 'suspended' }), '2099-03-04')
      expect(await rejection(() => service.gate(tenantId, accepted))).toMatchObject({ code: 'roster_invalid' })
    })

    it('puts a violation before a coverage gap when both exist', async () => {
      await addRequirement()
      await assign(await addEmployee({ employment_status: 'suspended' }), '2099-03-04')
      expect(await rejection(() => service.gate(tenantId, roster))).toMatchObject({ code: 'roster_invalid' })
    })
  })
})
