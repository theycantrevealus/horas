import { Logger } from '@nestjs/common'
import { Types } from 'mongoose'
import { PERMISSIONS } from '@identity/permission'
import { FacilityManagementModule } from '../facility/facility-management.module'
import { OrganizationManagementModule } from '../organization/organization-management.module'
import { createHrGateway, type HrGateway } from '../testing/hr-gateway'
import {
  createInMemoryWorkforce,
  type InMemoryWorkforce,
} from '../testing/in-memory-workforce'
import { UnitManagementModule } from '../unit/unit-management.module'
import { PositionManagementModule } from './position-management.module'

describe('position endpoints (in-memory repositories)', () => {
  const workforce: InMemoryWorkforce = createInMemoryWorkforce()
  let gateway: HrGateway
  let call: HrGateway['call']
  let writerToken: string
  let readerToken: string
  let otherTenantToken: string
  let unitId: string

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
   * Creates an organization, a facility and a unit through the API.
   *
   * @param code - Base code for the three records.
   * @param token - Token of the caller.
   * @returns The created unit.
   */
  async function createUnit(
    code: string,
    token = writerToken,
  ): Promise<Record<string, any>> {
    const organization = (
      await call('POST', '/v1/organizations', token, {
        code: `org-${code}`,
        legalName: `PT ${code}`,
        country: 'ID',
        currency: 'IDR',
      })
    ).body as Record<string, any>
    const facility = (
      await call('POST', '/v1/facilities', token, {
        organizationId: organization.id,
        code: `rs-${code}`,
        name: [{ locale: 'id-ID', text: `RS ${code}` }],
        timezone: 'Asia/Jakarta',
      })
    ).body as Record<string, any>
    const reply = await call('POST', '/v1/units', token, {
      facilityId: facility.id,
      code: `unit-${code}`,
      name: [{ locale: 'id-ID', text: `Unit ${code}` }],
      type: { system: 'id.unit-type', code: 'ward' },
    })
    expect(reply.status).toBe(201)
    return reply.body as Record<string, any>
  }

  /**
   * Creates a position through the API as the writer.
   *
   * @param code - Position code.
   * @param override - Fields that replace the defaults.
   * @returns The created position.
   */
  async function createPosition(
    code: string,
    override: object = {},
  ): Promise<Record<string, any>> {
    const reply = await call('POST', '/v1/positions', writerToken, {
      unitId,
      code,
      title: [{ locale: 'id-ID', text: `Jabatan ${code}` }],
      kind: 'functional',
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
      modules: [
        OrganizationManagementModule,
        FacilityManagementModule,
        UnitManagementModule,
        PositionManagementModule,
      ],
      ...workforce.options,
    })
    call = gateway.call
    const { tenantId, otherTenantId, seedAndLogin } = gateway
    const all = [
      PERMISSIONS.WORKFORCE_ORGANIZATION_READ,
      PERMISSIONS.WORKFORCE_ORGANIZATION_WRITE,
      PERMISSIONS.WORKFORCE_FACILITY_READ,
      PERMISSIONS.WORKFORCE_FACILITY_WRITE,
      PERMISSIONS.WORKFORCE_UNIT_READ,
      PERMISSIONS.WORKFORCE_UNIT_WRITE,
      PERMISSIONS.WORKFORCE_POSITION_READ,
      PERMISSIONS.WORKFORCE_POSITION_WRITE,
    ]
    writerToken = await seedAndLogin(tenantId, 'writer', all)
    readerToken = await seedAndLogin(tenantId, 'reader', [
      PERMISSIONS.WORKFORCE_POSITION_READ,
    ])
    otherTenantToken = await seedAndLogin(otherTenantId, 'other-writer', all)
    await addConcept('id.unit-type', 'ward', { clinical_default: true })
    await addConcept('id.profession', 'perawat', {
      workforce_category: 'tenaga_keperawatan',
    })
    await addConcept('id.profession', 'lama', {}, 'retired')
    await addConcept('rs.job-grade', 'g5')
    await addConcept('rs.job-grade', 'g6', {}, 'retired')
    unitId = (await createUnit('sehat')).id
  })

  afterAll(async () => {
    await gateway.close()
  })

  it('refuses every route without a token (401) and without the permission (403)', async () => {
    const id = new Types.ObjectId().toHexString()
    const routes: ['GET' | 'POST' | 'PATCH', string, object | undefined][] = [
      ['GET', `/v1/positions?unitId=${unitId}`, undefined],
      ['GET', `/v1/positions/${id}`, undefined],
      ['POST', '/v1/positions', {}],
      ['PATCH', `/v1/positions/${id}`, {}],
      ['POST', `/v1/positions/${id}/close`, {}],
    ]
    for (const [method, url, payload] of routes) {
      expect((await call(method, url, undefined, payload)).status).toBe(401)
    }
    for (const [method, url, payload] of routes.filter(
      ([method]) => method !== 'GET',
    )) {
      expect((await call(method, url, readerToken, payload)).status).toBe(403)
    }
    const noPositionPermission = await gateway.seedAndLogin(
      gateway.tenantId,
      'unit-only',
      [PERMISSIONS.WORKFORCE_UNIT_READ],
    )
    expect(
      (
        await call(
          'GET',
          `/v1/positions?unitId=${unitId}`,
          noPositionPermission,
        )
      ).status,
    ).toBe(403)
  })

  it('creates, reads, lists and edits a position', async () => {
    const created = await createPosition('perawat-icu', {
      allowedProfessions: [{ system: 'id.profession', code: 'perawat' }],
      grade: { system: 'rs.job-grade', code: 'g5' },
      budgetedHeadcount: 12,
      startDate: '2026-01-05',
    })
    expect(created).toMatchObject({
      unit_id: unitId,
      code: 'perawat-icu',
      kind: 'functional',
      is_head_of_unit: false,
      allowed_professions: [{ system: 'id.profession', code: 'perawat' }],
      grade: { system: 'rs.job-grade', code: 'g5' },
      budgeted_headcount: 12,
      job_description: null,
      period: { start: '2026-01-05', end: null },
      status: 'active',
    })
    expect(created).not.toHaveProperty('_id')
    expect(created).not.toHaveProperty('__v')

    const read = await call('GET', `/v1/positions/${created.id}`, readerToken)
    expect(read.status).toBe(200)
    expect(read.body).toMatchObject({ id: created.id, code: 'perawat-icu' })
    const list = await call(
      'GET',
      `/v1/positions?unitId=${unitId}&limit=100`,
      readerToken,
    )
    expect(list.status).toBe(200)
    expect(
      list.body?.data.map((item: { code: string }) => item.code),
    ).toContain('perawat-icu')

    const edited = await call(
      'PATCH',
      `/v1/positions/${created.id}`,
      writerToken,
      {
        title: [{ locale: 'en', text: 'ICU Nurse' }],
        budgetedHeadcount: 8,
        grade: null,
        reason: 'Budget cut',
      },
    )
    expect(edited.status).toBe(200)
    expect(edited.body).toMatchObject({
      code: 'perawat-icu',
      budgeted_headcount: 8,
      grade: null,
      version: created.version + 1,
    })
  })

  it('answers 404 position_not_found for malformed, missing and foreign ids on every id route', async () => {
    const created = await createPosition('private-pos')
    const missing = new Types.ObjectId().toHexString()

    for (const id of ['missing-id', missing]) {
      expect(
        (await call('GET', `/v1/positions/${id}`, readerToken)).body,
      ).toMatchObject({ code: 'position_not_found' })
    }
    const replies = await Promise.all([
      call('GET', `/v1/positions/${created.id}`, otherTenantToken),
      call('PATCH', `/v1/positions/${created.id}`, otherTenantToken, {
        budgetedHeadcount: 2,
      }),
      call('POST', `/v1/positions/${created.id}/close`, otherTenantToken, {}),
      call('PATCH', '/v1/positions/missing-id', writerToken, {
        budgetedHeadcount: 2,
      }),
    ])
    for (const reply of replies) {
      expect(reply.status).toBe(404)
      expect(reply.body).toMatchObject({ code: 'position_not_found' })
    }
  })

  it('answers 422 for a foreign or missing unit without telling which, and for a closed unit', async () => {
    const foreignUnit = await createUnit('asing', otherTenantToken)
    const closedUnit = await createUnit('tutup')
    await call('POST', `/v1/units/${closedUnit.id}/close`, writerToken, {})

    for (const id of [foreignUnit.id, new Types.ObjectId().toHexString()]) {
      const reply = await call('POST', '/v1/positions', writerToken, {
        unitId: id,
        code: 'x-pos',
        title: [{ locale: 'en', text: 'X' }],
        kind: 'functional',
      })
      expect(reply.status).toBe(422)
      expect(reply.body).toMatchObject({ code: 'unit_not_found' })
    }
    const closed = await call('POST', '/v1/positions', writerToken, {
      unitId: closedUnit.id,
      code: 'x-pos',
      title: [{ locale: 'en', text: 'X' }],
      kind: 'functional',
    })
    expect(closed.body).toMatchObject({ code: 'unit_closed' })
  })

  it('validates professions and grades against the code concepts', async () => {
    const attempt = (override: object) =>
      call('POST', '/v1/positions', writerToken, {
        unitId,
        code: 'code-check',
        title: [{ locale: 'en', text: 'X' }],
        kind: 'functional',
        ...override,
      })

    const cases: [object, number, string][] = [
      [
        { allowedProfessions: [{ system: 'id.profession', code: 'nope' }] },
        422,
        'unknown_code',
      ],
      [
        { allowedProfessions: [{ system: 'id.profession', code: 'lama' }] },
        422,
        'code_retired',
      ],
      [
        { allowedProfessions: [{ system: 'id.unit-type', code: 'ward' }] },
        422,
        'invalid_professions',
      ],
      [
        { grade: { system: 'id.profession', code: 'perawat' } },
        422,
        'invalid_grade',
      ],
      [{ grade: { system: 'rs.job-grade', code: 'g6' } }, 422, 'code_retired'],
      [{ grade: { system: 'rs.job-grade', code: 'g99' } }, 422, 'unknown_code'],
    ]
    for (const [override, status, code] of cases) {
      const reply = await attempt(override)
      expect([reply.status, reply.body?.code]).toEqual([status, code])
    }
  })

  it('answers 409 for a duplicate code in the unit, and allows it in another unit', async () => {
    await createPosition('dup-code')

    const again = await call('POST', '/v1/positions', writerToken, {
      unitId,
      code: 'dup-code',
      title: [{ locale: 'en', text: 'X' }],
      kind: 'functional',
    })
    expect(again.status).toBe(409)
    expect(again.body).toMatchObject({ code: 'position_exists' })

    const other = await createUnit('lain')
    const same = await call('POST', '/v1/positions', writerToken, {
      unitId: other.id,
      code: 'dup-code',
      title: [{ locale: 'en', text: 'X' }],
      kind: 'functional',
    })
    expect(same.status).toBe(201)
  })

  it('allows one active head position per unit, answers 409 for a second, and allows a new one after the first closes', async () => {
    const own = await createUnit('kepala')
    const head = (
      await call('POST', '/v1/positions', writerToken, {
        unitId: own.id,
        code: 'kepala-ruangan',
        title: [{ locale: 'id-ID', text: 'Kepala Ruangan' }],
        kind: 'structural',
        isHeadOfUnit: true,
      })
    ).body as Record<string, any>
    expect(head).toMatchObject({ is_head_of_unit: true, budgeted_headcount: 1 })

    const second = await call('POST', '/v1/positions', writerToken, {
      unitId: own.id,
      code: 'kepala-baru',
      title: [{ locale: 'id-ID', text: 'Kepala Baru' }],
      kind: 'structural',
      isHeadOfUnit: true,
    })
    expect(second.status).toBe(409)
    expect(second.body).toMatchObject({ code: 'head_position_exists' })

    expect(
      (await call('POST', `/v1/positions/${head.id}/close`, writerToken, {}))
        .status,
    ).toBe(201)
    const replacement = await call('POST', '/v1/positions', writerToken, {
      unitId: own.id,
      code: 'kepala-baru',
      title: [{ locale: 'id-ID', text: 'Kepala Baru' }],
      kind: 'structural',
      isHeadOfUnit: true,
    })
    expect(replacement.status).toBe(201)

    const heads = await call(
      'GET',
      `/v1/positions?unitId=${own.id}&isHeadOfUnit=true&status=active`,
      readerToken,
    )
    expect(heads.body?.data.map((item: { code: string }) => item.code)).toEqual(
      ['kepala-baru'],
    )
  })

  it('refuses a functional head position and a head position with a headcount other than 1', async () => {
    const own = await createUnit('aturan')
    const functional = await call('POST', '/v1/positions', writerToken, {
      unitId: own.id,
      code: 'head-fn',
      title: [{ locale: 'en', text: 'X' }],
      kind: 'functional',
      isHeadOfUnit: true,
    })
    const crowded = await call('POST', '/v1/positions', writerToken, {
      unitId: own.id,
      code: 'head-2',
      title: [{ locale: 'en', text: 'X' }],
      kind: 'structural',
      isHeadOfUnit: true,
      budgetedHeadcount: 2,
    })

    expect(functional.status).toBe(422)
    expect(functional.body).toMatchObject({ code: 'head_must_be_structural' })
    expect(crowded.status).toBe(422)
    expect(crowded.body).toMatchObject({ code: 'head_headcount' })
  })

  it('answers 400 for a malformed body and 422 for a business rule the DTO cannot see', async () => {
    const base = {
      unitId,
      code: 'valid-code',
      title: [{ locale: 'en', text: 'X' }],
      kind: 'functional',
    }
    for (const bad of [
      { ...base, unitId: 'nope' },
      { ...base, title: [] },
      { ...base, kind: undefined },
      { ...base, kind: 'other' },
      { ...base, isHeadOfUnit: 'yes' },
      { ...base, budgetedHeadcount: 0 },
      { ...base, budgetedHeadcount: 1.5 },
      { ...base, startDate: '2026-02-30' },
      { ...base, grade: { system: 5 } },
    ]) {
      const reply = await call('POST', '/v1/positions', writerToken, bad)
      expect([JSON.stringify(bad), reply.status]).toEqual([
        JSON.stringify(bad),
        400,
      ])
    }
    const badCode = await call('POST', '/v1/positions', writerToken, {
      ...base,
      code: 'A',
    })
    expect(badCode.status).toBe(422)
    expect(badCode.body).toMatchObject({ code: 'invalid_code' })
  })

  it('ignores the unit, code, kind, head flag, status and period in a PATCH, and answers 422 empty_update when nothing else is sent', async () => {
    const created = await createPosition('patch-me')

    const ignored = await call(
      'PATCH',
      `/v1/positions/${created.id}`,
      writerToken,
      {
        budgetedHeadcount: 3,
        unitId: new Types.ObjectId().toHexString(),
        code: 'hacked',
        kind: 'structural',
        isHeadOfUnit: true,
        status: 'closed',
        period: { start: '2000-01-01', end: '2000-02-01' },
      },
    )
    expect(ignored.status).toBe(200)
    expect(ignored.body).toMatchObject({
      unit_id: unitId,
      code: 'patch-me',
      kind: 'functional',
      is_head_of_unit: false,
      status: 'active',
      period: created.period,
    })

    const empty = await call(
      'PATCH',
      `/v1/positions/${created.id}`,
      writerToken,
      { code: 'hacked' },
    )
    expect(empty.status).toBe(422)
    expect(empty.body).toMatchObject({ code: 'empty_update' })
  })

  it('answers 409 stale_version for an old version', async () => {
    const created = await createPosition('stale-check')
    await call('PATCH', `/v1/positions/${created.id}`, writerToken, {
      budgetedHeadcount: 2,
    })

    const stale = await call(
      'PATCH',
      `/v1/positions/${created.id}`,
      writerToken,
      { budgetedHeadcount: 3, version: created.version },
    )

    expect(stale.status).toBe(409)
    expect(stale.body).toMatchObject({ code: 'stale_version' })
  })

  it('closes a position, keeps it readable and refuses further changes', async () => {
    const created = await createPosition('close-me', {
      startDate: '2026-01-01',
    })

    const closed = await call(
      'POST',
      `/v1/positions/${created.id}/close`,
      writerToken,
      { endDate: '2026-06-30', reason: 'Restructured' },
    )
    expect(closed.body).toMatchObject({
      status: 'closed',
      period: { start: '2026-01-01', end: '2026-06-30' },
    })

    expect(
      (await call('GET', `/v1/positions/${created.id}`, readerToken)).status,
    ).toBe(200)
    for (const [url, payload] of [
      [`/v1/positions/${created.id}/close`, {}],
    ] as const) {
      const reply = await call('POST', url, writerToken, payload)
      expect(reply.status).toBe(422)
      expect(reply.body).toMatchObject({ code: 'position_closed' })
    }
    const edit = await call(
      'PATCH',
      `/v1/positions/${created.id}`,
      writerToken,
      {
        budgetedHeadcount: 2,
      },
    )
    expect(edit.body).toMatchObject({ code: 'position_closed' })
    expect(
      (
        await call('POST', `/v1/positions/${created.id}/close`, writerToken, {
          endDate: 'soon',
        })
      ).status,
    ).toBe(400)
  })

  it('refuses closing a unit with an active position (409 unit_in_use) and allows it after the position closes', async () => {
    const own = await createUnit('tutup-unit')
    const position = (
      await call('POST', '/v1/positions', writerToken, {
        unitId: own.id,
        code: 'only-pos',
        title: [{ locale: 'en', text: 'X' }],
        kind: 'functional',
      })
    ).body as Record<string, any>

    const blocked = await call(
      'POST',
      `/v1/units/${own.id}/close`,
      writerToken,
      {},
    )
    expect(blocked.status).toBe(409)
    expect(blocked.body).toMatchObject({ code: 'unit_in_use' })

    await call('POST', `/v1/positions/${position.id}/close`, writerToken, {})
    const allowed = await call(
      'POST',
      `/v1/units/${own.id}/close`,
      writerToken,
      {},
    )
    expect(allowed.status).toBe(201)
  })

  it('requires unitId on the list, and answers an empty result for a foreign unit', async () => {
    expect((await call('GET', '/v1/positions', readerToken)).status).toBe(400)
    expect(
      (await call('GET', '/v1/positions?unitId=nope', readerToken)).status,
    ).toBe(400)
    const foreign = await createUnit('pihak-lain', otherTenantToken)

    const list = await call(
      'GET',
      `/v1/positions?unitId=${foreign.id}`,
      readerToken,
    )

    expect(list.status).toBe(200)
    expect(list.body?.data).toEqual([])
  })

  it('rejects list limits outside 1 to 100, a bad status, kind or head filter', async () => {
    for (const query of [
      'limit=0',
      'limit=101',
      'limit=abc',
      'offset=-1',
      'status=open',
      'kind=other',
      'isHeadOfUnit=maybe',
    ]) {
      expect(
        (
          await call(
            'GET',
            `/v1/positions?unitId=${unitId}&${query}`,
            readerToken,
          )
        ).status,
      ).toBe(400)
    }
  })

  it('writes no log entry when data is only read, except the access log of the request', async () => {
    const created = await createPosition('read-only-check')
    const { written, restore } = captureLogs()
    try {
      const replies = [
        await call('GET', `/v1/positions?unitId=${unitId}`, readerToken),
        await call('GET', `/v1/positions/${created.id}`, readerToken),
        await call('GET', '/v1/positions/missing-id', readerToken),
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

  it("logs one entry per write, without the position's values", async () => {
    const { written, restore } = captureLogs()
    try {
      const created = await call('POST', '/v1/positions', writerToken, {
        unitId,
        code: 'log-check',
        title: [{ locale: 'id-ID', text: 'Jabatan Rahasia Nama' }],
        kind: 'functional',
      })
      await call(
        'POST',
        `/v1/positions/${created.body?.id}/close`,
        writerToken,
        {
          reason: 'Alasan Rahasia',
        },
      )
      await vi.waitFor(() =>
        expect(
          written.filter((entry) => entry.event === 'http_request'),
        ).toHaveLength(2),
      )

      expect(
        written.filter((entry) => entry.event === 'position_create'),
      ).toHaveLength(1)
      expect(
        written.filter((entry) => entry.event === 'position_close'),
      ).toHaveLength(1)
      const text = JSON.stringify(written)
      for (const secret of ['Rahasia', 'log-check']) {
        expect(text).not.toContain(secret)
      }
    } finally {
      restore()
    }
  })
})
