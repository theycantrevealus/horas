import { Types } from 'mongoose'
import { runWithRequestContext } from '@utility/logger/context'
import { type AppLogger } from '@utility/logger/service'
import { CodeConceptService } from '../concept/code-concept.service'
import {
  InMemoryCodeConcepts,
  InMemoryFacilities,
  InMemoryOrganizationUnits,
  InMemoryPositions,
} from '../testing/in-memory'
import { PositionService, type UpdatePositionInput } from './position.service'

describe('PositionService', () => {
  const tenantId = new Types.ObjectId().toHexString()
  const otherTenantId = new Types.ObjectId().toHexString()
  const organizationId = new Types.ObjectId().toHexString()
  const log = vi.fn()
  const warn = vi.fn()
  const error = vi.fn()
  const debug = vi.fn()
  let positions: InMemoryPositions
  let units: InMemoryOrganizationUnits
  let facilities: InMemoryFacilities
  let concepts: InMemoryCodeConcepts
  let service: PositionService
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
   * Adds a unit directly to the repository.
   *
   * @param tenant - Tenant of the unit.
   * @param code - Unit code.
   * @param status - Unit status.
   * @returns The unit.
   */
  function addUnit(
    tenant: string,
    code: string,
    status: 'active' | 'closed' = 'active',
  ) {
    return asAdmin(() =>
      units.create({
        tenant_id: tenant,
        organization_id: organizationId,
        facility_id: facilityId,
        code,
        name: [{ locale: 'en', text: code }],
        type: { system: 'id.unit-type', code: 'ward' },
        parent_id: null,
        ancestor_ids: [],
        is_clinical: true,
        external_ids: [],
        period: { start: '2026-01-01', end: null },
        status,
      }),
    )
  }

  /**
   * Adds a platform-wide code concept.
   *
   * @param system - Code system.
   * @param code - Code.
   * @param status - Concept status.
   */
  async function addConcept(
    system: string,
    code: string,
    status: 'active' | 'retired' = 'active',
  ) {
    await asAdmin(() =>
      concepts.create({
        system,
        code,
        display: [{ locale: 'en', text: code }],
        properties: {},
        mappings: [],
        period: null,
        status,
      }),
    )
  }

  /**
   * Creates a position through the service.
   *
   * @param code - Position code.
   * @param override - Fields that replace the defaults.
   * @returns The created position.
   */
  function addPosition(code: string, override: object = {}) {
    return asAdmin(() =>
      service.create(tenantId, {
        unitId,
        code,
        title: [{ locale: 'en', text: `Position ${code}` }],
        kind: 'functional',
        ...override,
      }),
    )
  }

  beforeEach(async () => {
    vi.resetAllMocks()
    positions = new InMemoryPositions()
    units = new InMemoryOrganizationUnits()
    facilities = new InMemoryFacilities()
    concepts = new InMemoryCodeConcepts()
    const logger = { log, warn, error, debug } as unknown as AppLogger
    service = new PositionService(
      positions,
      units,
      facilities,
      new CodeConceptService(concepts, logger),
      logger,
    )
    await addConcept('id.profession', 'perawat')
    await addConcept('id.profession', 'dokter')
    await addConcept('id.profession', 'lama', 'retired')
    await addConcept('rs.job-grade', 'g5')
    await addConcept('rs.job-grade', 'g6', 'retired')
    await addConcept('id.unit-type', 'ward')
    facilityId = (
      await asAdmin(() =>
        facilities.create({
          tenant_id: tenantId,
          organization_id: organizationId,
          code: 'rs-sehat',
          name: [{ locale: 'en', text: 'RS' }],
          address: null,
          timezone: 'Asia/Jakarta',
          holiday_calendar_codes: [],
          external_ids: [],
          status: 'active',
        }),
      )
    ).id
    unitId = (await addUnit(tenantId, 'ward-a')).id
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('create', () => {
    it('creates an active functional position with defaults and a period starting today in the facility time zone', async () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-03-10T18:00:00Z'))

      const created = await addPosition('perawat-pelaksana')

      expect(created).toMatchObject({
        tenant_id: tenantId,
        unit_id: unitId,
        code: 'perawat-pelaksana',
        kind: 'functional',
        is_head_of_unit: false,
        allowed_professions: [],
        grade: null,
        budgeted_headcount: 1,
        job_description: null,
        period: { start: '2026-03-11', end: null },
        status: 'active',
      })
    })

    it('stores professions, grade, headcount and a given start date', async () => {
      const created = await addPosition('perawat-icu', {
        allowedProfessions: [{ system: 'id.profession', code: 'perawat' }],
        grade: { system: 'rs.job-grade', code: 'g5' },
        budgetedHeadcount: 12,
        startDate: '2025-12-01',
      })

      expect(created).toMatchObject({
        allowed_professions: [{ system: 'id.profession', code: 'perawat' }],
        grade: { system: 'rs.job-grade', code: 'g5' },
        budgeted_headcount: 12,
        period: { start: '2025-12-01', end: null },
      })
    })

    it('creates a head position that is structural with a headcount of 1', async () => {
      const head = await addPosition('kepala-ruangan', {
        kind: 'structural',
        isHeadOfUnit: true,
      })

      expect(head).toMatchObject({ is_head_of_unit: true, kind: 'structural' })
    })

    it('writes one success entry without any value', async () => {
      await addPosition('secret-code')

      expect(log).toHaveBeenCalledTimes(1)
      expect(log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'position_create',
          outcome: 'success',
        }),
      )
      expect(JSON.stringify(log.mock.calls)).not.toContain('secret-code')
      expect(JSON.stringify(log.mock.calls)).not.toContain('Position ')
    })

    it.each([
      ['a bad code', { code: 'A' }, 'invalid_code'],
      ['no titles', { title: [] }, 'invalid_title'],
      ['an unknown kind', { kind: 'other' }, 'invalid_kind'],
      ['a headcount of 0', { budgetedHeadcount: 0 }, 'invalid_headcount'],
      ['a headcount of 1001', { budgetedHeadcount: 1001 }, 'invalid_headcount'],
      [
        'a fractional headcount',
        { budgetedHeadcount: 1.5 },
        'invalid_headcount',
      ],
      [
        'a functional head position',
        { isHeadOfUnit: true },
        'head_must_be_structural',
      ],
      [
        'a head position with a headcount of 2',
        { isHeadOfUnit: true, kind: 'structural', budgetedHeadcount: 2 },
        'head_headcount',
      ],
      [
        'a profession from another kind of system',
        { allowedProfessions: [{ system: 'id.unit-type', code: 'ward' }] },
        'invalid_professions',
      ],
      [
        'a repeated profession',
        {
          allowedProfessions: [
            { system: 'id.profession', code: 'perawat' },
            { system: 'id.profession', code: 'perawat' },
          ],
        },
        'invalid_professions',
      ],
      [
        'an unknown profession',
        { allowedProfessions: [{ system: 'id.profession', code: 'nope' }] },
        'unknown_code',
      ],
      [
        'a retired profession',
        { allowedProfessions: [{ system: 'id.profession', code: 'lama' }] },
        'code_retired',
      ],
      [
        'a grade from another kind of system',
        { grade: { system: 'id.profession', code: 'perawat' } },
        'invalid_grade',
      ],
      [
        'a retired grade',
        { grade: { system: 'rs.job-grade', code: 'g6' } },
        'code_retired',
      ],
      [
        'an unknown grade',
        { grade: { system: 'rs.job-grade', code: 'g99' } },
        'unknown_code',
      ],
      ['a bad start date', { startDate: '2026-02-30' }, 'invalid_start_date'],
    ])('rejects %s with 422 %s', async (_label, override, code) => {
      await expect(addPosition('pos-x', override)).rejects.toMatchObject({
        kind: 'invalid',
        code,
      })
    })

    it('refuses more than 20 professions', async () => {
      const many = Array.from({ length: 21 }, (_, index) => ({
        system: 'id.profession',
        code: `p${index}`,
      }))

      await expect(
        addPosition('pos-x', { allowedProfessions: many }),
      ).rejects.toMatchObject({ code: 'invalid_professions' })
    })

    it('answers one error for a missing and a foreign unit, and another for a closed one (P1)', async () => {
      const foreign = await addUnit(otherTenantId, 'ward-x')
      const closed = await addUnit(tenantId, 'ward-closed', 'closed')

      for (const id of [new Types.ObjectId().toHexString(), foreign.id]) {
        await expect(
          addPosition('pos-x', { unitId: id }),
        ).rejects.toMatchObject({ code: 'unit_not_found' })
      }
      await expect(
        addPosition('pos-x', { unitId: closed.id }),
      ).rejects.toMatchObject({ code: 'unit_closed' })
    })

    it('answers 409 for a code taken in the unit, and allows it in another unit', async () => {
      await addPosition('perawat')

      await expect(addPosition('perawat')).rejects.toMatchObject({
        kind: 'conflict',
        code: 'position_exists',
      })
      const other = await addUnit(tenantId, 'ward-b')
      expect((await addPosition('perawat', { unitId: other.id })).unit_id).toBe(
        other.id,
      )
    })

    it('answers 409 head_position_exists for a second head, and allows a new head after the first is closed (P4)', async () => {
      const first = await addPosition('head-1', {
        kind: 'structural',
        isHeadOfUnit: true,
      })

      await expect(
        addPosition('head-2', { kind: 'structural', isHeadOfUnit: true }),
      ).rejects.toMatchObject({
        kind: 'conflict',
        code: 'head_position_exists',
      })

      await asAdmin(() => service.close(tenantId, first.id, {}))
      const second = await addPosition('head-2', {
        kind: 'structural',
        isHeadOfUnit: true,
      })
      expect(second.is_head_of_unit).toBe(true)
    })

    it('names the rule the unique index decided when two requests race', async () => {
      await addPosition('head-1', { kind: 'structural', isHeadOfUnit: true })
      await addPosition('perawat')

      // The pre-checks miss a request that lost the race; the unique indexes still decide.
      vi.spyOn(positions, 'findByCode').mockResolvedValueOnce(null)
      vi.spyOn(positions, 'findActiveHead').mockResolvedValueOnce(null)
      await expect(
        addPosition('head-2', { kind: 'structural', isHeadOfUnit: true }),
      ).rejects.toMatchObject({ code: 'head_position_exists' })

      vi.spyOn(positions, 'findByCode').mockResolvedValueOnce(null)
      await expect(addPosition('perawat')).rejects.toMatchObject({
        code: 'position_exists',
      })
    })

    it('logs a rejection as warn with its code and no values', async () => {
      await addPosition('perawat')
      vi.clearAllMocks()

      await expect(addPosition('perawat')).rejects.toBeDefined()

      expect(warn).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'position_create',
          outcome: 'failure',
          code: 'position_exists',
        }),
      )
      expect(JSON.stringify(warn.mock.calls)).not.toContain('perawat')
    })
  })

  describe('update', () => {
    it('edits title, grade, professions and headcount, and bumps the version', async () => {
      const created = await addPosition('perawat')

      const updated = await asAdmin(() =>
        service.update(tenantId, created.id, {
          title: [{ locale: 'id-ID', text: 'Perawat Pelaksana' }],
          grade: { system: 'rs.job-grade', code: 'g5' },
          allowedProfessions: [{ system: 'id.profession', code: 'perawat' }],
          budgetedHeadcount: 6,
        }),
      )

      expect(updated).toMatchObject({
        title: [{ locale: 'id-ID', text: 'Perawat Pelaksana' }],
        grade: { system: 'rs.job-grade', code: 'g5' },
        allowed_professions: [{ system: 'id.profession', code: 'perawat' }],
        budgeted_headcount: 6,
        version: created.version + 1,
      })
    })

    it('clears the grade with null and the professions with an empty list', async () => {
      const created = await addPosition('perawat', {
        grade: { system: 'rs.job-grade', code: 'g5' },
        allowedProfessions: [{ system: 'id.profession', code: 'perawat' }],
      })

      const updated = await asAdmin(() =>
        service.update(tenantId, created.id, {
          grade: null,
          allowedProfessions: [],
        }),
      )

      expect(updated).toMatchObject({ grade: null, allowed_professions: [] })
    })

    it('ignores the unit, code, kind, head flag, status and period when they are sent', async () => {
      const created = await addPosition('perawat')

      const updated = await asAdmin(() =>
        service.update(tenantId, created.id, {
          budgetedHeadcount: 2,
          unitId: new Types.ObjectId().toHexString(),
          code: 'hacked',
          kind: 'structural',
          isHeadOfUnit: true,
          status: 'closed',
          period: { start: '2000-01-01', end: '2000-01-02' },
        } as never),
      )

      expect(updated).toMatchObject({
        unit_id: unitId,
        code: 'perawat',
        kind: 'functional',
        is_head_of_unit: false,
        status: 'active',
        period: created.period,
      })
    })

    it('answers 422 empty_update when only immutable fields are sent', async () => {
      const created = await addPosition('perawat')

      await expect(
        asAdmin(() =>
          service.update(tenantId, created.id, { code: 'x' } as never),
        ),
      ).rejects.toMatchObject({ code: 'empty_update' })
    })

    it('checks new professions, grade and headcount like created ones', async () => {
      const created = await addPosition('perawat')

      const cases: [UpdatePositionInput, string][] = [
        [{ budgetedHeadcount: 0 }, 'invalid_headcount'],
        [
          { allowedProfessions: [{ system: 'id.profession', code: 'lama' }] },
          'code_retired',
        ],
        [
          { grade: { system: 'id.profession', code: 'perawat' } },
          'invalid_grade',
        ],
        [{ grade: { system: 'rs.job-grade', code: 'g6' } }, 'code_retired'],
        [{ title: [] }, 'invalid_title'],
      ]
      for (const [input, code] of cases) {
        await expect(
          asAdmin(() => service.update(tenantId, created.id, input)),
        ).rejects.toMatchObject({ code })
      }
    })

    it('keeps the headcount of a head position at 1', async () => {
      const head = await addPosition('head', {
        kind: 'structural',
        isHeadOfUnit: true,
      })

      await expect(
        asAdmin(() =>
          service.update(tenantId, head.id, { budgetedHeadcount: 2 }),
        ),
      ).rejects.toMatchObject({ code: 'head_headcount' })
      expect(
        (
          await asAdmin(() =>
            service.update(tenantId, head.id, { budgetedHeadcount: 1 }),
          )
        ).budgeted_headcount,
      ).toBe(1)
    })

    it('refuses to change a closed position', async () => {
      const created = await addPosition('perawat')
      await asAdmin(() => service.close(tenantId, created.id, {}))

      await expect(
        asAdmin(() =>
          service.update(tenantId, created.id, { budgetedHeadcount: 3 }),
        ),
      ).rejects.toMatchObject({ code: 'position_closed' })
    })

    it('answers 409 stale_version for an old version', async () => {
      const created = await addPosition('perawat')
      await asAdmin(() =>
        service.update(tenantId, created.id, { budgetedHeadcount: 2 }),
      )

      await expect(
        asAdmin(() =>
          service.update(tenantId, created.id, {
            budgetedHeadcount: 3,
            version: created.version,
          }),
        ),
      ).rejects.toMatchObject({ kind: 'conflict', code: 'stale_version' })
    })

    it('answers not found for another tenant and for malformed and missing ids', async () => {
      const created = await addPosition('perawat')

      for (const [tenant, id] of [
        [otherTenantId, created.id],
        [tenantId, 'not-an-id'],
        [tenantId, new Types.ObjectId().toHexString()],
      ]) {
        await expect(
          asAdmin(() => service.update(tenant, id, { budgetedHeadcount: 2 })),
        ).rejects.toMatchObject({
          kind: 'not_found',
          code: 'position_not_found',
        })
      }
    })

    it('passes the reason to the change history without logging it', async () => {
      const created = await addPosition('perawat')
      vi.clearAllMocks()

      await asAdmin(() =>
        service.update(tenantId, created.id, {
          budgetedHeadcount: 2,
          reason: 'Alasan Rahasia',
        }),
      )

      expect(log).toHaveBeenCalledTimes(1)
      expect(JSON.stringify(log.mock.calls)).not.toContain('Rahasia')
    })
  })

  describe('close', () => {
    it('closes a position with the end date of today in the facility time zone', async () => {
      const created = await addPosition('perawat', { startDate: '2026-01-01' })
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-03-10T18:00:00Z'))

      const closed = await asAdmin(() =>
        service.close(tenantId, created.id, {}),
      )

      expect(closed.status).toBe('closed')
      expect(closed.period).toEqual({ start: '2026-01-01', end: '2026-03-11' })
    })

    it('takes a given end date, and refuses a bad one or one before the start', async () => {
      const created = await addPosition('perawat', { startDate: '2026-01-10' })

      for (const endDate of ['2026-01-09', '2026-13-01', 'tomorrow']) {
        await expect(
          asAdmin(() => service.close(tenantId, created.id, { endDate })),
        ).rejects.toMatchObject({ code: 'invalid_end_date' })
      }
      const closed = await asAdmin(() =>
        service.close(tenantId, created.id, { endDate: '2026-02-01' }),
      )
      expect(closed.period).toEqual({ start: '2026-01-10', end: '2026-02-01' })
    })

    it('cannot close twice or reopen, and stays readable', async () => {
      const created = await addPosition('perawat')
      await asAdmin(() => service.close(tenantId, created.id, {}))

      await expect(
        asAdmin(() => service.close(tenantId, created.id, {})),
      ).rejects.toMatchObject({ code: 'position_closed' })
      expect((await service.get(tenantId, created.id)).status).toBe('closed')
    })

    it('answers 409 stale_version and not found for another tenant', async () => {
      const created = await addPosition('perawat')

      await expect(
        asAdmin(() =>
          service.close(tenantId, created.id, { version: created.version + 3 }),
        ),
      ).rejects.toMatchObject({ code: 'stale_version' })
      await expect(
        asAdmin(() => service.close(otherTenantId, created.id, {})),
      ).rejects.toMatchObject({ code: 'position_not_found' })
    })
  })

  describe('reads', () => {
    it('lists the positions of a unit ordered by code, with filters and paging, and writes no log', async () => {
      await addPosition('b-pos')
      const closed = await addPosition('a-pos')
      await addPosition('head', { kind: 'structural', isHeadOfUnit: true })
      await asAdmin(() => service.close(tenantId, closed.id, {}))
      vi.clearAllMocks()

      const all = await service.list(tenantId, { unitId })
      const active = await service.list(tenantId, {
        unitId,
        status: 'active',
        limit: 1,
        offset: 1,
      })
      const heads = await service.list(tenantId, {
        unitId,
        isHeadOfUnit: true,
      })
      const structural = await service.list(tenantId, {
        unitId,
        kind: 'structural',
      })
      const others = await service.list(tenantId, {
        unitId,
        isHeadOfUnit: false,
      })

      expect(all.data.map((item) => item.code)).toEqual([
        'a-pos',
        'b-pos',
        'head',
      ])
      expect(active.data.map((item) => item.code)).toEqual(['head'])
      expect(active.totalRecords).toBe(2)
      expect(heads.data.map((item) => item.code)).toEqual(['head'])
      expect(structural.data).toHaveLength(1)
      expect(others.data.map((item) => item.code)).toEqual(['a-pos', 'b-pos'])
      for (const level of [log, warn, error, debug]) {
        expect(level).not.toHaveBeenCalled()
      }
    })

    it('gives an empty list for a foreign or missing unit (P13)', async () => {
      await addPosition('perawat')
      const foreign = await addUnit(otherTenantId, 'ward-x')

      for (const id of [foreign.id, new Types.ObjectId().toHexString()]) {
        expect((await service.list(tenantId, { unitId: id })).data).toEqual([])
      }
      expect((await service.list(otherTenantId, { unitId })).data).toEqual([])
    })

    it('gets one position, and answers not found for another tenant, a malformed id and a missing id without logging', async () => {
      const created = await addPosition('perawat')
      vi.clearAllMocks()

      expect((await service.get(tenantId, created.id)).code).toBe('perawat')
      for (const [tenant, id] of [
        [otherTenantId, created.id],
        [tenantId, 'not-an-id'],
        [tenantId, new Types.ObjectId().toHexString()],
      ]) {
        await expect(service.get(tenant, id)).rejects.toMatchObject({
          code: 'position_not_found',
        })
      }
      for (const level of [log, warn, error, debug]) {
        expect(level).not.toHaveBeenCalled()
      }
    })
  })
})
