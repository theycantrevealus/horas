import { Logger } from '@nestjs/common'
import { Types } from 'mongoose'
import { PERMISSIONS } from '@identity/permission'
import { createHrGateway, type HrGateway } from '../testing/hr-gateway'
import {
  createInMemoryWorkforce,
  type InMemoryWorkforce,
} from '../testing/in-memory-workforce'
import { ShiftManagementModule } from './shift-management.module'

describe('shift definition endpoints (in-memory repositories)', () => {
  const workforce: InMemoryWorkforce = createInMemoryWorkforce()
  let gateway: HrGateway
  let call: HrGateway['call']
  let writerToken: string
  let readerToken: string
  let otherTenantToken: string
  let tenantId: string
  let otherTenantId: string
  let facilityId: string
  let otherFacilityId: string
  let unitId: string
  const name = [{ locale: 'id-ID', text: 'Malam' }]

  /**
   * Defines a shift through the API as the writer.
   *
   * @param override - Fields that replace the defaults (a night shift of ten hours).
   * @returns The reply.
   */
  function define(override: object = {}) {
    return call('POST', '/v1/shift-definitions', writerToken, {
      facilityId,
      code: 'M',
      name,
      type: 'regular',
      startTime: '21:00',
      endTime: '07:00',
      paidMinutes: 540,
      isNight: true,
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
      modules: [ShiftManagementModule],
      ...workforce.options,
    })
    call = gateway.call
    ;({ tenantId, otherTenantId } = gateway)
    writerToken = await gateway.seedAndLogin(tenantId, 'writer', [
      PERMISSIONS.WORKFORCE_SHIFT_DEFINITION_READ,
      PERMISSIONS.WORKFORCE_SHIFT_DEFINITION_WRITE,
    ])
    readerToken = await gateway.seedAndLogin(tenantId, 'reader', [
      PERMISSIONS.WORKFORCE_SHIFT_DEFINITION_READ,
    ])
    otherTenantToken = await gateway.seedAndLogin(otherTenantId, 'other', [
      PERMISSIONS.WORKFORCE_SHIFT_DEFINITION_READ,
      PERMISSIONS.WORKFORCE_SHIFT_DEFINITION_WRITE,
    ])
    const organizationId = new Types.ObjectId().toHexString()
    const makeFacility = async (code: string) =>
      (
        await workforce.facilities.create({
          tenant_id: tenantId,
          organization_id: organizationId,
          code,
          name: [{ locale: 'en', text: 'RS' }],
          address: null,
          timezone: 'Asia/Jakarta',
          holiday_calendar_codes: [],
          external_ids: [],
          status: 'active',
        })
      ).id
    facilityId = await makeFacility('rs-sehat')
    otherFacilityId = await makeFacility('rs-lain')
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
  })

  afterAll(async () => {
    await gateway.close()
  })

  it('refuses every route without a token (401) and the writes without the write permission (403)', async () => {
    const id = new Types.ObjectId().toHexString()
    const routes: ['GET' | 'POST' | 'PATCH', string, object | undefined][] = [
      ['GET', '/v1/shift-definitions', undefined],
      ['POST', '/v1/shift-definitions', {}],
      ['PATCH', `/v1/shift-definitions/${id}`, {}],
      ['POST', `/v1/shift-definitions/${id}/retire`, {}],
    ]
    for (const [method, url, payload] of routes) {
      expect((await call(method, url, undefined, payload)).status).toBe(401)
    }
    for (const [method, url, payload] of routes.filter(([method]) => method !== 'GET')) {
      expect((await call(method, url, readerToken, payload)).status).toBe(403)
    }
    expect((await call('GET', '/v1/shift-definitions', readerToken)).status).toBe(200)
  })

  it('defines a shift, lists it with filters, edits it and retires it', async () => {
    const created = await define({ code: ' p ', startTime: '07:00', endTime: '14:00', paidMinutes: 420, isNight: false, unitIds: [unitId], reason: 'Baru' })

    expect(created.status).toBe(201)
    const body = created.body as Record<string, any>
    expect(body).toMatchObject({
      tenant_id: tenantId,
      facility_id: facilityId,
      code: 'P',
      name,
      type: 'regular',
      start_time: '07:00',
      end_time: '14:00',
      paid_minutes: 420,
      is_night: false,
      unit_ids: [unitId],
      status: 'active',
    })
    expect(body).not.toHaveProperty('_id')
    const off = (await define({ code: 'L', type: 'off', name: [{ locale: 'id-ID', text: 'Libur' }], paidMinutes: undefined, isNight: undefined, startTime: undefined, endTime: undefined })).body as Record<string, any>
    expect(off).toMatchObject({ type: 'off', start_time: null, end_time: null, paid_minutes: 0, is_night: false })
    await define({ facilityId: otherFacilityId, code: 'E' })

    const all = await call('GET', `/v1/shift-definitions?facilityId=${facilityId}`, readerToken)
    expect((all.body as { code: string }[]).map((shift) => shift.code)).toEqual(['L', 'P'])
    const byType = await call('GET', `/v1/shift-definitions?facilityId=${facilityId}&type=off`, readerToken)
    expect((byType.body as { code: string }[]).map((shift) => shift.code)).toEqual(['L'])
    const byUnit = await call('GET', `/v1/shift-definitions?facilityId=${facilityId}&unitId=${unitId}`, readerToken)
    expect((byUnit.body as { code: string }[]).map((shift) => shift.code)).toEqual(['L', 'P'])

    const edited = await call('PATCH', `/v1/shift-definitions/${body.id}`, writerToken, { startTime: '08:00', endTime: '15:00', version: body.version })
    expect(edited.status).toBe(200)
    expect(edited.body).toMatchObject({ code: 'P', type: 'regular', start_time: '08:00', end_time: '15:00', paid_minutes: 420 })
    const retired = await call('POST', `/v1/shift-definitions/${body.id}/retire`, writerToken, {})
    expect(retired.status).toBe(201)
    expect(retired.body).toMatchObject({ status: 'retired' })
    const list = await call('GET', `/v1/shift-definitions?facilityId=${facilityId}&status=retired`, readerToken)
    expect((list.body as { code: string }[]).map((shift) => shift.code)).toEqual(['P'])
    const again = await call('POST', `/v1/shift-definitions/${body.id}/retire`, writerToken, {})
    expect(again.status).toBe(422)
    expect(again.body).toMatchObject({ code: 'shift_retired' })
    expect((await call('PATCH', `/v1/shift-definitions/${body.id}`, writerToken, { isNight: true })).body).toMatchObject({ code: 'shift_retired' })
  })

  it('answers 404 for a missing, malformed or foreign id', async () => {
    const created = (await define({ code: 'Q' })).body as Record<string, any>
    const unknown = new Types.ObjectId().toHexString()
    for (const id of [unknown, 'bad']) {
      expect((await call('PATCH', `/v1/shift-definitions/${id}`, writerToken, { isNight: true })).body).toMatchObject({ code: 'shift_not_found' })
      expect((await call('POST', `/v1/shift-definitions/${id}/retire`, writerToken, {})).body).toMatchObject({ code: 'shift_not_found' })
    }
    const foreign = await call('PATCH', `/v1/shift-definitions/${created.id}`, otherTenantToken, { isNight: true })
    expect(foreign.status).toBe(404)
    expect((await call('POST', `/v1/shift-definitions/${created.id}/retire`, otherTenantToken, {})).status).toBe(404)
    const own = await call('GET', '/v1/shift-definitions?limit=100', otherTenantToken)
    expect((own.body as { code: string }[]).map((shift) => shift.code)).not.toContain('Q')
  })

  it('answers 409 for a code that exists and a stale version, and 422 for the business rules', async () => {
    const created = (await define({ code: 'R' })).body as Record<string, any>

    const duplicate = await define({ code: 'r' })
    expect(duplicate.status).toBe(409)
    expect(duplicate.body).toMatchObject({ code: 'shift_exists' })
    const stale = await call('PATCH', `/v1/shift-definitions/${created.id}`, writerToken, { isNight: false, version: created.version + 5 })
    expect(stale.status).toBe(409)
    expect(stale.body).toMatchObject({ code: 'stale_version' })

    expect((await define({ code: 'T1', startTime: '07:00', endTime: '07:00' })).body).toMatchObject({ code: 'invalid_times' })
    expect((await define({ code: 'T2', paidMinutes: 601 })).body).toMatchObject({ code: 'paid_exceeds_duration' })
    expect((await define({ code: 'T3', paidMinutes: 1.5 })).body).toMatchObject({ code: 'invalid_paid' })
    expect((await define({ code: 'T4', type: 'off', startTime: '07:00', endTime: '15:00' })).body).toMatchObject({ code: 'invalid_times' })
    expect((await define({ code: 'T5', facilityId: new Types.ObjectId().toHexString() })).body).toMatchObject({ code: 'facility_not_found' })
    expect((await define({ code: 'T6', unitIds: [new Types.ObjectId().toHexString()] })).body).toMatchObject({ code: 'unit_not_found' })
    expect((await call('PATCH', `/v1/shift-definitions/${created.id}`, writerToken, {})).body).toMatchObject({ code: 'empty_update' })
  })

  it('validates the request: 400 for shape, and list limits', async () => {
    expect((await call('POST', '/v1/shift-definitions', writerToken, {})).status).toBe(400)
    expect((await define({ facilityId: 'bad' })).status).toBe(400)
    expect((await define({ type: 'weird' })).status).toBe(400)
    expect((await define({ paidMinutes: 'many' })).status).toBe(400)
    expect((await define({ isNight: 'yes' })).status).toBe(400)
    expect((await define({ unitIds: ['bad'] })).status).toBe(400)
    expect((await define({ name: [{ locale: 1 }] })).status).toBe(400)
    expect((await define({ startTime: 700 })).status).toBe(400)
    expect((await call('PATCH', `/v1/shift-definitions/${new Types.ObjectId().toHexString()}`, writerToken, { version: -1 })).status).toBe(400)
    for (const query of ['limit=0', 'limit=101', 'offset=-1', 'status=gone', 'type=weird', 'facilityId=bad', 'unitId=bad']) {
      expect((await call('GET', `/v1/shift-definitions?${query}`, readerToken)).status).toBe(400)
    }
  })

  it('writes no log entry when data is only read, except the access log of the request', async () => {
    const { written, restore } = captureLogs()
    try {
      const replies = [
        await call('GET', '/v1/shift-definitions', readerToken),
        await call('GET', '/v1/shift-definitions?facilityId=bad', readerToken),
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

  it('logs one entry per write, without names, codes, times or reasons', async () => {
    const { written, restore } = captureLogs()
    try {
      const created = (await define({ code: 'LOGSHF', name: [{ locale: 'id-ID', text: 'Nama Rahasia' }], reason: 'Alasan Rahasia' })).body as Record<string, any>
      await call('PATCH', `/v1/shift-definitions/${created.id}`, writerToken, { isNight: false, reason: 'Alasan Ubah Rahasia' })
      await call('POST', `/v1/shift-definitions/${created.id}/retire`, writerToken, { reason: 'Alasan Pensiun Rahasia' })
      await vi.waitFor(() =>
        expect(written.filter((entry) => entry.event === 'http_request')).toHaveLength(3),
      )

      expect(written.filter((entry) => entry.event !== 'http_request').map((entry) => entry.event)).toEqual([
        'shift_create',
        'shift_update',
        'shift_retire',
      ])
      for (const text of ['Nama Rahasia', 'LOGSHF', '21:00', 'Alasan Rahasia', 'Alasan Ubah Rahasia', 'Alasan Pensiun Rahasia']) {
        expect(JSON.stringify(written)).not.toContain(text)
      }
    } finally {
      restore()
    }
  })
})
