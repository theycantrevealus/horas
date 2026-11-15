import { Logger } from '@nestjs/common'
import { Types } from 'mongoose'
import { PERMISSIONS } from '@identity/permission'
import { createHrGateway, type HrGateway } from '../testing/hr-gateway'
import {
  createInMemoryWorkforce,
  type InMemoryWorkforce,
} from '../testing/in-memory-workforce'
import { AppointmentManagementModule } from './appointment-management.module'

describe('clinical appointment and privilege directory endpoints (in-memory repositories)', () => {
  const workforce: InMemoryWorkforce = createInMemoryWorkforce()
  let gateway: HrGateway
  let call: HrGateway['call']
  let tenantId: string
  let otherTenantId: string
  let facilityId: string
  let otherFacilityId: string
  let unitId: string
  let itemOne: string
  let itemTwo: string
  let employeeId: string
  let otherEmployeeId: string
  let appointmentToken: string
  let grantToken: string
  let strangerToken: string
  let otherTenantToken: string
  let counter = 0
  const actor = { account_id: 'a1', display_name: 'Director', kind: 'account' as const }

  /**
   * Adds an employee to a tenant.
   *
   * @param tenant - Tenant of the employee.
   * @returns The employee identifier.
   */
  async function addEmployee(tenant = tenantId): Promise<string> {
    counter += 1
    const employee = await workforce.employees.create({
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
    })
    return employee.id
  }

  /**
   * Stores an SPK.
   *
   * @param employee - The practitioner.
   * @param override - Fields that replace the defaults.
   * @returns The appointment identifier.
   */
  async function addAppointment(
    employee: string,
    override: {
      start?: string
      end?: string
      status?: 'active' | 'suspended' | 'revoked'
      facilities?: string[]
      tenant?: string
    } = {},
  ): Promise<string> {
    counter += 1
    const status = override.status ?? 'revoked'
    const appointment = await workforce.appointments.create({
      tenant_id: override.tenant ?? tenantId,
      appointment_number: `SPK/${counter}`,
      employee_id: employee,
      credentialing_facility_id: facilityId,
      credentialing_scope: 'facility',
      facility_ids: override.facilities ?? [facilityId],
      unit_ids: [unitId],
      source_application_id: new Types.ObjectId().toHexString(),
      valid_period: { start: override.start ?? '2026-01-01', end: override.end ?? '2028-12-31' },
      is_temporary: true,
      status,
      is_current: status !== 'revoked',
      issued: { by: actor, director_employee_id: employee, date: '2026-01-01' },
      signed_document: null,
      suspension: null,
      revocation: null,
      superseded_by_id: null,
    })
    return appointment.id
  }

  /**
   * Stores a grant of an SPK.
   *
   * @param appointmentId - The SPK.
   * @param employee - The practitioner.
   * @param override - Fields that replace the defaults.
   * @returns The grant identifier.
   */
  async function addGrant(
    appointmentId: string,
    employee: string,
    override: {
      code?: string
      item?: string
      status?: 'active' | 'suspended' | 'revoked'
      condition?: 'full' | 'supervised' | 'restricted'
      flagged?: boolean
    } = {},
  ): Promise<string> {
    const grant = await workforce.grants.create({
      tenant_id: tenantId,
      appointment_id: appointmentId,
      employee_id: employee,
      facility_ids: [facilityId],
      unit_ids: [unitId],
      catalog_item_id: override.item ?? itemOne,
      code: override.code ?? 'PD-1',
      condition: override.condition ?? 'full',
      supervisor: null,
      restriction_notes: null,
      status: override.status ?? 'active',
      status_change: null,
      flag: override.flagged
        ? { reason: 'supervisor_lost_privilege', at: new Date('2026-03-01T00:00:00Z'), resolved_at: null }
        : null,
    })
    return grant.id
  }

  /**
   * Captures every entry the application writes through Nest's logger.
   *
   * @returns The entries and a function that restores the logger.
   */
  function captureLogs(): {
    written: Record<string, unknown>[]
    restore: () => void
  } {
    const written: Record<string, unknown>[] = []
    const spies = (['log', 'warn', 'error', 'debug', 'verbose'] as const).map(
      (level) =>
        vi
          .spyOn(Logger.prototype, level)
          .mockImplementation((entry: unknown) => {
            if (typeof entry === 'object' && entry !== null) {
              written.push(entry as Record<string, unknown>)
            }
          }),
    )
    return { written, restore: () => spies.forEach((spy) => spy.mockRestore()) }
  }

  beforeAll(async () => {
    gateway = await createHrGateway({
      modules: [AppointmentManagementModule],
      ...workforce.options,
    })
    call = gateway.call
    ;({ tenantId, otherTenantId } = gateway)
    facilityId = new Types.ObjectId().toHexString()
    otherFacilityId = new Types.ObjectId().toHexString()
    unitId = new Types.ObjectId().toHexString()
    itemOne = new Types.ObjectId().toHexString()
    itemTwo = new Types.ObjectId().toHexString()
    employeeId = await addEmployee()
    otherEmployeeId = await addEmployee()
    appointmentToken = await gateway.seedAndLogin(tenantId, 'appointments', [PERMISSIONS.WORKFORCE_CLINICAL_APPOINTMENT_READ])
    grantToken = await gateway.seedAndLogin(tenantId, 'grants', [PERMISSIONS.WORKFORCE_PRIVILEGE_GRANT_READ])
    strangerToken = await gateway.seedAndLogin(tenantId, 'stranger', [])
    otherTenantToken = await gateway.seedAndLogin(otherTenantId, 'other', [
      PERMISSIONS.WORKFORCE_CLINICAL_APPOINTMENT_READ,
      PERMISSIONS.WORKFORCE_PRIVILEGE_GRANT_READ,
    ])
  })

  afterAll(async () => {
    await gateway.close()
  })

  it('refuses every route without a token (401) and without its own permission (403)', async () => {
    const id = new Types.ObjectId().toHexString()
    const routes: [string, string][] = [
      ['/v1/clinical-appointments', appointmentToken],
      [`/v1/clinical-appointments/${id}`, appointmentToken],
      [`/v1/employees/${id}/clinical-appointments`, appointmentToken],
      ['/v1/privilege-grants', grantToken],
    ]
    for (const [url, allowed] of routes) {
      expect((await call('GET', url)).status).toBe(401)
      expect((await call('GET', url, strangerToken)).status).toBe(403)
      // each read permission opens only its own routes
      const wrong = allowed === appointmentToken ? grantToken : appointmentToken
      expect((await call('GET', url, wrong)).status).toBe(403)
    }
  })

  it('lists SPKs the soonest end first with filters, and never another tenant\'s', async () => {
    const soon = await addAppointment(employeeId, { end: '2026-03-31', status: 'active' })
    const late = await addAppointment(employeeId, { end: '2031-01-01', status: 'suspended' })
    const elsewhere = await addAppointment(otherEmployeeId, { facilities: [otherFacilityId], status: 'active' })
    await addAppointment(await addEmployee(otherTenantId), { tenant: otherTenantId, end: '2020-01-01', status: 'active' })

    const all = await call('GET', '/v1/clinical-appointments?limit=100', appointmentToken)
    expect(all.status).toBe(200)
    const ids = (all.body as { id: string }[]).map((item) => item.id)
    expect(ids.indexOf(soon)).toBeLessThan(ids.indexOf(late))
    expect(JSON.stringify(all.body)).not.toContain('"_id"')
    expect((all.body as Record<string, unknown>[]).every((item) => item.tenant_id === tenantId)).toBe(true)

    const bySuspended = await call('GET', '/v1/clinical-appointments?status=suspended', appointmentToken)
    expect((bySuspended.body as { id: string }[]).map((item) => item.id)).toContain(late)
    expect((bySuspended.body as { status: string }[]).every((item) => item.status === 'suspended')).toBe(true)
    const byFacility = await call('GET', `/v1/clinical-appointments?facilityId=${otherFacilityId}`, appointmentToken)
    expect((byFacility.body as { id: string }[]).map((item) => item.id)).toEqual([elsewhere])
    const byEmployee = await call('GET', `/v1/clinical-appointments?employeeId=${otherEmployeeId}&unitId=${unitId}`, appointmentToken)
    expect((byEmployee.body as { id: string }[]).map((item) => item.id)).toEqual([elsewhere])
    const expiring = await call('GET', '/v1/clinical-appointments?expiringInDays=3650', appointmentToken)
    expect((expiring.body as { is_current: boolean }[]).every((item) => item.is_current)).toBe(true)
    const none = await call('GET', '/v1/clinical-appointments?expiringInDays=0&employeeId=' + employeeId, appointmentToken)
    expect((none.body as { id: string }[]).map((item) => item.id)).not.toContain(late)
  })

  it('lists one practitioner\'s SPKs, the newest start first, and answers 404 for a missing, malformed or foreign employee', async () => {
    const person = await addEmployee()
    const older = await addAppointment(person, { start: '2023-01-01' })
    const newer = await addAppointment(person, { start: '2026-01-01', status: 'active' })

    const reply = await call('GET', `/v1/employees/${person}/clinical-appointments`, appointmentToken)

    expect(reply.status).toBe(200)
    expect((reply.body as { id: string }[]).map((item) => item.id)).toEqual([newer, older])
    const foreign = await addEmployee(otherTenantId)
    for (const id of [new Types.ObjectId().toHexString(), 'bad', foreign]) {
      const missing = await call('GET', `/v1/employees/${id}/clinical-appointments`, appointmentToken)
      expect(missing.status).toBe(404)
      expect(missing.body).toMatchObject({ code: 'employee_not_found' })
    }
  })

  it('returns one SPK with all its grants, and answers 404 for a missing, malformed or foreign id', async () => {
    const person = await addEmployee()
    const appointment = await addAppointment(person, { status: 'active' })
    await addGrant(appointment, person, { code: 'PD-2', item: itemTwo, status: 'revoked' })
    await addGrant(appointment, person, { code: 'PD-1' })

    const reply = await call('GET', `/v1/clinical-appointments/${appointment}`, appointmentToken)

    expect(reply.status).toBe(200)
    const body = reply.body as { appointment: { id: string; appointment_number: string }; grants: { code: string; status: string }[] }
    expect(body.appointment.id).toBe(appointment)
    expect(body.grants.map((grant) => grant.code)).toEqual(['PD-1', 'PD-2'])
    expect(JSON.stringify(body)).not.toContain('"_id"')
    const foreign = await addAppointment(await addEmployee(otherTenantId), { tenant: otherTenantId })
    for (const id of [new Types.ObjectId().toHexString(), 'bad', foreign]) {
      const missing = await call('GET', `/v1/clinical-appointments/${id}`, appointmentToken)
      expect(missing.status).toBe(404)
      expect(missing.body).toMatchObject({ code: 'appointment_not_found' })
    }
    expect((await call('GET', `/v1/clinical-appointments/${appointment}`, otherTenantToken)).status).toBe(404)
  })

  it('serves the privilege directory: active grants by default, any status, and the open flag', async () => {
    const person = await addEmployee()
    const appointment = await addAppointment(person, { status: 'active' })
    const active = await addGrant(appointment, person, { code: 'PD-A', item: itemTwo })
    const suspended = await addGrant(appointment, person, { code: 'PD-B', item: new Types.ObjectId().toHexString(), status: 'suspended' })
    const flagged = await addGrant(appointment, person, { code: 'PD-C', item: new Types.ObjectId().toHexString(), condition: 'supervised', flagged: true })

    const ids = async (query: string) =>
      ((await call('GET', `/v1/privilege-grants?employeeId=${person}&limit=100${query}`, grantToken)).body as { id: string }[]).map((item) => item.id)

    expect(await ids('')).toEqual([active, flagged])
    expect(await ids('&status=suspended')).toEqual([suspended])
    expect(await ids('&status=all')).toEqual([active, suspended, flagged])
    expect(await ids('&flagged=true')).toEqual([flagged])
    expect(await ids('&flagged=false')).toEqual([active])
    expect(await ids(`&catalogItemId=${itemTwo}`)).toEqual([active])
    expect(await ids('&condition=supervised')).toEqual([flagged])
    expect(await ids(`&facilityId=${facilityId}&unitId=${unitId}`)).toEqual([active, flagged])
    expect(await ids(`&facilityId=${otherFacilityId}`)).toEqual([])
    const other = await call('GET', `/v1/privilege-grants?employeeId=${person}`, otherTenantToken)
    expect(other.body).toEqual([])
  })

  it('validates the query: 400 for a bad limit, offset, status, flag or identifier', async () => {
    const queries = [
      ['/v1/clinical-appointments', ['limit=0', 'limit=101', 'offset=-1', 'status=gone', 'employeeId=bad', 'facilityId=bad', 'unitId=bad', 'expiringInDays=-1', 'expiringInDays=3651']],
      [`/v1/employees/${employeeId}/clinical-appointments`, ['limit=0', 'limit=101', 'offset=-1']],
      ['/v1/privilege-grants', ['limit=0', 'limit=101', 'offset=-1', 'status=gone', 'condition=any', 'flagged=maybe', 'catalogItemId=bad', 'employeeId=bad', 'facilityId=bad', 'unitId=bad']],
    ] as const
    for (const [path, list] of queries) {
      for (const query of list) {
        const token = path === '/v1/privilege-grants' ? grantToken : appointmentToken
        expect((await call('GET', `${path}?${query}`, token)).status).toBe(400)
      }
    }
  })

  it('writes no log entry when data is only read, except the access log of the request', async () => {
    const person = await addEmployee()
    const appointment = await addAppointment(person, { status: 'active' })
    await addGrant(appointment, person)
    const { written, restore } = captureLogs()
    try {
      const replies = [
        await call('GET', '/v1/clinical-appointments', appointmentToken),
        await call('GET', `/v1/clinical-appointments/${appointment}`, appointmentToken),
        await call('GET', '/v1/clinical-appointments/missing-id', appointmentToken),
        await call('GET', `/v1/employees/${person}/clinical-appointments`, appointmentToken),
        await call('GET', `/v1/employees/${new Types.ObjectId().toHexString()}/clinical-appointments`, appointmentToken),
        await call('GET', '/v1/privilege-grants', grantToken),
      ]
      expect(replies.map((reply) => reply.status)).toEqual([200, 200, 404, 200, 404, 200])
      await vi.waitFor(() =>
        expect(written.filter((entry) => entry.event === 'http_request')).toHaveLength(replies.length),
      )

      expect(written.filter((entry) => entry.event !== 'http_request')).toEqual([])
    } finally {
      restore()
    }
  })
})
