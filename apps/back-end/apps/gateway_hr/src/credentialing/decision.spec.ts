import { Logger } from '@nestjs/common'
import { Types } from 'mongoose'
import { PERMISSIONS } from '@identity/permission'
import { createHrGateway, type HrGateway } from '../testing/hr-gateway'
import {
  createInMemoryWorkforce,
  type InMemoryWorkforce,
} from '../testing/in-memory-workforce'
import { CredentialingManagementModule } from './credentialing-management.module'

describe('credential application decision endpoint (in-memory repositories)', () => {
  const workforce: InMemoryWorkforce = createInMemoryWorkforce()
  let gateway: HrGateway
  let call: HrGateway['call']
  let tenantId: string
  let otherTenantId: string
  let facilityId: string
  let applicantId: string
  let directorId: string
  let supervisorId: string
  let itemOne: string
  let itemTwo: string
  let directorToken: string
  let unlinkedToken: string
  let applicantToken: string
  let reviewerToken: string
  let otherTenantToken: string
  let counter = 0
  const applicantOf = new Map<string, string>()
  const document = {
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
   * @returns The item identifier.
   */
  async function addItem(): Promise<string> {
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
      required_evidence: [],
      external_codes: [],
      status: 'active',
    })
    return item.id
  }

  /**
   * Stores a recommended application: itemOne recommended full, itemTwo not recommended.
   *
   * @param override - Fields of the application that replace the defaults.
   * @param tenant - Tenant of the application.
   * @returns The application identifier.
   */
  async function recommended(
    override: {
      status?: 'recommended' | 'assessed'
      supervised?: boolean
      applicant?: string
    } = {},
    tenant = tenantId,
  ): Promise<string> {
    let employee = override.applicant
    if (employee === undefined) {
      employee = await addEmployee(tenant)
      if (tenant === tenantId) {
        await addLicenses(employee)
      }
    }
    const application = await workforce.applications.create({
      tenant_id: tenant,
      employee_id: employee,
      credentialing_facility_id: facilityId,
      credentialing_scope: 'facility',
      type: 'initial',
      committee: { system: 'id.committee', code: 'komite_medik' },
      status: override.status ?? 'recommended',
      status_since: new Date('2026-03-01T00:00:00Z'),
      requested_privileges: [itemOne, itemTwo].map((id, index) => ({
        catalog_item_id: id,
        code: `PD-${index + 1}`,
        requested_condition: 'full' as const,
        proposed_supervisor_employee_id: null,
        notes: null,
      })),
      requested_unit_ids: [new Types.ObjectId().toHexString()],
      requested_facility_ids: [facilityId],
      documents: [],
      assessors: [],
      recommendation: {
        decided_at: new Date('2026-03-08T00:00:00Z'),
        signed_by: { account_id: 'a2', display_name: 'Chair', kind: 'account' },
        summary: 'Ringkasan Rahasia',
        privileges: [
          override.supervised
            ? { catalog_item_id: itemOne, outcome: 'recommended', condition: 'supervised', supervisor_employee_id: supervisorId, restriction_notes: null }
            : { catalog_item_id: itemOne, outcome: 'recommended', condition: 'full', supervisor_employee_id: null, restriction_notes: null },
          { catalog_item_id: itemTwo, outcome: 'not_recommended', condition: null, supervisor_employee_id: null, restriction_notes: null },
        ],
      },
      decision: null,
      return_reason: null,
      withdrawal_reason: null,
      temporary: null,
      previous_appointment_id: null,
    })
    applicantOf.set(application.id, employee)
    return application.id
  }

  /**
   * Adds an applicant's licences: a registration and a permit for the facility.
   *
   * @param employeeId - The applicant.
   */
  async function addLicenses(employeeId: string): Promise<void> {
    for (const role of ['registration', 'practice_permit'] as const) {
      counter += 1
      await workforce.licenses.create({
        tenant_id: tenantId,
        employee_id: employeeId,
        license_type: { system: 'id.license-type', code: role === 'registration' ? 'str' : 'sip' },
        eligibility_role: role,
        profession: { system: 'id.profession', code: 'dokter' },
        specialty: null,
        document_number: `L${counter}`,
        document_number_normalized: `L${counter}`,
        issuing_authority: { code: null, name: 'KKI' },
        jurisdiction: { country: 'ID', subdivision: null },
        practice_location:
          role === 'practice_permit' ? { facility_id: facilityId, name: 'RS', address: null } : null,
        issue_date: '2025-01-01',
        expiry_date: null,
        document: { file_id: 'f', content_type: 'application/pdf', sha256: 'a'.repeat(64) },
        status: 'valid',
        status_effective_date: '2025-01-02',
        is_live: true,
        submission: { via: 'hr', by: { account_id: 'a1', display_name: 'Admin', kind: 'account' }, at: new Date() },
        verification: null,
        rejection: null,
        revocation: null,
        superseded: null,
        replaces_license_id: null,
      })
    }
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

  const decide = (id: string, body: object, token = directorToken) =>
    call('POST', `/v1/credential-applications/${id}/decision`, token, body)
  let number = 0
  const approval = (override: object = {}) => ({
    outcome: 'approved',
    appointmentNumber: `SPK/${(number += 1)}/RS/2026`,
    ...override,
  })

  beforeAll(async () => {
    gateway = await createHrGateway({
      modules: [CredentialingManagementModule],
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
    applicantId = await addEmployee()
    directorId = await addEmployee()
    supervisorId = await addEmployee()
    itemOne = await addItem()
    itemTwo = await addItem()
    const decideOnly = [PERMISSIONS.WORKFORCE_CREDENTIAL_DECIDE]
    directorToken = await gateway.seedAndLogin(tenantId, 'director', decideOnly, directorId)
    unlinkedToken = await gateway.seedAndLogin(tenantId, 'unlinked', decideOnly, null)
    applicantToken = await gateway.seedAndLogin(tenantId, 'applicant', decideOnly, applicantId)
    reviewerToken = await gateway.seedAndLogin(tenantId, 'reviewer', [PERMISSIONS.WORKFORCE_CREDENTIAL_REVIEW], await addEmployee())
    otherTenantToken = await gateway.seedAndLogin(otherTenantId, 'other', decideOnly)
  })

  afterAll(async () => {
    await gateway.close()
  })

  it('refuses the route without a token (401) and without the decide permission (403)', async () => {
    const id = new Types.ObjectId().toHexString()
    expect((await call('POST', `/v1/credential-applications/${id}/decision`, undefined, approval())).status).toBe(401)
    expect((await decide(id, approval(), reviewerToken)).status).toBe(403)
  })

  it('approves a recommended application: issues the SPK with a grant for what was recommended and hides the committee confidences', async () => {
    const id = await recommended()

    const reply = await decide(id, approval({ signedDocument: document, reason: 'Disetujui' }))

    expect(reply.status).toBe(201)
    const body = reply.body as Record<string, any>
    expect(body.application).toMatchObject({
      id,
      status: 'approved',
      decision: { outcome: 'approved', appointment_id: body.appointment.id, reason: 'Disetujui' },
    })
    expect(body.application.recommendation).not.toHaveProperty('summary')
    expect(body.appointment).toMatchObject({
      employee_id: applicantOf.get(id),
      credentialing_facility_id: facilityId,
      credentialing_scope: 'facility',
      facility_ids: [facilityId],
      source_application_id: id,
      is_temporary: false,
      status: 'active',
      is_current: true,
      issued: { director_employee_id: directorId },
      signed_document: { file_id: 'file-1' },
    })
    expect(body.appointment.valid_period.start < body.appointment.valid_period.end).toBe(true)
    expect(body.grants).toHaveLength(1)
    expect(body.grants[0]).toMatchObject({
      appointment_id: body.appointment.id,
      catalog_item_id: itemOne,
      condition: 'full',
      supervisor: null,
      status: 'active',
    })
    expect(JSON.stringify(body)).not.toContain('"_id"')
    expect(JSON.stringify(body)).not.toContain('Ringkasan Rahasia')
    expect((await workforce.applications.findOne(id))?.status).toBe('approved')
  })

  it('rejects a recommended application with a reason and writes no SPK', async () => {
    const id = await recommended()

    const reply = await decide(id, { outcome: 'rejected', reason: 'Belum memenuhi syarat' })

    expect(reply.status).toBe(201)
    expect(reply.body).toMatchObject({
      application: { status: 'rejected', decision: { outcome: 'rejected', reason: 'Belum memenuhi syarat', appointment_id: null } },
      appointment: null,
      grants: [],
    })
  })

  it('answers 403 for an account without an employee and for the applicant, 404 for a missing, malformed or foreign id', async () => {
    const id = await recommended({ applicant: applicantId })
    const unlinked = await decide(id, approval(), unlinkedToken)
    expect(unlinked.status).toBe(403)
    expect(unlinked.body).toMatchObject({ code: 'director_employee_required' })
    const own = await decide(id, approval(), applicantToken)
    expect(own.status).toBe(403)
    expect(own.body).toMatchObject({ code: 'decider_is_applicant' })

    const foreign = await recommended({}, otherTenantId)
    for (const missing of [new Types.ObjectId().toHexString(), 'bad', foreign]) {
      const reply = await decide(missing, approval())
      expect(reply.status).toBe(404)
      expect(reply.body).toMatchObject({ code: 'application_not_found' })
    }
    expect((await decide(await recommended(), approval(), otherTenantToken)).status).toBe(404)
  })

  it('answers 422 for the business rules', async () => {
    const early = await decide(await recommended({ status: 'assessed' }), approval())
    expect(early.status).toBe(422)
    expect(early.body).toMatchObject({ code: 'invalid_transition' })

    const id = await recommended()
    expect((await decide(id, approval({ appointmentNumber: 'spk 1' }))).body).toMatchObject({ code: 'invalid_appointment_number' })
    expect((await decide(id, approval({ validUntil: '2099-01-01' }))).body).toMatchObject({ code: 'invalid_validity' })
    expect((await decide(id, { outcome: 'rejected' })).body).toMatchObject({ code: 'reason_required' })
    expect((await decide(await recommended({ supervised: true }), approval())).body).toMatchObject({ code: 'supervisor_not_privileged' })
  })

  it('answers 409 for a duplicate number, a second current SPK and a stale version', async () => {
    const first = await recommended()
    const number = approval()
    expect((await decide(first, number)).status).toBe(201)

    const second = await recommended({ applicant: applicantOf.get(first) })
    const duplicate = await decide(second, number)
    expect(duplicate.status).toBe(409)
    expect(duplicate.body).toMatchObject({ code: 'appointment_number_exists' })
    const current = await decide(second, approval())
    expect(current.status).toBe(409)
    expect(current.body).toMatchObject({ code: 'appointment_exists' })
    const stale = await decide(second, { outcome: 'rejected', reason: 'x', version: 99 })
    expect(stale.status).toBe(409)
    expect(stale.body).toMatchObject({ code: 'stale_version' })
  })

  it('validates the request: 400 for shape', async () => {
    const id = await recommended()
    expect((await decide(id, {})).status).toBe(400)
    expect((await decide(id, { outcome: 5 })).status).toBe(400)
    expect((await decide(id, approval({ signedDocument: { fileId: 1 } }))).status).toBe(400)
    expect((await decide(id, approval({ version: -1 }))).status).toBe(400)
    expect((await decide(id, approval({ validUntil: 20290309 }))).status).toBe(400)
    const unknown = await decide(id, { outcome: 'maybe' })
    expect(unknown.status).toBe(422)
    expect(unknown.body).toMatchObject({ code: 'invalid_outcome' })
  })

  it('logs one entry per decision, without the number, the reason or the recommendation', async () => {
    const approved = await recommended()
    const rejected = await recommended()
    const { written, restore } = captureLogs()
    try {
      await decide(approved, approval({ appointmentNumber: 'SPK/RAHASIA/1', reason: 'Alasan Setuju Rahasia' }))
      await decide(rejected, { outcome: 'rejected', reason: 'Alasan Tolak Rahasia' })
      await vi.waitFor(() =>
        expect(written.filter((entry) => entry.event === 'http_request')).toHaveLength(2),
      )

      expect(written.filter((entry) => entry.event !== 'http_request').map((entry) => entry.event)).toEqual([
        'application_decide',
        'application_decide',
      ])
      for (const text of ['SPK/RAHASIA/1', 'Alasan Setuju Rahasia', 'Alasan Tolak Rahasia', 'Ringkasan Rahasia']) {
        expect(JSON.stringify(written)).not.toContain(text)
      }
    } finally {
      restore()
    }
  })
})
