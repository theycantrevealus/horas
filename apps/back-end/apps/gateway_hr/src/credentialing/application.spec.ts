import { Logger } from '@nestjs/common'
import { Types } from 'mongoose'
import { PERMISSIONS } from '@identity/permission'
import { createHrGateway, type HrGateway } from '../testing/hr-gateway'
import {
  createInMemoryWorkforce,
  type InMemoryWorkforce,
} from '../testing/in-memory-workforce'
import { CredentialingManagementModule } from './credentialing-management.module'

describe('credential application endpoints (in-memory repositories)', () => {
  const workforce: InMemoryWorkforce = createInMemoryWorkforce()
  let gateway: HrGateway
  let call: HrGateway['call']
  let writerToken: string
  let readerToken: string
  let otherTenantToken: string
  let tenantId: string
  let otherTenantId: string
  let facilityId: string
  let otherFacilityId: string
  let unitId: string
  let otherUnitId: string
  let employeeId: string
  let itemId: string
  let counter = 0

  const certificate = { system: 'id.evidence-type', code: 'certificate' }
  const file = {
    fileId: 'file-1',
    contentType: 'application/pdf',
    sha256: 'a'.repeat(64),
  }

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
   * Adds a catalog item.
   *
   * @param mandatory - Whether it needs a mandatory certificate, or `undefined` for no evidence.
   * @returns The item identifier.
   */
  async function addItem(mandatory?: boolean): Promise<string> {
    counter += 1
    const item = await workforce.privileges.create({
      tenant_id: tenantId,
      facility_ids: [],
      code: `PD-${counter}`,
      name: [{ locale: 'en', text: 'Item' }],
      description: [],
      committee: { system: 'id.committee', code: 'komite_medik' },
      professions: [{ system: 'id.profession', code: 'dokter' }],
      specialties: [],
      min_clinical_level: null,
      required_evidence:
        mandatory === undefined
          ? []
          : [{ type: certificate, description: [{ locale: 'en', text: 'x' }], mandatory }],
      external_codes: [],
      status: 'active',
    })
    return item.id
  }

  /**
   * Starts an application through the API as the writer.
   *
   * @param override - Fields that replace the defaults.
   * @returns The reply.
   */
  function start(override: object = {}) {
    return call('POST', '/v1/credential-applications', writerToken, {
      employeeId,
      credentialingFacilityId: facilityId,
      type: 'initial',
      requestedPrivileges: [{ catalogItemId: itemId, requestedCondition: 'full' }],
      requestedUnitIds: [unitId],
      ...override,
    })
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
      modules: [CredentialingManagementModule],
      ...workforce.options,
    })
    call = gateway.call
    ;({ tenantId, otherTenantId } = gateway)
    writerToken = await gateway.seedAndLogin(tenantId, 'writer', [
      PERMISSIONS.WORKFORCE_CREDENTIAL_APPLICATION_READ,
      PERMISSIONS.WORKFORCE_CREDENTIAL_APPLICATION_WRITE,
    ])
    readerToken = await gateway.seedAndLogin(tenantId, 'reader', [
      PERMISSIONS.WORKFORCE_CREDENTIAL_APPLICATION_READ,
    ])
    otherTenantToken = await gateway.seedAndLogin(otherTenantId, 'other', [
      PERMISSIONS.WORKFORCE_CREDENTIAL_APPLICATION_READ,
      PERMISSIONS.WORKFORCE_CREDENTIAL_APPLICATION_WRITE,
    ])
    const concepts: [string, string, Record<string, unknown>][] = [
      ['id.workforce-category', 'tenaga_medis', { is_clinical: true, credentialing_committee: 'komite_medik' }],
      ['id.committee', 'komite_medik', {}],
      ['id.evidence-type', 'certificate', {}],
    ]
    for (const [system, code, properties] of concepts) {
      await workforce.codeConcepts.create({
        system,
        code,
        display: [{ locale: 'en', text: code }],
        properties,
        mappings: [],
        period: null,
        status: 'active',
      })
    }
    const organizationId = new Types.ObjectId().toHexString()
    const makeFacility = async (code: string) =>
      (
        await workforce.facilities.create({
          tenant_id: tenantId,
          organization_id: organizationId,
          code,
          name: [{ locale: 'en', text: 'RS' }],
          address: null,
          timezone: 'Asia/Jakarta',
          holiday_calendar_codes: [],
          external_ids: [],
          status: 'active',
        })
      ).id
    const makeUnit = async (facility: string, code: string) =>
      (
        await workforce.units.create({
          tenant_id: tenantId,
          organization_id: organizationId,
          facility_id: facility,
          code,
          name: [{ locale: 'en', text: 'Ward' }],
          type: { system: 'id.unit-type', code: 'ward' },
          parent_id: null,
          ancestor_ids: [],
          is_clinical: true,
          external_ids: [],
          period: { start: '2026-01-01', end: null },
          status: 'active',
        })
      ).id
    facilityId = await makeFacility('rs-sehat')
    otherFacilityId = await makeFacility('rs-lain')
    unitId = await makeUnit(facilityId, 'ward-a')
    otherUnitId = await makeUnit(otherFacilityId, 'ward-b')
    employeeId = await addEmployee()
    itemId = await addItem()
  })

  afterAll(async () => {
    await gateway.close()
  })

  it('refuses every route without a token (401) and without its own permission (403)', async () => {
    const id = new Types.ObjectId().toHexString()
    const routes: ['GET' | 'POST' | 'PATCH', string, object | undefined][] = [
      ['GET', '/v1/credential-applications', undefined],
      ['POST', '/v1/credential-applications', {}],
      ['GET', `/v1/credential-applications/${id}`, undefined],
      ['PATCH', `/v1/credential-applications/${id}`, {}],
      ['POST', `/v1/credential-applications/${id}/submit`, {}],
      ['POST', `/v1/credential-applications/${id}/withdraw`, {}],
    ]
    for (const [method, url, payload] of routes) {
      expect((await call(method, url, undefined, payload)).status).toBe(401)
    }
    for (const [method, url, payload] of routes.filter(([method]) => method !== 'GET')) {
      expect((await call(method, url, readerToken, payload)).status).toBe(403)
    }
  })

  it('starts a draft, reads it, finds it in the queue, edits it, submits it and withdraws another', async () => {
    const created = await start({ documents: [{ type: certificate, file }] })

    expect(created.status).toBe(201)
    const body = created.body as Record<string, any>
    expect(body).toMatchObject({
      employee_id: employeeId,
      credentialing_facility_id: facilityId,
      credentialing_scope: 'facility',
      type: 'initial',
      committee: { code: 'komite_medik' },
      status: 'draft',
      requested_unit_ids: [unitId],
      requested_facility_ids: [facilityId],
      documents: [{ type: { code: 'certificate' }, file: { file_id: 'file-1' } }],
      assessors: [],
      recommendation: null,
    })
    expect(body).not.toHaveProperty('_id')
    const read = await call('GET', `/v1/credential-applications/${body.id}`, readerToken)
    const queue = await call('GET', '/v1/credential-applications?status=draft&committee=komite_medik', readerToken)
    expect(read.status).toBe(200)
    expect((queue.body as Record<string, any>[]).map((a) => a.id)).toContain(body.id)

    const second = await addItem()
    const edited = await call('PATCH', `/v1/credential-applications/${body.id}`, writerToken, {
      requestedPrivileges: [{ catalogItemId: second, requestedCondition: 'restricted' }],
      version: body.version,
    })
    expect(edited.status).toBe(200)
    expect(edited.body).toMatchObject({ requested_privileges: [{ requested_condition: 'restricted' }] })
    const submitted = await call('POST', `/v1/credential-applications/${body.id}/submit`, writerToken, {})
    expect(submitted.status).toBe(201)
    expect(submitted.body).toMatchObject({ status: 'submitted' })

    const another = (await start()).body as Record<string, any>
    const withdrawn = await call('POST', `/v1/credential-applications/${another.id}/withdraw`, writerToken, {
      reason: 'Tidak jadi',
    })
    expect(withdrawn.status).toBe(201)
    expect(withdrawn.body).toMatchObject({ status: 'withdrawn', withdrawal_reason: 'Tidak jadi' })
    const again = await call('POST', `/v1/credential-applications/${another.id}/withdraw`, writerToken, { reason: 'x' })
    expect(again.status).toBe(422)
    expect(again.body).toMatchObject({ code: 'invalid_transition' })
  })

  it('starts a re-credentialing and a privilege extension of the applicant\'s SPK, and refuses the rules of a renewal', async () => {
    const newSpk = (employee: string, number: string) =>
      workforce.appointments.create({
      tenant_id: tenantId,
      appointment_number: number,
      employee_id: employee,
      credentialing_facility_id: facilityId,
      credentialing_scope: 'facility',
      facility_ids: [facilityId],
      unit_ids: [unitId],
      source_application_id: new Types.ObjectId().toHexString(),
      valid_period: { start: '2026-01-01', end: '2028-12-31' },
      is_temporary: false,
      status: 'active',
      is_current: true,
      issued: { by: { account_id: 'a1', display_name: 'Director', kind: 'account' }, director_employee_id: employeeId, date: '2026-01-01' },
      signed_document: null,
      suspension: null,
      revocation: null,
      superseded_by_id: null,
    })
    const spk = await newSpk(employeeId, 'SPK/RENEW/1')
    const held = await addItem()
    await workforce.grants.create({
      tenant_id: tenantId,
      appointment_id: spk.id,
      employee_id: employeeId,
      facility_ids: [facilityId],
      unit_ids: [unitId],
      catalog_item_id: held,
      code: 'PD-HELD',
      condition: 'full',
      supervisor: null,
      restriction_notes: null,
      status: 'active',
      status_change: null,
      flag: null,
    })

    const recredentialing = await start({ type: 'recredentialing', previousAppointmentId: spk.id })
    expect(recredentialing.status).toBe(201)
    expect(recredentialing.body).toMatchObject({ type: 'recredentialing', status: 'draft', previous_appointment_id: spk.id })
    const read = await call('GET', `/v1/credential-applications/${(recredentialing.body as { id: string }).id}`, readerToken)
    expect(read.body).toMatchObject({ previous_appointment_id: spk.id })
    const edited = await call('PATCH', `/v1/credential-applications/${(recredentialing.body as { id: string }).id}`, writerToken, { requestedUnitIds: [unitId] })
    expect(edited.body).toMatchObject({ type: 'recredentialing', previous_appointment_id: spk.id })

    const again = await start({ type: 'privilege_extension', previousAppointmentId: spk.id, requestedPrivileges: [{ catalogItemId: await addItem(), requestedCondition: 'full' }] })
    expect(again.status).toBe(409)
    expect(again.body).toMatchObject({ code: 'renewal_exists' })

    await workforce.applications.update((recredentialing.body as { id: string }).id, { status: 'withdrawn' })
    const repeated = await start({ type: 'privilege_extension', previousAppointmentId: spk.id, requestedPrivileges: [{ catalogItemId: held, requestedCondition: 'full' }] })
    expect(repeated.status).toBe(422)
    expect(repeated.body).toMatchObject({ code: 'privilege_already_granted' })
    expect((await start({ type: 'privilege_extension', previousAppointmentId: spk.id, requestedPrivileges: [{ catalogItemId: await addItem(), requestedCondition: 'full' }] })).status).toBe(201)

    expect((await start({ previousAppointmentId: spk.id })).body).toMatchObject({ code: 'previous_appointment_not_allowed' })
    expect((await start({ type: 'recredentialing', previousAppointmentId: new Types.ObjectId().toHexString() })).body).toMatchObject({ code: 'previous_appointment_not_found' })
    expect((await start({ type: 'recredentialing', previousAppointmentId: 'bad' })).status).toBe(400)
    const other = await addEmployee()
    const strangers = await newSpk(other, 'SPK/RENEW/2')
    expect((await start({ type: 'recredentialing', previousAppointmentId: strangers.id })).body).toMatchObject({ code: 'previous_appointment_mismatch' })
  })

  it('answers 404 for a missing, malformed or foreign id', async () => {
    const created = (await start()).body as Record<string, any>
    const unknown = new Types.ObjectId().toHexString()

    for (const id of [unknown, 'bad']) {
      expect((await call('GET', `/v1/credential-applications/${id}`, readerToken)).body).toMatchObject({ code: 'application_not_found' })
      expect(
        (await call('PATCH', `/v1/credential-applications/${id}`, writerToken, { requestedUnitIds: [unitId] })).body,
      ).toMatchObject({ code: 'application_not_found' })
      expect((await call('POST', `/v1/credential-applications/${id}/submit`, writerToken, {})).body).toMatchObject({ code: 'application_not_found' })
      expect(
        (await call('POST', `/v1/credential-applications/${id}/withdraw`, writerToken, { reason: 'x' })).body,
      ).toMatchObject({ code: 'application_not_found' })
    }
    expect((await call('GET', `/v1/credential-applications/${created.id}`, otherTenantToken)).status).toBe(404)
  })

  it('answers 422 for the business rules and 409 for a stale version', async () => {
    const needsProof = await addItem(true)
    const created = (await start()).body as Record<string, any>

    expect((await start({ type: 'recredentialing' })).body).toMatchObject({ code: 'previous_appointment_required' })
    expect((await start({ requestedUnitIds: [otherUnitId] })).body).toMatchObject({ code: 'unit_outside_facility' })
    expect(
      (await start({ requestedPrivileges: [{ catalogItemId: needsProof, requestedCondition: 'supervised' }] })).body,
    ).toMatchObject({ code: 'supervisor_required' })
    const noProof = (await start({ requestedPrivileges: [{ catalogItemId: needsProof, requestedCondition: 'full' }] })).body as Record<string, any>
    expect((await call('POST', `/v1/credential-applications/${noProof.id}/submit`, writerToken, {})).body).toMatchObject({ code: 'evidence_missing' })
    const stale = await call('PATCH', `/v1/credential-applications/${created.id}`, writerToken, {
      requestedUnitIds: [unitId],
      version: created.version + 5,
    })
    expect(stale.status).toBe(409)
    expect(stale.body).toMatchObject({ code: 'stale_version' })
  })

  it('validates the request: 400 for shape, 422 for an empty list, and list limits', async () => {
    expect((await call('POST', '/v1/credential-applications', writerToken, {})).status).toBe(400)
    expect((await start({ employeeId: 'bad' })).status).toBe(400)
    expect((await start({ type: 'weird' })).status).toBe(400)
    expect((await start({ requestedPrivileges: [{ catalogItemId: itemId, requestedCondition: 'all' }] })).status).toBe(400)
    expect((await start({ requestedUnitIds: ['bad'] })).status).toBe(400)
    expect((await start({ requestedPrivileges: [] })).body).toMatchObject({ code: 'invalid_privileges' })
    expect(
      (await call('POST', '/v1/credential-applications/x/withdraw', writerToken, {})).status,
    ).toBe(400)
    for (const query of ['limit=0', 'limit=101', 'offset=-1', 'status=gone', 'facilityId=bad', 'olderThanDays=-1']) {
      expect((await call('GET', `/v1/credential-applications?${query}`, readerToken)).status).toBe(400)
    }
  })

  it('writes no log entry when data is only read, except the access log of the request', async () => {
    const created = (await start()).body as Record<string, any>
    const { written, restore } = captureLogs()
    try {
      const replies = [
        await call('GET', '/v1/credential-applications', readerToken),
        await call('GET', `/v1/credential-applications/${created.id}`, readerToken),
        await call('GET', '/v1/credential-applications/missing-id', readerToken),
      ]
      expect(replies.map((reply) => reply.status)).toEqual([200, 200, 404])
      await vi.waitFor(() =>
        expect(
          written.filter((entry) => entry.event === 'http_request'),
        ).toHaveLength(replies.length),
      )

      expect(written.filter((entry) => entry.event !== 'http_request')).toEqual([])
    } finally {
      restore()
    }
  })

  it("logs one entry per write, without the application's values", async () => {
    const { written, restore } = captureLogs()
    try {
      const created = (
        await start({
          reason: 'Alasan Rahasia',
          requestedPrivileges: [{ catalogItemId: itemId, requestedCondition: 'full', notes: 'Catatan Rahasia' }],
        })
      ).body as Record<string, any>
      await call('PATCH', `/v1/credential-applications/${created.id}`, writerToken, { requestedUnitIds: [unitId] })
      await call('POST', `/v1/credential-applications/${created.id}/submit`, writerToken, {})
      const other = (await start()).body as Record<string, any>
      await call('POST', `/v1/credential-applications/${other.id}/withdraw`, writerToken, { reason: 'Alasan Mundur Rahasia' })
      await vi.waitFor(() =>
        expect(
          written.filter((entry) => entry.event === 'http_request'),
        ).toHaveLength(5),
      )

      const entries = written.filter((entry) => entry.event !== 'http_request')
      expect(entries.map((entry) => entry.event)).toEqual([
        'application_create',
        'application_update',
        'application_submit',
        'application_create',
        'application_withdraw',
      ])
      for (const text of ['Alasan Rahasia', 'Catatan Rahasia', 'Alasan Mundur Rahasia']) {
        expect(JSON.stringify(written)).not.toContain(text)
      }
    } finally {
      restore()
    }
  })
})
