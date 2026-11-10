import { Types } from 'mongoose'
import { type AppLogger } from '@utility/logger/service'
import {
  getRequestContext,
  runWithRequestContext,
} from '@utility/logger/context'
import { OrganizationService } from './organization.service'
import { InMemoryFacilities, InMemoryOrganizations } from '../testing/in-memory'
import {
  ConflictError,
  InvalidRequestError,
  NotFoundError,
} from '../workforce.error'

describe('OrganizationService', () => {
  const tenantId = new Types.ObjectId().toHexString()
  const otherTenantId = new Types.ObjectId().toHexString()
  const log = vi.fn()
  const warn = vi.fn()
  const error = vi.fn()
  const debug = vi.fn()
  let repository: InMemoryOrganizations
  let facilities: InMemoryFacilities
  let service: OrganizationService

  const input = {
    code: 'rs-sehat',
    legalName: 'PT Rumah Sakit Sehat',
    country: 'ID',
    currency: 'IDR',
    identifiers: [{ system: 'id.npwp-badan', value: '01.234.567.8-901.000' }],
  }

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

  beforeEach(() => {
    vi.resetAllMocks()
    repository = new InMemoryOrganizations()
    facilities = new InMemoryFacilities()
    service = new OrganizationService(repository, facilities, {
      log,
      warn,
      error,
      debug,
    } as unknown as AppLogger)
  })

  it('creates an active organization with trimmed values and logs one success entry without values', async () => {
    const created = await asAdmin(() =>
      service.create(tenantId, {
        ...input,
        legalName: '  PT Rumah Sakit Sehat ',
      }),
    )

    expect(created).toMatchObject({
      tenant_id: tenantId,
      code: 'rs-sehat',
      legal_name: 'PT Rumah Sakit Sehat',
      status: 'active',
    })
    expect(log).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(log.mock.calls)).not.toContain('Sehat')
    expect(JSON.stringify(log.mock.calls)).not.toContain('01.234')
  })

  it('rejects a second organization with the same code in a tenant, but allows it in another tenant', async () => {
    await asAdmin(() => service.create(tenantId, input))

    await expect(
      asAdmin(() => service.create(tenantId, input)),
    ).rejects.toMatchObject({
      code: 'organization_exists',
    })
    await expect(
      asAdmin(() => service.create(otherTenantId, input)),
    ).resolves.toBeDefined()
  })

  it.each([
    ['code too short', { code: 'a' }, 'invalid_code'],
    ['code with capitals', { code: 'RS-Sehat' }, 'invalid_code'],
    ['code starting with a dot', { code: '.abc' }, 'invalid_code'],
    ['unknown country', { country: 'XX' }, 'invalid_country'],
    ['lower-case country', { country: 'id' }, 'invalid_country'],
    ['unknown currency', { currency: 'ABC' }, 'invalid_currency'],
    [
      'repeated identifier system',
      {
        identifiers: [
          { system: 'a', value: '1' },
          { system: 'a', value: '2' },
        ],
      },
      'invalid_identifiers',
    ],
    [
      'empty identifier value',
      { identifiers: [{ system: 'a', value: ' ' }] },
      'invalid_identifiers',
    ],
    [
      'more than 20 identifiers',
      {
        identifiers: Array.from({ length: 21 }, (_, i) => ({
          system: `s${i}`,
          value: 'v',
        })),
      },
      'invalid_identifiers',
    ],
  ])('rejects %s', async (_name, override, code) => {
    await expect(
      asAdmin(() => service.create(tenantId, { ...input, ...override })),
    ).rejects.toMatchObject({ code })
    await expect(
      asAdmin(() => service.create(tenantId, { ...input, ...override })),
    ).rejects.toBeInstanceOf(InvalidRequestError)
  })

  it('answers not found for an organization of another tenant, a missing one and a malformed id', async () => {
    const created = await asAdmin(() => service.create(tenantId, input))

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
        service.update(otherTenantId, created.id, { legalName: 'X' }),
      ),
    ).rejects.toBeInstanceOf(NotFoundError)
  })

  it("lists only the tenant's organizations, ordered by code, filtered by status, with paging", async () => {
    for (const code of ['b-org', 'a-org', 'c-org']) {
      await asAdmin(() => service.create(tenantId, { ...input, code }))
    }
    await asAdmin(() =>
      service.create(otherTenantId, { ...input, code: 'z-org' }),
    )
    const [first] = (await service.list(tenantId, {})).data
    await asAdmin(() =>
      service.update(tenantId, first.id, { status: 'inactive' }),
    )

    const all = await service.list(tenantId, {})
    expect(all.data.map((organization) => organization.code)).toEqual([
      'a-org',
      'b-org',
      'c-org',
    ])
    expect(all.totalRecords).toBe(3)
    const inactive = await service.list(tenantId, { status: 'inactive' })
    expect(inactive.data.map((organization) => organization.code)).toEqual([
      'a-org',
    ])
    const page = await service.list(tenantId, { limit: 1, offset: 1 })
    expect(page.data.map((organization) => organization.code)).toEqual([
      'b-org',
    ])
    expect(log).toHaveBeenCalledTimes(5)
  })

  it('writes no log entry for reads, even failed ones', async () => {
    await asAdmin(() => service.create(tenantId, input))
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

  it('updates legal name, currency, identifiers and status, never code or country', async () => {
    const created = await asAdmin(() => service.create(tenantId, input))

    const updated = await asAdmin(() =>
      service.update(tenantId, created.id, {
        legalName: 'PT Rumah Sakit Sehat Tbk',
        currency: 'USD',
        identifiers: [],
        status: 'inactive',
        ...({ code: 'hacked', country: 'SG' } as object),
      }),
    )

    expect(updated).toMatchObject({
      legal_name: 'PT Rumah Sakit Sehat Tbk',
      currency: 'USD',
      identifiers: [],
      status: 'inactive',
      code: 'rs-sehat',
      country: 'ID',
    })
  })

  it('rejects an empty update and an invalid currency', async () => {
    const created = await asAdmin(() => service.create(tenantId, input))

    await expect(
      asAdmin(() => service.update(tenantId, created.id, {})),
    ).rejects.toMatchObject({ code: 'empty_update' })
    await expect(
      asAdmin(() => service.update(tenantId, created.id, { reason: 'x' })),
    ).rejects.toMatchObject({ code: 'empty_update' })
    await expect(
      asAdmin(() => service.update(tenantId, created.id, { currency: 'ABC' })),
    ).rejects.toMatchObject({ code: 'invalid_currency' })
  })

  it('rejects an edit based on a stale version and accepts one based on the current version', async () => {
    const created = await asAdmin(() => service.create(tenantId, input))
    await asAdmin(() =>
      service.update(tenantId, created.id, { legalName: 'Second' }),
    )

    await expect(
      asAdmin(() =>
        service.update(tenantId, created.id, {
          legalName: 'Third',
          version: created.version,
        }),
      ),
    ).rejects.toMatchObject({ code: 'stale_version' })
    await expect(
      asAdmin(() =>
        service.update(tenantId, created.id, {
          legalName: 'Third',
          version: created.version + 1,
        }),
      ),
    ).resolves.toMatchObject({ legal_name: 'Third' })
    await expect(
      asAdmin(() =>
        service.update(tenantId, created.id, {
          legalName: 'Fourth',
          version: 0,
        }),
      ),
    ).rejects.toBeInstanceOf(ConflictError)
  })

  it('passes the reason to the change history, and only for that write', async () => {
    const created = await asAdmin(() => service.create(tenantId, input))
    const seen: (string | undefined)[] = []
    const original = repository.update.bind(repository)
    vi.spyOn(repository, 'update').mockImplementation(async (...args) => {
      seen.push(getRequestContext()?.reason)
      return original(...args)
    })

    await asAdmin(() =>
      service.update(tenantId, created.id, {
        status: 'inactive',
        reason: 'Merged into group',
      }),
    )
    await asAdmin(() =>
      service.update(tenantId, created.id, { status: 'active' }),
    )

    expect(seen).toEqual(['Merged into group', undefined])
  })

  describe('deactivating an organization (HR plan F9)', () => {
    /**
     * Adds a facility to an organization.
     *
     * @param organizationId - Organization that runs it.
     * @param code - Facility code.
     * @param status - Facility status.
     * @returns The facility.
     */
    function addFacility(
      organizationId: string,
      code: string,
      status: 'active' | 'inactive' = 'active',
    ) {
      return asAdmin(() =>
        facilities.create({
          tenant_id: tenantId,
          organization_id: organizationId,
          code,
          name: [{ locale: 'en', text: code }],
          address: null,
          timezone: 'Asia/Jakarta',
          holiday_calendar_codes: [],
          external_ids: [],
          status,
        }),
      )
    }

    it('is refused while the organization has an active facility', async () => {
      const created = await asAdmin(() => service.create(tenantId, input))
      await addFacility(created.id, 'site-one')

      await expect(
        asAdmin(() =>
          service.update(tenantId, created.id, { status: 'inactive' }),
        ),
      ).rejects.toMatchObject({ code: 'organization_in_use' })
      expect((await service.get(tenantId, created.id)).status).toBe('active')
    })

    it('is allowed when every facility is inactive, or when the organization has none', async () => {
      const withInactive = await asAdmin(() => service.create(tenantId, input))
      await addFacility(withInactive.id, 'site-off', 'inactive')
      const empty = await asAdmin(() =>
        service.create(tenantId, { ...input, code: 'empty-org' }),
      )

      await expect(
        asAdmin(() =>
          service.update(tenantId, withInactive.id, { status: 'inactive' }),
        ),
      ).resolves.toMatchObject({ status: 'inactive' })
      await expect(
        asAdmin(() =>
          service.update(tenantId, empty.id, { status: 'inactive' }),
        ),
      ).resolves.toMatchObject({ status: 'inactive' })
    })

    it('ignores facilities of other organizations and does not block other changes', async () => {
      const first = await asAdmin(() => service.create(tenantId, input))
      const second = await asAdmin(() =>
        service.create(tenantId, { ...input, code: 'second-org' }),
      )
      await addFacility(second.id, 'site-two')

      await expect(
        asAdmin(() =>
          service.update(tenantId, first.id, { status: 'inactive' }),
        ),
      ).resolves.toMatchObject({ status: 'inactive' })
      await expect(
        asAdmin(() =>
          service.update(tenantId, second.id, { legalName: 'Renamed' }),
        ),
      ).resolves.toMatchObject({ legal_name: 'Renamed' })
    })

    it('does not block activating an organization', async () => {
      const created = await asAdmin(() => service.create(tenantId, input))
      await asAdmin(() =>
        service.update(tenantId, created.id, { status: 'inactive' }),
      )

      await expect(
        asAdmin(() =>
          service.update(tenantId, created.id, { status: 'active' }),
        ),
      ).resolves.toMatchObject({ status: 'active' })
    })
  })

  it('logs a business rejection as warn with its code and no values', async () => {
    await asAdmin(() => service.create(tenantId, input))
    vi.clearAllMocks()

    await expect(
      asAdmin(() => service.create(tenantId, input)),
    ).rejects.toBeDefined()

    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'organization_create',
        outcome: 'failure',
        code: 'organization_exists',
      }),
    )
    expect(JSON.stringify(warn.mock.calls)).not.toContain('rs-sehat')
  })
})
