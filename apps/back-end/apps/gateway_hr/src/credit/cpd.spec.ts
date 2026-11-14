import { Logger } from '@nestjs/common'
import { Types } from 'mongoose'
import { PERMISSIONS } from '@identity/permission'
import { createHrGateway, type HrGateway } from '../testing/hr-gateway'
import {
  createInMemoryWorkforce,
  type InMemoryWorkforce,
} from '../testing/in-memory-workforce'
import { CpdManagementModule } from './cpd-management.module'

describe('credit record endpoints (in-memory repositories)', () => {
  const workforce: InMemoryWorkforce = createInMemoryWorkforce()
  let gateway: HrGateway
  let call: HrGateway['call']
  let writerToken: string
  let reviewerToken: string
  let readerToken: string
  let selfToken: string
  let selfReviewerToken: string
  let noEmployeeToken: string
  let otherTenantToken: string
  let tenantId: string
  let otherTenantId: string
  let employeeId: string
  let counter = 0

  const skp = { system: 'id.credit-system', code: 'skp' }
  const learning = { system: 'id.cpd-category', code: 'learning' }
  const evidence = {
    fileId: 'file-1',
    contentType: 'application/pdf',
    sha256: 'a'.repeat(64),
  }
  const today = () => new Date().toISOString().slice(0, 10)

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
   * Records credits through the API as the writer.
   *
   * @param override - Fields that replace the defaults.
   * @returns The reply.
   */
  function record(override: object = {}) {
    return call('POST', '/v1/cpd-records', writerToken, {
      employeeId,
      creditSystem: skp,
      activity: { title: 'Seminar', category: learning, provider: 'IDI' },
      activityDate: today(),
      points: 10,
      ...override,
    })
  }

  /**
   * Submits credits through the API as the signed-in employee.
   *
   * @param override - Fields that replace the defaults.
   * @param token - Token of the caller.
   * @returns The reply.
   */
  function submit(override: object = {}, token = selfToken) {
    return call('POST', '/v1/employees/me/cpd-records', token, {
      creditSystem: skp,
      activity: { title: 'Webinar', category: learning },
      activityDate: today(),
      points: 2,
      evidence,
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
      modules: [CpdManagementModule],
      ...workforce.options,
    })
    call = gateway.call
    ;({ tenantId, otherTenantId } = gateway)
    employeeId = await addEmployee()
    writerToken = await gateway.seedAndLogin(tenantId, 'writer', [
      PERMISSIONS.WORKFORCE_CPD_READ,
      PERMISSIONS.WORKFORCE_CPD_WRITE,
    ])
    reviewerToken = await gateway.seedAndLogin(tenantId, 'reviewer', [
      PERMISSIONS.WORKFORCE_CPD_READ,
      PERMISSIONS.WORKFORCE_CPD_REVIEW,
    ])
    readerToken = await gateway.seedAndLogin(tenantId, 'reader', [
      PERMISSIONS.WORKFORCE_CPD_READ,
    ])
    selfToken = await gateway.seedAndLogin(tenantId, 'self', [], employeeId)
    selfReviewerToken = await gateway.seedAndLogin(
      tenantId,
      'self-reviewer',
      [PERMISSIONS.WORKFORCE_CPD_REVIEW],
      employeeId,
    )
    noEmployeeToken = await gateway.seedAndLogin(tenantId, 'noemp', [], null)
    otherTenantToken = await gateway.seedAndLogin(otherTenantId, 'other', [
      PERMISSIONS.WORKFORCE_CPD_READ,
      PERMISSIONS.WORKFORCE_CPD_WRITE,
      PERMISSIONS.WORKFORCE_CPD_REVIEW,
    ])
    for (const [system, code] of [
      ['id.credit-system', 'skp'],
      ['id.cpd-category', 'learning'],
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
  })

  afterAll(async () => {
    await gateway.close()
  })

  it('refuses every route without a token (401) and without its own permission (403)', async () => {
    const id = new Types.ObjectId().toHexString()
    const routes: ['GET' | 'POST', string, object | undefined][] = [
      ['GET', `/v1/employees/${id}/cpd-records`, undefined],
      ['POST', '/v1/cpd-records', {}],
      ['POST', '/v1/employees/me/cpd-records', {}],
      ['POST', `/v1/cpd-records/${id}/review`, {}],
    ]
    for (const [method, url, payload] of routes) {
      expect((await call(method, url, undefined, payload)).status).toBe(401)
    }
    expect((await call('POST', '/v1/cpd-records', readerToken, {})).status).toBe(403)
    expect((await call('POST', '/v1/cpd-records', reviewerToken, {})).status).toBe(403)
    expect(
      (await call('POST', `/v1/cpd-records/${id}/review`, writerToken, {})).status,
    ).toBe(403)
    expect((await call('GET', `/v1/employees/${id}/cpd-records`, selfToken)).status).toBe(403)
    expect((await call('POST', '/v1/employees/me/cpd-records', selfToken, {})).status).toBe(400)
  })

  it('records accepted credits as HR and lists them', async () => {
    const created = await record({ points: 7.5 })

    expect(created.status).toBe(201)
    const body = created.body as Record<string, any>
    expect(body).toMatchObject({
      employee_id: employeeId,
      credit_system: { code: 'skp' },
      activity: { title: 'Seminar', category: { code: 'learning' }, provider: 'IDI' },
      points: 7.5,
      source: 'manual',
      status: 'accepted',
      evidence: null,
    })
    expect(body).not.toHaveProperty('_id')
    const list = await call(
      'GET',
      `/v1/employees/${employeeId}/cpd-records?creditSystem=skp&status=accepted`,
      readerToken,
    )
    expect(list.status).toBe(200)
    expect((list.body as Record<string, any>[]).map((r) => r.id)).toContain(body.id)
  })

  it('lets a signed-in employee submit their own credits, and refuses an account with no employee', async () => {
    const other = await addEmployee()

    const own = await submit({ employeeId: other })
    const noEvidence = await submit({ evidence: null })
    const none = await submit({}, noEmployeeToken)

    if (own.status === 201) {
      expect(own.body).toMatchObject({
        employee_id: employeeId,
        status: 'submitted',
        evidence: { file_id: 'file-1' },
      })
    } else {
      expect(own.status).toBe(400)
    }
    expect(noEvidence.status).toBe(422)
    expect(noEvidence.body).toMatchObject({ code: 'evidence_required' })
    expect(none.status).toBe(404)
    expect(none.body).toMatchObject({ code: 'employee_not_found' })
  })

  it('reviews a submitted record, rejects an accepted one with a reason, and keeps a rejected one final', async () => {
    const pending = (await submit()).body as Record<string, any>
    const hrEntry = (await record()).body as Record<string, any>
    const review = (id: string, body: object, token = reviewerToken) =>
      call('POST', `/v1/cpd-records/${id}/review`, token, body)

    const accepted = await review(pending.id, { outcome: 'accept', version: pending.version })
    const noReason = await review(hrEntry.id, { outcome: 'reject' })
    const rejected = await review(hrEntry.id, { outcome: 'reject', reason: 'Salah ketik' })
    const again = await review(hrEntry.id, { outcome: 'accept' })

    expect(accepted.status).toBe(201)
    expect(accepted.body).toMatchObject({ status: 'accepted' })
    expect(noReason.status).toBe(422)
    expect(noReason.body).toMatchObject({ code: 'reason_required' })
    expect(rejected.body).toMatchObject({ status: 'rejected' })
    expect(again.status).toBe(422)
    expect(again.body).toMatchObject({ code: 'invalid_transition' })
  })

  it('answers 403 when the reviewer is the holder, and 409 for a stale version', async () => {
    const pending = (await submit()).body as Record<string, any>

    const own = await call('POST', `/v1/cpd-records/${pending.id}/review`, selfReviewerToken, {
      outcome: 'accept',
    })
    const stale = await call('POST', `/v1/cpd-records/${pending.id}/review`, reviewerToken, {
      outcome: 'accept',
      version: pending.version + 5,
    })

    expect(own.status).toBe(403)
    expect(own.body).toMatchObject({ code: 'reviewer_is_holder' })
    expect(stale.status).toBe(409)
    expect(stale.body).toMatchObject({ code: 'stale_version' })
  })

  it('answers 404 for a missing, malformed or foreign id', async () => {
    const pending = (await submit()).body as Record<string, any>
    const unknown = new Types.ObjectId().toHexString()
    const foreignEmployee = await addEmployee(otherTenantId)

    for (const id of [unknown, 'bad']) {
      expect(
        (await call('POST', `/v1/cpd-records/${id}/review`, reviewerToken, { outcome: 'accept' })).body,
      ).toMatchObject({ code: 'cpd_record_not_found' })
    }
    expect(
      (
        await call('POST', `/v1/cpd-records/${pending.id}/review`, otherTenantToken, {
          outcome: 'accept',
        })
      ).body,
    ).toMatchObject({ code: 'cpd_record_not_found' })
    for (const url of [
      `/v1/employees/${unknown}/cpd-records`,
      '/v1/employees/bad/cpd-records',
      `/v1/employees/${foreignEmployee}/cpd-records`,
    ]) {
      expect((await call('GET', url, readerToken)).body).toMatchObject({
        code: 'employee_not_found',
      })
    }
  })

  it('validates the request: 400 for shape, 422 for business rules, and list limits', async () => {
    expect((await record({ employeeId: 'bad' })).status).toBe(400)
    expect((await call('POST', '/v1/cpd-records', writerToken, {})).status).toBe(400)
    expect((await record({ evidence: { ...evidence, sha256: 'short' } })).status).toBe(400)
    expect((await record({ points: 0 })).body).toMatchObject({ code: 'invalid_points' })
    expect((await record({ activityDate: '2999-01-01' })).body).toMatchObject({
      code: 'invalid_activity_date',
    })
    expect(
      (await call('POST', `/v1/cpd-records/x/review`, reviewerToken, { outcome: 'maybe' })).status,
    ).toBe(400)
    for (const query of ['limit=0', 'limit=101', 'offset=-1', 'status=gone']) {
      expect(
        (await call('GET', `/v1/employees/${employeeId}/cpd-records?${query}`, readerToken)).status,
      ).toBe(400)
    }
  })

  it('writes no log entry when data is only read, except the access log of the request', async () => {
    const { written, restore } = captureLogs()
    try {
      const replies = [
        await call('GET', `/v1/employees/${employeeId}/cpd-records`, readerToken),
        await call('GET', '/v1/employees/missing-id/cpd-records', readerToken),
      ]
      expect(replies.map((reply) => reply.status)).toEqual([200, 404])
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

  it("logs one entry per write, without the record's values", async () => {
    const { written, restore } = captureLogs()
    try {
      await record({
        activity: { title: 'Judul Rahasia', category: learning, provider: 'Penyelenggara Rahasia' },
        reason: 'Alasan Rahasia',
      })
      const pending = (
        await submit({ activity: { title: 'Webinar Rahasia', category: learning } })
      ).body as Record<string, any>
      await call('POST', `/v1/cpd-records/${pending.id}/review`, reviewerToken, {
        outcome: 'reject',
        reason: 'Catatan Rahasia',
      })
      await vi.waitFor(() =>
        expect(
          written.filter((entry) => entry.event === 'http_request'),
        ).toHaveLength(3),
      )

      const entries = written.filter((entry) => entry.event !== 'http_request')
      expect(entries.map((entry) => entry.event)).toEqual([
        'cpd_record_create',
        'cpd_record_submit',
        'cpd_record_review',
      ])
      for (const text of ['Judul Rahasia', 'Penyelenggara Rahasia', 'Webinar Rahasia', 'Alasan Rahasia', 'Catatan Rahasia']) {
        expect(JSON.stringify(written)).not.toContain(text)
      }
    } finally {
      restore()
    }
  })
})
