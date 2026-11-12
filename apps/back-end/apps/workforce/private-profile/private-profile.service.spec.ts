import { Types } from 'mongoose'
import { runWithRequestContext } from '@utility/logger/context'
import { type AppLogger } from '@utility/logger/service'
import { createTestFieldCipher } from '@utility/testing/test-field-cipher'
import { CodeConceptService } from '../concept/code-concept.service'
import {
  InMemoryCodeConcepts,
  InMemoryEmployeePrivateProfiles,
  InMemoryEmployees,
} from '../testing/in-memory'
import {
  PrivateProfileService,
  type IdentifierEntry,
  type SaveProfileInput,
} from './private-profile.service'

describe('PrivateProfileService', () => {
  const tenantId = new Types.ObjectId().toHexString()
  const otherTenantId = new Types.ObjectId().toHexString()
  const log = vi.fn()
  const warn = vi.fn()
  const error = vi.fn()
  const debug = vi.fn()
  const recordAccess = vi.fn()
  const record = vi.fn()
  let profiles: InMemoryEmployeePrivateProfiles
  let employees: InMemoryEmployees
  let concepts: InMemoryCodeConcepts
  let service: PrivateProfileService
  let employeeId: string

  const NIK = '3174011234567890'
  const NPWP = '123456789012345'
  const ACCOUNT = '1234567890123'

  const nik = (override: Partial<IdentifierEntry> = {}): IdentifierEntry => ({
    type: { system: 'id.identifier-type', code: 'national_id' },
    system: 'id.nik',
    issuingCountry: 'ID',
    value: NIK,
    ...override,
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
   * @param status - Concept status.
   */
  async function addConcept(
    system: string,
    code: string,
    status: 'active' | 'retired' = 'active',
  ) {
    await asAdmin(() =>
      concepts.create({
        system,
        code,
        display: [{ locale: 'en', text: code }],
        properties: {},
        mappings: [],
        period: null,
        status,
      }),
    )
  }

  /**
   * Adds an employee to a tenant.
   *
   * @param tenant - Tenant of the employee.
   * @param number - Employee number.
   * @param status - Employment status.
   * @returns The employee.
   */
  function addEmployee(
    tenant: string,
    number: string,
    status: 'onboarding' | 'active' | 'separated' = 'active',
  ) {
    return asAdmin(() =>
      employees.create({
        tenant_id: tenant,
        employee_number: number,
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
          code: 'non_klinis',
        },
        is_clinical: false,
        profession: null,
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
   * Saves the profile fields as a signed-in request.
   *
   * @param input - Fields of the profile.
   * @param id - Employee identifier.
   * @param tenant - Tenant of the caller.
   * @returns The profile.
   */
  function save(input: SaveProfileInput, id = employeeId, tenant = tenantId) {
    return asAdmin(() => service.save(tenant, id, input))
  }

  beforeEach(async () => {
    vi.resetAllMocks()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-03-10T12:00:00Z'))
    profiles = new InMemoryEmployeePrivateProfiles(createTestFieldCipher())
    employees = new InMemoryEmployees()
    concepts = new InMemoryCodeConcepts()
    const logger = { log, warn, error, debug } as unknown as AppLogger
    service = new PrivateProfileService(
      profiles,
      employees,
      new CodeConceptService(concepts, logger),
      { record, recordAccess },
      logger,
    )
    await addConcept('id.marital-status', 'married')
    await addConcept('id.marital-status', 'lama', 'retired')
    await addConcept('id.religion', 'islam')
    await addConcept('id.family-relationship', 'spouse')
    await addConcept('id.family-relationship', 'child')
    await addConcept('id.tax-status', 'k_1')
    await addConcept('id.identifier-type', 'national_id')
    await addConcept('id.identifier-type', 'tax_id')
    await addConcept('id.identifier-type', 'lama', 'retired')
    await addConcept('id.bank', 'bca')
    await addConcept('id.bank', 'lama', 'retired')
    employeeId = (await addEmployee(tenantId, 'RS-1')).id
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('save', () => {
    it('creates the profile with a decrypted birth date, then replaces it, clearing omitted fields', async () => {
      const created = await save({
        birthDate: '1990-05-17',
        birthPlace: ' Bandung ',
        nationalities: ['ID'],
        maritalStatus: { system: 'id.marital-status', code: 'married' },
        religion: { system: 'id.religion', code: 'islam' },
        personalContacts: [
          { system: 'email', value: 'Siti@Mail.com', is_primary: true },
        ],
        addresses: [
          {
            use: 'home',
            lines: ['Jl. Sehat 1'],
            admin_levels: [],
            country: 'ID',
            subdivision: 'ID-JB',
          },
        ],
        familyMembers: [
          {
            relationship: { system: 'id.family-relationship', code: 'child' },
            name: { text: 'Anak Siti' },
            birthDate: '2018-01-01',
            isDependent: true,
          },
        ],
        emergencyContacts: [
          {
            name: 'Budi',
            relationship: { system: 'id.family-relationship', code: 'spouse' },
            contacts: [{ system: 'phone', value: '+628121234567' }],
          },
        ],
        taxProfile: [
          {
            country: 'ID',
            status: { system: 'id.tax-status', code: 'k_1' },
            effectiveDate: '2026-01-01',
          },
        ],
      })

      expect(created).toMatchObject({
        tenant_id: tenantId,
        employee_id: employeeId,
        birth_date: '1990-05-17',
        birth_place: 'Bandung',
        nationalities: ['ID'],
        marital_status: { code: 'married' },
        religion: { code: 'islam' },
        personal_contacts: [
          { value: 'siti@mail.com', use: 'home', is_primary: true },
        ],
        family_members: [{ name: { text: 'Anak Siti' }, is_dependent: true }],
        emergency_contacts: [{ name: 'Budi', contacts: [{ use: 'mobile' }] }],
        tax_profile: [{ country: 'ID', effective_date: '2026-01-01' }],
        identifiers: [],
        bank_accounts: [],
      })

      const replaced = await save({
        birthPlace: 'Jakarta',
        version: created.version,
      })
      expect(replaced).toMatchObject({
        birth_date: null,
        birth_place: 'Jakarta',
        nationalities: [],
        marital_status: null,
        family_members: [],
        version: created.version + 1,
      })
    })

    it('never touches identifiers or bank accounts', async () => {
      await asAdmin(() =>
        service.replaceIdentifiers(tenantId, employeeId, {
          identifiers: [nik()],
        }),
      )
      await asAdmin(() =>
        service.replaceBankAccounts(tenantId, employeeId, {
          bankAccounts: [
            {
              bank: { system: 'id.bank', code: 'bca' },
              accountName: 'Siti',
              accountNumber: ACCOUNT,
              currency: 'IDR',
              isPrimary: true,
            },
          ],
        }),
      )

      const saved = await save({ birthPlace: 'Jakarta' })

      expect(saved.identifiers).toHaveLength(1)
      expect(saved.bank_accounts).toHaveLength(1)
    })

    it('puts the tax history in date order', async () => {
      const saved = await save({
        taxProfile: [
          {
            country: 'ID',
            status: { system: 'id.tax-status', code: 'k_1' },
            effectiveDate: '2026-02-01',
          },
          {
            country: 'ID',
            status: { system: 'id.tax-status', code: 'k_1' },
            effectiveDate: '2025-01-01',
          },
        ],
      })

      expect(saved.tax_profile.map((entry) => entry.effective_date)).toEqual([
        '2025-01-01',
        '2026-02-01',
      ])
    })

    it.each([
      [
        'a birth date in the future',
        { birthDate: '2026-03-11' },
        'invalid_birth_date',
      ],
      [
        'a birth date before 1900',
        { birthDate: '1899-12-31' },
        'invalid_birth_date',
      ],
      ['a bad birth date', { birthDate: '1990-02-30' }, 'invalid_birth_date'],
      ['an empty birth place', { birthPlace: '  ' }, 'invalid_birth_place'],
      [
        'a birth place over 100 characters',
        { birthPlace: 'x'.repeat(101) },
        'invalid_birth_place',
      ],
      [
        'an unknown nationality',
        { nationalities: ['XX'] },
        'invalid_nationalities',
      ],
      [
        'a repeated nationality',
        { nationalities: ['ID', 'ID'] },
        'invalid_nationalities',
      ],
      [
        'more than 5 nationalities',
        { nationalities: ['ID', 'SG', 'MY', 'TH', 'VN', 'PH'] },
        'invalid_nationalities',
      ],
      [
        'a work contact among personal ones',
        {
          personalContacts: [
            {
              system: 'phone' as const,
              value: '+628121234567',
              use: 'work' as const,
            },
          ],
        },
        'invalid_contacts',
      ],
      [
        'an address with a made-up country',
        {
          addresses: [
            {
              use: 'home' as const,
              lines: [],
              admin_levels: [],
              country: 'XX',
            },
          ],
        },
        'invalid_addresses',
      ],
      [
        'a marital status of another kind of system',
        { maritalStatus: { system: 'id.religion', code: 'islam' } },
        'invalid_marital_status',
      ],
      [
        'a religion of another kind of system',
        { religion: { system: 'id.marital-status', code: 'married' } },
        'invalid_religion',
      ],
      [
        'a family member born in the future',
        {
          familyMembers: [
            {
              relationship: { system: 'id.family-relationship', code: 'child' },
              name: { text: 'A' },
              birthDate: '2027-01-01',
            },
          ],
        },
        'invalid_family_members',
      ],
      [
        'a family member with a bad relationship system',
        {
          familyMembers: [
            {
              relationship: { system: 'id.bank', code: 'bca' },
              name: { text: 'A' },
            },
          ],
        },
        'invalid_family_members',
      ],
      [
        'an emergency contact without a channel',
        {
          emergencyContacts: [
            {
              name: 'Budi',
              relationship: {
                system: 'id.family-relationship',
                code: 'spouse',
              },
              contacts: [],
            },
          ],
        },
        'invalid_emergency_contacts',
      ],
      [
        'two tax statuses on one date',
        {
          taxProfile: [
            {
              country: 'ID',
              status: { system: 'id.tax-status', code: 'k_1' },
              effectiveDate: '2026-01-01',
            },
            {
              country: 'ID',
              status: { system: 'id.tax-status', code: 'k_1' },
              effectiveDate: '2026-01-01',
            },
          ],
        },
        'invalid_tax_profile',
      ],
      [
        'a tax status with a bad system',
        {
          taxProfile: [
            {
              country: 'ID',
              status: { system: 'id.bank', code: 'bca' },
              effectiveDate: '2026-01-01',
            },
          ],
        },
        'invalid_tax_profile',
      ],
      [
        'an unknown marital status code',
        { maritalStatus: { system: 'id.marital-status', code: 'nope' } },
        'unknown_code',
      ],
      [
        'a retired marital status code',
        { maritalStatus: { system: 'id.marital-status', code: 'lama' } },
        'code_retired',
      ],
    ])('rejects %s with 422 %s', async (_label, input, code) => {
      await expect(save(input)).rejects.toMatchObject({ kind: 'invalid', code })
    })

    it('answers 409 stale_version for an old version and for a version of a profile that does not exist', async () => {
      const created = await save({ birthPlace: 'A' })
      await save({ birthPlace: 'B' })

      await expect(
        save({ birthPlace: 'C', version: created.version }),
      ).rejects.toMatchObject({ kind: 'conflict', code: 'stale_version' })
      const other = (await addEmployee(tenantId, 'RS-2')).id
      await expect(save({ version: 0 }, other)).rejects.toMatchObject({
        code: 'stale_version',
      })
    })

    it('writes in every employment status, including separated', async () => {
      const separated = (await addEmployee(tenantId, 'RS-3', 'separated')).id
      const onboarding = (await addEmployee(tenantId, 'RS-4', 'onboarding')).id

      expect((await save({ birthPlace: 'A' }, separated)).birth_place).toBe('A')
      expect((await save({ birthPlace: 'B' }, onboarding)).birth_place).toBe(
        'B',
      )
    })

    it('answers not found for a missing, malformed and foreign employee, and for another tenant', async () => {
      const foreign = (await addEmployee(otherTenantId, 'X-1')).id

      for (const [tenant, id] of [
        [tenantId, new Types.ObjectId().toHexString()],
        [tenantId, 'not-an-id'],
        [tenantId, foreign],
        [otherTenantId, employeeId],
      ]) {
        await expect(
          save({ birthPlace: 'A' }, id, tenant),
        ).rejects.toMatchObject({
          kind: 'not_found',
          code: 'employee_not_found',
        })
      }
    })

    it('writes one success entry without any value, and passes the reason on', async () => {
      await save({
        birthDate: '1990-05-17',
        birthPlace: 'Rahasia City',
        reason: 'Alasan Rahasia',
      })

      expect(log).toHaveBeenCalledTimes(1)
      expect(log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'private_profile_save',
          outcome: 'success',
        }),
      )
      const text = JSON.stringify([...log.mock.calls, ...warn.mock.calls])
      for (const secret of ['1990', 'Rahasia']) {
        expect(text).not.toContain(secret)
      }
    })
  })

  describe('replaceIdentifiers', () => {
    it('stores identifiers masked, with normalized values, and creates the profile when there is none', async () => {
      const saved = await asAdmin(() =>
        service.replaceIdentifiers(tenantId, employeeId, {
          identifiers: [
            nik({ value: '3174 0112 3456 7890' }),
            {
              type: { system: 'id.identifier-type', code: 'tax_id' },
              system: 'id.npwp',
              issuingCountry: 'ID',
              value: '12.345.678.9-012.345',
              period: { start: '2020-01-01' },
            },
          ],
        }),
      )

      expect(saved.identifiers).toMatchObject([
        {
          system: 'id.nik',
          value_masked: '************7890',
          verified_at: null,
        },
        {
          system: 'id.npwp',
          value_masked: '***********2345',
          period: { start: '2020-01-01', end: null },
        },
      ])
      expect(JSON.stringify(saved)).not.toContain(NIK)
      expect(JSON.stringify(saved)).not.toContain(NPWP)
    })

    it('replaces the whole list, and an empty list clears it', async () => {
      await asAdmin(() =>
        service.replaceIdentifiers(tenantId, employeeId, {
          identifiers: [nik()],
        }),
      )

      const cleared = await asAdmin(() =>
        service.replaceIdentifiers(tenantId, employeeId, { identifiers: [] }),
      )

      expect(cleared.identifiers).toEqual([])
    })

    it('never stores a plain identifier: only ciphertext, a hash and the masked form', async () => {
      await asAdmin(() =>
        service.replaceIdentifiers(tenantId, employeeId, {
          identifiers: [nik()],
        }),
      )
      await save({ birthDate: '1990-05-17' })

      const stored = JSON.stringify(profiles.storedData())

      expect(stored).not.toContain(NIK)
      expect(stored).not.toContain('1990-05-17')
      expect(stored).toContain('************7890')
    })

    it.each([
      [
        'two identifiers of one system',
        { identifiers: [nik(), nik({ value: '3174011234567891' })] },
        'invalid_identifiers',
      ],
      [
        'a bad system name',
        { identifiers: [nik({ system: 'ID NIK' })] },
        'invalid_identifiers',
      ],
      [
        'an unknown issuing country',
        { identifiers: [nik({ issuingCountry: 'XX' })] },
        'invalid_identifiers',
      ],
      [
        'more than 10 identifiers',
        {
          identifiers: Array.from({ length: 11 }, (_, index) =>
            nik({ system: `passport.${index}`, value: `AB12345${index}` }),
          ),
        },
        'invalid_identifiers',
      ],
      [
        'a type of another kind of system',
        { identifiers: [nik({ type: { system: 'id.bank', code: 'bca' } })] },
        'invalid_identifier_type',
      ],
      [
        'a NIK of 15 digits',
        { identifiers: [nik({ value: '317401123456789' })] },
        'invalid_identifier_value',
      ],
      [
        'an end before the start',
        {
          identifiers: [
            nik({ period: { start: '2026-02-01', end: '2026-01-01' } }),
          ],
        },
        'invalid_identifier_period',
      ],
      [
        'a retired type code',
        {
          identifiers: [
            nik({ type: { system: 'id.identifier-type', code: 'lama' } }),
          ],
        },
        'code_retired',
      ],
      [
        'an unknown type code',
        {
          identifiers: [
            nik({ type: { system: 'id.identifier-type', code: 'nope' } }),
          ],
        },
        'unknown_code',
      ],
    ])('rejects %s with 422 %s', async (_label, input, code) => {
      await expect(
        asAdmin(() => service.replaceIdentifiers(tenantId, employeeId, input)),
      ).rejects.toMatchObject({ kind: 'invalid', code })
    })

    it('answers 409 when another employee of the tenant holds an identifier, in any spelling, and allows the same one in another tenant', async () => {
      const second = (await addEmployee(tenantId, 'RS-2')).id
      await asAdmin(() =>
        service.replaceIdentifiers(tenantId, employeeId, {
          identifiers: [nik()],
        }),
      )

      for (const value of [NIK, '3174-0112-3456-7890']) {
        await expect(
          asAdmin(() =>
            service.replaceIdentifiers(tenantId, second, {
              identifiers: [nik({ value })],
            }),
          ),
        ).rejects.toMatchObject({ kind: 'conflict', code: 'identifier_taken' })
      }
      const foreign = (await addEmployee(otherTenantId, 'X-1')).id
      const free = await asAdmin(() =>
        service.replaceIdentifiers(otherTenantId, foreign, {
          identifiers: [nik()],
        }),
      )
      expect(free.identifiers).toHaveLength(1)
    })

    it('lets an employee keep and rewrite their own identifier', async () => {
      await asAdmin(() =>
        service.replaceIdentifiers(tenantId, employeeId, {
          identifiers: [nik()],
        }),
      )

      const again = await asAdmin(() =>
        service.replaceIdentifiers(tenantId, employeeId, {
          identifiers: [nik()],
        }),
      )

      expect(again.identifiers).toHaveLength(1)
    })

    it('names the rule when a holder appears after the check', async () => {
      const second = (await addEmployee(tenantId, 'RS-2')).id
      await asAdmin(() =>
        service.replaceIdentifiers(tenantId, employeeId, {
          identifiers: [nik()],
        }),
      )

      // The pre-check misses a request that lost the race; the unique index still decides.
      vi.spyOn(profiles, 'findEmployeeIdByIdentifier').mockResolvedValueOnce(
        null,
      )
      await expect(
        asAdmin(() =>
          service.replaceIdentifiers(tenantId, second, {
            identifiers: [nik()],
          }),
        ),
      ).rejects.toMatchObject({ code: 'identifier_taken' })
    })

    it('logs one entry per write without any value', async () => {
      await asAdmin(() =>
        service.replaceIdentifiers(tenantId, employeeId, {
          identifiers: [nik()],
          reason: 'Alasan Rahasia',
        }),
      )

      expect(log).toHaveBeenCalledTimes(1)
      expect(log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'private_profile_identifiers_replace',
          outcome: 'success',
        }),
      )
      expect(JSON.stringify(log.mock.calls)).not.toContain('3174')
      expect(JSON.stringify(log.mock.calls)).not.toContain('Rahasia')
    })
  })

  describe('replaceBankAccounts', () => {
    const account = (override: object = {}) => ({
      bank: { system: 'id.bank', code: 'bca' },
      accountName: 'Siti Rahma',
      accountNumber: '123 456 7890123',
      swiftBic: 'cenaidja',
      currency: 'IDR',
      isPrimary: true,
      ...override,
    })

    it('stores accounts masked and creates the profile when there is none', async () => {
      const saved = await asAdmin(() =>
        service.replaceBankAccounts(tenantId, employeeId, {
          bankAccounts: [account()],
        }),
      )

      expect(saved.bank_accounts).toEqual([
        {
          bank: { system: 'id.bank', code: 'bca' },
          account_name: 'Siti Rahma',
          account_number_masked: '*********0123',
          swift_bic: 'CENAIDJA',
          currency: 'IDR',
          is_primary: true,
        },
      ])
      expect(JSON.stringify(profiles.storedData())).not.toContain(ACCOUNT)
      expect(JSON.stringify(saved)).not.toContain(ACCOUNT)
    })

    it.each([
      ['no primary account', { isPrimary: false }, 'invalid_bank_accounts'],
      ['a short number', { accountNumber: '1234' }, 'invalid_bank_accounts'],
      ['an unknown currency', { currency: 'XXZ' }, 'invalid_bank_accounts'],
      ['a bad swift code', { swiftBic: 'X' }, 'invalid_bank_accounts'],
      [
        'a bank of another kind of system',
        { bank: { system: 'id.religion', code: 'islam' } },
        'invalid_bank',
      ],
      [
        'an unknown bank',
        { bank: { system: 'id.bank', code: 'nope' } },
        'unknown_code',
      ],
      [
        'a retired bank',
        { bank: { system: 'id.bank', code: 'lama' } },
        'code_retired',
      ],
    ])('rejects %s with 422 %s', async (_label, override, code) => {
      await expect(
        asAdmin(() =>
          service.replaceBankAccounts(tenantId, employeeId, {
            bankAccounts: [account(override)],
          }),
        ),
      ).rejects.toMatchObject({ kind: 'invalid', code })
    })

    it('replaces the whole list, clears it with an empty one, and answers 409 for an old version', async () => {
      const first = await asAdmin(() =>
        service.replaceBankAccounts(tenantId, employeeId, {
          bankAccounts: [account()],
        }),
      )

      await expect(
        asAdmin(() =>
          service.replaceBankAccounts(tenantId, employeeId, {
            bankAccounts: [],
            version: first.version + 5,
          }),
        ),
      ).rejects.toMatchObject({ code: 'stale_version' })
      const cleared = await asAdmin(() =>
        service.replaceBankAccounts(tenantId, employeeId, { bankAccounts: [] }),
      )
      expect(cleared.bank_accounts).toEqual([])
    })

    it('logs one entry per write without any number', async () => {
      await asAdmin(() =>
        service.replaceBankAccounts(tenantId, employeeId, {
          bankAccounts: [account()],
        }),
      )

      expect(log).toHaveBeenCalledTimes(1)
      expect(JSON.stringify(log.mock.calls)).not.toContain('1234567')
      expect(JSON.stringify(log.mock.calls)).not.toContain('Siti')
    })
  })

  describe('reads', () => {
    it('reads the profile masked with the birth date, and answers 404 before it exists', async () => {
      await expect(service.get(tenantId, employeeId)).rejects.toMatchObject({
        kind: 'not_found',
        code: 'private_profile_not_found',
      })
      await save({ birthDate: '1990-05-17' })
      await asAdmin(() =>
        service.replaceIdentifiers(tenantId, employeeId, {
          identifiers: [nik()],
        }),
      )
      vi.clearAllMocks()

      const profile = await service.get(tenantId, employeeId)

      expect(profile.birth_date).toBe('1990-05-17')
      expect(profile.identifiers[0].value_masked).toBe('************7890')
      expect(JSON.stringify(profile)).not.toContain(NIK)
      for (const level of [log, warn, error, debug]) {
        expect(level).not.toHaveBeenCalled()
      }
      expect(recordAccess).not.toHaveBeenCalled()
    })

    it('answers not found for a missing, malformed and foreign employee and another tenant, without logging', async () => {
      await save({ birthDate: '1990-05-17' })
      const foreign = (await addEmployee(otherTenantId, 'X-1')).id
      vi.clearAllMocks()

      for (const [tenant, id] of [
        [tenantId, 'not-an-id'],
        [tenantId, new Types.ObjectId().toHexString()],
        [tenantId, foreign],
        [otherTenantId, employeeId],
      ]) {
        await expect(service.get(tenant, id)).rejects.toMatchObject({
          code: 'employee_not_found',
        })
      }
      for (const level of [log, warn, error, debug]) {
        expect(level).not.toHaveBeenCalled()
      }
    })

    it("returns the caller's own profile, and answers 404 without an employee link or without a profile", async () => {
      await save({ birthDate: '1990-05-17' })

      expect((await service.getOwn(tenantId, employeeId)).employee_id).toBe(
        employeeId,
      )
      await expect(service.getOwn(tenantId, null)).rejects.toMatchObject({
        code: 'employee_not_found',
      })
      const other = (await addEmployee(tenantId, 'RS-2')).id
      await expect(service.getOwn(tenantId, other)).rejects.toMatchObject({
        code: 'private_profile_not_found',
      })
    })
  })

  describe('revealIdentifier', () => {
    beforeEach(async () => {
      await asAdmin(() =>
        service.replaceIdentifiers(tenantId, employeeId, {
          identifiers: [nik()],
        }),
      )
      vi.clearAllMocks()
    })

    it('answers the full value and writes exactly one access record, no log entry and no value in the record', async () => {
      const revealed = await asAdmin(() =>
        service.revealIdentifier(tenantId, employeeId, 'id.nik'),
      )

      expect(revealed).toEqual({ system: 'id.nik', value: NIK })
      expect(recordAccess).toHaveBeenCalledTimes(1)
      expect(recordAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'employee_private_profile',
          tenantId,
          operation: 'PrivateProfileService.revealIdentifier',
        }),
      )
      expect(JSON.stringify(recordAccess.mock.calls)).not.toContain(NIK)
      for (const level of [log, warn, error, debug]) {
        expect(level).not.toHaveBeenCalled()
      }
    })

    it('answers 404 for an unknown system or an employee without a profile, and writes no access record', async () => {
      const other = (await addEmployee(tenantId, 'RS-2')).id

      await expect(
        asAdmin(() =>
          service.revealIdentifier(tenantId, employeeId, 'passport'),
        ),
      ).rejects.toMatchObject({ code: 'identifier_not_found' })
      await expect(
        asAdmin(() => service.revealIdentifier(tenantId, other, 'id.nik')),
      ).rejects.toMatchObject({ code: 'identifier_not_found' })
      await expect(
        asAdmin(() =>
          service.revealIdentifier(otherTenantId, employeeId, 'id.nik'),
        ),
      ).rejects.toMatchObject({ code: 'employee_not_found' })
      expect(recordAccess).not.toHaveBeenCalled()
    })
  })
})
