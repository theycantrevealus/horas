import { Logger } from '@nestjs/common'
import { Types } from 'mongoose'
import { PERMISSIONS } from '@identity/permission'
import { createHrGateway, type HrGateway } from '../testing/hr-gateway'
import {
  createInMemoryWorkforce,
  type InMemoryWorkforce,
} from '../testing/in-memory-workforce'
import { OrganizationManagementModule } from '../organization/organization-management.module'
import { FacilityManagementModule } from './facility-management.module'

describe('facility endpoints (in-memory repositories)', () => {
  const workforce: InMemoryWorkforce = createInMemoryWorkforce()
  let gateway: HrGateway
  let call: HrGateway['call']
  let writerToken: string
  let readerToken: string
  let otherTenantToken: string
  let organizationId: string

  /**
   * Creates an organization through the API as the writer.
   *
   * @param code - Organization code.
   * @param token - Token of the caller.
   * @returns The created organization.
   */
  async function createOrganization(
    code: string,
    token = writerToken,
  ): Promise<Record<string, any>> {
    const reply = await call('POST', '/v1/organizations', token, {
      code,
      legalName: `PT ${code}`,
      country: 'ID',
      currency: 'IDR',
    })
    expect(reply.status).toBe(201)
    return reply.body as Record<string, any>
  }

  /**
   * Creates a facility through the API as the writer.
   *
   * @param code - Facility code.
   * @param override - Fields that replace the defaults.
   * @returns The created facility.
   */
  async function createFacility(
    code: string,
    override: object = {},
  ): Promise<Record<string, any>> {
    const reply = await call('POST', '/v1/facilities', writerToken, {
      organizationId,
      code,
      name: [{ locale: 'id-ID', text: `RS ${code}` }],
      timezone: 'Asia/Jakarta',
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
      modules: [OrganizationManagementModule, FacilityManagementModule],
      ...workforce.options,
    })
    call = gateway.call
    const { tenantId, otherTenantId, seedAndLogin } = gateway
    writerToken = await seedAndLogin(tenantId, 'writer', [
      PERMISSIONS.WORKFORCE_ORGANIZATION_READ,
      PERMISSIONS.WORKFORCE_ORGANIZATION_WRITE,
      PERMISSIONS.WORKFORCE_FACILITY_READ,
      PERMISSIONS.WORKFORCE_FACILITY_WRITE,
    ])
    readerToken = await seedAndLogin(tenantId, 'reader', [
      PERMISSIONS.WORKFORCE_FACILITY_READ,
    ])
    otherTenantToken = await seedAndLogin(otherTenantId, 'other-writer', [
      PERMISSIONS.WORKFORCE_ORGANIZATION_READ,
      PERMISSIONS.WORKFORCE_ORGANIZATION_WRITE,
      PERMISSIONS.WORKFORCE_FACILITY_READ,
      PERMISSIONS.WORKFORCE_FACILITY_WRITE,
    ])
    organizationId = (await createOrganization('rs-group')).id
  })

  afterAll(async () => {
    await gateway.close()
  })

  it('refuses every route without a token (401) and without the permission (403)', async () => {
    expect((await call('GET', '/v1/facilities')).status).toBe(401)
    expect((await call('POST', '/v1/facilities', undefined, {})).status).toBe(
      401,
    )
    expect(
      (
        await call('POST', '/v1/facilities', readerToken, {
          organizationId,
          code: 'denied',
          name: [{ locale: 'en', text: 'X' }],
          timezone: 'Asia/Jakarta',
        })
      ).status,
    ).toBe(403)
    expect(
      (
        await call(
          'PATCH',
          `/v1/facilities/${new Types.ObjectId().toHexString()}`,
          readerToken,
          { status: 'inactive' },
        )
      ).status,
    ).toBe(403)
    const noFacilityPermission = await gateway.seedAndLogin(
      gateway.tenantId,
      'org-only',
      [PERMISSIONS.WORKFORCE_ORGANIZATION_READ],
    )
    expect(
      (await call('GET', '/v1/facilities', noFacilityPermission)).status,
    ).toBe(403)
  })

  it('creates, reads, lists and edits a facility', async () => {
    const created = await createFacility('rs-sehat-jkt', {
      timezone: 'asia/jakarta',
      address: {
        use: 'work',
        lines: ['Jl. Sehat No. 1'],
        admin_levels: [{ level: 1, code: '31.74', name: 'Jakarta Selatan' }],
        subdivision: 'ID-JK',
        country: 'ID',
      },
      holidayCalendarCodes: ['id-national'],
      externalIds: [{ system: 'id.kemenkes-facility', value: '3174001' }],
    })
    expect(created).toMatchObject({
      organization_id: organizationId,
      code: 'rs-sehat-jkt',
      timezone: 'Asia/Jakarta',
      status: 'active',
      holiday_calendar_codes: ['id-national'],
      address: { country: 'ID', subdivision: 'ID-JK' },
    })
    expect(created).not.toHaveProperty('_id')
    expect(created).not.toHaveProperty('__v')

    const read = await call('GET', `/v1/facilities/${created.id}`, readerToken)
    expect(read.status).toBe(200)
    expect(read.body).toMatchObject({ id: created.id, code: 'rs-sehat-jkt' })
    const list = await call('GET', '/v1/facilities?limit=100', readerToken)
    expect(list.status).toBe(200)
    expect(
      list.body?.data.map((item: { code: string }) => item.code),
    ).toContain('rs-sehat-jkt')

    const edited = await call(
      'PATCH',
      `/v1/facilities/${created.id}`,
      writerToken,
      {
        name: [
          { locale: 'id-ID', text: 'RS Sehat Raya' },
          { locale: 'en', text: 'Sehat Raya Hospital' },
        ],
        reason: 'Renamed',
      },
    )
    expect(edited.status).toBe(200)
    expect(edited.body?.name).toHaveLength(2)
    expect(edited.body).toMatchObject({
      code: 'rs-sehat-jkt',
      timezone: 'Asia/Jakarta',
    })
  })

  it('sets and clears the address with an edit', async () => {
    const created = await createFacility('address-edit')

    const set = await call(
      'PATCH',
      `/v1/facilities/${created.id}`,
      writerToken,
      {
        address: {
          use: 'work',
          lines: ['Jl. Baru'],
          admin_levels: [],
          country: 'ID',
        },
      },
    )
    expect(set.body?.address).toMatchObject({
      lines: ['Jl. Baru'],
      country: 'ID',
    })
    const cleared = await call(
      'PATCH',
      `/v1/facilities/${created.id}`,
      writerToken,
      { address: null },
    )
    expect(cleared.status).toBe(200)
    expect(cleared.body?.address).toBeNull()
  })

  describe('the organization of a new facility (HR plan F1)', () => {
    it("answers 422 for another tenant's organization, without revealing it exists", async () => {
      const foreign = await createOrganization('foreign-org', otherTenantToken)
      const missing = new Types.ObjectId().toHexString()

      const reply = await call('POST', '/v1/facilities', writerToken, {
        organizationId: foreign.id,
        code: 'foreign-site',
        name: [{ locale: 'en', text: 'X' }],
        timezone: 'Asia/Jakarta',
      })
      const absent = await call('POST', '/v1/facilities', writerToken, {
        organizationId: missing,
        code: 'absent-site',
        name: [{ locale: 'en', text: 'X' }],
        timezone: 'Asia/Jakarta',
      })

      expect(reply.status).toBe(422)
      expect(reply.body).toMatchObject({ code: 'organization_not_found' })
      expect(absent.status).toBe(422)
      expect(absent.body).toMatchObject({ code: 'organization_not_found' })
      expect(reply.body?.message).toBe(absent.body?.message)
    })

    it('answers 400 for a malformed organization id', async () => {
      const reply = await call('POST', '/v1/facilities', writerToken, {
        organizationId: 'not-an-id',
        code: 'bad-org-id',
        name: [{ locale: 'en', text: 'X' }],
        timezone: 'Asia/Jakarta',
      })

      expect(reply.status).toBe(400)
    })

    it('answers 422 for an inactive organization', async () => {
      const inactive = await createOrganization('rs-inactive')
      await call('PATCH', `/v1/organizations/${inactive.id}`, writerToken, {
        status: 'inactive',
      })

      const reply = await call('POST', '/v1/facilities', writerToken, {
        organizationId: inactive.id,
        code: 'inactive-site',
        name: [{ locale: 'en', text: 'X' }],
        timezone: 'Asia/Jakarta',
      })

      expect(reply.status).toBe(422)
      expect(reply.body).toMatchObject({ code: 'organization_inactive' })
    })

    it('answers 422 for a soft-deleted organization', async () => {
      const deleted = await createOrganization('rs-deleted')
      await workforce.organizations.deleteSoft(deleted.id)

      const reply = await call('POST', '/v1/facilities', writerToken, {
        organizationId: deleted.id,
        code: 'deleted-site',
        name: [{ locale: 'en', text: 'X' }],
        timezone: 'Asia/Jakarta',
      })

      expect(reply.status).toBe(422)
      expect(reply.body).toMatchObject({ code: 'organization_not_found' })
    })
  })

  it('refuses to set an organization inactive while it has an active facility, and allows it afterwards (HR plan F9)', async () => {
    const organization = await createOrganization('rs-in-use')
    const facility = await createFacility('in-use-site', {
      organizationId: organization.id,
    })

    const refused = await call(
      'PATCH',
      `/v1/organizations/${organization.id}`,
      writerToken,
      { status: 'inactive' },
    )
    expect(refused.status).toBe(409)
    expect(refused.body).toMatchObject({ code: 'organization_in_use' })

    await call('PATCH', `/v1/facilities/${facility.id}`, writerToken, {
      status: 'inactive',
    })
    const allowed = await call(
      'PATCH',
      `/v1/organizations/${organization.id}`,
      writerToken,
      { status: 'inactive' },
    )
    expect(allowed.status).toBe(200)
    expect(allowed.body).toMatchObject({ status: 'inactive' })
  })

  it("answers 404 for a malformed id, a missing id and another tenant's facility", async () => {
    const created = await createFacility('tenant-one-site')

    expect(
      (await call('GET', '/v1/facilities/not-an-id', readerToken)).status,
    ).toBe(404)
    expect(
      (
        await call(
          'GET',
          `/v1/facilities/${new Types.ObjectId().toHexString()}`,
          readerToken,
        )
      ).status,
    ).toBe(404)
    const foreign = await call(
      'GET',
      `/v1/facilities/${created.id}`,
      otherTenantToken,
    )
    expect(foreign.status).toBe(404)
    expect(foreign.body).toMatchObject({ code: 'facility_not_found' })
    expect(
      (
        await call('PATCH', `/v1/facilities/${created.id}`, otherTenantToken, {
          status: 'inactive',
        })
      ).status,
    ).toBe(404)
    expect(
      (await call('GET', `/v1/facilities/${created.id}`, readerToken)).body,
    ).toMatchObject({ status: 'active' })
  })

  it("lists only the signed-in tenant's facilities, and filters by organization and status", async () => {
    const second = await createOrganization('rs-second')
    await createFacility('only-mine')
    await createFacility('second-site', { organizationId: second.id })
    const foreignOrganization = await createOrganization(
      'rs-theirs',
      otherTenantToken,
    )
    const foreignFacility = await call(
      'POST',
      '/v1/facilities',
      otherTenantToken,
      {
        organizationId: foreignOrganization.id,
        code: 'only-theirs',
        name: [{ locale: 'en', text: 'Theirs' }],
        timezone: 'Asia/Singapore',
      },
    )
    expect(foreignFacility.status).toBe(201)

    const mine = await call('GET', '/v1/facilities?limit=100', readerToken)
    const bySecond = await call(
      'GET',
      `/v1/facilities?organizationId=${second.id}`,
      readerToken,
    )
    const theirs = await call(
      'GET',
      '/v1/facilities?limit=100',
      otherTenantToken,
    )

    const mineCodes = mine.body?.data.map((item: { code: string }) => item.code)
    expect(mineCodes).toContain('only-mine')
    expect(mineCodes).not.toContain('only-theirs')
    expect(
      bySecond.body?.data.map((item: { code: string }) => item.code),
    ).toEqual(['second-site'])
    expect(
      theirs.body?.data.map((item: { code: string }) => item.code),
    ).toEqual(['only-theirs'])
  })

  it('answers 409 for a duplicate code, and allows the same code in another tenant', async () => {
    await createFacility('shared-code')

    const duplicate = await call('POST', '/v1/facilities', writerToken, {
      organizationId,
      code: 'shared-code',
      name: [{ locale: 'en', text: 'Again' }],
      timezone: 'Asia/Jakarta',
    })
    expect(duplicate.status).toBe(409)
    expect(duplicate.body).toMatchObject({ code: 'facility_exists' })

    const foreignOrganization = await createOrganization(
      'rs-shared',
      otherTenantToken,
    )
    const otherTenant = await call('POST', '/v1/facilities', otherTenantToken, {
      organizationId: foreignOrganization.id,
      code: 'shared-code',
      name: [{ locale: 'en', text: 'Elsewhere' }],
      timezone: 'Asia/Jakarta',
    })
    expect(otherTenant.status).toBe(201)
  })

  it('answers 409 stale_version for an edit based on an old version', async () => {
    const created = await createFacility('versioned')
    await call('PATCH', `/v1/facilities/${created.id}`, writerToken, {
      holidayCalendarCodes: ['one-cal'],
    })

    const stale = await call(
      'PATCH',
      `/v1/facilities/${created.id}`,
      writerToken,
      {
        holidayCalendarCodes: ['two-cal'],
        version: created.version,
      },
    )

    expect(stale.status).toBe(409)
    expect(stale.body).toMatchObject({ code: 'stale_version' })
    expect(
      (await call('GET', `/v1/facilities/${created.id}`, readerToken)).body
        ?.holiday_calendar_codes,
    ).toEqual(['one-cal'])
  })

  it.each([
    ['unknown time zone', { timezone: 'Mars/Base' }, 422, 'invalid_timezone'],
    [
      'offset instead of a zone',
      { timezone: '+07:00' },
      422,
      'invalid_timezone',
    ],
    ['code with capitals', { code: 'RS-Sehat' }, 422, 'invalid_code'],
    [
      'address with an unknown country',
      { address: { use: 'work', lines: [], admin_levels: [], country: 'XX' } },
      422,
      'invalid_address',
    ],
    [
      'repeated language in names',
      {
        name: [
          { locale: 'en', text: 'a' },
          { locale: 'EN', text: 'b' },
        ],
      },
      422,
      'invalid_name',
    ],
    [
      'repeated holiday calendar',
      { holidayCalendarCodes: ['id-national', 'id-national'] },
      422,
      'invalid_holiday_calendars',
    ],
    ['no name', { name: [] }, 400, undefined],
    [
      'lower-case address country',
      { address: { use: 'work', lines: [], admin_levels: [], country: 'id' } },
      400,
      undefined,
    ],
    [
      'six address lines',
      {
        address: {
          use: 'work',
          lines: ['a', 'b', 'c', 'd', 'e', 'f'],
          admin_levels: [],
          country: 'ID',
        },
      },
      400,
      undefined,
    ],
    [
      '21 external ids',
      {
        externalIds: Array.from({ length: 21 }, (_, i) => ({
          system: `s${i}`,
          value: 'v',
        })),
      },
      400,
      undefined,
    ],
  ])('rejects a create with %s', async (_name, override, status, code) => {
    const reply = await call('POST', '/v1/facilities', writerToken, {
      organizationId,
      code: 'bad-input',
      name: [{ locale: 'en', text: 'Bad' }],
      timezone: 'Asia/Jakarta',
      ...override,
    })

    expect(reply.status).toBe(status)
    if (code) {
      expect(reply.body).toMatchObject({ code })
    }
  })

  it('rejects an empty edit, and ignores organization, code and time zone in an edit body', async () => {
    const created = await createFacility('immutable')
    const other = await createOrganization('rs-other')

    const empty = await call(
      'PATCH',
      `/v1/facilities/${created.id}`,
      writerToken,
      {},
    )
    expect(empty.status).toBe(422)
    expect(empty.body).toMatchObject({ code: 'empty_update' })
    const onlyImmutable = await call(
      'PATCH',
      `/v1/facilities/${created.id}`,
      writerToken,
      {
        code: 'changed',
        timezone: 'Asia/Jayapura',
        organizationId: other.id,
      },
    )
    expect(onlyImmutable.status).toBe(422)
    expect(
      (await call('GET', `/v1/facilities/${created.id}`, readerToken)).body,
    ).toMatchObject({
      code: 'immutable',
      timezone: 'Asia/Jakarta',
      organization_id: organizationId,
    })
  })

  it.each([
    'limit=0',
    'limit=101',
    'limit=-1',
    'offset=-1',
    'status=archived',
    'organizationId=not-an-id',
  ])('rejects the list query %s instead of clamping it', async (query) => {
    expect(
      (await call('GET', `/v1/facilities?${query}`, readerToken)).status,
    ).toBe(400)
  })

  it('keeps an inactive facility listed and readable', async () => {
    const created = await createFacility('goes-inactive')
    const edited = await call(
      'PATCH',
      `/v1/facilities/${created.id}`,
      writerToken,
      { status: 'inactive' },
    )
    expect(edited.status).toBe(200)

    const listed = await call(
      'GET',
      '/v1/facilities?status=inactive&limit=100',
      readerToken,
    )
    expect(
      listed.body?.data.map((item: { code: string }) => item.code),
    ).toContain('goes-inactive')
    expect(
      (await call('GET', `/v1/facilities/${created.id}`, readerToken)).body,
    ).toMatchObject({ status: 'inactive' })
  })

  it('writes no log entry when data is only read, except the access log of the request', async () => {
    const created = await createFacility('read-only-check')
    const { written, restore } = captureLogs()
    try {
      const replies = [
        await call('GET', '/v1/facilities?limit=10', readerToken),
        await call('GET', `/v1/facilities/${created.id}`, readerToken),
        await call('GET', '/v1/facilities/missing-id', readerToken),
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

  it("logs one entry per write, without the facility's values", async () => {
    const { written, restore } = captureLogs()
    try {
      await call('POST', '/v1/facilities', writerToken, {
        organizationId,
        code: 'log-check',
        name: [{ locale: 'id-ID', text: 'RS Rahasia Nama' }],
        timezone: 'Asia/Jakarta',
        address: {
          use: 'work',
          lines: ['Jl. Rahasia 99'],
          admin_levels: [],
          country: 'ID',
        },
        externalIds: [{ system: 'id.kemenkes-facility', value: '9998887' }],
      })
      await vi.waitFor(() =>
        expect(written.some((entry) => entry.event === 'http_request')).toBe(
          true,
        ),
      )

      const writes = written.filter(
        (entry) => entry.event === 'facility_create',
      )
      expect(writes).toHaveLength(1)
      expect(writes[0]).toMatchObject({
        outcome: 'success',
        operation: 'FacilityService.create',
      })
      expect(JSON.stringify(written)).not.toContain('Rahasia')
      expect(JSON.stringify(written)).not.toContain('9998887')
    } finally {
      restore()
    }
  })
})
