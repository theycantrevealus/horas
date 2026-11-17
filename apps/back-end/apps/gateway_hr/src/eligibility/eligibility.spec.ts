import { Logger } from '@nestjs/common'
import { Types } from 'mongoose'
import { PERMISSIONS } from '@identity/permission'
import { createHrGateway, type HrGateway } from '../testing/hr-gateway'
import {
  createInMemoryWorkforce,
  type InMemoryWorkforce,
} from '../testing/in-memory-workforce'
import { EligibilityManagementModule } from './eligibility-management.module'

describe('eligibility route (in-memory repositories)', () => {
  const workforce: InMemoryWorkforce = createInMemoryWorkforce()
  const actor = { account_id: 'a1', display_name: 'Admin', kind: 'account' as const }
  let gateway: HrGateway
  let call: HrGateway['call']
  let readerToken: string
  let otherTenantToken: string
  let tenantId: string
  let facilityId: string
  let unitId: string
  let employeeId: string
  let privilegeId: string

  /**
   * Gives the employee a valid registration, a valid practice permit and an SPK covering the unit,
   * with a grant of the privilege inside it.
   */
  async function makeEligible() {
    for (const role of ['registration', 'practice_permit'] as const) {
      const number = new Types.ObjectId().toHexString().slice(-6).toUpperCase()
      await workforce.licenses.create({
        tenant_id: tenantId,
        employee_id: employeeId,
        license_type: { system: 'id.license-type', code: role === 'registration' ? 'str' : 'sip' },
        eligibility_role: role,
        profession: { system: 'id.profession', code: 'dokter' },
        specialty: null,
        document_number: number,
        document_number_normalized: number,
        issuing_authority: { code: null, name: 'KKI' },
        jurisdiction: { country: 'ID', subdivision: null },
        practice_location: role === 'practice_permit' ? { facility_id: facilityId, name: 'RS', address: null } : null,
        issue_date: '2025-01-01',
        expiry_date: null,
        document: { file_id: 'f', content_type: 'application/pdf', sha256: 'a'.repeat(64) },
        status: 'valid',
        status_effective_date: '2025-01-02',
        is_live: true,
        submission: { via: 'hr', by: actor, at: new Date() },
        verification: null,
        rejection: null,
        revocation: null,
        superseded: null,
        replaces_license_id: null,
      })
    }
    const spk = await workforce.appointments.create({
      tenant_id: tenantId,
      appointment_number: 'SPK/ELG1',
      employee_id: employeeId,
      credentialing_facility_id: facilityId,
      credentialing_scope: 'facility',
      facility_ids: [facilityId],
      unit_ids: [unitId],
      source_application_id: new Types.ObjectId().toHexString(),
      valid_period: { start: '2025-01-01', end: '2099-12-31' },
      is_temporary: false,
      status: 'active',
      is_current: true,
      issued: { by: actor, director_employee_id: new Types.ObjectId().toHexString(), date: '2025-01-01' },
      signed_document: null,
      suspension: null,
      revocation: null,
      superseded_by_id: null,
    })
    await workforce.grants.create({
      tenant_id: tenantId,
      appointment_id: spk.id,
      employee_id: employeeId,
      facility_ids: [facilityId],
      unit_ids: [unitId],
      catalog_item_id: privilegeId,
      code: 'PD-1',
      condition: 'full',
      supervisor: null,
      restriction_notes: null,
      status: 'active',
      status_change: null,
      flag: null,
    })
  }

  beforeAll(async () => {
    gateway = await createHrGateway({
      modules: [EligibilityManagementModule],
      ...workforce.options,
    })
    call = gateway.call
    tenantId = gateway.tenantId
    readerToken = await gateway.seedAndLogin(tenantId, 'reader', [PERMISSIONS.WORKFORCE_ELIGIBILITY_READ])
    otherTenantToken = await gateway.seedAndLogin(gateway.otherTenantId, 'other', [PERMISSIONS.WORKFORCE_ELIGIBILITY_READ])
    facilityId = (
      await workforce.facilities.create({ tenant_id: tenantId, organization_id: new Types.ObjectId().toHexString(), code: 'rs-sehat', name: [{ locale: 'en', text: 'RS' }], address: null, timezone: 'Asia/Jakarta', holiday_calendar_codes: [], external_ids: [], status: 'active' })
    ).id
    unitId = (
      await workforce.units.create({
        tenant_id: tenantId,
        organization_id: new Types.ObjectId().toHexString(),
        facility_id: facilityId,
        code: 'poli-1',
        name: [{ locale: 'en', text: 'Poli' }],
        type: { system: 'id.unit-type', code: 'polyclinic' },
        parent_id: null,
        ancestor_ids: [],
        is_clinical: true,
        external_ids: [],
        period: { start: '2026-01-01', end: null },
        status: 'active',
      })
    ).id
    employeeId = (
      await workforce.employees.create({
        tenant_id: tenantId,
        employee_number: 'D1',
        name: { use: 'official', text: 'dr. Siti', given: [], prefix: [], suffix: [] },
        other_names: [],
        display_name: 'dr. Siti',
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
    ).id
    privilegeId = (
      await workforce.privileges.create({
        tenant_id: tenantId,
        facility_ids: [],
        code: 'PD-1',
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
    ).id
  })

  afterAll(async () => {
    await gateway.close()
  })

  const url = (extra = '', id = employeeId) => `/v1/employees/${id}/eligibility?unitId=${unitId}&date=2099-03-02${extra}`

  it('refuses a request without a token (401) and without the permission (403)', async () => {
    expect((await call('GET', url())).status).toBe(401)
    expect((await call('GET', url(), await gateway.seedAndLogin(tenantId, 'nobody', []))).status).toBe(403)
  })

  it('names every failing condition, then answers eligible once the records exist, and never caches', async () => {
    const before = await call('GET', url(`&privilegeId=${privilegeId}`), readerToken)

    expect(before.status).toBe(200)
    expect(before.headers['cache-control']).toBe('no-store')
    expect(before.body).toMatchObject({ employeeId, unitId, date: '2099-03-02', employmentAsOf: 'current', eligible: false, failed: 'str', privilege: null })
    expect(before.body?.checks.map((c: { met: boolean }) => c.met)).toEqual([true, false, false, false, false])

    await makeEligible()
    const general = await call('GET', url(), readerToken)
    expect(general.body).toMatchObject({ eligible: true, failed: null, privilege: null })
    expect(general.body?.checks).toHaveLength(4)

    const full = await call('GET', url(`&privilegeId=${privilegeId}`), readerToken)
    expect(full.body).toMatchObject({ eligible: true, failed: null, privilege: { catalogItemId: privilegeId, code: 'PD-1', condition: 'full', supervisorEmployeeId: null, flagged: false } })
    expect(full.body?.checks.at(-1)).toEqual({ condition: 'privilege', met: true })
  })

  it('answers 404 for a malformed, missing or foreign employee with one code', async () => {
    for (const id of ['not-an-id', new Types.ObjectId().toHexString()]) {
      const reply = await call('GET', url('', id), readerToken)
      expect(reply.status).toBe(404)
      expect(reply.body).toMatchObject({ code: 'employee_not_found' })
    }
    expect((await call('GET', url(), otherTenantToken)).status).toBe(404)
  })

  it('answers 422 for a missing unit or privilege and for a non-clinical employee', async () => {
    const other = new Types.ObjectId().toHexString()
    const unit = await call('GET', `/v1/employees/${employeeId}/eligibility?unitId=${other}`, readerToken)
    expect(unit.status).toBe(422)
    expect(unit.body).toMatchObject({ code: 'unit_not_found' })
    const privilege = await call('GET', url(`&privilegeId=${other}`), readerToken)
    expect(privilege.status).toBe(422)
    expect(privilege.body).toMatchObject({ code: 'privilege_not_found' })

    const clerk = await workforce.employees.create(Object.assign({}, await workforce.employees.findOne(employeeId), { employee_number: 'C1', is_clinical: false }) as never)
    const reply = await call('GET', url('', clerk.id), readerToken)
    expect(reply.status).toBe(422)
    expect(reply.body).toMatchObject({ code: 'not_clinical_employee' })
  })

  it('answers 400 for a missing or malformed unit, date or privilege', async () => {
    expect((await call('GET', `/v1/employees/${employeeId}/eligibility`, readerToken)).status).toBe(400)
    expect((await call('GET', `/v1/employees/${employeeId}/eligibility?unitId=bad`, readerToken)).status).toBe(400)
    expect((await call('GET', url('&privilegeId=bad'), readerToken)).status).toBe(400)
    expect((await call('GET', `/v1/employees/${employeeId}/eligibility?unitId=${unitId}&date=2099-13-40`, readerToken)).status).toBe(400)
  })

  it('writes no log entry of its own, on success or on failure', async () => {
    const written: Record<string, unknown>[] = []
    const spies = (['log', 'warn', 'error', 'debug', 'verbose'] as const).map((level) =>
      vi.spyOn(Logger.prototype, level).mockImplementation((entry: unknown) => {
        if (typeof entry === 'object' && entry !== null) {
          written.push(entry as Record<string, unknown>)
        }
      }),
    )
    try {
      await call('GET', url(`&privilegeId=${privilegeId}`), readerToken)
      await call('GET', url('', 'not-an-id'), readerToken)
    } finally {
      spies.forEach((spy) => spy.mockRestore())
    }

    expect(written.filter((entry) => entry.event !== 'http_request')).toEqual([])
  })
})
