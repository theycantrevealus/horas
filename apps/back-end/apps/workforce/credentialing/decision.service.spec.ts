import { Types } from 'mongoose'
import { runWithRequestContext } from '@utility/logger/context'
import { type AppLogger } from '@utility/logger/service'
import { type CredentialApplication } from '@repository/model/credential-application'
import { type ParameterService } from '../parameter/parameter.service'
import {
  InMemoryClinicalAppointments,
  InMemoryCredentialApplications,
  InMemoryEmployees,
  InMemoryFacilities,
  InMemoryPrivilegeCatalog,
  InMemoryPrivilegeGrants,
  InMemoryProfessionalLicenses,
} from '../testing/in-memory'
import { DecisionService, type DecideInput } from './decision.service'

describe('DecisionService', () => {
  const tenantId = new Types.ObjectId().toHexString()
  const otherTenantId = new Types.ObjectId().toHexString()
  const organizationId = new Types.ObjectId().toHexString()
  const log = vi.fn()
  const warn = vi.fn()
  const error = vi.fn()
  const debug = vi.fn()
  const parameterValues: Record<string, unknown> = { SPK_VALIDITY_YEARS: 3 }
  let applications: InMemoryCredentialApplications
  let employees: InMemoryEmployees
  let facilities: InMemoryFacilities
  let catalog: InMemoryPrivilegeCatalog
  let licenses: InMemoryProfessionalLicenses
  let appointments: InMemoryClinicalAppointments
  let grants: InMemoryPrivilegeGrants
  let service: DecisionService
  let facilityId: string
  let otherFacilityId: string
  let applicantId: string
  let directorId: string
  let supervisorId: string
  let itemOne: string
  let itemTwo: string
  let itemThree: string

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
  function asDirector<T>(work: () => Promise<T>): Promise<T> {
    return runWithRequestContext(
      {
        correlationId: 'c1',
        actor: { account_id: 'a9', display_name: 'Director', kind: 'account' },
      },
      work,
    )
  }

  /**
   * Adds an employee.
   *
   * @param status - Employment status.
   * @param tenant - Tenant of the employee.
   * @returns The employee identifier.
   */
  async function addEmployee(
    status: 'active' | 'separated' = 'active',
    tenant = tenantId,
  ): Promise<string> {
    const employee = await asDirector(() =>
      employees.create({
        tenant_id: tenant,
        employee_number: `E${new Types.ObjectId().toHexString()}`,
        name: { use: 'official', text: 'Siti', given: [], prefix: [], suffix: [] },
        other_names: [],
        display_name: 'Siti',
        administrative_gender: null,
        workforce_category: { system: 'id.workforce-category', code: 'tenaga_medis' },
        is_clinical: true,
        profession: { system: 'id.profession', code: 'dokter' },
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
    return employee.id
  }

  /**
   * Adds a facility.
   *
   * @returns The facility identifier.
   */
  async function addFacility(): Promise<string> {
    const facility = await asDirector(() =>
      facilities.create({
        tenant_id: tenantId,
        organization_id: organizationId,
        code: `f-${new Types.ObjectId().toHexString()}`,
        name: [{ locale: 'en', text: 'RS' }],
        address: null,
        timezone: 'Asia/Jakarta',
        holiday_calendar_codes: [],
        external_ids: [],
        status: 'active',
      }),
    )
    return facility.id
  }

  /**
   * Adds a catalog item.
   *
   * @param status - Catalog status.
   * @returns The item identifier.
   */
  async function addItem(status: 'active' | 'retired' = 'active'): Promise<string> {
    const item = await asDirector(() =>
      catalog.create({
        tenant_id: tenantId,
        facility_ids: [],
        code: `PD-${new Types.ObjectId().toHexString().slice(-6)}`,
        name: [{ locale: 'en', text: 'Item' }],
        description: [],
        committee: { system: 'id.committee', code: 'komite_medik' },
        professions: [{ system: 'id.profession', code: 'dokter' }],
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
   * Adds a licence of the applicant.
   *
   * @param role - Registration or practice permit.
   * @param override - Fields that replace the defaults.
   */
  async function addLicense(
    role: 'registration' | 'practice_permit',
    override: {
      status?: 'valid' | 'revoked'
      issue?: string
      expiry?: string | null
      facility?: string
    } = {},
  ) {
    const number = new Types.ObjectId().toHexString().slice(-6).toUpperCase()
    await asDirector(() =>
      licenses.create({
        tenant_id: tenantId,
        employee_id: applicantId,
        license_type: { system: 'id.license-type', code: role === 'registration' ? 'str' : 'sip' },
        eligibility_role: role,
        profession: { system: 'id.profession', code: 'dokter' },
        specialty: null,
        document_number: number,
        document_number_normalized: number,
        issuing_authority: { code: null, name: 'KKI' },
        jurisdiction: { country: 'ID', subdivision: null },
        practice_location:
          role === 'practice_permit'
            ? { facility_id: override.facility ?? facilityId, name: 'RS', address: null }
            : null,
        issue_date: override.issue ?? '2025-01-01',
        expiry_date: override.expiry === undefined ? null : override.expiry,
        document,
        status: override.status ?? 'valid',
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
  }

  /**
   * Stores a recommended application: itemOne recommended full, itemTwo recommended supervised
   * by the supervisor, itemThree not recommended.
   *
   * @param override - Fields that replace the defaults.
   * @returns The application.
   */
  function recommended(override: Partial<CredentialApplication> = {}) {
    return asDirector(() =>
      applications.create({
        tenant_id: tenantId,
        employee_id: applicantId,
        credentialing_facility_id: facilityId,
        credentialing_scope: 'facility',
        type: 'initial',
        committee: { system: 'id.committee', code: 'komite_medik' },
        status: 'recommended',
        status_since: new Date('2026-03-01T00:00:00Z'),
        requested_privileges: [itemOne, itemTwo, itemThree].map((id, index) => ({
          catalog_item_id: id,
          code: `PD-${index + 1}`,
          requested_condition: 'full' as const,
          proposed_supervisor_employee_id: null,
          notes: null,
        })),
        requested_unit_ids: [new Types.ObjectId().toHexString()],
        requested_facility_ids: [facilityId],
        documents: [],
        assessors: [],
        recommendation: {
          decided_at: new Date('2026-03-08T00:00:00Z'),
          signed_by: { account_id: 'a2', display_name: 'Chair', kind: 'account' },
          summary: 'Ringkasan Rahasia',
          privileges: [
            { catalog_item_id: itemOne, outcome: 'recommended', condition: 'full', supervisor_employee_id: null, restriction_notes: null },
            { catalog_item_id: itemTwo, outcome: 'recommended', condition: 'supervised', supervisor_employee_id: supervisorId, restriction_notes: null },
            { catalog_item_id: itemThree, outcome: 'not_recommended', condition: null, supervisor_employee_id: null, restriction_notes: null },
          ],
        },
        decision: null,
        return_reason: null,
        withdrawal_reason: null,
        temporary: null,
        previous_appointment_id: null,
        ...override,
      }),
    )
  }

  /**
   * Gives the supervisor an SPK with an active full grant of itemTwo.
   *
   * @param override - Status and facility that replace the defaults.
   * @returns The grant identifier.
   */
  async function addSupervisorGrant(
    override: {
      grant?: 'active' | 'suspended'
      appointment?: 'active' | 'suspended'
      facility?: string
    } = {},
  ): Promise<string> {
    const facility = override.facility ?? facilityId
    const appointment = await asDirector(() =>
      appointments.create({
        tenant_id: tenantId,
        appointment_number: `SUP/${new Types.ObjectId().toHexString().slice(-6).toUpperCase()}`,
        employee_id: supervisorId,
        credentialing_facility_id: facility,
        credentialing_scope: 'facility',
        facility_ids: [facility],
        unit_ids: [],
        source_application_id: new Types.ObjectId().toHexString(),
        valid_period: { start: '2025-01-01', end: '2027-12-31' },
        is_temporary: false,
        status: override.appointment ?? 'active',
        is_current: true,
        issued: { by: { account_id: 'a9', display_name: 'Director', kind: 'account' }, director_employee_id: directorId, date: '2025-01-01' },
        signed_document: null,
        suspension: null,
        revocation: null,
        superseded_by_id: null,
      }),
    )
    const grant = await asDirector(() =>
      grants.create({
        tenant_id: tenantId,
        appointment_id: appointment.id,
        employee_id: supervisorId,
        facility_ids: [facility],
        unit_ids: [],
        catalog_item_id: itemTwo,
        code: 'PD-2',
        condition: 'full',
        supervisor: null,
        restriction_notes: null,
        status: override.grant ?? 'active',
        status_change: null,
        flag: null,
      }),
    )
    return grant.id
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

  const approve = (id: string, override: Partial<DecideInput> = {}, caller: string | null = directorId) =>
    asDirector(() =>
      service.decide(tenantId, caller, id, {
        outcome: 'approved',
        appointmentNumber: 'SPK/001/RS/2026',
        ...override,
      }),
    )

  beforeEach(async () => {
    vi.resetAllMocks()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-03-10T12:00:00Z'))
    parameterValues.SPK_VALIDITY_YEARS = 3
    applications = new InMemoryCredentialApplications()
    employees = new InMemoryEmployees()
    facilities = new InMemoryFacilities()
    catalog = new InMemoryPrivilegeCatalog()
    licenses = new InMemoryProfessionalLicenses()
    appointments = new InMemoryClinicalAppointments()
    grants = new InMemoryPrivilegeGrants()
    const logger = { log, warn, error, debug } as unknown as AppLogger
    const resolve = vi.fn(async (_tenant: string, input: { key: string }) => ({
      key: input.key,
      value: parameterValues[input.key],
    }))
    service = new DecisionService(
      applications,
      employees,
      facilities,
      catalog,
      licenses,
      appointments,
      grants,
      { resolve } as unknown as ParameterService,
      { run: (work: () => Promise<unknown>) => work() } as never,
      logger,
    )
    facilityId = await addFacility()
    otherFacilityId = await addFacility()
    applicantId = await addEmployee()
    directorId = await addEmployee()
    supervisorId = await addEmployee()
    itemOne = await addItem()
    itemTwo = await addItem()
    itemThree = await addItem()
    await addLicense('registration')
    await addLicense('practice_permit')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('approve', () => {
    it('issues the SPK with a grant for each recommended privilege and approves the application', async () => {
      const supervisorGrant = await addSupervisorGrant()
      const application = await recommended()

      const result = await approve(application.id, { reason: 'Disetujui', signedDocument: document })

      expect(result.appointment).toMatchObject({
        tenant_id: tenantId,
        appointment_number: 'SPK/001/RS/2026',
        employee_id: applicantId,
        credentialing_facility_id: facilityId,
        credentialing_scope: 'facility',
        facility_ids: [facilityId],
        unit_ids: application.requested_unit_ids,
        source_application_id: application.id,
        valid_period: { start: '2026-03-10', end: '2029-03-09' },
        is_temporary: false,
        status: 'active',
        is_current: true,
        issued: { director_employee_id: directorId, date: '2026-03-10', by: { account_id: 'a9' } },
        signed_document: document,
        suspension: null,
        revocation: null,
        superseded_by_id: null,
      })
      expect(result.grants).toHaveLength(2)
      expect(result.grants).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            appointment_id: result.appointment?.id,
            employee_id: applicantId,
            facility_ids: [facilityId],
            unit_ids: application.requested_unit_ids,
            catalog_item_id: itemOne,
            condition: 'full',
            supervisor: null,
            restriction_notes: null,
            status: 'active',
            status_change: null,
            flag: null,
          }),
          expect.objectContaining({
            catalog_item_id: itemTwo,
            condition: 'supervised',
            supervisor: { employee_id: supervisorId, grant_id: supervisorGrant },
            status: 'active',
          }),
        ]),
      )
      expect(result.application).toMatchObject({
        status: 'approved',
        decision: {
          outcome: 'approved',
          decided_by: { account_id: 'a9' },
          reason: 'Disetujui',
          appointment_id: result.appointment?.id,
        },
      })
      expect(result.application.status_since).toEqual(new Date('2026-03-10T12:00:00Z'))
      expect((await grants.findByAppointment(tenantId, result.appointment?.id as string)).length).toBe(2)
    })

    it('grants what was recommended, restricted notes included, not what was requested', async () => {
      const application = await recommended({
        recommendation: {
          decided_at: new Date('2026-03-08T00:00:00Z'),
          signed_by: { account_id: 'a2', display_name: 'Chair', kind: 'account' },
          summary: 'x',
          privileges: [
            { catalog_item_id: itemOne, outcome: 'recommended', condition: 'restricted', supervisor_employee_id: null, restriction_notes: 'Rawat jalan' },
            { catalog_item_id: itemTwo, outcome: 'not_recommended', condition: null, supervisor_employee_id: null, restriction_notes: null },
            { catalog_item_id: itemThree, outcome: 'not_recommended', condition: null, supervisor_employee_id: null, restriction_notes: null },
          ],
        },
      })

      const result = await approve(application.id)

      expect(result.grants).toHaveLength(1)
      expect(result.grants[0]).toMatchObject({ catalog_item_id: itemOne, condition: 'restricted', restriction_notes: 'Rawat jalan' })
    })

    it('writes one log entry without the number, the reason or the recommendation', async () => {
      await addSupervisorGrant()
      const application = await recommended()

      await approve(application.id, { reason: 'Alasan Rahasia' })

      expect(log).toHaveBeenCalledTimes(1)
      expect(log.mock.calls[0]?.[0]).toMatchObject({ event: 'application_decide', outcome: 'success' })
      const written = JSON.stringify([log.mock.calls, warn.mock.calls, error.mock.calls])
      for (const text of ['Alasan Rahasia', 'SPK/001/RS/2026', 'Ringkasan Rahasia']) {
        expect(written).not.toContain(text)
      }
    })

    it('uses the issue date in the facility zone, the validity from the parameter, and an earlier end when asked', async () => {
      await addSupervisorGrant()
      vi.setSystemTime(new Date('2026-03-10T18:00:00Z'))
      parameterValues.SPK_VALIDITY_YEARS = 2
      const application = await recommended()

      const result = await approve(application.id, { validUntil: '2027-12-31' })

      expect(result.appointment?.valid_period).toEqual({ start: '2026-03-11', end: '2027-12-31' })
      expect(result.appointment?.issued.date).toBe('2026-03-11')
    })

    it('rejects an end after the longest period, before the start, or not a date', async () => {
      await addSupervisorGrant()
      const application = await recommended()
      for (const validUntil of ['2029-03-10', '2026-03-09', '2026-02-30', 'soon']) {
        expect(await rejection(() => approve(application.id, { validUntil }))).toMatchObject({ kind: 'invalid', code: 'invalid_validity' })
      }
      expect((await approve(application.id, { validUntil: '2029-03-09' })).appointment?.valid_period.end).toBe('2029-03-09')
    })

    it('limits a temporary SPK to the requested days, counting the first day', async () => {
      const application = await recommended({
        type: 'temporary',
        temporary: { requested_days: 30, urgency: { system: 'id.temporary-urgency', code: 'disaster' } },
        recommendation: {
          decided_at: new Date('2026-03-08T00:00:00Z'),
          signed_by: { account_id: 'a2', display_name: 'Chair', kind: 'account' },
          summary: 'x',
          privileges: [
            { catalog_item_id: itemOne, outcome: 'recommended', condition: 'full', supervisor_employee_id: null, restriction_notes: null },
            { catalog_item_id: itemTwo, outcome: 'not_recommended', condition: null, supervisor_employee_id: null, restriction_notes: null },
            { catalog_item_id: itemThree, outcome: 'not_recommended', condition: null, supervisor_employee_id: null, restriction_notes: null },
          ],
        },
      })
      expect(await rejection(() => approve(application.id, { validUntil: '2026-04-09' }))).toMatchObject({ code: 'invalid_validity' })

      const result = await approve(application.id)

      expect(result.appointment).toMatchObject({ is_temporary: true, valid_period: { start: '2026-03-10', end: '2026-04-08' } })
    })

    it('needs a recommended application, and answers 404 for a missing, malformed or foreign one', async () => {
      for (const status of ['draft', 'submitted', 'under_review', 'returned', 'assessed', 'approved', 'rejected', 'withdrawn'] as const) {
        const application = await recommended({ status })
        expect(await rejection(() => approve(application.id))).toMatchObject({ code: 'invalid_transition' })
      }
      const foreign = await recommended({ tenant_id: otherTenantId })
      for (const id of [new Types.ObjectId().toHexString(), 'bad', foreign.id]) {
        expect(await rejection(() => approve(id))).toMatchObject({ kind: 'not_found', code: 'application_not_found' })
      }
      expect(await appointments.findByNumber(tenantId, 'SPK/001/RS/2026')).toBeNull()
    })

    it('needs a linked employee as the Director, who is not the applicant', async () => {
      await addSupervisorGrant()
      const application = await recommended()

      expect(await rejection(() => approve(application.id, {}, null))).toMatchObject({ kind: 'forbidden', code: 'director_employee_required' })
      expect(await rejection(() => approve(application.id, {}, applicantId))).toMatchObject({ kind: 'forbidden', code: 'decider_is_applicant' })
      expect((await applications.findOne(application.id))?.status).toBe('recommended')
    })

    it('needs the licences to be valid on the issue date for every facility of the SPK (HR-CRD-002)', async () => {
      await addSupervisorGrant()
      const run = async (setup: () => Promise<void>, expected = 'license_not_valid') => {
        applications = new InMemoryCredentialApplications()
        licenses = new InMemoryProfessionalLicenses()
        service = new DecisionService(
          applications, employees, facilities, catalog, licenses, appointments, grants,
          { resolve: async () => ({ value: 3 }) } as unknown as ParameterService,
          { run: (work: () => Promise<unknown>) => work() } as never,
          { log, warn, error, debug } as unknown as AppLogger,
        )
        await setup()
        const application = await recommended()
        expect(await rejection(() => approve(application.id))).toMatchObject({ kind: 'invalid', code: expected })
      }

      await run(async () => addLicense('practice_permit'))
      await run(async () => addLicense('registration'))
      await run(async () => { await addLicense('registration', { status: 'revoked' }); await addLicense('practice_permit') })
      await run(async () => { await addLicense('registration', { expiry: '2026-03-09' }); await addLicense('practice_permit') })
      await run(async () => { await addLicense('registration', { issue: '2026-03-11' }); await addLicense('practice_permit') })
      await run(async () => { await addLicense('registration'); await addLicense('practice_permit', { facility: otherFacilityId }) })
      await run(async () => { await addLicense('registration'); await addLicense('practice_permit', { expiry: '2026-03-09' }) })
    })

    it('accepts a licence that expires on the issue date, and needs a permit for each facility of the units', async () => {
      await addSupervisorGrant()
      await addLicense('practice_permit', { facility: otherFacilityId })
      const application = await recommended({ requested_facility_ids: [facilityId, otherFacilityId] })
      expect((await approve(application.id)).appointment?.facility_ids).toEqual([facilityId, otherFacilityId])
    })

    it('refuses an applicant who has separated and a facility that is gone', async () => {
      await addSupervisorGrant()
      const separated = await addEmployee('separated')
      const application = await recommended({ employee_id: separated })
      expect(await rejection(() => approve(application.id))).toMatchObject({ code: 'employee_separated' })
      const gone = await recommended({ credentialing_facility_id: new Types.ObjectId().toHexString() })
      expect(await rejection(() => approve(gone.id))).toMatchObject({ code: 'facility_not_found' })
    })

    it('refuses an approval with nothing recommended, and a privilege retired since the request', async () => {
      await addSupervisorGrant()
      const nothing = await recommended({
        recommendation: {
          decided_at: new Date('2026-03-08T00:00:00Z'),
          signed_by: { account_id: 'a2', display_name: 'Chair', kind: 'account' },
          summary: 'x',
          privileges: [itemOne, itemTwo, itemThree].map((id) => ({
            catalog_item_id: id, outcome: 'not_recommended' as const, condition: null, supervisor_employee_id: null, restriction_notes: null,
          })),
        },
      })
      expect(await rejection(() => approve(nothing.id))).toMatchObject({ code: 'nothing_recommended' })

      const retired = await addItem('retired')
      const application = await recommended({
        recommendation: {
          decided_at: new Date('2026-03-08T00:00:00Z'),
          signed_by: { account_id: 'a2', display_name: 'Chair', kind: 'account' },
          summary: 'x',
          privileges: [{ catalog_item_id: retired, outcome: 'recommended', condition: 'full', supervisor_employee_id: null, restriction_notes: null }],
        },
      })
      expect(await rejection(() => approve(application.id))).toMatchObject({ code: 'privilege_retired' })
      const bare = await recommended({ recommendation: null })
      expect(await rejection(() => approve(bare.id))).toMatchObject({ code: 'nothing_recommended' })
    })

    it('needs a supervisor with an active full grant of the privilege in an active SPK of the facility (HR-CRD-006)', async () => {
      const application = await recommended()
      expect(await rejection(() => approve(application.id))).toMatchObject({ kind: 'invalid', code: 'supervisor_not_privileged' })
      expect(await appointments.findByNumber(tenantId, 'SPK/001/RS/2026')).toBeNull()

      for (const override of [{ grant: 'suspended' as const }, { appointment: 'suspended' as const }, { facility: otherFacilityId }]) {
        grants = new InMemoryPrivilegeGrants()
        appointments = new InMemoryClinicalAppointments()
        service = new DecisionService(
          applications, employees, facilities, catalog, licenses, appointments, grants,
          { resolve: async () => ({ value: 3 }) } as unknown as ParameterService,
          { run: (work: () => Promise<unknown>) => work() } as never,
          { log, warn, error, debug } as unknown as AppLogger,
        )
        await addSupervisorGrant(override)
        expect(await rejection(() => approve(application.id))).toMatchObject({ code: 'supervisor_not_privileged' })
      }
    })

    it('checks the letter number: format, duplicates and one current regular SPK per facility', async () => {
      await addSupervisorGrant()
      const first = await recommended()
      for (const appointmentNumber of [undefined, '', 'spk/1', 'A'.repeat(65), 'SPK 1']) {
        expect(await rejection(() => approve(first.id, { appointmentNumber }))).toMatchObject({ code: 'invalid_appointment_number' })
      }
      await approve(first.id)

      const same = await recommended()
      expect(await rejection(() => approve(same.id))).toMatchObject({ kind: 'conflict', code: 'appointment_number_exists' })
      expect(await rejection(() => approve(same.id, { appointmentNumber: 'SPK/002/RS/2026' }))).toMatchObject({ kind: 'conflict', code: 'appointment_exists' })
    })

    it('lets a temporary SPK exist next to a current regular one', async () => {
      await addSupervisorGrant()
      await approve((await recommended()).id)
      const temporary = await recommended({
        type: 'temporary',
        temporary: { requested_days: 10, urgency: { system: 'id.temporary-urgency', code: 'disaster' } },
        recommendation: {
          decided_at: new Date('2026-03-08T00:00:00Z'),
          signed_by: { account_id: 'a2', display_name: 'Chair', kind: 'account' },
          summary: 'x',
          privileges: [{ catalog_item_id: itemOne, outcome: 'recommended', condition: 'full', supervisor_employee_id: null, restriction_notes: null }],
        },
      })

      expect((await approve(temporary.id, { appointmentNumber: 'SPK/T/1' })).appointment?.is_temporary).toBe(true)
    })

    it('checks the signed document reference', async () => {
      await addSupervisorGrant()
      const application = await recommended()
      for (const signedDocument of [{ ...document, content_type: 'text/html' }, { ...document, sha256: 'xyz' }, { ...document, file_id: '' }]) {
        expect(await rejection(() => approve(application.id, { signedDocument }))).toMatchObject({ code: 'invalid_document' })
      }
    })

    it('answers 409 for a stale version, and writes nothing when any check fails', async () => {
      await addSupervisorGrant()
      const application = await recommended()

      expect(await rejection(() => approve(application.id, { version: application.version + 5 }))).toMatchObject({ kind: 'conflict', code: 'stale_version' })

      expect((await applications.findOne(application.id))?.status).toBe('recommended')
      expect(await appointments.findByNumber(tenantId, 'SPK/001/RS/2026')).toBeNull()
    })
  })

  describe('reject', () => {
    const reject = (id: string, override: Partial<DecideInput> = {}, caller: string | null = directorId) =>
      asDirector(() => service.decide(tenantId, caller, id, { outcome: 'rejected', reason: 'Belum memenuhi syarat', ...override }))

    it('rejects a recommended application with the reason, and writes no SPK and no grant', async () => {
      const application = await recommended()

      const result = await reject(application.id)

      expect(result.appointment).toBeNull()
      expect(result.grants).toEqual([])
      expect(result.application).toMatchObject({
        status: 'rejected',
        decision: { outcome: 'rejected', decided_by: { account_id: 'a9' }, reason: 'Belum memenuhi syarat', appointment_id: null },
      })
      expect(log.mock.calls[0]?.[0]).toMatchObject({ event: 'application_decide', outcome: 'success' })
      expect(JSON.stringify(log.mock.calls)).not.toContain('Belum memenuhi syarat')
      expect(await grants.findByAppointment(tenantId, 'x')).toEqual([])
    })

    it('needs a reason of 1 to 500 characters', async () => {
      const application = await recommended()
      expect(await rejection(() => reject(application.id, { reason: '  ' }))).toMatchObject({ code: 'reason_required' })
      expect(await rejection(() => reject(application.id, { reason: undefined }))).toMatchObject({ code: 'reason_required' })
      expect(await rejection(() => reject(application.id, { reason: 'x'.repeat(501) }))).toMatchObject({ code: 'invalid_reason' })
    })

    it('is for a recommended application and a Director who is not the applicant', async () => {
      const early = await recommended({ status: 'assessed' })
      expect(await rejection(() => reject(early.id))).toMatchObject({ code: 'invalid_transition' })
      const application = await recommended()
      expect(await rejection(() => reject(application.id, {}, null))).toMatchObject({ code: 'director_employee_required' })
      expect(await rejection(() => reject(application.id, {}, applicantId))).toMatchObject({ code: 'decider_is_applicant' })
      expect(await rejection(() => reject(application.id, { version: 99 }))).toMatchObject({ code: 'stale_version' })
    })

    it('answers 404 for a missing, malformed or foreign application', async () => {
      const foreign = await recommended({ tenant_id: otherTenantId })
      for (const id of [new Types.ObjectId().toHexString(), 'bad', foreign.id]) {
        expect(await rejection(() => reject(id))).toMatchObject({ code: 'application_not_found' })
      }
    })
  })

  it('refuses an outcome that is neither approved nor rejected', async () => {
    const application = await recommended()
    expect(
      await rejection(() => asDirector(() => service.decide(tenantId, directorId, application.id, { outcome: 'maybe' as never }))),
    ).toMatchObject({ code: 'invalid_outcome' })
  })
})
