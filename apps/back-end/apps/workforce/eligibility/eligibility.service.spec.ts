import { Types } from 'mongoose'
import { runWithRequestContext } from '@utility/logger/context'
import { type ClinicalAppointment } from '@repository/model/clinical-appointment'
import { type Employee } from '@repository/model/employee'
import { type OrganizationUnit } from '@repository/model/organization-unit'
import { type ProfessionalLicense } from '@repository/model/professional-license'
import {
  InMemoryClinicalAppointments,
  InMemoryEmployees,
  InMemoryOrganizationUnits,
  InMemoryProfessionalLicenses,
} from '../testing/in-memory'
import { EligibilityService } from './eligibility.service'

describe('EligibilityService', () => {
  const tenantId = new Types.ObjectId().toHexString()
  const facilityId = new Types.ObjectId().toHexString()
  const otherFacilityId = new Types.ObjectId().toHexString()
  const organizationId = new Types.ObjectId().toHexString()
  const day = '2027-03-10'
  let licenses: InMemoryProfessionalLicenses
  let appointments: InMemoryClinicalAppointments
  let employees: InMemoryEmployees
  let units: InMemoryOrganizationUnits
  let service: EligibilityService
  let employee: Employee
  let unit: OrganizationUnit

  /**
   * Runs `work` as a signed-in request.
   *
   * @param work - Code to run.
   * @returns What `work` returns.
   */
  function asAdmin<T>(work: () => Promise<T>): Promise<T> {
    return runWithRequestContext(
      { correlationId: 'c1', actor: { account_id: 'a1', display_name: 'Admin', kind: 'account' } },
      work,
    )
  }

  /**
   * Adds a licence of the employee.
   *
   * @param role - Registration or practice permit.
   * @param override - Fields that replace the defaults.
   */
  function addLicense(role: 'registration' | 'practice_permit', override: Partial<ProfessionalLicense> = {}) {
    const number = new Types.ObjectId().toHexString().slice(-6).toUpperCase()
    return asAdmin(() =>
      licenses.create({
        tenant_id: tenantId,
        employee_id: employee.id,
        license_type: { system: 'id.license-type', code: role === 'registration' ? 'str' : 'sip' },
        eligibility_role: role,
        profession: { system: 'id.profession', code: 'perawat' },
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
        submission: { via: 'hr', by: { account_id: 'a1', display_name: 'Admin', kind: 'account' }, at: new Date() },
        verification: null,
        rejection: null,
        revocation: null,
        superseded: null,
        replaces_license_id: null,
        ...override,
      }),
    )
  }

  /**
   * Adds an SPK of the employee covering the unit.
   *
   * @param override - Fields that replace the defaults.
   */
  function addSpk(override: Partial<ClinicalAppointment> = {}) {
    return asAdmin(() =>
      appointments.create({
        tenant_id: tenantId,
        appointment_number: `SPK/${new Types.ObjectId().toHexString().slice(-6).toUpperCase()}`,
        employee_id: employee.id,
        credentialing_facility_id: facilityId,
        credentialing_scope: 'facility',
        facility_ids: [facilityId],
        unit_ids: [unit.id],
        source_application_id: new Types.ObjectId().toHexString(),
        valid_period: { start: '2025-01-01', end: '2027-12-31' },
        is_temporary: false,
        status: 'active',
        is_current: true,
        issued: { by: { account_id: 'a9', display_name: 'Director', kind: 'account' }, director_employee_id: new Types.ObjectId().toHexString(), date: '2025-01-01' },
        signed_document: null,
        suspension: null,
        revocation: null,
        superseded_by_id: null,
        ...override,
      }),
    )
  }

  /**
   * Stores a nurse.
   *
   * @param override - Fields that replace the defaults.
   * @returns The employee.
   */
  function addEmployee(override: Partial<Employee> = {}) {
    return asAdmin(() =>
      employees.create({
        tenant_id: tenantId,
        employee_number: `E${new Types.ObjectId().toHexString()}`,
        name: { use: 'official', text: 'Siti', given: [], prefix: [], suffix: [] },
        other_names: [],
        display_name: 'Siti',
        administrative_gender: null,
        workforce_category: { system: 'id.workforce-category', code: 'tenaga_keperawatan' },
        is_clinical: true,
        profession: { system: 'id.profession', code: 'perawat' },
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
        ...override,
      }),
    )
  }

  beforeEach(async () => {
    licenses = new InMemoryProfessionalLicenses()
    appointments = new InMemoryClinicalAppointments()
    employees = new InMemoryEmployees()
    units = new InMemoryOrganizationUnits()
    service = new EligibilityService(licenses, appointments)
    employee = await addEmployee()
    unit = await asAdmin(() =>
      units.create({
        tenant_id: tenantId,
        organization_id: organizationId,
        facility_id: facilityId,
        code: 'ward-a',
        name: [{ locale: 'en', text: 'Ward' }],
        type: { system: 'id.unit-type', code: 'ward' },
        parent_id: null,
        ancestor_ids: [],
        is_clinical: true,
        external_ids: [],
        period: { start: '2026-01-01', end: null },
        status: 'active',
      }),
    )
  })

  it('is eligible with a valid registration, a valid practice permit at the facility and an active SPK that covers the unit', async () => {
    await addLicense('registration')
    await addLicense('practice_permit')
    await addSpk()

    expect(await service.general(tenantId, employee, unit, day)).toEqual({ eligible: true })
  })

  it('answers the first condition that fails, in the order employment, str, sip, spk', async () => {
    expect(await service.general(tenantId, employee, unit, day)).toEqual({ eligible: false, failed: 'str' })
    await addLicense('registration')
    expect(await service.general(tenantId, employee, unit, day)).toEqual({ eligible: false, failed: 'sip' })
    await addLicense('practice_permit')
    expect(await service.general(tenantId, employee, unit, day)).toEqual({ eligible: false, failed: 'spk' })
    await addSpk()
    expect((await service.general(tenantId, employee, unit, day)).eligible).toBe(true)

    for (const status of ['onboarding', 'suspended', 'separated'] as const) {
      const other = await addEmployee({ employment_status: status })
      expect(await service.general(tenantId, other, unit, day)).toEqual({ eligible: false, failed: 'employment' })
    }
    const probation = await addEmployee({ employment_status: 'probation' })
    expect((await service.general(tenantId, probation, unit, day)).eligible).toBe(false)
  })

  it('accepts an employee on probation who has every document', async () => {
    const probation = await addEmployee({ employment_status: 'probation' })
    for (const role of ['registration', 'practice_permit'] as const) {
      await addLicense(role, { employee_id: probation.id })
    }
    await addSpk({ employee_id: probation.id })
    expect(await service.general(tenantId, probation, unit, day)).toEqual({ eligible: true })
  })

  it('reads the licences and the SPK on the date: not yet issued, expired, or ended', async () => {
    await addLicense('registration')
    await addLicense('practice_permit', { issue_date: '2027-04-01' })
    await addSpk({ valid_period: { start: '2027-03-01', end: '2027-03-31' } })

    expect(await service.general(tenantId, employee, unit, day)).toEqual({ eligible: false, failed: 'sip' })
    expect((await service.general(tenantId, employee, unit, '2027-04-01')).eligible).toBe(false)
    const dates = await Promise.all(['2027-02-28', '2027-03-01', '2027-03-31', '2027-04-01'].map((date) => service.general(tenantId, employee, unit, date)))
    expect(dates.map((result) => (result.eligible ? 'ok' : result.failed))).toEqual(['sip', 'sip', 'sip', 'spk'])
  })

  it('does not count a licence that expired, was revoked, or is of another profession or facility', async () => {
    await addLicense('registration', { expiry_date: '2027-03-09' })
    expect(await service.general(tenantId, employee, unit, day)).toEqual({ eligible: false, failed: 'str' })
    await addLicense('registration', { status: 'revoked' })
    await addLicense('registration', { profession: { system: 'id.profession', code: 'dokter' } })
    expect(await service.general(tenantId, employee, unit, day)).toEqual({ eligible: false, failed: 'str' })
    await addLicense('registration')
    await addLicense('practice_permit', { practice_location: { facility_id: otherFacilityId, name: 'RS lain', address: null } })
    expect(await service.general(tenantId, employee, unit, day)).toEqual({ eligible: false, failed: 'sip' })
  })

  it('does not count an SPK that is suspended, belongs to another employee, or covers other units', async () => {
    await addLicense('registration')
    await addLicense('practice_permit')
    await addSpk({ status: 'suspended', is_current: false })
    await addSpk({ employee_id: new Types.ObjectId().toHexString() })
    await addSpk({ unit_ids: [new Types.ObjectId().toHexString()], is_temporary: true })

    expect(await service.general(tenantId, employee, unit, day)).toEqual({ eligible: false, failed: 'spk' })
    await addSpk()
    expect((await service.general(tenantId, employee, unit, day)).eligible).toBe(true)
  })

  it('fails the registration of an employee that has no profession, and ignores the licences of another tenant', async () => {
    const without = await addEmployee({ profession: null })
    await addLicense('registration', { employee_id: without.id })
    expect(await service.general(tenantId, without, unit, day)).toEqual({ eligible: false, failed: 'str' })

    const otherTenant = new Types.ObjectId().toHexString()
    await addLicense('registration', { tenant_id: otherTenant })
    expect(await service.general(tenantId, employee, unit, day)).toEqual({ eligible: false, failed: 'str' })
  })
})
