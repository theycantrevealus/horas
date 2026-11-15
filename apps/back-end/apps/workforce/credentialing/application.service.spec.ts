import { Types } from 'mongoose'
import { runWithRequestContext } from '@utility/logger/context'
import { type AppLogger } from '@utility/logger/service'
import { type CredentialApplication } from '@repository/model/credential-application'
import { CodeConceptService } from '../concept/code-concept.service'
import { type ParameterService } from '../parameter/parameter.service'
import {
  InMemoryCodeConcepts,
  InMemoryCredentialApplications,
  InMemoryEmployees,
  InMemoryFacilities,
  InMemoryOrganizationUnits,
  InMemoryPrivilegeCatalog,
  InMemoryProfessionalLicenses,
} from '../testing/in-memory'
import {
  ApplicationService,
  type CreateApplicationInput,
} from './application.service'

describe('ApplicationService', () => {
  const tenantId = new Types.ObjectId().toHexString()
  const otherTenantId = new Types.ObjectId().toHexString()
  const organizationId = new Types.ObjectId().toHexString()
  const log = vi.fn()
  const warn = vi.fn()
  const error = vi.fn()
  const debug = vi.fn()
  const parameterValues: Record<string, unknown> = {
    CREDENTIALING_SCOPE: 'facility',
    TEMPORARY_PRIVILEGE_MAX_DAYS: 60,
  }
  const resolve = vi.fn(async (_tenant: string, input: { key: string }) => ({
    key: input.key,
    value: parameterValues[input.key],
  }))
  let applications: InMemoryCredentialApplications
  let employees: InMemoryEmployees
  let facilities: InMemoryFacilities
  let units: InMemoryOrganizationUnits
  let catalog: InMemoryPrivilegeCatalog
  let licenses: InMemoryProfessionalLicenses
  let concepts: InMemoryCodeConcepts
  let service: ApplicationService
  let facilityId: string
  let otherFacilityId: string
  let unitId: string
  let otherUnitId: string
  let employeeId: string
  let itemId: string

  const evidence = {
    file_id: 'file-1',
    content_type: 'application/pdf',
    sha256: 'a'.repeat(64),
  }
  const certificate = { system: 'id.evidence-type', code: 'certificate' }

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
   * Adds a code concept.
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
   * @param override - Fields that replace the defaults.
   * @returns The employee.
   */
  function addEmployee(
    override: {
      status?: 'active' | 'separated'
      tenant?: string
      clinical?: boolean
      category?: string
      level?: string | null
      specialty?: string | null
    } = {},
  ) {
    return asAdmin(() =>
      employees.create({
        tenant_id: override.tenant ?? tenantId,
        employee_number: `E${new Types.ObjectId().toHexString()}`,
        name: { use: 'official', text: 'Siti', given: [], prefix: [], suffix: [] },
        other_names: [],
        display_name: 'Siti',
        administrative_gender: null,
        workforce_category: {
          system: 'id.workforce-category',
          code: override.category ?? 'tenaga_medis',
        },
        is_clinical: override.clinical ?? true,
        profession:
          override.clinical === false
            ? null
            : { system: 'id.profession', code: 'dokter' },
        specialties: override.specialty
          ? [{ coding: { system: 'id.specialty', code: override.specialty }, is_primary: true }]
          : [],
        clinical_level: override.level
          ? { system: 'id.clinical-level', code: override.level }
          : null,
        employment_status: override.status ?? 'active',
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
        name: [{ locale: 'en', text: 'RS' }],
        address: null,
        timezone: 'Asia/Jakarta',
        holiday_calendar_codes: [],
        external_ids: [],
        status: override.status ?? 'active',
      }),
    )
  }

  /**
   * Adds a unit.
   *
   * @param facility - Facility of the unit.
   * @param status - Unit status.
   * @param tenant - Tenant of the unit.
   * @returns The unit.
   */
  function addUnit(
    facility: string,
    status: 'active' | 'closed' = 'active',
    tenant = tenantId,
  ) {
    return asAdmin(() =>
      units.create({
        tenant_id: tenant,
        organization_id: organizationId,
        facility_id: facility,
        code: `u-${new Types.ObjectId().toHexString()}`,
        name: [{ locale: 'en', text: 'Ward' }],
        type: { system: 'id.unit-type', code: 'ward' },
        parent_id: null,
        ancestor_ids: [],
        is_clinical: true,
        external_ids: [],
        period: { start: '2026-01-01', end: null },
        status,
      }),
    )
  }

  /**
   * Adds a catalog item.
   *
   * @param override - Fields that replace the defaults.
   * @returns The item.
   */
  function addItem(
    override: {
      status?: 'active' | 'retired'
      professions?: string[]
      specialties?: string[]
      level?: string | null
      facilityIds?: string[]
      mandatory?: boolean
      tenant?: string
    } = {},
  ) {
    return asAdmin(() =>
      catalog.create({
        tenant_id: override.tenant ?? tenantId,
        facility_ids: override.facilityIds ?? [],
        code: `PD-${new Types.ObjectId().toHexString().slice(-6)}`,
        name: [{ locale: 'en', text: 'Item' }],
        description: [],
        committee: { system: 'id.committee', code: 'komite_medik' },
        professions: (override.professions ?? ['dokter']).map((code) => ({
          system: 'id.profession',
          code,
        })),
        specialties: (override.specialties ?? []).map((code) => ({
          system: 'id.specialty',
          code,
        })),
        min_clinical_level: override.level
          ? { system: 'id.clinical-level', code: override.level }
          : null,
        required_evidence:
          override.mandatory === undefined
            ? []
            : [{ type: certificate, description: [{ locale: 'en', text: 'x' }], mandatory: override.mandatory }],
        external_codes: [],
        status: override.status ?? 'active',
      }),
    )
  }

  /**
   * Starts an application through the service; the defaults make a minimal initial draft.
   *
   * @param override - Fields that replace the defaults.
   * @returns The application.
   */
  function create(override: Partial<CreateApplicationInput> = {}) {
    return asAdmin(() =>
      service.create(tenantId, {
        employeeId,
        credentialingFacilityId: facilityId,
        type: 'initial',
        requestedPrivileges: [{ catalogItemId: itemId, requestedCondition: 'full' }],
        requestedUnitIds: [unitId],
        ...override,
      }),
    )
  }

  /**
   * Stores an application in a given status without going through the service.
   *
   * @param status - Status of the application.
   * @returns The application.
   */
  function stored(status: CredentialApplication['status']) {
    return asAdmin(() =>
      applications.create({
        tenant_id: tenantId,
        employee_id: employeeId,
        credentialing_facility_id: facilityId,
        credentialing_scope: 'facility',
        type: 'initial',
        committee: { system: 'id.committee', code: 'komite_medik' },
        status,
        status_since: new Date('2026-03-01T00:00:00Z'),
        requested_privileges: [
          {
            catalog_item_id: itemId,
            code: 'PD-1',
            requested_condition: 'full',
            proposed_supervisor_employee_id: null,
            notes: null,
          },
        ],
        requested_unit_ids: [unitId],
        requested_facility_ids: [facilityId],
        documents: [],
        assessors: [],
        recommendation: null,
        decision: null,
        return_reason: null,
        withdrawal_reason: null,
        temporary: null,
        previous_appointment_id: null,
      }),
    )
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
    resolve.mockImplementation(async (_tenant: string, input: { key: string }) => ({
      key: input.key,
      value: parameterValues[input.key],
    }))
    parameterValues.CREDENTIALING_SCOPE = 'facility'
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-03-10T12:00:00Z'))
    applications = new InMemoryCredentialApplications()
    employees = new InMemoryEmployees()
    facilities = new InMemoryFacilities()
    units = new InMemoryOrganizationUnits()
    catalog = new InMemoryPrivilegeCatalog()
    licenses = new InMemoryProfessionalLicenses()
    concepts = new InMemoryCodeConcepts()
    const logger = { log, warn, error, debug } as unknown as AppLogger
    service = new ApplicationService(
      applications,
      employees,
      facilities,
      units,
      catalog,
      licenses,
      new CodeConceptService(concepts, logger),
      { resolve } as unknown as ParameterService,
      logger,
    )
    await addConcept('id.workforce-category', 'tenaga_medis', { is_clinical: true, credentialing_committee: 'komite_medik' })
    await addConcept('id.workforce-category', 'non_klinis', { is_clinical: false, credentialing_committee: null })
    await addConcept('id.committee', 'komite_medik')
    await addConcept('id.evidence-type', 'certificate')
    await addConcept('id.evidence-type', 'logbook')
    await addConcept('id.temporary-urgency', 'disaster')
    await addConcept('id.clinical-level', 'pk2', { rank: 2 })
    await addConcept('id.clinical-level', 'pk4', { rank: 4 })
    await addConcept('id.clinical-level', 'pk9')
    facilityId = (await addFacility()).id
    otherFacilityId = (await addFacility()).id
    unitId = (await addUnit(facilityId)).id
    otherUnitId = (await addUnit(otherFacilityId)).id
    employeeId = (await addEmployee()).id
    itemId = (await addItem()).id
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('create', () => {
    it('starts a draft with the committee and the scope copied, the facilities derived and one log entry without values', async () => {
      const created = await create({ reason: 'Alasan Rahasia' })

      expect(created).toMatchObject({
        tenant_id: tenantId,
        employee_id: employeeId,
        credentialing_facility_id: facilityId,
        credentialing_scope: 'facility',
        type: 'initial',
        committee: { system: 'id.committee', code: 'komite_medik' },
        status: 'draft',
        requested_privileges: [{ catalog_item_id: itemId, requested_condition: 'full', proposed_supervisor_employee_id: null }],
        requested_unit_ids: [unitId],
        requested_facility_ids: [facilityId],
        documents: [],
        assessors: [],
        recommendation: null,
        decision: null,
        temporary: null,
        previous_appointment_id: null,
      })
      expect(created.status_since).toEqual(new Date('2026-03-10T12:00:00Z'))
      expect(log).toHaveBeenCalledTimes(1)
      expect(log.mock.calls[0]?.[0]).toMatchObject({ event: 'application_create', outcome: 'success' })
      expect(JSON.stringify(log.mock.calls)).not.toContain('Alasan Rahasia')
    })

    it('refuses types that need the SPK', async () => {
      for (const type of ['recredentialing', 'privilege_extension'] as const) {
        expect(await rejection(() => create({ type }))).toMatchObject({ code: 'type_not_supported' })
      }
    })

    it('rejects a missing, foreign, separated or non-clinical applicant', async () => {
      const foreign = await addEmployee({ tenant: otherTenantId })
      const separated = await addEmployee({ status: 'separated' })
      const office = await addEmployee({ clinical: false, category: 'non_klinis' })

      for (const id of [new Types.ObjectId().toHexString(), 'bad', foreign.id]) {
        expect(await rejection(() => create({ employeeId: id }))).toMatchObject({ code: 'employee_not_found' })
      }
      expect(await rejection(() => create({ employeeId: separated.id }))).toMatchObject({ code: 'employee_separated' })
      expect(await rejection(() => create({ employeeId: office.id }))).toMatchObject({ code: 'employee_not_clinical' })
    })

    it('rejects a category with no credentialing committee', async () => {
      await addConcept('id.workforce-category', 'tanpa_komite', { is_clinical: true, credentialing_committee: null })
      const orphan = await addEmployee({ category: 'tanpa_komite' })

      expect(await rejection(() => create({ employeeId: orphan.id }))).toMatchObject({ code: 'committee_not_configured' })
    })

    it('rejects a missing, foreign or inactive credentialing facility', async () => {
      const foreign = await addFacility({ tenant: otherTenantId })
      const inactive = await addFacility({ status: 'inactive' })

      for (const id of [new Types.ObjectId().toHexString(), 'bad', foreign.id]) {
        expect(await rejection(() => create({ credentialingFacilityId: id }))).toMatchObject({ code: 'facility_not_found' })
      }
      expect(await rejection(() => create({ credentialingFacilityId: inactive.id }))).toMatchObject({ code: 'facility_inactive' })
    })

    it('keeps every unit inside the facility under scope facility, and allows other facilities under scope group', async () => {
      expect(await rejection(() => create({ requestedUnitIds: [otherUnitId] }))).toMatchObject({ code: 'unit_outside_facility' })

      parameterValues.CREDENTIALING_SCOPE = 'group'
      const grouped = await create({ requestedUnitIds: [unitId, otherUnitId] })

      expect(grouped.credentialing_scope).toBe('group')
      expect([...grouped.requested_facility_ids].sort()).toEqual([facilityId, otherFacilityId].sort())
    })

    it.each([
      ['invalid_units', { requestedUnitIds: [] }],
      ['duplicate_unit', { requestedUnitIds: ['dup', 'dup'] }],
      ['unit_not_found', { requestedUnitIds: ['bad'] }],
      ['invalid_privileges', { requestedPrivileges: [] }],
      ['invalid_condition', { requestedPrivileges: [{ catalogItemId: 'X', requestedCondition: 'all' as never }] }],
    ])('rejects %s', async (code, override) => {
      const prepared = JSON.parse(JSON.stringify(override).replace('"X"', `"${itemId}"`).replace('"dup"', `"${unitId}"`).replace('"dup"', `"${unitId}"`))
      expect(await rejection(() => create(prepared))).toMatchObject({ code })
      expect(await applications.findByFilter(tenantId)).toEqual([])
    })

    it('rejects a closed or foreign unit, a duplicate privilege and a privilege that is missing, retired or not open', async () => {
      const closed = await addUnit(facilityId, 'closed')
      const foreignUnit = await addUnit(facilityId, 'active', otherTenantId)
      const retired = await addItem({ status: 'retired' })
      const nurses = await addItem({ professions: ['perawat'] })
      const elsewhere = await addItem({ facilityIds: [otherFacilityId] })
      const foreignItem = await addItem({ tenant: otherTenantId })
      const ask = (catalogItemId: string) => [{ catalogItemId, requestedCondition: 'full' as const }]

      expect(await rejection(() => create({ requestedUnitIds: [closed.id] }))).toMatchObject({ code: 'unit_closed' })
      expect(await rejection(() => create({ requestedUnitIds: [foreignUnit.id] }))).toMatchObject({ code: 'unit_not_found' })
      expect(await rejection(() => create({ requestedPrivileges: [...ask(itemId), ...ask(itemId)] }))).toMatchObject({ code: 'duplicate_privilege' })
      for (const id of [new Types.ObjectId().toHexString(), 'bad', foreignItem.id]) {
        expect(await rejection(() => create({ requestedPrivileges: ask(id) }))).toMatchObject({ code: 'privilege_not_found' })
      }
      expect(await rejection(() => create({ requestedPrivileges: ask(retired.id) }))).toMatchObject({ code: 'privilege_retired' })
      expect(await rejection(() => create({ requestedPrivileges: ask(nurses.id) }))).toMatchObject({ code: 'privilege_not_open' })
      expect(await rejection(() => create({ requestedPrivileges: ask(elsewhere.id) }))).toMatchObject({ code: 'privilege_not_open' })
    })

    it('needs the primary specialty an item lists, and the career level by rank', async () => {
      const surgery = await addItem({ specialties: ['bedah'] })
      const level3 = await addItem({ level: 'pk4' })
      const ask = (catalogItemId: string) => [{ catalogItemId, requestedCondition: 'full' as const }]
      const surgeon = await addEmployee({ specialty: 'bedah' })
      const senior = await addEmployee({ level: 'pk4' })
      const junior = await addEmployee({ level: 'pk2' })
      const unranked = await addEmployee({ level: 'pk9' })

      expect(await rejection(() => create({ requestedPrivileges: ask(surgery.id) }))).toMatchObject({ code: 'privilege_not_open' })
      expect(await create({ employeeId: surgeon.id, requestedPrivileges: ask(surgery.id) })).toMatchObject({ status: 'draft' })
      expect(await create({ employeeId: senior.id, requestedPrivileges: ask(level3.id) })).toMatchObject({ status: 'draft' })
      for (const id of [junior.id, employeeId, unranked.id]) {
        expect(await rejection(() => create({ employeeId: id, requestedPrivileges: ask(level3.id) }))).toMatchObject({ code: 'level_not_met' })
      }
    })

    it('needs a supervisor for a supervised privilege, and only then, who is another active employee', async () => {
      const supervisor = await addEmployee()
      const separated = await addEmployee({ status: 'separated' })
      const foreign = await addEmployee({ tenant: otherTenantId })
      const ask = (override: object) => [{ catalogItemId: itemId, requestedCondition: 'supervised' as const, ...override }]

      expect(await rejection(() => create({ requestedPrivileges: ask({}) }))).toMatchObject({ code: 'supervisor_required' })
      expect(
        await rejection(() =>
          create({ requestedPrivileges: [{ catalogItemId: itemId, requestedCondition: 'full', proposedSupervisorEmployeeId: supervisor.id }] }),
        ),
      ).toMatchObject({ code: 'supervisor_not_allowed' })
      for (const id of [employeeId, separated.id, foreign.id, 'bad']) {
        expect(await rejection(() => create({ requestedPrivileges: ask({ proposedSupervisorEmployeeId: id }) }))).toMatchObject({ code: 'supervisor_invalid' })
      }
      expect(await create({ requestedPrivileges: ask({ proposedSupervisorEmployeeId: supervisor.id, notes: ' catatan ' }) })).toMatchObject({
        requested_privileges: [{ requested_condition: 'supervised', proposed_supervisor_employee_id: supervisor.id, notes: 'catatan' }],
      })
      expect(
        await rejection(() => create({ requestedPrivileges: ask({ proposedSupervisorEmployeeId: supervisor.id, notes: 'x'.repeat(501) }) })),
      ).toMatchObject({ code: 'invalid_notes' })
    })

    it('checks the documents: type, file reference and a licence of the applicant', async () => {
      const ownLicense = await asAdmin(() =>
        licenses.create({
          tenant_id: tenantId,
          employee_id: employeeId,
          license_type: { system: 'id.license-type', code: 'str' },
          eligibility_role: 'registration',
          profession: { system: 'id.profession', code: 'dokter' },
          specialty: null,
          document_number: 'STR-1',
          document_number_normalized: 'STR1',
          issuing_authority: { code: null, name: 'KKI' },
          jurisdiction: { country: 'ID', subdivision: null },
          practice_location: null,
          issue_date: '2025-01-01',
          expiry_date: null,
          document: evidence,
          status: 'valid',
          status_effective_date: '2025-01-02',
          is_live: true,
          submission: { via: 'hr', by: { account_id: 'a1', display_name: 'Admin', kind: 'account' }, at: new Date() },
          verification: null,
          rejection: null,
          revocation: null,
          superseded: null,
          replaces_license_id: null,
        }),
      )
      const doc = (override: object = {}) => ({ type: certificate, file: evidence, ...override })

      expect((await create({ documents: [doc({ licenseId: ownLicense.id })] })).documents).toEqual([
        { type: certificate, file: evidence, license_id: ownLicense.id },
      ])
      expect(await rejection(() => create({ documents: [doc({ type: { system: 'id.unit-type', code: 'x' } })] }))).toMatchObject({ code: 'invalid_document_type' })
      expect(await rejection(() => create({ documents: [doc({ type: { system: 'id.evidence-type', code: 'nonsense' } })] }))).toMatchObject({ code: 'unknown_code' })
      expect(await rejection(() => create({ documents: [doc({ file: { ...evidence, content_type: 'text/html' } })] }))).toMatchObject({ code: 'invalid_document' })
      for (const id of [new Types.ObjectId().toHexString(), 'bad']) {
        expect(await rejection(() => create({ documents: [doc({ licenseId: id })] }))).toMatchObject({ code: 'license_not_found' })
      }
      expect(await rejection(() => create({ documents: Array.from({ length: 31 }, () => doc()) }))).toMatchObject({ code: 'invalid_documents' })
    })

    it('needs the temporary request for type temporary only, within the longest period, and valid licences', async () => {
      const temporary = { requestedDays: 30, urgency: { system: 'id.temporary-urgency', code: 'disaster' } }
      expect(await rejection(() => create({ type: 'temporary' }))).toMatchObject({ code: 'temporary_required' })
      expect(await rejection(() => create({ temporary }))).toMatchObject({ code: 'temporary_not_allowed' })
      for (const requestedDays of [0, 61, 1.5]) {
        expect(await rejection(() => create({ type: 'temporary', temporary: { ...temporary, requestedDays } }))).toMatchObject({ code: 'invalid_days' })
      }
      expect(await rejection(() => create({ type: 'temporary', temporary: { ...temporary, urgency: { system: 'id.unit-type', code: 'x' } } }))).toMatchObject({ code: 'invalid_urgency' })
      expect(await rejection(() => create({ type: 'temporary', temporary }))).toMatchObject({ code: 'license_not_valid' })

      const base = {
        tenant_id: tenantId,
        employee_id: employeeId,
        profession: { system: 'id.profession', code: 'dokter' },
        specialty: null,
        issuing_authority: { code: null, name: 'KKI' },
        jurisdiction: { country: 'ID', subdivision: null },
        issue_date: '2025-01-01',
        expiry_date: null,
        document: evidence,
        status: 'valid' as const,
        status_effective_date: '2025-01-02',
        is_live: true,
        submission: { via: 'hr' as const, by: { account_id: 'a1', display_name: 'Admin', kind: 'account' as const }, at: new Date() },
        verification: null,
        rejection: null,
        revocation: null,
        superseded: null,
        replaces_license_id: null,
      }
      await asAdmin(async () => {
        await licenses.create({ ...base, license_type: { system: 'id.license-type', code: 'str' }, eligibility_role: 'registration', document_number: 'S1', document_number_normalized: 'S1', practice_location: null })
        await licenses.create({ ...base, license_type: { system: 'id.license-type', code: 'sip' }, eligibility_role: 'practice_permit', document_number: 'P1', document_number_normalized: 'P1', practice_location: { facility_id: facilityId, name: 'RS', address: null } })
      })

      expect(await create({ type: 'temporary', temporary })).toMatchObject({
        type: 'temporary',
        temporary: { requested_days: 30, urgency: { code: 'disaster' } },
      })
    })
  })

  describe('update', () => {
    it('replaces the parts that are sent and keeps the rest, and logs one entry', async () => {
      const created = await create({ documents: [{ type: certificate, file: evidence }] })
      const second = await addItem()

      const updated = await asAdmin(() =>
        service.update(tenantId, created.id, {
          requestedPrivileges: [{ catalogItemId: second.id, requestedCondition: 'restricted' }],
          version: created.version,
          reason: 'Koreksi',
        }),
      )

      expect(updated).toMatchObject({
        requested_privileges: [{ catalog_item_id: second.id, requested_condition: 'restricted' }],
        requested_unit_ids: [unitId],
        documents: [{ type: { code: 'certificate' } }],
        status: 'draft',
      })
      expect(log.mock.calls.at(-1)?.[0]).toMatchObject({ event: 'application_update' })
    })

    it('puts a returned application back to draft', async () => {
      const returned = await stored('returned')
      vi.setSystemTime(new Date('2026-03-11T12:00:00Z'))

      const updated = await asAdmin(() =>
        service.update(tenantId, returned.id, { documents: [{ type: certificate, file: evidence }] }),
      )

      expect(updated.status).toBe('draft')
      expect(updated.status_since).toEqual(new Date('2026-03-11T12:00:00Z'))
    })

    it('refuses an empty update, an application that is not editable, a stale version and bad content', async () => {
      const created = await create()
      const submitted = await stored('submitted')

      expect(await rejection(() => asAdmin(() => service.update(tenantId, created.id, {})))).toMatchObject({ code: 'empty_update' })
      expect(await rejection(() => asAdmin(() => service.update(tenantId, submitted.id, { requestedUnitIds: [unitId] })))).toMatchObject({ code: 'application_not_editable' })
      expect(await rejection(() => asAdmin(() => service.update(tenantId, created.id, { requestedUnitIds: [unitId], version: created.version + 5 })))).toMatchObject({ code: 'stale_version' })
      expect(await rejection(() => asAdmin(() => service.update(tenantId, created.id, { requestedUnitIds: [otherUnitId] })))).toMatchObject({ code: 'unit_outside_facility' })
      expect(await rejection(() => asAdmin(() => service.update(tenantId, created.id, { temporary: { requestedDays: 5, urgency: { system: 'id.temporary-urgency', code: 'disaster' } } })))).toMatchObject({ code: 'temporary_not_allowed' })
    })
  })

  describe('submit', () => {
    it('sends a draft to the committee when the mandatory evidence is attached', async () => {
      const needsProof = await addItem({ mandatory: true })
      const optional = await addItem({ mandatory: false })
      const missing = await create({ requestedPrivileges: [{ catalogItemId: needsProof.id, requestedCondition: 'full' }] })
      const fine = await create({
        requestedPrivileges: [
          { catalogItemId: needsProof.id, requestedCondition: 'full' },
          { catalogItemId: optional.id, requestedCondition: 'full' },
        ],
        documents: [{ type: certificate, file: evidence }],
      })

      expect(await rejection(() => asAdmin(() => service.submit(tenantId, missing.id, {})))).toMatchObject({ code: 'evidence_missing' })
      vi.setSystemTime(new Date('2026-03-12T12:00:00Z'))
      const submitted = await asAdmin(() => service.submit(tenantId, fine.id, { version: fine.version }))

      expect(submitted.status).toBe('submitted')
      expect(submitted.status_since).toEqual(new Date('2026-03-12T12:00:00Z'))
      expect(log.mock.calls.at(-1)?.[0]).toMatchObject({ event: 'application_submit', outcome: 'success' })
    })

    it('refuses anything but a draft, and a stale version', async () => {
      const created = await create()
      await asAdmin(() => service.submit(tenantId, created.id, {}))

      expect(await rejection(() => asAdmin(() => service.submit(tenantId, created.id, {})))).toMatchObject({ code: 'invalid_transition' })
      const another = await create()
      expect(await rejection(() => asAdmin(() => service.submit(tenantId, another.id, { version: another.version + 4 })))).toMatchObject({ code: 'stale_version' })
    })
  })

  describe('withdraw', () => {
    it.each(['draft', 'submitted', 'under_review', 'returned'] as const)('withdraws a %s application with a reason', async (status) => {
      const application = await stored(status)

      const withdrawn = await asAdmin(() =>
        service.withdraw(tenantId, application.id, { reason: ' Alasan Rahasia ' }),
      )

      expect(withdrawn).toMatchObject({ status: 'withdrawn', withdrawal_reason: 'Alasan Rahasia' })
      expect(JSON.stringify(log.mock.calls)).not.toContain('Alasan Rahasia')
    })

    it.each(['assessed', 'recommended', 'approved', 'rejected', 'withdrawn'] as const)('refuses to withdraw a %s application', async (status) => {
      const application = await stored(status)

      expect(await rejection(() => asAdmin(() => service.withdraw(tenantId, application.id, { reason: 'x' })))).toMatchObject({ code: 'invalid_transition' })
    })

    it('needs a short reason and a current version', async () => {
      const application = await stored('draft')

      expect(await rejection(() => asAdmin(() => service.withdraw(tenantId, application.id, { reason: '  ' })))).toMatchObject({ code: 'reason_required' })
      expect(await rejection(() => asAdmin(() => service.withdraw(tenantId, application.id, { reason: 'x'.repeat(501) })))).toMatchObject({ code: 'invalid_reason' })
      expect(await rejection(() => asAdmin(() => service.withdraw(tenantId, application.id, { reason: 'x', version: application.version + 3 })))).toMatchObject({ code: 'stale_version' })
    })
  })

  describe('reads', () => {
    it('answers 404 for a missing, malformed or foreign application on every route', async () => {
      const application = await stored('draft')

      for (const [tenant, id] of [
        [tenantId, new Types.ObjectId().toHexString()],
        [tenantId, 'bad'],
        [otherTenantId, application.id],
      ]) {
        await expect(service.get(tenant as string, id as string)).rejects.toMatchObject({ code: 'application_not_found' })
        for (const call of [
          () => service.update(tenant as string, id as string, { requestedUnitIds: [unitId] }),
          () => service.submit(tenant as string, id as string, {}),
          () => service.withdraw(tenant as string, id as string, { reason: 'x' }),
        ]) {
          expect(await rejection(() => asAdmin(call))).toMatchObject({ code: 'application_not_found' })
        }
      }
    })

    it('lists the work queue oldest first with filters and age, and writes no log entry', async () => {
      const older = await stored('submitted')
      vi.setSystemTime(new Date('2026-03-20T00:00:00Z'))
      const newer = await create()
      const other = await addEmployee()
      const otherApplication = await create({ employeeId: other.id })
      log.mockClear()
      const ids = async (query: Parameters<ApplicationService['list']>[1]) =>
        (await service.list(tenantId, query)).map((item) => item.id)

      expect(await ids({})).toEqual([older.id, newer.id, otherApplication.id])
      expect(await ids({ status: 'submitted' })).toEqual([older.id])
      expect(await ids({ committee: 'komite_medik', facilityId })).toHaveLength(3)
      expect(await ids({ employeeId: other.id })).toEqual([otherApplication.id])
      expect(await ids({ olderThanDays: 10 })).toEqual([older.id])
      expect(await ids({ limit: 1, offset: 1 })).toEqual([newer.id])
      expect(await service.list(otherTenantId, {})).toEqual([])
      expect([log, warn, error, debug].flatMap((fn) => fn.mock.calls)).toEqual([])
    })
  })
})
