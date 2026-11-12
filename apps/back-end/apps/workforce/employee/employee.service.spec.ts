import { Types } from 'mongoose'
import { runWithRequestContext } from '@utility/logger/context'
import { InMemoryEventOutbox } from '@utility/testing/in-memory-event-outbox'
import { type AppLogger } from '@utility/logger/service'
import { CodeConceptService } from '../concept/code-concept.service'
import { InMemoryCodeConcepts, InMemoryEmployees } from '../testing/in-memory'
import {
  EmployeeService,
  type RegisterEmployeeInput,
  type UpdateEmployeeInput,
} from './employee.service'

describe('EmployeeService', () => {
  const tenantId = new Types.ObjectId().toHexString()
  const otherTenantId = new Types.ObjectId().toHexString()
  const log = vi.fn()
  const warn = vi.fn()
  const error = vi.fn()
  const debug = vi.fn()
  let employees: InMemoryEmployees
  let concepts: InMemoryCodeConcepts
  let service: EmployeeService
  let eventOutbox: InMemoryEventOutbox
  let transactionDepth = 0
  const depthAtAppend: number[] = []

  const doctor = { system: 'id.profession', code: 'dokter_spesialis' }
  const category = (code: string) => ({
    system: 'id.workforce-category',
    code,
  })

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
   * Registers an employee through the service; the defaults make a clinical specialist.
   *
   * @param override - Fields that replace the defaults.
   * @param tenant - Tenant of the caller.
   * @returns The created employee.
   */
  function register(
    override: Partial<RegisterEmployeeInput> = {},
    tenant = tenantId,
  ) {
    return asAdmin(() =>
      service.register(tenant, {
        employeeNumber: 'rs-0001',
        name: {
          text: ' dr. Siti Rahma, Sp.PD ',
          family: 'Rahma',
          given: ['Siti'],
          prefix: ['dr.'],
          suffix: ['Sp.PD'],
        },
        workforceCategory: category('tenaga_medis'),
        profession: doctor,
        hireDate: '2026-01-05',
        ...override,
      }),
    )
  }

  /**
   * Registers a non-clinical employee.
   *
   * @param number - Employee number.
   * @param override - Fields that replace the defaults.
   * @returns The created employee.
   */
  function registerStaff(
    number: string,
    override: Partial<RegisterEmployeeInput> = {},
  ) {
    return register({
      employeeNumber: number,
      name: { text: `Staff ${number}` },
      workforceCategory: category('non_klinis'),
      profession: null,
      ...override,
    })
  }

  /**
   * Gives an employee an active contract summary when it has none, so the status can leave
   * onboarding (HR plan 2.3, T15).
   *
   * @param id - Employee identifier.
   * @param code - Employment type code of the contract.
   */
  async function giveContract(id: string, code = 'pkwtt') {
    const employee = await employees.findOne(id)
    if (employee && !employee.current_employment) {
      await employees.update(id, {
        current_employment: {
          contract_id: new Types.ObjectId().toHexString(),
          organization_id: new Types.ObjectId().toHexString(),
          employment_type: { system: 'id.employment-type', code },
          start_date: '2026-01-01',
        },
      })
    }
  }

  /**
   * Changes an employee through the service.
   *
   * @param id - Employee identifier.
   * @param input - Fields to change.
   * @param tenant - Tenant of the caller.
   * @returns The updated employee.
   */
  function update(id: string, input: UpdateEmployeeInput, tenant = tenantId) {
    return asAdmin(() => service.update(tenant, id, input))
  }

  beforeEach(async () => {
    vi.resetAllMocks()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-03-10T12:00:00Z'))
    employees = new InMemoryEmployees()
    concepts = new InMemoryCodeConcepts()
    const logger = { log, warn, error, debug } as unknown as AppLogger
    eventOutbox = new InMemoryEventOutbox()
    depthAtAppend.length = 0
    const append = eventOutbox.append.bind(eventOutbox)
    eventOutbox.append = async (event) => {
      depthAtAppend.push(transactionDepth)
      return append(event)
    }
    service = new EmployeeService(
      employees,
      new CodeConceptService(concepts, logger),
      {
        run: async (work: () => Promise<unknown>) => {
          transactionDepth += 1
          try {
            return await work()
          } finally {
            transactionDepth -= 1
          }
        },
      } as never,
      eventOutbox,
      logger,
    )
    await addConcept('id.workforce-category', 'tenaga_medis', {
      is_clinical: true,
    })
    await addConcept('id.workforce-category', 'tenaga_keperawatan', {
      is_clinical: true,
    })
    await addConcept('id.workforce-category', 'non_klinis', {
      is_clinical: false,
    })
    await addConcept('id.workforce-category', 'lama', {}, 'retired')
    await addConcept('id.profession', 'dokter_spesialis', {
      workforce_category: 'tenaga_medis',
    })
    await addConcept('id.profession', 'dokter', {
      workforce_category: 'tenaga_medis',
    })
    await addConcept('id.profession', 'perawat', {
      workforce_category: 'tenaga_keperawatan',
    })
    await addConcept('id.profession', 'akuntan', {
      workforce_category: 'non_klinis',
    })
    await addConcept(
      'id.profession',
      'lama',
      { workforce_category: 'tenaga_medis' },
      'retired',
    )
    await addConcept('id.specialty', 'penyakit_dalam')
    await addConcept('id.specialty', 'bedah')
    await addConcept('id.specialty', 'lama', {}, 'retired')
    await addConcept('id.clinical-level', 'pk_3')
    await addConcept('id.employment-type', 'pkwtt', {
      allows_probation: true,
      requires_end_date: false,
    })
    await addConcept('id.employment-type', 'pkwt', {
      allows_probation: false,
      requires_end_date: true,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('register', () => {
    it('registers a clinical employee, onboarding, with an upper-case number and a computed display name', async () => {
      const created = await register({
        administrativeGender: 'female',
        specialties: [
          {
            coding: { system: 'id.specialty', code: 'penyakit_dalam' },
            is_primary: true,
          },
        ],
        practitionerIds: [{ system: 'id.satusehat-ihs', value: ' N100 ' }],
        workContacts: [
          { system: 'email', value: 'Siti@RS.id', is_primary: true },
        ],
        preferredLanguage: 'id-ID',
        otherNames: [{ use: 'usual', text: 'Siti' }],
      })

      expect(created).toMatchObject({
        tenant_id: tenantId,
        employee_number: 'RS-0001',
        name: {
          use: 'official',
          text: 'dr. Siti Rahma, Sp.PD',
          family: 'Rahma',
        },
        display_name: 'dr. Siti Rahma, Sp.PD',
        administrative_gender: {
          system: 'fhir.administrative-gender',
          code: 'female',
        },
        workforce_category: category('tenaga_medis'),
        is_clinical: true,
        profession: doctor,
        specialties: [
          {
            coding: { system: 'id.specialty', code: 'penyakit_dalam' },
            is_primary: true,
          },
        ],
        clinical_level: null,
        employment_status: 'onboarding',
        employment_status_since: '2026-01-05',
        original_hire_date: '2026-01-05',
        separation_date: null,
        current_employment: null,
        primary_assignment: null,
        practitioner_ids: [{ system: 'id.satusehat-ihs', value: 'N100' }],
        work_contacts: [{ system: 'email', value: 'siti@rs.id', use: 'work' }],
        preferred_language: 'id-ID',
        photo: null,
        other_names: [{ use: 'usual', text: 'Siti' }],
      })
    })

    it('registers a non-clinical employee without a profession, and with a matching one', async () => {
      const plain = await registerStaff('st-1')
      const withProfession = await registerStaff('st-2', {
        profession: { system: 'id.profession', code: 'akuntan' },
      })

      expect(plain).toMatchObject({ is_clinical: false, profession: null })
      expect(withProfession.profession?.code).toBe('akuntan')
    })

    it('stores a clinical level for a nurse', async () => {
      const nurse = await register({
        employeeNumber: 'n-1',
        workforceCategory: category('tenaga_keperawatan'),
        profession: { system: 'id.profession', code: 'perawat' },
        clinicalLevel: { system: 'id.clinical-level', code: 'pk_3' },
      })

      expect(nurse.clinical_level?.code).toBe('pk_3')
    })

    it('writes one success entry without any value', async () => {
      await register({
        workContacts: [{ system: 'email', value: 'rahasia@rs.id' }],
      })

      expect(log).toHaveBeenCalledTimes(1)
      expect(log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'employee_create',
          outcome: 'success',
        }),
      )
      const text = JSON.stringify(log.mock.calls)
      for (const secret of ['RS-0001', 'Siti', 'rahasia', 'dokter']) {
        expect(text).not.toContain(secret)
      }
    })

    it.each([
      ['an empty number', { employeeNumber: '  ' }, 'invalid_employee_number'],
      [
        'a number with a space',
        { employeeNumber: 'RS 1' },
        'invalid_employee_number',
      ],
      [
        'a number over 32 characters',
        { employeeNumber: 'A'.repeat(33) },
        'invalid_employee_number',
      ],
      ['an empty name', { name: { text: ' ' } }, 'invalid_name'],
      [
        'a bad other name',
        { otherNames: [{ text: 'x' }] },
        'invalid_other_names',
      ],
      [
        'an unknown gender',
        { administrativeGender: 'x' as never },
        'invalid_gender',
      ],
      ['a bad hire date', { hireDate: '2026-02-30' }, 'invalid_hire_date'],
      [
        'a hire date before 1950',
        { hireDate: '1949-12-31' },
        'invalid_hire_date',
      ],
      [
        'a hire date over a year ahead',
        { hireDate: '2027-03-12' },
        'invalid_hire_date',
      ],
      [
        'repeated practitioner systems',
        {
          practitionerIds: [
            { system: 's', value: '1' },
            { system: 's', value: '2' },
          ],
        },
        'invalid_practitioner_ids',
      ],
      [
        'a bad contact',
        { workContacts: [{ system: 'phone' as const, value: '0812' }] },
        'invalid_contacts',
      ],
      [
        'a bad language',
        { preferredLanguage: 'indonesia_x' },
        'invalid_language',
      ],
      [
        'a category of another kind of system',
        { workforceCategory: { system: 'id.profession', code: 'dokter' } },
        'invalid_category',
      ],
      [
        'an unknown category',
        { workforceCategory: category('nope') },
        'unknown_code',
      ],
      [
        'a retired category',
        { workforceCategory: category('lama') },
        'code_retired',
      ],
      [
        'no profession for a clinical employee',
        { profession: null },
        'profession_required',
      ],
      [
        'a profession of another kind of system',
        { profession: { system: 'id.specialty', code: 'bedah' } },
        'invalid_profession',
      ],
      [
        'an unknown profession',
        { profession: { system: 'id.profession', code: 'nope' } },
        'unknown_code',
      ],
      [
        'a retired profession',
        { profession: { system: 'id.profession', code: 'lama' } },
        'code_retired',
      ],
      [
        'a profession of another category',
        { profession: { system: 'id.profession', code: 'perawat' } },
        'profession_category_mismatch',
      ],
      [
        'specialties without a primary',
        {
          specialties: [{ coding: { system: 'id.specialty', code: 'bedah' } }],
        },
        'invalid_specialties',
      ],
      [
        'two primary specialties',
        {
          specialties: [
            {
              coding: { system: 'id.specialty', code: 'bedah' },
              is_primary: true,
            },
            {
              coding: { system: 'id.specialty', code: 'penyakit_dalam' },
              is_primary: true,
            },
          ],
        },
        'invalid_specialties',
      ],
      [
        'a repeated specialty',
        {
          specialties: [
            {
              coding: { system: 'id.specialty', code: 'bedah' },
              is_primary: true,
            },
            { coding: { system: 'id.specialty', code: 'bedah' } },
          ],
        },
        'invalid_specialties',
      ],
      [
        'a retired specialty',
        {
          specialties: [
            {
              coding: { system: 'id.specialty', code: 'lama' },
              is_primary: true,
            },
          ],
        },
        'code_retired',
      ],
      [
        'a clinical level of another kind of system',
        { clinicalLevel: { system: 'id.specialty', code: 'bedah' } },
        'invalid_clinical_level',
      ],
      [
        'an unknown clinical level',
        { clinicalLevel: { system: 'id.clinical-level', code: 'pk_9' } },
        'unknown_code',
      ],
    ])('rejects %s with 422 %s', async (_label, override, code) => {
      await expect(register(override)).rejects.toMatchObject({
        kind: 'invalid',
        code,
      })
    })

    it('refuses specialties, a clinical level and a mismatched profession for a non-clinical employee', async () => {
      await expect(
        registerStaff('st-1', {
          specialties: [
            {
              coding: { system: 'id.specialty', code: 'bedah' },
              is_primary: true,
            },
          ],
        }),
      ).rejects.toMatchObject({ code: 'specialties_not_allowed' })
      await expect(
        registerStaff('st-1', {
          clinicalLevel: { system: 'id.clinical-level', code: 'pk_3' },
        }),
      ).rejects.toMatchObject({ code: 'clinical_level_not_allowed' })
      await expect(
        registerStaff('st-1', {
          profession: { system: 'id.profession', code: 'dokter' },
        }),
      ).rejects.toMatchObject({ code: 'profession_category_mismatch' })
    })

    it('answers 409 for a taken number in any letter case, and allows it in another tenant', async () => {
      await register()

      await expect(
        register({ employeeNumber: 'RS-0001' }),
      ).rejects.toMatchObject({
        kind: 'conflict',
        code: 'employee_exists',
      })
      await expect(
        register({ employeeNumber: 'Rs-0001' }),
      ).rejects.toMatchObject({
        code: 'employee_exists',
      })
      expect((await register({}, otherTenantId)).tenant_id).toBe(otherTenantId)
    })

    it('answers 409 when another employee holds a practitioner id, and allows it in another tenant', async () => {
      await register({
        practitionerIds: [{ system: 'id.satusehat-ihs', value: 'N100' }],
      })

      await expect(
        registerStaff('st-1', {
          practitionerIds: [{ system: 'id.satusehat-ihs', value: 'N100' }],
        }),
      ).rejects.toMatchObject({
        kind: 'conflict',
        code: 'practitioner_id_taken',
      })
      await register(
        { practitionerIds: [{ system: 'id.satusehat-ihs', value: 'N100' }] },
        otherTenantId,
      )
    })

    it('names the rule the unique index decided when two requests race', async () => {
      await register({
        practitionerIds: [{ system: 'id.satusehat-ihs', value: 'N100' }],
      })

      // The pre-checks miss a request that lost the race; the unique indexes still decide.
      vi.spyOn(employees, 'findByNumber').mockResolvedValueOnce(null)
      await expect(register()).rejects.toMatchObject({
        code: 'employee_exists',
      })

      vi.spyOn(employees, 'findByPractitionerId').mockResolvedValueOnce(null)
      await expect(
        registerStaff('st-1', {
          practitionerIds: [{ system: 'id.satusehat-ihs', value: 'N100' }],
        }),
      ).rejects.toMatchObject({ code: 'practitioner_id_taken' })
    })
  })

  describe('update', () => {
    it('edits names, contacts, language and practitioner ids, and bumps the version', async () => {
      const created = await register()

      const updated = await update(created.id, {
        name: { text: 'Siti Rahma Putri' },
        otherNames: [{ use: 'alias', text: 'Sitt' }],
        administrativeGender: 'female',
        practitionerIds: [{ system: 'id.satusehat-ihs', value: 'N200' }],
        workContacts: [
          { system: 'phone', value: '+628121234567', is_primary: true },
        ],
        preferredLanguage: 'en',
      })

      expect(updated).toMatchObject({
        name: { use: 'official', text: 'Siti Rahma Putri' },
        display_name: 'Siti Rahma Putri',
        other_names: [{ use: 'alias', text: 'Sitt' }],
        practitioner_ids: [{ system: 'id.satusehat-ihs', value: 'N200' }],
        work_contacts: [{ system: 'phone', value: '+628121234567' }],
        preferred_language: 'en',
        version: created.version + 1,
      })
    })

    it('clears the gender, level and language with null', async () => {
      const created = await register({
        administrativeGender: 'male',
        preferredLanguage: 'id-ID',
      })

      const updated = await update(created.id, {
        administrativeGender: null,
        preferredLanguage: null,
        clinicalLevel: null,
      })

      expect(updated).toMatchObject({
        administrative_gender: null,
        preferred_language: null,
        clinical_level: null,
      })
    })

    it('ignores the number, status, separation date, summaries and flags when they are sent', async () => {
      const created = await register()

      const updated = await update(created.id, {
        preferredLanguage: 'en',
        employeeNumber: 'HACKED',
        employmentStatus: 'active',
        employment_status: 'active',
        separationDate: '2020-01-01',
        isClinical: false,
        currentEmployment: { contract_id: 'x' },
        primaryAssignment: { unit_id: 'x' },
      } as never)

      expect(updated).toMatchObject({
        employee_number: 'RS-0001',
        employment_status: 'onboarding',
        separation_date: null,
        is_clinical: true,
        current_employment: null,
        primary_assignment: null,
      })
    })

    it('answers 422 empty_update when nothing editable is sent', async () => {
      const created = await register()

      await expect(
        update(created.id, { employeeNumber: 'X' } as never),
      ).rejects.toMatchObject({ code: 'empty_update' })
    })

    it('corrects the category, profession and hire date while onboarding, and recomputes the clinical flag', async () => {
      const created = await register()

      const updated = await update(created.id, {
        workforceCategory: category('non_klinis'),
        profession: null,
        specialties: [],
        hireDate: '2026-02-01',
      })

      expect(updated).toMatchObject({
        workforce_category: category('non_klinis'),
        is_clinical: false,
        profession: null,
        specialties: [],
        original_hire_date: '2026-02-01',
        employment_status_since: '2026-02-01',
      })
    })

    it('refuses a category change that leaves a profession of the old category', async () => {
      const created = await register()

      await expect(
        update(created.id, {
          workforceCategory: category('tenaga_keperawatan'),
        }),
      ).rejects.toMatchObject({ code: 'profession_category_mismatch' })
      await expect(
        update(created.id, { workforceCategory: category('non_klinis') }),
      ).rejects.toMatchObject({ code: 'profession_category_mismatch' })
    })

    it('refuses to change the category or hire date after onboarding', async () => {
      const created = await register()
      await giveContract(created.id)
      await asAdmin(() =>
        service.changeStatus(tenantId, created.id, { status: 'active' }),
      )

      await expect(
        update(created.id, {
          workforceCategory: category('non_klinis'),
          profession: null,
        }),
      ).rejects.toMatchObject({ code: 'employee_started' })
      await expect(
        update(created.id, { hireDate: '2026-02-01' }),
      ).rejects.toMatchObject({ code: 'employee_started' })
      expect(
        (await update(created.id, { preferredLanguage: 'en' }))
          .preferred_language,
      ).toBe('en')
    })

    it('checks specialties and a clinical level on update, and keeps them for non-clinical employees empty', async () => {
      const created = await register()
      const staff = await registerStaff('st-1')

      const withSpecialty = await update(created.id, {
        specialties: [
          {
            coding: { system: 'id.specialty', code: 'bedah' },
            is_primary: true,
          },
        ],
      })
      expect(withSpecialty.specialties).toHaveLength(1)
      await expect(
        update(created.id, {
          specialties: [{ coding: { system: 'id.specialty', code: 'bedah' } }],
        }),
      ).rejects.toMatchObject({ code: 'invalid_specialties' })
      await expect(
        update(staff.id, {
          specialties: [
            {
              coding: { system: 'id.specialty', code: 'bedah' },
              is_primary: true,
            },
          ],
        }),
      ).rejects.toMatchObject({ code: 'specialties_not_allowed' })
    })

    it('does not fail on a code that was retired after the record was made, unless the field is sent again', async () => {
      const created = await register()
      await concepts.update(
        (await concepts.findByCode(
          tenantId,
          'id.profession',
          'dokter_spesialis',
        ))!.id,
        { status: 'retired' },
      )

      const updated = await update(created.id, { preferredLanguage: 'en' })
      const sameField = update(created.id, { profession: doctor })

      expect(updated.profession).toEqual(doctor)
      await expect(sameField).rejects.toMatchObject({ code: 'code_retired' })
    })

    it('answers 409 when a practitioner id belongs to another employee, and allows keeping its own', async () => {
      const first = await register({
        practitionerIds: [{ system: 'id.satusehat-ihs', value: 'N100' }],
      })
      const second = await registerStaff('st-1')

      await expect(
        update(second.id, {
          practitionerIds: [{ system: 'id.satusehat-ihs', value: 'N100' }],
        }),
      ).rejects.toMatchObject({ code: 'practitioner_id_taken' })
      expect(
        (
          await update(first.id, {
            practitionerIds: [{ system: 'id.satusehat-ihs', value: 'N100' }],
            preferredLanguage: 'en',
          })
        ).preferred_language,
      ).toBe('en')
    })

    it('refuses to edit a separated employee', async () => {
      const created = await register()
      await asAdmin(() =>
        service.changeStatus(tenantId, created.id, {
          status: 'separated',
          reason: 'Resigned',
        }),
      )

      await expect(
        update(created.id, { preferredLanguage: 'en' }),
      ).rejects.toMatchObject({ code: 'employee_separated' })
    })

    it('answers 409 stale_version for an old version', async () => {
      const created = await register()
      await update(created.id, { preferredLanguage: 'en' })

      await expect(
        update(created.id, {
          preferredLanguage: 'id',
          version: created.version,
        }),
      ).rejects.toMatchObject({ kind: 'conflict', code: 'stale_version' })
    })

    it('answers not found for another tenant and for malformed and missing ids', async () => {
      const created = await register()

      for (const [tenant, id] of [
        [otherTenantId, created.id],
        [tenantId, 'not-an-id'],
        [tenantId, new Types.ObjectId().toHexString()],
      ]) {
        await expect(
          update(id, { preferredLanguage: 'en' }, tenant),
        ).rejects.toMatchObject({
          kind: 'not_found',
          code: 'employee_not_found',
        })
      }
    })

    it('passes the reason to the change history without logging it or any value', async () => {
      const created = await register()
      vi.clearAllMocks()

      await update(created.id, {
        name: { text: 'Nama Rahasia' },
        reason: 'Alasan Rahasia',
      })

      expect(log).toHaveBeenCalledTimes(1)
      expect(JSON.stringify(log.mock.calls)).not.toContain('Rahasia')
    })
  })

  describe('changeStatus', () => {
    /**
     * Changes the status as a signed-in request.
     *
     * @param id - Employee identifier.
     * @param status - New status.
     * @param extra - Date, reason and version.
     * @returns The updated employee.
     */
    async function change(
      id: string,
      status: Parameters<EmployeeService['changeStatus']>[2]['status'],
      extra: object = {},
    ) {
      await giveContract(id)
      return asAdmin(() =>
        service.changeStatus(tenantId, id, { status, ...extra }),
      )
    }

    it('moves through onboarding, probation, active, suspended, active and separated, with dates', async () => {
      const created = await register({ hireDate: '2026-01-05' })

      const probation = await change(created.id, 'probation', {
        effectiveDate: '2026-01-06',
      })
      const active = await change(created.id, 'active', {
        effectiveDate: '2026-02-01',
      })
      const suspended = await change(created.id, 'suspended', {
        reason: 'Investigation',
      })
      const back = await change(created.id, 'active')
      const separated = await change(created.id, 'separated', {
        reason: 'Resigned',
        effectiveDate: '2026-03-10',
      })

      expect(probation).toMatchObject({
        employment_status: 'probation',
        employment_status_since: '2026-01-06',
      })
      expect(active.employment_status_since).toBe('2026-02-01')
      expect(suspended).toMatchObject({
        employment_status: 'suspended',
        employment_status_since: '2026-03-10',
        separation_date: null,
      })
      expect(back.employment_status).toBe('active')
      expect(separated).toMatchObject({
        employment_status: 'separated',
        separation_date: '2026-03-10',
        employment_status_since: '2026-03-10',
      })
    })

    it('goes from onboarding straight to active, and from onboarding to separated', async () => {
      const first = await register()
      const second = await registerStaff('st-1')

      expect((await change(first.id, 'active')).employment_status).toBe(
        'active',
      )
      expect(
        (await change(second.id, 'separated', { reason: 'Never started' }))
          .employment_status,
      ).toBe('separated')
    })

    it.each([
      ['probation', 'onboarding'],
      ['active', 'probation'],
      ['active', 'active'],
    ] as const)(
      'refuses %s to %s with 422 invalid_transition',
      async (from, to) => {
        const created = await register()
        if (from !== 'probation') {
          await change(created.id, from)
        } else {
          await change(created.id, 'probation')
        }

        await expect(change(created.id, to)).rejects.toMatchObject({
          kind: 'invalid',
          code: 'invalid_transition',
        })
      },
    )

    it('needs an active contract to leave onboarding for probation or active (HR plan 2.3, T15), but not to separate', async () => {
      const created = await register()

      for (const status of ['probation', 'active'] as const) {
        await expect(
          asAdmin(() => service.changeStatus(tenantId, created.id, { status })),
        ).rejects.toMatchObject({ kind: 'invalid', code: 'contract_required' })
      }
      expect(
        (
          await asAdmin(() =>
            service.changeStatus(tenantId, created.id, {
              status: 'separated',
              reason: 'Never started',
            }),
          )
        ).employment_status,
      ).toBe('separated')
    })

    it('allows probation only for a contract type that allows it, and active for any type', async () => {
      const fixedTerm = await registerStaff('st-1')
      await giveContract(fixedTerm.id, 'pkwt')
      const permanent = await registerStaff('st-2')
      await giveContract(permanent.id, 'pkwtt')

      await expect(
        asAdmin(() =>
          service.changeStatus(tenantId, fixedTerm.id, { status: 'probation' }),
        ),
      ).rejects.toMatchObject({ code: 'probation_not_allowed' })
      expect(
        (
          await asAdmin(() =>
            service.changeStatus(tenantId, fixedTerm.id, { status: 'active' }),
          )
        ).employment_status,
      ).toBe('active')
      expect(
        (
          await asAdmin(() =>
            service.changeStatus(tenantId, permanent.id, {
              status: 'probation',
            }),
          )
        ).employment_status,
      ).toBe('probation')
    })

    it('does not ask for a contract on later changes', async () => {
      const created = await register()
      await change(created.id, 'active')
      await employees.update(created.id, { current_employment: null })

      expect(
        (await change(created.id, 'suspended', { reason: 'Case 1' }))
          .employment_status,
      ).toBe('suspended')
    })

    it('writes one status_changed event per change, inside the transaction, with ids, codes and dates only (HR plan events H3)', async () => {
      const created = await register({ hireDate: '2026-01-05' })

      const active = await change(created.id, 'active', {
        effectiveDate: '2026-02-01',
      })
      await change(created.id, 'suspended', {
        reason: 'Alasan Rahasia',
        effectiveDate: '2026-03-01',
      })

      expect(eventOutbox.events).toHaveLength(2)
      expect(eventOutbox.events[0]).toMatchObject({
        tenant_id: tenantId,
        event_type: 'workforce.employee.status_changed',
        aggregate: {
          type: 'employee',
          id: created.id,
          version: active.version,
        },
        payload: {
          employee_id: created.id,
          from_status: 'onboarding',
          to_status: 'active',
          effective_date: '2026-02-01',
        },
        correlation_id: 'c1',
      })
      expect(eventOutbox.events[1].payload).toMatchObject({
        from_status: 'active',
        to_status: 'suspended',
      })
      expect(depthAtAppend.every((depth) => depth > 0)).toBe(true)
      const text = JSON.stringify(eventOutbox.events)
      for (const secret of ['Rahasia', 'RS-0001', 'Siti', 'dokter']) {
        expect(text).not.toContain(secret)
      }
    })

    it('writes no event for a refused change, an edit or a registration', async () => {
      const created = await register()
      await update(created.id, { preferredLanguage: 'en' })

      await expect(
        asAdmin(() =>
          service.changeStatus(tenantId, created.id, { status: 'suspended' }),
        ),
      ).rejects.toBeDefined()
      await expect(
        change(created.id, 'probation', { version: 99 }),
      ).rejects.toMatchObject({ code: 'stale_version' })

      expect(eventOutbox.events).toEqual([])
    })

    it('makes separated final', async () => {
      const created = await register()
      await change(created.id, 'separated', { reason: 'Resigned' })

      for (const status of [
        'onboarding',
        'probation',
        'active',
        'suspended',
        'separated',
      ] as const) {
        await expect(
          change(created.id, status, { reason: 'x' }),
        ).rejects.toMatchObject({ code: 'invalid_transition' })
      }
    })

    it('needs a reason for suspended and separated only', async () => {
      const created = await register()
      await change(created.id, 'active')

      await expect(change(created.id, 'suspended')).rejects.toMatchObject({
        code: 'reason_required',
      })
      await expect(change(created.id, 'separated')).rejects.toMatchObject({
        code: 'reason_required',
      })
      expect(
        (await change(created.id, 'suspended', { reason: 'Case 1' }))
          .employment_status,
      ).toBe('suspended')
    })

    it('refuses an effective date that is bad, before the current status or after tomorrow', async () => {
      const created = await register({ hireDate: '2026-01-05' })

      for (const effectiveDate of ['2026-02-30', 'soon']) {
        await expect(
          change(created.id, 'active', { effectiveDate }),
        ).rejects.toMatchObject({ code: 'invalid_effective_date' })
      }
      for (const effectiveDate of ['2026-01-04', '2026-03-12']) {
        await expect(
          change(created.id, 'active', { effectiveDate }),
        ).rejects.toMatchObject({ code: 'effective_date_out_of_range' })
      }
      expect(
        (await change(created.id, 'active', { effectiveDate: '2026-03-11' }))
          .employment_status_since,
      ).toBe('2026-03-11')
    })

    it('writes the status, its date and the separation date in one update', async () => {
      const created = await register()
      await giveContract(created.id)
      const spy = vi.spyOn(employees, 'update')

      await change(created.id, 'separated', {
        reason: 'Resigned',
        effectiveDate: '2026-03-10',
      })

      expect(spy).toHaveBeenCalledTimes(1)
      expect(spy.mock.calls[0][1]).toEqual({
        employment_status: 'separated',
        employment_status_since: '2026-03-10',
        separation_date: '2026-03-10',
      })
    })

    it('answers 409 stale_version, not found for another tenant, and logs no value', async () => {
      const created = await register()
      vi.clearAllMocks()

      await expect(
        change(created.id, 'active', { version: created.version + 4 }),
      ).rejects.toMatchObject({ code: 'stale_version' })
      await expect(
        asAdmin(() =>
          service.changeStatus(otherTenantId, created.id, { status: 'active' }),
        ),
      ).rejects.toMatchObject({ code: 'employee_not_found' })
      await change(created.id, 'suspended', { reason: 'Alasan Rahasia' }).catch(
        () => undefined,
      )
      expect(
        JSON.stringify([...log.mock.calls, ...warn.mock.calls]),
      ).not.toContain('Rahasia')
    })
  })

  describe('reads', () => {
    it('searches by name, number prefix, status, category, clinical flag and unit, ordered by number, and writes no log', async () => {
      const a = await register({ employeeNumber: 'rs-0002' })
      await register({
        employeeNumber: 'rs-0001',
        name: { text: 'Budi Santoso' },
        profession: doctor,
      })
      await registerStaff('st-1')
      await employees.update(a.id, {
        primary_assignment: {
          assignment_id: 'a',
          facility_id: 'f',
          unit_id: 'u-1',
          position_id: 'p',
        },
        employment_status: 'active',
      })
      vi.clearAllMocks()

      const all = await service.list(tenantId, {})
      const byName = await service.list(tenantId, { name: 'santoso' })
      const byNumber = await service.list(tenantId, { employeeNumber: 'rs-' })
      const byStatus = await service.list(tenantId, { status: 'active' })
      const byCategory = await service.list(tenantId, {
        workforceCategory: 'non_klinis',
      })
      const clinical = await service.list(tenantId, { isClinical: true })
      const byUnit = await service.list(tenantId, { unitId: 'u-1' })
      const paged = await service.list(tenantId, { limit: 1, offset: 1 })

      expect(all.data.map((e) => e.employee_number)).toEqual([
        'RS-0001',
        'RS-0002',
        'ST-1',
      ])
      expect(byName.data.map((e) => e.employee_number)).toEqual(['RS-0001'])
      expect(byNumber.totalRecords).toBe(2)
      expect(byStatus.data.map((e) => e.employee_number)).toEqual(['RS-0002'])
      expect(byCategory.data.map((e) => e.employee_number)).toEqual(['ST-1'])
      expect(clinical.totalRecords).toBe(2)
      expect(byUnit.data.map((e) => e.employee_number)).toEqual(['RS-0002'])
      expect(paged.data.map((e) => e.employee_number)).toEqual(['RS-0002'])
      for (const level of [log, warn, error, debug]) {
        expect(level).not.toHaveBeenCalled()
      }
    })

    it('keeps other tenants out of the search', async () => {
      await register()
      await register({}, otherTenantId)

      expect((await service.list(tenantId, {})).totalRecords).toBe(1)
      expect((await service.list(otherTenantId, {})).totalRecords).toBe(1)
    })

    it('gets one employee, and answers not found for another tenant, malformed and missing ids, without logging', async () => {
      const created = await register()
      vi.clearAllMocks()

      expect((await service.get(tenantId, created.id)).employee_number).toBe(
        'RS-0001',
      )
      for (const [tenant, id] of [
        [otherTenantId, created.id],
        [tenantId, 'not-an-id'],
        [tenantId, new Types.ObjectId().toHexString()],
      ]) {
        await expect(service.get(tenant, id)).rejects.toMatchObject({
          code: 'employee_not_found',
        })
      }
      for (const level of [log, warn, error, debug]) {
        expect(level).not.toHaveBeenCalled()
      }
    })

    it("returns the caller's own employee, and answers not found without a link or for another tenant", async () => {
      const created = await register()

      expect((await service.getOwn(tenantId, created.id)).id).toBe(created.id)
      await expect(service.getOwn(tenantId, null)).rejects.toMatchObject({
        code: 'employee_not_found',
      })
      await expect(
        service.getOwn(otherTenantId, created.id),
      ).rejects.toMatchObject({ code: 'employee_not_found' })
    })
  })
})
