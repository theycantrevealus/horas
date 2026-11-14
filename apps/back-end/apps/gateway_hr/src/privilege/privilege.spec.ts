import { Logger } from '@nestjs/common'
import { Types } from 'mongoose'
import { PERMISSIONS } from '@identity/permission'
import { createHrGateway, type HrGateway } from '../testing/hr-gateway'
import {
  createInMemoryWorkforce,
  type InMemoryWorkforce,
} from '../testing/in-memory-workforce'
import { PrivilegeManagementModule } from './privilege-management.module'

describe('privilege catalog endpoints (in-memory repositories)', () => {
  const workforce: InMemoryWorkforce = createInMemoryWorkforce()
  let gateway: HrGateway
  let call: HrGateway['call']
  let writerToken: string
  let readerToken: string
  let otherTenantToken: string
  let tenantId: string
  let otherTenantId: string
  let facilityId: string
  let counter = 0

  const committee = { system: 'id.committee', code: 'komite_medik' }
  const dokter = { system: 'id.profession', code: 'dokter' }
  const text = (value: string, locale = 'id-ID') => [{ locale, text: value }]

  /**
   * Adds an item through the API as the writer; the defaults make a minimal item.
   *
   * @param override - Fields that replace the defaults.
   * @returns The reply.
   */
  function add(override: object = {}) {
    counter += 1
    return call('POST', '/v1/privileges', writerToken, {
      code: `PD-${String(counter).padStart(3, '0')}`,
      name: text('Pemasangan kateter vena sentral'),
      committee,
      professions: [dokter],
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
      modules: [PrivilegeManagementModule],
      ...workforce.options,
    })
    call = gateway.call
    ;({ tenantId, otherTenantId } = gateway)
    writerToken = await gateway.seedAndLogin(tenantId, 'writer', [
      PERMISSIONS.WORKFORCE_PRIVILEGE_READ,
      PERMISSIONS.WORKFORCE_PRIVILEGE_WRITE,
    ])
    readerToken = await gateway.seedAndLogin(tenantId, 'reader', [
      PERMISSIONS.WORKFORCE_PRIVILEGE_READ,
    ])
    otherTenantToken = await gateway.seedAndLogin(otherTenantId, 'other', [
      PERMISSIONS.WORKFORCE_PRIVILEGE_READ,
      PERMISSIONS.WORKFORCE_PRIVILEGE_WRITE,
    ])
    for (const [system, code] of [
      ['id.committee', 'komite_medik'],
      ['id.committee', 'komite_keperawatan'],
      ['id.profession', 'dokter'],
      ['id.profession', 'perawat'],
      ['id.specialty', 'bedah'],
      ['id.clinical-level', 'pk3'],
      ['id.evidence-type', 'logbook'],
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
    facilityId = (
      await workforce.facilities.create({
        tenant_id: tenantId,
        organization_id: new Types.ObjectId().toHexString(),
        code: 'rs-sehat',
        name: [{ locale: 'en', text: 'RS' }],
        address: null,
        timezone: 'Asia/Jakarta',
        holiday_calendar_codes: [],
        external_ids: [],
        status: 'active',
      })
    ).id
  })

  afterAll(async () => {
    await gateway.close()
  })

  it('refuses every route without a token (401) and without its own permission (403)', async () => {
    const id = new Types.ObjectId().toHexString()
    const routes: ['GET' | 'POST' | 'PATCH', string, object | undefined][] = [
      ['GET', '/v1/privileges', undefined],
      ['POST', '/v1/privileges', {}],
      ['GET', `/v1/privileges/${id}`, undefined],
      ['PATCH', `/v1/privileges/${id}`, {}],
      ['POST', `/v1/privileges/${id}/retire`, {}],
    ]
    for (const [method, url, payload] of routes) {
      expect((await call(method, url, undefined, payload)).status).toBe(401)
    }
    for (const [method, url, payload] of routes.filter(([method]) => method !== 'GET')) {
      expect((await call(method, url, readerToken, payload)).status).toBe(403)
    }
  })

  it('adds an item, reads it back, lists it, edits it and retires it', async () => {
    const created = await add({
      code: ' pd-900 ',
      description: text('Deskripsi'),
      minClinicalLevel: { system: 'id.clinical-level', code: 'pk3' },
      requiredEvidence: [
        {
          type: { system: 'id.evidence-type', code: 'logbook' },
          description: text('20 kasus'),
          mandatory: true,
        },
      ],
      externalCodes: [{ system: 'icd9cm', code: '38.93' }],
      facilityIds: [facilityId],
    })

    expect(created.status).toBe(201)
    const body = created.body as Record<string, any>
    expect(body).toMatchObject({
      code: 'PD-900',
      committee: { code: 'komite_medik' },
      professions: [{ code: 'dokter' }],
      min_clinical_level: { code: 'pk3' },
      required_evidence: [{ type: { code: 'logbook' }, mandatory: true }],
      external_codes: [{ system: 'icd9cm', code: '38.93' }],
      facility_ids: [facilityId],
      status: 'active',
    })
    expect(body).not.toHaveProperty('_id')
    const read = await call('GET', `/v1/privileges/${body.id}`, readerToken)
    const list = await call('GET', '/v1/privileges?committee=komite_medik&profession=dokter&status=active', readerToken)
    expect(read.status).toBe(200)
    expect((list.body as Record<string, any>[]).map((item) => item.id)).toContain(body.id)

    const edited = await call('PATCH', `/v1/privileges/${body.id}`, writerToken, {
      name: text('Nama baru'),
      minClinicalLevel: null,
      version: body.version,
    })
    expect(edited.status).toBe(200)
    expect(edited.body).toMatchObject({
      name: [{ text: 'Nama baru' }],
      min_clinical_level: null,
      code: 'PD-900',
    })
    const retired = await call('POST', `/v1/privileges/${body.id}/retire`, writerToken, {})
    expect(retired.status).toBe(201)
    expect(retired.body).toMatchObject({ status: 'retired' })
    const again = await call('PATCH', `/v1/privileges/${body.id}`, writerToken, { name: text('x') })
    expect(again.status).toBe(422)
    expect(again.body).toMatchObject({ code: 'privilege_retired' })
  })

  it('answers 404 for a missing, malformed or foreign id', async () => {
    const created = (await add()).body as Record<string, any>
    const unknown = new Types.ObjectId().toHexString()

    for (const id of [unknown, 'bad']) {
      expect((await call('GET', `/v1/privileges/${id}`, readerToken)).body).toMatchObject({
        code: 'privilege_not_found',
      })
      expect(
        (await call('PATCH', `/v1/privileges/${id}`, writerToken, { name: text('x') })).body,
      ).toMatchObject({ code: 'privilege_not_found' })
      expect(
        (await call('POST', `/v1/privileges/${id}/retire`, writerToken, {})).body,
      ).toMatchObject({ code: 'privilege_not_found' })
    }
    expect((await call('GET', `/v1/privileges/${created.id}`, otherTenantToken)).status).toBe(404)
  })

  it('answers 409 for a second item with the same code and for a stale version', async () => {
    const created = (await add({ code: 'PD-DUP' })).body as Record<string, any>

    const duplicate = await add({ code: 'pd-dup' })
    const stale = await call('PATCH', `/v1/privileges/${created.id}`, writerToken, {
      name: text('x'),
      version: created.version + 5,
    })

    expect(duplicate.status).toBe(409)
    expect(duplicate.body).toMatchObject({ code: 'privilege_exists' })
    expect(stale.status).toBe(409)
    expect(stale.body).toMatchObject({ code: 'stale_version' })
  })

  it('validates the request: 400 for shape, 422 for business rules, and list limits', async () => {
    expect((await call('POST', '/v1/privileges', writerToken, {})).status).toBe(400)
    expect((await add({ committee: 'komite_medik' })).status).toBe(400)
    expect((await add({ name: [{ locale: 'bad locale', text: 'x' }] })).status).toBe(400)
    expect((await add({ facilityIds: ['bad'] })).status).toBe(400)
    expect((await add({ professions: [] })).body).toMatchObject({ code: 'professions_required' })
    expect(
      (await add({ professions: [{ system: 'id.profession', code: 'nonsense' }] })).body,
    ).toMatchObject({ code: 'unknown_code' })
    expect(
      (await call('PATCH', `/v1/privileges/${new Types.ObjectId().toHexString()}`, writerToken, {})).status,
    ).toBe(404)
    const created = (await add()).body as Record<string, any>
    expect((await call('PATCH', `/v1/privileges/${created.id}`, writerToken, {})).body).toMatchObject({
      code: 'empty_update',
    })
    for (const query of ['limit=0', 'limit=101', 'offset=-1', 'status=gone', 'facilityId=bad']) {
      expect((await call('GET', `/v1/privileges?${query}`, readerToken)).status).toBe(400)
    }
  })

  it('writes no log entry when data is only read, except the access log of the request', async () => {
    const created = (await add()).body as Record<string, any>
    const { written, restore } = captureLogs()
    try {
      const replies = [
        await call('GET', '/v1/privileges', readerToken),
        await call('GET', `/v1/privileges/${created.id}`, readerToken),
        await call('GET', '/v1/privileges/missing-id', readerToken),
      ]
      expect(replies.map((reply) => reply.status)).toEqual([200, 200, 404])
      await vi.waitFor(() =>
        expect(
          written.filter((entry) => entry.event === 'http_request'),
        ).toHaveLength(replies.length),
      )

      expect(written.filter((entry) => entry.event !== 'http_request')).toEqual([])
    } finally {
      restore()
    }
  })

  it("logs one entry per write, without the item's values", async () => {
    const { written, restore } = captureLogs()
    try {
      const created = (
        await add({
          code: 'PD-LOG',
          name: text('Nama Rahasia'),
          reason: 'Alasan Rahasia',
        })
      ).body as Record<string, any>
      await call('PATCH', `/v1/privileges/${created.id}`, writerToken, {
        description: text('Deskripsi Rahasia'),
      })
      await call('POST', `/v1/privileges/${created.id}/retire`, writerToken, {
        reason: 'Catatan Rahasia',
      })
      await vi.waitFor(() =>
        expect(
          written.filter((entry) => entry.event === 'http_request'),
        ).toHaveLength(3),
      )

      const entries = written.filter((entry) => entry.event !== 'http_request')
      expect(entries.map((entry) => entry.event)).toEqual([
        'privilege_create',
        'privilege_update',
        'privilege_retire',
      ])
      for (const text of ['PD-LOG', 'Nama Rahasia', 'Deskripsi Rahasia', 'Alasan Rahasia', 'Catatan Rahasia']) {
        expect(JSON.stringify(written)).not.toContain(text)
      }
    } finally {
      restore()
    }
  })
})
