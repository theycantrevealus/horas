import { Logger } from '@nestjs/common'
import { Types } from 'mongoose'
import { PERMISSIONS } from '@identity/permission'
import { createHrGateway, type HrGateway } from '../testing/hr-gateway'
import {
  createInMemoryWorkforce,
  type InMemoryWorkforce,
} from '../testing/in-memory-workforce'
import { LicenseManagementModule } from './license-management.module'

describe('license endpoints (in-memory repositories)', () => {
  const workforce: InMemoryWorkforce = createInMemoryWorkforce()
  let gateway: HrGateway
  let call: HrGateway['call']
  let writerToken: string
  let readerToken: string
  let selfToken: string
  let noEmployeeToken: string
  let otherTenantToken: string
  let tenantId: string
  let otherTenantId: string
  let facilityId: string
  let employeeId: string
  let counter = 0

  const str = { system: 'id.license-type', code: 'str' }
  const sip = { system: 'id.license-type', code: 'sip' }
  const dokter = { system: 'id.profession', code: 'dokter' }
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
      profession: dokter,
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
   * Registers a lifetime STR through the API as the writer.
   *
   * @param override - Fields that replace the defaults.
   * @returns The reply.
   */
  function register(override: object = {}) {
    counter += 1
    return call('POST', '/v1/licenses', writerToken, {
      employeeId,
      licenseType: str,
      profession: dokter,
      documentNumber: `STR-${counter}`,
      issuingAuthority: { name: 'KKI' },
      jurisdiction: { country: 'ID' },
      issueDate: '2025-01-01',
      document,
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
      modules: [LicenseManagementModule],
      ...workforce.options,
    })
    call = gateway.call
    ;({ tenantId, otherTenantId } = gateway)
    employeeId = await addEmployee()
    writerToken = await gateway.seedAndLogin(tenantId, 'writer', [
      PERMISSIONS.WORKFORCE_LICENSE_READ,
      PERMISSIONS.WORKFORCE_LICENSE_WRITE,
    ])
    readerToken = await gateway.seedAndLogin(tenantId, 'reader', [
      PERMISSIONS.WORKFORCE_LICENSE_READ,
    ])
    selfToken = await gateway.seedAndLogin(tenantId, 'self', [], employeeId)
    noEmployeeToken = await gateway.seedAndLogin(tenantId, 'noemp', [], null)
    otherTenantToken = await gateway.seedAndLogin(otherTenantId, 'other', [
      PERMISSIONS.WORKFORCE_LICENSE_READ,
      PERMISSIONS.WORKFORCE_LICENSE_WRITE,
    ])
    for (const [system, code, properties] of [
      ['id.license-type', 'str', { eligibility_role: 'registration', requires_expiry_date: false, location_specific: false, max_locations_parameter: null }],
      ['id.license-type', 'sip', { eligibility_role: 'practice_permit', requires_expiry_date: true, location_specific: true, max_locations_parameter: 'MAX_PRACTICE_LOCATIONS_MEDIS' }],
      ['id.profession', 'dokter', { workforce_category: 'tenaga_medis' }],
    ] as [string, string, Record<string, unknown>][]) {
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
    facilityId = (
      await workforce.facilities.create({
        tenant_id: tenantId,
        organization_id: new Types.ObjectId().toHexString(),
        code: 'rs-sehat',
        name: [{ locale: 'en', text: 'RS Sehat' }],
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
      ['GET', '/v1/licenses', undefined],
      ['GET', `/v1/employees/${id}/licenses`, undefined],
      ['POST', '/v1/licenses', {}],
      ['POST', '/v1/employees/me/licenses', {}],
      ['GET', `/v1/licenses/${id}`, undefined],
    ]
    for (const [method, url, payload] of routes) {
      expect((await call(method, url, undefined, payload)).status).toBe(401)
    }
    expect((await call('POST', '/v1/licenses', readerToken, {})).status).toBe(403)
    expect((await call('GET', '/v1/licenses', selfToken)).status).toBe(403)
    expect(
      (await call('POST', '/v1/employees/me/licenses', selfToken, {})).status,
    ).toBe(400)
  })

  it('registers a licence as pending verification, reads it back and lists it', async () => {
    const created = await register({ documentNumber: ' STR 100.200-300 ' })

    expect(created.status).toBe(201)
    const body = created.body as Record<string, any>
    expect(body).toMatchObject({
      employee_id: employeeId,
      license_type: { code: 'str' },
      eligibility_role: 'registration',
      document_number: 'STR 100.200-300',
      document_number_normalized: 'STR100200300',
      status: 'pending_verification',
      is_live: true,
      verification: null,
      submission: { via: 'hr' },
      document: { file_id: 'file-1', content_type: 'application/pdf' },
    })
    expect(body).not.toHaveProperty('_id')
    const read = await call('GET', `/v1/licenses/${body.id}`, readerToken)
    const byEmployee = await call('GET', `/v1/employees/${employeeId}/licenses`, readerToken)
    const all = await call('GET', '/v1/licenses?status=pending_verification', readerToken)
    expect(read.status).toBe(200)
    expect(byEmployee.status).toBe(200)
    expect((byEmployee.body as Record<string, any>[]).map((l) => l.id)).toContain(body.id)
    expect((all.body as Record<string, any>[]).map((l) => l.id)).toContain(body.id)
  })

  it('registers a SIP at a facility and lists the expiry report', async () => {
    const created = await register({
      licenseType: sip,
      documentNumber: 'SIP-EXP-1',
      issuingAuthority: { name: 'Dinas Kesehatan' },
      issueDate: '2026-01-01',
      expiryDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      practiceLocation: { facilityId },
    })

    expect(created.status).toBe(201)
    expect(created.body).toMatchObject({
      eligibility_role: 'practice_permit',
      practice_location: { facility_id: facilityId, name: 'RS Sehat' },
    })
    // A pending licence is not in the expiry report, which lists valid ones.
    const report = await call('GET', '/v1/licenses?expiringWithinDays=90', readerToken)
    expect(report.status).toBe(200)
    expect(report.body).toEqual([])
    const byFacility = await call('GET', `/v1/licenses?facilityId=${facilityId}`, readerToken)
    expect((byFacility.body as Record<string, any>[]).length).toBeGreaterThan(0)
  })

  it('lets a signed-in employee submit their own licence, and refuses an account with no employee', async () => {
    const other = await addEmployee()

    const own = await call('POST', '/v1/employees/me/licenses', selfToken, {
      licenseType: str,
      profession: dokter,
      documentNumber: 'STR-SELF-1',
      issuingAuthority: { name: 'KKI' },
      jurisdiction: { country: 'ID' },
      issueDate: '2025-01-01',
      document,
    })
    const injected = await call('POST', '/v1/employees/me/licenses', selfToken, {
      employeeId: other,
      licenseType: str,
      profession: dokter,
      documentNumber: 'STR-SELF-2',
      issuingAuthority: { name: 'KKI' },
      jurisdiction: { country: 'ID' },
      issueDate: '2025-01-01',
      document,
    })
    const none = await call('POST', '/v1/employees/me/licenses', noEmployeeToken, {
      licenseType: str,
      profession: dokter,
      documentNumber: 'STR-SELF-3',
      issuingAuthority: { name: 'KKI' },
      jurisdiction: { country: 'ID' },
      issueDate: '2025-01-01',
      document,
    })

    expect(own.status).toBe(201)
    expect(own.body).toMatchObject({
      employee_id: employeeId,
      submission: { via: 'self_service' },
    })
    // The body cannot name another employee: an unknown field is refused or ignored, never obeyed.
    if (injected.status === 201) {
      expect(injected.body).toMatchObject({ employee_id: employeeId })
    } else {
      expect(injected.status).toBe(400)
    }
    expect(none.status).toBe(404)
    expect(none.body).toMatchObject({ code: 'employee_not_found' })
  })

  it('answers 404 for a missing, malformed or foreign id', async () => {
    const created = await register()
    const id = (created.body as Record<string, any>).id
    const unknown = new Types.ObjectId().toHexString()
    const foreignEmployee = await addEmployee(otherTenantId)

    for (const url of [`/v1/licenses/${unknown}`, '/v1/licenses/bad']) {
      expect((await call('GET', url, readerToken)).body).toMatchObject({
        code: 'license_not_found',
      })
    }
    expect((await call('GET', `/v1/licenses/${id}`, otherTenantToken)).status).toBe(404)
    for (const url of [
      `/v1/employees/${unknown}/licenses`,
      '/v1/employees/bad/licenses',
      `/v1/employees/${foreignEmployee}/licenses`,
    ]) {
      expect((await call('GET', url, readerToken)).body).toMatchObject({
        code: 'employee_not_found',
      })
    }
  })

  it('answers 409 for a second live licence with the same type and number', async () => {
    await register({ documentNumber: 'STR-DUP-1' })

    const again = await register({ documentNumber: 'str dup 1'.replace(/ /g, '-') })

    expect(again.status).toBe(409)
    expect(again.body).toMatchObject({ code: 'license_exists' })
  })

  it('validates the request: 400 for shape, 422 for business rules, and list limits', async () => {
    expect((await register({ employeeId: 'bad' })).status).toBe(400)
    expect((await call('POST', '/v1/licenses', writerToken, {})).status).toBe(400)
    expect(
      (await register({ document: { ...document, sha256: 'short' } })).status,
    ).toBe(400)
    const noExpiry = await register({
      licenseType: sip,
      documentNumber: 'SIP-NOEXP',
      practiceLocation: { facilityId },
    })
    const noPlace = await register({
      licenseType: sip,
      documentNumber: 'SIP-NOPLACE',
      expiryDate: '2030-01-01',
    })
    expect(noExpiry.status).toBe(422)
    expect(noExpiry.body).toMatchObject({ code: 'expiry_required' })
    expect(noPlace.body).toMatchObject({ code: 'practice_location_required' })
    for (const query of [
      'limit=0',
      'limit=101',
      'offset=-1',
      'status=gone',
      'expiringWithinDays=0',
      'expiringWithinDays=4000',
      'facilityId=bad',
    ]) {
      expect((await call('GET', `/v1/licenses?${query}`, readerToken)).status).toBe(400)
    }
  })

  it('writes no log entry when data is only read, except the access log of the request', async () => {
    const { written, restore } = captureLogs()
    try {
      const replies = [
        await call('GET', '/v1/licenses', readerToken),
        await call('GET', `/v1/employees/${employeeId}/licenses`, readerToken),
        await call('GET', '/v1/licenses/missing-id', readerToken),
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

  it("logs one entry per write, without the licence's values", async () => {
    const { written, restore } = captureLogs()
    try {
      await register({
        documentNumber: 'STR-RAHASIA-9',
        reason: 'Alasan Rahasia',
      })
      await call('POST', '/v1/employees/me/licenses', selfToken, {
        licenseType: str,
        profession: dokter,
        documentNumber: 'STR-RAHASIA-10',
        issuingAuthority: { name: 'KKI Rahasia' },
        jurisdiction: { country: 'ID' },
        issueDate: '2025-01-01',
        document,
      })
      await vi.waitFor(() =>
        expect(
          written.filter((entry) => entry.event === 'http_request'),
        ).toHaveLength(2),
      )

      const entries = written.filter((entry) => entry.event !== 'http_request')
      expect(entries.map((entry) => entry.event)).toEqual([
        'license_create',
        'license_submit',
      ])
      for (const text of ['STR-RAHASIA', 'Alasan Rahasia', 'KKI Rahasia']) {
        expect(JSON.stringify(written)).not.toContain(text)
      }
    } finally {
      restore()
    }
  })
})
