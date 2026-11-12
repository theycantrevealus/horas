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
import { ParameterManagementModule } from './parameter-management.module'

describe('parameter endpoints (in-memory repositories)', () => {
  const workforce: InMemoryWorkforce = createInMemoryWorkforce()
  let gateway: HrGateway
  let call: HrGateway['call']
  let writerToken: string
  let readerToken: string
  let otherTenantToken: string
  let organizationId: string
  let facilityId: string
  let unitId: string

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

  /**
   * Creates an organization, a facility and a unit through the API.
   *
   * @param code - Base code for the three records.
   * @param token - Token of the caller.
   * @returns Their identifiers.
   */
  async function createPlace(code: string, token = writerToken) {
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
    const unit = (
      await call('POST', '/v1/units', token, {
        facilityId: facility.id,
        code: `unit-${code}`,
        name: [{ locale: 'id-ID', text: `Unit ${code}` }],
        type: { system: 'id.unit-type', code: 'ward' },
      })
    ).body as Record<string, any>
    return {
      organization: organization.id,
      facility: facility.id,
      unit: unit.id,
    }
  }

  /**
   * Sets a value through the API as the writer.
   *
   * @param override - Fields that replace the defaults.
   * @returns The reply.
   */
  function setValue(override: object = {}) {
    return call('POST', '/v1/parameters', writerToken, {
      key: 'MAX_WEEKLY_HOURS',
      scope: { kind: 'tenant' },
      value: 37.5,
      effectiveFrom: day(),
      ...override,
    })
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
        ParameterManagementModule,
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
      PERMISSIONS.WORKFORCE_PARAMETER_READ,
      PERMISSIONS.WORKFORCE_PARAMETER_WRITE,
    ]
    writerToken = await seedAndLogin(tenantId, 'writer', all)
    readerToken = await seedAndLogin(tenantId, 'reader', [
      PERMISSIONS.WORKFORCE_PARAMETER_READ,
    ])
    otherTenantToken = await seedAndLogin(otherTenantId, 'other-writer', all)
    await workforce.codeConcepts.create({
      system: 'id.unit-type',
      code: 'ward',
      display: [{ locale: 'en', text: 'ward' }],
      properties: { clinical_default: true },
      mappings: [],
      period: null,
      status: 'active',
    })
    await workforce.codeConcepts.create({
      system: 'id.profession',
      code: 'perawat',
      display: [{ locale: 'en', text: 'perawat' }],
      properties: { workforce_category: 'tenaga_keperawatan' },
      mappings: [],
      period: null,
      status: 'active',
    })
    const place = await createPlace('sehat')
    organizationId = place.organization
    facilityId = place.facility
    unitId = place.unit
  })

  afterAll(async () => {
    await gateway.close()
  })

  it('refuses every route without a token (401) and without the permission (403)', async () => {
    const routes: ['GET' | 'POST', string, object | undefined][] = [
      ['GET', '/v1/parameters', undefined],
      ['GET', '/v1/parameters/catalog', undefined],
      ['GET', '/v1/parameters/effective?key=MAX_WEEKLY_HOURS', undefined],
      ['POST', '/v1/parameters', {}],
    ]
    for (const [method, url, payload] of routes) {
      expect((await call(method, url, undefined, payload)).status).toBe(401)
    }
    expect((await call('POST', '/v1/parameters', readerToken, {})).status).toBe(
      403,
    )
    const noParameterPermission = await gateway.seedAndLogin(
      gateway.tenantId,
      'unit-only',
      [PERMISSIONS.WORKFORCE_UNIT_READ],
    )
    for (const url of [
      '/v1/parameters',
      '/v1/parameters/catalog',
      '/v1/parameters/effective?key=MAX_WEEKLY_HOURS',
    ]) {
      expect((await call('GET', url, noParameterPermission)).status).toBe(403)
    }
  })

  it('answers the catalog with the keys, types, defaults and scopes', async () => {
    const reply = await call('GET', '/v1/parameters/catalog', readerToken)

    expect(reply.status).toBe(200)
    expect(reply.body).toBeInstanceOf(Array)
    const weekly = (reply.body as unknown as Record<string, any>[]).find(
      (item) => item.key === 'MAX_WEEKLY_HOURS',
    )
    expect(weekly).toMatchObject({
      type: { kind: 'decimal', min: 1, max: 168 },
      default: 40,
      scopes: ['tenant', 'organization', 'facility', 'unit'],
    })
  })

  it('sets a value, lists it and reads it as the value in force', async () => {
    const created = await setValue({
      value: 36,
      notes: 'PKB article 12',
      reason: 'Agreement',
    })
    expect(created.status).toBe(201)
    expect(created.body).toMatchObject({
      key: 'MAX_WEEKLY_HOURS',
      scope: { kind: 'tenant', id: null },
      value: 36,
      effective_from: day(),
      notes: 'PKB article 12',
    })
    expect(created.body).not.toHaveProperty('_id')
    expect(created.body).not.toHaveProperty('__v')

    const list = await call(
      'GET',
      '/v1/parameters?key=MAX_WEEKLY_HOURS',
      readerToken,
    )
    expect(list.status).toBe(200)
    expect(list.body?.data[0]).toMatchObject({ value: 36 })

    const effective = await call(
      'GET',
      '/v1/parameters/effective?key=MAX_WEEKLY_HOURS',
      readerToken,
    )
    expect(effective.status).toBe(200)
    expect(effective.body).toMatchObject({
      key: 'MAX_WEEKLY_HOURS',
      value: 36,
      source: 'tenant',
      effective_from: day(),
      date: expect.any(String),
    })
  })

  it('answers the catalog default when nothing was set, and follows the place and the date', async () => {
    const dflt = await call(
      'GET',
      '/v1/parameters/effective?key=MIN_REST_HOURS',
      readerToken,
    )
    expect(dflt.body).toMatchObject({ value: 8, source: 'default' })

    await setValue({ key: 'MAX_CONSECUTIVE_NIGHTS', value: 4 })
    await setValue({
      key: 'MAX_CONSECUTIVE_NIGHTS',
      scope: { kind: 'unit', id: unitId },
      value: 2,
    })
    await setValue({
      key: 'MAX_CONSECUTIVE_NIGHTS',
      scope: { kind: 'tenant' },
      value: 5,
      effectiveFrom: day(30),
    })

    const read = async (query: string) =>
      (
        await call(
          'GET',
          `/v1/parameters/effective?key=MAX_CONSECUTIVE_NIGHTS${query}`,
          readerToken,
        )
      ).body
    expect(await read('')).toMatchObject({ value: 4, source: 'tenant' })
    expect(await read(`&unitId=${unitId}`)).toMatchObject({
      value: 2,
      source: 'unit',
    })
    expect(await read(`&facilityId=${facilityId}`)).toMatchObject({
      value: 4,
      source: 'tenant',
    })
    expect(await read(`&date=${day(31)}`)).toMatchObject({ value: 5 })
  })

  it('answers 422 for an unknown key, a wrong scope, a wrong value and a wrong date', async () => {
    const cases: [object, string][] = [
      [{ key: 'NOPE' }, 'unknown_parameter'],
      [
        {
          key: 'CREDENTIALING_SCOPE',
          value: 'group',
          scope: { kind: 'facility', id: facilityId },
        },
        'scope_not_allowed',
      ],
      [
        {
          key: 'MIN_ASSESSORS',
          value: 2,
          scope: { kind: 'committee', id: facilityId },
        },
        'scope_not_available',
      ],
      [{ scope: { kind: 'tenant', id: facilityId } }, 'invalid_scope'],
      [{ scope: { kind: 'facility' } }, 'invalid_scope'],
      [{ value: 400 }, 'invalid_value'],
      [{ value: '40' }, 'invalid_value'],
      [{ key: 'LICENSE_ALERT_DAYS', value: [] }, 'invalid_value'],
      [{ effectiveFrom: day(-3) }, 'effective_from_in_past'],
      [{ notes: '   ' }, 'invalid_notes'],
    ]
    for (const [override, code] of cases) {
      const reply = await setValue(override)
      expect([
        JSON.stringify(override),
        reply.status,
        reply.body?.code,
      ]).toEqual([JSON.stringify(override), 422, code])
    }
  })

  it('answers 422 scope_not_found for a missing or foreign place without telling which', async () => {
    const foreign = await createPlace('asing', otherTenantToken)

    for (const [kind, id] of [
      ['organization', foreign.organization],
      ['facility', foreign.facility],
      ['unit', foreign.unit],
      ['unit', new Types.ObjectId().toHexString()],
    ]) {
      const reply = await setValue({ scope: { kind, id } })
      expect([reply.status, reply.body?.code]).toEqual([422, 'scope_not_found'])
    }
    for (const query of [
      `unitId=${foreign.unit}`,
      `facilityId=${foreign.facility}`,
      `organizationId=${foreign.organization}`,
      `facilityId=${new Types.ObjectId().toHexString()}`,
    ]) {
      const reply = await call(
        'GET',
        `/v1/parameters/effective?key=MAX_WEEKLY_HOURS&${query}`,
        readerToken,
      )
      expect([reply.status, reply.body?.code]).toEqual([422, 'scope_not_found'])
    }
  })

  it('checks the professions of a points list against the code concepts', async () => {
    const ok = await setValue({
      key: 'SKP_REQUIRED_POINTS',
      value: [
        {
          profession: { system: 'id.profession', code: 'perawat' },
          points: 25,
        },
      ],
    })
    expect(ok.status).toBe(201)

    const unknown = await setValue({
      key: 'SKP_REQUIRED_POINTS',
      effectiveFrom: day(1),
      value: [
        { profession: { system: 'id.profession', code: 'nope' }, points: 25 },
      ],
    })
    expect([unknown.status, unknown.body?.code]).toEqual([422, 'unknown_code'])
  })

  it('answers 409 parameter_exists for a second value on the same key, scope and date', async () => {
    const date = day(10)
    expect((await setValue({ effectiveFrom: date, value: 33 })).status).toBe(
      201,
    )

    const again = await setValue({ effectiveFrom: date, value: 32 })

    expect(again.status).toBe(409)
    expect(again.body).toMatchObject({ code: 'parameter_exists' })
    expect(
      (
        await setValue({
          effectiveFrom: date,
          scope: { kind: 'organization', id: organizationId },
        })
      ).status,
    ).toBe(201)
  })

  it('answers 400 for a malformed body, query or id', async () => {
    for (const bad of [
      {},
      { key: 'MAX_WEEKLY_HOURS' },
      {
        key: 'MAX_WEEKLY_HOURS',
        scope: { kind: 'tenant' },
        effectiveFrom: day(),
      },
      {
        key: 'MAX_WEEKLY_HOURS',
        scope: { kind: 'nope' },
        value: 1,
        effectiveFrom: day(),
      },
      {
        key: 'MAX_WEEKLY_HOURS',
        scope: { kind: 'unit', id: 'nope' },
        value: 1,
        effectiveFrom: day(),
      },
      {
        key: 'MAX_WEEKLY_HOURS',
        scope: { kind: 'tenant' },
        value: 1,
        effectiveFrom: '2026-02-30',
      },
    ]) {
      expect([
        JSON.stringify(bad),
        (await call('POST', '/v1/parameters', writerToken, bad)).status,
      ]).toEqual([JSON.stringify(bad), 400])
    }
    for (const query of [
      'limit=0',
      'limit=101',
      'limit=abc',
      'offset=-1',
      'scopeKind=nope',
      'scopeId=nope',
    ]) {
      expect(
        (await call('GET', `/v1/parameters?${query}`, readerToken)).status,
      ).toBe(400)
    }
    for (const query of [
      '',
      'key=MAX_WEEKLY_HOURS&unitId=nope',
      'key=MAX_WEEKLY_HOURS&date=2026-02-30',
    ]) {
      expect(
        (await call('GET', `/v1/parameters/effective?${query}`, readerToken))
          .status,
      ).toBe(400)
    }
  })

  it('answers 422 for two places in one lookup and for a scope id without a scope kind', async () => {
    const two = await call(
      'GET',
      `/v1/parameters/effective?key=MAX_WEEKLY_HOURS&unitId=${unitId}&facilityId=${facilityId}`,
      readerToken,
    )
    expect(two.status).toBe(422)
    expect(two.body).toMatchObject({ code: 'invalid_place' })

    const list = await call(
      'GET',
      `/v1/parameters?scopeId=${facilityId}`,
      readerToken,
    )
    expect(list.status).toBe(422)
    expect(list.body).toMatchObject({ code: 'scope_kind_required' })
  })

  it('lists with filters and paging, and keeps other tenants out', async () => {
    await call('POST', '/v1/parameters', otherTenantToken, {
      key: 'MAX_WEEKLY_HOURS',
      scope: { kind: 'tenant' },
      value: 20,
      effectiveFrom: day(),
    })
    await setValue({
      key: 'ROSTER_APPROVAL_REQUIRED',
      scope: { kind: 'facility', id: facilityId },
      value: false,
    })

    const byScope = await call(
      'GET',
      `/v1/parameters?scopeKind=facility&scopeId=${facilityId}`,
      readerToken,
    )
    const paged = await call('GET', '/v1/parameters?limit=1', readerToken)
    const all = await call('GET', '/v1/parameters?limit=100', readerToken)

    expect(byScope.body?.data.map((row: { key: string }) => row.key)).toEqual([
      'ROSTER_APPROVAL_REQUIRED',
    ])
    expect(byScope.body?.data[0].value).toBe(false)
    expect(paged.body?.data).toHaveLength(1)
    expect(
      all.body?.data.every((row: { value: unknown }) => row.value !== 20),
    ).toBe(true)
  })

  it('writes no log entry when data is only read, except the access log of the request', async () => {
    const { written, restore } = captureLogs()
    try {
      const replies = [
        await call('GET', '/v1/parameters', readerToken),
        await call('GET', '/v1/parameters/catalog', readerToken),
        await call(
          'GET',
          '/v1/parameters/effective?key=MAX_WEEKLY_HOURS',
          readerToken,
        ),
        await call('GET', '/v1/parameters/effective?key=NOPE', readerToken),
      ]
      expect(replies.map((reply) => reply.status)).toEqual([200, 200, 200, 422])
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

  it('logs one entry per write, without the value or the notes', async () => {
    const { written, restore } = captureLogs()
    try {
      await setValue({
        key: 'IMPORT_MAX_ROWS',
        value: 7654,
        effectiveFrom: day(2),
        notes: 'Catatan Rahasia',
        reason: 'Alasan Rahasia',
      })
      await vi.waitFor(() =>
        expect(written.some((entry) => entry.event === 'http_request')).toBe(
          true,
        ),
      )

      expect(
        written.filter((entry) => entry.event === 'parameter_set'),
      ).toHaveLength(1)
      const text = JSON.stringify(written)
      for (const secret of ['7654', 'Rahasia']) {
        expect(text).not.toContain(secret)
      }
    } finally {
      restore()
    }
  })
})
