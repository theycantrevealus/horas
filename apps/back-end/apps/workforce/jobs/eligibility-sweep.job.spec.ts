import { Types } from 'mongoose'
import { RepositoryUnavailableError } from '@utility/database/error'
import { runWithRequestContext } from '@utility/logger/context'
import { InMemoryEventOutbox } from '@utility/testing/in-memory-event-outbox'
import { type Employee } from '@repository/model/employee'
import { type OrganizationUnit } from '@repository/model/organization-unit'
import { type Roster } from '@repository/model/roster'
import { type RosterAssignment } from '@repository/model/roster-assignment'
import { EligibilityService } from '../eligibility/eligibility.service'
import {
  InMemoryClinicalAppointments,
  InMemoryEmployees,
  InMemoryFacilities,
  InMemoryOrganizationUnits,
  InMemoryPrivilegeGrants,
  InMemoryProfessionalLicenses,
  InMemoryRosterAssignments,
  InMemoryRosters,
} from '../testing/in-memory'
import { EligibilitySweepJob } from './eligibility-sweep.job'

describe('EligibilitySweepJob', () => {
  const tenantA = new Types.ObjectId().toHexString()
  const tenantB = new Types.ObjectId().toHexString()
  const organizationId = new Types.ObjectId().toHexString()
  const admin = { account_id: 'a1', display_name: 'Admin', kind: 'account' as const }
  // 09:00 UTC is 16:00 on 2027-03-10 in Jakarta.
  const now = new Date('2027-03-10T09:00:00Z')
  let rosters: InMemoryRosters
  let assignments: InMemoryRosterAssignments
  let employees: InMemoryEmployees
  let units: InMemoryOrganizationUnits
  let facilities: InMemoryFacilities
  let licenses: InMemoryProfessionalLicenses
  let appointments: InMemoryClinicalAppointments
  let outbox: InMemoryEventOutbox
  let eligibility: EligibilityService
  let lookahead: number
  let job: EligibilitySweepJob
  let facilityId: string
  let unit: OrganizationUnit
  let roster: Roster
  let counter = 0

  /**
   * Runs `work` as a signed-in request.
   *
   * @param work - Code to run.
   * @returns What `work` returns.
   */
  function asAdmin<T>(work: () => Promise<T>): Promise<T> {
    return runWithRequestContext({ correlationId: 'seed', actor: admin }, work)
  }

  /**
   * Stores a facility in a time zone.
   *
   * @param timezone - IANA zone.
   * @param tenant - Tenant.
   * @returns The facility identifier.
   */
  async function addFacility(timezone: string, tenant = tenantA): Promise<string> {
    counter += 1
    return (
      await asAdmin(() =>
        facilities.create({ tenant_id: tenant, organization_id: organizationId, code: `rs-${counter}`, name: [{ locale: 'en', text: 'RS' }], address: null, timezone, holiday_calendar_codes: [], external_ids: [], status: 'active' }),
      )
    ).id
  }

  /**
   * Stores a unit.
   *
   * @param facility - Its facility.
   * @param override - Fields that replace the defaults.
   * @returns The unit.
   */
  function addUnit(facility: string, override: Partial<OrganizationUnit> = {}) {
    counter += 1
    return asAdmin(() =>
      units.create({ tenant_id: tenantA, organization_id: organizationId, facility_id: facility, code: `ward-${counter}`, name: [{ locale: 'en', text: 'Ward' }], type: { system: 'id.unit-type', code: 'ward' }, parent_id: null, ancestor_ids: [], is_clinical: true, external_ids: [], period: { start: '2026-01-01', end: null }, status: 'active', ...override }),
    )
  }

  /**
   * Stores a roster of a unit.
   *
   * @param forUnit - The unit.
   * @param override - Fields that replace the defaults.
   * @returns The roster.
   */
  function addRoster(forUnit: OrganizationUnit, override: Partial<Roster> = {}) {
    return asAdmin(() =>
      rosters.create({
        tenant_id: forUnit.tenant_id,
        unit_id: forUnit.id,
        facility_id: forUnit.facility_id,
        period: { start: '2027-03-01', end: '2027-04-30' },
        status: 'published',
        revision: 1,
        prepared_by: admin,
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
   * Stores a clinical nurse.
   *
   * @param override - Fields that replace the defaults.
   * @returns The employee.
   */
  function addEmployee(override: Partial<Employee> = {}) {
    counter += 1
    return asAdmin(() =>
      employees.create({
        tenant_id: tenantA,
        employee_number: `E${counter}`,
        name: { use: 'official', text: 'Siti', given: [], prefix: [], suffix: [] },
        other_names: [],
        display_name: 'Siti',
        administrative_gender: null,
        workforce_category: { system: 'id.workforce-category', code: 'tenaga_keperawatan' },
        is_clinical: true,
        profession: { system: 'id.profession', code: 'perawat' },
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
   * Gives an employee a valid registration, a valid practice permit and an SPK covering the unit.
   *
   * @param employee - The employee.
   * @param forUnit - The unit.
   */
  async function makeEligible(employee: Employee, forUnit: OrganizationUnit = unit) {
    for (const role of ['registration', 'practice_permit'] as const) {
      const number = new Types.ObjectId().toHexString().slice(-6).toUpperCase()
      await asAdmin(() =>
        licenses.create({
          tenant_id: employee.tenant_id,
          employee_id: employee.id,
          license_type: { system: 'id.license-type', code: role === 'registration' ? 'str' : 'sip' },
          eligibility_role: role,
          profession: { system: 'id.profession', code: 'perawat' },
          specialty: null,
          document_number: number,
          document_number_normalized: number,
          issuing_authority: { code: null, name: 'KKI' },
          jurisdiction: { country: 'ID', subdivision: null },
          practice_location: role === 'practice_permit' ? { facility_id: forUnit.facility_id, name: 'RS', address: null } : null,
          issue_date: '2025-01-01',
          expiry_date: null,
          document: { file_id: 'f', content_type: 'application/pdf', sha256: 'a'.repeat(64) },
          status: 'valid',
          status_effective_date: '2025-01-02',
          is_live: true,
          submission: { via: 'hr', by: admin, at: new Date() },
          verification: null,
          rejection: null,
          revocation: null,
          superseded: null,
          replaces_license_id: null,
        }),
      )
    }
    await asAdmin(() =>
      appointments.create({
        tenant_id: employee.tenant_id,
        appointment_number: `SPK/${new Types.ObjectId().toHexString().slice(-6)}`,
        employee_id: employee.id,
        credentialing_facility_id: forUnit.facility_id,
        credentialing_scope: 'facility',
        facility_ids: [forUnit.facility_id],
        unit_ids: [forUnit.id],
        source_application_id: new Types.ObjectId().toHexString(),
        valid_period: { start: '2025-01-01', end: '2099-12-31' },
        is_temporary: false,
        status: 'active',
        is_current: true,
        issued: { by: admin, director_employee_id: new Types.ObjectId().toHexString(), date: '2025-01-01' },
        signed_document: null,
        suspension: null,
        revocation: null,
        superseded_by_id: null,
      }),
    )
  }

  /**
   * Stores a planned assignment.
   *
   * @param employee - The employee.
   * @param date - The date.
   * @param override - Fields that replace the defaults.
   * @param inRoster - The roster; the default one when omitted.
   * @returns The assignment.
   */
  function assign(employee: Employee, date: string, override: Partial<RosterAssignment> = {}, inRoster: Roster = roster) {
    return asAdmin(() =>
      assignments.create({
        tenant_id: inRoster.tenant_id,
        roster_id: inRoster.id,
        unit_id: inRoster.unit_id,
        facility_id: inRoster.facility_id,
        employee_id: employee.id,
        date,
        shift: { definition_id: new Types.ObjectId().toHexString(), code: 'P', type: 'regular', start_time: '08:00', end_time: '16:00', paid_minutes: 480, is_night: false },
        starts_at: new Date(`${date}T01:00:00Z`),
        ends_at: new Date(`${date}T09:00:00Z`),
        role: 'staff',
        status: 'planned',
        source: { kind: 'roster', ref_id: null },
        cancellation: null,
        change_reason: null,
        revision: 1,
        overtime: null,
        flag: null,
        is_flagged: false,
        ...override,
      }),
    )
  }

  beforeEach(async () => {
    rosters = new InMemoryRosters()
    assignments = new InMemoryRosterAssignments()
    employees = new InMemoryEmployees()
    units = new InMemoryOrganizationUnits()
    facilities = new InMemoryFacilities()
    licenses = new InMemoryProfessionalLicenses()
    appointments = new InMemoryClinicalAppointments()
    outbox = new InMemoryEventOutbox()
    lookahead = 14
    eligibility = new EligibilityService(licenses, appointments, new InMemoryPrivilegeGrants())
    job = new EligibilitySweepJob(
      rosters,
      assignments,
      employees,
      units,
      facilities,
      eligibility,
      { resolve: async () => ({ value: lookahead }) } as never,
      { run: (work: () => Promise<unknown>) => work() } as never,
      outbox,
    )
    facilityId = await addFacility('Asia/Jakarta')
    unit = await addUnit(facilityId)
    roster = await addRoster(unit)
  })

  it('flags, not cancels, an assignment of an employee who is not eligible, naming the failing condition', async () => {
    const nurse = await addEmployee()
    const planned = await assign(nurse, '2027-03-12')

    expect(await job.run(now, 50)).toEqual({ count: 1, failed: 0, more: false })

    const stored = await assignments.findOne(planned.id)
    expect(stored).toMatchObject({ status: 'planned', is_flagged: true, flag: { reason: 'eligibility_lost', failed: 'str', resolved_at: null } })
    expect((await rosters.findOne(roster.id))?.revision).toBe(1)
    expect((await rosters.findOne(roster.id))?.version).toBe(roster.version)
  })

  it('names employment when the employee is suspended', async () => {
    const nurse = await addEmployee({ employment_status: 'suspended' })
    const planned = await assign(nurse, '2027-03-12')

    await job.run(now, 50)

    expect((await assignments.findOne(planned.id))?.flag?.failed).toBe('employment')
  })

  it('leaves an eligible employee alone', async () => {
    const nurse = await addEmployee()
    await makeEligible(nurse)
    const planned = await assign(nurse, '2027-03-12')

    expect(await job.run(now, 50)).toEqual({ count: 0, failed: 0, more: false })

    expect(await assignments.findOne(planned.id)).toMatchObject({ is_flagged: false, flag: null })
    expect(outbox.events).toEqual([])
  })

  it('writes one event per flag with identifiers, codes and dates only, and a correlation id', async () => {
    const nurse = await addEmployee()
    const planned = await assign(nurse, '2027-03-12')

    await job.run(now, 50)

    expect(outbox.events).toHaveLength(1)
    const [event] = outbox.events
    expect(event).toMatchObject({ tenant_id: tenantA, event_type: 'workforce.assignment.flagged', aggregate: { type: 'roster_assignment', id: planned.id } })
    expect(event?.payload).toEqual({ assignment_id: planned.id, roster_id: roster.id, unit_id: unit.id, employee_id: nurse.id, date: '2027-03-12', failed: 'str' })
    expect(event?.correlation_id).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('is idempotent: a second pass changes nothing and writes no second event', async () => {
    const nurse = await addEmployee()
    await assign(nurse, '2027-03-12')

    await job.run(now, 50)
    expect(await job.run(now, 50)).toEqual({ count: 0, failed: 0, more: false })

    expect(outbox.events).toHaveLength(1)
  })

  it('resolves the open flag once the employee is eligible again, with an event, and flags again if they lose it', async () => {
    const nurse = await addEmployee()
    const planned = await assign(nurse, '2027-03-12')
    await job.run(now, 50)

    await makeEligible(nurse)
    expect(await job.run(now, 50)).toEqual({ count: 1, failed: 0, more: false })
    const resolved = await assignments.findOne(planned.id)
    expect(resolved).toMatchObject({ is_flagged: false, status: 'planned' })
    expect(resolved?.flag?.resolved_at).toBeInstanceOf(Date)
    expect(outbox.events.map((event) => event.event_type)).toEqual(['workforce.assignment.flagged', 'workforce.assignment.flag_resolved'])
    expect(outbox.events[1]?.payload).toEqual({ assignment_id: planned.id, roster_id: roster.id, unit_id: unit.id, employee_id: nurse.id, date: '2027-03-12' })

    for (const license of await licenses.findByEmployee(tenantA, nurse.id)) {
      await asAdmin(() => licenses.update(license.id, { status: 'revoked' }))
    }
    await job.run(now, 50)
    expect(await assignments.findOne(planned.id)).toMatchObject({ is_flagged: true, flag: { resolved_at: null } })
  })

  it('checks only today to today plus the lookahead, and only planned assignments', async () => {
    const nurse = await addEmployee()
    const past = await assign(nurse, '2027-03-09')
    const today = await assign(nurse, '2027-03-10')
    const last = await assign(nurse, '2027-03-24')
    const beyond = await assign(nurse, '2027-03-25')
    const cancelled = await assign(await addEmployee(), '2027-03-12', { status: 'cancelled' })

    expect((await job.run(now, 50)).count).toBe(2)

    expect((await assignments.findOne(today.id))?.is_flagged).toBe(true)
    expect((await assignments.findOne(last.id))?.is_flagged).toBe(true)
    expect((await assignments.findOne(past.id))?.is_flagged).toBe(false)
    expect((await assignments.findOne(beyond.id))?.is_flagged).toBe(false)
    expect((await assignments.findOne(cancelled.id))?.is_flagged).toBe(false)
  })

  it('reads the lookahead from the parameter', async () => {
    lookahead = 3
    const nurse = await addEmployee()
    const near = await assign(nurse, '2027-03-13')
    const far = await assign(nurse, '2027-03-14')

    await job.run(now, 50)

    expect((await assignments.findOne(near.id))?.is_flagged).toBe(true)
    expect((await assignments.findOne(far.id))?.is_flagged).toBe(false)
  })

  it('reads today in the facility zone: 03:00 UTC is still 9 March in New York', async () => {
    const west = await addUnit(await addFacility('America/New_York'))
    const westRoster = await addRoster(west, { period: { start: '2027-03-01', end: '2027-03-09' } })
    const nurse = await addEmployee()
    const yesterdayInJakarta = await assign(nurse, '2027-03-09', {}, roster)
    const todayInNewYork = await assign(nurse, '2027-03-09', {}, westRoster)
    const early = new Date('2027-03-10T03:00:00Z')

    await job.run(early, 50)

    expect((await assignments.findOne(todayInNewYork.id))?.is_flagged).toBe(true)
    expect((await assignments.findOne(yesterdayInJakarta.id))?.is_flagged).toBe(false)
  })

  it('skips rosters that are not published, units that are closed or not clinical, and non-clinical or foreign employees', async () => {
    const nurse = await addEmployee()
    const skipped: RosterAssignment[] = []
    for (const status of ['draft', 'submitted', 'approved', 'closed'] as const) {
      const other = await addUnit(facilityId)
      skipped.push(await assign(nurse, '2027-03-12', {}, await addRoster(other, { status })))
    }
    const closedUnit = await addUnit(facilityId, { status: 'closed' })
    skipped.push(await assign(nurse, '2027-03-12', {}, await addRoster(closedUnit)))
    const nonClinicalUnit = await addUnit(facilityId, { is_clinical: false })
    skipped.push(await assign(nurse, '2027-03-12', {}, await addRoster(nonClinicalUnit)))
    skipped.push(await assign(await addEmployee({ is_clinical: false }), '2027-03-12'))
    skipped.push(await assign(await addEmployee({ tenant_id: tenantB }), '2027-03-12'))

    expect(await job.run(now, 50)).toEqual({ count: 0, failed: 0, more: false })

    for (const item of skipped) {
      expect((await assignments.findOne(item.id))?.is_flagged).toBe(false)
    }
    expect(outbox.events).toEqual([])
  })

  it('sweeps the rosters of every tenant, each event carrying its own tenant', async () => {
    const otherFacility = await addFacility('Asia/Jakarta', tenantB)
    const otherUnit = await addUnit(otherFacility, { tenant_id: tenantB })
    const otherRoster = await addRoster(otherUnit)
    await assign(await addEmployee(), '2027-03-12')
    await assign(await addEmployee({ tenant_id: tenantB }), '2027-03-12', {}, otherRoster)

    expect((await job.run(now, 50)).count).toBe(2)

    expect(outbox.events.map((event) => event.tenant_id).sort()).toEqual([tenantA, tenantB].sort())
  })

  it('asks about eligibility once per employee, unit and date in a pass', async () => {
    const nurse = await addEmployee()
    await assign(nurse, '2027-03-12')
    await assign(nurse, '2027-03-12', {}, await addRoster(unit, { period: { start: '2027-05-01', end: '2027-05-31' }, status: 'closed' }))
    const spy = vi.spyOn(eligibility, 'general')
    const second = await addEmployee()
    await assign(second, '2027-03-12')
    await assign(second, '2027-03-13')

    await job.run(now, 50)

    expect(spy).toHaveBeenCalledTimes(3)
  })

  it('stops at the batch size, says more may be due and moves on in the next pass', async () => {
    for (let index = 0; index < 3; index += 1) {
      await assign(await addEmployee(), '2027-03-12')
    }

    expect(await job.run(now, 2)).toEqual({ count: 2, failed: 0, more: true })
    expect(await job.run(now, 2)).toEqual({ count: 1, failed: 0, more: false })
  })

  it('skips an assignment changed since it was read (stale version) and keeps going', async () => {
    const first = await assign(await addEmployee(), '2027-03-11')
    const second = await assign(await addEmployee(), '2027-03-12')
    const update = assignments.update.bind(assignments)
    vi.spyOn(assignments, 'update').mockImplementation(async (id, changes, options) => {
      if (id === first.id) {
        await update(id, { status: 'cancelled' })
      }
      return update(id, changes, options)
    })

    const result = await job.run(now, 50)

    expect(result).toMatchObject({ count: 1, failed: 1, more: false, retryable: false })
    expect((await assignments.findOne(second.id))?.is_flagged).toBe(true)
    expect(outbox.events).toHaveLength(1)
  })

  it('counts a failing assignment with the error class and retry flag and does not stop the others', async () => {
    const first = await assign(await addEmployee(), '2027-03-11')
    const second = await assign(await addEmployee(), '2027-03-12')
    const update = assignments.update.bind(assignments)
    vi.spyOn(assignments, 'update').mockImplementation(async (id, changes, options) => {
      if (id === first.id) {
        throw new RepositoryUnavailableError('down', { operation: 'x' })
      }
      return update(id, changes, options)
    })

    expect(await job.run(now, 50)).toEqual({ count: 1, failed: 1, more: false, error: 'RepositoryUnavailableError', retryable: true })
    expect((await assignments.findOne(second.id))?.is_flagged).toBe(true)
  })

  it('counts a roster whose set-up fails once and goes on with the next roster', async () => {
    const nurse = await addEmployee()
    const other = await addUnit(facilityId)
    await assign(nurse, '2027-03-12', {}, await addRoster(other))
    const find = units.findOne.bind(units)
    vi.spyOn(units, 'findOne').mockImplementation(async (id, options) => {
      if (id === unit.id) {
        throw new RepositoryUnavailableError('down', { operation: 'x' })
      }
      return find(id, options)
    })

    expect(await job.run(now, 50)).toMatchObject({ count: 1, failed: 1, retryable: true })
  })
})
