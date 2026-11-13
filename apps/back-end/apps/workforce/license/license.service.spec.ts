import { Types } from 'mongoose'
import { runWithRequestContext } from '@utility/logger/context'
import { type AppLogger } from '@utility/logger/service'
import { CodeConceptService } from '../concept/code-concept.service'
import {
  InMemoryCodeConcepts,
  InMemoryEmployees,
  InMemoryFacilities,
  InMemoryProfessionalLicenses,
} from '../testing/in-memory'
import { LicenseService, type RegisterLicenseInput } from './license.service'

describe('LicenseService', () => {
  const tenantId = new Types.ObjectId().toHexString()
  const otherTenantId = new Types.ObjectId().toHexString()
  const organizationId = new Types.ObjectId().toHexString()
  const log = vi.fn()
  const warn = vi.fn()
  const error = vi.fn()
  const debug = vi.fn()
  let licenses: InMemoryProfessionalLicenses
  let employees: InMemoryEmployees
  let facilities: InMemoryFacilities
  let concepts: InMemoryCodeConcepts
  let service: LicenseService
  let employeeId: string
  let facilityId: string

  const type = (code: string) => ({ system: 'id.license-type', code })
  const profession = (code = 'dokter') => ({ system: 'id.profession', code })
  const document = {
    file_id: 'file-1',
    content_type: 'application/pdf',
    sha256: 'a'.repeat(64),
  }

  /**
   * Runs `work` as a signed-in request.
   *
   * @param work - Code to run.
   * @returns What `work` returns.
   */
  function asAdmin<T>(work: () => Promise<T>): Promise<T> {
    return runWithRequestContext(
      {
        correlationId: 'c1',
        actor: { account_id: 'a1', display_name: 'Admin', kind: 'account' },
      },
      work,
    )
  }

  /**
   * Adds a platform-wide code concept.
   *
   * @param system - Code system.
   * @param code - Code.
   * @param properties - Concept properties.
   * @param status - Concept status.
   */
  async function addConcept(
    system: string,
    code: string,
    properties: Record<string, unknown> = {},
    status: 'active' | 'retired' = 'active',
  ) {
    await asAdmin(() =>
      concepts.create({
        system,
        code,
        display: [{ locale: 'en', text: code }],
        properties,
        mappings: [],
        period: null,
        status,
      }),
    )
  }

  /**
   * Adds an employee.
   *
   * @param status - Employment status.
   * @param tenant - Tenant of the employee.
   * @returns The employee.
   */
  function addEmployee(
    status: 'active' | 'separated' = 'active',
    tenant = tenantId,
  ) {
    return asAdmin(() =>
      employees.create({
        tenant_id: tenant,
        employee_number: `E${new Types.ObjectId().toHexString()}`,
        name: {
          use: 'official',
          text: 'Siti',
          given: [],
          prefix: [],
          suffix: [],
        },
        other_names: [],
        display_name: 'Siti',
        administrative_gender: null,
        workforce_category: {
          system: 'id.workforce-category',
          code: 'tenaga_medis',
        },
        is_clinical: true,
        profession: profession(),
        specialties: [],
        clinical_level: null,
        employment_status: status,
        employment_status_since: '2026-01-01',
        current_employment: null,
        primary_assignment: null,
        original_hire_date: '2026-01-01',
        separation_date: null,
        practitioner_ids: [],
        work_contacts: [],
        photo: null,
        preferred_language: null,
      }),
    )
  }

  /**
   * Adds a facility.
   *
   * @param override - Tenant and status.
   * @returns The facility.
   */
  function addFacility(
    override: { tenant?: string; status?: 'active' | 'inactive' } = {},
  ) {
    return asAdmin(() =>
      facilities.create({
        tenant_id: override.tenant ?? tenantId,
        organization_id: organizationId,
        code: `f-${new Types.ObjectId().toHexString()}`,
        name: [{ locale: 'en', text: 'RS Sehat' }],
        address: null,
        timezone: 'Asia/Jakarta',
        holiday_calendar_codes: [],
        external_ids: [],
        status: override.status ?? 'active',
      }),
    )
  }

  /**
   * Registers a STR (lifetime) through the service; override fields to change it.
   *
   * @param override - Fields that replace the defaults.
   * @returns The licence.
   */
  function registerStr(override: Partial<RegisterLicenseInput> = {}) {
    return asAdmin(() =>
      service.create(tenantId, {
        employeeId,
        licenseType: type('str'),
        profession: profession(),
        documentNumber: 'STR 123.456-789',
        issuingAuthority: { name: 'KKI' },
        jurisdiction: { country: 'ID' },
        issueDate: '2025-01-01',
        document,
        ...override,
      }),
    )
  }

  /**
   * Registers a SIP at the facility through the service; override fields to change it.
   *
   * @param override - Fields that replace the defaults.
   * @returns The licence.
   */
  function registerSip(override: Partial<RegisterLicenseInput> = {}) {
    return registerStr({
      licenseType: type('sip'),
      documentNumber: 'SIP-777',
      issuingAuthority: { name: 'Dinas Kesehatan' },
      issueDate: '2026-01-01',
      expiryDate: '2031-01-01',
      practiceLocation: { facilityId },
      ...override,
    })
  }

  /**
   * Captures the rejection of a call.
   *
   * @param work - The call.
   * @returns The thrown error.
   */
  async function rejection(work: () => Promise<unknown>) {
    try {
      await work()
    } catch (thrown: unknown) {
      return thrown
    }
    throw new Error('Expected a rejection')
  }

  beforeEach(async () => {
    vi.resetAllMocks()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-03-10T12:00:00Z'))
    licenses = new InMemoryProfessionalLicenses()
    employees = new InMemoryEmployees()
    facilities = new InMemoryFacilities()
    concepts = new InMemoryCodeConcepts()
    const logger = { log, warn, error, debug } as unknown as AppLogger
    service = new LicenseService(
      licenses,
      employees,
      facilities,
      new CodeConceptService(concepts, logger),
      logger,
    )
    await addConcept('id.license-type', 'str', {
      eligibility_role: 'registration',
      requires_expiry_date: false,
      location_specific: false,
      max_locations_parameter: null,
    })
    await addConcept('id.license-type', 'sip', {
      eligibility_role: 'practice_permit',
      requires_expiry_date: true,
      location_specific: true,
      max_locations_parameter: 'MAX_PRACTICE_LOCATIONS_MEDIS',
    })
    await addConcept('id.license-type', 'perawat-only', {
      eligibility_role: null,
      requires_expiry_date: false,
      location_specific: false,
      professions: [{ system: 'id.profession', code: 'perawat' }],
    })
    await addConcept('id.license-type', 'lama', {
      eligibility_role: null,
      requires_expiry_date: false,
      location_specific: false,
    }, 'retired')
    await addConcept('id.profession', 'dokter', { workforce_category: 'tenaga_medis' })
    await addConcept('id.profession', 'perawat', { workforce_category: 'tenaga_keperawatan' })
    await addConcept('id.specialty', 'bedah')
    await addConcept('id.licensing-authority', 'kki')
    employeeId = (await addEmployee()).id
    facilityId = (await addFacility()).id
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('registration by HR', () => {
    it('registers a lifetime STR as pending verification, with a normalized number and the type copied', async () => {
      const created = await registerStr({ reason: 'Alasan Rahasia' })

      expect(created).toMatchObject({
        tenant_id: tenantId,
        employee_id: employeeId,
        license_type: { code: 'str' },
        eligibility_role: 'registration',
        profession: { code: 'dokter' },
        document_number: 'STR 123.456-789',
        document_number_normalized: 'STR123456789',
        issuing_authority: { name: 'KKI', code: null },
        jurisdiction: { country: 'ID', subdivision: null },
        practice_location: null,
        issue_date: '2025-01-01',
        expiry_date: null,
        status: 'pending_verification',
        status_effective_date: '2026-03-10',
        is_live: true,
        verification: null,
        replaces_license_id: null,
        submission: { via: 'hr', by: { account_id: 'a1' } },
      })
      expect(log).toHaveBeenCalledTimes(1)
      expect(log.mock.calls[0]?.[0]).toMatchObject({
        event: 'license_create',
        outcome: 'success',
      })
      expect(JSON.stringify(log.mock.calls)).not.toContain('STR 123')
      expect(JSON.stringify(log.mock.calls)).not.toContain('Alasan Rahasia')
    })

    it('registers a SIP at a facility of the tenant, copying the facility name', async () => {
      const created = await registerSip()

      expect(created).toMatchObject({
        eligibility_role: 'practice_permit',
        expiry_date: '2031-01-01',
        practice_location: { facility_id: facilityId, name: 'RS Sehat' },
      })
    })

    it('registers a SIP at another place by name', async () => {
      const created = await registerSip({
        practiceLocation: { name: ' Klinik Harapan ' },
      })

      expect(created.practice_location).toEqual({
        facility_id: null,
        name: 'Klinik Harapan',
        address: null,
      })
    })

    it.each([
      ['invalid_document_number', { documentNumber: '   ' }],
      ['invalid_document_number', { documentNumber: 'x'.repeat(65) }],
      ['invalid_document', { document: { ...document, content_type: 'text/html' } }],
      ['invalid_document', { document: { ...document, sha256: 'zz' } }],
      ['invalid_issuing_authority', { issuingAuthority: { name: '  ' } }],
      ['invalid_jurisdiction', { jurisdiction: { country: 'Indonesia' } }],
      ['invalid_jurisdiction', { jurisdiction: { country: 'US', subdivision: 'california' } }],
      ['invalid_license_type', { licenseType: { system: 'id.unit-type', code: 'str' } }],
      ['unknown_code', { licenseType: type('nonsense') }],
      ['code_retired', { licenseType: type('lama') }],
      ['invalid_profession', { profession: { system: 'id.unit-type', code: 'x' } }],
      ['unknown_code', { profession: profession('nonsense') }],
      ['invalid_specialty', { specialty: { system: 'id.unit-type', code: 'x' } }],
      ['unknown_code', { specialty: { system: 'id.specialty', code: 'nonsense' } }],
      ['profession_not_allowed', { licenseType: type('perawat-only') }],
      ['invalid_period', { issueDate: '2025-02-30' }],
      ['invalid_period', { issueDate: '2025-01-01', expiryDate: '2024-01-01' }],
      ['invalid_period', { issueDate: '1900-01-01' }],
      ['practice_location_not_allowed', { practiceLocation: { name: 'Klinik' } }],
    ])('rejects %s', async (code, override) => {
      expect(await rejection(() => registerStr(override))).toMatchObject({ code })
      expect(await licenses.findByEmployee(tenantId, employeeId)).toEqual([])
    })

    it('needs an expiry date and a practice location for a SIP, exactly one way of naming the place', async () => {
      expect(
        await rejection(() => registerSip({ expiryDate: null })),
      ).toMatchObject({ code: 'expiry_required' })
      expect(
        await rejection(() => registerSip({ practiceLocation: null })),
      ).toMatchObject({ code: 'practice_location_required' })
      expect(
        await rejection(() =>
          registerSip({ practiceLocation: { facilityId, name: 'Klinik' } }),
        ),
      ).toMatchObject({ code: 'invalid_practice_location' })
    })

    it('rejects a missing, foreign or inactive facility as the practice location', async () => {
      const foreign = await addFacility({ tenant: otherTenantId })
      const inactive = await addFacility({ status: 'inactive' })

      for (const id of [new Types.ObjectId().toHexString(), 'bad', foreign.id]) {
        expect(
          await rejection(() => registerSip({ practiceLocation: { facilityId: id } })),
        ).toMatchObject({ code: 'facility_not_found' })
      }
      expect(
        await rejection(() =>
          registerSip({ practiceLocation: { facilityId: inactive.id } }),
        ),
      ).toMatchObject({ code: 'facility_inactive' })
    })

    it('rejects a missing, foreign or separated employee', async () => {
      const foreign = await addEmployee('active', otherTenantId)
      const separated = await addEmployee('separated')

      for (const id of [new Types.ObjectId().toHexString(), 'bad', foreign.id]) {
        expect(await rejection(() => registerStr({ employeeId: id }))).toMatchObject({
          code: 'employee_not_found',
        })
      }
      expect(
        await rejection(() => registerStr({ employeeId: separated.id })),
      ).toMatchObject({ code: 'employee_separated' })
    })

    it('refuses a second live licence with the same type and normalized number, but not a rejected one', async () => {
      const first = await registerStr()

      expect(
        await rejection(() => registerStr({ documentNumber: 'str123456789' })),
      ).toMatchObject({ code: 'license_exists' })
      expect(
        await registerStr({ licenseType: type('perawat-only'), profession: profession('perawat'), documentNumber: 'STR 123.456-789' }),
      ).toMatchObject({ status: 'pending_verification' })
      await asAdmin(() =>
        licenses.update(first.id, { status: 'rejected', is_live: false }),
      )
      expect(await registerStr()).toMatchObject({ is_live: true })
    })

    it('accepts a renewal of a valid SIP of the same employee, type, profession and facility', async () => {
      const old = await registerSip()
      await asAdmin(() => licenses.update(old.id, { status: 'valid' }))

      const renewal = await registerSip({
        documentNumber: 'SIP-778',
        issueDate: '2026-06-01',
        expiryDate: '2031-06-01',
        replacesLicenseId: old.id,
      })

      expect(renewal).toMatchObject({
        replaces_license_id: old.id,
        status: 'pending_verification',
      })
    })

    it('rejects a renewal of a licence that is missing, pending, foreign, of another facility or another employee', async () => {
      const pending = await registerSip()
      const otherEmployee = await addEmployee()
      const otherFacility = await addFacility()
      const valid = await registerSip({
        documentNumber: 'SIP-900',
        practiceLocation: { facilityId: otherFacility.id },
      })
      await asAdmin(() => licenses.update(valid.id, { status: 'valid' }))
      const theirs = await registerSip({
        employeeId: otherEmployee.id,
        documentNumber: 'SIP-901',
      })
      await asAdmin(() => licenses.update(theirs.id, { status: 'valid' }))

      for (const id of [
        new Types.ObjectId().toHexString(),
        'bad',
        pending.id,
        valid.id,
        theirs.id,
      ]) {
        expect(
          await rejection(() =>
            registerSip({ documentNumber: 'SIP-902', replacesLicenseId: id }),
          ),
        ).toMatchObject({ code: 'replaced_license_invalid' })
      }
    })

    it('writes nothing and logs a failure when a rule is broken', async () => {
      await rejection(() => registerStr({ documentNumber: '' }))

      expect(await licenses.findByEmployee(tenantId, employeeId)).toEqual([])
      expect(warn.mock.calls.length + error.mock.calls.length).toBe(1)
    })
  })

  describe('self-service', () => {
    it('registers the own licence as self-service, ignoring any employee id in the body', async () => {
      const other = await addEmployee()

      const created = await asAdmin(() =>
        service.createOwn(tenantId, employeeId, {
          employeeId: other.id,
          licenseType: type('str'),
          profession: profession(),
          documentNumber: 'STR-1',
          issuingAuthority: { name: 'KKI' },
          jurisdiction: { country: 'ID' },
          issueDate: '2025-01-01',
          document,
        }),
      )

      expect(created).toMatchObject({
        employee_id: employeeId,
        submission: { via: 'self_service' },
        status: 'pending_verification',
      })
      expect(log.mock.calls[0]?.[0]).toMatchObject({ event: 'license_submit' })
    })

    it('answers 404 when the account has no employee, or one of another tenant, and refuses a separated employee', async () => {
      const foreign = await addEmployee('active', otherTenantId)
      const separated = await addEmployee('separated')
      const body: RegisterLicenseInput = {
        licenseType: type('str'),
        profession: profession(),
        documentNumber: 'STR-2',
        issuingAuthority: { name: 'KKI' },
        jurisdiction: { country: 'ID' },
        issueDate: '2025-01-01',
        document,
      }

      for (const id of [null, foreign.id, 'bad']) {
        expect(
          await rejection(() => asAdmin(() => service.createOwn(tenantId, id, body))),
        ).toMatchObject({ code: 'employee_not_found' })
      }
      expect(
        await rejection(() =>
          asAdmin(() => service.createOwn(tenantId, separated.id, body)),
        ),
      ).toMatchObject({ code: 'employee_separated' })
    })
  })

  describe('reads', () => {
    it('gets one licence, answers 404 for a missing, malformed or foreign one, and writes no log entry', async () => {
      const created = await registerStr()
      log.mockClear()

      expect(await service.get(tenantId, created.id)).toMatchObject({
        id: created.id,
      })
      for (const [tenant, id] of [
        [tenantId, new Types.ObjectId().toHexString()],
        [tenantId, 'bad'],
        [otherTenantId, created.id],
      ]) {
        await expect(service.get(tenant as string, id as string)).rejects.toMatchObject({
          code: 'license_not_found',
        })
      }
      expect([log, warn, error, debug].flatMap((fn) => fn.mock.calls)).toEqual([])
    })

    it('lists an employee’s licences, newest issue first, and answers 404 for a foreign employee', async () => {
      const older = await registerStr()
      const newer = await registerSip()
      log.mockClear()

      const list = await service.listByEmployee(tenantId, employeeId)

      expect(list.map((item) => item.id)).toEqual([newer.id, older.id])
      for (const id of [(await addEmployee('active', otherTenantId)).id, 'bad', new Types.ObjectId().toHexString()]) {
        await expect(service.listByEmployee(tenantId, id)).rejects.toMatchObject({
          code: 'employee_not_found',
        })
      }
      expect([log, warn, error, debug].flatMap((fn) => fn.mock.calls)).toEqual([])
    })

    it('lists the tenant’s licences by status, type and facility with paging, and never those of another tenant', async () => {
      const str = await registerStr()
      const sip = await registerSip()
      await asAdmin(() => licenses.update(sip.id, { status: 'valid' }))
      const foreignEmployee = await addEmployee('active', otherTenantId)
      await asAdmin(() =>
        service.create(otherTenantId, {
          employeeId: foreignEmployee.id,
          licenseType: type('str'),
          profession: profession(),
          documentNumber: 'STR-F',
          issuingAuthority: { name: 'KKI' },
          jurisdiction: { country: 'ID' },
          issueDate: '2025-01-01',
          document,
        }),
      ).catch(() => undefined)

      expect((await service.list(tenantId, {})).map((item) => item.id).sort()).toEqual(
        [str.id, sip.id].sort(),
      )
      expect(
        (await service.list(tenantId, { status: 'valid' })).map((item) => item.id),
      ).toEqual([sip.id])
      expect(
        (await service.list(tenantId, { licenseType: 'str' })).map((item) => item.id),
      ).toEqual([str.id])
      expect(
        (await service.list(tenantId, { facilityId })).map((item) => item.id),
      ).toEqual([sip.id])
      expect(await service.list(tenantId, { limit: 1, offset: 1 })).toHaveLength(1)
    })

    it('lists only valid licences expiring within the window, soonest first', async () => {
      const soon = await registerSip({ documentNumber: 'SIP-A', expiryDate: '2026-04-01' })
      const later = await registerSip({
        documentNumber: 'SIP-B',
        expiryDate: '2026-05-15',
        practiceLocation: { name: 'Klinik' },
      })
      const far = await registerSip({
        documentNumber: 'SIP-C',
        expiryDate: '2028-01-01',
        practiceLocation: { name: 'Klinik Dua' },
      })
      const pending = await registerSip({ documentNumber: 'SIP-D', expiryDate: '2026-04-02' })
      for (const item of [soon, later, far]) {
        await asAdmin(() => licenses.update(item.id, { status: 'valid' }))
      }

      const list = await service.list(tenantId, { expiringWithinDays: 90 })

      expect(list.map((item) => item.id)).toEqual([soon.id, later.id])
      expect(list.map((item) => item.id)).not.toContain(pending.id)
      expect(await service.list(tenantId, { expiringWithinDays: 90, status: 'revoked' })).toEqual([])
    })
  })
})
