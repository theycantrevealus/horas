import { Logger } from '@nestjs/common'
import { Types } from 'mongoose'
import { PERMISSIONS } from '@identity/permission'
import { createHrGateway, type HrGateway } from '../testing/hr-gateway'
import {
  createInMemoryWorkforce,
  type InMemoryWorkforce,
} from '../testing/in-memory-workforce'
import { CredentialingManagementModule } from './credentialing-management.module'

describe('credential application review endpoints (in-memory repositories)', () => {
  const workforce: InMemoryWorkforce = createInMemoryWorkforce()
  let gateway: HrGateway
  let call: HrGateway['call']
  let tenantId: string
  let otherTenantId: string
  let facilityId: string
  let applicantId: string
  let memberId: string
  let assessorId: string
  let memberToken: string
  let plainReviewerToken: string
  let assessorToken: string
  let strangerToken: string
  let counter = 0

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
   * Seats an employee on the committee of the facility.
   *
   * @param employeeId - The member.
   * @param role - Role code.
   */
  async function seat(employeeId: string, role: string): Promise<void> {
    await workforce.committeeMemberships.create({
      tenant_id: tenantId,
      employee_id: employeeId,
      facility_id: facilityId,
      committee: { system: 'id.committee', code: 'komite_medik' },
      role: { system: 'id.committee-role', code: role },
      period: { start: '2026-01-01', end: null },
      decision_ref: null,
      status: 'active',
    })
  }

  /**
   * Stores an application in a status.
   *
   * @param status - Status of the application.
   * @param assessors - Employees already appointed.
   * @param tenant - Tenant of the application.
   * @returns The application identifier.
   */
  async function stored(
    status: 'submitted' | 'under_review' | 'assessed',
    assessors: string[] = [],
    tenant = tenantId,
  ): Promise<string> {
    const application = await workforce.applications.create({
      tenant_id: tenant,
      employee_id: applicantId,
      credentialing_facility_id: facilityId,
      credentialing_scope: 'facility',
      type: 'initial',
      committee: { system: 'id.committee', code: 'komite_medik' },
      status,
      status_since: new Date('2026-03-01T00:00:00Z'),
      requested_privileges: [],
      requested_unit_ids: [],
      requested_facility_ids: [facilityId],
      documents: [],
      assessors: assessors.map((employee_id) => ({
        employee_id,
        appointed_at: new Date('2026-03-02T00:00:00Z'),
        appointed_by: { account_id: 'a1', display_name: 'Admin', kind: 'account' },
        conflict_declaration: null,
      })),
      recommendation: null,
      decision: null,
      return_reason: null,
      withdrawal_reason: null,
      temporary: null,
      previous_appointment_id: null,
    })
    return application.id
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
    facilityId = new Types.ObjectId().toHexString()
    for (const [system, code] of [
      ['id.committee', 'komite_medik'],
      ['id.conflict-relationship', 'relative'],
    ]) {
      await workforce.codeConcepts.create({
        system,
        code,
        display: [{ locale: 'en', text: code }],
        properties: {},
        mappings: [],
        period: null,
        status: 'active',
      })
    }
    applicantId = await addEmployee()
    memberId = await addEmployee()
    assessorId = await addEmployee()
    await seat(memberId, 'chair')
    await seat(assessorId, 'mitra_bestari')
    const review = [PERMISSIONS.WORKFORCE_CREDENTIAL_REVIEW]
    memberToken = await gateway.seedAndLogin(tenantId, 'member', review, memberId)
    plainReviewerToken = await gateway.seedAndLogin(tenantId, 'plain', review, await addEmployee())
    assessorToken = await gateway.seedAndLogin(tenantId, 'assessor', [], assessorId)
    strangerToken = await gateway.seedAndLogin(tenantId, 'stranger', [], await addEmployee())
  })

  afterAll(async () => {
    await gateway.close()
  })

  it('refuses the committee routes without a token (401) and without the review permission (403)', async () => {
    const id = new Types.ObjectId().toHexString()
    const routes: [string, object][] = [
      [`/v1/credential-applications/${id}/start-review`, {}],
      [`/v1/credential-applications/${id}/return`, { reason: 'x' }],
      [`/v1/credential-applications/${id}/assessors`, { assessorEmployeeIds: [id] }],
    ]
    for (const [url, payload] of routes) {
      expect((await call('POST', url, undefined, payload)).status).toBe(401)
      expect((await call('POST', url, strangerToken, payload)).status).toBe(403)
    }
    expect(
      (await call('POST', `/v1/credential-applications/${id}/conflict-declaration`, undefined, { hasConflict: false })).status,
    ).toBe(401)
  })

  it('answers 403 not_committee_member for a holder of the permission who has no seat', async () => {
    const id = await stored('submitted')
    const reply = await call('POST', `/v1/credential-applications/${id}/start-review`, plainReviewerToken, {})
    expect(reply.status).toBe(403)
    expect(reply.body).toMatchObject({ code: 'not_committee_member' })
    expect((await workforce.applications.findOne(id))?.status).toBe('submitted')
  })

  it('starts the review, appoints an assessor, takes the declaration and returns the application', async () => {
    const id = await stored('submitted')

    const started = await call('POST', `/v1/credential-applications/${id}/start-review`, memberToken, {})
    expect(started.status).toBe(201)
    expect(started.body).toMatchObject({ status: 'under_review' })

    const appointed = await call('POST', `/v1/credential-applications/${id}/assessors`, memberToken, {
      assessorEmployeeIds: [assessorId],
    })
    expect(appointed.status).toBe(201)
    expect(appointed.body).toMatchObject({
      assessors: [{ employee_id: assessorId, conflict_declaration: null }],
    })

    const declared = await call('POST', `/v1/credential-applications/${id}/conflict-declaration`, assessorToken, {
      hasConflict: true,
      relationship: { system: 'id.conflict-relationship', code: 'relative' },
    })
    expect(declared.status).toBe(201)
    expect(declared.body).toMatchObject({
      assessors: [{ conflict_declaration: { has_conflict: true, relationship: { code: 'relative' } } }],
    })
    expect(declared.body).not.toHaveProperty('_id')

    const returned = await call('POST', `/v1/credential-applications/${id}/return`, memberToken, {
      reason: 'Logbook belum lengkap',
    })
    expect(returned.status).toBe(201)
    expect(returned.body).toMatchObject({ status: 'returned', return_reason: 'Logbook belum lengkap' })
  })

  it('keeps the declaration personal: a committee member or a stranger gets 403 not_an_assessor', async () => {
    const id = await stored('under_review', [assessorId])
    for (const token of [memberToken, strangerToken]) {
      const reply = await call('POST', `/v1/credential-applications/${id}/conflict-declaration`, token, {
        hasConflict: false,
      })
      expect(reply.status).toBe(403)
      expect(reply.body).toMatchObject({ code: 'not_an_assessor' })
    }
  })

  it('answers 404 for a missing, malformed or foreign id on every route', async () => {
    const foreign = await stored('submitted', [], otherTenantId)
    const unknown = new Types.ObjectId().toHexString()
    for (const id of [unknown, 'bad', foreign]) {
      const bodies: [string, string, object][] = [
        ['start-review', memberToken, {}],
        ['return', memberToken, { reason: 'x' }],
        ['assessors', memberToken, { assessorEmployeeIds: [unknown] }],
        ['conflict-declaration', assessorToken, { hasConflict: false }],
      ]
      for (const [route, token, payload] of bodies) {
        const reply = await call('POST', `/v1/credential-applications/${id}/${route}`, token, payload)
        expect(reply.status).toBe(404)
        expect(reply.body).toMatchObject({ code: 'application_not_found' })
      }
    }
  })

  it('answers 422 for the business rules and 409 for duplicates and a stale version', async () => {
    const id = await stored('under_review')

    const wrongStatus = await call('POST', `/v1/credential-applications/${await stored('assessed')}/start-review`, memberToken, {})
    expect(wrongStatus.status).toBe(422)
    expect(wrongStatus.body).toMatchObject({ code: 'invalid_transition' })

    const applicant = await call('POST', `/v1/credential-applications/${id}/assessors`, memberToken, {
      assessorEmployeeIds: [applicantId],
    })
    expect(applicant.status).toBe(422)
    expect(applicant.body).toMatchObject({ code: 'assessor_not_eligible' })

    const stale = await call('POST', `/v1/credential-applications/${id}/assessors`, memberToken, {
      assessorEmployeeIds: [assessorId],
      version: 99,
    })
    expect(stale.status).toBe(409)
    expect(stale.body).toMatchObject({ code: 'stale_version' })

    await call('POST', `/v1/credential-applications/${id}/assessors`, memberToken, { assessorEmployeeIds: [assessorId] })
    const twice = await call('POST', `/v1/credential-applications/${id}/assessors`, memberToken, {
      assessorEmployeeIds: [assessorId],
    })
    expect(twice.status).toBe(409)
    expect(twice.body).toMatchObject({ code: 'assessor_already_appointed' })

    await call('POST', `/v1/credential-applications/${id}/conflict-declaration`, assessorToken, { hasConflict: false })
    const again = await call('POST', `/v1/credential-applications/${id}/conflict-declaration`, assessorToken, {
      hasConflict: false,
    })
    expect(again.status).toBe(409)
    expect(again.body).toMatchObject({ code: 'declaration_exists' })
  })

  it('validates the request: 400 for shape, 422 for the list size', async () => {
    const id = await stored('under_review', [assessorId])
    const url = (route: string) => `/v1/credential-applications/${id}/${route}`

    expect((await call('POST', url('return'), memberToken, {})).status).toBe(400)
    expect((await call('POST', url('return'), memberToken, { reason: 'x'.repeat(501) })).status).toBe(400)
    expect((await call('POST', url('start-review'), memberToken, { version: -1 })).status).toBe(400)
    expect((await call('POST', url('assessors'), memberToken, {})).status).toBe(400)
    expect((await call('POST', url('assessors'), memberToken, { assessorEmployeeIds: ['bad'] })).status).toBe(400)
    const empty = await call('POST', url('assessors'), memberToken, { assessorEmployeeIds: [] })
    expect(empty.status).toBe(422)
    expect(empty.body).toMatchObject({ code: 'invalid_assessors' })
    expect((await call('POST', url('conflict-declaration'), assessorToken, {})).status).toBe(400)
    expect((await call('POST', url('conflict-declaration'), assessorToken, { hasConflict: 'yes' })).status).toBe(400)
    const noRelationship = await call('POST', url('conflict-declaration'), assessorToken, { hasConflict: true })
    expect(noRelationship.status).toBe(422)
    expect(noRelationship.body).toMatchObject({ code: 'relationship_required' })
  })

  it("logs one entry per write, without the reason or the relationship", async () => {
    const id = await stored('submitted')
    const { written, restore } = captureLogs()
    try {
      await call('POST', `/v1/credential-applications/${id}/start-review`, memberToken, { reason: 'Alasan Mulai Rahasia' })
      await call('POST', `/v1/credential-applications/${id}/assessors`, memberToken, { assessorEmployeeIds: [assessorId] })
      await call('POST', `/v1/credential-applications/${id}/conflict-declaration`, assessorToken, {
        hasConflict: true,
        relationship: { system: 'id.conflict-relationship', code: 'relative' },
      })
      await call('POST', `/v1/credential-applications/${id}/return`, memberToken, { reason: 'Alasan Kembali Rahasia' })
      await vi.waitFor(() =>
        expect(written.filter((entry) => entry.event === 'http_request')).toHaveLength(4),
      )

      expect(written.filter((entry) => entry.event !== 'http_request').map((entry) => entry.event)).toEqual([
        'application_start_review',
        'application_appoint_assessors',
        'application_declare_conflict',
        'application_return',
      ])
      for (const text of ['Alasan Mulai Rahasia', 'Alasan Kembali Rahasia', 'relative']) {
        expect(JSON.stringify(written)).not.toContain(text)
      }
    } finally {
      restore()
    }
  })
})
