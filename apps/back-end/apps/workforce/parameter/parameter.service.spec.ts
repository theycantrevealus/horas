import { Types } from 'mongoose'
import { runWithRequestContext } from '@utility/logger/context'
import { type AppLogger } from '@utility/logger/service'
import { CodeConceptService } from '../concept/code-concept.service'
import {
  InMemoryCodeConcepts,
  InMemoryFacilities,
  InMemoryHrParameters,
  InMemoryOrganizations,
  InMemoryOrganizationUnits,
} from '../testing/in-memory'
import { PARAMETER_CATALOG } from './catalog'
import { ParameterService, type SetParameterInput } from './parameter.service'

describe('ParameterService', () => {
  const tenantId = new Types.ObjectId().toHexString()
  const otherTenantId = new Types.ObjectId().toHexString()
  const log = vi.fn()
  const warn = vi.fn()
  const error = vi.fn()
  const debug = vi.fn()
  let parameters: InMemoryHrParameters
  let organizations: InMemoryOrganizations
  let facilities: InMemoryFacilities
  let units: InMemoryOrganizationUnits
  let concepts: InMemoryCodeConcepts
  let service: ParameterService
  let organizationId: string
  let facilityId: string
  let unitId: string

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
   * Adds an organization, a facility and a unit to a tenant.
   *
   * @param tenant - Tenant of the records.
   * @param code - Base code.
   * @returns The identifiers.
   */
  async function addPlace(tenant: string, code: string) {
    const organization = await asAdmin(() =>
      organizations.create({
        tenant_id: tenant,
        code: `org-${code}`,
        legal_name: 'PT',
        country: 'ID',
        identifiers: [],
        currency: 'IDR',
        status: 'active',
      }),
    )
    const facility = await asAdmin(() =>
      facilities.create({
        tenant_id: tenant,
        organization_id: organization.id,
        code: `rs-${code}`,
        name: [{ locale: 'en', text: 'RS' }],
        address: null,
        timezone: 'Asia/Jakarta',
        holiday_calendar_codes: [],
        external_ids: [],
        status: 'active',
      }),
    )
    const unit = await asAdmin(() =>
      units.create({
        tenant_id: tenant,
        organization_id: organization.id,
        facility_id: facility.id,
        code: `unit-${code}`,
        name: [{ locale: 'en', text: 'Unit' }],
        type: { system: 'id.unit-type', code: 'ward' },
        parent_id: null,
        ancestor_ids: [],
        is_clinical: true,
        external_ids: [],
        period: null,
        status: 'active',
      }),
    )
    return {
      organization: organization.id,
      facility: facility.id,
      unit: unit.id,
    }
  }

  /**
   * Sets a value as a signed-in request.
   *
   * @param input - Fields of the value; the key, scope, value and date have defaults.
   * @returns The stored value.
   */
  function setValue(input: Partial<SetParameterInput> = {}) {
    return asAdmin(() =>
      service.set(tenantId, {
        key: 'MAX_WEEKLY_HOURS',
        scope: { kind: 'tenant' },
        value: 37.5,
        effectiveFrom: '2026-03-10',
        ...input,
      }),
    )
  }

  beforeEach(async () => {
    vi.resetAllMocks()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-03-10T12:00:00Z'))
    parameters = new InMemoryHrParameters()
    organizations = new InMemoryOrganizations()
    facilities = new InMemoryFacilities()
    units = new InMemoryOrganizationUnits()
    concepts = new InMemoryCodeConcepts()
    const logger = { log, warn, error, debug } as unknown as AppLogger
    service = new ParameterService(
      parameters,
      organizations,
      facilities,
      units,
      new CodeConceptService(concepts, logger),
      logger,
    )
    for (const [code, status] of [
      ['perawat', 'active'],
      ['dokter', 'active'],
      ['lama', 'retired'],
    ] as const) {
      await asAdmin(() =>
        concepts.create({
          system: 'id.profession',
          code,
          display: [{ locale: 'en', text: code }],
          properties: { workforce_category: 'x' },
          mappings: [],
          period: null,
          status,
        }),
      )
    }
    const place = await addPlace(tenantId, 'a')
    organizationId = place.organization
    facilityId = place.facility
    unitId = place.unit
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('catalog', () => {
    it('lists every key with its type, default and scopes', () => {
      expect(service.catalog()).toBe(PARAMETER_CATALOG)
      expect(service.catalog().map(({ key }) => key)).toContain(
        'MAX_WEEKLY_HOURS',
      )
    })
  })

  describe('set', () => {
    it('sets a tenant value and a facility value, and logs one entry each without values', async () => {
      const tenantValue = await setValue()
      const facilityValue = await setValue({
        scope: { kind: 'facility', id: facilityId },
        value: 35,
        notes: '  PKB article 12  ',
        reason: 'Alasan Rahasia',
      })

      expect(tenantValue).toMatchObject({
        tenant_id: tenantId,
        key: 'MAX_WEEKLY_HOURS',
        scope: { kind: 'tenant', id: null },
        value: 37.5,
        effective_from: '2026-03-10',
        notes: null,
      })
      expect(facilityValue).toMatchObject({
        scope: { kind: 'facility', id: facilityId },
        value: 35,
        notes: 'PKB article 12',
      })
      expect(log).toHaveBeenCalledTimes(2)
      expect(log).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'parameter_set', outcome: 'success' }),
      )
      const text = JSON.stringify(log.mock.calls)
      for (const secret of ['37.5', 'PKB', 'Rahasia', 'MAX_WEEKLY_HOURS']) {
        expect(text).not.toContain(secret)
      }
    })

    it('stores an alert list from the largest to the smallest and a points list without extras', async () => {
      const list = await setValue({
        key: 'LICENSE_ALERT_DAYS',
        value: [30, 180, 60, 90],
      })
      const points = await setValue({
        key: 'SKP_REQUIRED_POINTS',
        value: [
          {
            profession: { system: 'id.profession', code: 'perawat', x: 1 },
            points: 25,
          },
        ],
      })

      expect(list.value).toEqual([180, 90, 60, 30])
      expect(points.value).toEqual([
        {
          profession: { system: 'id.profession', code: 'perawat' },
          points: 25,
        },
      ])
    })

    it('accepts yesterday and today in UTC, and refuses an earlier date (R6)', async () => {
      await setValue({ effectiveFrom: '2026-03-09' })
      await setValue({ effectiveFrom: '2026-03-10', value: 36 })
      await setValue({ effectiveFrom: '2027-01-01', value: 35 })

      await expect(
        setValue({ effectiveFrom: '2026-03-08', value: 34 }),
      ).rejects.toMatchObject({
        kind: 'invalid',
        code: 'effective_from_in_past',
      })
    })

    it.each([
      ['an unknown key', { key: 'NOPE' }, 'unknown_parameter'],
      [
        'a facility scope on a tenant-only key',
        {
          key: 'CREDENTIALING_SCOPE',
          value: 'group',
          scope: { kind: 'facility' as const, id: 'x' },
        },
        'scope_not_allowed',
      ],
      [
        'a unit scope on a key without unit values',
        {
          key: 'LICENSE_ALERT_DAYS',
          value: [30],
          scope: { kind: 'unit' as const, id: 'x' },
        },
        'scope_not_allowed',
      ],
      [
        'a committee value before committees exist',
        {
          key: 'MIN_ASSESSORS',
          value: 2,
          scope: { kind: 'committee' as const, id: 'x' },
        },
        'scope_not_available',
      ],
      [
        'a tenant value with a scope id',
        { scope: { kind: 'tenant' as const, id: 'x' } },
        'invalid_scope',
      ],
      [
        'a facility value without a scope id',
        { scope: { kind: 'facility' as const } },
        'invalid_scope',
      ],
      ['a text instead of a number', { value: '40' }, 'invalid_value'],
      ['a number outside the limits', { value: 400 }, 'invalid_value'],
      [
        'an empty alert list',
        { key: 'LICENSE_ALERT_DAYS', value: [] },
        'invalid_value',
      ],
      [
        'a repeated alert day',
        { key: 'LICENSE_ALERT_DAYS', value: [30, 30] },
        'invalid_value',
      ],
      [
        'a choice that is not listed',
        { key: 'CREDENTIALING_SCOPE', value: 'region' },
        'invalid_value',
      ],
      [
        'a repeated profession',
        {
          key: 'SKP_REQUIRED_POINTS',
          value: [
            {
              profession: { system: 'id.profession', code: 'perawat' },
              points: 1,
            },
            {
              profession: { system: 'id.profession', code: 'perawat' },
              points: 2,
            },
          ],
        },
        'invalid_value',
      ],
      [
        'a profession from another kind of system',
        {
          key: 'SKP_REQUIRED_POINTS',
          value: [
            { profession: { system: 'id.unit-type', code: 'ward' }, points: 1 },
          ],
        },
        'invalid_value',
      ],
      [
        'an unknown profession',
        {
          key: 'SKP_REQUIRED_POINTS',
          value: [
            {
              profession: { system: 'id.profession', code: 'nope' },
              points: 1,
            },
          ],
        },
        'unknown_code',
      ],
      [
        'a retired profession',
        {
          key: 'SKP_REQUIRED_POINTS',
          value: [
            {
              profession: { system: 'id.profession', code: 'lama' },
              points: 1,
            },
          ],
        },
        'code_retired',
      ],
      [
        'a bad start date',
        { effectiveFrom: '2026-02-30' },
        'invalid_effective_from',
      ],
      ['empty notes', { notes: '   ' }, 'invalid_notes'],
      ['too long notes', { notes: 'x'.repeat(501) }, 'invalid_notes'],
    ])('rejects %s with 422 %s', async (_label, override, code) => {
      await expect(setValue(override)).rejects.toMatchObject({
        kind: 'invalid',
        code,
      })
    })

    it('answers one error for a missing and a foreign organization, facility or unit', async () => {
      const foreign = await addPlace(otherTenantId, 'x')
      const missing = new Types.ObjectId().toHexString()
      const cases = [
        ['organization', foreign.organization],
        ['facility', foreign.facility],
        ['unit', foreign.unit],
        ['organization', missing],
        ['facility', missing],
        ['unit', missing],
      ] as const

      for (const [kind, id] of cases) {
        await expect(setValue({ scope: { kind, id } })).rejects.toMatchObject({
          code: 'scope_not_found',
        })
      }
    })

    it('accepts an inactive facility and a closed unit as scope', async () => {
      await facilities.update(facilityId, { status: 'inactive' })
      await units.update(unitId, { status: 'closed' })

      await setValue({ scope: { kind: 'facility', id: facilityId } })
      const unit = await setValue({ scope: { kind: 'unit', id: unitId } })

      expect(unit.scope).toEqual({ kind: 'unit', id: unitId })
    })

    it('answers 409 for a second value on the same key, scope and date, and allows another date or scope', async () => {
      await setValue()

      await expect(setValue({ value: 30 })).rejects.toMatchObject({
        kind: 'conflict',
        code: 'parameter_exists',
      })
      await setValue({ effectiveFrom: '2026-04-01', value: 30 })
      await setValue({ scope: { kind: 'facility', id: facilityId } })

      // The pre-check misses a request that lost the race; the unique index still decides.
      vi.spyOn(parameters, 'findOneAt').mockResolvedValueOnce(null)
      await expect(setValue()).rejects.toMatchObject({
        code: 'parameter_exists',
      })
    })

    it('never changes an earlier value', async () => {
      const first = await setValue()
      await setValue({ effectiveFrom: '2026-04-01', value: 30 })

      const rows = await parameters.findByKey(tenantId, 'MAX_WEEKLY_HOURS')

      expect(rows).toHaveLength(2)
      expect(rows.find((row) => row.id === first.id)?.value).toBe(37.5)
    })

    it('logs a rejection as warn with its code and no values', async () => {
      await setValue()
      vi.clearAllMocks()

      await expect(setValue({ value: 99 })).rejects.toBeDefined()

      expect(warn).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'parameter_set',
          outcome: 'failure',
          code: 'parameter_exists',
        }),
      )
      expect(JSON.stringify(warn.mock.calls)).not.toContain('99')
    })
  })

  describe('effective', () => {
    it('answers the catalog default when no value was set', async () => {
      const result = await service.effective(tenantId, {
        key: 'MAX_WEEKLY_HOURS',
      })

      expect(result).toEqual({
        key: 'MAX_WEEKLY_HOURS',
        value: 40,
        source: 'default',
        scope: null,
        effective_from: null,
        parameter_id: null,
        date: '2026-03-10',
      })
    })

    it('answers a tenant value from its date, and the default before it', async () => {
      await setValue({ effectiveFrom: '2026-06-01', value: 36 })

      const before = await service.effective(tenantId, {
        key: 'MAX_WEEKLY_HOURS',
        date: '2026-05-31',
      })
      const on = await service.effective(tenantId, {
        key: 'MAX_WEEKLY_HOURS',
        date: '2026-06-01',
      })

      expect(before).toMatchObject({ value: 40, source: 'default' })
      expect(on).toMatchObject({
        value: 36,
        source: 'tenant',
        effective_from: '2026-06-01',
      })
    })

    it('picks the latest value that starts on or before the date', async () => {
      await setValue({ effectiveFrom: '2026-03-10', value: 38 })
      await setValue({ effectiveFrom: '2026-06-01', value: 36 })
      await setValue({ effectiveFrom: '2026-09-01', value: 34 })

      const values = []
      for (const date of [
        '2026-03-10',
        '2026-07-01',
        '2026-09-01',
        '2027-01-01',
      ]) {
        values.push(
          (await service.effective(tenantId, { key: 'MAX_WEEKLY_HOURS', date }))
            .value,
        )
      }

      expect(values).toEqual([38, 36, 34, 34])
    })

    it('prefers the unit over the facility over the organization over the tenant', async () => {
      await setValue({ value: 40 })
      await setValue({
        scope: { kind: 'organization', id: organizationId },
        value: 39,
      })
      await setValue({ scope: { kind: 'facility', id: facilityId }, value: 38 })
      await setValue({ scope: { kind: 'unit', id: unitId }, value: 37 })

      const read = async (place: object) =>
        (
          await service.effective(tenantId, {
            key: 'MAX_WEEKLY_HOURS',
            ...place,
          })
        ).source
      expect(await read({ unitId })).toBe('unit')
      expect(await read({ facilityId })).toBe('facility')
      expect(await read({ organizationId })).toBe('organization')
      expect(await read({})).toBe('tenant')
    })

    it('follows the chain from a unit to its facility and organization', async () => {
      await setValue({
        scope: { kind: 'organization', id: organizationId },
        value: 39,
      })

      const fromUnit = await service.effective(tenantId, {
        key: 'MAX_WEEKLY_HOURS',
        unitId,
      })
      const fromFacility = await service.effective(tenantId, {
        key: 'MAX_WEEKLY_HOURS',
        facilityId,
      })

      expect(fromUnit).toMatchObject({ value: 39, source: 'organization' })
      expect(fromFacility).toMatchObject({ value: 39, source: 'organization' })
    })

    it('lets specificity beat recency (R7)', async () => {
      await setValue({
        scope: { kind: 'unit', id: unitId },
        effectiveFrom: '2026-03-09',
        value: 30,
      })
      await setValue({ effectiveFrom: '2026-03-10', value: 40 })

      const result = await service.effective(tenantId, {
        key: 'MAX_WEEKLY_HOURS',
        unitId,
        date: '2026-03-10',
      })

      expect(result).toMatchObject({ value: 30, source: 'unit' })
    })

    it('falls through to a wider scope when the narrower value has not started yet', async () => {
      await setValue({ value: 40 })
      await setValue({
        scope: { kind: 'unit', id: unitId },
        effectiveFrom: '2026-08-01',
        value: 30,
      })

      const now = await service.effective(tenantId, {
        key: 'MAX_WEEKLY_HOURS',
        unitId,
      })

      expect(now).toMatchObject({ value: 40, source: 'tenant' })
    })

    it("reads today in the facility's time zone when no date is given (R8)", async () => {
      vi.setSystemTime(new Date('2026-03-10T18:00:00Z'))
      await setValue({
        scope: { kind: 'facility', id: facilityId },
        effectiveFrom: '2026-03-11',
        value: 30,
      })

      const facility = await service.effective(tenantId, {
        key: 'MAX_WEEKLY_HOURS',
        facilityId,
      })
      const tenant = await service.effective(tenantId, {
        key: 'MAX_WEEKLY_HOURS',
      })

      expect(facility).toMatchObject({ value: 30, date: '2026-03-11' })
      expect(tenant).toMatchObject({ source: 'default', date: '2026-03-10' })
    })

    it('ignores levels a key does not allow and skips other tenants', async () => {
      await setValue({ key: 'CREDENTIALING_SCOPE', value: 'group' })
      const foreign = await addPlace(otherTenantId, 'x')
      await asAdmin(() =>
        parameters.create({
          tenant_id: otherTenantId,
          key: 'MAX_WEEKLY_HOURS',
          scope: { kind: 'tenant', id: null },
          value: 20,
          effective_from: '2026-03-01',
          notes: null,
        }),
      )

      const result = await service.effective(tenantId, {
        key: 'CREDENTIALING_SCOPE',
        facilityId,
      })
      const isolated = await service.effective(tenantId, {
        key: 'MAX_WEEKLY_HOURS',
      })

      expect(result).toMatchObject({ value: 'group', source: 'tenant' })
      expect(isolated).toMatchObject({ value: 40, source: 'default' })
      expect(foreign.unit).toBeDefined()
    })

    it('rejects an unknown key, two places, a bad date, and a missing or foreign place', async () => {
      const foreign = await addPlace(otherTenantId, 'x')
      const missing = new Types.ObjectId().toHexString()

      await expect(
        service.effective(tenantId, { key: 'NOPE' }),
      ).rejects.toMatchObject({ code: 'unknown_parameter' })
      await expect(
        service.effective(tenantId, {
          key: 'MAX_WEEKLY_HOURS',
          unitId,
          facilityId,
        }),
      ).rejects.toMatchObject({ code: 'invalid_place' })
      await expect(
        service.effective(tenantId, {
          key: 'MAX_WEEKLY_HOURS',
          date: '2026-02-30',
        }),
      ).rejects.toMatchObject({ code: 'invalid_date' })
      for (const place of [
        { unitId: missing },
        { unitId: foreign.unit },
        { facilityId: missing },
        { facilityId: foreign.facility },
        { organizationId: missing },
        { organizationId: foreign.organization },
        { unitId: 'not-an-id' },
      ]) {
        await expect(
          service.effective(tenantId, { key: 'MAX_WEEKLY_HOURS', ...place }),
        ).rejects.toMatchObject({ code: 'scope_not_found' })
      }
    })

    it('writes no log entry', async () => {
      await setValue()
      vi.clearAllMocks()

      await service.effective(tenantId, { key: 'MAX_WEEKLY_HOURS', unitId })
      await expect(
        service.effective(tenantId, { key: 'NOPE' }),
      ).rejects.toBeDefined()

      for (const level of [log, warn, error, debug]) {
        expect(level).not.toHaveBeenCalled()
      }
    })
  })

  describe('list', () => {
    it('lists the values ordered by key, newest first inside a key, with filters and paging', async () => {
      await setValue({ key: 'MIN_REST_HOURS', value: 9 })
      await setValue({ effectiveFrom: '2026-03-10', value: 38 })
      await setValue({ effectiveFrom: '2026-06-01', value: 36 })
      await setValue({ scope: { kind: 'facility', id: facilityId }, value: 35 })
      vi.clearAllMocks()

      const all = await service.list(tenantId, {})
      const byKey = await service.list(tenantId, { key: 'MAX_WEEKLY_HOURS' })
      const byScope = await service.list(tenantId, {
        scopeKind: 'facility',
        scopeId: facilityId,
      })
      const paged = await service.list(tenantId, {
        key: 'MAX_WEEKLY_HOURS',
        limit: 1,
        offset: 1,
      })

      expect(all.totalRecords).toBe(4)
      expect(all.data[0].key).toBe('MAX_WEEKLY_HOURS')
      expect(byKey.data.map((row) => row.effective_from)[0]).toBe('2026-06-01')
      expect(byKey.totalRecords).toBe(3)
      expect(byScope.data.map((row) => row.value)).toEqual([35])
      expect(paged.data).toHaveLength(1)
      expect(paged.totalRecords).toBe(3)
      for (const level of [log, warn, error, debug]) {
        expect(level).not.toHaveBeenCalled()
      }
    })

    it('gives an empty page for another tenant and for a foreign scope', async () => {
      await setValue({ scope: { kind: 'facility', id: facilityId } })

      expect((await service.list(otherTenantId, {})).data).toEqual([])
      expect(
        (
          await service.list(tenantId, {
            scopeKind: 'facility',
            scopeId: new Types.ObjectId().toHexString(),
          })
        ).data,
      ).toEqual([])
    })

    it('needs a scope kind with a scope id', async () => {
      await expect(
        service.list(tenantId, { scopeId: facilityId }),
      ).rejects.toMatchObject({ code: 'scope_kind_required' })
    })
  })
})
