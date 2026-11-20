import { Types } from 'mongoose'
import { runWithRequestContext } from '@utility/logger/context'
import { type AppLogger } from '@utility/logger/service'
import { type Employee } from '@repository/model/employee'
import { type Roster } from '@repository/model/roster'
import { type ShiftDefinition } from '@repository/model/shift-definition'
import { type EligibilityService } from '../eligibility/eligibility.service'
import { type ParameterService } from '../parameter/parameter.service'
import {
  InMemoryEmployees,
  InMemoryFacilities,
  InMemoryHrImports,
  InMemoryOrganizationUnits,
  InMemoryRosterAssignments,
  InMemoryRosters,
  InMemoryShiftDefinitions,
  InMemoryLeaveRequests,
} from '../testing/in-memory'
import { LeaveCalendar } from '../leave/leave-calendar'
import { RosterImportService } from './roster-import.service'

describe('RosterImportService', () => {
  const tenantId = new Types.ObjectId().toHexString()
  const otherTenantId = new Types.ObjectId().toHexString()
  const organizationId = new Types.ObjectId().toHexString()
  const log = vi.fn()
  const warn = vi.fn()
  const error = vi.fn()
  const debug = vi.fn()
  const report = vi.fn()
  let assignments: InMemoryRosterAssignments
  let rosters: InMemoryRosters
  let units: InMemoryOrganizationUnits
  let facilities: InMemoryFacilities
  let shifts: InMemoryShiftDefinitions
  let employees: InMemoryEmployees
  let imports: InMemoryHrImports
  let service: RosterImportService
  let leaveRequests: InMemoryLeaveRequests
  let limits: Record<string, number>
  let eligible: { value: { eligible: true } | { eligible: false; failed: string } }
  let facilityId: string
  let unitId: string
  let roster: Roster
  let morning: ShiftDefinition
  let night: ShiftDefinition
  let nurse: Employee

  // 2099-03-02 is a Monday.
  const march = { start: '2099-03-01', end: '2099-03-31' }
  const header = 'employee_number,date,shift_code,role,overtime_consent'

  /**
   * Runs `work` as a signed-in request.
   *
   * @param work - Code to run.
   * @returns What `work` returns.
   */
  function asHead<T>(work: () => Promise<T>): Promise<T> {
    return runWithRequestContext({ correlationId: 'c1', actor: { account_id: 'head', display_name: 'Head', kind: 'account' } }, work)
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
   * Checks a file as the Head of Unit.
   *
   * @param rows - The data rows, one string each.
   * @param on - The roster; the main roster by default.
   * @returns The answer.
   */
  function check(rows: string[], on: Roster = roster) {
    return asHead(() => service.importFile(tenantId, on.id, { content: `${header}\n${rows.join('\n')}\n` }))
  }

  /**
   * Adds an employee.
   *
   * @param number - Employee number.
   * @param override - Fields that replace the defaults.
   * @returns The employee.
   */
  function addEmployee(number: string, override: Partial<Employee> = {}) {
    return asHead(() =>
      employees.create({
        tenant_id: tenantId,
        employee_number: number,
        name: { use: 'official', text: 'Siti', given: [], prefix: [], suffix: [] },
        other_names: [],
        display_name: 'Siti',
        administrative_gender: null,
        workforce_category: { system: 'id.workforce-category', code: 'tenaga_keperawatan' },
        is_clinical: false,
        profession: null,
        specialties: [],
        clinical_level: null,
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
   * Adds a shift of the facility.
   *
   * @param code - Shift code.
   * @param override - Fields that replace the defaults of a regular 07:00 to 15:00 shift.
   * @returns The shift.
   */
  function addShift(code: string, override: Partial<ShiftDefinition> = {}) {
    return asHead(() =>
      shifts.create({
        tenant_id: tenantId,
        facility_id: facilityId,
        code,
        name: [{ locale: 'en', text: code }],
        type: 'regular',
        start_time: '07:00',
        end_time: '15:00',
        paid_minutes: 480,
        is_night: false,
        unit_ids: [],
        status: 'active',
        ...override,
      }),
    )
  }

  /**
   * Adds a unit of the facility.
   *
   * @param override - Status and clinical flag.
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

  /**
   * Stores a roster of a unit.
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
   * Stores a planned assignment directly.
   *
   * @param employee - The employee.
   * @param date - The day.
   * @param on - The roster.
   * @param hours - Start and end hour (UTC).
   * @returns The assignment.
   */
  function existing(employee: Employee, date: string, on: Roster, hours: [number, number] = [0, 8]) {
    const day = Date.parse(`${date}T00:00:00Z`)
    return asHead(() =>
      assignments.create({
        tenant_id: tenantId,
        roster_id: on.id,
        unit_id: on.unit_id,
        facility_id: facilityId,
        employee_id: employee.id,
        date,
        shift: { definition_id: morning.id, code: 'P', type: 'regular', start_time: '07:00', end_time: '15:00', paid_minutes: (hours[1] - hours[0]) * 60, is_night: false },
        starts_at: new Date(day + hours[0] * 3_600_000),
        ends_at: new Date(day + hours[1] * 3_600_000),
        role: 'staff',
        status: 'planned',
        source: { kind: 'roster', ref_id: null },
        cancellation: null,
        change_reason: null,
        revision: 0,
        overtime: null,
        flag: null,
        is_flagged: false,
      }),
    )
  }

  /**
   * Stores a leave request of an employee on one date.
   *
   * @param employeeId - The employee.
   * @param date - The date.
   * @param status - Request status.
   * @param count - What the day counts.
   * @returns The request.
   */
  function onLeave(employeeId: string, date: string, status: 'approved' | 'requested' = 'approved', count: 0.5 | 1 = 1) {
    return asHead(() =>
      leaveRequests.create({ tenant_id: tenantId, employee_id: employeeId, status, period: { start: date, end: date }, days: [{ date, count, why: 'working', set_by: 'working_week' }] } as never),
    )
  }

  beforeEach(async () => {
    vi.resetAllMocks()
    limits = { MIN_REST_HOURS: 8, MAX_WEEKLY_HOURS: 40, MAX_OVERTIME_HOURS_WEEK: 18, MAX_CONSECUTIVE_NIGHTS: 3, IMPORT_MAX_ROWS: 5000, IMPORT_MAX_ERRORS: 500 }
    eligible = { value: { eligible: true } }
    report.mockResolvedValue({ violations: [], coverageGaps: [], summary: { violations: 0, coverageGaps: 0, overridden: 0 } })
    assignments = new InMemoryRosterAssignments()
    rosters = new InMemoryRosters()
    units = new InMemoryOrganizationUnits()
    facilities = new InMemoryFacilities()
    shifts = new InMemoryShiftDefinitions()
    employees = new InMemoryEmployees()
    imports = new InMemoryHrImports()
    const parameters = { resolve: async (_tenant: string, { key }: { key: string }) => ({ value: limits[key] }) } as unknown as ParameterService
    const eligibility = { general: async () => eligible.value } as unknown as EligibilityService
    const logger = { log, warn, error, debug } as unknown as AppLogger
    leaveRequests = new InMemoryLeaveRequests()
    service = new RosterImportService(rosters, assignments, units, facilities, shifts, employees, imports, eligibility, parameters, { report } as never, { run: (work: () => Promise<unknown>) => work() } as never, new LeaveCalendar(leaveRequests), logger)
    facilityId = (
      await asHead(() =>
        facilities.create({ tenant_id: tenantId, organization_id: organizationId, code: 'rs-sehat', name: [{ locale: 'en', text: 'RS' }], address: null, timezone: 'Asia/Jakarta', holiday_calendar_codes: [], external_ids: [], status: 'active' }),
      )
    ).id
    unitId = (await addUnit()).id
    roster = await addRoster()
    morning = await addShift('P')
    night = await addShift('M', { start_time: '21:00', end_time: '07:00', paid_minutes: 540, is_night: true })
    nurse = await addEmployee('E001')
  })

  describe('a valid file', () => {
    it('records a validated import with counts and the file hash, leaves the roster alone, and logs one entry without values', async () => {
      const second = await addEmployee('E002')
      const answer = await check(['E001,2099-03-02,P,,', 'E002,2099-03-02,M,team_leader,', 'E001,2099-03-03,p,staff,'])

      expect(answer.import).toMatchObject({
        tenant_id: tenantId,
        kind: 'roster_assignments',
        target: { roster_id: roster.id },
        file: { content_type: 'text/csv' },
        status: 'validated',
        counts: { rows: 3, valid: 3, invalid: 0, created: 3, updated: 0, skipped: 0 },
        errors: [],
        applied: null,
        failure: null,
        uploaded: { by: { account_id: 'head' } },
      })
      expect(answer.import.file.sha256).toMatch(/^[0-9a-f]{64}$/)
      expect(answer.import.file.file_id).toBe(`inline:${answer.import.file.sha256.slice(0, 16)}`)
      expect(answer).toMatchObject({ coverageGaps: 0, restDayGaps: 0 })
      expect(await assignments.findByRoster(tenantId, roster.id)).toEqual([])
      expect(second.id).toBeTruthy()
      expect(log).toHaveBeenCalledTimes(1)
      expect(log.mock.calls[0]?.[0]).toMatchObject({ event: 'roster_import_check', outcome: 'success', status: 'validated', rows: 3, invalid: 0, created: 3 })
      const written = JSON.stringify([log.mock.calls, warn.mock.calls, error.mock.calls])
      for (const text of ['E001', 'E002', '2099-03-02', 'team_leader']) {
        expect(written).not.toContain(text)
      }
    })

    it('previews the coverage and the rest days with the rows as assignments that are not stored', async () => {
      report.mockResolvedValueOnce({ violations: [{ code: 'no_rest_day' }, { code: 'overlap' }, { code: 'no_rest_day' }], coverageGaps: [], summary: { violations: 3, coverageGaps: 4, overridden: 1 } })

      const answer = await check(['E001,2099-03-02,P,,'])

      expect(answer).toMatchObject({ coverageGaps: 4, restDayGaps: 2 })
      const extra = report.mock.calls[0]?.[2] as { employee_id: string; date: string; shift: { code: string }; role: string; status: string; source: { kind: string } }[]
      expect(extra).toEqual([expect.objectContaining({ employee_id: nurse.id, date: '2099-03-02', shift: expect.objectContaining({ code: 'P' }), role: 'staff', status: 'planned', source: { kind: 'import', ref_id: null } })])
      expect(await assignments.findByRoster(tenantId, roster.id)).toEqual([])
    })

    it('finds the employee by number only in the tenant, and the shift only in the roster\'s facility', async () => {
      await asHead(() => employees.create(Object.assign({}, nurse, { tenant_id: otherTenantId, employee_number: 'F001' }) as never))
      const answer = await check(['F001,2099-03-02,P,,'])
      expect(answer.import.errors).toEqual([{ row: 2, column: 'employee_number', code: 'employee_not_found' }])
    })
  })

  describe('row errors', () => {
    it('records an invalid import with every problem as a row, a column and a code, and previews nothing', async () => {
      const suspended = await addEmployee('E003', { employment_status: 'suspended' })
      const retired = await addShift('R', { status: 'retired' })
      const elsewhere = await addShift('X', { facility_id: new Types.ObjectId().toHexString() })
      const restricted = await addShift('Z', { unit_ids: [new Types.ObjectId().toHexString()] })
      expect([suspended.id, retired.id, elsewhere.id, restricted.id]).toHaveLength(4)

      const answer = await check([
        'E999,2099-03-02,P,,',
        'E003,2099-03-02,P,,',
        'E001,2099-03-02,NOPE,,',
        'E001,2099-03-03,R,,',
        'E001,2099-03-04,X,,',
        'E001,2099-03-05,Z,,',
        'E001,2099-04-02,P,,',
        'E001,2099-03-06,P,,',
      ])

      expect(answer.import.status).toBe('invalid')
      expect(answer.import.errors).toEqual([
        { row: 2, column: 'employee_number', code: 'employee_not_found' },
        { row: 3, column: 'employee_number', code: 'employee_not_assignable' },
        { row: 4, column: 'shift_code', code: 'shift_not_found' },
        { row: 5, column: 'shift_code', code: 'shift_retired' },
        { row: 6, column: 'shift_code', code: 'shift_not_found' },
        { row: 7, column: 'shift_code', code: 'shift_unit_not_allowed' },
        { row: 8, column: 'date', code: 'date_outside_period' },
      ])
      expect(answer.import.counts).toEqual({ rows: 8, valid: 1, invalid: 7, created: 0, updated: 0, skipped: 0 })
      expect(answer).toMatchObject({ coverageGaps: null, restDayGaps: null })
      expect(report).not.toHaveBeenCalled()
      expect(await assignments.findByRoster(tenantId, roster.id)).toEqual([])
      expect(JSON.stringify([answer.import.errors, log.mock.calls])).not.toContain('E999')
    })

    it('refuses a date in the past in the facility zone', async () => {
      const past = await addRoster({ unit_id: (await addUnit()).id, period: { start: '2020-01-01', end: '2020-01-31' } })
      const answer = await check(['E001,2020-01-10,P,,'], past)
      expect(answer.import.errors).toEqual([{ row: 2, column: 'date', code: 'assignment_in_past' }])
    })

    it('combines cell problems of the file and problems of the records, sorted by row', async () => {
      const answer = await check(['E001,2099-02-30,P,,', 'E999,2099-03-02,P,,', 'E001,2099-03-02,P,boss,', 'E001,2099-03-02,P,,'])
      expect(answer.import.errors.map((item) => [item.row, item.code])).toEqual([[2, 'invalid_date'], [3, 'employee_not_found'], [4, 'invalid_role']])
      expect(answer.import.counts).toMatchObject({ rows: 4, valid: 1, invalid: 3 })
    })

    it('keeps at most IMPORT_MAX_ERRORS errors and counts every invalid row', async () => {
      limits.IMPORT_MAX_ERRORS = 2
      const answer = await check(['E901,2099-03-02,P,,', 'E902,2099-03-02,P,,', 'E903,2099-03-02,P,,', 'E904,2099-03-02,P,,'])
      expect(answer.import.errors).toHaveLength(2)
      expect(answer.import.counts.invalid).toBe(4)
    })

    it('flags a clinical employee in a clinical unit who is not eligible, naming the condition', async () => {
      const clinicalUnit = await addUnit({ is_clinical: true })
      const clinicalRoster = await addRoster({ unit_id: clinicalUnit.id, period: { start: '2099-04-01', end: '2099-04-30' } })
      await addEmployee('C001', { is_clinical: true })
      eligible.value = { eligible: false, failed: 'sip' }

      const answer = await check(['C001,2099-04-06,P,,', 'E001,2099-04-06,P,,'], clinicalRoster)

      expect(answer.import.errors).toEqual([{ row: 2, column: 'employee_number', code: 'not_eligible_sip' }])
    })

    it('flags a row for a day on which the employee is on approved leave, and accepts a half day', async () => {
      await onLeave(nurse.id, '2099-03-02')
      await onLeave(nurse.id, '2099-03-03', 'approved', 0.5)

      const answer = await check(['E001,2099-03-02,P,,', 'E001,2099-03-03,P,,'])

      expect(answer.import.errors).toEqual([{ row: 2, column: 'date', code: 'on_leave' }])
    })

    it('refuses a row for a day the employee already has a planned assignment in this roster', async () => {
      await existing(nurse, '2099-03-02', roster)
      const answer = await check(['E001,2099-03-02,P,,'])
      expect(answer.import.errors).toEqual([{ row: 2, column: 'date', code: 'assignment_exists' }])
    })
  })

  describe('working time across the file, the roster and other rosters', () => {
    it('refuses an overlap with the assignment of another roster, and a rest that is too short', async () => {
      const elsewhere = await addRoster({ unit_id: (await addUnit()).id })
      await existing(nurse, '2099-03-02', elsewhere, [0, 8])

      const overlap = await check(['E001,2099-03-02,P,,'])
      expect(overlap.import.errors).toEqual([{ row: 2, column: null, code: 'overlap' }])
      const rest = await check(['E001,2099-03-02,M,,'])
      expect(rest.import.errors).toEqual([{ row: 2, column: null, code: 'rest_too_short' }])
    })

    it('checks the rows against each other in order of date and start, reporting each clash once on the later row', async () => {
      const answer = await check(['E001,2099-03-03,P,,', 'E001,2099-03-02,M,,'])
      // The night on Monday ends at 07:00 on Tuesday, when the Tuesday morning starts: no rest.
      expect(answer.import.errors).toEqual([{ row: 2, column: null, code: 'rest_too_short' }])
    })

    it('counts weekly hours: overtime needs the consent column, and stays under the weekly limit', async () => {
      const long = await addShift('L', { start_time: '07:00', end_time: '17:00', paid_minutes: 600 })
      expect(long.id).toBeTruthy()
      const week = ['2099-03-02', '2099-03-03', '2099-03-04', '2099-03-05'].map((date) => `E001,${date},L,,`)

      const without = await check([...week, 'E001,2099-03-06,P,,'])
      expect(without.import.errors).toEqual([{ row: 6, column: null, code: 'overtime_consent_required' }])
      const withConsent = await check([...week, 'E001,2099-03-06,P,,yes'])
      expect(withConsent.import.status).toBe('validated')
      const over = await check([...week, 'E001,2099-03-06,L,,yes', 'E001,2099-03-07,L,,yes'])
      expect(over.import.errors).toEqual([{ row: 7, column: null, code: 'overtime_limit_exceeded' }])
    })

    it('limits the run of night shifts', async () => {
      const answer = await check(['E001,2099-03-02,M,,', 'E001,2099-03-03,M,,', 'E001,2099-03-04,M,,', 'E001,2099-03-05,M,,'])
      expect(answer.import.errors).toEqual([{ row: 5, column: null, code: 'too_many_nights' }])
      expect(night.id).toBeTruthy()
    })

    it('reads the limits at the unit, and stops each row at its first problem', async () => {
      limits.MIN_REST_HOURS = 0
      expect((await check(['E001,2099-03-02,M,,', 'E001,2099-03-03,P,,'])).import.status).toBe('validated')
      const answer = await check(['E001,2099-02-30,P,,', 'E001,2099-03-02,P,boss,yes'])
      expect(answer.import.errors).toEqual([{ row: 2, column: 'date', code: 'invalid_date' }, { row: 3, column: 'role', code: 'invalid_role' }])
    })
  })

  describe('a file that cannot be read, a roster that cannot take it', () => {
    it.each([
      ['csv_required', { not: 'text' }],
      ['csv_required', undefined],
      ['empty_file', ''],
      ['invalid_encoding', `${header}\nE001,2099-03-02,Ta�hun,,\n`],
      ['invalid_csv', `${header}\nE001,2099-03-02\n`],
      ['invalid_header', 'employee_number,date\nE001,2099-03-02\n'],
      ['invalid_header', `${header},note\nE001,2099-03-02,P,,,x\n`],
      ['no_rows', `${header}\n`],
    ])('refuses an unreadable file with %s and records nothing', async (code, content) => {
      expect(await rejection(() => asHead(() => service.importFile(tenantId, roster.id, { content })))).toMatchObject({ code })
      expect(await imports.findByFilter(tenantId)).toEqual([])
      expect(warn.mock.calls[0]?.[0]).toMatchObject({ event: 'roster_import_check', outcome: 'failure', code })
    })

    it('refuses a file with more rows than IMPORT_MAX_ROWS', async () => {
      limits.IMPORT_MAX_ROWS = 2
      expect(await rejection(() => check(['E001,2099-03-02,P,,', 'E001,2099-03-03,P,,', 'E001,2099-03-04,P,,']))).toMatchObject({ code: 'too_many_rows' })
      expect(await imports.findByFilter(tenantId)).toEqual([])
    })

    it('imports only into a draft roster, and not into a closed unit', async () => {
      for (const status of ['submitted', 'approved', 'published'] as const) {
        const locked = await addRoster({ status, unit_id: (await addUnit()).id })
        expect(await rejection(() => check(['E001,2099-03-02,P,,'], locked))).toMatchObject({ code: 'roster_locked' })
      }
      const closed = await addRoster({ status: 'closed', unit_id: (await addUnit()).id })
      expect(await rejection(() => check(['E001,2099-03-02,P,,'], closed))).toMatchObject({ code: 'roster_closed' })
      const closedUnit = await addRoster({ unit_id: (await addUnit({ status: 'closed' })).id })
      expect(await rejection(() => check(['E001,2099-03-02,P,,'], closedUnit))).toMatchObject({ code: 'unit_closed' })
      expect(await imports.findByFilter(tenantId)).toEqual([])
    })

    it('answers not found for a missing, malformed or foreign roster, needs an acting account, and refuses an apply without a valid check', async () => {
      const foreign = await asHead(() => rosters.create(Object.assign({}, roster, { tenant_id: otherTenantId, unit_id: new Types.ObjectId().toHexString() }) as never))
      for (const id of [foreign.id, new Types.ObjectId().toHexString(), 'bad']) {
        expect(await rejection(() => asHead(() => service.importFile(tenantId, id, { content: `${header}\nE001,2099-03-02,P,,\n` })))).toMatchObject({ code: 'roster_not_found' })
      }
      expect(await rejection(() => service.importFile(tenantId, roster.id, { content: `${header}\nE001,2099-03-02,P,,\n` }))).toMatchObject({ code: 'actor_required' })
      expect(await rejection(() => asHead(() => service.importFile(tenantId, roster.id, { content: `${header}\nE001,2099-03-02,P,,\n`, apply: true, checkId: 'x' })))).toMatchObject({ code: 'check_not_valid' })
      expect(await imports.findByFilter(tenantId)).toEqual([])
    })
  })

  describe('applying a checked file', () => {
    const rows = ['E001,2099-03-02,P,,', 'E001,2099-03-03,M,team_leader,']
    const content = `${header}\n${rows.join('\n')}\n`

    /**
     * Applies a file as the Head of Unit.
     *
     * @param checkId - The check to apply.
     * @param text - The file; the file of the suite by default.
     * @param extra - More input, such as a version or a reason.
     * @param on - The roster; the main roster by default.
     * @returns The answer.
     */
    function apply(checkId: string | undefined, text = content, extra: { version?: number; reason?: string } = {}, on: Roster = roster) {
      return asHead(() => service.importFile(tenantId, on.id, { content: text, apply: true, checkId, ...extra }))
    }

    it('writes every assignment with the source import, marks the import applied, and logs counts only', async () => {
      const checked = await check(rows)
      log.mockClear()

      const answer = await apply(checked.import.id)

      expect(answer.import).toMatchObject({ id: checked.import.id, status: 'applied', counts: { rows: 2, valid: 2, invalid: 0, created: 2 }, applied: { by: { account_id: 'head' } } })
      const stored = await assignments.findByRoster(tenantId, roster.id)
      expect(stored).toHaveLength(2)
      expect(stored[0]).toMatchObject({ employee_id: nurse.id, date: '2099-03-02', status: 'planned', role: 'staff', source: { kind: 'import', ref_id: checked.import.id }, revision: 0, shift: expect.objectContaining({ code: 'P' }), overtime: null })
      expect(stored[0]?.starts_at).toEqual(new Date('2099-03-02T00:00:00Z'))
      expect(stored[1]).toMatchObject({ role: 'team_leader', shift: expect.objectContaining({ code: 'M' }) })
      expect(log).toHaveBeenCalledTimes(1)
      expect(log.mock.calls[0]?.[0]).toMatchObject({ event: 'roster_import_apply', outcome: 'success', status: 'applied', rows: 2, invalid: 0, created: 2 })
      const written = JSON.stringify([log.mock.calls, warn.mock.calls, error.mock.calls])
      for (const text of ['E001', '2099-03-02', 'team_leader']) {
        expect(written).not.toContain(text)
      }
    })

    it('stores the overtime and the consent a row gave', async () => {
      const long = await addShift('L', { start_time: '07:00', end_time: '23:00', paid_minutes: 960 })
      const text = `${header}\nE001,2099-03-02,L,,yes\n`
      const checked = await asHead(() => service.importFile(tenantId, roster.id, { content: text }))
      expect(checked.import.status).toBe('validated')

      await apply(checked.import.id, text)

      const [stored] = await assignments.findByRoster(tenantId, roster.id)
      expect(stored?.shift.definition_id).toBe(long.id)
      expect(stored?.overtime).toMatchObject({ consent: { document: null } })
    })

    it('needs a check, for this roster, validated, of this same file', async () => {
      const checked = await check(rows)
      expect(await rejection(() => apply(undefined))).toMatchObject({ code: 'check_required' })
      expect(await rejection(() => apply('bad'))).toMatchObject({ code: 'check_not_valid' })
      expect(await rejection(() => apply(new Types.ObjectId().toHexString()))).toMatchObject({ code: 'check_not_valid' })
      const other = await addRoster({ unit_id: (await addUnit()).id })
      expect(await rejection(() => apply(checked.import.id, content, {}, other))).toMatchObject({ code: 'check_not_valid' })
      const invalid = await check(['NOPE,2099-03-02,P,,'])
      expect(invalid.import.status).toBe('invalid')
      expect(await rejection(() => apply(invalid.import.id))).toMatchObject({ code: 'check_not_valid' })
      expect(await rejection(() => apply(checked.import.id, `${content}E001,2099-03-05,P,,\n`))).toMatchObject({ code: 'check_mismatch' })
      expect(await assignments.findByRoster(tenantId, roster.id)).toEqual([])
    })

    it('does not apply a check of another tenant or a cancelled check', async () => {
      const checked = await check(rows)
      await asHead(() => imports.update(checked.import.id, { status: 'cancelled' }))
      expect(await rejection(() => apply(checked.import.id))).toMatchObject({ code: 'check_not_valid' })
      const foreign = await asHead(() => imports.create(Object.assign({}, checked.import, { tenant_id: otherTenantId, status: 'validated' }) as never))
      expect(await rejection(() => apply(foreign.id))).toMatchObject({ code: 'check_not_valid' })
      expect(await assignments.findByRoster(tenantId, roster.id)).toEqual([])
    })

    it('refuses the same file twice', async () => {
      const first = await check(rows)
      await apply(first.import.id)
      const again = await check(rows)
      expect(again.import.status).toBe('invalid')
      const manual = await asHead(() => imports.create(Object.assign({}, first.import, { status: 'validated' }) as never))
      expect(await rejection(() => apply(manual.id))).toMatchObject({ code: 'import_already_applied' })
      expect(await assignments.findByRoster(tenantId, roster.id)).toHaveLength(2)
    })

    it('writes nothing and records the new errors when the file stopped being valid', async () => {
      const checked = await check(rows)
      await asHead(() => assignments.create({ tenant_id: tenantId, roster_id: roster.id, unit_id: unitId, facility_id: facilityId, employee_id: nurse.id, date: '2099-03-02', shift: { definition_id: morning.id, code: 'P', type: 'regular', start_time: '07:00', end_time: '15:00', paid_minutes: 480, is_night: false }, starts_at: new Date('2099-03-02T00:00:00Z'), ends_at: new Date('2099-03-02T08:00:00Z'), role: 'staff', status: 'planned', source: { kind: 'roster', ref_id: null }, cancellation: null, change_reason: null, revision: 0, overtime: null, flag: null, is_flagged: false }))

      const failure = await rejection(() => apply(checked.import.id))

      expect(failure).toMatchObject({ code: 'import_not_valid_anymore' })
      expect(await assignments.findByRoster(tenantId, roster.id)).toHaveLength(1)
      expect(await imports.findOne(checked.import.id)).toMatchObject({ status: 'invalid', applied: null, counts: { rows: 2, invalid: 1, created: 0 }, errors: [{ row: 2, column: 'date', code: 'assignment_exists' }] })
      expect(warn.mock.calls.at(-1)?.[0]).toMatchObject({ event: 'roster_import_apply', outcome: 'failure', code: 'import_not_valid_anymore' })
    })

    it('answers a stale roster version and a roster that is no longer a draft', async () => {
      const checked = await check(rows)
      expect(await rejection(() => apply(checked.import.id, content, { version: roster.version + 5 }))).toMatchObject({ code: 'stale_version' })
      await asHead(() => rosters.update(roster.id, { status: 'submitted' }))
      expect(await rejection(() => apply(checked.import.id))).toMatchObject({ code: 'roster_locked' })
      expect(await assignments.findByRoster(tenantId, roster.id)).toEqual([])
    })

    it('needs an acting account', async () => {
      const checked = await check(rows)
      expect(await rejection(() => service.importFile(tenantId, roster.id, { content, apply: true, checkId: checked.import.id }))).toMatchObject({ code: 'actor_required' })
      expect(await assignments.findByRoster(tenantId, roster.id)).toEqual([])
    })
  })
})
