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
  const run = vi.fn(async (work: () => Promise<unknown>) => work())
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
   * Runs `work` as a second HR Admin, who may verify what the first one submitted.
   *
   * @param work - Code to run.
   * @returns What `work` returns.
   */
  function asVerifier<T>(work: () => Promise<T>): Promise<T> {
    return runWithRequestContext(
      {
        correlationId: 'c2',
        actor: { account_id: 'a2', display_name: 'Verifier', kind: 'account' },
      },
      work,
    )
  }

  const method = { system: 'id.license-verification-method', code: 'manual_registry_check' }
  const mismatchReason = { system: 'id.license-status-reason', code: 'document_mismatch' }
  const revokeReason = { system: 'id.license-status-reason', code: 'revoked_by_authority' }

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
    run.mockImplementation(async (work: () => Promise<unknown>) => work())
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
      { run } as never,
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
    await addConcept('id.license-verification-method', 'manual_registry_check')
    await addConcept('id.license-status-reason', 'document_mismatch')
    await addConcept('id.license-status-reason', 'revoked_by_authority')
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

  describe('verify', () => {
    it('makes a matching licence valid, records the verification and logs one entry without values', async () => {
      const pending = await registerStr()
      log.mockClear()

      const verified = await asVerifier(() =>
        service.verify(tenantId, pending.id, {
          outcome: 'match',
          method,
          notes: ' Catatan Rahasia ',
          version: pending.version,
        }),
      )

      expect(verified).toMatchObject({
        status: 'valid',
        status_effective_date: '2026-03-10',
        is_live: true,
        verification: {
          by: { account_id: 'a2' },
          method: { code: 'manual_registry_check' },
          outcome: 'match',
          notes: 'Catatan Rahasia',
        },
      })
      expect(log).toHaveBeenCalledTimes(1)
      expect(log.mock.calls[0]?.[0]).toMatchObject({
        event: 'license_verify',
        outcome: 'success',
      })
      expect(JSON.stringify(log.mock.calls)).not.toContain('Catatan Rahasia')
    })

    it('refuses the person who submitted it, for HR and for self-service', async () => {
      const byHr = await registerStr()
      const own = await asAdmin(() =>
        service.createOwn(tenantId, employeeId, {
          licenseType: type('str'),
          profession: profession(),
          documentNumber: 'STR-OWN',
          issuingAuthority: { name: 'KKI' },
          jurisdiction: { country: 'ID' },
          issueDate: '2025-01-01',
          document,
        }),
      )

      for (const license of [byHr, own]) {
        expect(
          await rejection(() =>
            asAdmin(() =>
              service.verify(tenantId, license.id, { outcome: 'match', method }),
            ),
          ),
        ).toMatchObject({ code: 'verifier_is_submitter' })
      }
      expect((await licenses.findOne(byHr.id))?.status).toBe('pending_verification')
    })

    it('rejects a mismatch with its reason, keeps the record and lets a correction be registered', async () => {
      const pending = await registerStr()

      const rejected = await asVerifier(() =>
        service.verify(tenantId, pending.id, {
          outcome: 'mismatch',
          method,
          reason: mismatchReason,
          notes: 'Nomor tidak ada di registri',
        }),
      )

      expect(rejected).toMatchObject({
        status: 'rejected',
        is_live: false,
        rejection: {
          effective_date: '2026-03-10',
          reason: { code: 'document_mismatch' },
          notes: 'Nomor tidak ada di registri',
        },
        verification: { outcome: 'mismatch' },
      })
      expect(await registerStr()).toMatchObject({ status: 'pending_verification' })
    })

    it('needs a reason for a mismatch', async () => {
      const pending = await registerStr()

      expect(
        await rejection(() =>
          asVerifier(() =>
            service.verify(tenantId, pending.id, { outcome: 'mismatch', method }),
          ),
        ),
      ).toMatchObject({ code: 'reason_required' })
      expect((await licenses.findOne(pending.id))?.status).toBe('pending_verification')
    })

    it.each([
      ['invalid_method', { method: { system: 'id.unit-type', code: 'x' } }],
      ['unknown_code', { method: { system: 'id.license-verification-method', code: 'nonsense' } }],
      ['invalid_reason', { outcome: 'mismatch' as const, reason: { system: 'id.unit-type', code: 'x' } }],
      ['unknown_code', { outcome: 'mismatch' as const, reason: { system: 'id.license-status-reason', code: 'nonsense' } }],
      ['invalid_notes', { notes: 'x'.repeat(501) }],
    ])('rejects %s', async (code, override) => {
      const pending = await registerStr()

      expect(
        await rejection(() =>
          asVerifier(() =>
            service.verify(tenantId, pending.id, {
              outcome: 'match',
              method,
              ...override,
            }),
          ),
        ),
      ).toMatchObject({ code })
      expect((await licenses.findOne(pending.id))?.status).toBe('pending_verification')
    })

    it('refuses a licence that is not pending, and answers 404 for a missing, malformed or foreign one', async () => {
      const pending = await registerStr()
      await asVerifier(() =>
        service.verify(tenantId, pending.id, { outcome: 'match', method }),
      )

      expect(
        await rejection(() =>
          asVerifier(() =>
            service.verify(tenantId, pending.id, { outcome: 'match', method }),
          ),
        ),
      ).toMatchObject({ code: 'license_not_pending' })
      for (const [tenant, id] of [
        [tenantId, new Types.ObjectId().toHexString()],
        [tenantId, 'bad'],
        [otherTenantId, pending.id],
      ]) {
        expect(
          await rejection(() =>
            asVerifier(() =>
              service.verify(tenant as string, id as string, { outcome: 'match', method }),
            ),
          ),
        ).toMatchObject({ code: 'license_not_found' })
      }
    })

    it('refuses a match when the profession or the specialty differs, or the employee has none', async () => {
      const wrong = await registerStr({
        licenseType: type('perawat-only'),
        profession: profession('perawat'),
        documentNumber: 'STR-PERAWAT',
      })
      const withSpecialty = await registerStr({
        documentNumber: 'STR-BEDAH',
        specialty: { system: 'id.specialty', code: 'bedah' },
      })

      expect(
        await rejection(() =>
          asVerifier(() =>
            service.verify(tenantId, wrong.id, { outcome: 'match', method }),
          ),
        ),
      ).toMatchObject({ code: 'profession_mismatch' })
      expect(
        await rejection(() =>
          asVerifier(() =>
            service.verify(tenantId, withSpecialty.id, { outcome: 'match', method }),
          ),
        ),
      ).toMatchObject({ code: 'specialty_mismatch' })
      await asAdmin(() =>
        employees.update(employeeId, {
          specialties: [{ coding: { system: 'id.specialty', code: 'bedah' }, is_primary: true }],
        }),
      )
      expect(
        await asVerifier(() =>
          service.verify(tenantId, withSpecialty.id, { outcome: 'match', method }),
        ),
      ).toMatchObject({ status: 'valid' })
      await asAdmin(() => employees.update(employeeId, { profession: null }))
      const another = await registerStr({ documentNumber: 'STR-NOPROF' })
      expect(
        await rejection(() =>
          asVerifier(() =>
            service.verify(tenantId, another.id, { outcome: 'match', method }),
          ),
        ),
      ).toMatchObject({ code: 'profession_mismatch' })
    })

    it('refuses a match on an expired licence or one issued later than today, but a mismatch is still allowed', async () => {
      const expired = await registerStr({
        documentNumber: 'STR-OLD',
        issueDate: '2020-01-01',
        expiryDate: '2026-03-09',
      })
      const future = await registerStr({
        documentNumber: 'STR-FUTURE',
        issueDate: '2026-04-01',
      })

      expect(
        await rejection(() =>
          asVerifier(() =>
            service.verify(tenantId, expired.id, { outcome: 'match', method }),
          ),
        ),
      ).toMatchObject({ code: 'license_expired' })
      expect(
        await rejection(() =>
          asVerifier(() =>
            service.verify(tenantId, future.id, { outcome: 'match', method }),
          ),
        ),
      ).toMatchObject({ code: 'issue_date_in_future' })
      expect(
        await asVerifier(() =>
          service.verify(tenantId, expired.id, {
            outcome: 'mismatch',
            method,
            reason: mismatchReason,
          }),
        ),
      ).toMatchObject({ status: 'rejected' })
    })

    it('rejects a stale version and changes nothing', async () => {
      const pending = await registerStr()

      expect(
        await rejection(() =>
          asVerifier(() =>
            service.verify(tenantId, pending.id, {
              outcome: 'match',
              method,
              version: pending.version + 5,
            }),
          ),
        ),
      ).toMatchObject({ code: 'stale_version' })
      expect((await licenses.findOne(pending.id))?.status).toBe('pending_verification')
    })

    it('supersedes the replaced SIP in one transaction when its renewal is verified', async () => {
      const old = await registerSip()
      await asVerifier(() =>
        service.verify(tenantId, old.id, { outcome: 'match', method }),
      )
      const renewal = await registerSip({
        documentNumber: 'SIP-778',
        issueDate: '2026-03-01',
        expiryDate: '2031-03-01',
        replacesLicenseId: old.id,
      })

      const verified = await asVerifier(() =>
        service.verify(tenantId, renewal.id, { outcome: 'match', method }),
      )

      expect(verified.status).toBe('valid')
      expect(await licenses.findOne(old.id)).toMatchObject({
        status: 'superseded',
        status_effective_date: '2026-03-01',
        superseded: { by_license_id: renewal.id, effective_date: '2026-03-01' },
      })
    })

    it('leaves the old SIP alone when it is no longer valid, and refuses a second valid SIP for the same place', async () => {
      const first = await registerSip()
      await asVerifier(() =>
        service.verify(tenantId, first.id, { outcome: 'match', method }),
      )
      const second = await registerSip({ documentNumber: 'SIP-779' })

      expect(
        await rejection(() =>
          asVerifier(() =>
            service.verify(tenantId, second.id, { outcome: 'match', method }),
          ),
        ),
      ).toMatchObject({ code: 'valid_license_exists' })
      expect((await licenses.findOne(second.id))?.status).toBe('pending_verification')
      expect((await licenses.findOne(first.id))?.status).toBe('valid')
    })

    it('updates the old SIP before the renewal, both inside one transaction', async () => {
      const old = await registerSip()
      await asVerifier(() =>
        service.verify(tenantId, old.id, { outcome: 'match', method }),
      )
      const renewal = await registerSip({
        documentNumber: 'SIP-780',
        issueDate: '2026-03-01',
        replacesLicenseId: old.id,
      })
      run.mockClear()
      const order: string[] = []
      const update = licenses.update.bind(licenses)
      licenses.update = async (id, changes, options) => {
        order.push(`${id}:${changes.status}`)
        return update(id, changes, options)
      }

      await asVerifier(() =>
        service.verify(tenantId, renewal.id, { outcome: 'match', method }),
      )

      expect(run).toHaveBeenCalledTimes(1)
      expect(order).toEqual([`${old.id}:superseded`, `${renewal.id}:valid`])
    })
  })

  describe('revoke', () => {
    it('revokes a valid licence from the given date and logs one entry without values', async () => {
      const pending = await registerStr()
      await asVerifier(() =>
        service.verify(tenantId, pending.id, { outcome: 'match', method }),
      )
      log.mockClear()

      const revoked = await asVerifier(() =>
        service.revoke(tenantId, pending.id, {
          effectiveDate: '2026-03-11',
          reason: revokeReason,
          notes: 'Catatan Rahasia',
        }),
      )

      expect(revoked).toMatchObject({
        status: 'revoked',
        status_effective_date: '2026-03-11',
        revocation: {
          effective_date: '2026-03-11',
          reason: { code: 'revoked_by_authority' },
          notes: 'Catatan Rahasia',
        },
      })
      expect(log.mock.calls[0]?.[0]).toMatchObject({
        event: 'license_revoke',
        outcome: 'success',
      })
      expect(JSON.stringify(log.mock.calls)).not.toContain('Catatan Rahasia')
    })

    it('refuses a licence that is not valid, a bad date, a bad reason and a stale version', async () => {
      const pending = await registerStr()
      const valid = await registerStr({ documentNumber: 'STR-VALID' })
      await asVerifier(() =>
        service.verify(tenantId, valid.id, { outcome: 'match', method }),
      )
      const revoke = (id: string, override: object = {}) =>
        asVerifier(() =>
          service.revoke(tenantId, id, {
            effectiveDate: '2026-03-10',
            reason: revokeReason,
            ...override,
          }),
        )

      expect(await rejection(() => revoke(pending.id))).toMatchObject({
        code: 'license_not_valid',
      })
      for (const effectiveDate of ['2024-12-31', '2026-03-12', '2026-02-30', 'tomorrow']) {
        expect(
          await rejection(() => revoke(valid.id, { effectiveDate })),
        ).toMatchObject({ code: 'invalid_effective_date' })
      }
      expect(
        await rejection(() =>
          revoke(valid.id, { reason: { system: 'id.unit-type', code: 'x' } }),
        ),
      ).toMatchObject({ code: 'invalid_reason' })
      expect(
        await rejection(() => revoke(valid.id, { notes: 'x'.repeat(501) })),
      ).toMatchObject({ code: 'invalid_notes' })
      expect(
        await rejection(() => revoke(valid.id, { version: valid.version + 9 })),
      ).toMatchObject({ code: 'stale_version' })
      expect((await licenses.findOne(valid.id))?.status).toBe('valid')
    })

    it('answers 404 for a missing, malformed or foreign licence', async () => {
      const pending = await registerStr()

      for (const [tenant, id] of [
        [tenantId, new Types.ObjectId().toHexString()],
        [tenantId, 'bad'],
        [otherTenantId, pending.id],
      ]) {
        expect(
          await rejection(() =>
            asVerifier(() =>
              service.revoke(tenant as string, id as string, {
                effectiveDate: '2026-03-10',
                reason: revokeReason,
              }),
            ),
          ),
        ).toMatchObject({ code: 'license_not_found' })
      }
    })
  })
})
