import { Types } from 'mongoose'
import {
  getRequestContext,
  runWithRequestContext,
} from '@utility/logger/context'
import { type AppLogger } from '@utility/logger/service'
import { InMemoryCodeConcepts } from '../testing/in-memory'
import { NotFoundError } from '../workforce.error'
import { BUNDLES } from './bundles'
import { CodeConceptService } from './code-concept.service'

describe('CodeConceptService', () => {
  const tenantId = new Types.ObjectId().toHexString()
  const otherTenantId = new Types.ObjectId().toHexString()
  const log = vi.fn()
  const warn = vi.fn()
  const error = vi.fn()
  const debug = vi.fn()
  let concepts: InMemoryCodeConcepts
  let service: CodeConceptService

  const input = () => ({
    system: 'id.assignment-kind',
    code: 'hire',
    display: [
      { locale: 'id-ID', text: 'Pengangkatan' },
      { locale: 'en', text: 'Hire' },
    ],
  })

  const licenseProperties = {
    eligibility_role: 'registration',
    requires_expiry_date: false,
    location_specific: false,
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

  /**
   * Adds a platform-wide concept, shared by every tenant.
   *
   * @param code - Concept code.
   * @param text - English display text.
   * @param status - Concept status.
   * @returns The concept.
   */
  function addPlatform(
    code: string,
    text: string,
    status: 'active' | 'retired' = 'active',
  ) {
    return asAdmin(() =>
      concepts.create({
        system: 'id.assignment-kind',
        code,
        display: [{ locale: 'en', text }],
        properties: {},
        mappings: [],
        period: null,
        status,
      }),
    )
  }

  beforeEach(() => {
    vi.resetAllMocks()
    concepts = new InMemoryCodeConcepts()
    service = new CodeConceptService(concepts, {
      log,
      warn,
      error,
      debug,
    } as unknown as AppLogger)
  })

  it('creates an active tenant concept with trimmed text, and logs one success entry without values', async () => {
    const created = await asAdmin(() =>
      service.create(tenantId, {
        ...input(),
        display: [{ locale: ' en ', text: '  Hire  ' }],
        mappings: [{ system: ' employment-type ', code: ' x ' }],
        period: { start: '2026-01-01', end: null },
      }),
    )

    expect(created).toMatchObject({
      tenant_id: tenantId,
      system: 'id.assignment-kind',
      code: 'hire',
      display: [{ locale: 'en', text: 'Hire' }],
      properties: {},
      mappings: [{ system: 'employment-type', code: 'x' }],
      period: { start: '2026-01-01', end: null },
      status: 'active',
    })
    expect(log).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(log.mock.calls)).not.toContain('Hire')
  })

  it('refuses a second concept with the same system and code in a tenant, but allows it in another tenant', async () => {
    await asAdmin(() => service.create(tenantId, input()))

    await expect(
      asAdmin(() => service.create(tenantId, input())),
    ).rejects.toMatchObject({
      code: 'code_concept_exists',
    })
    await expect(
      asAdmin(() => service.create(otherTenantId, input())),
    ).resolves.toBeDefined()
  })

  it('lets a tenant create its own version of a platform-wide concept', async () => {
    await addPlatform('hire', 'Platform hire')

    const own = await asAdmin(() => service.create(tenantId, input()))

    expect(own.tenant_id).toBe(tenantId)
    expect(
      await concepts.findOwn(tenantId, 'id.assignment-kind', 'hire'),
    ).not.toBeNull()
  })

  it.each([
    ['system with capitals', { system: 'ID.License' }, 'invalid_system'],
    ['system without length', { system: 'a' }, 'invalid_system'],
    ['code with capitals', { code: 'Hire' }, 'invalid_code'],
    ['empty code', { code: '' }, 'invalid_code'],
    ['no display text', { display: [] }, 'invalid_display'],
    [
      'same language twice',
      {
        display: [
          { locale: 'en', text: 'a' },
          { locale: 'EN', text: 'b' },
        ],
      },
      'invalid_display',
    ],
    [
      'properties that are not an object',
      { properties: [] as unknown as Record<string, unknown> },
      'invalid_properties',
    ],
    [
      'nested properties',
      { properties: { a: { b: 1 } } },
      'invalid_properties',
    ],
    [
      '11 mappings',
      {
        mappings: Array.from({ length: 11 }, (_, i) => ({
          system: 's',
          code: `${i}`,
        })),
      },
      'invalid_mappings',
    ],
    [
      'the same mapping twice',
      {
        mappings: [
          { system: 's', code: '1' },
          { system: 's', code: '1' },
        ],
      },
      'invalid_mappings',
    ],
    [
      'a mapping without a code',
      { mappings: [{ system: 's', code: ' ' }] },
      'invalid_mappings',
    ],
    [
      'a period ending before it starts',
      { period: { start: '2026-05-01', end: '2026-04-30' } },
      'invalid_period',
    ],
    [
      'a period with a date that does not exist',
      { period: { start: '2026-02-30', end: null } },
      'invalid_period',
    ],
  ])('rejects %s', async (_name, override, code) => {
    await expect(
      asAdmin(() => service.create(tenantId, { ...input(), ...override })),
    ).rejects.toMatchObject({ code })
  })

  describe('properties of known systems (HR plan C6)', () => {
    it('are required for a licence type, in any country', async () => {
      await expect(
        asAdmin(() =>
          service.create(tenantId, {
            ...input(),
            system: 'us.license-type',
            code: 'dea',
          }),
        ),
      ).rejects.toMatchObject({ code: 'invalid_properties' })
      await expect(
        asAdmin(() =>
          service.create(tenantId, {
            ...input(),
            system: 'us.license-type',
            code: 'dea',
            properties: licenseProperties,
          }),
        ),
      ).resolves.toMatchObject({ system: 'us.license-type' })
    })

    it('are not required for an unknown system', async () => {
      await expect(
        asAdmin(() =>
          service.create(tenantId, {
            ...input(),
            system: 'id.something-new',
            code: 'x1',
            properties: { free: 'form' },
          }),
        ),
      ).resolves.toBeDefined()
    })

    it('must stay valid when edited', async () => {
      const created = await asAdmin(() =>
        service.create(tenantId, {
          ...input(),
          system: 'id.license-type',
          code: 'str',
          properties: licenseProperties,
        }),
      )

      await expect(
        asAdmin(() =>
          service.update(tenantId, created.id, {
            properties: { eligibility_role: 'registration' },
          }),
        ),
      ).rejects.toMatchObject({ code: 'invalid_properties' })
      await expect(
        asAdmin(() =>
          service.update(tenantId, created.id, {
            properties: { ...licenseProperties, eligibility_role: null },
          }),
        ),
      ).resolves.toMatchObject({ properties: { eligibility_role: null } })
    })
  })

  describe('list', () => {
    it('returns the tenant concepts and the platform-wide ones of one system, ordered by code', async () => {
      await addPlatform('transfer', 'Transfer')
      await asAdmin(() =>
        service.create(tenantId, { ...input(), code: 'promotion' }),
      )
      await asAdmin(() =>
        service.create(otherTenantId, { ...input(), code: 'secret' }),
      )
      await asAdmin(() =>
        service.create(tenantId, {
          ...input(),
          system: 'id.unit-type',
          code: 'ward',
          properties: { clinical_default: true },
        }),
      )

      const listed = await service.list(tenantId, {
        system: 'id.assignment-kind',
      })

      expect(listed.map((concept) => concept.code)).toEqual([
        'promotion',
        'transfer',
      ])
    })

    it('shows the tenant concept instead of the platform concept with the same code', async () => {
      await addPlatform('hire', 'Platform hire')
      await asAdmin(() =>
        service.create(tenantId, {
          ...input(),
          display: [{ locale: 'en', text: 'Our hire' }],
        }),
      )

      const listed = await service.list(tenantId, {
        system: 'id.assignment-kind',
      })

      expect(listed).toHaveLength(1)
      expect(listed[0].tenant_id).toBe(tenantId)
      expect(listed[0].display[0].text).toBe('Our hire')
      const other = await service.list(otherTenantId, {
        system: 'id.assignment-kind',
      })
      expect(other[0].display[0].text).toBe('Platform hire')
    })

    it('filters by the status of the concept that is shown', async () => {
      await addPlatform('hire', 'Platform hire')
      const own = await asAdmin(() => service.create(tenantId, input()))
      await asAdmin(() =>
        service.update(tenantId, own.id, { status: 'retired' }),
      )

      expect(
        await service.list(tenantId, {
          system: 'id.assignment-kind',
          status: 'active',
        }),
      ).toEqual([])
      expect(
        (
          await service.list(tenantId, {
            system: 'id.assignment-kind',
            status: 'retired',
          })
        ).map((concept) => concept.code),
      ).toEqual(['hire'])
    })

    it('returns nothing for a system that has no concepts', async () => {
      expect(await service.list(tenantId, { system: 'id.unknown' })).toEqual([])
    })
  })

  describe('update', () => {
    it('changes display, properties, mappings, period and status, never system or code', async () => {
      const created = await asAdmin(() => service.create(tenantId, input()))

      const updated = await asAdmin(() =>
        service.update(tenantId, created.id, {
          display: [{ locale: 'en', text: 'Hiring' }],
          properties: { note: 'x' },
          mappings: [{ system: 'm', code: '1' }],
          period: { start: '2026-01-01', end: '2026-12-31' },
          status: 'retired',
          ...({ system: 'hacked.system', code: 'hacked' } as object),
        }),
      )

      expect(updated).toMatchObject({
        display: [{ locale: 'en', text: 'Hiring' }],
        properties: { note: 'x' },
        mappings: [{ system: 'm', code: '1' }],
        period: { start: '2026-01-01', end: '2026-12-31' },
        status: 'retired',
        system: 'id.assignment-kind',
        code: 'hire',
      })
    })

    it('retires and reactivates a concept, and clears the period with null', async () => {
      const created = await asAdmin(() =>
        service.create(tenantId, {
          ...input(),
          period: { start: '2026-01-01', end: null },
        }),
      )

      await asAdmin(() =>
        service.update(tenantId, created.id, { status: 'retired' }),
      )
      const back = await asAdmin(() =>
        service.update(tenantId, created.id, {
          status: 'active',
          period: null,
        }),
      )

      expect(back).toMatchObject({ status: 'active', period: null })
    })

    it("answers not found for a platform-wide concept, another tenant's concept, a missing id and a malformed id", async () => {
      const platform = await addPlatform('hire', 'Platform hire')
      const foreign = await asAdmin(() =>
        service.create(otherTenantId, input()),
      )

      for (const id of [
        platform.id,
        foreign.id,
        new Types.ObjectId().toHexString(),
        'not-an-id',
      ]) {
        await expect(
          asAdmin(() => service.update(tenantId, id, { status: 'retired' })),
        ).rejects.toBeInstanceOf(NotFoundError)
      }
    })

    it('rejects an empty update', async () => {
      const created = await asAdmin(() => service.create(tenantId, input()))

      await expect(
        asAdmin(() => service.update(tenantId, created.id, {})),
      ).rejects.toMatchObject({ code: 'empty_update' })
      await expect(
        asAdmin(() => service.update(tenantId, created.id, { reason: 'x' })),
      ).rejects.toMatchObject({ code: 'empty_update' })
    })

    it('rejects an edit based on a stale version and accepts one based on the current version', async () => {
      const created = await asAdmin(() => service.create(tenantId, input()))
      await asAdmin(() =>
        service.update(tenantId, created.id, { status: 'retired' }),
      )

      await expect(
        asAdmin(() =>
          service.update(tenantId, created.id, {
            status: 'active',
            version: created.version,
          }),
        ),
      ).rejects.toMatchObject({ code: 'stale_version' })
      await expect(
        asAdmin(() =>
          service.update(tenantId, created.id, {
            status: 'active',
            version: created.version + 1,
          }),
        ),
      ).resolves.toMatchObject({ status: 'active' })
    })

    it('passes the reason to the change history, and only for that write', async () => {
      const created = await asAdmin(() => service.create(tenantId, input()))
      const seen: (string | undefined)[] = []
      const original = concepts.update.bind(concepts)
      vi.spyOn(concepts, 'update').mockImplementation(async (...args) => {
        seen.push(getRequestContext()?.reason)
        return original(...args)
      })

      await asAdmin(() =>
        service.update(tenantId, created.id, {
          status: 'retired',
          reason: 'No longer used',
        }),
      )
      await asAdmin(() =>
        service.update(tenantId, created.id, { status: 'active' }),
      )

      expect(seen).toEqual(['No longer used', undefined])
    })
  })

  describe('assertActive', () => {
    const coding = { system: 'id.assignment-kind', code: 'hire' }

    it('returns an active concept the tenant owns, and one that is platform-wide', async () => {
      await asAdmin(() => service.create(tenantId, input()))
      await addPlatform('transfer', 'Transfer')

      await expect(
        service.assertActive(tenantId, coding),
      ).resolves.toMatchObject({ code: 'hire' })
      await expect(
        service.assertActive(otherTenantId, { ...coding, code: 'transfer' }),
      ).resolves.toMatchObject({ code: 'transfer' })
    })

    it("refuses an unknown code, including another tenant's concept", async () => {
      await asAdmin(() => service.create(otherTenantId, input()))

      await expect(
        service.assertActive(tenantId, coding),
      ).rejects.toMatchObject({ code: 'unknown_code' })
    })

    it('refuses a retired concept', async () => {
      const created = await asAdmin(() => service.create(tenantId, input()))
      await asAdmin(() =>
        service.update(tenantId, created.id, { status: 'retired' }),
      )

      await expect(
        service.assertActive(tenantId, coding),
      ).rejects.toMatchObject({ code: 'code_retired' })
    })

    it('uses the tenant concept that retires a platform-wide one', async () => {
      await addPlatform('hire', 'Platform hire')
      const own = await asAdmin(() => service.create(tenantId, input()))
      await asAdmin(() =>
        service.update(tenantId, own.id, { status: 'retired' }),
      )

      await expect(
        service.assertActive(tenantId, coding),
      ).rejects.toMatchObject({ code: 'code_retired' })
      await expect(
        service.assertActive(otherTenantId, coding),
      ).resolves.toBeDefined()
    })

    it('checks the period against the given date, ends included', async () => {
      await asAdmin(() =>
        service.create(tenantId, {
          ...input(),
          period: { start: '2026-03-01', end: '2026-03-31' },
        }),
      )

      await expect(
        service.assertActive(tenantId, coding, '2026-02-28'),
      ).rejects.toMatchObject({ code: 'code_not_in_period' })
      await expect(
        service.assertActive(tenantId, coding, '2026-03-01'),
      ).resolves.toBeDefined()
      await expect(
        service.assertActive(tenantId, coding, '2026-03-31'),
      ).resolves.toBeDefined()
      await expect(
        service.assertActive(tenantId, coding, '2026-04-01'),
      ).rejects.toMatchObject({ code: 'code_not_in_period' })
    })

    it('accepts any date after the start of an open-ended period', async () => {
      await asAdmin(() =>
        service.create(tenantId, {
          ...input(),
          period: { start: '2026-03-01', end: null },
        }),
      )

      await expect(
        service.assertActive(tenantId, coding, '2099-01-01'),
      ).resolves.toBeDefined()
    })
  })

  describe('import', () => {
    it('copies the Indonesian bundle into the tenant, and logs counts without values', async () => {
      const result = await asAdmin(() => service.import(tenantId, 'id'))

      expect(result).toEqual({
        bundle: 'id',
        created: BUNDLES.id.length,
        skipped: 0,
      })
      expect(log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'code_concept_import',
          created: BUNDLES.id.length,
          skipped: 0,
        }),
      )
      const licenses = await service.list(tenantId, {
        system: 'id.license-type',
      })
      expect(licenses.map((concept) => concept.code)).toEqual(['sip', 'str'])
      expect(licenses.every((concept) => concept.tenant_id === tenantId)).toBe(
        true,
      )
      expect(JSON.stringify(log.mock.calls)).not.toContain('Surat')
    })

    it('changes nothing the second time, and never overwrites an edit', async () => {
      await asAdmin(() => service.import(tenantId, 'id'))
      const [ward] = await service
        .list(tenantId, { system: 'id.unit-type' })
        .then((all) => all.filter((concept) => concept.code === 'ward'))
      await asAdmin(() =>
        service.update(tenantId, ward.id, {
          display: [{ locale: 'en', text: 'Inpatient ward' }],
          status: 'retired',
        }),
      )

      const again = await asAdmin(() => service.import(tenantId, 'id'))

      expect(again).toEqual({
        bundle: 'id',
        created: 0,
        skipped: BUNDLES.id.length,
      })
      const after = await service.resolve(tenantId, 'id.unit-type', 'ward')
      expect(after).toMatchObject({
        status: 'retired',
        display: [{ locale: 'en', text: 'Inpatient ward' }],
      })
    })

    it('adds only what is missing', async () => {
      await asAdmin(() =>
        service.create(tenantId, {
          ...input(),
          system: 'id.unit-type',
          code: 'ward',
          properties: { clinical_default: false },
        }),
      )

      const result = await asAdmin(() => service.import(tenantId, 'id'))

      expect(result.created).toBe(BUNDLES.id.length - 1)
      expect(result.skipped).toBe(1)
      expect(
        (await service.resolve(tenantId, 'id.unit-type', 'ward'))?.properties,
      ).toEqual({ clinical_default: false })
    })

    it('imports into one tenant without touching another', async () => {
      await asAdmin(() => service.import(tenantId, 'id'))

      expect(
        await service.list(otherTenantId, { system: 'id.license-type' }),
      ).toEqual([])
    })

    it('rejects an unknown bundle name, including inherited property names', async () => {
      for (const name of ['xx', '', 'constructor', '__proto__', 'toString']) {
        await expect(
          asAdmin(() => service.import(tenantId, name)),
        ).rejects.toMatchObject({ code: 'unknown_bundle' })
      }
    })
  })

  it('writes no log entry for reads, even failed ones', async () => {
    await asAdmin(() => service.create(tenantId, input()))
    vi.clearAllMocks()

    await service.list(tenantId, { system: 'id.assignment-kind' })
    await service.resolve(tenantId, 'id.assignment-kind', 'hire')
    await expect(
      service.assertActive(tenantId, { system: 'x.y', code: 'z' }),
    ).rejects.toBeDefined()

    for (const level of [log, warn, error, debug]) {
      expect(level).not.toHaveBeenCalled()
    }
  })

  it('logs a business rejection as warn with its code and no values', async () => {
    await asAdmin(() => service.create(tenantId, input()))
    vi.clearAllMocks()

    await expect(
      asAdmin(() => service.create(tenantId, input())),
    ).rejects.toBeDefined()

    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'code_concept_create',
        outcome: 'failure',
        code: 'code_concept_exists',
      }),
    )
    expect(JSON.stringify(warn.mock.calls)).not.toContain('Pengangkatan')
  })
})
