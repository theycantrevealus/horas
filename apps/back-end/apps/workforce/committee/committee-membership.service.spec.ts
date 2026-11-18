import { Types } from 'mongoose'
import { runWithRequestContext } from '@utility/logger/context'
import { type AppLogger } from '@utility/logger/service'
import { CodeConceptService } from '../concept/code-concept.service'
import {
  InMemoryCodeConcepts,
  InMemoryCommitteeMemberships,
  InMemoryEmployees,
  InMemoryFacilities,
} from '../testing/in-memory'
import {
  CommitteeMembershipService,
  type CreateMembershipInput,
} from './committee-membership.service'

describe('CommitteeMembershipService', () => {
  const tenantId = new Types.ObjectId().toHexString()
  const otherTenantId = new Types.ObjectId().toHexString()
  const organizationId = new Types.ObjectId().toHexString()
  const log = vi.fn()
  const warn = vi.fn()
  const error = vi.fn()
  const debug = vi.fn()
  let memberships: InMemoryCommitteeMemberships
  let employees: InMemoryEmployees
  let facilities: InMemoryFacilities
  let concepts: InMemoryCodeConcepts
  let service: CommitteeMembershipService
  let facilityId: string
  let employeeId: string

  const committee = (code = 'komite_medik') => ({
    system: 'id.committee',
    code,
  })
  const role = (code = 'member') => ({ system: 'id.committee-role', code })

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
   * @param timezone - IANA time zone.
   * @param override - Tenant and status.
   * @returns The facility.
   */
  function addFacility(
    timezone = 'Asia/Jakarta',
    override: { tenant?: string; status?: 'active' | 'inactive' } = {},
  ) {
    return asAdmin(() =>
      facilities.create({
        tenant_id: override.tenant ?? tenantId,
        organization_id: organizationId,
        code: `f-${new Types.ObjectId().toHexString()}`,
        name: [{ locale: 'en', text: 'RS' }],
        address: null,
        timezone,
        holiday_calendar_codes: [],
        external_ids: [],
        status: override.status ?? 'active',
      }),
    )
  }

  /**
   * Adds an employee.
   *
   * @param status - Employment status.
   * @param tenant - Tenant of the employee.
   * @returns The employee.
   */
  function addEmployee(
    status: 'active' | 'separated' = 'active',
    tenant = tenantId,
  ) {
    return asAdmin(() =>
      employees.create({
        tenant_id: tenant,
        employee_number: `E${new Types.ObjectId().toHexString()}`,
        name: {
          use: 'official',
          text: 'Siti',
          given: [],
          prefix: [],
          suffix: [],
        },
        other_names: [],
        display_name: 'Siti',
        administrative_gender: null,
        workforce_category: {
          system: 'id.workforce-category',
          code: 'non_klinis',
        },
        is_clinical: false,
        profession: null,
        specialties: [],
        clinical_level: null,
        employment_status: status,
        employment_status_since: '2026-01-01',
        current_employment: null,
        primary_assignment: null,
        original_hire_date: '2026-01-01',
        separation_date: null,
        practitioner_ids: [],
        work_contacts: [],
        photo: null,
        preferred_language: null,
      }),
    )
  }

  /**
   * Appoints through the service.
   *
   * @param override - Fields that replace the defaults.
   * @returns The membership.
   */
  function appoint(override: Partial<CreateMembershipInput> = {}) {
    return asAdmin(() =>
      service.create(tenantId, {
        employeeId,
        facilityId,
        committee: committee(),
        role: role(),
        period: { start: '2026-03-01', end: null },
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
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-03-10T12:00:00Z'))
    memberships = new InMemoryCommitteeMemberships()
    employees = new InMemoryEmployees()
    facilities = new InMemoryFacilities()
    concepts = new InMemoryCodeConcepts()
    const logger = { log, warn, error, debug } as unknown as AppLogger
    service = new CommitteeMembershipService(
      memberships,
      employees,
      facilities,
      new CodeConceptService(concepts, logger),
      logger,
    )
    const codes: [string, string[]][] = [
      ['id.committee', ['komite_medik', 'komite_keperawatan']],
      ['id.committee-role', ['chair', 'secretary', 'member', 'mitra_bestari']],
    ]
    for (const [system, list] of codes) {
      for (const code of list) {
        await asAdmin(() =>
          concepts.create({
            system,
            code,
            display: [{ locale: 'en', text: code }],
            properties: {},
            mappings: [],
            period: null,
            status: 'active',
          }),
        )
      }
    }
    await asAdmin(() =>
      concepts.create({
        system: 'id.committee',
        code: 'lama',
        display: [{ locale: 'en', text: 'lama' }],
        properties: {},
        mappings: [],
        period: null,
        status: 'retired',
      }),
    )
    facilityId = (await addFacility()).id
    employeeId = (await addEmployee()).id
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('create', () => {
    it('appoints an active member and logs one entry without values', async () => {
      const created = await appoint({
        decisionNumber: ' SK/RAHASIA ',
        reason: 'Alasan Rahasia',
      })

      expect(created).toMatchObject({
        tenant_id: tenantId,
        employee_id: employeeId,
        facility_id: facilityId,
        committee: { code: 'komite_medik' },
        role: { code: 'member' },
        period: { start: '2026-03-01', end: null },
        decision_ref: { number: 'SK/RAHASIA', document: null },
        status: 'active',
      })
      expect(log).toHaveBeenCalledTimes(1)
      expect(log.mock.calls[0]?.[0]).toMatchObject({
        event: 'committee_membership_create',
        outcome: 'success',
      })
      expect(JSON.stringify(log.mock.calls)).not.toContain('SK/RAHASIA')
      expect(JSON.stringify(log.mock.calls)).not.toContain('Alasan Rahasia')
    })

    it.each([
      ['invalid_decision_number', { decisionNumber: '  ' }],
      ['invalid_committee', { committee: { system: 'id.unit-type', code: 'x' } }],
      ['invalid_role', { role: { system: 'id.unit-type', code: 'x' } }],
      ['unknown_code', { committee: committee('nonsense') }],
      ['code_retired', { committee: committee('lama') }],
      ['unknown_code', { role: role('nonsense') }],
      ['invalid_period', { period: { start: '2026-02-30', end: null } }],
      ['invalid_period', { period: { start: '2026-05-01', end: '2026-04-01' } }],
      ['invalid_period', { period: { start: '2026-01-01', end: '2026-03-09' } }],
      ['start_in_future', { period: { start: '2026-03-12', end: null } }],
    ])('rejects %s', async (code, override) => {
      expect(await rejection(() => appoint(override))).toMatchObject({ code })
      expect(await memberships.findByFacility(tenantId, facilityId)).toEqual([])
    })

    it('reads today in the facility time zone', async () => {
      vi.setSystemTime(new Date('2026-03-10T17:30:00Z'))
      const auckland = await addFacility('Pacific/Auckland')
      const newYork = await addFacility('America/New_York')
      const start = { start: '2026-03-12', end: null }

      expect(
        await appoint({ facilityId: auckland.id, period: start }),
      ).toMatchObject({ status: 'active' })
      expect(
        await rejection(() => appoint({ facilityId: newYork.id, period: start })),
      ).toMatchObject({ code: 'start_in_future' })
    })

    it('rejects a missing, foreign or separated employee', async () => {
      const foreign = await addEmployee('active', otherTenantId)
      const separated = await addEmployee('separated')

      for (const id of [new Types.ObjectId().toHexString(), 'bad', foreign.id]) {
        expect(await rejection(() => appoint({ employeeId: id }))).toMatchObject({
          code: 'employee_not_found',
        })
      }
      expect(
        await rejection(() => appoint({ employeeId: separated.id })),
      ).toMatchObject({ code: 'employee_separated' })
    })

    it('rejects a missing, foreign or inactive facility', async () => {
      const foreign = await addFacility('Asia/Jakarta', { tenant: otherTenantId })
      const inactive = await addFacility('Asia/Jakarta', { status: 'inactive' })

      for (const id of [new Types.ObjectId().toHexString(), 'bad', foreign.id]) {
        expect(await rejection(() => appoint({ facilityId: id }))).toMatchObject({
          code: 'facility_not_found',
        })
      }
      expect(
        await rejection(() => appoint({ facilityId: inactive.id })),
      ).toMatchObject({ code: 'facility_inactive' })
    })

    it('gives a person one role per committee, but allows another committee or facility', async () => {
      await appoint()
      const other = await addFacility()

      expect(await rejection(() => appoint({ role: role('secretary') }))).toMatchObject(
        { code: 'membership_exists' },
      )
      expect(await appoint({ committee: committee('komite_keperawatan') })).toMatchObject(
        { status: 'active' },
      )
      expect(await appoint({ facilityId: other.id })).toMatchObject({
        status: 'active',
      })
    })

    it('allows one chair and one secretary at a time, and any number of members', async () => {
      const second = await addEmployee()
      const third = await addEmployee()
      await appoint({ role: role('chair') })
      await appoint({ employeeId: second.id, role: role('secretary') })

      expect(
        await rejection(() => appoint({ employeeId: third.id, role: role('chair') })),
      ).toMatchObject({ code: 'chair_exists' })
      expect(
        await rejection(() =>
          appoint({ employeeId: third.id, role: role('secretary') }),
        ),
      ).toMatchObject({ code: 'secretary_exists' })
      expect(await appoint({ employeeId: third.id })).toMatchObject({
        role: { code: 'member' },
      })
      const fourth = await addEmployee()
      expect(
        await appoint({ employeeId: fourth.id, role: role('mitra_bestari') }),
      ).toMatchObject({ status: 'active' })
    })

    it('allows a new chair once the old one ended', async () => {
      const second = await addEmployee()
      const chair = await appoint({ role: role('chair') })
      await asAdmin(() => service.end(tenantId, chair.id, { date: '2026-03-10' }))

      expect(
        await appoint({ employeeId: second.id, role: role('chair') }),
      ).toMatchObject({ status: 'active' })
      expect(await appoint({ role: role('member') })).toMatchObject({
        status: 'active',
      })
    })
  })

  describe('end', () => {
    it('ends an active membership and logs one entry without values', async () => {
      const created = await appoint()
      log.mockClear()

      const ended = await asAdmin(() =>
        service.end(tenantId, created.id, {
          date: '2026-03-10',
          version: created.version,
          reason: 'Catatan Rahasia',
        }),
      )

      expect(ended).toMatchObject({
        status: 'ended',
        period: { start: '2026-03-01', end: '2026-03-10' },
      })
      expect(log.mock.calls[0]?.[0]).toMatchObject({
        event: 'committee_membership_end',
        outcome: 'success',
      })
      expect(JSON.stringify(log.mock.calls)).not.toContain('Catatan Rahasia')
    })

    it.each([
      ['before the start', '2026-02-28'],
      ['later than tomorrow', '2026-03-12'],
      ['not a date', '2026-02-30'],
      ['badly shaped', '10-03-2026'],
    ])('rejects an end date %s', async (_label, date) => {
      const created = await appoint()

      expect(
        await rejection(() =>
          asAdmin(() => service.end(tenantId, created.id, { date })),
        ),
      ).toMatchObject({ code: 'invalid_end_date' })
      expect((await memberships.findOne(created.id))?.status).toBe('active')
    })

    it('rejects ending twice and a stale version', async () => {
      const created = await appoint()

      expect(
        await rejection(() =>
          asAdmin(() =>
            service.end(tenantId, created.id, {
              date: '2026-03-10',
              version: created.version + 5,
            }),
          ),
        ),
      ).toMatchObject({ code: 'stale_version' })
      await asAdmin(() => service.end(tenantId, created.id, { date: '2026-03-10' }))
      expect(
        await rejection(() =>
          asAdmin(() => service.end(tenantId, created.id, { date: '2026-03-10' })),
        ),
      ).toMatchObject({ code: 'membership_not_active' })
    })

    it('answers 404 for a missing, malformed or foreign membership', async () => {
      const created = await appoint()

      for (const [tenant, id] of [
        [tenantId, new Types.ObjectId().toHexString()],
        [tenantId, 'bad'],
        [otherTenantId, created.id],
      ]) {
        expect(
          await rejection(() =>
            asAdmin(() => service.end(tenant as string, id as string, { date: '2026-03-10' })),
          ),
        ).toMatchObject({ code: 'membership_not_found' })
      }
    })
  })

  describe('list', () => {
    it('lists a facility by committee, role and status with paging, and writes no log entry', async () => {
      const second = await addEmployee()
      const first = await appoint({ role: role('chair') })
      await appoint({ employeeId: second.id, committee: committee('komite_keperawatan') })
      await asAdmin(() => service.end(tenantId, first.id, { date: '2026-03-10' }))
      log.mockClear()

      const all = await service.list(tenantId, facilityId, {})
      const medik = await service.list(tenantId, facilityId, { committee: 'komite_medik' })
      const active = await service.list(tenantId, facilityId, { status: 'active' })
      const chairs = await service.list(tenantId, facilityId, { role: 'chair' })
      const page = await service.list(tenantId, facilityId, { limit: 1, offset: 1 })

      expect(all).toHaveLength(2)
      expect(medik.map((item) => item.id)).toEqual([first.id])
      expect(active.map((item) => item.committee.code)).toEqual(['komite_keperawatan'])
      expect(chairs).toHaveLength(1)
      expect(page).toHaveLength(1)
      expect(await service.list(tenantId, facilityId, { committee: 'unknown' })).toEqual([])
      expect([log, warn, error, debug].flatMap((fn) => fn.mock.calls)).toEqual([])
    })

    it('answers 404 for a facility of another tenant, a missing one and a malformed id, without logging', async () => {
      const foreign = await addFacility('Asia/Jakarta', { tenant: otherTenantId })

      for (const id of [foreign.id, new Types.ObjectId().toHexString(), 'bad']) {
        await expect(service.list(tenantId, id, {})).rejects.toMatchObject({
          code: 'facility_not_found',
        })
      }
      expect([log, warn, error, debug].flatMap((fn) => fn.mock.calls)).toEqual([])
    })

    it('does not show the memberships of another tenant', async () => {
      await appoint()

      const other = await addFacility('Asia/Jakarta', { tenant: otherTenantId })
      expect(await service.list(otherTenantId, other.id, {})).toEqual([])
    })
  })
})
