import { Types } from 'mongoose'
import {
  getRequestContext,
  runWithRequestContext,
} from '@utility/logger/context'
import { type AppLogger } from '@utility/logger/service'
import {
  InMemoryFacilities,
  InMemoryOrganizations,
  InMemoryOrganizationUnits,
} from '../testing/in-memory'
import { NotFoundError } from '../workforce.error'
import { FacilityService } from './facility.service'

describe('FacilityService', () => {
  const tenantId = new Types.ObjectId().toHexString()
  const otherTenantId = new Types.ObjectId().toHexString()
  const log = vi.fn()
  const warn = vi.fn()
  const error = vi.fn()
  const debug = vi.fn()
  let facilities: InMemoryFacilities
  let organizations: InMemoryOrganizations
  let units: InMemoryOrganizationUnits
  let service: FacilityService
  let organizationId: string

  const input = () => ({
    organizationId,
    code: 'rs-sehat-jkt',
    name: [{ locale: 'id-ID', text: 'RS Sehat Jakarta' }],
    timezone: 'Asia/Jakarta',
  })

  /**
   * Runs `work` as a signed-in request.
   *
   * @param work - Code to run.
   * @returns What `work` returns.
   */
  function asAdmin<T>(work: () => Promise<T>): Promise<T> {
    return runWithRequestContext(
      {
        correlationId: 'c1',
        actor: { account_id: 'a1', display_name: 'Admin', kind: 'account' },
      },
      work,
    )
  }

  /**
   * Adds an organization to a tenant.
   *
   * @param tenant - Tenant of the organization.
   * @param code - Organization code.
   * @param status - Organization status.
   * @returns The organization.
   */
  function addOrganization(
    tenant: string,
    code: string,
    status: 'active' | 'inactive' = 'active',
  ) {
    return asAdmin(() =>
      organizations.create({
        tenant_id: tenant,
        code,
        legal_name: `PT ${code}`,
        country: 'ID',
        identifiers: [],
        currency: 'IDR',
        status,
      }),
    )
  }

  beforeEach(async () => {
    vi.resetAllMocks()
    facilities = new InMemoryFacilities()
    organizations = new InMemoryOrganizations()
    units = new InMemoryOrganizationUnits()
    service = new FacilityService(facilities, organizations, units, {
      log,
      warn,
      error,
      debug,
    } as unknown as AppLogger)
    organizationId = (await addOrganization(tenantId, 'rs-group')).id
  })

  it('creates an active facility with trimmed values and a canonical time zone, and logs one success entry without values', async () => {
    const created = await asAdmin(() =>
      service.create(tenantId, {
        ...input(),
        name: [{ locale: ' id-ID ', text: '  RS Sehat Jakarta ' }],
        timezone: 'asia/jakarta',
      }),
    )

    expect(created).toMatchObject({
      tenant_id: tenantId,
      organization_id: organizationId,
      code: 'rs-sehat-jkt',
      name: [{ locale: 'id-ID', text: 'RS Sehat Jakarta' }],
      timezone: 'Asia/Jakarta',
      address: null,
      holiday_calendar_codes: [],
      external_ids: [],
      status: 'active',
    })
    expect(log).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(log.mock.calls)).not.toContain('Sehat')
  })

  it('stores a cleaned address, holiday calendars and external ids', async () => {
    const created = await asAdmin(() =>
      service.create(tenantId, {
        ...input(),
        address: {
          use: 'work',
          lines: [' Jl. Sehat No. 1 '],
          admin_levels: [],
          subdivision: 'ID-JK',
          country: 'ID',
        },
        holidayCalendarCodes: ['id-national', 'id-jk'],
        externalIds: [{ system: ' id.kemenkes-facility ', value: ' 3174001 ' }],
      }),
    )

    expect(created.address).toEqual({
      use: 'work',
      lines: ['Jl. Sehat No. 1'],
      admin_levels: [],
      subdivision: 'ID-JK',
      country: 'ID',
    })
    expect(created.holiday_calendar_codes).toEqual(['id-national', 'id-jk'])
    expect(created.external_ids).toEqual([
      { system: 'id.kemenkes-facility', value: '3174001' },
    ])
  })

  describe('the organization of a new facility (HR plan F1)', () => {
    it('must exist in the tenant', async () => {
      await expect(
        asAdmin(() =>
          service.create(tenantId, {
            ...input(),
            organizationId: new Types.ObjectId().toHexString(),
          }),
        ),
      ).rejects.toMatchObject({ code: 'organization_not_found' })
    })

    it('gives the same answer for an organization of another tenant, without leaking it', async () => {
      const foreign = await addOrganization(otherTenantId, 'foreign-org')

      await expect(
        asAdmin(() =>
          service.create(tenantId, { ...input(), organizationId: foreign.id }),
        ),
      ).rejects.toMatchObject({ code: 'organization_not_found' })
    })

    it('must not be soft-deleted', async () => {
      await organizations.deleteSoft(organizationId)

      await expect(
        asAdmin(() => service.create(tenantId, input())),
      ).rejects.toMatchObject({ code: 'organization_not_found' })
    })

    it('must be active', async () => {
      const inactive = await addOrganization(tenantId, 'rs-closed', 'inactive')

      await expect(
        asAdmin(() =>
          service.create(tenantId, { ...input(), organizationId: inactive.id }),
        ),
      ).rejects.toMatchObject({ code: 'organization_inactive' })
    })

    it('accepts a malformed identifier as not found, never as a server error', async () => {
      await expect(
        asAdmin(() =>
          service.create(tenantId, { ...input(), organizationId: 'not-an-id' }),
        ),
      ).rejects.toMatchObject({ code: 'organization_not_found' })
    })
  })

  it('rejects a second facility with the same code in a tenant, but allows it in another tenant', async () => {
    await asAdmin(() => service.create(tenantId, input()))
    const foreign = await addOrganization(otherTenantId, 'foreign-org')

    await expect(
      asAdmin(() => service.create(tenantId, input())),
    ).rejects.toMatchObject({ code: 'facility_exists' })
    await expect(
      asAdmin(() =>
        service.create(otherTenantId, {
          ...input(),
          organizationId: foreign.id,
        }),
      ),
    ).resolves.toBeDefined()
  })

  it.each([
    ['code with capitals', { code: 'RS-Sehat' }, 'invalid_code'],
    ['code too short', { code: 'a' }, 'invalid_code'],
    ['offset time zone', { timezone: '+07:00' }, 'invalid_timezone'],
    ['unknown time zone', { timezone: 'Mars/Base' }, 'invalid_timezone'],
    ['no name', { name: [] }, 'invalid_name'],
    [
      'same language twice',
      {
        name: [
          { locale: 'en', text: 'a' },
          { locale: 'EN', text: 'b' },
        ],
      },
      'invalid_name',
    ],
    [
      'blank name text',
      { name: [{ locale: 'en', text: ' ' }] },
      'invalid_name',
    ],
    [
      'address with unknown country',
      {
        address: {
          use: 'work' as const,
          lines: [],
          admin_levels: [],
          country: 'XX',
        },
      },
      'invalid_address',
    ],
    [
      'address with a made-up subdivision',
      {
        address: {
          use: 'work' as const,
          lines: [],
          admin_levels: [],
          subdivision: 'Jakarta',
          country: 'ID',
        },
      },
      'invalid_address',
    ],
    [
      'repeated holiday calendar',
      { holidayCalendarCodes: ['id-national', 'id-national'] },
      'invalid_holiday_calendars',
    ],
    [
      '11 holiday calendars',
      {
        holidayCalendarCodes: Array.from({ length: 11 }, (_, i) => `cal-${i}`),
      },
      'invalid_holiday_calendars',
    ],
    [
      'holiday calendar in the wrong format',
      { holidayCalendarCodes: ['ID National'] },
      'invalid_holiday_calendars',
    ],
    [
      'repeated external id system',
      {
        externalIds: [
          { system: 'a', value: '1' },
          { system: 'a', value: '2' },
        ],
      },
      'invalid_external_ids',
    ],
  ])('rejects %s', async (_name, override, code) => {
    await expect(
      asAdmin(() => service.create(tenantId, { ...input(), ...override })),
    ).rejects.toMatchObject({ code })
  })

  it('answers not found for a facility of another tenant, a missing one and a malformed id', async () => {
    const created = await asAdmin(() => service.create(tenantId, input()))

    await expect(service.get(otherTenantId, created.id)).rejects.toBeInstanceOf(
      NotFoundError,
    )
    await expect(
      service.get(tenantId, new Types.ObjectId().toHexString()),
    ).rejects.toBeInstanceOf(NotFoundError)
    await expect(service.get(tenantId, 'not-an-id')).rejects.toBeInstanceOf(
      NotFoundError,
    )
    await expect(
      asAdmin(() =>
        service.update(otherTenantId, created.id, { status: 'inactive' }),
      ),
    ).rejects.toBeInstanceOf(NotFoundError)
  })

  it("lists only the tenant's facilities, ordered by code, filtered by organization and status, with paging", async () => {
    const second = await addOrganization(tenantId, 'rs-second')
    for (const [code, org] of [
      ['b-site', organizationId],
      ['a-site', organizationId],
      ['c-site', second.id],
    ]) {
      await asAdmin(() =>
        service.create(tenantId, { ...input(), code, organizationId: org }),
      )
    }
    const foreign = await addOrganization(otherTenantId, 'foreign-org')
    await asAdmin(() =>
      service.create(otherTenantId, {
        ...input(),
        code: 'z-site',
        organizationId: foreign.id,
      }),
    )
    const [first] = (await service.list(tenantId, {})).data
    await asAdmin(() =>
      service.update(tenantId, first.id, { status: 'inactive' }),
    )

    const all = await service.list(tenantId, {})
    expect(all.data.map((facility) => facility.code)).toEqual([
      'a-site',
      'b-site',
      'c-site',
    ])
    expect(all.totalRecords).toBe(3)
    expect(
      (await service.list(tenantId, { organizationId: second.id })).data.map(
        (facility) => facility.code,
      ),
    ).toEqual(['c-site'])
    expect(
      (await service.list(tenantId, { status: 'inactive' })).data.map(
        (facility) => facility.code,
      ),
    ).toEqual(['a-site'])
    expect(
      (await service.list(tenantId, { limit: 1, offset: 1 })).data.map(
        (facility) => facility.code,
      ),
    ).toEqual(['b-site'])
  })

  it('writes no log entry for reads, even failed ones', async () => {
    await asAdmin(() => service.create(tenantId, input()))
    vi.clearAllMocks()

    await service.list(tenantId, {})
    await expect(service.get(tenantId, 'missing')).rejects.toBeInstanceOf(
      NotFoundError,
    )

    expect(log).not.toHaveBeenCalled()
    expect(warn).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
    expect(debug).not.toHaveBeenCalled()
  })

  it('updates names, address, holiday calendars, external ids and status, never organization, code or time zone', async () => {
    const created = await asAdmin(() => service.create(tenantId, input()))
    const otherOrganization = await addOrganization(tenantId, 'rs-other')

    const updated = await asAdmin(() =>
      service.update(tenantId, created.id, {
        name: [{ locale: 'en', text: 'Sehat Hospital Jakarta' }],
        holidayCalendarCodes: ['id-national'],
        externalIds: [{ system: 'id.satusehat', value: 'abc' }],
        status: 'inactive',
        ...({
          code: 'hacked',
          timezone: 'Asia/Jayapura',
          organizationId: otherOrganization.id,
        } as object),
      }),
    )

    expect(updated).toMatchObject({
      name: [{ locale: 'en', text: 'Sehat Hospital Jakarta' }],
      holiday_calendar_codes: ['id-national'],
      external_ids: [{ system: 'id.satusehat', value: 'abc' }],
      status: 'inactive',
      code: 'rs-sehat-jkt',
      timezone: 'Asia/Jakarta',
      organization_id: organizationId,
    })
  })

  it('sets and clears the address', async () => {
    const created = await asAdmin(() => service.create(tenantId, input()))
    const address = {
      use: 'work' as const,
      lines: ['Jl. Sehat'],
      admin_levels: [],
      country: 'ID',
    }

    const set = await asAdmin(() =>
      service.update(tenantId, created.id, { address }),
    )
    expect(set.address).toMatchObject({ country: 'ID', lines: ['Jl. Sehat'] })
    const cleared = await asAdmin(() =>
      service.update(tenantId, created.id, { address: null }),
    )
    expect(cleared.address).toBeNull()
  })

  it('rejects an empty update, and an update with an invalid value', async () => {
    const created = await asAdmin(() => service.create(tenantId, input()))

    await expect(
      asAdmin(() => service.update(tenantId, created.id, {})),
    ).rejects.toMatchObject({ code: 'empty_update' })
    await expect(
      asAdmin(() => service.update(tenantId, created.id, { reason: 'x' })),
    ).rejects.toMatchObject({ code: 'empty_update' })
    await expect(
      asAdmin(() => service.update(tenantId, created.id, { name: [] })),
    ).rejects.toMatchObject({ code: 'invalid_name' })
    await expect(
      asAdmin(() =>
        service.update(tenantId, created.id, {
          address: { use: 'work', lines: [], admin_levels: [], country: 'XX' },
        }),
      ),
    ).rejects.toMatchObject({ code: 'invalid_address' })
  })

  it('rejects an edit based on a stale version and accepts one based on the current version', async () => {
    const created = await asAdmin(() => service.create(tenantId, input()))
    await asAdmin(() =>
      service.update(tenantId, created.id, {
        holidayCalendarCodes: ['one-cal'],
      }),
    )

    await expect(
      asAdmin(() =>
        service.update(tenantId, created.id, {
          holidayCalendarCodes: ['two-cal'],
          version: created.version,
        }),
      ),
    ).rejects.toMatchObject({ code: 'stale_version' })
    await expect(
      asAdmin(() =>
        service.update(tenantId, created.id, {
          holidayCalendarCodes: ['two-cal'],
          version: created.version + 1,
        }),
      ),
    ).resolves.toMatchObject({ holiday_calendar_codes: ['two-cal'] })
  })

  it('passes the reason to the change history, and only for that write', async () => {
    const created = await asAdmin(() => service.create(tenantId, input()))
    const seen: (string | undefined)[] = []
    const original = facilities.update.bind(facilities)
    vi.spyOn(facilities, 'update').mockImplementation(async (...args) => {
      seen.push(getRequestContext()?.reason)
      return original(...args)
    })

    await asAdmin(() =>
      service.update(tenantId, created.id, {
        status: 'inactive',
        reason: 'Site closed',
      }),
    )
    await asAdmin(() =>
      service.update(tenantId, created.id, { status: 'active' }),
    )

    expect(seen).toEqual(['Site closed', undefined])
  })

  it('refuses to set a facility inactive while it has an active unit, and allows it after the unit is closed (HR plan U11)', async () => {
    const created = await asAdmin(() => service.create(tenantId, input()))
    const unit = await asAdmin(() =>
      units.create({
        tenant_id: tenantId,
        organization_id: organizationId,
        facility_id: created.id,
        code: 'ward-a',
        name: [{ locale: 'en', text: 'Ward A' }],
        type: { system: 'id.unit-type', code: 'ward' },
        parent_id: null,
        ancestor_ids: [],
        is_clinical: true,
        external_ids: [],
        period: { start: '2026-01-01', end: null },
        status: 'active',
      }),
    )

    await expect(
      asAdmin(() =>
        service.update(tenantId, created.id, { status: 'inactive' }),
      ),
    ).rejects.toMatchObject({ code: 'facility_in_use' })
    expect((await facilities.findOne(created.id))?.status).toBe('active')

    await asAdmin(() => units.update(unit.id, { status: 'closed' }))
    const inactive = await asAdmin(() =>
      service.update(tenantId, created.id, { status: 'inactive' }),
    )
    expect(inactive.status).toBe('inactive')
  })

  it('ignores the active units of another facility when deactivating', async () => {
    const first = await asAdmin(() => service.create(tenantId, input()))
    const second = await asAdmin(() =>
      service.create(tenantId, { ...input(), code: 'rs-lain' }),
    )
    await asAdmin(() =>
      units.create({
        tenant_id: tenantId,
        organization_id: organizationId,
        facility_id: second.id,
        code: 'ward-a',
        name: [{ locale: 'en', text: 'Ward A' }],
        type: { system: 'id.unit-type', code: 'ward' },
        parent_id: null,
        ancestor_ids: [],
        is_clinical: true,
        external_ids: [],
        period: null,
        status: 'active',
      }),
    )

    const inactive = await asAdmin(() =>
      service.update(tenantId, first.id, { status: 'inactive' }),
    )

    expect(inactive.status).toBe('inactive')
  })

  it('logs a business rejection as warn with its code and no values', async () => {
    await asAdmin(() => service.create(tenantId, input()))
    vi.clearAllMocks()

    await expect(
      asAdmin(() => service.create(tenantId, input())),
    ).rejects.toBeDefined()

    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'facility_create',
        outcome: 'failure',
        code: 'facility_exists',
      }),
    )
    expect(JSON.stringify(warn.mock.calls)).not.toContain('rs-sehat-jkt')
  })
})
