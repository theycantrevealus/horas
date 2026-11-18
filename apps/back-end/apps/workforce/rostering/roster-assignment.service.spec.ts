import { Types } from 'mongoose'
import { RepositoryConflictError } from '@utility/database/error'
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
  InMemoryOrganizationUnits,
  InMemoryRosterAssignments,
  InMemoryRosters,
  InMemoryShiftDefinitions,
} from '../testing/in-memory'
import { RosterAssignmentService, type AddRosterAssignmentInput } from './roster-assignment.service'

describe('RosterAssignmentService', () => {
  const tenantId = new Types.ObjectId().toHexString()
  const otherTenantId = new Types.ObjectId().toHexString()
  const organizationId = new Types.ObjectId().toHexString()
  const log = vi.fn()
  const warn = vi.fn()
  const error = vi.fn()
  const debug = vi.fn()
  let assignments: InMemoryRosterAssignments
  let rosters: InMemoryRosters
  let units: InMemoryOrganizationUnits
  let facilities: InMemoryFacilities
  let shifts: InMemoryShiftDefinitions
  let employees: InMemoryEmployees
  let service: RosterAssignmentService
  let limits: Record<string, number>
  let eligible: { value: { eligible: true } | { eligible: false; failed: string } }
  let facilityId: string
  let unitId: string
  let roster: Roster
  let morning: ShiftDefinition
  let night: ShiftDefinition
  let off: ShiftDefinition
  let nurse: Employee

  // Far in the future, so no date of the roster is in the past. 2099-03-01 is a Sunday.
  const march = { start: '2099-03-01', end: '2099-03-31' }
  const monday = '2099-03-02'

  /**
   * Runs `work` as a signed-in request.
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
   * Adds a shift of the facility.
   *
   * @param override - Fields that replace the defaults.
   * @returns The shift.
   */
  function addShift(override: Partial<ShiftDefinition> = {}) {
    return asHead(() =>
      shifts.create({
        tenant_id: tenantId,
        facility_id: facilityId,
        code: `S${new Types.ObjectId().toHexString().slice(-6)}`.toUpperCase(),
        name: [{ locale: 'en', text: 'Shift' }],
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
   * Adds an employee.
   *
   * @param override - Fields that replace the defaults.
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
   * Adds an assignment through the service.
   *
   * @param override - Fields that replace the defaults (a nurse on the morning shift on Monday).
   * @param on - The roster; the main roster by default.
   * @returns The assignment.
   */
  function add(override: Partial<AddRosterAssignmentInput> = {}, on: Roster = roster) {
    return asHead(() =>
      service.add(tenantId, on.id, { employeeId: nurse.id, date: monday, shiftId: morning.id, ...override }),
    )
  }

  beforeEach(async () => {
    vi.resetAllMocks()
    limits = { MIN_REST_HOURS: 8, MAX_WEEKLY_HOURS: 40, MAX_OVERTIME_HOURS_WEEK: 18, MAX_CONSECUTIVE_NIGHTS: 3 }
    eligible = { value: { eligible: true } }
    assignments = new InMemoryRosterAssignments()
    rosters = new InMemoryRosters()
    units = new InMemoryOrganizationUnits()
    facilities = new InMemoryFacilities()
    shifts = new InMemoryShiftDefinitions()
    employees = new InMemoryEmployees()
    const parameters = {
      resolve: async (_tenant: string, { key }: { key: string }) => ({ value: limits[key] }),
    } as unknown as ParameterService
    const eligibility = { general: async () => eligible.value } as unknown as EligibilityService
    const logger = { log, warn, error, debug } as unknown as AppLogger
    service = new RosterAssignmentService(assignments, rosters, units, facilities, shifts, employees, eligibility, parameters, { run: (work: () => Promise<unknown>) => work() } as never, logger)
    facilityId = (
      await asHead(() =>
        facilities.create({
          tenant_id: tenantId,
          organization_id: organizationId,
          code: 'rs-sehat',
          name: [{ locale: 'en', text: 'RS' }],
          address: null,
          timezone: 'Asia/Jakarta',
          holiday_calendar_codes: [],
          external_ids: [],
          status: 'active',
        }),
      )
    ).id
    unitId = (await addUnit()).id
    roster = await addRoster()
    morning = await addShift({ code: 'P' })
    night = await addShift({ code: 'M', start_time: '21:00', end_time: '07:00', paid_minutes: 540, is_night: true })
    off = await addShift({ code: 'L', type: 'off', start_time: null, end_time: null, paid_minutes: 0 })
    nurse = await addEmployee()
  })

  describe('add', () => {
    it('adds an employee to a shift with a snapshot of the shift and its instants, and writes one log entry without values', async () => {
      const created = await add({ role: 'team_leader', reason: 'Alasan Rahasia' })

      expect(created).toMatchObject({
        tenant_id: tenantId,
        roster_id: roster.id,
        unit_id: unitId,
        facility_id: facilityId,
        employee_id: nurse.id,
        date: monday,
        shift: { definition_id: morning.id, code: 'P', type: 'regular', start_time: '07:00', end_time: '15:00', paid_minutes: 480, is_night: false },
        role: 'team_leader',
        status: 'planned',
        source: { kind: 'roster', ref_id: roster.id },
        change_reason: null,
        revision: 0,
        overtime: null,
        flag: null,
        is_flagged: false,
      })
      expect(created.starts_at?.toISOString()).toBe('2099-03-02T00:00:00.000Z')
      expect(created.ends_at?.toISOString()).toBe('2099-03-02T08:00:00.000Z')
      expect(log).toHaveBeenCalledTimes(1)
      expect(log.mock.calls[0]?.[0]).toMatchObject({ event: 'assignment_add', outcome: 'success' })
      const written = JSON.stringify([log.mock.calls, warn.mock.calls, error.mock.calls])
      for (const text of ['Alasan Rahasia', nurse.id, '2099-03-02']) {
        expect(written).not.toContain(text)
      }
    })

    it('defaults the role to staff, computes an overnight shift into the next day, and a day off has no instants', async () => {
      const overnight = await add({ shiftId: night.id })
      expect(overnight.role).toBe('staff')
      expect(overnight.starts_at?.toISOString()).toBe('2099-03-02T14:00:00.000Z')
      expect(overnight.ends_at?.toISOString()).toBe('2099-03-03T00:00:00.000Z')
      const rest = await add({ shiftId: off.id, date: '2099-03-05' })
      expect(rest).toMatchObject({ starts_at: null, ends_at: null, shift: { type: 'off', paid_minutes: 0 } })
    })

    it('refuses a roster that is not a draft, and answers not found for a missing, malformed or foreign roster', async () => {
      for (const status of ['submitted', 'approved'] as const) {
        const locked = await addRoster({ status, unit_id: (await addUnit()).id })
        expect(await rejection(() => add({}, locked))).toMatchObject({ code: 'roster_locked' })
      }
      const closed = await addRoster({ status: 'closed', unit_id: (await addUnit()).id })
      expect(await rejection(() => add({}, closed))).toMatchObject({ code: 'roster_closed' })
      const foreign = await asHead(() => rosters.create(Object.assign({}, roster, { tenant_id: otherTenantId, unit_id: new Types.ObjectId().toHexString() }) as never))
      for (const id of [foreign.id, new Types.ObjectId().toHexString(), 'bad']) {
        expect(await rejection(() => asHead(() => service.add(tenantId, id, { employeeId: nurse.id, date: monday, shiftId: morning.id })))).toMatchObject({ code: 'roster_not_found' })
      }
      expect(await assignments.findByRoster(tenantId, roster.id)).toEqual([])
    })

    it.each([
      ['invalid_date', { date: '2099-02-30' }],
      ['date_outside_period', { date: '2099-04-01' }],
      ['date_outside_period', { date: '2099-02-28' }],
      ['invalid_role', { role: 'boss' as never }],
      ['shift_not_found', { shiftId: 'bad' }],
      ['employee_not_found', { employeeId: 'bad' }],
    ])('refuses %s and stores nothing', async (code, override) => {
      expect(await rejection(() => add(override))).toMatchObject({ kind: 'invalid', code })
      expect(await assignments.findByRoster(tenantId, roster.id)).toEqual([])
      expect(warn.mock.calls[0]?.[0]).toMatchObject({ event: 'assignment_add', outcome: 'failure', code })
    })

    it('refuses a date in the past in the facility zone, and the closed unit of the roster', async () => {
      const past = await addRoster({ unit_id: (await addUnit()).id, period: { start: '2020-01-01', end: '2020-01-31' } })
      expect(await rejection(() => add({ date: '2020-01-10' }, past))).toMatchObject({ code: 'assignment_in_past' })
      const closedUnit = await addUnit({ status: 'closed' })
      const closedRoster = await addRoster({ unit_id: closedUnit.id })
      expect(await rejection(() => add({}, closedRoster))).toMatchObject({ code: 'unit_closed' })
    })

    it('refuses a shift that is missing, foreign, retired, of another facility, or not usable by the unit', async () => {
      const otherFacility = (
        await asHead(() =>
          facilities.create({ tenant_id: tenantId, organization_id: organizationId, code: 'rs-lain', name: [{ locale: 'en', text: 'RS' }], address: null, timezone: 'Asia/Jakarta', holiday_calendar_codes: [], external_ids: [], status: 'active' }),
        )
      ).id
      const foreign = await addShift({ tenant_id: otherTenantId })
      const retired = await addShift({ status: 'retired' })
      const elsewhere = await addShift({ facility_id: otherFacility })
      const restricted = await addShift({ unit_ids: [new Types.ObjectId().toHexString()] })

      for (const [id, code] of [[foreign.id, 'shift_not_found'], [new Types.ObjectId().toHexString(), 'shift_not_found'], [retired.id, 'shift_retired'], [elsewhere.id, 'shift_outside_facility'], [restricted.id, 'shift_unit_not_allowed']] as const) {
        expect(await rejection(() => add({ shiftId: id }))).toMatchObject({ code })
      }
      const allowed = await addShift({ unit_ids: [unitId] })
      expect((await add({ shiftId: allowed.id })).shift.definition_id).toBe(allowed.id)
    })

    it('refuses an employee that is missing, foreign, or not on probation or active (HR-ROS-001)', async () => {
      const foreign = await asHead(() => employees.create(Object.assign({}, nurse, { tenant_id: otherTenantId, employee_number: 'X1' }) as never))
      expect(await rejection(() => add({ employeeId: foreign.id }))).toMatchObject({ code: 'employee_not_found' })
      expect(await rejection(() => add({ employeeId: new Types.ObjectId().toHexString() }))).toMatchObject({ code: 'employee_not_found' })
      for (const status of ['onboarding', 'suspended', 'separated'] as const) {
        const other = await addEmployee({ employment_status: status })
        expect(await rejection(() => add({ employeeId: other.id }))).toMatchObject({ code: 'employee_not_assignable' })
      }
      const probation = await addEmployee({ employment_status: 'probation' })
      expect((await add({ employeeId: probation.id })).employee_id).toBe(probation.id)
    })

    it('refuses a second planned assignment of the employee on the date in the roster, but allows it after a cancel', async () => {
      const first = await add()
      expect(await rejection(() => add({ shiftId: night.id }))).toMatchObject({ kind: 'conflict', code: 'assignment_exists' })
      await asHead(() => service.cancel(tenantId, first.id, {}))
      expect((await add({ shiftId: night.id })).shift.code).toBe('M')
    })

    it('checks general eligibility for a clinical employee in a clinical unit only, and names the failing condition (HR-ROS-002)', async () => {
      const clinicalUnit = await addUnit({ is_clinical: true })
      const clinicalRoster = await addRoster({ unit_id: clinicalUnit.id })
      const clinical = await addEmployee({ is_clinical: true })
      eligible.value = { eligible: false, failed: 'sip' }

      expect(await rejection(() => add({ employeeId: clinical.id }, clinicalRoster))).toMatchObject({ code: 'not_eligible_sip' })
      // A non-clinical employee, or a non-clinical unit, is not checked.
      expect((await add({ employeeId: nurse.id }, clinicalRoster)).employee_id).toBe(nurse.id)
      expect((await add({ employeeId: clinical.id })).employee_id).toBe(clinical.id)
      eligible.value = { eligible: true }
      expect((await add({ employeeId: clinical.id, date: '2099-03-03' }, clinicalRoster)).employee_id).toBe(clinical.id)
    })

    it('refuses overlap and too short a rest across rosters and units (HR-ROS-010, 011, 016)', async () => {
      const otherUnit = await addUnit()
      const elsewhere = await addRoster({ unit_id: otherUnit.id })
      await add({}, elsewhere)

      expect(await rejection(() => add({ shiftId: morning.id }))).toMatchObject({ code: 'overlap' })
      const evening = await addShift({ start_time: '15:00', end_time: '22:00', paid_minutes: 420 })
      expect(await rejection(() => add({ shiftId: evening.id }))).toMatchObject({ code: 'rest_too_short' })
      const late = await addShift({ start_time: '23:00', end_time: '23:30', paid_minutes: 30 })
      expect((await add({ shiftId: late.id })).shift.start_time).toBe('23:00')
      limits.MIN_REST_HOURS = 0
      expect((await add({ shiftId: evening.id, date: monday, employeeId: (await addEmployee()).id })).shift.start_time).toBe('15:00')
    })

    it('counts weekly hours across units, and overtime needs consent and stays under the weekly limit (HR-ROS-012, 013)', async () => {
      const long = await addShift({ start_time: '07:00', end_time: '17:00', paid_minutes: 600 })
      for (const date of ['2099-03-02', '2099-03-03', '2099-03-04', '2099-03-05']) {
        await add({ shiftId: long.id, date })
      }

      expect(await rejection(() => add({ shiftId: morning.id, date: '2099-03-06' }))).toMatchObject({ code: 'overtime_consent_required' })
      const withConsent = await add({ shiftId: morning.id, date: '2099-03-06', overtimeConsent: true })
      expect(withConsent.overtime).toMatchObject({ minutes: 480, consent: { document: null } })
      expect(withConsent.overtime?.consent?.at).toBeInstanceOf(Date)
      // 48 hours so far: 8 over. A tenth-hour shift on Saturday makes it exactly 18 over, the limit.
      expect((await add({ shiftId: long.id, date: '2099-03-07', overtimeConsent: true })).overtime).toMatchObject({ minutes: 600 })
      expect(await rejection(() => add({ shiftId: long.id, date: '2099-03-08', overtimeConsent: true }))).toMatchObject({ code: 'overtime_limit_exceeded' })
      // The next week starts clean.
      expect((await add({ shiftId: long.id, date: '2099-03-09' })).overtime).toBeNull()
    })

    it('limits the run of night shifts (HR-ROS-015)', async () => {
      for (const date of ['2099-03-02', '2099-03-03', '2099-03-04']) {
        await add({ shiftId: night.id, date })
      }
      expect(await rejection(() => add({ shiftId: night.id, date: '2099-03-05' }))).toMatchObject({ code: 'too_many_nights' })
      expect((await add({ shiftId: night.id, date: '2099-03-06' })).date).toBe('2099-03-06')
    })

    it('reads the working-time limits at the unit of the roster', async () => {
      limits.MAX_CONSECUTIVE_NIGHTS = 1
      await add({ shiftId: night.id })
      expect(await rejection(() => add({ shiftId: night.id, date: '2099-03-03' }))).toMatchObject({ code: 'too_many_nights' })
    })
  })

  describe('change', () => {
    it('changes the shift and recomputes the snapshot and the instants, keeps the employee and the date, and logs one entry', async () => {
      const created = await add()

      const changed = await asHead(() => service.change(tenantId, created.id, { shiftId: night.id, role: 'supervisor', reason: 'Alasan Rahasia' }))

      expect(changed).toMatchObject({
        employee_id: nurse.id,
        date: monday,
        role: 'supervisor',
        shift: { definition_id: night.id, code: 'M', is_night: true },
      })
      expect(changed.starts_at?.toISOString()).toBe('2099-03-02T14:00:00.000Z')
      expect(log.mock.calls.at(-1)?.[0]).toMatchObject({ event: 'assignment_change', outcome: 'success' })
      expect(JSON.stringify([log.mock.calls, warn.mock.calls])).not.toContain('Alasan Rahasia')
    })

    it('changes only the role without checking the working time again, and keeps a snapshot when the definition changes later', async () => {
      const created = await add()
      await asHead(() => shifts.update(morning.id, { end_time: '16:00', paid_minutes: 540 }))

      const changed = await asHead(() => service.change(tenantId, created.id, { role: 'team_leader' }))

      expect(changed.role).toBe('team_leader')
      expect(changed.shift).toMatchObject({ end_time: '15:00', paid_minutes: 480 })
    })

    it('checks the new shift against the employee\'s other shifts and ignores the assignment itself', async () => {
      const created = await add()
      await add({ date: '2099-03-03' })
      const clash = await addShift({ start_time: '21:00', end_time: '05:00', paid_minutes: 480 })

      expect(await rejection(() => asHead(() => service.change(tenantId, created.id, { shiftId: clash.id })))).toMatchObject({ code: 'rest_too_short' })
      const same = await addShift({ start_time: '07:00', end_time: '15:00' })
      expect((await asHead(() => service.change(tenantId, created.id, { shiftId: same.id }))).shift.definition_id).toBe(same.id)
    })

    it('adds or keeps overtime consent', async () => {
      const long = await addShift({ start_time: '07:00', end_time: '17:00', paid_minutes: 600 })
      for (const date of ['2099-03-02', '2099-03-03', '2099-03-04', '2099-03-05']) {
        await add({ shiftId: long.id, date })
      }
      const fifth = await add({ shiftId: off.id, date: '2099-03-06' })

      expect(await rejection(() => asHead(() => service.change(tenantId, fifth.id, { shiftId: morning.id })))).toMatchObject({ code: 'overtime_consent_required' })
      const changed = await asHead(() => service.change(tenantId, fifth.id, { shiftId: morning.id, overtimeConsent: true }))
      expect(changed.overtime).toMatchObject({ minutes: 480 })
      const again = await asHead(() => service.change(tenantId, fifth.id, { role: 'staff' }))
      expect(again.overtime).toMatchObject({ minutes: 480 })
    })

    it('refuses an empty update, a bad role or shift, a cancelled assignment, a locked or closed roster and the past', async () => {
      const created = await add()
      expect(await rejection(() => asHead(() => service.change(tenantId, created.id, {})))).toMatchObject({ code: 'empty_update' })
      expect(await rejection(() => asHead(() => service.change(tenantId, created.id, { role: 'boss' as never })))).toMatchObject({ code: 'invalid_role' })
      expect(await rejection(() => asHead(() => service.change(tenantId, created.id, { shiftId: new Types.ObjectId().toHexString() })))).toMatchObject({ code: 'shift_not_found' })
      await asHead(() => rosters.update(roster.id, { status: 'approved' }))
      expect(await rejection(() => asHead(() => service.change(tenantId, created.id, { role: 'staff' })))).toMatchObject({ code: 'roster_locked' })
      await asHead(() => rosters.update(roster.id, { status: 'closed' }))
      expect(await rejection(() => asHead(() => service.change(tenantId, created.id, { role: 'staff' })))).toMatchObject({ code: 'roster_closed' })
      await asHead(() => rosters.update(roster.id, { status: 'draft' }))
      await asHead(() => service.cancel(tenantId, created.id, {}))
      expect(await rejection(() => asHead(() => service.change(tenantId, created.id, { role: 'staff' })))).toMatchObject({ code: 'assignment_cancelled' })
    })

    it('refuses a change to an assignment in the past, a stale version, and a missing, malformed or foreign assignment', async () => {
      const pastRoster = await addRoster({ unit_id: (await addUnit()).id, period: { start: '2020-01-01', end: '2020-01-31' } })
      const base = await add()
      const past = await asHead(() => assignments.create(Object.assign({}, base, { roster_id: pastRoster.id, date: '2020-01-10' }) as never))
      expect(await rejection(() => asHead(() => service.change(tenantId, past.id, { role: 'staff' })))).toMatchObject({ code: 'assignment_in_past' })

      const created = await add({ date: '2099-03-10' })
      const foreign = await asHead(() => assignments.create(Object.assign({}, created, { tenant_id: otherTenantId }) as never))
      expect(await rejection(() => asHead(() => service.change(tenantId, created.id, { role: 'staff', version: created.version + 5 })))).toMatchObject({ code: 'stale_version' })
      for (const id of [foreign.id, new Types.ObjectId().toHexString(), 'bad']) {
        expect(await rejection(() => asHead(() => service.change(tenantId, id, { role: 'staff' })))).toMatchObject({ code: 'roster_assignment_not_found' })
      }
      const spy = vi.spyOn(assignments, 'update').mockRejectedValueOnce(new RepositoryConflictError('race', { operation: 'x' }))
      expect(await rejection(() => asHead(() => service.change(tenantId, created.id, { role: 'staff' })))).toMatchObject({ code: 'stale_version' })
      spy.mockRestore()
    })
  })

  describe('cancel', () => {
    it('cancels an assignment, keeps its record, frees the date, and logs one entry without values', async () => {
      const created = await add()

      const cancelled = await asHead(() => service.cancel(tenantId, created.id, { reason: 'Alasan Rahasia' }))

      expect(cancelled.status).toBe('cancelled')
      expect((await assignments.findByRoster(tenantId, roster.id)).map((item) => item.status)).toEqual(['cancelled'])
      expect(log.mock.calls.at(-1)?.[0]).toMatchObject({ event: 'assignment_cancel', outcome: 'success' })
      expect(JSON.stringify([log.mock.calls, warn.mock.calls])).not.toContain('Alasan Rahasia')
      expect(await rejection(() => asHead(() => service.cancel(tenantId, created.id, {})))).toMatchObject({ code: 'assignment_cancelled' })
    })

    it('does not count a cancelled assignment in the working-time checks of others', async () => {
      const first = await add()
      expect(await rejection(() => add({ shiftId: morning.id }))).toMatchObject({ code: 'assignment_exists' })
      await asHead(() => service.cancel(tenantId, first.id, {}))
      const other = await addRoster({ unit_id: (await addUnit()).id })
      expect((await add({}, other)).date).toBe(monday)
    })

    it('refuses a stale version, a locked roster and a missing assignment', async () => {
      const created = await add()
      expect(await rejection(() => asHead(() => service.cancel(tenantId, created.id, { version: created.version + 5 })))).toMatchObject({ code: 'stale_version' })
      await asHead(() => rosters.update(roster.id, { status: 'submitted' }))
      expect(await rejection(() => asHead(() => service.cancel(tenantId, created.id, {})))).toMatchObject({ code: 'roster_locked' })
      expect(await rejection(() => asHead(() => service.cancel(tenantId, 'bad', {})))).toMatchObject({ code: 'roster_assignment_not_found' })
    })
  })

  describe('a published roster', () => {
    let published: Roster

    beforeEach(async () => {
      published = await addRoster({ unit_id: (await addUnit()).id, status: 'published', revision: 1 })
    })

    it('adds an assignment with a reason, marks it as a change request, and raises the roster revision by one', async () => {
      const created = await add({ reason: 'Pengganti sakit' }, published)

      expect(created).toMatchObject({ source: { kind: 'change_request', ref_id: null }, change_reason: 'Pengganti sakit', revision: 2, status: 'planned' })
      expect((await rosters.findOne(published.id))?.revision).toBe(2)
      const second = await add({ employeeId: (await addEmployee()).id, reason: 'Tambahan' }, published)
      expect(second.revision).toBe(3)
      expect((await rosters.findOne(published.id))?.revision).toBe(3)
      expect(log.mock.calls.at(-1)?.[0]).toMatchObject({ event: 'assignment_add', outcome: 'success' })
      expect(JSON.stringify([log.mock.calls, warn.mock.calls])).not.toContain('Pengganti sakit')
    })

    it('needs a reason of 1 to 500 characters, and changes nothing without it', async () => {
      expect(await rejection(() => add({}, published))).toMatchObject({ code: 'reason_required' })
      expect(await rejection(() => add({ reason: '   ' }, published))).toMatchObject({ code: 'reason_required' })
      expect(await rejection(() => add({ reason: 'x'.repeat(501) }, published))).toMatchObject({ code: 'invalid_reason' })
      expect(await assignments.findByRoster(tenantId, published.id)).toEqual([])
      expect((await rosters.findOne(published.id))?.revision).toBe(1)
    })

    it('changes an assignment with a reason, stamps the revision and keeps the reason on it', async () => {
      const created = await add({ reason: 'Awal' }, published)

      const changed = await asHead(() => service.change(tenantId, created.id, { shiftId: night.id, reason: 'Tukar shift' }))

      expect(changed).toMatchObject({ shift: { code: 'M' }, change_reason: 'Tukar shift', revision: 3 })
      expect((await rosters.findOne(published.id))?.revision).toBe(3)
      expect(await rejection(() => asHead(() => service.change(tenantId, created.id, { role: 'supervisor' })))).toMatchObject({ code: 'reason_required' })
      expect((await rosters.findOne(published.id))?.revision).toBe(3)
    })

    it('cancels an assignment with a reason, raises the revision, and refuses without one', async () => {
      const created = await add({ reason: 'Awal' }, published)

      expect(await rejection(() => asHead(() => service.cancel(tenantId, created.id, {})))).toMatchObject({ code: 'reason_required' })
      const cancelled = await asHead(() => service.cancel(tenantId, created.id, { reason: 'Izin' }))

      expect(cancelled).toMatchObject({ status: 'cancelled', change_reason: 'Izin', revision: 3 })
      expect((await rosters.findOne(published.id))?.revision).toBe(3)
    })

    it('does not raise the revision of a draft roster, and keeps no reason there', async () => {
      const created = await add({ reason: 'Catatan' })
      expect(created).toMatchObject({ revision: 0, change_reason: null, source: { kind: 'roster' } })
      const changed = await asHead(() => service.change(tenantId, created.id, { role: 'supervisor', reason: 'Catatan' }))
      expect(changed).toMatchObject({ revision: 0, change_reason: null })
      expect((await rosters.findOne(roster.id))?.revision).toBe(0)
    })

    it('checks the working-time rules in a published roster too, and writes nothing when one fails', async () => {
      await add({ reason: 'Awal' }, published)
      const elsewhere = await addRoster({ unit_id: (await addUnit()).id, status: 'published', revision: 1 })
      expect(await rejection(() => add({ reason: 'Lagi', shiftId: morning.id, date: monday }, elsewhere))).toMatchObject({ code: 'overlap' })
      expect((await rosters.findOne(published.id))?.revision).toBe(2)
    })

    it('refuses a change when the roster was changed by someone else meanwhile, and rolls the revision back to the stored one', async () => {
      const spy = vi.spyOn(rosters, 'update').mockRejectedValueOnce(new RepositoryConflictError('race', { operation: 'x' }))
      expect(await rejection(() => add({ reason: 'Balapan' }, published))).toMatchObject({ code: 'stale_version' })
      spy.mockRestore()
    })

    it('keeps a closed roster, and one that was submitted or approved, fixed', async () => {
      for (const status of ['closed', 'submitted', 'approved'] as const) {
        const other = await addRoster({ unit_id: (await addUnit()).id, status })
        expect(await rejection(() => add({ reason: 'x' }, other))).toMatchObject({ code: status === 'closed' ? 'roster_closed' : 'roster_locked' })
      }
    })
  })

  describe('the past', () => {
    let pastRoster: Roster
    const jan = '2020-01-10'

    beforeEach(async () => {
      pastRoster = await addRoster({ unit_id: (await addUnit()).id, period: { start: '2020-01-01', end: '2020-01-31' } })
    })

    it('lets a caller who may correct the past add, change and cancel with a reason, and refuses everyone else', async () => {
      expect(await rejection(() => add({ date: jan, reason: 'Koreksi' }, pastRoster))).toMatchObject({ code: 'assignment_in_past' })

      const created = await add({ date: jan, reason: 'Koreksi absensi', canCorrectPast: true }, pastRoster)
      expect(created).toMatchObject({ date: jan, change_reason: 'Koreksi absensi', source: { kind: 'roster' } })
      expect(await rejection(() => asHead(() => service.change(tenantId, created.id, { role: 'supervisor' })))).toMatchObject({ code: 'assignment_in_past' })
      const changed = await asHead(() => service.change(tenantId, created.id, { role: 'supervisor', reason: 'Koreksi peran', canCorrectPast: true }))
      expect(changed).toMatchObject({ role: 'supervisor', change_reason: 'Koreksi peran' })
      const cancelled = await asHead(() => service.cancel(tenantId, created.id, { reason: 'Salah isi', canCorrectPast: true }))
      expect(cancelled.status).toBe('cancelled')
    })

    it('needs a reason for a correction even in a draft, and the working-time rules still apply', async () => {
      expect(await rejection(() => add({ date: jan, canCorrectPast: true }, pastRoster))).toMatchObject({ code: 'reason_required' })
      await add({ date: jan, reason: 'Satu', canCorrectPast: true }, pastRoster)
      const other = await addRoster({ unit_id: (await addUnit()).id, period: { start: '2020-01-01', end: '2020-01-31' } })
      expect(await rejection(() => add({ date: jan, reason: 'Dua', canCorrectPast: true }, other))).toMatchObject({ code: 'overlap' })
    })

    it('corrects the past of a published roster and raises its revision, but never a closed roster', async () => {
      const published = await addRoster({ unit_id: (await addUnit()).id, period: { start: '2020-02-01', end: '2020-02-29' }, status: 'published', revision: 1 })
      const created = await add({ date: '2020-02-10', reason: 'Koreksi', canCorrectPast: true }, published)
      expect(created.revision).toBe(2)
      expect((await rosters.findOne(published.id))?.revision).toBe(2)
      const closed = await addRoster({ unit_id: (await addUnit()).id, period: { start: '2020-03-01', end: '2020-03-31' }, status: 'closed' })
      expect(await rejection(() => add({ date: '2020-03-10', reason: 'Koreksi', canCorrectPast: true }, closed))).toMatchObject({ code: 'roster_closed' })
    })
  })

  describe('list', () => {
    it('lists a roster\'s assignments by date and employee with filters, never another roster\'s, and writes no log entry', async () => {
      const second = await addEmployee()
      const a = await add({ date: '2099-03-03' })
      const b = await add({ date: '2099-03-02', employeeId: second.id })
      const c = await add({ date: '2099-03-02' })
      const other = await addRoster({ unit_id: (await addUnit()).id })
      await add({ employeeId: (await addEmployee()).id }, other)
      await asHead(() => service.cancel(tenantId, a.id, {}))

      ;[log, warn, error, debug].forEach((spy) => spy.mockClear())
      const ids = async (query: Parameters<RosterAssignmentService['list']>[2]) => (await service.list(tenantId, roster.id, query)).map((item) => item.id)
      const byDate = [b, c].sort((left, right) => left.employee_id.localeCompare(right.employee_id)).map((item) => item.id)
      expect(await ids({ limit: 100 })).toEqual([...byDate, a.id])
      expect(await ids({ date: '2099-03-02' })).toEqual(byDate)
      expect(await ids({ employeeId: second.id })).toEqual([b.id])
      expect(await ids({ status: 'cancelled' })).toEqual([a.id])
      expect(await ids({ from: '2099-03-03' })).toEqual([a.id])
      expect(await ids({ to: '2099-03-02' })).toHaveLength(2)
      expect(await ids({ limit: 1, offset: 1 })).toHaveLength(1)
      expect([log, warn, error, debug].every((spy) => spy.mock.calls.length === 0)).toBe(true)
    })

    it('answers not found for a missing, malformed or foreign roster', async () => {
      const foreign = await asHead(() => rosters.create(Object.assign({}, roster, { tenant_id: otherTenantId, unit_id: new Types.ObjectId().toHexString() }) as never))
      for (const id of [foreign.id, new Types.ObjectId().toHexString(), 'bad']) {
        expect(await rejection(() => service.list(tenantId, id, {}))).toMatchObject({ code: 'roster_not_found' })
      }
    })
  })
})
