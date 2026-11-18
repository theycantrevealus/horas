import { Types } from 'mongoose'
import { runWithRequestContext } from '@utility/logger/context'
import { type AppLogger } from '@utility/logger/service'
import { CodeConceptService } from '../concept/code-concept.service'
import {
  InMemoryCodeConcepts,
  InMemoryFacilities,
  InMemoryPrivilegeCatalog,
} from '../testing/in-memory'
import {
  PrivilegeService,
  type CreatePrivilegeInput,
} from './privilege.service'

describe('PrivilegeService', () => {
  const tenantId = new Types.ObjectId().toHexString()
  const otherTenantId = new Types.ObjectId().toHexString()
  const organizationId = new Types.ObjectId().toHexString()
  const log = vi.fn()
  const warn = vi.fn()
  const error = vi.fn()
  const debug = vi.fn()
  let catalog: InMemoryPrivilegeCatalog
  let facilities: InMemoryFacilities
  let concepts: InMemoryCodeConcepts
  let service: PrivilegeService
  let facilityId: string

  const committee = { system: 'id.committee', code: 'komite_medik' }
  const dokter = { system: 'id.profession', code: 'dokter' }
  const text = (value: string, locale = 'id-ID') => [{ locale, text: value }]

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
   * Adds a code concept.
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
   * Adds a facility.
   *
   * @param override - Tenant and soft-delete flag.
   * @returns The facility.
   */
  function addFacility(override: { tenant?: string } = {}) {
    return asAdmin(() =>
      facilities.create({
        tenant_id: override.tenant ?? tenantId,
        organization_id: organizationId,
        code: `f-${new Types.ObjectId().toHexString()}`,
        name: [{ locale: 'en', text: 'RS' }],
        address: null,
        timezone: 'Asia/Jakarta',
        holiday_calendar_codes: [],
        external_ids: [],
        status: 'active',
      }),
    )
  }

  /**
   * Adds an item through the service; the defaults make a minimal item.
   *
   * @param override - Fields that replace the defaults.
   * @returns The item.
   */
  function add(override: Partial<CreatePrivilegeInput> = {}) {
    return asAdmin(() =>
      service.create(tenantId, {
        code: ' pd-012 ',
        name: text('Pemasangan kateter vena sentral'),
        committee,
        professions: [dokter],
        ...override,
      }),
    )
  }

  /**
   * Captures the rejection of a call.
   *
   * @param work - The call.
   * @returns The thrown error.
   */
  async function rejection(work: () => Promise<unknown>) {
    try {
      await work()
    } catch (thrown: unknown) {
      return thrown
    }
    throw new Error('Expected a rejection')
  }

  beforeEach(async () => {
    vi.resetAllMocks()
    catalog = new InMemoryPrivilegeCatalog()
    facilities = new InMemoryFacilities()
    concepts = new InMemoryCodeConcepts()
    const logger = { log, warn, error, debug } as unknown as AppLogger
    service = new PrivilegeService(
      catalog,
      facilities,
      new CodeConceptService(concepts, logger),
      logger,
    )
    await addConcept('id.committee', 'komite_medik')
    await addConcept('id.committee', 'komite_keperawatan')
    await addConcept('id.committee', 'lama', 'retired')
    await addConcept('id.profession', 'dokter')
    await addConcept('id.profession', 'perawat')
    await addConcept('id.specialty', 'bedah')
    await addConcept('id.clinical-level', 'pk3')
    await addConcept('id.evidence-type', 'logbook')
    await addConcept('id.evidence-type', 'certificate')
    facilityId = (await addFacility()).id
  })

  describe('create', () => {
    it('adds an active item with a normalized code, defaults and one log entry without values', async () => {
      const created = await add({ reason: 'Alasan Rahasia' })

      expect(created).toMatchObject({
        tenant_id: tenantId,
        code: 'PD-012',
        name: [{ locale: 'id-ID', text: 'Pemasangan kateter vena sentral' }],
        description: [],
        committee: { code: 'komite_medik' },
        professions: [{ code: 'dokter' }],
        specialties: [],
        min_clinical_level: null,
        required_evidence: [],
        external_codes: [],
        facility_ids: [],
        status: 'active',
      })
      expect(log).toHaveBeenCalledTimes(1)
      expect(log.mock.calls[0]?.[0]).toMatchObject({
        event: 'privilege_create',
        outcome: 'success',
      })
      expect(JSON.stringify(log.mock.calls)).not.toContain('PD-012')
      expect(JSON.stringify(log.mock.calls)).not.toContain('Alasan Rahasia')
    })

    it('stores every optional field when it is given', async () => {
      const created = await add({
        description: text('Deskripsi'),
        specialties: [{ system: 'id.specialty', code: 'bedah' }],
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

      expect(created).toMatchObject({
        description: [{ text: 'Deskripsi' }],
        specialties: [{ code: 'bedah' }],
        min_clinical_level: { code: 'pk3' },
        required_evidence: [{ type: { code: 'logbook' }, mandatory: true }],
        external_codes: [{ system: 'icd9cm', code: '38.93' }],
        facility_ids: [facilityId],
      })
    })

    it.each([
      ['invalid_code', { code: 'x' }],
      ['invalid_code', { code: 'bad code!' }],
      ['invalid_code', { code: 'P'.repeat(31) }],
      ['invalid_name', { name: [] }],
      ['invalid_name', { name: text('   ') }],
      ['invalid_name', { name: [...text('a'), ...text('b')] }],
      ['invalid_description', { description: text('x'.repeat(2001)) }],
      ['invalid_committee', { committee: { system: 'id.unit-type', code: 'x' } }],
      ['unknown_code', { committee: { system: 'id.committee', code: 'nonsense' } }],
      ['code_retired', { committee: { system: 'id.committee', code: 'lama' } }],
      ['professions_required', { professions: [] }],
      ['invalid_profession', { professions: [{ system: 'id.unit-type', code: 'x' }] }],
      ['unknown_code', { professions: [{ system: 'id.profession', code: 'nonsense' }] }],
      ['duplicate_code', { professions: [dokter, dokter] }],
      ['invalid_specialty', { specialties: [{ system: 'id.unit-type', code: 'x' }] }],
      ['invalid_clinical_level', { minClinicalLevel: { system: 'id.unit-type', code: 'x' } }],
      ['unknown_code', { minClinicalLevel: { system: 'id.clinical-level', code: 'nonsense' } }],
      ['invalid_evidence_type', { requiredEvidence: [{ type: { system: 'id.unit-type', code: 'x' }, description: text('a'), mandatory: false }] }],
      ['invalid_evidence', { requiredEvidence: [{ type: { system: 'id.evidence-type', code: 'logbook' }, description: [], mandatory: false }] }],
      ['duplicate_code', { requiredEvidence: [
        { type: { system: 'id.evidence-type', code: 'logbook' }, description: text('a'), mandatory: false },
        { type: { system: 'id.evidence-type', code: 'logbook' }, description: text('b'), mandatory: true },
      ] }],
      ['invalid_external_code', { externalCodes: [{ system: 'icd 9', code: '38.93' }] }],
      ['invalid_external_code', { externalCodes: Array.from({ length: 11 }, (_, i) => ({ system: 'icd9cm', code: `c${i}` })) }],
      ['duplicate_code', { externalCodes: [{ system: 'icd9cm', code: '1' }, { system: 'icd9cm', code: '1' }] }],
      ['duplicate_facility', { facilityIds: [facilityId, facilityId] }],
      ['facility_not_found', { facilityIds: [new Types.ObjectId().toHexString()] }],
      ['facility_not_found', { facilityIds: ['bad'] }],
    ])('rejects %s', async (code, override) => {
      expect(await rejection(() => add(override as Partial<CreatePrivilegeInput>))).toMatchObject({ code })
      expect(await catalog.findByFilter(tenantId)).toEqual([])
    })

    it('rejects a facility of another tenant and too many entries in a list', async () => {
      const foreign = await addFacility({ tenant: otherTenantId })

      expect(
        await rejection(() => add({ facilityIds: [foreign.id] })),
      ).toMatchObject({ code: 'facility_not_found' })
      expect(
        await rejection(() =>
          add({ professions: Array.from({ length: 21 }, (_, i) => ({ system: 'id.profession', code: `p${i}` })) }),
        ),
      ).toMatchObject({ code: 'invalid_professions' })
      expect(
        await rejection(() =>
          add({ specialties: Array.from({ length: 51 }, (_, i) => ({ system: 'id.specialty', code: `s${i}` })) }),
        ),
      ).toMatchObject({ code: 'invalid_specialties' })
    })

    it('refuses a second item with the same code, in any case, and allows it in another tenant', async () => {
      await add()

      expect(await rejection(() => add({ code: 'PD-012' }))).toMatchObject({
        code: 'privilege_exists',
      })
      expect(
        await asAdmin(() =>
          service.create(otherTenantId, {
            code: 'PD-012',
            name: text('x'),
            committee,
            professions: [dokter],
          }),
        ),
      ).toMatchObject({ tenant_id: otherTenantId, code: 'PD-012' })
    })
  })

  describe('update', () => {
    it('replaces the lists that are sent and keeps the rest', async () => {
      const created = await add({ description: text('Lama') })

      const updated = await asAdmin(() =>
        service.update(tenantId, created.id, {
          name: text('Nama baru'),
          professions: [{ system: 'id.profession', code: 'perawat' }],
          minClinicalLevel: { system: 'id.clinical-level', code: 'pk3' },
          version: created.version,
          reason: 'Koreksi',
        }),
      )

      expect(updated).toMatchObject({
        code: 'PD-012',
        committee: { code: 'komite_medik' },
        name: [{ text: 'Nama baru' }],
        description: [{ text: 'Lama' }],
        professions: [{ code: 'perawat' }],
        min_clinical_level: { code: 'pk3' },
      })
      expect(log.mock.calls.at(-1)?.[0]).toMatchObject({ event: 'privilege_update' })
    })

    it('clears the level with null and empties the lists that are optional', async () => {
      const created = await add({
        minClinicalLevel: { system: 'id.clinical-level', code: 'pk3' },
        specialties: [{ system: 'id.specialty', code: 'bedah' }],
        facilityIds: [facilityId],
      })

      const updated = await asAdmin(() =>
        service.update(tenantId, created.id, {
          minClinicalLevel: null,
          specialties: [],
          facilityIds: [],
        }),
      )

      expect(updated).toMatchObject({
        min_clinical_level: null,
        specialties: [],
        facility_ids: [],
      })
    })

    it('answers 422 for an empty update, a retired item and the same rules as creation', async () => {
      const created = await add()
      const retired = await add({ code: 'PD-013' })
      await asAdmin(() => service.retire(tenantId, retired.id, {}))

      expect(
        await rejection(() => asAdmin(() => service.update(tenantId, created.id, {}))),
      ).toMatchObject({ code: 'empty_update' })
      expect(
        await rejection(() =>
          asAdmin(() => service.update(tenantId, retired.id, { name: text('x') })),
        ),
      ).toMatchObject({ code: 'privilege_retired' })
      expect(
        await rejection(() =>
          asAdmin(() => service.update(tenantId, created.id, { professions: [] })),
        ),
      ).toMatchObject({ code: 'professions_required' })
    })

    it('rejects a stale version and changes nothing', async () => {
      const created = await add()

      expect(
        await rejection(() =>
          asAdmin(() =>
            service.update(tenantId, created.id, {
              name: text('x'),
              version: created.version + 5,
            }),
          ),
        ),
      ).toMatchObject({ code: 'stale_version' })
      expect((await catalog.findOne(created.id))?.name[0]?.text).toBe(
        'Pemasangan kateter vena sentral',
      )
    })
  })

  describe('retire', () => {
    it('retires an active item once and logs one entry without values', async () => {
      const created = await add()
      log.mockClear()

      const retired = await asAdmin(() =>
        service.retire(tenantId, created.id, { version: created.version, reason: 'Catatan Rahasia' }),
      )

      expect(retired.status).toBe('retired')
      expect(log.mock.calls[0]?.[0]).toMatchObject({
        event: 'privilege_retire',
        outcome: 'success',
      })
      expect(JSON.stringify(log.mock.calls)).not.toContain('Catatan Rahasia')
      expect(
        await rejection(() => asAdmin(() => service.retire(tenantId, created.id, {}))),
      ).toMatchObject({ code: 'privilege_retired' })
    })

    it('rejects a stale version', async () => {
      const created = await add()

      expect(
        await rejection(() =>
          asAdmin(() => service.retire(tenantId, created.id, { version: created.version + 3 })),
        ),
      ).toMatchObject({ code: 'stale_version' })
      expect((await catalog.findOne(created.id))?.status).toBe('active')
    })
  })

  describe('reads', () => {
    it('answers 404 for a missing, malformed or foreign item on get, update and retire', async () => {
      const created = await add()

      for (const [tenant, id] of [
        [tenantId, new Types.ObjectId().toHexString()],
        [tenantId, 'bad'],
        [otherTenantId, created.id],
      ]) {
        await expect(service.get(tenant as string, id as string)).rejects.toMatchObject({
          code: 'privilege_not_found',
        })
        expect(
          await rejection(() =>
            asAdmin(() => service.update(tenant as string, id as string, { name: text('x') })),
          ),
        ).toMatchObject({ code: 'privilege_not_found' })
        expect(
          await rejection(() =>
            asAdmin(() => service.retire(tenant as string, id as string, {})),
          ),
        ).toMatchObject({ code: 'privilege_not_found' })
      }
    })

    it('lists by committee, profession, status and facility ordered by code, with paging, and writes no log entry', async () => {
      const a = await add({ code: 'PD-001' })
      const b = await add({
        code: 'PD-002',
        committee: { system: 'id.committee', code: 'komite_keperawatan' },
        professions: [{ system: 'id.profession', code: 'perawat' }],
        facilityIds: [facilityId],
      })
      const c = await add({ code: 'PD-003', facilityIds: [(await addFacility()).id] })
      await asAdmin(() => service.retire(tenantId, c.id, {}))
      log.mockClear()

      const ids = async (query: Parameters<PrivilegeService['list']>[1]) =>
        (await service.list(tenantId, query)).map((item) => item.id)

      expect(await ids({})).toEqual([a.id, b.id, c.id])
      expect(await ids({ committee: 'komite_keperawatan' })).toEqual([b.id])
      expect(await ids({ profession: 'perawat' })).toEqual([b.id])
      expect(await ids({ status: 'retired' })).toEqual([c.id])
      expect(await ids({ facilityId })).toEqual([a.id, b.id])
      expect(await ids({ limit: 1, offset: 1 })).toEqual([b.id])
      expect(await service.list(otherTenantId, {})).toEqual([])
      expect([log, warn, error, debug].flatMap((fn) => fn.mock.calls)).toEqual([])
    })
  })
})
