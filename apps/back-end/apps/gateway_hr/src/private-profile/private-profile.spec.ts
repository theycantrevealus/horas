import { Logger } from '@nestjs/common'
import { Types } from 'mongoose'
import { PERMISSIONS } from '@identity/permission'
import { EmployeeManagementModule } from '../employee/employee-management.module'
import { createHrGateway, type HrGateway } from '../testing/hr-gateway'
import {
  createInMemoryWorkforce,
  type InMemoryWorkforce,
} from '../testing/in-memory-workforce'
import { PrivateProfileManagementModule } from './private-profile-management.module'

describe('private profile endpoints (in-memory repositories)', () => {
  const workforce: InMemoryWorkforce = createInMemoryWorkforce()
  let gateway: HrGateway
  let call: HrGateway['call']
  let writerToken: string
  let readerToken: string
  let revealToken: string
  let otherTenantToken: string
  let employeeId: string
  let counter = 0

  const NIK = '3174011234567890'
  const NPWP = '123456789012345'
  const ACCOUNT = '1234567890123'
  const BIRTH_DATE = '1990-05-17'

  /**
   * Adds a platform-wide code concept.
   *
   * @param system - Code system.
   * @param code - Code.
   */
  async function addConcept(system: string, code: string) {
    await workforce.codeConcepts.create({
      system,
      code,
      display: [{ locale: 'en', text: code }],
      properties: {},
      mappings: [],
      period: null,
      status: 'active',
    })
  }

  /**
   * Adds an employee directly to the in-memory repository.
   *
   * @param tenant - Tenant of the employee.
   * @param status - Employment status.
   * @returns The employee identifier.
   */
  async function addEmployee(
    tenant: string,
    status: 'active' | 'separated' = 'active',
  ): Promise<string> {
    counter += 1
    const employee = await workforce.employees.create({
      tenant_id: tenant,
      employee_number: `RS-${counter}`,
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
    })
    return employee.id
  }

  const identifier = (override: object = {}) => ({
    type: { system: 'id.identifier-type', code: 'national_id' },
    system: 'id.nik',
    issuingCountry: 'ID',
    value: NIK,
    ...override,
  })

  const account = (override: object = {}) => ({
    bank: { system: 'id.bank', code: 'bca' },
    accountName: 'Siti Rahma',
    accountNumber: ACCOUNT,
    currency: 'IDR',
    isPrimary: true,
    ...override,
  })

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
      modules: [EmployeeManagementModule, PrivateProfileManagementModule],
      ...workforce.options,
    })
    call = gateway.call
    const { tenantId, otherTenantId, seedAndLogin } = gateway
    readerToken = await seedAndLogin(tenantId, 'reader', [
      PERMISSIONS.WORKFORCE_PRIVATE_PROFILE_READ,
    ])
    writerToken = await seedAndLogin(tenantId, 'writer', [
      PERMISSIONS.WORKFORCE_PRIVATE_PROFILE_READ,
      PERMISSIONS.WORKFORCE_PRIVATE_PROFILE_WRITE,
    ])
    revealToken = await seedAndLogin(tenantId, 'revealer', [
      PERMISSIONS.WORKFORCE_PRIVATE_PROFILE_REVEAL,
    ])
    otherTenantToken = await seedAndLogin(otherTenantId, 'other', [
      PERMISSIONS.WORKFORCE_PRIVATE_PROFILE_READ,
      PERMISSIONS.WORKFORCE_PRIVATE_PROFILE_WRITE,
      PERMISSIONS.WORKFORCE_PRIVATE_PROFILE_REVEAL,
    ])
    for (const [system, code] of [
      ['id.marital-status', 'married'],
      ['id.family-relationship', 'spouse'],
      ['id.tax-status', 'k_1'],
      ['id.identifier-type', 'national_id'],
      ['id.identifier-type', 'tax_id'],
      ['id.bank', 'bca'],
    ]) {
      await addConcept(system, code)
    }
    employeeId = await addEmployee(tenantId)
  })

  afterAll(async () => {
    await gateway.close()
  })

  /**
   * Saves the profile fields as the writer.
   *
   * @param override - Fields that replace the defaults.
   * @param id - Employee identifier.
   * @returns The reply.
   */
  function saveProfile(override: object = {}, id = employeeId) {
    return call('PUT', `/v1/employees/${id}/private-profile`, writerToken, {
      birthDate: BIRTH_DATE,
      birthPlace: 'Bandung',
      nationalities: ['ID'],
      maritalStatus: { system: 'id.marital-status', code: 'married' },
      ...override,
    })
  }

  it('refuses every route without a token (401) and without its own permission (403)', async () => {
    const id = new Types.ObjectId().toHexString()
    const base = `/v1/employees/${id}/private-profile`
    const routes: ['GET' | 'PUT', string, object | undefined][] = [
      ['GET', '/v1/employees/me/private-profile', undefined],
      ['GET', base, undefined],
      ['PUT', base, {}],
      ['PUT', `${base}/identifiers`, { identifiers: [] }],
      ['PUT', `${base}/bank-accounts`, { bankAccounts: [] }],
      ['GET', `${base}/identifiers/id.nik`, undefined],
    ]
    for (const [method, url, payload] of routes) {
      expect((await call(method, url, undefined, payload)).status).toBe(401)
    }
    for (const [method, url, payload] of [
      ['PUT', base, {}],
      ['PUT', `${base}/identifiers`, { identifiers: [] }],
      ['PUT', `${base}/bank-accounts`, { bankAccounts: [] }],
    ] as const) {
      expect((await call(method, url, readerToken, payload)).status).toBe(403)
    }
    expect((await call('GET', base, revealToken)).status).toBe(403)
    expect(
      (await call('GET', `${base}/identifiers/id.nik`, writerToken)).status,
    ).toBe(403)
    expect(
      (await call('GET', `${base}/identifiers/id.nik`, readerToken)).status,
    ).toBe(403)
  })

  it('creates the profile, reads it with the birth date and replaces it, clearing omitted fields', async () => {
    const own = await addEmployee(gateway.tenantId)
    expect(
      (await call('GET', `/v1/employees/${own}/private-profile`, readerToken))
        .body,
    ).toMatchObject({ code: 'private_profile_not_found' })

    const created = await call(
      'PUT',
      `/v1/employees/${own}/private-profile`,
      writerToken,
      {
        birthDate: BIRTH_DATE,
        birthPlace: 'Bandung',
        nationalities: ['ID'],
        personalContacts: [
          { system: 'email', value: 'Siti@Mail.com', is_primary: true },
        ],
        addresses: [
          {
            use: 'home',
            lines: ['Jl. Sehat 1'],
            admin_levels: [],
            subdivision: 'ID-JB',
            country: 'ID',
          },
        ],
        maritalStatus: { system: 'id.marital-status', code: 'married' },
        familyMembers: [
          {
            relationship: { system: 'id.family-relationship', code: 'spouse' },
            name: { text: 'Budi' },
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
        reason: 'Onboarding',
      },
    )
    expect(created.status).toBe(200)
    expect(created.body).toMatchObject({
      employee_id: own,
      birth_date: BIRTH_DATE,
      personal_contacts: [{ value: 'siti@mail.com', use: 'home' }],
      identifiers: [],
      bank_accounts: [],
    })
    expect(created.body).not.toHaveProperty('_id')

    const read = await call(
      'GET',
      `/v1/employees/${own}/private-profile`,
      readerToken,
    )
    expect(read.status).toBe(200)
    expect(read.body?.birth_date).toBe(BIRTH_DATE)

    const replaced = await call(
      'PUT',
      `/v1/employees/${own}/private-profile`,
      writerToken,
      { birthPlace: 'Jakarta', version: created.body?.version },
    )
    expect(replaced.body).toMatchObject({
      birth_date: null,
      birth_place: 'Jakarta',
      nationalities: [],
      family_members: [],
    })
  })

  it('answers no-store on every route that carries confidential data', async () => {
    await saveProfile()
    await call(
      'PUT',
      `/v1/employees/${employeeId}/private-profile/identifiers`,
      writerToken,
      {
        identifiers: [identifier()],
      },
    )
    const linked = await gateway.seedAndLogin(
      gateway.tenantId,
      'self-nostore',
      [],
      employeeId,
    )

    const replies = [
      await saveProfile(),
      await call(
        'GET',
        `/v1/employees/${employeeId}/private-profile`,
        readerToken,
      ),
      await call(
        'PUT',
        `/v1/employees/${employeeId}/private-profile/identifiers`,
        writerToken,
        {
          identifiers: [identifier()],
        },
      ),
      await call(
        'PUT',
        `/v1/employees/${employeeId}/private-profile/bank-accounts`,
        writerToken,
        {
          bankAccounts: [account()],
        },
      ),
      await call(
        'GET',
        `/v1/employees/${employeeId}/private-profile/identifiers/id.nik`,
        revealToken,
      ),
      await call('GET', '/v1/employees/me/private-profile', linked),
    ]

    for (const reply of replies) {
      expect(reply.status).toBeLessThan(300)
      expect(reply.headers['cache-control']).toBe('no-store')
    }
  })

  it('stores identifiers and bank accounts masked, and never returns a plain value', async () => {
    await saveProfile()

    const identifiers = await call(
      'PUT',
      `/v1/employees/${employeeId}/private-profile/identifiers`,
      writerToken,
      {
        identifiers: [
          identifier({ value: '3174 0112 3456 7890' }),
          {
            type: { system: 'id.identifier-type', code: 'tax_id' },
            system: 'id.npwp',
            issuingCountry: 'ID',
            value: '12.345.678.9-012.345',
            period: { start: '2020-01-01' },
          },
        ],
        reason: 'Documents checked',
      },
    )
    const accounts = await call(
      'PUT',
      `/v1/employees/${employeeId}/private-profile/bank-accounts`,
      writerToken,
      { bankAccounts: [account({ accountNumber: '123 456 7890123' })] },
    )

    expect(identifiers.status).toBe(200)
    expect(accounts.status).toBe(200)
    expect(accounts.body).toMatchObject({
      identifiers: [
        { system: 'id.nik', value_masked: '************7890' },
        { system: 'id.npwp', value_masked: '***********2345' },
      ],
      bank_accounts: [
        {
          account_number_masked: '*********0123',
          currency: 'IDR',
          is_primary: true,
        },
      ],
      birth_date: BIRTH_DATE,
    })
    for (const reply of [identifiers, accounts]) {
      const text = JSON.stringify(reply.body)
      for (const secret of [NIK, NPWP, ACCOUNT]) {
        expect(text).not.toContain(secret)
      }
      expect(text).not.toContain('encrypted')
    }
    const stored = JSON.stringify(workforce.privateProfiles.storedData())
    for (const secret of [NIK, NPWP, ACCOUNT, BIRTH_DATE]) {
      expect(stored).not.toContain(secret)
    }
  })

  it('keeps the three writes apart: the profile fields cannot clear identifiers or accounts', async () => {
    await call(
      'PUT',
      `/v1/employees/${employeeId}/private-profile/identifiers`,
      writerToken,
      {
        identifiers: [identifier()],
      },
    )
    await call(
      'PUT',
      `/v1/employees/${employeeId}/private-profile/bank-accounts`,
      writerToken,
      {
        bankAccounts: [account()],
      },
    )

    const saved = await saveProfile({ birthPlace: 'Medan' })
    const cleared = await call(
      'PUT',
      `/v1/employees/${employeeId}/private-profile/identifiers`,
      writerToken,
      { identifiers: [] },
    )

    expect(saved.body?.identifiers).toHaveLength(1)
    expect(saved.body?.bank_accounts).toHaveLength(1)
    expect(cleared.body).toMatchObject({
      identifiers: [],
      birth_place: 'Medan',
    })
    expect(cleared.body?.bank_accounts).toHaveLength(1)
  })

  it('reveals one identifier in full with its own permission, and writes one access record without the value', async () => {
    const own = await addEmployee(gateway.tenantId)
    await call(
      'PUT',
      `/v1/employees/${own}/private-profile/identifiers`,
      writerToken,
      {
        identifiers: [identifier({ value: '3174019999999999' })],
      },
    )
    const before = gateway.changeRecords.length

    const revealed = await call(
      'GET',
      `/v1/employees/${own}/private-profile/identifiers/id.nik`,
      revealToken,
    )

    expect(revealed.status).toBe(200)
    expect(revealed.body).toEqual({
      system: 'id.nik',
      value: '3174019999999999',
    })
    const records = gateway.changeRecords.slice(before)
    expect(records).toHaveLength(1)
    expect(records[0]).toMatchObject({
      action: 'read',
      entity: { type: 'employee_private_profile' },
    })
    expect(JSON.stringify(records)).not.toContain('3174019999999999')
  })

  it('answers 404 for an unknown identifier and for an employee without a profile, without an access record', async () => {
    const empty = await addEmployee(gateway.tenantId)
    const before = gateway.changeRecords.length

    for (const [id, system] of [
      [employeeId, 'passport'],
      [empty, 'id.nik'],
    ]) {
      const reply = await call(
        'GET',
        `/v1/employees/${id}/private-profile/identifiers/${system}`,
        revealToken,
      )
      expect([reply.status, reply.body?.code]).toEqual([
        404,
        'identifier_not_found',
      ])
    }
    expect(gateway.changeRecords).toHaveLength(before)
  })

  it('answers 404 employee_not_found for malformed, missing and foreign employees on every route', async () => {
    const foreign = await addEmployee(gateway.otherTenantId)
    const missing = new Types.ObjectId().toHexString()

    for (const id of ['missing-id', missing, foreign]) {
      const base = `/v1/employees/${id}/private-profile`
      const replies = [
        await call('GET', base, writerToken),
        await call('PUT', base, writerToken, {}),
        await call('PUT', `${base}/identifiers`, writerToken, {
          identifiers: [],
        }),
        await call('PUT', `${base}/bank-accounts`, writerToken, {
          bankAccounts: [],
        }),
        await call('GET', `${base}/identifiers/id.nik`, revealToken),
      ]
      for (const reply of replies) {
        expect([reply.status, reply.body?.code]).toEqual([
          404,
          'employee_not_found',
        ])
      }
    }
    expect(
      (
        await call(
          'GET',
          `/v1/employees/${employeeId}/private-profile`,
          otherTenantToken,
        )
      ).body,
    ).toMatchObject({ code: 'employee_not_found' })
  })

  it('answers 409 identifier_taken for an identifier of another employee, never saying who, and 409 stale_version for an old version', async () => {
    const first = await addEmployee(gateway.tenantId)
    const second = await addEmployee(gateway.tenantId)
    await call(
      'PUT',
      `/v1/employees/${first}/private-profile/identifiers`,
      writerToken,
      {
        identifiers: [identifier({ value: '3174018888888888' })],
      },
    )

    const taken = await call(
      'PUT',
      `/v1/employees/${second}/private-profile/identifiers`,
      writerToken,
      { identifiers: [identifier({ value: '3174-0188-8888-8888' })] },
    )
    expect(taken.status).toBe(409)
    expect(taken.body).toMatchObject({ code: 'identifier_taken' })
    expect(JSON.stringify(taken.body)).not.toContain(first)
    expect(JSON.stringify(taken.body)).not.toContain('8888')

    const created = await saveProfile({}, second)
    await saveProfile({ birthPlace: 'B' }, second)
    const stale = await saveProfile({ version: created.body?.version }, second)
    expect(stale.status).toBe(409)
    expect(stale.body).toMatchObject({ code: 'stale_version' })

    const foreign = await addEmployee(gateway.otherTenantId)
    expect(
      (
        await call(
          'PUT',
          `/v1/employees/${foreign}/private-profile/identifiers`,
          otherTenantToken,
          {
            identifiers: [identifier({ value: '3174018888888888' })],
          },
        )
      ).status,
    ).toBe(200)
  })

  it('answers 422 for rules the DTO cannot judge', async () => {
    const cases: [string, object, string][] = [
      ['PUT', { birthDate: '2999-01-01' }, 'invalid_birth_date'],
      ['PUT', { nationalities: ['XX'] }, 'invalid_nationalities'],
      [
        'PUT',
        { maritalStatus: { system: 'id.marital-status', code: 'nope' } },
        'unknown_code',
      ],
      [
        'PUT',
        { maritalStatus: { system: 'id.bank', code: 'bca' } },
        'invalid_marital_status',
      ],
      [
        'PUT',
        { personalContacts: [{ system: 'phone', value: '0812' }] },
        'invalid_contacts',
      ],
      [
        'identifiers',
        { identifiers: [identifier({ value: '123' })] },
        'invalid_identifier_value',
      ],
      [
        'identifiers',
        { identifiers: [identifier(), identifier()] },
        'invalid_identifiers',
      ],
      [
        'identifiers',
        {
          identifiers: [
            identifier({ type: { system: 'id.bank', code: 'bca' } }),
          ],
        },
        'invalid_identifier_type',
      ],
      [
        'bank-accounts',
        { bankAccounts: [account({ isPrimary: false })] },
        'invalid_bank_accounts',
      ],
      [
        'bank-accounts',
        {
          bankAccounts: [
            account({ bank: { system: 'id.bank', code: 'nope' } }),
          ],
        },
        'unknown_code',
      ],
    ]
    for (const [route, body, code] of cases) {
      const url =
        route === 'PUT'
          ? `/v1/employees/${employeeId}/private-profile`
          : `/v1/employees/${employeeId}/private-profile/${route}`
      const reply = await call('PUT', url, writerToken, body)
      expect([JSON.stringify(body), reply.status, reply.body?.code]).toEqual([
        JSON.stringify(body),
        422,
        code,
      ])
    }
  })

  it('answers 400 for a malformed body', async () => {
    const base = `/v1/employees/${employeeId}/private-profile`
    for (const [url, bad] of [
      [base, { birthDate: '1990-02-30' }],
      [base, { nationalities: 'ID' }],
      [base, { personalContacts: [{ system: 'fax', value: 'x' }] }],
      [base, { addresses: [{ use: 'home' }] }],
      [base, { familyMembers: [{ name: { text: 'A' } }] }],
      [`${base}/identifiers`, {}],
      [`${base}/identifiers`, { identifiers: [{ system: 'id.nik' }] }],
      [
        `${base}/identifiers`,
        { identifiers: [identifier({ issuingCountry: 'id' })] },
      ],
      [`${base}/bank-accounts`, {}],
      [
        `${base}/bank-accounts`,
        { bankAccounts: [account({ currency: 'idr' })] },
      ],
    ] as const) {
      const reply = await call('PUT', url, writerToken, bad)
      expect([url, JSON.stringify(bad), reply.status]).toEqual([
        url,
        JSON.stringify(bad),
        400,
      ])
    }
  })

  it("answers the caller's own profile on /me, masked, and 404 for an account without an employee or a profile", async () => {
    const own = await addEmployee(gateway.tenantId)
    await call('PUT', `/v1/employees/${own}/private-profile`, writerToken, {
      birthDate: BIRTH_DATE,
    })
    await call(
      'PUT',
      `/v1/employees/${own}/private-profile/identifiers`,
      writerToken,
      {
        identifiers: [identifier({ value: '3174017777777777' })],
      },
    )
    const withProfile = await gateway.seedAndLogin(
      gateway.tenantId,
      'me-profile',
      [],
      own,
    )
    const withoutProfile = await gateway.seedAndLogin(
      gateway.tenantId,
      'me-empty',
      [],
      await addEmployee(gateway.tenantId),
    )
    const unlinked = await gateway.seedAndLogin(
      gateway.tenantId,
      'me-none',
      [],
      null,
    )
    const foreignLink = await gateway.seedAndLogin(
      gateway.otherTenantId,
      'me-foreign',
      [],
      own,
    )

    const mine = await call(
      'GET',
      '/v1/employees/me/private-profile',
      withProfile,
    )
    expect(mine.status).toBe(200)
    expect(mine.body).toMatchObject({
      employee_id: own,
      birth_date: BIRTH_DATE,
      identifiers: [{ value_masked: '************7777' }],
    })
    expect(JSON.stringify(mine.body)).not.toContain('3174017777777777')
    expect(
      (await call('GET', '/v1/employees/me/private-profile', withoutProfile))
        .body,
    ).toMatchObject({ code: 'private_profile_not_found' })
    expect(
      (await call('GET', '/v1/employees/me/private-profile', unlinked)).body,
    ).toMatchObject({ code: 'employee_not_found' })
    expect(
      (await call('GET', '/v1/employees/me/private-profile', foreignLink))
        .status,
    ).toBe(404)
    expect(
      (await call('GET', `/v1/employees/${own}/private-profile`, withProfile))
        .status,
    ).toBe(403)
    expect(
      (
        await call(
          'PUT',
          `/v1/employees/${own}/private-profile`,
          withProfile,
          {},
        )
      ).status,
    ).toBe(403)
  })

  it('writes on a separated employee', async () => {
    const separated = await addEmployee(gateway.tenantId, 'separated')

    const reply = await saveProfile({ birthPlace: 'Final pay' }, separated)

    expect(reply.status).toBe(200)
    expect(reply.body?.birth_place).toBe('Final pay')
  })

  it('writes no log entry when data is only read, except the access log of the request', async () => {
    await saveProfile()
    const { written, restore } = captureLogs()
    try {
      const replies = [
        await call(
          'GET',
          `/v1/employees/${employeeId}/private-profile`,
          readerToken,
        ),
        await call(
          'GET',
          '/v1/employees/missing-id/private-profile',
          readerToken,
        ),
        await call(
          'GET',
          `/v1/employees/${employeeId}/private-profile/identifiers/passport`,
          revealToken,
        ),
      ]
      expect(replies.map((reply) => reply.status)).toEqual([200, 404, 404])
      await vi.waitFor(() =>
        expect(
          written.filter((entry) => entry.event === 'http_request'),
        ).toHaveLength(replies.length),
      )

      expect(written.filter((entry) => entry.event !== 'http_request')).toEqual(
        [],
      )
    } finally {
      restore()
    }
  })

  it('writes one log entry per write and per reveal, never holding a secret', async () => {
    const own = await addEmployee(gateway.tenantId)
    const { written, restore } = captureLogs()
    try {
      await call('PUT', `/v1/employees/${own}/private-profile`, writerToken, {
        birthDate: '1985-12-24',
        birthPlace: 'Rahasia Kota',
        reason: 'Alasan Rahasia',
      })
      await call(
        'PUT',
        `/v1/employees/${own}/private-profile/identifiers`,
        writerToken,
        {
          identifiers: [identifier({ value: '3174016666666666' })],
        },
      )
      await call(
        'PUT',
        `/v1/employees/${own}/private-profile/bank-accounts`,
        writerToken,
        {
          bankAccounts: [account({ accountNumber: '9876543210987' })],
        },
      )
      await call(
        'GET',
        `/v1/employees/${own}/private-profile/identifiers/id.nik`,
        revealToken,
      )
      await vi.waitFor(() =>
        expect(
          written.filter((entry) => entry.event === 'http_request'),
        ).toHaveLength(4),
      )

      for (const event of [
        'private_profile_save',
        'private_profile_identifiers_replace',
        'private_profile_bank_accounts_replace',
      ]) {
        expect(written.filter((entry) => entry.event === event)).toHaveLength(1)
      }
      const text = JSON.stringify(written)
      for (const secret of [
        '3174016666666666',
        '9876543210987',
        '1985',
        'Rahasia',
        'Siti Rahma',
      ]) {
        expect(text).not.toContain(secret)
      }
    } finally {
      restore()
    }
  })
})
