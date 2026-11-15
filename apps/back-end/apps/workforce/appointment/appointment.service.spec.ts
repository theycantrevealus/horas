import { Types } from 'mongoose'
import { runWithRequestContext } from '@utility/logger/context'
import {
  InMemoryClinicalAppointments,
  InMemoryEmployees,
  InMemoryPrivilegeGrants,
} from '../testing/in-memory'
import { AppointmentService } from './appointment.service'

describe('AppointmentService', () => {
  const tenantId = new Types.ObjectId().toHexString()
  const otherTenantId = new Types.ObjectId().toHexString()
  const facilityId = new Types.ObjectId().toHexString()
  const otherFacilityId = new Types.ObjectId().toHexString()
  const unitId = new Types.ObjectId().toHexString()
  let appointments: InMemoryClinicalAppointments
  let grants: InMemoryPrivilegeGrants
  let employees: InMemoryEmployees
  let service: AppointmentService
  let counter = 0

  /**
   * Runs `work` as a signed-in request.
   *
   * @param work - Code to run.
   * @returns What `work` returns.
   */
  function asAdmin<T>(work: () => Promise<T>): Promise<T> {
    return runWithRequestContext(
      {
        correlationId: 'c1',
        actor: { account_id: 'a1', display_name: 'Admin', kind: 'account' },
      },
      work,
    )
  }

  /**
   * Adds an employee.
   *
   * @param tenant - Tenant of the employee.
   * @returns The employee identifier.
   */
  async function addEmployee(tenant = tenantId): Promise<string> {
    counter += 1
    const employee = await asAdmin(() =>
      employees.create({
        tenant_id: tenant,
        employee_number: `E${counter}`,
        name: { use: 'official', text: 'Siti', given: [], prefix: [], suffix: [] },
        other_names: [],
        display_name: 'Siti',
        administrative_gender: null,
        workforce_category: { system: 'id.workforce-category', code: 'tenaga_medis' },
        is_clinical: true,
        profession: { system: 'id.profession', code: 'dokter' },
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
      }),
    )
    return employee.id
  }

  /**
   * Adds an SPK.
   *
   * @param employeeId - The practitioner.
   * @param override - Fields that replace the defaults.
   * @returns The appointment.
   */
  function addAppointment(
    employeeId: string,
    override: {
      start?: string
      end?: string
      status?: 'active' | 'suspended' | 'revoked' | 'expired'
      current?: boolean
      tenant?: string
      facilities?: string[]
      units?: string[]
      temporary?: boolean
    } = {},
  ) {
    counter += 1
    return asAdmin(() =>
      appointments.create({
        tenant_id: override.tenant ?? tenantId,
        appointment_number: `SPK/${counter}`,
        employee_id: employeeId,
        credentialing_facility_id: facilityId,
        credentialing_scope: 'facility',
        facility_ids: override.facilities ?? [facilityId],
        unit_ids: override.units ?? [unitId],
        source_application_id: new Types.ObjectId().toHexString(),
        valid_period: { start: override.start ?? '2026-01-01', end: override.end ?? '2028-12-31' },
        is_temporary: override.temporary ?? true,
        status: override.status ?? 'active',
        is_current: override.current ?? (override.status === undefined || override.status === 'active' || override.status === 'suspended'),
        issued: { by: { account_id: 'a1', display_name: 'Admin', kind: 'account' }, director_employee_id: employeeId, date: '2026-01-01' },
        signed_document: null,
        suspension: null,
        revocation: null,
        superseded_by_id: null,
      }),
    )
  }

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-03-10T12:00:00Z'))
    appointments = new InMemoryClinicalAppointments()
    grants = new InMemoryPrivilegeGrants()
    employees = new InMemoryEmployees()
    service = new AppointmentService(appointments, grants, employees)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('list', () => {
    it('lists the tenant\'s appointments, the soonest end of validity first, and never another tenant\'s', async () => {
      const person = await addEmployee()
      const late = await addAppointment(person, { end: '2030-01-01' })
      const soon = await addAppointment(person, { end: '2026-06-01' })
      await addAppointment(await addEmployee(otherTenantId), { tenant: otherTenantId, end: '2026-01-01' })

      const found = await service.list(tenantId, { limit: 100 })

      expect(found.map((item) => item.id)).toEqual([soon.id, late.id])
    })

    it('filters by status, practitioner, facility and unit', async () => {
      const one = await addEmployee()
      const two = await addEmployee()
      const active = await addAppointment(one)
      const revoked = await addAppointment(one, { status: 'revoked' })
      const elsewhere = await addAppointment(two, { facilities: [otherFacilityId], units: [] })

      const ids = async (query: object) => (await service.list(tenantId, { limit: 100, ...query })).map((item) => item.id)

      expect(await ids({ status: 'revoked' })).toEqual([revoked.id])
      expect(await ids({ employeeId: two })).toEqual([elsewhere.id])
      expect(await ids({ facilityId: otherFacilityId })).toEqual([elsewhere.id])
      expect((await ids({ unitId })).sort()).toEqual([active.id, revoked.id].sort())
      expect(await ids({ employeeId: new Types.ObjectId().toHexString() })).toEqual([])
    })

    it('finds the appointments ending within a number of days from today, current ones only, lapsed ones included', async () => {
      const person = await addEmployee()
      const lapsed = await addAppointment(person, { end: '2026-03-01' })
      const edge = await addAppointment(person, { end: '2026-04-09' })
      await addAppointment(person, { end: '2026-04-10' })
      await addAppointment(person, { end: '2026-03-20', status: 'revoked' })
      const suspended = await addAppointment(person, { end: '2026-03-15', status: 'suspended' })

      const found = await service.list(tenantId, { expiringInDays: 30, limit: 100 })

      expect(found.map((item) => item.id)).toEqual([lapsed.id, suspended.id, edge.id])
      expect((await service.list(tenantId, { expiringInDays: 0, limit: 100 })).map((item) => item.id)).toEqual([lapsed.id])
    })

    it('pages the list', async () => {
      const person = await addEmployee()
      for (let day = 1; day <= 3; day += 1) {
        await addAppointment(person, { end: `2027-01-0${day}` })
      }
      const first = await service.list(tenantId, { limit: 2 })
      const second = await service.list(tenantId, { limit: 2, offset: 2 })
      expect(first).toHaveLength(2)
      expect(second).toHaveLength(1)
    })
  })

  describe('listByEmployee', () => {
    it('lists one practitioner\'s appointments, the newest start first', async () => {
      const person = await addEmployee()
      const older = await addAppointment(person, { start: '2023-01-01', status: 'expired' })
      const newer = await addAppointment(person, { start: '2026-01-01', temporary: false })
      await addAppointment(await addEmployee(), { start: '2027-01-01' })

      const found = await service.listByEmployee(tenantId, person, {})

      expect(found.map((item) => item.id)).toEqual([newer.id, older.id])
    })

    it('answers 404 for a missing, malformed or foreign employee', async () => {
      const foreign = await addEmployee(otherTenantId)
      for (const id of [new Types.ObjectId().toHexString(), 'bad', foreign]) {
        await expect(service.listByEmployee(tenantId, id, {})).rejects.toMatchObject({
          kind: 'not_found',
          code: 'employee_not_found',
        })
      }
    })
  })

  describe('get', () => {
    it('returns the appointment with all its grants, whatever their status, ordered by code', async () => {
      const person = await addEmployee()
      const appointment = await addAppointment(person)
      const other = await addAppointment(await addEmployee())
      const grant = (code: string, status: 'active' | 'revoked', appointmentId: string) =>
        asAdmin(() =>
          grants.create({
            tenant_id: tenantId,
            appointment_id: appointmentId,
            employee_id: person,
            facility_ids: [facilityId],
            unit_ids: [unitId],
            catalog_item_id: new Types.ObjectId().toHexString(),
            code,
            condition: 'full',
            supervisor: null,
            restriction_notes: null,
            status,
            status_change: null,
            flag: null,
          }),
        )
      await grant('PD-2', 'revoked', appointment.id)
      await grant('PD-1', 'active', appointment.id)
      await grant('PD-9', 'active', other.id)

      const found = await service.get(tenantId, appointment.id)

      expect(found.appointment.id).toBe(appointment.id)
      expect(found.grants.map((item) => item.code)).toEqual(['PD-1', 'PD-2'])
    })

    it('answers 404 for a missing, malformed or foreign appointment', async () => {
      const foreign = await addAppointment(await addEmployee(otherTenantId), { tenant: otherTenantId })
      for (const id of [new Types.ObjectId().toHexString(), 'bad', foreign.id]) {
        await expect(service.get(tenantId, id)).rejects.toMatchObject({
          kind: 'not_found',
          code: 'appointment_not_found',
        })
      }
    })
  })
})
