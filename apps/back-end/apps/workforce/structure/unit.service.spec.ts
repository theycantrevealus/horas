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
import { MAX_TREE_UNITS, UnitService } from './unit.service'

describe('UnitService', () => {
  const tenantId = new Types.ObjectId().toHexString()
  const otherTenantId = new Types.ObjectId().toHexString()
  const organizationId = new Types.ObjectId().toHexString()
  const log = vi.fn()
  const warn = vi.fn()
  const error = vi.fn()
  const debug = vi.fn()
  let units: InMemoryOrganizationUnits
  let positions: InMemoryPositions
  let facilities: InMemoryFacilities
  let concepts: InMemoryCodeConcepts
  let service: UnitService
  let facilityId: string

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
   * Adds a facility.
   *
   * @param tenant - Tenant of the facility.
   * @param code - Facility code.
   * @param options - Time zone and status.
   * @returns The facility.
   */
  function addFacility(
    tenant: string,
    code: string,
    options: { timezone?: string; status?: 'active' | 'inactive' } = {},
  ) {
    return asAdmin(() =>
      facilities.create({
        tenant_id: tenant,
        organization_id: organizationId,
        code,
        name: [{ locale: 'en', text: code }],
        address: null,
        timezone: options.timezone ?? 'Asia/Jakarta',
        holiday_calendar_codes: [],
        external_ids: [],
        status: options.status ?? 'active',
      }),
    )
  }

  /**
   * Adds a platform-wide unit type concept.
   *
   * @param code - Concept code.
   * @param clinicalDefault - Value of the `clinical_default` property.
   * @param status - Concept status.
   * @param system - Code system.
   */
  async function addType(
    code: string,
    clinicalDefault: boolean,
    status: 'active' | 'retired' = 'active',
    system = 'id.unit-type',
  ) {
    await asAdmin(() =>
      concepts.create({
        system,
        code,
        display: [{ locale: 'en', text: code }],
        properties: { clinical_default: clinicalDefault },
        mappings: [],
        period: null,
        status,
      }),
    )
  }

  /**
   * Creates a unit through the service.
   *
   * @param code - Unit code.
   * @param override - Fields that replace the defaults.
   * @returns The created unit.
   */
  function addUnit(code: string, override: object = {}) {
    return asAdmin(() =>
      service.create(tenantId, {
        facilityId,
        code,
        name: [{ locale: 'en', text: `Unit ${code}` }],
        type: { system: 'id.unit-type', code: 'department' },
        ...override,
      }),
    )
  }

  beforeEach(async () => {
    vi.resetAllMocks()
    units = new InMemoryOrganizationUnits()
    positions = new InMemoryPositions()
    facilities = new InMemoryFacilities()
    concepts = new InMemoryCodeConcepts()
    const logger = { log, warn, error, debug } as unknown as AppLogger
    service = new UnitService(
      units,
      facilities,
      positions,
      new CodeConceptService(concepts, logger),
      logger,
    )
    await addType('ward', true)
    await addType('department', false)
    await addType('old-type', false, 'retired')
    await addType('ward', true, 'active', 'id.other')
    facilityId = (await addFacility(tenantId, 'rs-sehat')).id
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('create', () => {
    it('creates an active top unit with the organization of its facility and the default clinical flag of its type', async () => {
      const created = await addUnit('ward-a', {
        type: { system: 'id.unit-type', code: 'ward' },
      })

      expect(created).toMatchObject({
        tenant_id: tenantId,
        organization_id: organizationId,
        facility_id: facilityId,
        code: 'ward-a',
        type: { system: 'id.unit-type', code: 'ward' },
        parent_id: null,
        ancestor_ids: [],
        is_clinical: true,
        status: 'active',
      })
      expect((await addUnit('dept-a')).is_clinical).toBe(false)
    })

    it('lets an explicit clinical flag win over the type default', async () => {
      const created = await addUnit('dept-b', { isClinical: true })

      expect(created.is_clinical).toBe(true)
    })

    it('starts the period today in the facility time zone, not in UTC (HR plan U6)', async () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-03-10T18:00:00Z'))

      const created = await addUnit('dept-c')

      expect(created.period).toEqual({ start: '2026-03-11', end: null })
    })

    it('takes a given start date', async () => {
      const created = await addUnit('dept-d', { startDate: '2025-12-01' })

      expect(created.period).toEqual({ start: '2025-12-01', end: null })
    })

    it('builds the ancestors under a parent', async () => {
      const top = await addUnit('dir')
      const mid = await addUnit('dept', { parentId: top.id })
      const leaf = await addUnit('ward', { parentId: mid.id })

      expect(mid.ancestor_ids).toEqual([top.id])
      expect(leaf.parent_id).toBe(mid.id)
      expect(leaf.ancestor_ids).toEqual([top.id, mid.id])
    })

    it('allows several top units and the same code in another facility', async () => {
      const other = await addFacility(tenantId, 'rs-lain')
      await addUnit('dir')
      await addUnit('dir-2')

      const same = await asAdmin(() =>
        service.create(tenantId, {
          facilityId: other.id,
          code: 'dir',
          name: [{ locale: 'en', text: 'Dir' }],
          type: { system: 'id.unit-type', code: 'department' },
        }),
      )

      expect(same.facility_id).toBe(other.id)
    })

    it('writes one success entry without any value', async () => {
      await addUnit('secret-code')

      expect(log).toHaveBeenCalledTimes(1)
      expect(log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'unit_create',
          outcome: 'success',
        }),
      )
      expect(JSON.stringify(log.mock.calls)).not.toContain('secret-code')
      expect(JSON.stringify(log.mock.calls)).not.toContain('Unit ')
    })

    it.each([
      ['a bad code', { code: 'A' }, 'invalid_code'],
      ['no names', { name: [] }, 'invalid_name'],
      [
        'repeated external systems',
        {
          externalIds: [
            { system: 's', value: '1' },
            { system: 's', value: '2' },
          ],
        },
        'invalid_external_ids',
      ],
      [
        'a type of another kind of system',
        { type: { system: 'id.license-type', code: 'str' } },
        'invalid_type',
      ],
      [
        'an unknown type',
        { type: { system: 'id.unit-type', code: 'nope' } },
        'unknown_code',
      ],
      [
        'a retired type',
        { type: { system: 'id.unit-type', code: 'old-type' } },
        'code_retired',
      ],
      ['a bad start date', { startDate: '2026-02-30' }, 'invalid_start_date'],
    ])('rejects %s with 422 %s', async (_label, override, code) => {
      await expect(addUnit('dept-x', override)).rejects.toMatchObject({
        kind: 'invalid',
        code,
      })
    })

    it('accepts a unit-type system of another country', async () => {
      await addType('ward', true, 'active', 'us.unit-type')

      const created = await addUnit('us-ward', {
        type: { system: 'us.unit-type', code: 'ward' },
      })

      expect(created.type.system).toBe('us.unit-type')
    })

    it('answers one error for a missing, foreign and soft-deleted facility, and another for an inactive one (U4)', async () => {
      const foreign = await addFacility(otherTenantId, 'rs-asing')
      const deleted = await addFacility(tenantId, 'rs-hapus')
      await facilities.deleteSoft(deleted.id)
      const inactive = await addFacility(tenantId, 'rs-mati', {
        status: 'inactive',
      })

      for (const id of [
        new Types.ObjectId().toHexString(),
        foreign.id,
        deleted.id,
      ]) {
        await expect(
          addUnit('dept-y', { facilityId: id }),
        ).rejects.toMatchObject({ code: 'facility_not_found' })
      }
      await expect(
        addUnit('dept-y', { facilityId: inactive.id }),
      ).rejects.toMatchObject({ code: 'facility_inactive' })
    })

    it('answers one error for a missing, foreign and other-facility parent, and another for a closed one (U5)', async () => {
      const otherFacility = await addFacility(tenantId, 'rs-lain')
      const elsewhere = await asAdmin(() =>
        service.create(tenantId, {
          facilityId: otherFacility.id,
          code: 'dir',
          name: [{ locale: 'en', text: 'Dir' }],
          type: { system: 'id.unit-type', code: 'department' },
        }),
      )
      const foreign = await asAdmin(() =>
        units.create({
          ...elsewhere,
          tenant_id: otherTenantId,
          code: 'dir',
        } as never),
      )
      const closed = await addUnit('closed')
      await asAdmin(() => service.close(tenantId, closed.id, {}))

      for (const parentId of [
        new Types.ObjectId().toHexString(),
        elsewhere.id,
        foreign.id,
      ]) {
        await expect(addUnit('child', { parentId })).rejects.toMatchObject({
          code: 'parent_not_found',
        })
      }
      await expect(
        addUnit('child', { parentId: closed.id }),
      ).rejects.toMatchObject({ code: 'parent_closed' })
    })

    it('refuses a unit deeper than 10 levels and accepts level 10', async () => {
      let parentId: string | undefined
      for (let level = 1; level <= 10; level += 1) {
        parentId = (await addUnit(`level-${level}`, { parentId })).id
      }

      await expect(addUnit('level-11', { parentId })).rejects.toMatchObject({
        code: 'too_deep',
      })
    })

    it('answers 409 for a code taken in the facility, also when two requests race', async () => {
      await addUnit('dept')

      await expect(addUnit('dept')).rejects.toMatchObject({
        kind: 'conflict',
        code: 'unit_exists',
      })

      // The pre-check misses a request that lost the race; the unique index still decides.
      vi.spyOn(units, 'findByCode').mockResolvedValueOnce(null)
      await expect(addUnit('dept')).rejects.toMatchObject({
        code: 'unit_exists',
      })
    })

    it('logs a rejection as warn with its code and no values', async () => {
      await addUnit('dept')
      vi.clearAllMocks()

      await expect(addUnit('dept')).rejects.toBeDefined()

      expect(warn).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'unit_create',
          outcome: 'failure',
          code: 'unit_exists',
        }),
      )
      expect(JSON.stringify(warn.mock.calls)).not.toContain('dept')
    })
  })

  describe('update', () => {
    it('edits names, type, clinical flag and external ids, and bumps the version', async () => {
      const created = await addUnit('dept')

      const updated = await asAdmin(() =>
        service.update(tenantId, created.id, {
          name: [{ locale: 'id-ID', text: 'Bagian Baru' }],
          type: { system: 'id.unit-type', code: 'ward' },
          isClinical: true,
          externalIds: [{ system: 'satusehat', value: 'abc' }],
        }),
      )

      expect(updated).toMatchObject({
        name: [{ locale: 'id-ID', text: 'Bagian Baru' }],
        type: { system: 'id.unit-type', code: 'ward' },
        is_clinical: true,
        external_ids: [{ system: 'satusehat', value: 'abc' }],
        version: created.version + 1,
      })
    })

    it('ignores the facility, code, parent, status and period when they are sent (HR plan review 5)', async () => {
      const top = await addUnit('dir')
      const created = await addUnit('dept', { parentId: top.id })

      const updated = await asAdmin(() =>
        service.update(tenantId, created.id, {
          name: [{ locale: 'en', text: 'New' }],
          facilityId: new Types.ObjectId().toHexString(),
          code: 'hacked',
          parentId: null,
          status: 'closed',
          period: { start: '2000-01-01', end: '2000-01-02' },
        } as never),
      )

      expect(updated).toMatchObject({
        facility_id: facilityId,
        code: 'dept',
        parent_id: top.id,
        status: 'active',
        period: created.period,
      })
    })

    it('answers 422 empty_update when only immutable fields are sent', async () => {
      const created = await addUnit('dept')

      await expect(
        asAdmin(() =>
          service.update(tenantId, created.id, { code: 'x' } as never),
        ),
      ).rejects.toMatchObject({ code: 'empty_update' })
    })

    it('checks a new type like a created one', async () => {
      const created = await addUnit('dept')

      for (const [type, code] of [
        [{ system: 'id.unit-type', code: 'old-type' }, 'code_retired'],
        [{ system: 'id.unit-type', code: 'nope' }, 'unknown_code'],
        [{ system: 'id.license-type', code: 'str' }, 'invalid_type'],
      ] as const) {
        await expect(
          asAdmin(() => service.update(tenantId, created.id, { type })),
        ).rejects.toMatchObject({ code })
      }
    })

    it('refuses to change a closed unit', async () => {
      const created = await addUnit('dept')
      await asAdmin(() => service.close(tenantId, created.id, {}))

      await expect(
        asAdmin(() =>
          service.update(tenantId, created.id, {
            name: [{ locale: 'en', text: 'x' }],
          }),
        ),
      ).rejects.toMatchObject({ code: 'unit_closed' })
    })

    it('answers 409 stale_version when the version is old', async () => {
      const created = await addUnit('dept')
      await asAdmin(() =>
        service.update(tenantId, created.id, {
          name: [{ locale: 'en', text: 'x' }],
        }),
      )

      await expect(
        asAdmin(() =>
          service.update(tenantId, created.id, {
            name: [{ locale: 'en', text: 'y' }],
            version: created.version,
          }),
        ),
      ).rejects.toMatchObject({ kind: 'conflict', code: 'stale_version' })
    })

    it('answers not found for another tenant and for malformed ids', async () => {
      const created = await addUnit('dept')

      for (const [tenant, id] of [
        [otherTenantId, created.id],
        [tenantId, 'not-an-id'],
        [tenantId, new Types.ObjectId().toHexString()],
      ]) {
        await expect(
          asAdmin(() =>
            service.update(tenant, id, {
              name: [{ locale: 'en', text: 'x' }],
            }),
          ),
        ).rejects.toMatchObject({ kind: 'not_found', code: 'unit_not_found' })
      }
    })
  })

  describe('move', () => {
    /**
     * Builds dir > dept > ward and a second top unit `other`.
     *
     * @returns The four units.
     */
    async function chart() {
      const dir = await addUnit('dir')
      const dept = await addUnit('dept', { parentId: dir.id })
      const ward = await addUnit('ward', { parentId: dept.id })
      const other = await addUnit('other')
      return { dir, dept, ward, other }
    }

    it('moves a unit and rewrites the ancestors of everything below it', async () => {
      const { dir, dept, ward, other } = await chart()

      const moved = await asAdmin(() =>
        service.move(tenantId, dept.id, { parentId: other.id }),
      )

      expect(moved).toMatchObject({
        parent_id: other.id,
        ancestor_ids: [other.id],
      })
      expect((await service.get(tenantId, ward.id)).ancestor_ids).toEqual([
        other.id,
        dept.id,
      ])
      expect(
        (await units.findChildren(tenantId, dir.id)).map((unit) => unit.id),
      ).toEqual([])
      expect(
        (await units.findDescendants(tenantId, dir.id)).map((unit) => unit.id),
      ).toEqual([])
    })

    it('moves a unit to the top with parentId null', async () => {
      const { dept, ward } = await chart()

      const moved = await asAdmin(() =>
        service.move(tenantId, dept.id, { parentId: null }),
      )

      expect(moved).toMatchObject({ parent_id: null, ancestor_ids: [] })
      expect((await service.get(tenantId, ward.id)).ancestor_ids).toEqual([
        dept.id,
      ])
    })

    it('refuses a move to the parent the unit already has, also to the top for a top unit', async () => {
      const { dir, dept, other } = await chart()

      await expect(
        asAdmin(() => service.move(tenantId, dept.id, { parentId: dir.id })),
      ).rejects.toMatchObject({ code: 'same_parent' })
      await expect(
        asAdmin(() => service.move(tenantId, other.id, { parentId: null })),
      ).rejects.toMatchObject({ code: 'same_parent' })
    })

    it('refuses a move under itself or under its own descendant (unit_cycle)', async () => {
      const { dept, ward } = await chart()

      for (const parentId of [dept.id, ward.id]) {
        await expect(
          asAdmin(() => service.move(tenantId, dept.id, { parentId })),
        ).rejects.toMatchObject({ code: 'unit_cycle' })
      }
      expect((await service.get(tenantId, dept.id)).version).toBe(dept.version)
    })

    it('refuses a missing, foreign, other-facility or closed parent', async () => {
      const { dept } = await chart()
      const otherFacility = await addFacility(tenantId, 'rs-lain')
      const elsewhere = await asAdmin(() =>
        service.create(tenantId, {
          facilityId: otherFacility.id,
          code: 'dir',
          name: [{ locale: 'en', text: 'Dir' }],
          type: { system: 'id.unit-type', code: 'department' },
        }),
      )
      const closed = await addUnit('closed')
      await asAdmin(() => service.close(tenantId, closed.id, {}))

      for (const parentId of [
        new Types.ObjectId().toHexString(),
        elsewhere.id,
      ]) {
        await expect(
          asAdmin(() => service.move(tenantId, dept.id, { parentId })),
        ).rejects.toMatchObject({ code: 'parent_not_found' })
      }
      await expect(
        asAdmin(() => service.move(tenantId, dept.id, { parentId: closed.id })),
      ).rejects.toMatchObject({ code: 'parent_closed' })
    })

    it('checks the depth of the whole moved subtree', async () => {
      // chain of 9 levels under `deep`, and a 2-level subtree that would reach level 11.
      let parentId: string | undefined
      for (let level = 1; level <= 9; level += 1) {
        parentId = (await addUnit(`deep-${level}`, { parentId })).id
      }
      const root = await addUnit('sub')
      await addUnit('sub-child', { parentId: root.id })

      await expect(
        asAdmin(() =>
          service.move(tenantId, root.id, { parentId: parentId ?? null }),
        ),
      ).rejects.toMatchObject({ code: 'too_deep' })
    })

    it('refuses to move a closed unit and answers 409 for a stale version', async () => {
      const { dept, other } = await chart()

      await expect(
        asAdmin(() =>
          service.move(tenantId, dept.id, {
            parentId: other.id,
            version: dept.version + 5,
          }),
        ),
      ).rejects.toMatchObject({ code: 'stale_version' })

      await asAdmin(() => service.close(tenantId, other.id, {}))
      await expect(
        asAdmin(() => service.move(tenantId, other.id, { parentId: null })),
      ).rejects.toMatchObject({ code: 'unit_closed' })
    })

    it('writes one entry without values and passes the reason on', async () => {
      const { dept, other } = await chart()
      vi.clearAllMocks()

      await asAdmin(() =>
        service.move(tenantId, dept.id, {
          parentId: other.id,
          reason: 'Reorganization',
        }),
      )

      expect(log).toHaveBeenCalledTimes(1)
      expect(log).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'unit_move', outcome: 'success' }),
      )
      expect(JSON.stringify(log.mock.calls)).not.toContain('Reorganization')
    })

    it('answers not found for another tenant', async () => {
      const { dept, other } = await chart()

      await expect(
        asAdmin(() =>
          service.move(otherTenantId, dept.id, { parentId: other.id }),
        ),
      ).rejects.toMatchObject({ code: 'unit_not_found' })
    })
  })

  describe('close', () => {
    it('closes a unit with the end date of today in the facility time zone (U6, U8)', async () => {
      const created = await addUnit('dept', { startDate: '2026-01-01' })
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-03-10T18:00:00Z'))

      const closed = await asAdmin(() =>
        service.close(tenantId, created.id, {}),
      )

      expect(closed.status).toBe('closed')
      expect(closed.period).toEqual({ start: '2026-01-01', end: '2026-03-11' })
    })

    it('takes a given end date, and refuses a bad one or one before the start', async () => {
      const created = await addUnit('dept', { startDate: '2026-01-10' })

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

    it('refuses while an active child exists (409 unit_in_use) and allows it when all children are closed', async () => {
      const dir = await addUnit('dir')
      const dept = await addUnit('dept', { parentId: dir.id })

      await expect(
        asAdmin(() => service.close(tenantId, dir.id, {})),
      ).rejects.toMatchObject({ kind: 'conflict', code: 'unit_in_use' })
      expect((await service.get(tenantId, dir.id)).status).toBe('active')

      await asAdmin(() => service.close(tenantId, dept.id, {}))
      const closed = await asAdmin(() => service.close(tenantId, dir.id, {}))
      expect(closed.status).toBe('closed')
    })

    it('refuses while an active position exists (409 unit_in_use) and allows it when the positions are closed (HR plan P10)', async () => {
      const created = await addUnit('dept')
      const position = await asAdmin(() =>
        positions.create({
          tenant_id: tenantId,
          unit_id: created.id,
          code: 'perawat',
          title: [{ locale: 'en', text: 'Nurse' }],
          kind: 'functional',
          is_head_of_unit: false,
          allowed_professions: [],
          grade: null,
          budgeted_headcount: 1,
          job_description: null,
          period: null,
          status: 'active',
        }),
      )

      await expect(
        asAdmin(() => service.close(tenantId, created.id, {})),
      ).rejects.toMatchObject({ kind: 'conflict', code: 'unit_in_use' })

      await asAdmin(() => positions.update(position.id, { status: 'closed' }))
      const closed = await asAdmin(() =>
        service.close(tenantId, created.id, {}),
      )
      expect(closed.status).toBe('closed')
    })

    it('cannot close twice, reopen, edit or add children to a closed unit', async () => {
      const created = await addUnit('dept')
      await asAdmin(() => service.close(tenantId, created.id, {}))

      await expect(
        asAdmin(() => service.close(tenantId, created.id, {})),
      ).rejects.toMatchObject({ code: 'unit_closed' })
      await expect(
        asAdmin(() =>
          service.update(tenantId, created.id, {
            status: 'active',
            isClinical: true,
          } as never),
        ),
      ).rejects.toMatchObject({ code: 'unit_closed' })
      await expect(
        addUnit('child', { parentId: created.id }),
      ).rejects.toMatchObject({ code: 'parent_closed' })
      expect((await service.get(tenantId, created.id)).status).toBe('closed')
    })

    it('answers 409 stale_version and not found for another tenant', async () => {
      const created = await addUnit('dept')

      await expect(
        asAdmin(() =>
          service.close(tenantId, created.id, { version: created.version + 3 }),
        ),
      ).rejects.toMatchObject({ code: 'stale_version' })
      await expect(
        asAdmin(() => service.close(otherTenantId, created.id, {})),
      ).rejects.toMatchObject({ code: 'unit_not_found' })
    })

    it('reads a closed unit and a unit of an inactive facility', async () => {
      const created = await addUnit('dept')
      await asAdmin(() => service.close(tenantId, created.id, {}))
      await facilities.update(facilityId, { status: 'inactive' })

      expect((await service.get(tenantId, created.id)).status).toBe('closed')
    })
  })

  describe('reads', () => {
    it('lists the units of a facility ordered by code, with filters and paging, and writes no log', async () => {
      const dir = await addUnit('dir')
      await addUnit('b-dept', { parentId: dir.id })
      const closed = await addUnit('a-dept', { parentId: dir.id })
      await asAdmin(() => service.close(tenantId, closed.id, {}))
      vi.clearAllMocks()

      const all = await service.list(tenantId, { facilityId })
      const children = await service.list(tenantId, {
        facilityId,
        parentId: dir.id,
      })
      const active = await service.list(tenantId, {
        facilityId,
        status: 'active',
        limit: 1,
        offset: 1,
      })

      expect(all.data.map((unit) => unit.code)).toEqual([
        'a-dept',
        'b-dept',
        'dir',
      ])
      expect(children.data.map((unit) => unit.code)).toEqual([
        'a-dept',
        'b-dept',
      ])
      expect(active.data.map((unit) => unit.code)).toEqual(['dir'])
      expect(active.totalRecords).toBe(2)
      for (const level of [log, warn, error, debug]) {
        expect(level).not.toHaveBeenCalled()
      }
    })

    it('gives an empty list and tree for a foreign or missing facility (U12)', async () => {
      await addUnit('dir')
      const foreign = await addFacility(otherTenantId, 'rs-asing')

      for (const id of [foreign.id, new Types.ObjectId().toHexString()]) {
        expect((await service.list(tenantId, { facilityId: id })).data).toEqual(
          [],
        )
        expect(await service.tree(tenantId, { facilityId: id })).toEqual([])
      }
      expect((await service.list(otherTenantId, { facilityId })).data).toEqual(
        [],
      )
    })

    it('answers the chart as nested nodes ordered by code, without record fields', async () => {
      const dir = await addUnit('dir')
      await addUnit('z-dept', { parentId: dir.id })
      const a = await addUnit('a-dept', { parentId: dir.id })
      await addUnit('ward', { parentId: a.id })
      await addUnit('dir-2')

      const tree = await service.tree(tenantId, { facilityId })

      expect(tree.map((node) => node.code)).toEqual(['dir', 'dir-2'])
      expect(tree[0].children.map((node) => node.code)).toEqual([
        'a-dept',
        'z-dept',
      ])
      expect(tree[0].children[0].children.map((node) => node.code)).toEqual([
        'ward',
      ])
      expect(Object.keys(tree[0]).sort()).toEqual(
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
    })

    it('leaves closed units out of the chart unless asked, and reads one subtree with rootId', async () => {
      const dir = await addUnit('dir')
      const dept = await addUnit('dept', { parentId: dir.id })
      const ward = await addUnit('ward', { parentId: dept.id })
      await asAdmin(() => service.close(tenantId, ward.id, {}))

      const active = await service.tree(tenantId, { facilityId })
      const full = await service.tree(tenantId, {
        facilityId,
        includeClosed: true,
      })
      const sub = await service.tree(tenantId, {
        facilityId,
        rootId: dept.id,
        includeClosed: true,
      })

      expect(active[0].children[0].children).toEqual([])
      expect(full[0].children[0].children.map((node) => node.code)).toEqual([
        'ward',
      ])
      expect(sub).toHaveLength(1)
      expect(sub[0]).toMatchObject({ code: 'dept' })
      expect(sub[0].children.map((node) => node.code)).toEqual(['ward'])
    })

    it('answers not found for a root of another facility or tenant', async () => {
      const dir = await addUnit('dir')
      const otherFacility = await addFacility(tenantId, 'rs-lain')

      await expect(
        service.tree(tenantId, {
          facilityId: otherFacility.id,
          rootId: dir.id,
        }),
      ).rejects.toMatchObject({ code: 'unit_not_found' })
      await expect(
        service.tree(otherTenantId, { facilityId, rootId: dir.id }),
      ).rejects.toMatchObject({ code: 'unit_not_found' })
    })

    it('refuses a chart of more than 2,000 units (tree_too_large)', async () => {
      for (let index = 0; index <= MAX_TREE_UNITS; index += 1) {
        await asAdmin(() =>
          units.create({
            tenant_id: tenantId,
            organization_id: organizationId,
            facility_id: facilityId,
            code: `bulk-${index}`,
            name: [{ locale: 'en', text: 'x' }],
            type: { system: 'id.unit-type', code: 'ward' },
            parent_id: null,
            ancestor_ids: [],
            is_clinical: true,
            external_ids: [],
            period: null,
            status: 'active',
          }),
        )
      }

      await expect(
        service.tree(tenantId, { facilityId }),
      ).rejects.toMatchObject({ kind: 'invalid', code: 'tree_too_large' })
      expect(
        (await service.list(tenantId, { facilityId, limit: 5 })).data,
      ).toHaveLength(5)
    })

    it('gets one unit, and answers not found for another tenant, a malformed id and a missing id without logging', async () => {
      const created = await addUnit('dept')
      vi.clearAllMocks()

      expect((await service.get(tenantId, created.id)).code).toBe('dept')
      for (const [tenant, id] of [
        [otherTenantId, created.id],
        [tenantId, 'not-an-id'],
        [tenantId, new Types.ObjectId().toHexString()],
      ]) {
        await expect(service.get(tenant, id)).rejects.toMatchObject({
          code: 'unit_not_found',
        })
      }
      for (const level of [log, warn, error, debug]) {
        expect(level).not.toHaveBeenCalled()
      }
    })
  })
})
