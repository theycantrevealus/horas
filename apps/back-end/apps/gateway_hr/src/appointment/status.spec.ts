import { Logger } from '@nestjs/common'
import { Types } from 'mongoose'
import { PERMISSIONS } from '@identity/permission'
import { createHrGateway, type HrGateway } from '../testing/hr-gateway'
import {
  createInMemoryWorkforce,
  type InMemoryWorkforce,
} from '../testing/in-memory-workforce'
import { AppointmentManagementModule } from './appointment-management.module'

describe('SPK and grant decision endpoints (in-memory repositories)', () => {
  const workforce: InMemoryWorkforce = createInMemoryWorkforce()
  let gateway: HrGateway
  let call: HrGateway['call']
  let tenantId: string
  let otherTenantId: string
  let facilityId: string
  let directorToken: string
  let readerToken: string
  let otherTenantToken: string
  let counter = 0
  const actor = { account_id: 'a9', display_name: 'Director', kind: 'account' as const }
  const decision = { reason: 'Temuan Rahasia', decisionNumber: 'SK/09/2026' }

  /**
   * Stores an SPK.
   *
   * @param status - Status of the SPK.
   * @param tenant - Tenant of the SPK.
   * @returns The appointment identifier and its practitioner.
   */
  async function addAppointment(
    status: 'active' | 'suspended' | 'revoked' | 'expired' = 'active',
    tenant = tenantId,
  ): Promise<{ id: string; employee: string }> {
    counter += 1
    const employee = new Types.ObjectId().toHexString()
    const appointment = await workforce.appointments.create({
      tenant_id: tenant,
      appointment_number: `SPK/${counter}`,
      employee_id: employee,
      credentialing_facility_id: facilityId,
      credentialing_scope: 'facility',
      facility_ids: [facilityId],
      unit_ids: [],
      source_application_id: new Types.ObjectId().toHexString(),
      valid_period: { start: '2026-01-01', end: '2028-12-31' },
      is_temporary: false,
      status,
      is_current: status === 'active' || status === 'suspended',
      issued: { by: actor, director_employee_id: employee, date: '2026-01-01' },
      signed_document: null,
      suspension: null,
      revocation: null,
      superseded_by_id: null,
    })
    return { id: appointment.id, employee }
  }

  /**
   * Stores a grant of an SPK.
   *
   * @param appointment - The SPK and its practitioner.
   * @param override - Fields that replace the defaults.
   * @param tenant - Tenant of the grant.
   * @returns The grant identifier.
   */
  async function addGrant(
    appointment: { id: string; employee: string },
    override: {
      code?: string
      condition?: 'full' | 'supervised' | 'restricted'
      supervisorGrant?: string
      status?: 'active' | 'suspended' | 'revoked'
    } = {},
    tenant = tenantId,
  ): Promise<string> {
    counter += 1
    const grant = await workforce.grants.create({
      tenant_id: tenant,
      appointment_id: appointment.id,
      employee_id: appointment.employee,
      facility_ids: [facilityId],
      unit_ids: [],
      catalog_item_id: new Types.ObjectId().toHexString(),
      code: override.code ?? `PD-${counter}`,
      condition: override.condition ?? 'full',
      supervisor: override.supervisorGrant
        ? { employee_id: new Types.ObjectId().toHexString(), grant_id: override.supervisorGrant }
        : null,
      restriction_notes: override.condition === 'restricted' ? 'Rawat jalan' : null,
      status: override.status ?? 'active',
      status_change: null,
      flag: null,
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

  const act = (path: string, body: object = decision, token = directorToken) =>
    call('POST', path, token, body)
  const grantsOf = async (employee: string) =>
    (await call('GET', `/v1/privilege-grants?employeeId=${employee}&status=all&limit=100`, directorToken)).body as {
      id: string
      status: string
      flag: { resolved_at: string | null } | null
    }[]

  beforeAll(async () => {
    gateway = await createHrGateway({
      modules: [AppointmentManagementModule],
      ...workforce.options,
    })
    call = gateway.call
    ;({ tenantId, otherTenantId } = gateway)
    facilityId = (
      await workforce.facilities.create({
        tenant_id: tenantId,
        organization_id: new Types.ObjectId().toHexString(),
        code: 'rs-sehat',
        name: [{ locale: 'en', text: 'RS' }],
        address: null,
        timezone: 'Asia/Jakarta',
        holiday_calendar_codes: [],
        external_ids: [],
        status: 'active',
      })
    ).id
    directorToken = await gateway.seedAndLogin(tenantId, 'director', [
      PERMISSIONS.WORKFORCE_CREDENTIAL_DECIDE,
      PERMISSIONS.WORKFORCE_PRIVILEGE_GRANT_READ,
      PERMISSIONS.WORKFORCE_CLINICAL_APPOINTMENT_READ,
    ])
    readerToken = await gateway.seedAndLogin(tenantId, 'reader', [
      PERMISSIONS.WORKFORCE_PRIVILEGE_GRANT_READ,
      PERMISSIONS.WORKFORCE_CLINICAL_APPOINTMENT_READ,
    ])
    otherTenantToken = await gateway.seedAndLogin(otherTenantId, 'other', [PERMISSIONS.WORKFORCE_CREDENTIAL_DECIDE])
  })

  afterAll(async () => {
    await gateway.close()
  })

  it('refuses every route without a token (401) and without the decide permission (403)', async () => {
    const id = new Types.ObjectId().toHexString()
    const paths = [
      `/v1/clinical-appointments/${id}/suspend`,
      `/v1/clinical-appointments/${id}/lift-suspension`,
      `/v1/clinical-appointments/${id}/revoke`,
      `/v1/privilege-grants/${id}/suspend`,
      `/v1/privilege-grants/${id}/lift-suspension`,
      `/v1/privilege-grants/${id}/revoke`,
    ]
    for (const path of paths) {
      expect((await call('POST', path, undefined, decision)).status).toBe(401)
      expect((await act(path, decision, readerToken)).status).toBe(403)
    }
  })

  it('suspends, lifts and revokes an SPK, and revokes its grants with it', async () => {
    const spk = await addAppointment()
    const live = await addGrant(spk)
    const suspendedGrant = await addGrant(spk, { status: 'suspended' })

    const suspended = await act(`/v1/clinical-appointments/${spk.id}/suspend`)
    expect(suspended.status).toBe(201)
    expect(suspended.body).toMatchObject({
      appointment: {
        id: spk.id,
        status: 'suspended',
        is_current: true,
        suspension: { reason: 'Temuan Rahasia', decision_ref: { number: 'SK/09/2026', document: null } },
      },
      grants: [{ status: 'active' }, { status: 'suspended' }],
    })
    expect(JSON.stringify(suspended.body)).not.toContain('"_id"')
    expect(((suspended.body as Record<string, any>).appointment.suspension.effective_date as string)).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    const lifted = await act(`/v1/clinical-appointments/${spk.id}/lift-suspension`, { reason: 'Selesai', decisionNumber: 'SK/10/2026' })
    expect(lifted.status).toBe(201)
    expect(lifted.body).toMatchObject({ appointment: { status: 'active', suspension: null } })

    const revoked = await act(`/v1/clinical-appointments/${spk.id}/revoke`)
    expect(revoked.status).toBe(201)
    expect(revoked.body).toMatchObject({
      appointment: { status: 'revoked', is_current: false, revocation: { reason: 'Temuan Rahasia' } },
    })
    const states = await grantsOf(spk.employee)
    expect(states.map((grant) => grant.status)).toEqual(['revoked', 'revoked'])
    expect(states.map((grant) => grant.id).sort()).toEqual([live, suspendedGrant].sort())

    const again = await act(`/v1/clinical-appointments/${spk.id}/revoke`)
    expect(again.status).toBe(422)
    expect(again.body).toMatchObject({ code: 'invalid_transition' })
  })

  it('suspends, lifts and revokes a grant, and keeps the supervisor flags in step (HR-CRD-006)', async () => {
    const supervisorSpk = await addAppointment()
    const full = await addGrant(supervisorSpk, { code: 'PD-F' })
    const practitionerSpk = await addAppointment()
    const supervised = await addGrant(practitionerSpk, { code: 'PD-S', condition: 'supervised', supervisorGrant: full })
    const flagOf = async () => (await grantsOf(practitionerSpk.employee)).find((grant) => grant.id === supervised)?.flag

    const suspended = await act(`/v1/privilege-grants/${full}/suspend`)
    expect(suspended.status).toBe(201)
    expect(suspended.body).toMatchObject({ id: full, status: 'suspended', status_change: { decision_ref: { number: 'SK/09/2026' } } })
    expect(await flagOf()).toMatchObject({ reason: 'supervisor_lost_privilege', resolved_at: null })
    const flagged = await call('GET', '/v1/privilege-grants?flagged=true&limit=100', directorToken)
    expect((flagged.body as { id: string }[]).map((grant) => grant.id)).toContain(supervised)

    const lifted = await act(`/v1/privilege-grants/${full}/lift-suspension`, { reason: 'Selesai', decisionNumber: 'SK/10/2026' })
    expect(lifted.status).toBe(201)
    expect(lifted.body).toMatchObject({ status: 'active', status_change: null })
    expect((await flagOf())?.resolved_at).not.toBeNull()

    const revoked = await act(`/v1/privilege-grants/${full}/revoke`)
    expect(revoked.status).toBe(201)
    expect(revoked.body).toMatchObject({ status: 'revoked' })
    expect((await flagOf())?.resolved_at).toBeNull()
    expect((await act(`/v1/privilege-grants/${full}/suspend`)).body).toMatchObject({ code: 'invalid_transition' })
  })

  it('refuses a change to a grant of an SPK that is no longer current', async () => {
    const closed = await addAppointment('revoked')
    const grant = await addGrant(closed)
    for (const route of ['suspend', 'lift-suspension', 'revoke']) {
      const reply = await act(`/v1/privilege-grants/${grant}/${route}`)
      expect(reply.status).toBe(422)
      expect(reply.body).toMatchObject({ code: 'appointment_not_current' })
    }
  })

  it('answers 404 for a missing, malformed or foreign id on every route', async () => {
    const foreignSpk = await addAppointment('active', otherTenantId)
    const foreignGrant = await addGrant(foreignSpk, {}, otherTenantId)
    const unknown = new Types.ObjectId().toHexString()
    for (const route of ['suspend', 'lift-suspension', 'revoke']) {
      for (const id of [unknown, 'bad', foreignSpk.id]) {
        const reply = await act(`/v1/clinical-appointments/${id}/${route}`)
        expect(reply.status).toBe(404)
        expect(reply.body).toMatchObject({ code: 'appointment_not_found' })
      }
      for (const id of [unknown, 'bad', foreignGrant]) {
        const reply = await act(`/v1/privilege-grants/${id}/${route}`)
        expect(reply.status).toBe(404)
        expect(reply.body).toMatchObject({ code: 'grant_not_found' })
      }
    }
    const mine = await addAppointment()
    expect((await act(`/v1/clinical-appointments/${mine.id}/suspend`, decision, otherTenantToken)).status).toBe(404)
  })

  it('answers 422 for the business rules and 409 for a stale version', async () => {
    const active = await addAppointment()
    const lift = await act(`/v1/clinical-appointments/${active.id}/lift-suspension`)
    expect(lift.status).toBe(422)
    expect(lift.body).toMatchObject({ code: 'invalid_transition' })
    expect((await act(`/v1/clinical-appointments/${active.id}/suspend`, { ...decision, reason: ' ' })).body).toMatchObject({ code: 'reason_required' })
    expect((await act(`/v1/clinical-appointments/${active.id}/suspend`, { ...decision, reason: 'x'.repeat(501) })).body).toMatchObject({ code: 'invalid_reason' })
    expect((await act(`/v1/clinical-appointments/${active.id}/suspend`, { ...decision, decisionNumber: ' ' })).body).toMatchObject({ code: 'decision_number_required' })
    const stale = await act(`/v1/clinical-appointments/${active.id}/suspend`, { ...decision, version: 99 })
    expect(stale.status).toBe(409)
    expect(stale.body).toMatchObject({ code: 'stale_version' })
    expect((await call('GET', `/v1/clinical-appointments/${active.id}`, readerToken)).body).toMatchObject({ appointment: { status: 'active' } })
  })

  it('validates the request: 400 for shape', async () => {
    const spk = await addAppointment()
    const path = `/v1/clinical-appointments/${spk.id}/suspend`
    for (const body of [{}, { reason: 'x' }, { decisionNumber: 'SK/1' }, { reason: 5, decisionNumber: 'SK/1' }, { ...decision, version: -1 }, { ...decision, decisionNumber: 'S'.repeat(201) }]) {
      expect((await act(path, body)).status).toBe(400)
    }
  })

  it('logs one entry per decision, without the reason or the decision number', async () => {
    const spk = await addAppointment()
    const grant = await addGrant(spk)
    const { written, restore } = captureLogs()
    try {
      await act(`/v1/privilege-grants/${grant}/suspend`)
      await act(`/v1/clinical-appointments/${spk.id}/revoke`)
      await vi.waitFor(() =>
        expect(written.filter((entry) => entry.event === 'http_request')).toHaveLength(2),
      )

      expect(written.filter((entry) => entry.event !== 'http_request').map((entry) => entry.event)).toEqual([
        'grant_suspend',
        'appointment_revoke',
      ])
      for (const text of ['Temuan Rahasia', 'SK/09/2026']) {
        expect(JSON.stringify(written)).not.toContain(text)
      }
    } finally {
      restore()
    }
  })
})
