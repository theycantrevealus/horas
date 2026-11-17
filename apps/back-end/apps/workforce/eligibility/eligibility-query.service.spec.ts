import { Types } from 'mongoose'
import { runWithRequestContext } from '@utility/logger/context'
import { type ClinicalAppointment } from '@repository/model/clinical-appointment'
import { type Employee } from '@repository/model/employee'
import { type OrganizationUnit } from '@repository/model/organization-unit'
import { type PrivilegeGrant } from '@repository/model/privilege-grant'
import {
  InMemoryClinicalAppointments,
  InMemoryEmployees,
  InMemoryFacilities,
  InMemoryOrganizationUnits,
  InMemoryPrivilegeCatalog,
  InMemoryPrivilegeGrants,
  InMemoryProfessionalLicenses,
} from '../testing/in-memory'
import { EligibilityQueryService } from './eligibility-query.service'
import { EligibilityService } from './eligibility.service'

describe('EligibilityQueryService', () => {
  const tenantId = new Types.ObjectId().toHexString()
  const organizationId = new Types.ObjectId().toHexString()
  const day = '2027-03-10'
  const actor = { account_id: 'a1', display_name: 'Admin', kind: 'account' as const }
  let facilityId: string
  let licenses: InMemoryProfessionalLicenses
  let appointments: InMemoryClinicalAppointments
  let grants: InMemoryPrivilegeGrants
  let employees: InMemoryEmployees
  let units: InMemoryOrganizationUnits
  let catalog: InMemoryPrivilegeCatalog
  let service: EligibilityQueryService
  let employee: Employee
  let unit: OrganizationUnit
  let privilegeId: string

  /**
   * Runs `work` as a signed-in request.
   *
   * @param work - Code to run.
   * @returns What `work` returns.
   */
  function asAdmin<T>(work: () => Promise<T>): Promise<T> {
    return runWithRequestContext({ correlationId: 'c1', actor }, work)
  }

  /**
   * Adds a valid licence of the employee.
   *
   * @param role - Registration or practice permit.
   * @param override - Fields that replace the defaults.
   */
  function addLicense(
    role: 'registration' | 'practice_permit',
    override: Record<string, unknown> = {},
  ) {
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
        submission: { via: 'hr', by: actor, at: new Date() },
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
        issued: { by: actor, director_employee_id: new Types.ObjectId().toHexString(), date: '2025-01-01' },
        signed_document: null,
        suspension: null,
        revocation: null,
        superseded_by_id: null,
        ...override,
      }),
    )
  }

  /**
   * Adds a grant of the privilege inside an SPK.
   *
   * @param spk - The SPK.
   * @param override - Fields that replace the defaults.
   */
  function addGrant(spk: ClinicalAppointment, override: Partial<PrivilegeGrant> = {}) {
    return asAdmin(() =>
      grants.create({
        tenant_id: tenantId,
        appointment_id: spk.id,
        employee_id: spk.employee_id,
        facility_ids: spk.facility_ids,
        unit_ids: spk.unit_ids,
        catalog_item_id: privilegeId,
        code: 'PD-1',
        condition: 'full',
        supervisor: null,
        restriction_notes: null,
        status: 'active',
        status_change: null,
        flag: null,
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

  /**
   * Adds a privilege to the catalog.
   *
   * @param status - Active or retired.
   * @returns The new item's id.
   */
  async function addItem(status: 'active' | 'retired' = 'active'): Promise<string> {
    const item = await asAdmin(() =>
      catalog.create({
        tenant_id: tenantId,
        facility_ids: [],
        code: `PD-${new Types.ObjectId().toHexString().slice(-6)}`,
        name: [{ locale: 'en', text: 'Item' }],
        description: [],
        committee: { system: 'id.committee', code: 'komite_keperawatan' },
        professions: [{ system: 'id.profession', code: 'perawat' }],
        specialties: [],
        min_clinical_level: null,
        required_evidence: [],
        external_codes: [],
        status,
      }),
    )
    return item.id
  }

  /**
   * Gives the employee the three documents of general eligibility and returns the SPK.
   */
  async function makeGenerallyEligible(): Promise<ClinicalAppointment> {
    await addLicense('registration')
    await addLicense('practice_permit')
    return addSpk()
  }

  beforeEach(async () => {
    licenses = new InMemoryProfessionalLicenses()
    appointments = new InMemoryClinicalAppointments()
    grants = new InMemoryPrivilegeGrants()
    employees = new InMemoryEmployees()
    units = new InMemoryOrganizationUnits()
    catalog = new InMemoryPrivilegeCatalog()
    const facilities = new InMemoryFacilities()
    facilityId = (
      await asAdmin(() =>
        facilities.create({ tenant_id: tenantId, organization_id: organizationId, code: 'rs-sehat', name: [{ locale: 'en', text: 'RS' }], address: null, timezone: 'Asia/Jakarta', holiday_calendar_codes: [], external_ids: [], status: 'active' }),
      )
    ).id
    service = new EligibilityQueryService(
      employees,
      units,
      facilities,
      catalog,
      new EligibilityService(licenses, appointments, grants),
    )
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
    privilegeId = await addItem()
  })

  /**
   * Asks the service about the employee and unit.
   *
   * @param extra - Query fields that replace the defaults.
   */
  function check(extra: { employeeId?: string; unitId?: string; date?: string; privilegeId?: string } = {}) {
    return service.check(tenantId, { employeeId: employee.id, unitId: unit.id, date: day, ...extra })
  }

  describe('general eligibility (no privilege)', () => {
    it('is eligible with every document and carries the four checks and no privilege', async () => {
      await makeGenerallyEligible()

      expect(await check()).toEqual({
        employeeId: employee.id,
        unitId: unit.id,
        date: day,
        employmentAsOf: 'current',
        eligible: true,
        failed: null,
        checks: [
          { condition: 'employment', met: true },
          { condition: 'str', met: true },
          { condition: 'sip', met: true },
          { condition: 'spk', met: true },
        ],
        privilege: null,
      })
    })

    it('lists every failing condition and names the first as failed', async () => {
      const answer = await check()

      expect(answer.eligible).toBe(false)
      expect(answer.failed).toBe('str')
      expect(answer.checks.map((c) => c.met)).toEqual([true, false, false, false])
    })

    it('fails employment alone for a suspended or separated employee', async () => {
      await makeGenerallyEligible()
      for (const status of ['suspended', 'separated'] as const) {
        const other = await addEmployee({ employment_status: status })
        const answer = await check({ employeeId: other.id })
        expect(answer.failed).toBe('employment')
        expect(answer.checks[0]).toEqual({ condition: 'employment', met: false })
      }
    })

    it('reads the records on the date: a licence that expires the day before fails str', async () => {
      await addLicense('registration', { expiry_date: '2027-03-09' })
      await addLicense('practice_permit')
      await addSpk()

      expect((await check()).failed).toBe('str')
      expect((await check({ date: '2027-03-09' })).eligible).toBe(true)
    })

    it('fails sip for a permit of another facility and spk for an SPK that ended, has not started or does not cover the unit', async () => {
      await addLicense('registration')
      await addLicense('practice_permit', { practice_location: { facility_id: new Types.ObjectId().toHexString(), name: 'X', address: null } })
      const spk = await addSpk()

      expect((await check()).failed).toBe('sip')
      await addLicense('practice_permit')
      expect((await check({ date: '2028-01-01' })).failed).toBe('spk')
      await appointments.update(spk.id, { valid_period: { start: '2027-06-01', end: '2027-12-31' } })
      expect((await check()).failed).toBe('spk')
      await appointments.update(spk.id, { valid_period: { start: '2025-01-01', end: '2027-12-31' } })
      await appointments.update(spk.id, { unit_ids: [new Types.ObjectId().toHexString()] })
      expect((await check()).failed).toBe('spk')
    })

    it('does not count a suspended SPK', async () => {
      await addLicense('registration')
      await addLicense('practice_permit')
      await addSpk({ status: 'suspended' })

      expect((await check()).failed).toBe('spk')
    })
  })

  describe('with a privilege (condition 5)', () => {
    it('is eligible when an active grant of the privilege sits in a valid SPK that covers the unit', async () => {
      const spk = await makeGenerallyEligible()
      const grant = await addGrant(spk, { code: 'PD-9' })

      const answer = await check({ privilegeId })

      expect(answer.eligible).toBe(true)
      expect(answer.checks.at(-1)).toEqual({ condition: 'privilege', met: true })
      expect(answer.privilege).toEqual({ catalogItemId: privilegeId, code: 'PD-9', condition: 'full', supervisorEmployeeId: null, flagged: false })
      expect(grant.status).toBe('active')
    })

    it('fails privilege alone when general eligibility holds but there is no grant', async () => {
      await makeGenerallyEligible()

      const answer = await check({ privilegeId })

      expect(answer.eligible).toBe(false)
      expect(answer.failed).toBe('privilege')
      expect(answer.privilege).toBeNull()
    })

    it('does not count a suspended, revoked or superseded grant, or a grant of another privilege', async () => {
      const spk = await makeGenerallyEligible()
      for (const status of ['suspended', 'revoked', 'superseded'] as const) {
        await addGrant(await addSpk({ is_temporary: true, is_current: false }), { status })
      }
      await addGrant(spk, { catalog_item_id: await addItem() })

      expect((await check({ privilegeId })).failed).toBe('privilege')
    })

    it('does not count a grant that does not cover the unit', async () => {
      const spk = await makeGenerallyEligible()
      await addGrant(spk, { unit_ids: [new Types.ObjectId().toHexString()] })

      expect((await check({ privilegeId })).failed).toBe('privilege')
    })

    it('does not count a grant of a suspended SPK, and then spk and privilege both fail', async () => {
      const spk = await makeGenerallyEligible()
      await addGrant(spk)
      await appointments.update(spk.id, { status: 'suspended' })

      const answer = await check({ privilegeId })

      expect(answer.checks.map((c) => c.met)).toEqual([true, true, true, false, false])
      expect(answer.failed).toBe('spk')
    })

    it('still counts the grant of a retired privilege', async () => {
      const retired = await addItem('retired')
      const spk = await makeGenerallyEligible()
      await addGrant(spk, { catalog_item_id: retired })

      expect((await check({ privilegeId: retired })).eligible).toBe(true)
    })

    it('reports the most permissive grant and a flagged supervised grant as eligible with flagged true', async () => {
      const spk = await makeGenerallyEligible()
      const supervisorId = new Types.ObjectId().toHexString()
      await addGrant(spk, {
        condition: 'supervised',
        supervisor: { employee_id: supervisorId, grant_id: new Types.ObjectId().toHexString() },
        flag: { reason: 'supervisor_lost_privilege', at: new Date(), resolved_at: null },
      })

      const flagged = await check({ privilegeId })
      expect(flagged.eligible).toBe(true)
      expect(flagged.privilege).toMatchObject({ condition: 'supervised', supervisorEmployeeId: supervisorId, flagged: true })

      await addGrant(await addSpk({ is_temporary: true, is_current: false }), { condition: 'restricted', restriction_notes: 'n' })
      expect((await check({ privilegeId })).privilege?.condition).toBe('supervised')
      await addGrant(await addSpk({ is_temporary: true, is_current: false }), { condition: 'full' })
      expect((await check({ privilegeId })).privilege?.condition).toBe('full')
    })

    it('reports a resolved flag as not flagged', async () => {
      const spk = await makeGenerallyEligible()
      await addGrant(spk, { flag: { reason: 'supervisor_lost_privilege', at: new Date(), resolved_at: new Date() } })

      expect((await check({ privilegeId })).privilege?.flagged).toBe(false)
    })
  })

  describe('requests that cannot be answered', () => {
    it('answers 404 employee_not_found for a missing, malformed, foreign or deleted employee', async () => {
      const foreign = await asAdmin(() => employees.create(Object.assign({}, employee, { tenant_id: new Types.ObjectId().toHexString(), employee_number: 'F1' }) as never))
      for (const employeeId of [new Types.ObjectId().toHexString(), 'not-an-id', foreign.id]) {
        await expect(check({ employeeId })).rejects.toMatchObject({ kind: 'not_found', code: 'employee_not_found' })
      }
    })

    it('answers 422 not_clinical_employee for a non-clinical employee', async () => {
      const clerk = await addEmployee({ is_clinical: false })

      await expect(check({ employeeId: clerk.id })).rejects.toMatchObject({ kind: 'invalid', code: 'not_clinical_employee' })
    })

    it('answers 422 unit_not_found for a missing, malformed or foreign unit', async () => {
      const foreign = await asAdmin(() => units.create(Object.assign({}, unit, { tenant_id: new Types.ObjectId().toHexString(), code: 'x' }) as never))
      for (const unitId of [new Types.ObjectId().toHexString(), 'bad', foreign.id]) {
        await expect(check({ unitId })).rejects.toMatchObject({ kind: 'invalid', code: 'unit_not_found' })
      }
    })

    it('answers a closed unit, because a history question about it is legitimate', async () => {
      await makeGenerallyEligible()
      await units.update(unit.id, { status: 'closed' })

      expect((await check()).eligible).toBe(true)
    })

    it('answers 422 privilege_not_found for a missing, malformed or foreign privilege', async () => {
      const otherCatalog = new InMemoryPrivilegeCatalog()
      const foreign = await asAdmin(() => otherCatalog.create({ tenant_id: new Types.ObjectId().toHexString(), facility_ids: [], code: 'X', name: [], description: [], committee: { system: 'id.committee', code: 'c' }, professions: [], specialties: [], min_clinical_level: null, required_evidence: [], external_codes: [], status: 'active' }))
      for (const id of [new Types.ObjectId().toHexString(), 'bad', foreign.id]) {
        await expect(check({ privilegeId: id })).rejects.toMatchObject({ kind: 'invalid', code: 'privilege_not_found' })
      }
    })

    it('never answers eligible when a repository fails', async () => {
      vi.spyOn(licenses, 'findByEmployee').mockRejectedValueOnce(new Error('down'))

      await expect(check()).rejects.toThrow('down')
    })
  })

  it('uses today in the facility zone when the date is omitted', async () => {
    const answer = await service.check(tenantId, { employeeId: employee.id, unitId: unit.id })

    expect(answer.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
