import { Logger } from '@nestjs/common'
import { Types } from 'mongoose'
import { PERMISSIONS } from '@identity/permission'
import { createHrGateway, type HrGateway } from '../testing/hr-gateway'
import {
  createInMemoryWorkforce,
  type InMemoryWorkforce,
} from '../testing/in-memory-workforce'
import { CredentialingManagementModule } from './credentialing-management.module'

describe('credential application assessment endpoints (in-memory repositories)', () => {
  const workforce: InMemoryWorkforce = createInMemoryWorkforce()
  let gateway: HrGateway
  let call: HrGateway['call']
  let tenantId: string
  let otherTenantId: string
  let facilityId: string
  let applicantId: string
  let chairId: string
  let memberId: string
  let assessorA: string
  let assessorB: string
  let itemOne: string
  let itemTwo: string
  let chairToken: string
  let memberToken: string
  let seatlessToken: string
  let assessorAToken: string
  let assessorBToken: string
  let readerToken: string
  let chairReaderToken: string
  let strangerToken: string
  let counter = 0
  const interview = { system: 'id.assessment-method', code: 'interview' }

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
   * Builds an appointed assessor who declared no conflict.
   *
   * @param employeeId - The assessor.
   * @returns The assessor entry.
   */
  function declared(employeeId: string) {
    return {
      employee_id: employeeId,
      appointed_at: new Date('2026-03-02T00:00:00Z'),
      appointed_by: { account_id: 'a1', display_name: 'Admin', kind: 'account' as const },
      conflict_declaration: {
        declared_at: new Date('2026-03-03T00:00:00Z'),
        has_conflict: false,
        relationship: null,
      },
    }
  }

  /**
   * Stores an application asking for two privileges, with both assessors declared.
   *
   * @param status - Status of the application.
   * @param tenant - Tenant of the application.
   * @returns The application identifier.
   */
  async function stored(
    status: 'under_review' | 'assessed' | 'submitted',
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
      requested_privileges: [
        { catalog_item_id: itemOne, code: 'PD-1', requested_condition: 'supervised', proposed_supervisor_employee_id: memberId, notes: null },
        { catalog_item_id: itemTwo, code: 'PD-2', requested_condition: 'restricted', proposed_supervisor_employee_id: null, notes: null },
      ],
      requested_unit_ids: [],
      requested_facility_ids: [facilityId],
      documents: [],
      assessors: [declared(assessorA), declared(assessorB)],
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
   * A valid assessment body.
   *
   * @param override - Fields of the first finding that replace the defaults.
   * @returns The body.
   */
  function findings(override: object = {}) {
    return {
      assessments: [
        { catalogItemId: itemOne, methods: [interview], outcome: 'recommended', recommendedCondition: 'supervised', reason: 'Kompeten Rahasia', ...override },
        { catalogItemId: itemTwo, methods: [interview], outcome: 'not_recommended', reason: 'Belum cukup Rahasia' },
      ],
    }
  }

  /**
   * A valid recommendation body.
   *
   * @param override - Fields that replace the defaults.
   * @returns The body.
   */
  function recommendation(override: object = {}) {
    return {
      summary: 'Ringkasan Rahasia',
      privileges: [
        { catalogItemId: itemOne, outcome: 'recommended', condition: 'supervised', supervisorEmployeeId: memberId },
        { catalogItemId: itemTwo, outcome: 'recommended', condition: 'restricted', restrictionNotes: 'Hanya rawat jalan' },
      ],
      ...override,
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
    itemOne = new Types.ObjectId().toHexString()
    itemTwo = new Types.ObjectId().toHexString()
    for (const [system, code] of [
      ['id.committee', 'komite_medik'],
      ['id.assessment-method', 'interview'],
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
    chairId = await addEmployee()
    memberId = await addEmployee()
    assessorA = await addEmployee()
    assessorB = await addEmployee()
    await seat(chairId, 'chair')
    await seat(memberId, 'member')
    await seat(assessorA, 'mitra_bestari')
    await seat(assessorB, 'mitra_bestari')
    const review = [PERMISSIONS.WORKFORCE_CREDENTIAL_REVIEW]
    chairToken = await gateway.seedAndLogin(tenantId, 'chair', review, chairId)
    memberToken = await gateway.seedAndLogin(tenantId, 'member', review, memberId)
    seatlessToken = await gateway.seedAndLogin(tenantId, 'seatless', review, await addEmployee())
    assessorAToken = await gateway.seedAndLogin(tenantId, 'assessora', review, assessorA)
    assessorBToken = await gateway.seedAndLogin(tenantId, 'assessorb', [], assessorB)
    readerToken = await gateway.seedAndLogin(
      tenantId,
      'reader',
      [PERMISSIONS.WORKFORCE_CREDENTIAL_APPLICATION_READ],
      await addEmployee(),
    )
    chairReaderToken = await gateway.seedAndLogin(
      tenantId,
      'chairreader',
      [PERMISSIONS.WORKFORCE_CREDENTIAL_APPLICATION_READ],
      chairId,
    )
    strangerToken = await gateway.seedAndLogin(tenantId, 'stranger', [], await addEmployee())
  })

  afterAll(async () => {
    await gateway.close()
  })

  it('refuses every route without a token (401), and the committee routes without the review permission (403)', async () => {
    const id = new Types.ObjectId().toHexString()
    const base = `/v1/credential-applications/${id}`
    const routes: ['GET' | 'POST', string, object | undefined][] = [
      ['POST', `${base}/assessments`, findings()],
      ['GET', `${base}/assessments`, undefined],
      ['POST', `${base}/recommendation`, recommendation()],
    ]
    for (const [method, url, payload] of routes) {
      expect((await call(method, url, undefined, payload)).status).toBe(401)
    }
    for (const [method, url, payload] of routes.slice(1)) {
      expect((await call(method, url, strangerToken, payload)).status).toBe(403)
    }
  })

  it('takes both assessments, becomes assessed, is read by the committee with access records, and is recommended by the chair', async () => {
    const id = await stored('under_review')

    const first = await call('POST', `/v1/credential-applications/${id}/assessments`, assessorAToken, findings())
    expect(first.status).toBe(201)
    expect(first.body).toMatchObject({
      status: 'under_review',
      assessments: [
        { catalog_item_id: itemOne, assessor_employee_id: assessorA, outcome: 'recommended', recommended_condition: 'supervised' },
        { catalog_item_id: itemTwo, outcome: 'not_recommended', recommended_condition: null },
      ],
    })
    expect(JSON.stringify(first.body)).not.toContain('"_id"')
    const second = await call('POST', `/v1/credential-applications/${id}/assessments`, assessorBToken, findings())
    expect(second.body).toMatchObject({ status: 'assessed' })

    const before = gateway.changeRecords.length
    const read = await call('GET', `/v1/credential-applications/${id}/assessments`, chairToken)
    expect(read.status).toBe(200)
    expect(read.body as unknown[]).toHaveLength(4)
    await vi.waitFor(() => expect(gateway.changeRecords.length - before).toBe(4))
    expect(gateway.changeRecords.slice(before)).toEqual(
      Array.from({ length: 4 }, () =>
        expect.objectContaining({ action: 'read', entity: expect.objectContaining({ type: 'credential_assessment' }) }),
      ),
    )

    const own = await call('GET', `/v1/credential-applications/${id}/assessments`, assessorAToken)
    expect(own.status).toBe(200)
    expect((own.body as { assessor_employee_id: string }[]).every((item) => item.assessor_employee_id === assessorA)).toBe(true)
    expect(own.body as unknown[]).toHaveLength(2)

    const signed = await call('POST', `/v1/credential-applications/${id}/recommendation`, chairToken, recommendation())
    expect(signed.status).toBe(201)
    expect(signed.body).toMatchObject({
      status: 'recommended',
      recommendation: { summary: 'Ringkasan Rahasia', privileges: [{ outcome: 'recommended' }, { outcome: 'recommended' }] },
    })
  })

  it('hides the declarations and the recommendation summary from callers who are not committee members, on get and on the queue', async () => {
    const id = await stored('assessed')
    await call('POST', `/v1/credential-applications/${id}/recommendation`, chairToken, recommendation())

    const asMember = (await call('GET', `/v1/credential-applications/${id}`, chairReaderToken)).body as Record<string, any>
    expect(asMember.recommendation.summary).toBe('Ringkasan Rahasia')
    expect(asMember.assessors[0].conflict_declaration).toMatchObject({ has_conflict: false })

    const asReader = (await call('GET', `/v1/credential-applications/${id}`, readerToken)).body as Record<string, any>
    expect(asReader.recommendation).not.toHaveProperty('summary')
    expect(asReader.recommendation.privileges).toHaveLength(2)
    expect(asReader.assessors[0]).not.toHaveProperty('conflict_declaration')
    expect(JSON.stringify(asReader)).not.toContain('Ringkasan Rahasia')

    const queue = (await call('GET', '/v1/credential-applications?status=recommended', readerToken)).body as Record<string, any>[]
    expect(queue.length).toBeGreaterThan(0)
    expect(JSON.stringify(queue)).not.toContain('Ringkasan Rahasia')
    expect(JSON.stringify(queue)).not.toContain('conflict_declaration')
  })

  it('keeps the assessments personal and committee-only: 403 for a stranger, a seatless holder and a non-assessor', async () => {
    const id = await stored('under_review')
    const asMember = await call('POST', `/v1/credential-applications/${id}/assessments`, memberToken, findings())
    expect(asMember.status).toBe(403)
    expect(asMember.body).toMatchObject({ code: 'not_an_assessor' })
    expect((await call('POST', `/v1/credential-applications/${id}/assessments`, strangerToken, findings())).body).toMatchObject({ code: 'not_an_assessor' })

    const seatless = await call('GET', `/v1/credential-applications/${id}/assessments`, seatlessToken)
    expect(seatless.status).toBe(403)
    expect(seatless.body).toMatchObject({ code: 'not_committee_member' })
  })

  it('lets only the chair recommend: 403 not_committee_chair for a member, not_committee_member without a seat', async () => {
    const id = await stored('assessed')
    const member = await call('POST', `/v1/credential-applications/${id}/recommendation`, memberToken, recommendation())
    expect(member.status).toBe(403)
    expect(member.body).toMatchObject({ code: 'not_committee_chair' })
    expect((await call('POST', `/v1/credential-applications/${id}/recommendation`, seatlessToken, recommendation())).body).toMatchObject({
      code: 'not_committee_member',
    })
    expect((await workforce.applications.findOne(id))?.status).toBe('assessed')
  })

  it('answers 404 for a missing, malformed or foreign id on every route', async () => {
    const foreign = await stored('under_review', otherTenantId)
    for (const id of [new Types.ObjectId().toHexString(), 'bad', foreign]) {
      const base = `/v1/credential-applications/${id}`
      for (const [method, url, token, payload] of [
        ['POST', `${base}/assessments`, assessorAToken, findings()],
        ['GET', `${base}/assessments`, chairToken, undefined],
        ['POST', `${base}/recommendation`, chairToken, recommendation()],
      ] as const) {
        const reply = await call(method, url, token, payload)
        expect(reply.status).toBe(404)
        expect(reply.body).toMatchObject({ code: 'application_not_found' })
      }
    }
  })

  it('answers 422 for the business rules and 409 for a second assessment and a stale version', async () => {
    const id = await stored('under_review')
    const url = `/v1/credential-applications/${id}/assessments`

    const incomplete = await call('POST', url, assessorAToken, { assessments: [findings().assessments[0]] })
    expect(incomplete.status).toBe(422)
    expect(incomplete.body).toMatchObject({ code: 'assessment_incomplete' })
    expect((await call('POST', url, assessorAToken, findings({ methods: [] }))).body).toMatchObject({ code: 'invalid_methods' })
    expect((await call('POST', url, assessorAToken, findings({ reason: ' ' }))).body).toMatchObject({ code: 'reason_required' })
    expect((await call('POST', url, assessorAToken, { ...findings(), version: 99 })).body).toMatchObject({ code: 'stale_version' })

    expect((await call('POST', url, assessorAToken, findings())).status).toBe(201)
    const again = await call('POST', url, assessorAToken, findings())
    expect(again.status).toBe(409)
    expect(again.body).toMatchObject({ code: 'assessment_exists' })

    const early = await stored('under_review')
    const tooSoon = await call('POST', `/v1/credential-applications/${early}/recommendation`, chairToken, recommendation())
    expect(tooSoon.status).toBe(422)
    expect(tooSoon.body).toMatchObject({ code: 'invalid_transition' })
    const ready = await stored('assessed')
    const exceeds = await call('POST', `/v1/credential-applications/${ready}/recommendation`, chairToken, recommendation({
      privileges: [
        { catalogItemId: itemOne, outcome: 'recommended', condition: 'full' },
        { catalogItemId: itemTwo, outcome: 'not_recommended' },
      ],
    }))
    expect(exceeds.status).toBe(422)
    expect(exceeds.body).toMatchObject({ code: 'condition_exceeds_request' })
  })

  it('validates the request: 400 for shape', async () => {
    const id = await stored('under_review')
    const assess = (body: object) => call('POST', `/v1/credential-applications/${id}/assessments`, assessorAToken, body)
    const recommend = (body: object) => call('POST', `/v1/credential-applications/${id}/recommendation`, chairToken, body)

    expect((await assess({})).status).toBe(400)
    expect((await assess({ assessments: [{ catalogItemId: 'bad', methods: [], outcome: 'recommended', reason: 'x' }] })).status).toBe(400)
    expect((await assess(findings({ methods: [{ system: 1 }] }))).status).toBe(400)
    expect((await assess({ ...findings(), version: -1 })).status).toBe(400)
    expect((await recommend({})).status).toBe(400)
    expect((await recommend(recommendation({ summary: 5 }))).status).toBe(400)
    expect((await recommend(recommendation({ privileges: [{ catalogItemId: 'bad', outcome: 'recommended' }] }))).status).toBe(400)
    expect((await recommend(recommendation({ privileges: [{ catalogItemId: itemOne, outcome: 'recommended', supervisorEmployeeId: 'bad' }] }))).status).toBe(400)
  })

  it('writes no operational log entry when assessments are read, except the access log of the request', async () => {
    const id = await stored('under_review')
    await call('POST', `/v1/credential-applications/${id}/assessments`, assessorAToken, findings())
    const { written, restore } = captureLogs()
    try {
      const replies = [
        await call('GET', `/v1/credential-applications/${id}/assessments`, chairToken),
        await call('GET', `/v1/credential-applications/missing-id/assessments`, chairToken),
        await call('GET', `/v1/credential-applications/${id}`, readerToken),
      ]
      expect(replies.map((reply) => reply.status)).toEqual([200, 404, 200])
      await vi.waitFor(() =>
        expect(written.filter((entry) => entry.event === 'http_request')).toHaveLength(replies.length),
      )

      expect(written.filter((entry) => entry.event !== 'http_request')).toEqual([])
      expect(JSON.stringify(written)).not.toContain('Kompeten Rahasia')
    } finally {
      restore()
    }
  })

  it('logs one entry per write, without reasons, summaries or notes', async () => {
    const id = await stored('under_review')
    const { written, restore } = captureLogs()
    try {
      await call('POST', `/v1/credential-applications/${id}/assessments`, assessorAToken, findings())
      await call('POST', `/v1/credential-applications/${id}/assessments`, assessorBToken, findings())
      await call('POST', `/v1/credential-applications/${id}/recommendation`, chairToken, recommendation())
      await vi.waitFor(() =>
        expect(written.filter((entry) => entry.event === 'http_request')).toHaveLength(3),
      )

      expect(written.filter((entry) => entry.event !== 'http_request').map((entry) => entry.event)).toEqual([
        'assessment_create',
        'assessment_create',
        'application_recommend',
      ])
      for (const text of ['Kompeten Rahasia', 'Belum cukup Rahasia', 'Ringkasan Rahasia', 'Hanya rawat jalan']) {
        expect(JSON.stringify(written)).not.toContain(text)
      }
    } finally {
      restore()
    }
  })
})
