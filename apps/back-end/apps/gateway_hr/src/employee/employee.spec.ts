import { Logger } from '@nestjs/common'
import { Types } from 'mongoose'
import { PERMISSIONS } from '@identity/permission'
import { createHrGateway, type HrGateway } from '../testing/hr-gateway'
import {
  createInMemoryWorkforce,
  type InMemoryWorkforce,
} from '../testing/in-memory-workforce'
import { EmployeeManagementModule } from './employee-management.module'

describe('employee endpoints (in-memory repositories)', () => {
  const workforce: InMemoryWorkforce = createInMemoryWorkforce()
  let gateway: HrGateway
  let call: HrGateway['call']
  let writerToken: string
  let readerToken: string
  let statusToken: string
  let otherTenantToken: string
  let counter = 0

  const doctor = { system: 'id.profession', code: 'dokter_spesialis' }

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
    await workforce.codeConcepts.create({
      system,
      code,
      display: [{ locale: 'en', text: code }],
      properties,
      mappings: [],
      period: null,
      status,
    })
  }

  /**
   * Registers an employee through the API as the writer; the defaults make a clinical specialist.
   *
   * @param override - Fields that replace the defaults.
   * @param token - Token of the caller.
   * @returns The reply.
   */
  function register(override: object = {}, token = writerToken) {
    counter += 1
    return call('POST', '/v1/employees', token, {
      employeeNumber: `rs-${String(counter).padStart(4, '0')}`,
      name: { text: `dr. Nama ${counter}`, family: 'Nama', prefix: ['dr.'] },
      workforceCategory: {
        system: 'id.workforce-category',
        code: 'tenaga_medis',
      },
      profession: doctor,
      hireDate: '2026-01-05',
      ...override,
    })
  }

  /**
   * Registers an employee and expects success.
   *
   * @param override - Fields that replace the defaults.
   * @param token - Token of the caller.
   * @returns The created employee.
   */
  async function create(
    override: object = {},
    token = writerToken,
  ): Promise<Record<string, any>> {
    const reply = await register(override, token)
    expect(reply.status).toBe(201)
    return reply.body as Record<string, any>
  }

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
      modules: [EmployeeManagementModule],
      ...workforce.options,
    })
    call = gateway.call
    const { tenantId, otherTenantId, seedAndLogin } = gateway
    writerToken = await seedAndLogin(tenantId, 'writer', [
      PERMISSIONS.WORKFORCE_EMPLOYEE_READ,
      PERMISSIONS.WORKFORCE_EMPLOYEE_WRITE,
    ])
    statusToken = await seedAndLogin(tenantId, 'status', [
      PERMISSIONS.WORKFORCE_EMPLOYEE_STATUS,
    ])
    readerToken = await seedAndLogin(tenantId, 'reader', [
      PERMISSIONS.WORKFORCE_EMPLOYEE_READ,
    ])
    otherTenantToken = await seedAndLogin(otherTenantId, 'other-writer', [
      PERMISSIONS.WORKFORCE_EMPLOYEE_READ,
      PERMISSIONS.WORKFORCE_EMPLOYEE_WRITE,
      PERMISSIONS.WORKFORCE_EMPLOYEE_STATUS,
    ])
    await addConcept('id.workforce-category', 'tenaga_medis', {
      is_clinical: true,
    })
    await addConcept('id.workforce-category', 'non_klinis', {
      is_clinical: false,
    })
    await addConcept('id.profession', 'dokter_spesialis', {
      workforce_category: 'tenaga_medis',
    })
    await addConcept('id.profession', 'akuntan', {
      workforce_category: 'non_klinis',
    })
    await addConcept('id.specialty', 'penyakit_dalam')
    await addConcept('id.specialty', 'lama', {}, 'retired')
  })

  afterAll(async () => {
    await gateway.close()
  })

  it('refuses every route without a token (401) and without the permission (403)', async () => {
    const id = new Types.ObjectId().toHexString()
    const routes: ['GET' | 'POST' | 'PATCH', string, object | undefined][] = [
      ['GET', '/v1/employees', undefined],
      ['GET', '/v1/employees/me', undefined],
      ['GET', `/v1/employees/${id}`, undefined],
      ['POST', '/v1/employees', {}],
      ['PATCH', `/v1/employees/${id}`, {}],
      ['POST', `/v1/employees/${id}/status`, { status: 'active' }],
    ]
    for (const [method, url, payload] of routes) {
      expect((await call(method, url, undefined, payload)).status).toBe(401)
    }
    expect((await call('POST', '/v1/employees', readerToken, {})).status).toBe(
      403,
    )
    expect(
      (await call('PATCH', `/v1/employees/${id}`, readerToken, {})).status,
    ).toBe(403)
    expect(
      (
        await call('POST', `/v1/employees/${id}/status`, writerToken, {
          status: 'active',
        })
      ).status,
    ).toBe(403)
    expect((await call('GET', '/v1/employees', statusToken)).status).toBe(403)
    expect((await call('GET', `/v1/employees/${id}`, statusToken)).status).toBe(
      403,
    )
  })

  it('registers, reads, lists and edits an employee', async () => {
    const created = await create({
      administrativeGender: 'female',
      specialties: [
        {
          coding: { system: 'id.specialty', code: 'penyakit_dalam' },
          is_primary: true,
        },
      ],
      practitionerIds: [{ system: 'id.satusehat-ihs', value: 'N-REG-1' }],
      workContacts: [
        { system: 'email', value: 'Dokter@RS.id', is_primary: true },
        { system: 'phone', value: '+628121234567' },
      ],
      preferredLanguage: 'id-ID',
      otherNames: [{ use: 'usual', text: 'Dokter Nama' }],
    })
    expect(created).toMatchObject({
      employee_number: expect.stringMatching(/^RS-\d{4}$/),
      workforce_category: { code: 'tenaga_medis' },
      is_clinical: true,
      profession: doctor,
      employment_status: 'onboarding',
      employment_status_since: '2026-01-05',
      original_hire_date: '2026-01-05',
      administrative_gender: { code: 'female' },
      work_contacts: [
        {
          system: 'email',
          value: 'dokter@rs.id',
          use: 'work',
          is_primary: true,
        },
        { system: 'phone', value: '+628121234567', use: 'work' },
      ],
      current_employment: null,
      primary_assignment: null,
      photo: null,
    })
    expect(created).not.toHaveProperty('_id')
    expect(created).not.toHaveProperty('__v')
    expect(JSON.stringify(created)).not.toMatch(/nik|bank|birth/i)

    const read = await call('GET', `/v1/employees/${created.id}`, readerToken)
    expect(read.status).toBe(200)
    expect(read.body).toMatchObject({ id: created.id })
    const list = await call('GET', '/v1/employees?limit=100', readerToken)
    expect(list.status).toBe(200)
    expect(list.body?.data.map((item: { id: string }) => item.id)).toContain(
      created.id,
    )

    const edited = await call(
      'PATCH',
      `/v1/employees/${created.id}`,
      writerToken,
      {
        name: { text: 'dr. Nama Baru' },
        preferredLanguage: 'en',
        reason: 'Corrected',
      },
    )
    expect(edited.status).toBe(200)
    expect(edited.body).toMatchObject({
      display_name: 'dr. Nama Baru',
      preferred_language: 'en',
      version: created.version + 1,
    })
  })

  it('answers 404 employee_not_found for malformed, missing and foreign ids on every id route', async () => {
    const created = await create()
    const missing = new Types.ObjectId().toHexString()

    for (const id of ['missing-id', missing]) {
      expect(
        (await call('GET', `/v1/employees/${id}`, readerToken)).body,
      ).toMatchObject({ code: 'employee_not_found' })
    }
    const replies = await Promise.all([
      call('GET', `/v1/employees/${created.id}`, otherTenantToken),
      call('PATCH', `/v1/employees/${created.id}`, otherTenantToken, {
        preferredLanguage: 'en',
      }),
      call('POST', `/v1/employees/${created.id}/status`, otherTenantToken, {
        status: 'active',
      }),
      call('PATCH', '/v1/employees/missing-id', writerToken, {
        preferredLanguage: 'en',
      }),
    ])
    for (const reply of replies) {
      expect(reply.status).toBe(404)
      expect(reply.body).toMatchObject({ code: 'employee_not_found' })
    }
  })

  it('answers 409 for a duplicate number in any letter case and for a practitioner id of another employee', async () => {
    const first = await create({
      employeeNumber: 'dup-1',
      practitionerIds: [{ system: 'id.satusehat-ihs', value: 'N-DUP' }],
    })

    const sameNumber = await register({ employeeNumber: 'DUP-1' })
    const sameId = await register({
      practitionerIds: [{ system: 'id.satusehat-ihs', value: 'N-DUP' }],
    })

    expect(first.employee_number).toBe('DUP-1')
    expect(sameNumber.status).toBe(409)
    expect(sameNumber.body).toMatchObject({ code: 'employee_exists' })
    expect(sameId.status).toBe(409)
    expect(sameId.body).toMatchObject({ code: 'practitioner_id_taken' })
    expect(
      (await register({ employeeNumber: 'dup-1' }, otherTenantToken)).status,
    ).toBe(201)
  })

  it('answers 422 for clinical rules, codes, dates and lists the DTO cannot judge', async () => {
    const cases: [object, string][] = [
      [{ profession: null }, 'profession_required'],
      [
        { profession: { system: 'id.profession', code: 'akuntan' } },
        'profession_category_mismatch',
      ],
      [
        { profession: { system: 'id.profession', code: 'nope' } },
        'unknown_code',
      ],
      [
        {
          workforceCategory: { system: 'id.workforce-category', code: 'nope' },
        },
        'unknown_code',
      ],
      [
        {
          workforceCategory: {
            system: 'id.profession',
            code: 'dokter_spesialis',
          },
        },
        'invalid_category',
      ],
      [
        {
          specialties: [
            { coding: { system: 'id.specialty', code: 'penyakit_dalam' } },
          ],
        },
        'invalid_specialties',
      ],
      [
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
      [{ hireDate: '1949-01-01' }, 'invalid_hire_date'],
      [{ employeeNumber: 'bad number' }, 'invalid_employee_number'],
      [{ name: { text: '   ' } }, 'invalid_name'],
      [{ otherNames: [{ text: 'no use' }] }, 'invalid_other_names'],
      [{ preferredLanguage: 'not a tag' }, 'invalid_language'],
      [
        { workContacts: [{ system: 'phone', value: '0812' }] },
        'invalid_contacts',
      ],
      [
        {
          practitionerIds: [
            { system: 's', value: '1' },
            { system: 's', value: '2' },
          ],
        },
        'invalid_practitioner_ids',
      ],
    ]
    for (const [override, code] of cases) {
      const reply = await register(override)
      expect([
        JSON.stringify(override),
        reply.status,
        reply.body?.code,
      ]).toEqual([JSON.stringify(override), 422, code])
    }
    const staff = await register({
      workforceCategory: {
        system: 'id.workforce-category',
        code: 'non_klinis',
      },
      profession: null,
      specialties: [
        {
          coding: { system: 'id.specialty', code: 'penyakit_dalam' },
          is_primary: true,
        },
      ],
    })
    expect(staff.body).toMatchObject({ code: 'specialties_not_allowed' })
  })

  it('answers 400 for a malformed body, query or id', async () => {
    const base = {
      employeeNumber: 'valid-1',
      name: { text: 'Valid' },
      workforceCategory: {
        system: 'id.workforce-category',
        code: 'non_klinis',
      },
      hireDate: '2026-01-05',
    }
    for (const bad of [
      {},
      { ...base, employeeNumber: undefined },
      { ...base, name: undefined },
      { ...base, workforceCategory: undefined },
      { ...base, hireDate: '2026-02-30' },
      { ...base, administrativeGender: 'robot' },
      { ...base, name: { text: 5 } },
      { ...base, name: { text: 'A', use: 'nick' } },
      { ...base, workContacts: [{ system: 'fax', value: 'x' }] },
      { ...base, specialties: [{ is_primary: true }] },
    ]) {
      const reply = await call('POST', '/v1/employees', writerToken, bad)
      expect([JSON.stringify(bad), reply.status]).toEqual([
        JSON.stringify(bad),
        400,
      ])
    }
    for (const query of [
      'limit=0',
      'limit=101',
      'limit=abc',
      'offset=-1',
      'status=gone',
      'isClinical=maybe',
      'unitId=nope',
    ]) {
      expect(
        (await call('GET', `/v1/employees?${query}`, readerToken)).status,
      ).toBe(400)
    }
    expect(
      (
        await call(
          'POST',
          `/v1/employees/${new Types.ObjectId().toHexString()}/status`,
          statusToken,
          {
            status: 'retired',
          },
        )
      ).status,
    ).toBe(400)
  })

  it('ignores the number, status, separation date and summaries in a PATCH, and answers 422 empty_update when nothing else is sent', async () => {
    const created = await create()

    const ignored = await call(
      'PATCH',
      `/v1/employees/${created.id}`,
      writerToken,
      {
        preferredLanguage: 'en',
        employeeNumber: 'HACKED',
        employment_status: 'active',
        separation_date: '2020-01-01',
        is_clinical: false,
        current_employment: { contract_id: 'x' },
      },
    )
    expect(ignored.status).toBe(200)
    expect(ignored.body).toMatchObject({
      employee_number: created.employee_number,
      employment_status: 'onboarding',
      separation_date: null,
      is_clinical: true,
      current_employment: null,
    })

    const empty = await call(
      'PATCH',
      `/v1/employees/${created.id}`,
      writerToken,
      {
        employeeNumber: 'HACKED',
      },
    )
    expect(empty.status).toBe(422)
    expect(empty.body).toMatchObject({ code: 'empty_update' })
  })

  it('corrects the category only while onboarding, and refuses it after', async () => {
    const created = await create()
    const fix = {
      workforceCategory: {
        system: 'id.workforce-category',
        code: 'non_klinis',
      },
      profession: { system: 'id.profession', code: 'akuntan' },
    }

    const fixed = await call(
      'PATCH',
      `/v1/employees/${created.id}`,
      writerToken,
      fix,
    )
    expect(fixed.body).toMatchObject({
      workforce_category: { code: 'non_klinis' },
      is_clinical: false,
      profession: { code: 'akuntan' },
    })

    await call('POST', `/v1/employees/${created.id}/status`, statusToken, {
      status: 'active',
    })
    const late = await call(
      'PATCH',
      `/v1/employees/${created.id}`,
      writerToken,
      {
        hireDate: '2026-02-01',
      },
    )
    expect(late.status).toBe(422)
    expect(late.body).toMatchObject({ code: 'employee_started' })
  })

  it('answers 409 stale_version for an old version', async () => {
    const created = await create()
    await call('PATCH', `/v1/employees/${created.id}`, writerToken, {
      preferredLanguage: 'en',
    })

    const stale = await call(
      'PATCH',
      `/v1/employees/${created.id}`,
      writerToken,
      {
        preferredLanguage: 'id',
        version: created.version,
      },
    )

    expect(stale.status).toBe(409)
    expect(stale.body).toMatchObject({ code: 'stale_version' })
  })

  it('changes the status along the allowed transitions and keeps separated final', async () => {
    const created = await create()
    const change = (status: string, extra: object = {}) =>
      call('POST', `/v1/employees/${created.id}/status`, statusToken, {
        status,
        ...extra,
      })

    const probation = await change('probation', { effectiveDate: '2026-01-06' })
    expect(probation.status).toBe(201)
    expect(probation.body).toMatchObject({
      employment_status: 'probation',
      employment_status_since: '2026-01-06',
    })
    expect((await change('active')).body).toMatchObject({
      employment_status: 'active',
    })
    expect((await change('suspended')).body).toMatchObject({
      code: 'reason_required',
    })
    expect(
      (await change('suspended', { reason: 'Investigation' })).body,
    ).toMatchObject({ employment_status: 'suspended' })
    expect((await change('active')).status).toBe(201)
    const separated = await change('separated', {
      reason: 'Resigned',
      effectiveDate: day(),
    })
    expect(separated.body).toMatchObject({
      employment_status: 'separated',
      separation_date: day(),
    })

    const again = await change('active')
    expect(again.status).toBe(422)
    expect(again.body).toMatchObject({ code: 'invalid_transition' })
    const edit = await call(
      'PATCH',
      `/v1/employees/${created.id}`,
      writerToken,
      {
        preferredLanguage: 'en',
      },
    )
    expect(edit.body).toMatchObject({ code: 'employee_separated' })
  })

  it('answers 422 for a status date before the current status or after tomorrow, and 409 for a stale version', async () => {
    const created = await create({ hireDate: '2026-01-05' })
    const change = (extra: object) =>
      call('POST', `/v1/employees/${created.id}/status`, statusToken, {
        status: 'active',
        ...extra,
      })

    expect((await change({ effectiveDate: '2026-01-04' })).body).toMatchObject({
      code: 'effective_date_out_of_range',
    })
    expect((await change({ effectiveDate: day(3) })).body).toMatchObject({
      code: 'effective_date_out_of_range',
    })
    expect((await change({ effectiveDate: '2026-02-30' })).status).toBe(400)
    const stale = await change({ version: created.version + 5 })
    expect(stale.status).toBe(409)
    expect(stale.body).toMatchObject({ code: 'stale_version' })
  })

  it('searches by name, number, status, category and clinical flag, with paging', async () => {
    const a = await create({
      employeeNumber: 'srch-1',
      name: { text: 'Aaa Cari' },
    })
    await create({
      employeeNumber: 'srch-2',
      name: { text: 'Bbb Cari' },
      workforceCategory: {
        system: 'id.workforce-category',
        code: 'non_klinis',
      },
      profession: null,
    })
    await call('POST', `/v1/employees/${a.id}/status`, statusToken, {
      status: 'active',
    })

    const codes = async (query: string) =>
      (
        (await call('GET', `/v1/employees?${query}`, readerToken)).body?.data ??
        []
      ).map((row: { employee_number: string }) => row.employee_number)
    expect(await codes('name=cari')).toEqual(['SRCH-1', 'SRCH-2'])
    expect(await codes('employeeNumber=srch-2')).toEqual(['SRCH-2'])
    expect(await codes('employeeNumber=SRCH&status=active')).toEqual(['SRCH-1'])
    expect(await codes('name=cari&workforceCategory=non_klinis')).toEqual([
      'SRCH-2',
    ])
    expect(await codes('name=cari&isClinical=false')).toEqual(['SRCH-2'])
    expect(await codes('name=cari&limit=1&offset=1')).toEqual(['SRCH-2'])
    expect(
      await codes(`name=cari&unitId=${new Types.ObjectId().toHexString()}`),
    ).toEqual([])
    expect(await codes('name=no-such-person')).toEqual([])
  })

  it("answers the caller's own record on /me, and 404 for an account without an employee", async () => {
    const mine = await create({ employeeNumber: 'me-1' })
    const linkedToken = await gateway.seedAndLogin(
      gateway.tenantId,
      'linked',
      [],
      mine.id,
    )
    const unlinkedToken = await gateway.seedAndLogin(
      gateway.tenantId,
      'unlinked',
      [],
      null,
    )
    const foreignLinked = await gateway.seedAndLogin(
      gateway.otherTenantId,
      'foreign-linked',
      [],
      mine.id,
    )

    const own = await call('GET', '/v1/employees/me', linkedToken)
    expect(own.status).toBe(200)
    expect(own.body).toMatchObject({ id: mine.id, employee_number: 'ME-1' })
    const none = await call('GET', '/v1/employees/me', unlinkedToken)
    expect(none.status).toBe(404)
    expect(none.body).toMatchObject({ code: 'employee_not_found' })
    expect((await call('GET', '/v1/employees/me', foreignLinked)).status).toBe(
      404,
    )
    expect((await call('GET', '/v1/employees', linkedToken)).status).toBe(403)
  })

  it('writes no log entry when data is only read, except the access log of the request', async () => {
    const created = await create()
    const { written, restore } = captureLogs()
    try {
      const replies = [
        await call('GET', '/v1/employees', readerToken),
        await call('GET', `/v1/employees/${created.id}`, readerToken),
        await call('GET', '/v1/employees/missing-id', readerToken),
      ]
      expect(replies.map((reply) => reply.status)).toEqual([200, 200, 404])
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

  it("logs one entry per write, without the employee's values", async () => {
    const { written, restore } = captureLogs()
    try {
      const created = await register({
        employeeNumber: 'log-check',
        name: { text: 'Nama Rahasia Lengkap' },
        workContacts: [{ system: 'email', value: 'rahasia@rs.id' }],
        practitionerIds: [{ system: 'id.satusehat-ihs', value: 'N-9998887' }],
      })
      await call(
        'POST',
        `/v1/employees/${created.body?.id}/status`,
        statusToken,
        {
          status: 'separated',
          reason: 'Alasan Rahasia',
        },
      )
      await vi.waitFor(() =>
        expect(
          written.filter((entry) => entry.event === 'http_request'),
        ).toHaveLength(2),
      )

      expect(
        written.filter((entry) => entry.event === 'employee_create'),
      ).toHaveLength(1)
      expect(
        written.filter((entry) => entry.event === 'employee_status_change'),
      ).toHaveLength(1)
      const text = JSON.stringify(written)
      for (const secret of ['Rahasia', 'LOG-CHECK', 'log-check', 'N-9998887']) {
        expect(text).not.toContain(secret)
      }
    } finally {
      restore()
    }
  })
})

/**
 * Today's date in UTC, as the server reads it.
 *
 * @param days - Days to add.
 * @returns The date as `YYYY-MM-DD`.
 */
function day(days = 0): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)
}
