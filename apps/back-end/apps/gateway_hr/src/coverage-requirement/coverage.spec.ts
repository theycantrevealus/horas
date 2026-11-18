import { Logger } from '@nestjs/common'
import { Types } from 'mongoose'
import { PERMISSIONS } from '@identity/permission'
import { createHrGateway, type HrGateway } from '../testing/hr-gateway'
import {
  createInMemoryWorkforce,
  type InMemoryWorkforce,
} from '../testing/in-memory-workforce'
import { ShiftManagementModule } from '../shift/shift-management.module'
import { CoverageManagementModule } from './coverage-management.module'

describe('coverage requirement endpoints (in-memory repositories)', () => {
  const workforce: InMemoryWorkforce = createInMemoryWorkforce()
  let gateway: HrGateway
  let call: HrGateway['call']
  let writerToken: string
  let readerToken: string
  let otherTenantToken: string
  let shiftWriterToken: string
  let tenantId: string
  let otherTenantId: string
  let facilityId: string
  let unitId: string
  let shiftId: string
  const nurse = { system: 'id.profession', code: 'perawat' }
  const level = { system: 'id.clinical-level', code: 'pk2' }

  /**
   * Adds a requirement through the API as the writer; the defaults ask for 3 nurses of level pk2.
   *
   * @param override - Fields that replace the defaults.
   * @returns The reply.
   */
  function add(override: object = {}) {
    return call('POST', '/v1/coverage-requirements', writerToken, {
      unitId,
      shiftId,
      dayPattern: 'all',
      match: { profession: nurse, minClinicalLevel: level },
      minCount: 3,
      teamLeaderRequired: true,
      period: { start: '2099-01-01' },
      ...override,
    })
  }

  /**
   * Adds a shift of the facility.
   *
   * @param code - Shift code.
   * @param type - Shift type.
   * @returns The shift identifier.
   */
  async function addShift(code: string, type: 'regular' | 'off' = 'regular') {
    return (
      await workforce.shifts.create({
        tenant_id: tenantId,
        facility_id: facilityId,
        code,
        name: [{ locale: 'en', text: code }],
        type,
        start_time: type === 'off' ? null : '07:00',
        end_time: type === 'off' ? null : '14:00',
        paid_minutes: type === 'off' ? 0 : 420,
        is_night: false,
        unit_ids: [],
        status: 'active',
      })
    ).id
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
      modules: [CoverageManagementModule, ShiftManagementModule],
      ...workforce.options,
    })
    call = gateway.call
    ;({ tenantId, otherTenantId } = gateway)
    writerToken = await gateway.seedAndLogin(tenantId, 'writer', [
      PERMISSIONS.WORKFORCE_COVERAGE_REQUIREMENT_READ,
      PERMISSIONS.WORKFORCE_COVERAGE_REQUIREMENT_WRITE,
    ])
    readerToken = await gateway.seedAndLogin(tenantId, 'reader', [
      PERMISSIONS.WORKFORCE_COVERAGE_REQUIREMENT_READ,
    ])
    shiftWriterToken = await gateway.seedAndLogin(tenantId, 'shifts', [
      PERMISSIONS.WORKFORCE_SHIFT_DEFINITION_READ,
      PERMISSIONS.WORKFORCE_SHIFT_DEFINITION_WRITE,
    ])
    otherTenantToken = await gateway.seedAndLogin(otherTenantId, 'other', [
      PERMISSIONS.WORKFORCE_COVERAGE_REQUIREMENT_READ,
      PERMISSIONS.WORKFORCE_COVERAGE_REQUIREMENT_WRITE,
    ])
    for (const [system, code] of [
      ['id.profession', 'perawat'],
      ['id.clinical-level', 'pk2'],
      ['id.specialty', 'bedah'],
    ]) {
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
    const organizationId = new Types.ObjectId().toHexString()
    facilityId = (
      await workforce.facilities.create({
        tenant_id: tenantId,
        organization_id: organizationId,
        code: 'rs-sehat',
        name: [{ locale: 'en', text: 'RS' }],
        address: null,
        timezone: 'Asia/Jakarta',
        holiday_calendar_codes: [],
        external_ids: [],
        status: 'active',
      })
    ).id
    unitId = (
      await workforce.units.create({
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
      })
    ).id
    shiftId = await addShift('P')
  })

  afterAll(async () => {
    await gateway.close()
  })

  it('refuses every route without a token (401) and the writes without the write permission (403)', async () => {
    const id = new Types.ObjectId().toHexString()
    const routes: ['GET' | 'POST' | 'PATCH', string, object | undefined][] = [
      ['GET', '/v1/coverage-requirements', undefined],
      ['POST', '/v1/coverage-requirements', {}],
      ['PATCH', `/v1/coverage-requirements/${id}`, {}],
      ['POST', `/v1/coverage-requirements/${id}/retire`, {}],
    ]
    for (const [method, url, payload] of routes) {
      expect((await call(method, url, undefined, payload)).status).toBe(401)
    }
    for (const [method, url, payload] of routes.filter(([method]) => method !== 'GET')) {
      expect((await call(method, url, readerToken, payload)).status).toBe(403)
    }
    expect((await call('GET', '/v1/coverage-requirements', readerToken)).status).toBe(200)
  })

  it('adds a requirement, lists it with filters, edits it and retires it', async () => {
    const created = await add({ period: { start: '2099-03-01', end: '2099-03-31' }, reason: 'Baru' })

    expect(created.status).toBe(201)
    const body = created.body as Record<string, any>
    expect(body).toMatchObject({
      tenant_id: tenantId,
      unit_id: unitId,
      shift_definition_id: shiftId,
      day_pattern: 'all',
      match: { workforce_category: null, profession: nurse, specialty: null, min_clinical_level: level },
      min_count: 3,
      team_leader_required: true,
      period: { start: '2099-03-01', end: '2099-03-31' },
      status: 'active',
    })
    expect(body).not.toHaveProperty('_id')
    const other = (await add({ period: { start: '2099-04-01' }, dayPattern: 'weekdays', match: {}, teamLeaderRequired: undefined })).body as Record<string, any>
    expect(other).toMatchObject({ team_leader_required: false, period: { start: '2099-04-01', end: null } })

    const byUnit = await call('GET', `/v1/coverage-requirements?unitId=${unitId}&shiftId=${shiftId}`, readerToken)
    expect((byUnit.body as any[]).map((item) => item.id)).toEqual([body.id, other.id])
    const onDate = await call('GET', '/v1/coverage-requirements?onDate=2099-03-15', readerToken)
    expect((onDate.body as any[]).map((item) => item.id)).toEqual([body.id])
    const byPattern = await call('GET', '/v1/coverage-requirements?dayPattern=weekdays', readerToken)
    expect((byPattern.body as any[]).map((item) => item.id)).toEqual([other.id])

    const edited = await call('PATCH', `/v1/coverage-requirements/${body.id}`, writerToken, { minCount: 5, match: { profession: nurse }, period: { end: null }, version: body.version })
    expect(edited.status).toBe(200)
    expect(edited.body).toMatchObject({ min_count: 5, match: { profession: nurse, min_clinical_level: null }, period: { start: '2099-03-01', end: null } })
    const retired = await call('POST', `/v1/coverage-requirements/${body.id}/retire`, writerToken, {})
    expect(retired.status).toBe(201)
    expect(retired.body).toMatchObject({ status: 'retired' })
    const list = await call('GET', '/v1/coverage-requirements?status=retired', readerToken)
    expect((list.body as any[]).map((item) => item.id)).toEqual([body.id])
    expect((await call('POST', `/v1/coverage-requirements/${body.id}/retire`, writerToken, {})).body).toMatchObject({ code: 'requirement_retired' })
    expect((await call('PATCH', `/v1/coverage-requirements/${body.id}`, writerToken, { minCount: 1 })).body).toMatchObject({ code: 'requirement_retired' })
  })

  it('lets a requirement that has started change only its last day', async () => {
    const started = (await add({ unitId, shiftId: await addShift('ST'), period: { start: '2020-01-01' } })).body as Record<string, any>

    const rewrite = await call('PATCH', `/v1/coverage-requirements/${started.id}`, writerToken, { minCount: 2 })
    expect(rewrite.status).toBe(422)
    expect(rewrite.body).toMatchObject({ code: 'requirement_in_force' })
    const ended = await call('PATCH', `/v1/coverage-requirements/${started.id}`, writerToken, { period: { end: '2099-12-31' } })
    expect(ended.status).toBe(200)
    expect(ended.body).toMatchObject({ period: { start: '2020-01-01', end: '2099-12-31' }, min_count: 3 })
    const ignored = await call('PATCH', `/v1/coverage-requirements/${started.id}`, writerToken, { period: { start: '2021-01-01', end: '2099-12-31' } })
    expect(ignored.status).toBe(200)
    expect((ignored.body as any).period.start).toBe('2020-01-01')
  })

  it('answers 404 for a missing, malformed or foreign requirement, and never lists another tenant\'s', async () => {
    const created = (await add({ shiftId: await addShift('NF') })).body as Record<string, any>
    const unknown = new Types.ObjectId().toHexString()

    for (const id of [unknown, 'bad']) {
      expect((await call('PATCH', `/v1/coverage-requirements/${id}`, writerToken, { minCount: 2 })).body).toMatchObject({ code: 'requirement_not_found' })
      expect((await call('POST', `/v1/coverage-requirements/${id}/retire`, writerToken, {})).body).toMatchObject({ code: 'requirement_not_found' })
    }
    expect((await call('PATCH', `/v1/coverage-requirements/${created.id}`, otherTenantToken, { minCount: 2 })).status).toBe(404)
    expect((await call('POST', `/v1/coverage-requirements/${created.id}/retire`, otherTenantToken, {})).status).toBe(404)
    const own = await call('GET', '/v1/coverage-requirements?limit=100', otherTenantToken)
    expect((own.body as any[]).map((item) => item.id)).not.toContain(created.id)
  })

  it('answers 409 for a duplicate and a stale version, and 422 for the business rules', async () => {
    const dup = await addShift('DUP')
    const created = (await add({ shiftId: dup })).body as Record<string, any>

    const again = await add({ shiftId: dup, period: { start: '2100-01-01' } })
    expect(again.status).toBe(409)
    expect(again.body).toMatchObject({ code: 'requirement_exists' })
    const stale = await call('PATCH', `/v1/coverage-requirements/${created.id}`, writerToken, { minCount: 2, version: created.version + 5 })
    expect(stale.status).toBe(409)
    expect(stale.body).toMatchObject({ code: 'stale_version' })

    expect((await add({ minCount: 0 })).body).toMatchObject({ code: 'invalid_min_count' })
    expect((await add({ minCount: 1.5 })).body).toMatchObject({ code: 'invalid_min_count' })
    expect((await add({ period: { start: '1999-01-01' } })).body).toMatchObject({ code: 'invalid_period' })
    expect((await add({ period: { start: '2099-05-01', end: '2099-04-01' } })).body).toMatchObject({ code: 'invalid_period' })
    expect((await add({ match: { profession: level } })).body).toMatchObject({ code: 'invalid_profession' })
    expect((await add({ match: { specialty: { system: 'id.specialty', code: 'unknown' } } })).body).toMatchObject({ code: 'unknown_code' })
    expect((await add({ unitId: new Types.ObjectId().toHexString() })).body).toMatchObject({ code: 'unit_not_found' })
    expect((await add({ shiftId: new Types.ObjectId().toHexString() })).body).toMatchObject({ code: 'shift_not_found' })
    expect((await add({ shiftId: await addShift('OFF', 'off') })).body).toMatchObject({ code: 'shift_not_countable' })
    expect((await call('PATCH', `/v1/coverage-requirements/${created.id}`, writerToken, {})).body).toMatchObject({ code: 'empty_update' })
  })

  it('refuses to retire a shift while an active requirement uses it, and allows it after', async () => {
    const used = await addShift('USED')
    const requirement = (await add({ shiftId: used })).body as Record<string, any>

    const refused = await call('POST', `/v1/shift-definitions/${used}/retire`, shiftWriterToken, {})
    expect(refused.status).toBe(409)
    expect(refused.body).toMatchObject({ code: 'shift_in_use' })
    await call('POST', `/v1/coverage-requirements/${requirement.id}/retire`, writerToken, {})
    const retired = await call('POST', `/v1/shift-definitions/${used}/retire`, shiftWriterToken, {})
    expect(retired.status).toBe(201)
    expect(retired.body).toMatchObject({ status: 'retired' })
  })

  it('validates the request: 400 for shape, and list limits', async () => {
    expect((await call('POST', '/v1/coverage-requirements', writerToken, {})).status).toBe(400)
    expect((await add({ unitId: 'bad' })).status).toBe(400)
    expect((await add({ shiftId: 'bad' })).status).toBe(400)
    expect((await add({ dayPattern: 'weekends' })).status).toBe(400)
    expect((await add({ minCount: 'many' })).status).toBe(400)
    expect((await add({ teamLeaderRequired: 'yes' })).status).toBe(400)
    expect((await add({ period: {} })).status).toBe(400)
    expect((await add({ period: { start: '2099-02-30' } })).status).toBe(400)
    expect((await add({ period: undefined })).status).toBe(400)
    expect((await add({ match: { profession: { system: 1 } } })).status).toBe(400)
    const id = new Types.ObjectId().toHexString()
    expect((await call('PATCH', `/v1/coverage-requirements/${id}`, writerToken, { period: {} })).status).toBe(400)
    expect((await call('PATCH', `/v1/coverage-requirements/${id}`, writerToken, { period: { end: 'soon' } })).status).toBe(400)
    expect((await call('PATCH', `/v1/coverage-requirements/${id}`, writerToken, { version: -1 })).status).toBe(400)
    for (const query of ['limit=0', 'limit=101', 'offset=-1', 'status=gone', 'dayPattern=x', 'unitId=bad', 'shiftId=bad', 'onDate=2099-02-30']) {
      expect((await call('GET', `/v1/coverage-requirements?${query}`, readerToken)).status).toBe(400)
    }
  })

  it('writes no log entry when data is only read, except the access log of the request', async () => {
    const { written, restore } = captureLogs()
    try {
      const replies = [
        await call('GET', '/v1/coverage-requirements', readerToken),
        await call('GET', '/v1/coverage-requirements?unitId=bad', readerToken),
      ]
      expect(replies.map((reply) => reply.status)).toEqual([200, 400])
      await vi.waitFor(() =>
        expect(written.filter((entry) => entry.event === 'http_request')).toHaveLength(replies.length),
      )

      expect(written.filter((entry) => entry.event !== 'http_request')).toEqual([])
    } finally {
      restore()
    }
  })

  it('logs one entry per write, without codes, counts, dates or reasons', async () => {
    const logShift = await addShift('LOG')
    const { written, restore } = captureLogs()
    try {
      const created = (await add({ shiftId: logShift, minCount: 7, reason: 'Alasan Rahasia' })).body as Record<string, any>
      await call('PATCH', `/v1/coverage-requirements/${created.id}`, writerToken, { minCount: 8, reason: 'Alasan Ubah Rahasia' })
      await call('POST', `/v1/coverage-requirements/${created.id}/retire`, writerToken, { reason: 'Alasan Pensiun Rahasia' })
      await vi.waitFor(() =>
        expect(written.filter((entry) => entry.event === 'http_request')).toHaveLength(3),
      )

      expect(written.filter((entry) => entry.event !== 'http_request').map((entry) => entry.event)).toEqual([
        'coverage_create',
        'coverage_update',
        'coverage_retire',
      ])
      for (const text of ['perawat', 'pk2', '2099-01-01', 'Alasan Rahasia', 'Alasan Ubah Rahasia', 'Alasan Pensiun Rahasia']) {
        expect(JSON.stringify(written)).not.toContain(text)
      }
    } finally {
      restore()
    }
  })
})
