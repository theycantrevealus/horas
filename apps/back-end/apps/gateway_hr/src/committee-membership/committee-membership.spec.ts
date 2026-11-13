import { Logger } from '@nestjs/common'
import { Types } from 'mongoose'
import { PERMISSIONS } from '@identity/permission'
import { createHrGateway, type HrGateway } from '../testing/hr-gateway'
import {
  createInMemoryWorkforce,
  type InMemoryWorkforce,
} from '../testing/in-memory-workforce'
import { CommitteeMembershipManagementModule } from './committee-membership-management.module'

describe('committee membership endpoints (in-memory repositories)', () => {
  const workforce: InMemoryWorkforce = createInMemoryWorkforce()
  let gateway: HrGateway
  let call: HrGateway['call']
  let writerToken: string
  let readerToken: string
  let otherTenantToken: string
  let tenantId: string
  let otherTenantId: string
  let facilityId: string
  let counter = 0

  const committee = (code = 'komite_medik') => ({
    system: 'id.committee',
    code,
  })
  const role = (code = 'member') => ({ system: 'id.committee-role', code })

  /**
   * Adds an employee.
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
      workforce_category: { system: 'id.workforce-category', code: 'non_klinis' },
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
    })
    return employee.id
  }

  /**
   * Appoints through the API as the writer.
   *
   * @param body - Request body.
   * @returns The reply.
   */
  function appoint(body: object) {
    return call('POST', '/v1/committee-memberships', writerToken, {
      facilityId,
      committee: committee(),
      role: role(),
      period: { start: new Date().toISOString().slice(0, 10) },
      ...body,
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
      modules: [CommitteeMembershipManagementModule],
      ...workforce.options,
    })
    call = gateway.call
    ;({ tenantId, otherTenantId } = gateway)
    writerToken = await gateway.seedAndLogin(tenantId, 'writer', [
      PERMISSIONS.WORKFORCE_COMMITTEE_MEMBERSHIP_READ,
      PERMISSIONS.WORKFORCE_COMMITTEE_MEMBERSHIP_WRITE,
    ])
    readerToken = await gateway.seedAndLogin(tenantId, 'reader', [
      PERMISSIONS.WORKFORCE_COMMITTEE_MEMBERSHIP_READ,
    ])
    otherTenantToken = await gateway.seedAndLogin(otherTenantId, 'other', [
      PERMISSIONS.WORKFORCE_COMMITTEE_MEMBERSHIP_READ,
      PERMISSIONS.WORKFORCE_COMMITTEE_MEMBERSHIP_WRITE,
    ])
    const codes: [string, string[]][] = [
      ['id.committee', ['komite_medik', 'komite_keperawatan']],
      ['id.committee-role', ['chair', 'secretary', 'member', 'mitra_bestari']],
    ]
    for (const [system, list] of codes) {
      for (const code of list) {
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
    }
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
  })

  afterAll(async () => {
    await gateway.close()
  })

  it('refuses every route without a token (401) and without its own permission (403)', async () => {
    const id = new Types.ObjectId().toHexString()
    const routes: ['GET' | 'POST', string, object | undefined][] = [
      ['GET', `/v1/committee-memberships?facilityId=${facilityId}`, undefined],
      ['POST', '/v1/committee-memberships', {}],
      ['POST', `/v1/committee-memberships/${id}/end`, {}],
    ]
    for (const [method, url, payload] of routes) {
      expect((await call(method, url, undefined, payload)).status).toBe(401)
    }
    for (const [method, url, payload] of routes.filter(
      ([method]) => method === 'POST',
    )) {
      expect((await call(method, url, readerToken, payload)).status).toBe(403)
    }
  })

  it('appoints a member, lists the facility and ends the membership', async () => {
    const employeeId = await addEmployee()

    const created = await appoint({
      employeeId,
      role: role('chair'),
      decisionNumber: 'SK/2026/010',
    })

    expect(created.status).toBe(201)
    const body = created.body as Record<string, any>
    expect(body).toMatchObject({
      employee_id: employeeId,
      facility_id: facilityId,
      committee: { code: 'komite_medik' },
      role: { code: 'chair' },
      status: 'active',
      decision_ref: { number: 'SK/2026/010', document: null },
    })
    expect(body).not.toHaveProperty('_id')
    const list = await call(
      'GET',
      `/v1/committee-memberships?facilityId=${facilityId}&committee=komite_medik&status=active`,
      readerToken,
    )
    expect(list.status).toBe(200)
    expect((list.body as Record<string, any>[]).map((m) => m.id)).toContain(body.id)

    const ended = await call(
      'POST',
      `/v1/committee-memberships/${body.id}/end`,
      writerToken,
      { date: new Date().toISOString().slice(0, 10), version: body.version },
    )
    expect(ended.status).toBe(201)
    expect(ended.body).toMatchObject({ status: 'ended' })
  })

  it('answers 404 for a missing, malformed or foreign id', async () => {
    const unknown = new Types.ObjectId().toHexString()
    const foreignFacility = (
      await workforce.facilities.create({
        tenant_id: otherTenantId,
        organization_id: new Types.ObjectId().toHexString(),
        code: 'foreign',
        name: [{ locale: 'en', text: 'X' }],
        address: null,
        timezone: 'Asia/Jakarta',
        holiday_calendar_codes: [],
        external_ids: [],
        status: 'active',
      })
    ).id

    for (const id of [unknown, foreignFacility]) {
      const reply = await call(
        'GET',
        `/v1/committee-memberships?facilityId=${id}`,
        readerToken,
      )
      expect(reply.status).toBe(404)
      expect(reply.body).toMatchObject({ code: 'facility_not_found' })
    }
    for (const id of [unknown, 'bad']) {
      expect(
        (
          await call('POST', `/v1/committee-memberships/${id}/end`, writerToken, {
            date: '2026-03-01',
          })
        ).body,
      ).toMatchObject({ code: 'membership_not_found' })
    }
    const created = await appoint({ employeeId: await addEmployee() })
    expect(
      (
        await call(
          'POST',
          `/v1/committee-memberships/${(created.body as Record<string, any>).id}/end`,
          otherTenantToken,
          { date: '2026-03-01' },
        )
      ).body,
    ).toMatchObject({ code: 'membership_not_found' })
  })

  it('answers 409 for a second role of the same person, a second chair and a second secretary', async () => {
    const first = await addEmployee()
    const second = await addEmployee()
    const committeeCode = committee('komite_keperawatan')
    await appoint({ employeeId: first, committee: committeeCode, role: role('chair') })
    await appoint({
      employeeId: second,
      committee: committeeCode,
      role: role('secretary'),
    })
    const third = await addEmployee()

    const again = await appoint({ employeeId: first, committee: committeeCode })
    const chair = await appoint({
      employeeId: third,
      committee: committeeCode,
      role: role('chair'),
    })
    const secretary = await appoint({
      employeeId: third,
      committee: committeeCode,
      role: role('secretary'),
    })

    expect(again.status).toBe(409)
    expect(again.body).toMatchObject({ code: 'membership_exists' })
    expect(chair.body).toMatchObject({ code: 'chair_exists' })
    expect(secretary.body).toMatchObject({ code: 'secretary_exists' })
  })

  it('validates the request: 400 for shape, 422 for business rules, and list limits', async () => {
    const employeeId = await addEmployee()

    expect((await appoint({ employeeId: 'bad' })).status).toBe(400)
    expect(
      (await call('POST', '/v1/committee-memberships', writerToken, {})).status,
    ).toBe(400)
    const future = await appoint({
      employeeId,
      period: { start: '2999-01-01' },
    })
    expect(future.status).toBe(422)
    for (const query of [
      '',
      `facilityId=${facilityId}&limit=0`,
      `facilityId=${facilityId}&limit=101`,
      `facilityId=${facilityId}&offset=-1`,
      `facilityId=${facilityId}&status=gone`,
      'facilityId=bad',
    ]) {
      expect(
        (await call('GET', `/v1/committee-memberships?${query}`, readerToken)).status,
      ).toBe(400)
    }
    expect(
      (
        await call('POST', '/v1/committee-memberships/x/end', writerToken, {
          date: 'not-a-date',
        })
      ).status,
    ).toBe(400)
  })

  it('writes no log entry when data is only read, except the access log of the request', async () => {
    const { written, restore } = captureLogs()
    try {
      const replies = [
        await call(
          'GET',
          `/v1/committee-memberships?facilityId=${facilityId}`,
          readerToken,
        ),
        await call(
          'GET',
          `/v1/committee-memberships?facilityId=${new Types.ObjectId().toHexString()}`,
          readerToken,
        ),
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

  it("logs one entry per write, without the membership's values", async () => {
    const employeeId = await addEmployee()
    const { written, restore } = captureLogs()
    try {
      const created = await appoint({
        employeeId,
        committee: committee('komite_keperawatan'),
        decisionNumber: 'SK/RAHASIA',
        reason: 'Alasan Rahasia',
      })
      await call(
        'POST',
        `/v1/committee-memberships/${(created.body as Record<string, any>).id}/end`,
        writerToken,
        { date: new Date().toISOString().slice(0, 10), reason: 'Catatan Rahasia' },
      )
      await vi.waitFor(() =>
        expect(
          written.filter((entry) => entry.event === 'http_request'),
        ).toHaveLength(2),
      )

      const entries = written.filter((entry) => entry.event !== 'http_request')
      expect(entries.map((entry) => entry.event)).toEqual([
        'committee_membership_create',
        'committee_membership_end',
      ])
      for (const text of ['SK/RAHASIA', 'Alasan Rahasia', 'Catatan Rahasia']) {
        expect(JSON.stringify(written)).not.toContain(text)
      }
    } finally {
      restore()
    }
  })
})
