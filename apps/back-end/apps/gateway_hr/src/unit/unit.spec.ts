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
import { UnitManagementModule } from './unit-management.module'

describe('unit endpoints (in-memory repositories)', () => {
  const workforce: InMemoryWorkforce = createInMemoryWorkforce()
  let gateway: HrGateway
  let call: HrGateway['call']
  let writerToken: string
  let readerToken: string
  let otherTenantToken: string
  let facilityId: string

  /**
   * Adds a platform-wide code concept.
   *
   * @param system - Code system.
   * @param code - Code.
   * @param clinicalDefault - Value of `clinical_default`.
   * @param status - Concept status.
   */
  async function addConcept(
    system: string,
    code: string,
    clinicalDefault: boolean,
    status: 'active' | 'retired' = 'active',
  ) {
    await workforce.codeConcepts.create({
      system,
      code,
      display: [{ locale: 'en', text: code }],
      properties: { clinical_default: clinicalDefault },
      mappings: [],
      period: null,
      status,
    })
  }

  /**
   * Creates a facility through the API as the writer.
   *
   * @param code - Facility code.
   * @param token - Token of the caller.
   * @param organizationId - Organization of the facility.
   * @returns The created facility.
   */
  async function createFacility(
    code: string,
    token = writerToken,
    organizationId?: string,
  ): Promise<Record<string, any>> {
    const orgId =
      organizationId ??
      (
        (
          await call('POST', '/v1/organizations', token, {
            code: `org-${code}`,
            legalName: `PT ${code}`,
            country: 'ID',
            currency: 'IDR',
          })
        ).body as Record<string, any>
      ).id
    const reply = await call('POST', '/v1/facilities', token, {
      organizationId: orgId,
      code,
      name: [{ locale: 'id-ID', text: `RS ${code}` }],
      timezone: 'Asia/Jakarta',
    })
    expect(reply.status).toBe(201)
    return reply.body as Record<string, any>
  }

  /**
   * Creates a unit through the API as the writer.
   *
   * @param code - Unit code.
   * @param override - Fields that replace the defaults.
   * @returns The created unit.
   */
  async function createUnit(
    code: string,
    override: object = {},
  ): Promise<Record<string, any>> {
    const reply = await call('POST', '/v1/units', writerToken, {
      facilityId,
      code,
      name: [{ locale: 'id-ID', text: `Unit ${code}` }],
      type: { system: 'id.unit-type', code: 'department' },
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
    ]
    writerToken = await seedAndLogin(tenantId, 'writer', all)
    readerToken = await seedAndLogin(tenantId, 'reader', [
      PERMISSIONS.WORKFORCE_UNIT_READ,
    ])
    otherTenantToken = await seedAndLogin(otherTenantId, 'other-writer', all)
    await addConcept('id.unit-type', 'ward', true)
    await addConcept('id.unit-type', 'department', false)
    await addConcept('id.unit-type', 'old-type', false, 'retired')
    await addConcept('id.license-type', 'str', false)
    facilityId = (await createFacility('rs-sehat')).id
  })

  afterAll(async () => {
    await gateway.close()
  })

  it('refuses every route without a token (401) and without the permission (403)', async () => {
    const id = new Types.ObjectId().toHexString()
    const routes: ['GET' | 'POST' | 'PATCH', string, object | undefined][] = [
      ['GET', `/v1/units?facilityId=${facilityId}`, undefined],
      ['GET', `/v1/units/tree?facilityId=${facilityId}`, undefined],
      ['GET', `/v1/units/${id}`, undefined],
      ['POST', '/v1/units', {}],
      ['PATCH', `/v1/units/${id}`, {}],
      ['POST', `/v1/units/${id}/move`, { parentId: null }],
      ['POST', `/v1/units/${id}/close`, {}],
    ]
    for (const [method, url, payload] of routes) {
      expect((await call(method, url, undefined, payload)).status).toBe(401)
    }
    for (const [method, url, payload] of routes.filter(
      ([method]) => method !== 'GET',
    )) {
      expect((await call(method, url, readerToken, payload)).status).toBe(403)
    }
    const noUnitPermission = await gateway.seedAndLogin(
      gateway.tenantId,
      'facility-only',
      [PERMISSIONS.WORKFORCE_FACILITY_READ],
    )
    expect(
      (
        await call(
          'GET',
          `/v1/units?facilityId=${facilityId}`,
          noUnitPermission,
        )
      ).status,
    ).toBe(403)
    expect(
      (
        await call(
          'GET',
          `/v1/units/tree?facilityId=${facilityId}`,
          noUnitPermission,
        )
      ).status,
    ).toBe(403)
  })

  it('creates, reads, lists and edits a unit', async () => {
    const created = await createUnit('ward-a', {
      type: { system: 'id.unit-type', code: 'ward' },
      startDate: '2026-01-05',
      externalIds: [{ system: 'satusehat-location', value: 'loc-1' }],
    })
    expect(created).toMatchObject({
      facility_id: facilityId,
      code: 'ward-a',
      parent_id: null,
      ancestor_ids: [],
      is_clinical: true,
      status: 'active',
      period: { start: '2026-01-05', end: null },
    })
    expect(created).not.toHaveProperty('_id')
    expect(created).not.toHaveProperty('__v')
    expect(typeof created.organization_id).toBe('string')

    const read = await call('GET', `/v1/units/${created.id}`, readerToken)
    expect(read.status).toBe(200)
    expect(read.body).toMatchObject({ id: created.id, code: 'ward-a' })
    const list = await call(
      'GET',
      `/v1/units?facilityId=${facilityId}&limit=100`,
      readerToken,
    )
    expect(list.status).toBe(200)
    expect(
      list.body?.data.map((unit: { code: string }) => unit.code),
    ).toContain('ward-a')

    const edited = await call('PATCH', `/v1/units/${created.id}`, writerToken, {
      name: [{ locale: 'en', text: 'Ward A' }],
      isClinical: false,
      reason: 'Renamed',
    })
    expect(edited.status).toBe(200)
    expect(edited.body).toMatchObject({
      code: 'ward-a',
      is_clinical: false,
      version: created.version + 1,
    })
  })

  it('takes the clinical default from the type and lets the request override it', async () => {
    expect((await createUnit('dept-default')).is_clinical).toBe(false)
    expect(
      (await createUnit('dept-clinical', { isClinical: true })).is_clinical,
    ).toBe(true)
  })

  it('answers 404 unit_not_found for malformed, missing and foreign ids on every id route', async () => {
    const created = await createUnit('dept-private')
    const missing = new Types.ObjectId().toHexString()

    for (const id of ['missing-id', missing]) {
      expect(
        (await call('GET', `/v1/units/${id}`, readerToken)).body,
      ).toMatchObject({ code: 'unit_not_found' })
    }
    const calls = [
      call('GET', `/v1/units/${created.id}`, otherTenantToken),
      call('PATCH', `/v1/units/${created.id}`, otherTenantToken, {
        isClinical: true,
      }),
      call('POST', `/v1/units/${created.id}/move`, otherTenantToken, {
        parentId: null,
      }),
      call('POST', `/v1/units/${created.id}/close`, otherTenantToken, {}),
      call('PATCH', '/v1/units/missing-id', writerToken, { isClinical: true }),
    ]
    for (const reply of await Promise.all(calls)) {
      expect(reply.status).toBe(404)
      expect(reply.body).toMatchObject({ code: 'unit_not_found' })
    }
  })

  it('answers 422 for a foreign or missing facility and a foreign or missing parent, without telling which', async () => {
    const foreignFacility = await createFacility('rs-asing', otherTenantToken)
    const foreignUnit = (
      await call('POST', '/v1/units', otherTenantToken, {
        facilityId: foreignFacility.id,
        code: 'foreign-unit',
        name: [{ locale: 'en', text: 'X' }],
        type: { system: 'id.unit-type', code: 'department' },
      })
    ).body as Record<string, any>

    for (const id of [foreignFacility.id, new Types.ObjectId().toHexString()]) {
      const reply = await call('POST', '/v1/units', writerToken, {
        facilityId: id,
        code: 'x-unit',
        name: [{ locale: 'en', text: 'X' }],
        type: { system: 'id.unit-type', code: 'department' },
      })
      expect(reply.status).toBe(422)
      expect(reply.body).toMatchObject({ code: 'facility_not_found' })
    }
    for (const parentId of [
      foreignUnit.id,
      new Types.ObjectId().toHexString(),
    ]) {
      const reply = await call('POST', '/v1/units', writerToken, {
        facilityId,
        code: 'x-unit',
        name: [{ locale: 'en', text: 'X' }],
        type: { system: 'id.unit-type', code: 'department' },
        parentId,
      })
      expect(reply.status).toBe(422)
      expect(reply.body).toMatchObject({ code: 'parent_not_found' })
    }
  })

  it('validates types against the code concepts: unknown, retired and wrong-system types', async () => {
    const attempt = (type: object) =>
      call('POST', '/v1/units', writerToken, {
        facilityId,
        code: 'type-check',
        name: [{ locale: 'en', text: 'X' }],
        type,
      })

    expect(
      (await attempt({ system: 'id.unit-type', code: 'nope' })).body,
    ).toMatchObject({ code: 'unknown_code' })
    expect(
      (await attempt({ system: 'id.unit-type', code: 'old-type' })).body,
    ).toMatchObject({ code: 'code_retired' })
    const wrong = await attempt({ system: 'id.license-type', code: 'str' })
    expect(wrong.status).toBe(422)
    expect(wrong.body).toMatchObject({ code: 'invalid_type' })
  })

  it('answers 409 for a duplicate code in the facility, and allows it in another facility', async () => {
    await createUnit('dup-code')

    const again = await call('POST', '/v1/units', writerToken, {
      facilityId,
      code: 'dup-code',
      name: [{ locale: 'en', text: 'X' }],
      type: { system: 'id.unit-type', code: 'department' },
    })
    expect(again.status).toBe(409)
    expect(again.body).toMatchObject({ code: 'unit_exists' })

    const other = await createFacility('rs-lain')
    const sameCode = await call('POST', '/v1/units', writerToken, {
      facilityId: other.id,
      code: 'dup-code',
      name: [{ locale: 'en', text: 'X' }],
      type: { system: 'id.unit-type', code: 'department' },
    })
    expect(sameCode.status).toBe(201)
  })

  it('answers 400 for a malformed body and 422 for a business rule the DTO cannot see', async () => {
    const base = {
      facilityId,
      code: 'valid-code',
      name: [{ locale: 'en', text: 'X' }],
      type: { system: 'id.unit-type', code: 'department' },
    }
    for (const bad of [
      { ...base, facilityId: 'nope' },
      { ...base, name: [] },
      { ...base, type: undefined },
      { ...base, parentId: 'nope' },
      { ...base, isClinical: 'yes' },
      { ...base, startDate: '2026-02-30' },
    ]) {
      const reply = await call('POST', '/v1/units', writerToken, bad)
      expect([JSON.stringify(bad), reply.status]).toEqual([
        JSON.stringify(bad),
        400,
      ])
    }
    const badCode = await call('POST', '/v1/units', writerToken, {
      ...base,
      code: 'A',
    })
    expect(badCode.status).toBe(422)
    expect(badCode.body).toMatchObject({ code: 'invalid_code' })
  })

  it('ignores the facility, code, parent, status and period in a PATCH, and answers 422 empty_update when nothing else is sent', async () => {
    const top = await createUnit('patch-top')
    const created = await createUnit('patch-me', { parentId: top.id })

    const ignored = await call(
      'PATCH',
      `/v1/units/${created.id}`,
      writerToken,
      {
        isClinical: true,
        code: 'hacked',
        facilityId: new Types.ObjectId().toHexString(),
        parentId: null,
        status: 'closed',
        period: { start: '2000-01-01', end: '2000-02-01' },
      },
    )
    expect(ignored.status).toBe(200)
    expect(ignored.body).toMatchObject({
      code: 'patch-me',
      facility_id: facilityId,
      parent_id: top.id,
      status: 'active',
      period: created.period,
    })

    const empty = await call('PATCH', `/v1/units/${created.id}`, writerToken, {
      code: 'hacked',
    })
    expect(empty.status).toBe(422)
    expect(empty.body).toMatchObject({ code: 'empty_update' })
  })

  it('answers 409 stale_version for an old version', async () => {
    const created = await createUnit('stale-check')
    await call('PATCH', `/v1/units/${created.id}`, writerToken, {
      isClinical: true,
    })

    const stale = await call('PATCH', `/v1/units/${created.id}`, writerToken, {
      isClinical: false,
      version: created.version,
    })

    expect(stale.status).toBe(409)
    expect(stale.body).toMatchObject({ code: 'stale_version' })
  })

  it('moves a unit with its subtree and refuses cycles, the same parent and a missing parentId', async () => {
    const dir = await createUnit('mv-dir')
    const dept = await createUnit('mv-dept', { parentId: dir.id })
    const ward = await createUnit('mv-ward', { parentId: dept.id })
    const other = await createUnit('mv-other')

    const moved = await call('POST', `/v1/units/${dept.id}/move`, writerToken, {
      parentId: other.id,
      reason: 'Reorganization',
    })
    expect(moved.status).toBe(201)
    expect(moved.body).toMatchObject({
      parent_id: other.id,
      ancestor_ids: [other.id],
    })
    const below = await call('GET', `/v1/units/${ward.id}`, readerToken)
    expect(below.body?.ancestor_ids).toEqual([other.id, dept.id])
    const oldParentChildren = await call(
      'GET',
      `/v1/units?facilityId=${facilityId}&parentId=${dir.id}`,
      readerToken,
    )
    expect(oldParentChildren.body?.data).toEqual([])

    for (const parentId of [dept.id, ward.id]) {
      const cycle = await call(
        'POST',
        `/v1/units/${dept.id}/move`,
        writerToken,
        {
          parentId,
        },
      )
      expect(cycle.status).toBe(422)
      expect(cycle.body).toMatchObject({ code: 'unit_cycle' })
    }
    const same = await call('POST', `/v1/units/${dept.id}/move`, writerToken, {
      parentId: other.id,
    })
    expect(same.body).toMatchObject({ code: 'same_parent' })
    const toTop = await call('POST', `/v1/units/${dept.id}/move`, writerToken, {
      parentId: null,
    })
    expect(toTop.body).toMatchObject({ parent_id: null, ancestor_ids: [] })
    for (const bad of [{}, { parentId: 'nope' }, { parentId: 5 }]) {
      expect(
        (await call('POST', `/v1/units/${dept.id}/move`, writerToken, bad))
          .status,
      ).toBe(400)
    }
    const stale = await call('POST', `/v1/units/${dept.id}/move`, writerToken, {
      parentId: other.id,
      version: 0,
    })
    expect(stale.status).toBe(409)
    expect(stale.body).toMatchObject({ code: 'stale_version' })
  })

  it('closes a unit, refuses active children (409 unit_in_use), and keeps a closed unit readable but unchangeable', async () => {
    const dir = await createUnit('cl-dir', { startDate: '2026-01-01' })
    const dept = await createUnit('cl-dept', { parentId: dir.id })

    const blocked = await call(
      'POST',
      `/v1/units/${dir.id}/close`,
      writerToken,
      {},
    )
    expect(blocked.status).toBe(409)
    expect(blocked.body).toMatchObject({ code: 'unit_in_use' })

    expect(
      (await call('POST', `/v1/units/${dept.id}/close`, writerToken, {}))
        .status,
    ).toBe(201)
    const closed = await call(
      'POST',
      `/v1/units/${dir.id}/close`,
      writerToken,
      {
        endDate: '2026-06-30',
        reason: 'Merged',
      },
    )
    expect(closed.body).toMatchObject({
      status: 'closed',
      period: { start: '2026-01-01', end: '2026-06-30' },
    })

    expect((await call('GET', `/v1/units/${dir.id}`, readerToken)).status).toBe(
      200,
    )
    for (const [method, url, payload] of [
      ['PATCH', `/v1/units/${dir.id}`, { isClinical: true }],
      ['POST', `/v1/units/${dir.id}/move`, { parentId: null }],
      ['POST', `/v1/units/${dir.id}/close`, {}],
    ] as const) {
      const reply = await call(method, url, writerToken, payload)
      expect(reply.status).toBe(422)
      expect(reply.body).toMatchObject({ code: 'unit_closed' })
    }
    const child = await call('POST', '/v1/units', writerToken, {
      facilityId,
      code: 'cl-child',
      name: [{ locale: 'en', text: 'X' }],
      type: { system: 'id.unit-type', code: 'department' },
      parentId: dir.id,
    })
    expect(child.body).toMatchObject({ code: 'parent_closed' })
    expect(
      (
        await call('POST', `/v1/units/${dept.id}/close`, writerToken, {
          endDate: 'soon',
        })
      ).status,
    ).toBe(400)
  })

  it('refuses a facility deactivation while it has an active unit, and allows it after the units are closed', async () => {
    const facility = await createFacility('rs-tutup')
    const unit = (
      await call('POST', '/v1/units', writerToken, {
        facilityId: facility.id,
        code: 'only-unit',
        name: [{ locale: 'en', text: 'X' }],
        type: { system: 'id.unit-type', code: 'department' },
      })
    ).body as Record<string, any>

    const blocked = await call(
      'PATCH',
      `/v1/facilities/${facility.id}`,
      writerToken,
      {
        status: 'inactive',
      },
    )
    expect(blocked.status).toBe(409)
    expect(blocked.body).toMatchObject({ code: 'facility_in_use' })

    await call('POST', `/v1/units/${unit.id}/close`, writerToken, {})
    const allowed = await call(
      'PATCH',
      `/v1/facilities/${facility.id}`,
      writerToken,
      {
        status: 'inactive',
      },
    )
    expect(allowed.status).toBe(200)
    const inactive = await call('POST', '/v1/units', writerToken, {
      facilityId: facility.id,
      code: 'late-unit',
      name: [{ locale: 'en', text: 'X' }],
      type: { system: 'id.unit-type', code: 'department' },
    })
    expect(inactive.body).toMatchObject({ code: 'facility_inactive' })
  })

  it('requires facilityId on the list and the tree, and answers an empty result for a foreign facility', async () => {
    expect((await call('GET', '/v1/units', readerToken)).status).toBe(400)
    expect((await call('GET', '/v1/units/tree', readerToken)).status).toBe(400)
    expect(
      (await call('GET', '/v1/units?facilityId=nope', readerToken)).status,
    ).toBe(400)
    const foreign = await createFacility('rs-pihak-lain', otherTenantToken)

    const list = await call(
      'GET',
      `/v1/units?facilityId=${foreign.id}`,
      readerToken,
    )
    const tree = await call(
      'GET',
      `/v1/units/tree?facilityId=${foreign.id}`,
      readerToken,
    )

    expect(list.status).toBe(200)
    expect(list.body?.data).toEqual([])
    expect(tree.status).toBe(200)
    expect(tree.body).toEqual([])
  })

  it('rejects list limits outside 1 to 100, a bad status and a malformed filter', async () => {
    for (const query of [
      'limit=0',
      'limit=101',
      'limit=abc',
      'offset=-1',
      'status=open',
      'parentId=nope',
    ]) {
      expect(
        (
          await call(
            'GET',
            `/v1/units?facilityId=${facilityId}&${query}`,
            readerToken,
          )
        ).status,
      ).toBe(400)
    }
  })

  it('answers the chart as nested nodes, honours rootId and includeClosed, and keeps tree out of the id route', async () => {
    const facility = await createFacility('rs-pohon')
    const make = async (code: string, parentId?: string) =>
      (
        await call('POST', '/v1/units', writerToken, {
          facilityId: facility.id,
          code,
          name: [{ locale: 'en', text: code }],
          type: { system: 'id.unit-type', code: 'department' },
          parentId,
        })
      ).body as Record<string, any>
    const dir = await make('t-dir')
    const dept = await make('t-dept', dir.id)
    const ward = await make('t-ward', dept.id)
    await make('t-dir-2')
    await call('POST', `/v1/units/${ward.id}/close`, writerToken, {})

    const tree = await call(
      'GET',
      `/v1/units/tree?facilityId=${facility.id}`,
      readerToken,
    )
    expect(tree.status).toBe(200)
    expect(tree.body?.map((node: { code: string }) => node.code)).toEqual([
      't-dir',
      't-dir-2',
    ])
    expect(tree.body?.[0].children[0].children).toEqual([])
    expect(Object.keys(tree.body?.[0]).sort()).toEqual(
      [
        'children',
        'code',
        'id',
        'is_clinical',
        'name',
        'status',
        'type',
      ].sort(),
    )

    const full = await call(
      'GET',
      `/v1/units/tree?facilityId=${facility.id}&includeClosed=true`,
      readerToken,
    )
    expect(full.body?.[0].children[0].children[0]).toMatchObject({
      code: 't-ward',
      status: 'closed',
    })
    const sub = await call(
      'GET',
      `/v1/units/tree?facilityId=${facility.id}&rootId=${dept.id}`,
      readerToken,
    )
    expect(sub.body).toHaveLength(1)
    expect(sub.body?.[0]).toMatchObject({ code: 't-dept' })
    expect(
      (
        await call(
          'GET',
          `/v1/units/tree?facilityId=${facility.id}&includeClosed=maybe`,
          readerToken,
        )
      ).status,
    ).toBe(400)
    expect(
      (
        await call(
          'GET',
          `/v1/units/tree?facilityId=${facilityId}&rootId=${dept.id}`,
          readerToken,
        )
      ).body,
    ).toMatchObject({ code: 'unit_not_found' })
  })

  it('writes no log entry when data is only read, except the access log of the request', async () => {
    const created = await createUnit('read-only-check')
    const { written, restore } = captureLogs()
    try {
      const replies = [
        await call('GET', `/v1/units?facilityId=${facilityId}`, readerToken),
        await call(
          'GET',
          `/v1/units/tree?facilityId=${facilityId}`,
          readerToken,
        ),
        await call('GET', `/v1/units/${created.id}`, readerToken),
        await call('GET', '/v1/units/missing-id', readerToken),
      ]
      expect(replies.map((reply) => reply.status)).toEqual([200, 200, 200, 404])
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

  it("logs one entry per write, without the unit's values", async () => {
    const { written, restore } = captureLogs()
    try {
      const created = await call('POST', '/v1/units', writerToken, {
        facilityId,
        code: 'log-check',
        name: [{ locale: 'id-ID', text: 'Unit Rahasia Nama' }],
        type: { system: 'id.unit-type', code: 'department' },
        externalIds: [{ system: 'satusehat-location', value: 'loc-9998887' }],
      })
      await call('POST', `/v1/units/${created.body?.id}/close`, writerToken, {
        reason: 'Alasan Rahasia',
      })
      await vi.waitFor(() =>
        expect(
          written.filter((entry) => entry.event === 'http_request'),
        ).toHaveLength(2),
      )

      expect(
        written.filter((entry) => entry.event === 'unit_create'),
      ).toHaveLength(1)
      expect(
        written.filter((entry) => entry.event === 'unit_close'),
      ).toHaveLength(1)
      const text = JSON.stringify(written)
      for (const secret of [
        'Rahasia',
        'log-check',
        'loc-9998887',
        'satusehat-location',
      ]) {
        expect(text).not.toContain(secret)
      }
    } finally {
      restore()
    }
  })
})
