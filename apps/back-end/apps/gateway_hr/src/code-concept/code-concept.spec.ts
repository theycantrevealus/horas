import { Logger } from '@nestjs/common'
import { Types } from 'mongoose'
import { PERMISSIONS } from '@identity/permission'
import { BUNDLES } from '@workforce/concept/bundles'
import { createHrGateway, type HrGateway } from '../testing/hr-gateway'
import {
  createInMemoryWorkforce,
  type InMemoryWorkforce,
} from '../testing/in-memory-workforce'
import { CodeConceptManagementModule } from './code-concept-management.module'

describe('code concept endpoints (in-memory repositories)', () => {
  const workforce: InMemoryWorkforce = createInMemoryWorkforce()
  let gateway: HrGateway
  let call: HrGateway['call']
  let managerToken: string
  let readerToken: string
  let otherTenantToken: string

  const hire = {
    system: 'id.assignment-kind',
    code: 'hire',
    display: [
      { locale: 'id-ID', text: 'Pengangkatan' },
      { locale: 'en', text: 'Hire' },
    ],
  }

  /**
   * Creates a concept through the API as the manager.
   *
   * @param override - Fields that replace the defaults.
   * @param token - Token of the caller.
   * @returns The created concept.
   */
  async function createConcept(
    override: object = {},
    token = managerToken,
  ): Promise<Record<string, any>> {
    const reply = await call('POST', '/v1/code-concepts', token, {
      ...hire,
      ...override,
    })
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
      modules: [CodeConceptManagementModule],
      ...workforce.options,
    })
    call = gateway.call
    const { tenantId, otherTenantId, seedAndLogin } = gateway
    managerToken = await seedAndLogin(tenantId, 'manager', [
      PERMISSIONS.WORKFORCE_CODE_CONCEPT_READ,
      PERMISSIONS.WORKFORCE_CODE_CONCEPT_MANAGE,
    ])
    readerToken = await seedAndLogin(tenantId, 'reader', [
      PERMISSIONS.WORKFORCE_CODE_CONCEPT_READ,
    ])
    otherTenantToken = await seedAndLogin(otherTenantId, 'other-manager', [
      PERMISSIONS.WORKFORCE_CODE_CONCEPT_READ,
      PERMISSIONS.WORKFORCE_CODE_CONCEPT_MANAGE,
    ])
  })

  afterAll(async () => {
    await gateway.close()
  })

  it('refuses every route without a token (401) and without the permission (403)', async () => {
    const id = new Types.ObjectId().toHexString()

    expect((await call('GET', '/v1/code-concepts?system=id.x')).status).toBe(
      401,
    )
    expect(
      (await call('POST', '/v1/code-concepts', undefined, {})).status,
    ).toBe(401)
    expect(
      (
        await call('POST', '/v1/code-concepts/import', undefined, {
          bundle: 'id',
        })
      ).status,
    ).toBe(401)
    expect(
      (await call('POST', '/v1/code-concepts', readerToken, hire)).status,
    ).toBe(403)
    expect(
      (
        await call('PATCH', `/v1/code-concepts/${id}`, readerToken, {
          status: 'retired',
        })
      ).status,
    ).toBe(403)
    expect(
      (
        await call('POST', '/v1/code-concepts/import', readerToken, {
          bundle: 'id',
        })
      ).status,
    ).toBe(403)
    const none = await gateway.seedAndLogin(gateway.tenantId, 'nobody', [
      PERMISSIONS.WORKFORCE_FACILITY_READ,
    ])
    expect(
      (await call('GET', '/v1/code-concepts?system=id.x', none)).status,
    ).toBe(403)
  })

  it('creates, lists and edits a concept', async () => {
    const created = await createConcept({
      mappings: [{ system: 'employment-type', code: 'x' }],
      period: { start: '2026-01-01' },
    })
    expect(created).toMatchObject({
      tenant_id: gateway.tenantId,
      system: 'id.assignment-kind',
      code: 'hire',
      status: 'active',
      properties: {},
      mappings: [{ system: 'employment-type', code: 'x' }],
      period: { start: '2026-01-01', end: null },
    })
    expect(created).not.toHaveProperty('_id')
    expect(created).not.toHaveProperty('__v')

    const list = await call(
      'GET',
      '/v1/code-concepts?system=id.assignment-kind',
      readerToken,
    )
    expect(list.status).toBe(200)
    expect(list.body).toEqual([expect.objectContaining({ code: 'hire' })])

    const edited = await call(
      'PATCH',
      `/v1/code-concepts/${created.id}`,
      managerToken,
      {
        display: [{ locale: 'en', text: 'Hiring' }],
        period: null,
        status: 'retired',
        reason: 'Replaced',
      },
    )
    expect(edited.status).toBe(200)
    expect(edited.body).toMatchObject({
      display: [{ locale: 'en', text: 'Hiring' }],
      period: null,
      status: 'retired',
      code: 'hire',
    })
    const active = await call(
      'GET',
      '/v1/code-concepts?system=id.assignment-kind&status=active',
      readerToken,
    )
    expect(active.body).toEqual([])
  })

  it('lists a platform-wide concept, replaced by the tenant version of the same code', async () => {
    await workforce.codeConcepts.create({
      system: 'id.committee',
      code: 'komite_medik',
      display: [{ locale: 'en', text: 'Platform Medical Committee' }],
      properties: {},
      mappings: [],
      period: null,
      status: 'active',
    })

    const before = await call(
      'GET',
      '/v1/code-concepts?system=id.committee',
      readerToken,
    )
    expect(before.body).toEqual([
      expect.objectContaining({
        display: [{ locale: 'en', text: 'Platform Medical Committee' }],
      }),
    ])
    expect(before.body?.[0]).not.toHaveProperty('tenant_id')
    await createConcept({
      system: 'id.committee',
      code: 'komite_medik',
      display: [{ locale: 'en', text: 'Our Medical Committee' }],
    })

    const after = await call(
      'GET',
      '/v1/code-concepts?system=id.committee',
      readerToken,
    )
    expect(after.body).toHaveLength(1)
    expect(after.body?.[0]).toMatchObject({
      tenant_id: gateway.tenantId,
      display: [{ locale: 'en', text: 'Our Medical Committee' }],
    })
    const other = await call(
      'GET',
      '/v1/code-concepts?system=id.committee',
      otherTenantToken,
    )
    expect(other.body?.[0].display[0].text).toBe('Platform Medical Committee')
  })

  it("answers 404 when a platform-wide concept, another tenant's concept, a missing id or a malformed id is edited", async () => {
    const platform = await workforce.codeConcepts.create({
      system: 'id.committee-role',
      code: 'chair',
      display: [{ locale: 'en', text: 'Chair' }],
      properties: {},
      mappings: [],
      period: null,
      status: 'active',
    })
    const foreign = await createConcept(
      { code: 'foreign-only' },
      otherTenantToken,
    )

    for (const id of [
      platform.id,
      foreign.id,
      new Types.ObjectId().toHexString(),
      'not-an-id',
    ]) {
      const reply = await call(
        'PATCH',
        `/v1/code-concepts/${id}`,
        managerToken,
        { status: 'retired' },
      )
      expect(reply.status).toBe(404)
      expect(reply.body).toMatchObject({ code: 'code_concept_not_found' })
    }
  })

  it("lists only the signed-in tenant's concepts", async () => {
    await createConcept({ code: 'mine-only' })
    await createConcept({ code: 'theirs-only' }, otherTenantToken)

    const mine = await call(
      'GET',
      '/v1/code-concepts?system=id.assignment-kind',
      readerToken,
    )
    const theirs = await call(
      'GET',
      '/v1/code-concepts?system=id.assignment-kind',
      otherTenantToken,
    )

    const mineCodes = mine.body?.map(
      (concept: { code: string }) => concept.code,
    )
    expect(mineCodes).toContain('mine-only')
    expect(mineCodes).not.toContain('theirs-only')
    expect(
      theirs.body?.map((concept: { code: string }) => concept.code),
    ).toContain('theirs-only')
  })

  it('answers 409 for a duplicate and for a stale version', async () => {
    const created = await createConcept({ code: 'duplicate-me' })

    const duplicate = await call('POST', '/v1/code-concepts', managerToken, {
      ...hire,
      code: 'duplicate-me',
    })
    expect(duplicate.status).toBe(409)
    expect(duplicate.body).toMatchObject({ code: 'code_concept_exists' })

    await call('PATCH', `/v1/code-concepts/${created.id}`, managerToken, {
      status: 'retired',
    })
    const stale = await call(
      'PATCH',
      `/v1/code-concepts/${created.id}`,
      managerToken,
      {
        status: 'active',
        version: created.version,
      },
    )
    expect(stale.status).toBe(409)
    expect(stale.body).toMatchObject({ code: 'stale_version' })
  })

  it.each([
    ['system with capitals', { system: 'ID.Kind' }, 422, 'invalid_system'],
    ['code with capitals', { code: 'Hire' }, 422, 'invalid_code'],
    [
      'the same language twice',
      {
        display: [
          { locale: 'en', text: 'a' },
          { locale: 'EN', text: 'b' },
        ],
      },
      422,
      'invalid_display',
    ],
    [
      'nested properties',
      { properties: { a: { b: 1 } } },
      422,
      'invalid_properties',
    ],
    [
      'a licence type without its properties',
      { system: 'us.license-type', code: 'dea' },
      422,
      'invalid_properties',
    ],
    [
      'a period ending before it starts',
      { period: { start: '2026-05-01', end: '2026-04-30' } },
      422,
      'invalid_period',
    ],
    [
      'the same mapping twice',
      {
        mappings: [
          { system: 's', code: '1' },
          { system: 's', code: '1' },
        ],
      },
      422,
      'invalid_mappings',
    ],
    ['no display text', { display: [] }, 400, undefined],
    ['properties that are a list', { properties: [1, 2] }, 400, undefined],
    [
      'a period date that does not exist',
      { period: { start: '2026-02-30' } },
      400,
      undefined,
    ],
    [
      'a period date in the wrong format',
      { period: { start: '31/01/2026' } },
      400,
      undefined,
    ],
    [
      'eleven mappings',
      {
        mappings: Array.from({ length: 11 }, (_, i) => ({
          system: 's',
          code: `${i}`,
        })),
      },
      400,
      undefined,
    ],
  ])('rejects a create with %s', async (_name, override, status, code) => {
    const reply = await call('POST', '/v1/code-concepts', managerToken, {
      ...hire,
      code: 'bad-input',
      ...override,
    })

    expect(reply.status).toBe(status)
    if (code) {
      expect(reply.body).toMatchObject({ code })
    }
  })

  it('accepts the properties a known system needs, and any properties for an unknown system', async () => {
    const license = await call('POST', '/v1/code-concepts', managerToken, {
      system: 'us.license-type',
      code: 'state-license',
      display: [{ locale: 'en', text: 'State license' }],
      properties: {
        eligibility_role: 'registration',
        requires_expiry_date: true,
        location_specific: false,
      },
    })
    const unknown = await call('POST', '/v1/code-concepts', managerToken, {
      ...hire,
      system: 'id.something-new',
      code: 'free-form',
      properties: { anything: 'goes' },
    })

    expect(license.status).toBe(201)
    expect(unknown.status).toBe(201)
  })

  it('rejects an empty edit, and ignores system and code in an edit body', async () => {
    const created = await createConcept({ code: 'immutable' })

    const empty = await call(
      'PATCH',
      `/v1/code-concepts/${created.id}`,
      managerToken,
      {},
    )
    expect(empty.status).toBe(422)
    expect(empty.body).toMatchObject({ code: 'empty_update' })
    const onlyImmutable = await call(
      'PATCH',
      `/v1/code-concepts/${created.id}`,
      managerToken,
      {
        system: 'hacked.system',
        code: 'changed',
      },
    )
    expect(onlyImmutable.status).toBe(422)
    const list = await call(
      'GET',
      '/v1/code-concepts?system=id.assignment-kind',
      readerToken,
    )
    expect(
      list.body?.map((concept: { code: string }) => concept.code),
    ).toContain('immutable')
  })

  it('keeps the properties of a known system valid when it is edited', async () => {
    const created = await createConcept({
      system: 'id.unit-type',
      code: 'lab',
      properties: { clinical_default: true },
    })

    const broken = await call(
      'PATCH',
      `/v1/code-concepts/${created.id}`,
      managerToken,
      { properties: {} },
    )
    const fine = await call(
      'PATCH',
      `/v1/code-concepts/${created.id}`,
      managerToken,
      { properties: { clinical_default: false } },
    )

    expect(broken.status).toBe(422)
    expect(broken.body).toMatchObject({ code: 'invalid_properties' })
    expect(fine.status).toBe(200)
  })

  it.each(['', 'status=retired', 'system=', 'system=id.x&status=archived'])(
    'rejects the list query "%s" because the system is required and the status must be valid',
    async (query) => {
      expect(
        (await call('GET', `/v1/code-concepts?${query}`, readerToken)).status,
      ).toBe(400)
    },
  )

  describe('import', () => {
    it('copies the Indonesian bundle into the tenant, and does nothing the second time', async () => {
      const first = await call(
        'POST',
        '/v1/code-concepts/import',
        managerToken,
        { bundle: 'id' },
      )
      expect(first.status).toBe(200)
      // Earlier tests already created `hire` and `komite_medik` in this tenant: those are skipped.
      expect(first.body).toMatchObject({ bundle: 'id', skipped: 2 })
      expect(first.body?.created + first.body?.skipped).toBe(BUNDLES.id.length)

      const second = await call(
        'POST',
        '/v1/code-concepts/import',
        managerToken,
        { bundle: 'id' },
      )
      expect(second.body).toEqual({
        bundle: 'id',
        created: 0,
        skipped: BUNDLES.id.length,
      })
      const licenses = await call(
        'GET',
        '/v1/code-concepts?system=id.license-type',
        readerToken,
      )
      expect(
        licenses.body?.map((concept: { code: string }) => concept.code),
      ).toEqual(['sip', 'str'])
      expect(licenses.body?.[1].properties).toMatchObject({
        eligibility_role: 'registration',
      })
    })

    it('does not touch another tenant, and keeps an edit made after the first import', async () => {
      const units = await call(
        'GET',
        '/v1/code-concepts?system=id.unit-type',
        managerToken,
      )
      const ward = units.body?.find(
        (concept: { code: string }) => concept.code === 'ward',
      )
      await call('PATCH', `/v1/code-concepts/${ward.id}`, managerToken, {
        status: 'retired',
      })

      await call('POST', '/v1/code-concepts/import', managerToken, {
        bundle: 'id',
      })

      const after = await call(
        'GET',
        '/v1/code-concepts?system=id.unit-type&status=retired',
        managerToken,
      )
      expect(
        after.body?.map((concept: { code: string }) => concept.code),
      ).toEqual(['ward'])
      const other = await call(
        'GET',
        '/v1/code-concepts?system=id.unit-type',
        otherTenantToken,
      )
      expect(other.body).toEqual([])
    })

    it.each([
      { bundle: 'xx' },
      { bundle: 'constructor' },
      { bundle: '__proto__' },
    ])('answers 422 for the unknown bundle %o', async (body) => {
      const reply = await call(
        'POST',
        '/v1/code-concepts/import',
        managerToken,
        body,
      )

      expect(reply.status).toBe(422)
      expect(reply.body).toMatchObject({ code: 'unknown_bundle' })
    })

    it('answers 400 without a bundle name', async () => {
      expect(
        (await call('POST', '/v1/code-concepts/import', managerToken, {}))
          .status,
      ).toBe(400)
    })
  })

  it('writes no log entry when data is only read, except the access log of the request', async () => {
    const { written, restore } = captureLogs()
    try {
      const replies = [
        await call('GET', '/v1/code-concepts?system=id.unit-type', readerToken),
        await call(
          'GET',
          '/v1/code-concepts?system=id.does-not-exist',
          readerToken,
        ),
        await call('GET', '/v1/code-concepts', readerToken),
      ]
      expect(replies.map((reply) => reply.status)).toEqual([200, 200, 400])
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

  it('logs one entry per write, without values, and counts for an import', async () => {
    const { written, restore } = captureLogs()
    try {
      await call('POST', '/v1/code-concepts', managerToken, {
        ...hire,
        code: 'log-check',
        display: [{ locale: 'en', text: 'Rahasia Teks' }],
      })
      await call('POST', '/v1/code-concepts/import', managerToken, {
        bundle: 'id',
      })
      await vi.waitFor(() =>
        expect(
          written.filter((entry) => entry.event === 'http_request'),
        ).toHaveLength(2),
      )

      expect(
        written.filter((entry) => entry.event === 'code_concept_create'),
      ).toHaveLength(1)
      const imports = written.filter(
        (entry) => entry.event === 'code_concept_import',
      )
      expect(imports).toHaveLength(1)
      expect(imports[0]).toMatchObject({
        outcome: 'success',
        created: expect.any(Number),
        skipped: expect.any(Number),
      })
      expect(JSON.stringify(written)).not.toContain('Rahasia')
    } finally {
      restore()
    }
  })
})
