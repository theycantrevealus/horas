import { Logger } from '@nestjs/common'
import { Types } from 'mongoose'
import { PERMISSIONS } from '@identity/permission'
import { ParameterManagementModule } from '../parameter/parameter-management.module'
import { createHrGateway, type HrGateway } from '../testing/hr-gateway'
import {
  createInMemoryWorkforce,
  type InMemoryWorkforce,
} from '../testing/in-memory-workforce'
import { RosterManagementModule } from './roster-management.module'

describe('roster endpoints (in-memory repositories)', () => {
  const workforce: InMemoryWorkforce = createInMemoryWorkforce()
  let gateway: HrGateway
  let call: HrGateway['call']
  let headToken: string
  let bossToken: string
  let readerToken: string
  let otherTenantToken: string
  let parameterToken: string
  let validatorToken: string
  let overrideToken: string
  let tenantId: string
  let otherTenantId: string
  let facilityId: string
  let organizationId: string
  let unitCounter = 0

  /**
   * Adds a unit of the facility.
   *
   * @param tenant - Tenant of the unit.
   * @param status - Unit status.
   * @returns The unit identifier.
   */
  async function addUnit(tenant = tenantId, status: 'active' | 'closed' = 'active') {
    unitCounter += 1
    return (
      await workforce.units.create({
        tenant_id: tenant,
        organization_id: organizationId,
        facility_id: facilityId,
        code: `ward-${unitCounter}`,
        name: [{ locale: 'en', text: 'Ward' }],
        type: { system: 'id.unit-type', code: 'ward' },
        parent_id: null,
        ancestor_ids: [],
        is_clinical: true,
        external_ids: [],
        period: { start: '2026-01-01', end: null },
        status,
      })
    ).id
  }

  /**
   * Creates a roster through the API as the Head of Unit; the default is March 2099.
   *
   * @param unitId - The unit.
   * @param override - Fields that replace the defaults.
   * @returns The reply.
   */
  function create(unitId: string, override: object = {}) {
    return call('POST', '/v1/rosters', headToken, {
      unitId,
      period: { start: '2099-03-01', end: '2099-03-31' },
      ...override,
    })
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
      modules: [RosterManagementModule, ParameterManagementModule],
      ...workforce.options,
    })
    call = gateway.call
    ;({ tenantId, otherTenantId } = gateway)
    headToken = await gateway.seedAndLogin(tenantId, 'head', [
      PERMISSIONS.WORKFORCE_ROSTER_READ,
      PERMISSIONS.WORKFORCE_ROSTER_WRITE,
    ])
    bossToken = await gateway.seedAndLogin(tenantId, 'boss', [
      PERMISSIONS.WORKFORCE_ROSTER_READ,
      PERMISSIONS.WORKFORCE_ROSTER_APPROVE,
    ])
    readerToken = await gateway.seedAndLogin(tenantId, 'reader', [
      PERMISSIONS.WORKFORCE_ROSTER_READ,
    ])
    validatorToken = await gateway.seedAndLogin(tenantId, 'validator', [
      PERMISSIONS.WORKFORCE_ROSTER_VALIDATE,
    ])
    overrideToken = await gateway.seedAndLogin(tenantId, 'overrider', [
      PERMISSIONS.WORKFORCE_ROSTER_OVERRIDE,
    ])
    parameterToken = await gateway.seedAndLogin(tenantId, 'params', [
      PERMISSIONS.WORKFORCE_PARAMETER_WRITE,
    ])
    otherTenantToken = await gateway.seedAndLogin(otherTenantId, 'other', [
      PERMISSIONS.WORKFORCE_ROSTER_READ,
      PERMISSIONS.WORKFORCE_ROSTER_WRITE,
      PERMISSIONS.WORKFORCE_ROSTER_APPROVE,
    ])
    organizationId = new Types.ObjectId().toHexString()
    facilityId = (
      await workforce.facilities.create({
        tenant_id: tenantId,
        organization_id: organizationId,
        code: 'rs-sehat',
        name: [{ locale: 'en', text: 'RS' }],
        address: null,
        timezone: 'Asia/Jakarta',
        holiday_calendar_codes: [],
        external_ids: [],
        status: 'active',
      })
    ).id
  })

  afterAll(async () => {
    await gateway.close()
  })

  it('refuses every route without a token (401), and the writes and approvals without their permission (403)', async () => {
    const id = new Types.ObjectId().toHexString()
    const routes: ['GET' | 'POST', string, object | undefined, 'read' | 'write' | 'approve' | 'validate' | 'override'][] = [
      ['GET', '/v1/rosters', undefined, 'read'],
      ['GET', `/v1/rosters/${id}`, undefined, 'read'],
      ['POST', '/v1/rosters', {}, 'write'],
      ['POST', `/v1/rosters/${id}/submit`, {}, 'write'],
      ['POST', `/v1/rosters/${id}/approve`, {}, 'approve'],
      ['POST', `/v1/rosters/${id}/return`, { reason: 'x' }, 'approve'],
      ['POST', `/v1/rosters/${id}/publish`, {}, 'write'],
      ['POST', `/v1/rosters/${id}/close`, {}, 'write'],
      ['POST', `/v1/rosters/${id}/validate`, {}, 'validate'],
      ['POST', `/v1/rosters/${id}/coverage-overrides`, {}, 'override'],
    ]
    for (const [method, url, payload] of routes) {
      expect((await call(method, url, undefined, payload)).status).toBe(401)
    }
    for (const [method, url, payload, kind] of routes.filter(([, , , kind]) => kind !== 'read')) {
      expect((await call(method, url, readerToken, payload)).status).toBe(403)
      // The head cannot approve, the approver cannot draft.
      expect((await call(method, url, kind === 'approve' || kind === 'validate' || kind === 'override' ? headToken : bossToken, payload)).status).toBe(403)
    }
    expect((await call('GET', '/v1/rosters', readerToken)).status).toBe(200)
  })

  it('takes a roster through draft, submitted, approved, published and closed, and lists it with filters', async () => {
    const unitId = await addUnit()
    const created = await create(unitId, { reason: 'Baru' })

    expect(created.status).toBe(201)
    const roster = created.body as Record<string, any>
    expect(roster).toMatchObject({
      tenant_id: tenantId,
      unit_id: unitId,
      facility_id: facilityId,
      period: { start: '2099-03-01', end: '2099-03-31' },
      status: 'draft',
      revision: 0,
      coverage_overrides: [],
      validation: null,
    })
    expect(roster).not.toHaveProperty('_id')
    expect((await call('GET', `/v1/rosters/${roster.id}`, readerToken)).body).toMatchObject({ id: roster.id, status: 'draft' })

    const submitted = await call('POST', `/v1/rosters/${roster.id}/submit`, headToken, { version: roster.version })
    expect(submitted.status).toBe(201)
    expect(submitted.body).toMatchObject({ status: 'submitted', submitted: { by: { display_name: expect.any(String) } } })
    const approved = await call('POST', `/v1/rosters/${roster.id}/approve`, bossToken, {})
    expect(approved.body).toMatchObject({ status: 'approved' })
    const published = await call('POST', `/v1/rosters/${roster.id}/publish`, headToken, {})
    expect(published.body).toMatchObject({ status: 'published', revision: 1 })

    const byUnit = await call('GET', `/v1/rosters?unitId=${unitId}&status=published`, readerToken)
    expect((byUnit.body as any[]).map((item) => item.id)).toEqual([roster.id])
    const inRange = await call('GET', '/v1/rosters?from=2099-03-31&to=2099-03-31', readerToken)
    expect((inRange.body as any[]).map((item) => item.id)).toContain(roster.id)
    expect(((await call('GET', '/v1/rosters?from=2099-04-01', readerToken)).body as any[]).map((item) => item.id)).not.toContain(roster.id)
    const early = await call('POST', `/v1/rosters/${roster.id}/close`, headToken, {})
    expect(early.status).toBe(422)
    expect(early.body).toMatchObject({ code: 'period_not_ended' })

    const past = (await create(unitId, { period: { start: '2020-01-01', end: '2020-01-31' } })).body as Record<string, any>
    await call('POST', `/v1/rosters/${past.id}/submit`, headToken, {})
    await call('POST', `/v1/rosters/${past.id}/approve`, bossToken, {})
    await call('POST', `/v1/rosters/${past.id}/publish`, headToken, {})
    const closed = await call('POST', `/v1/rosters/${past.id}/close`, headToken, {})
    expect(closed.body).toMatchObject({ status: 'closed', closed: { at: expect.any(String) } })
  })

  it('returns a roster to draft with a reason, and the preparer cannot approve it', async () => {
    const unitId = await addUnit()
    const dual = await gateway.seedAndLogin(tenantId, 'dual', [
      PERMISSIONS.WORKFORCE_ROSTER_READ,
      PERMISSIONS.WORKFORCE_ROSTER_WRITE,
      PERMISSIONS.WORKFORCE_ROSTER_APPROVE,
    ])
    const roster = (await call('POST', '/v1/rosters', dual, { unitId, period: { start: '2099-03-01', end: '2099-03-31' } })).body as Record<string, any>
    await call('POST', `/v1/rosters/${roster.id}/submit`, dual, {})

    const self = await call('POST', `/v1/rosters/${roster.id}/approve`, dual, {})
    expect(self.status).toBe(403)
    expect(self.body).toMatchObject({ code: 'approver_is_preparer' })
    expect((await call('POST', `/v1/rosters/${roster.id}/return`, bossToken, {})).status).toBe(400)
    expect((await call('POST', `/v1/rosters/${roster.id}/return`, bossToken, { reason: '  ' })).body).toMatchObject({ code: 'reason_required' })
    const returned = await call('POST', `/v1/rosters/${roster.id}/return`, bossToken, { reason: 'Kurang perawat' })
    expect(returned.status).toBe(201)
    expect(returned.body).toMatchObject({ status: 'draft', return_reason: 'Kurang perawat', submitted: null })
  })

  it('publishes a draft directly for a unit whose approval setting is off, and refuses to submit it', async () => {
    const unitId = await addUnit()
    const unset = await call('POST', '/v1/parameters', parameterToken, {
      key: 'ROSTER_APPROVAL_REQUIRED',
      scope: { kind: 'unit', id: unitId },
      value: false,
      effectiveFrom: new Date().toISOString().slice(0, 10),
    })
    expect(unset.body).toMatchObject({ key: 'ROSTER_APPROVAL_REQUIRED' })
    const roster = (await create(unitId)).body as Record<string, any>

    const submit = await call('POST', `/v1/rosters/${roster.id}/submit`, headToken, {})
    expect(submit.status).toBe(422)
    expect(submit.body).toMatchObject({ code: 'approval_not_required' })
    const published = await call('POST', `/v1/rosters/${roster.id}/publish`, headToken, {})
    expect(published.body).toMatchObject({ status: 'published', revision: 1, submitted: null, approved: null })
    const other = (await create(await addUnit())).body as Record<string, any>
    expect((await call('POST', `/v1/rosters/${other.id}/publish`, headToken, {})).body).toMatchObject({ code: 'approval_required' })
  })

  it('answers 404 for a missing, malformed or foreign roster, and never lists another tenant\'s', async () => {
    const roster = (await create(await addUnit())).body as Record<string, any>
    const unknown = new Types.ObjectId().toHexString()

    for (const id of [unknown, 'bad']) {
      expect((await call('GET', `/v1/rosters/${id}`, readerToken)).body).toMatchObject({ code: 'roster_not_found' })
      for (const action of ['submit', 'publish', 'close']) {
        expect((await call('POST', `/v1/rosters/${id}/${action}`, headToken, {})).body).toMatchObject({ code: 'roster_not_found' })
      }
      expect((await call('POST', `/v1/rosters/${id}/approve`, bossToken, {})).body).toMatchObject({ code: 'roster_not_found' })
      expect((await call('POST', `/v1/rosters/${id}/return`, bossToken, { reason: 'x' })).body).toMatchObject({ code: 'roster_not_found' })
    }
    expect((await call('GET', `/v1/rosters/${roster.id}`, otherTenantToken)).status).toBe(404)
    expect((await call('POST', `/v1/rosters/${roster.id}/submit`, otherTenantToken, {})).status).toBe(404)
    const own = await call('GET', '/v1/rosters?limit=100', otherTenantToken)
    expect((own.body as any[]).map((item) => item.id)).not.toContain(roster.id)
  })

  it('answers 409 for a roster that exists or overlaps, and a stale version, and 422 for the business rules', async () => {
    const unitId = await addUnit()
    const roster = (await create(unitId)).body as Record<string, any>

    const again = await create(unitId)
    expect(again.status).toBe(409)
    expect(again.body).toMatchObject({ code: 'roster_exists' })
    const stale = await call('POST', `/v1/rosters/${roster.id}/submit`, headToken, { version: roster.version + 5 })
    expect(stale.status).toBe(409)
    expect(stale.body).toMatchObject({ code: 'stale_version' })

    expect((await create(unitId, { period: { start: '2099-03-02', end: '2099-03-31' } })).body).toMatchObject({ code: 'invalid_period' })
    expect((await create(unitId, { period: { start: '2099-04-01', end: '2099-04-29' } })).body).toMatchObject({ code: 'invalid_period' })
    expect((await create(new Types.ObjectId().toHexString())).body).toMatchObject({ code: 'unit_not_found' })
    expect((await create(await addUnit(tenantId, 'closed'))).body).toMatchObject({ code: 'unit_closed' })
    expect((await call('POST', `/v1/rosters/${roster.id}/approve`, bossToken, {})).body).toMatchObject({ code: 'invalid_transition' })
    expect((await call('POST', `/v1/rosters/${roster.id}/publish`, headToken, {})).body).toMatchObject({ code: 'approval_required' })
  })

  it('validates the request: 400 for shape, and list limits', async () => {
    const unitId = await addUnit()
    const id = new Types.ObjectId().toHexString()

    expect((await call('POST', '/v1/rosters', headToken, {})).status).toBe(400)
    expect((await create('bad')).status).toBe(400)
    expect((await create(unitId, { period: undefined })).status).toBe(400)
    expect((await create(unitId, { period: {} })).status).toBe(400)
    expect((await create(unitId, { period: { start: '2099-02-30', end: '2099-03-31' } })).status).toBe(400)
    expect((await create(unitId, { reason: 5 })).status).toBe(400)
    expect((await call('POST', `/v1/rosters/${id}/submit`, headToken, { version: -1 })).status).toBe(400)
    expect((await call('POST', `/v1/rosters/${id}/publish`, headToken, { version: 'x' })).status).toBe(400)
    for (const query of ['limit=0', 'limit=101', 'offset=-1', 'status=gone', 'unitId=bad', 'facilityId=bad', 'from=2099-02-30', 'to=soon']) {
      expect((await call('GET', `/v1/rosters?${query}`, readerToken)).status).toBe(400)
    }
  })

  describe('validation, overrides and the gate', () => {
    let shiftId: string
    let counter = 0

    /**
     * Stores a roster of a new unit, with a requirement for two employees on one shift on 2099-03-02,
     * and returns what the tests need.
     *
     * @returns The roster, the unit and the requirement.
     */
    async function setup() {
      counter += 1
      const unit = await addUnit()
      const roster = (await create(unit)).body as Record<string, any>
      const requirement = await workforce.coverage.create({
        tenant_id: tenantId,
        unit_id: unit,
        shift_definition_id: shiftId,
        day_pattern: 'all',
        match: { workforce_category: null, profession: null, specialty: null, min_clinical_level: null },
        min_count: 2,
        team_leader_required: false,
        period: { start: '2099-03-02', end: '2099-03-02' },
        status: 'active',
      })
      return { unit, roster, requirement, counter }
    }

    /**
     * Stores an employee and a planned assignment of the shift on 2099-03-02.
     *
     * @param rosterId - The roster.
     * @param unit - The unit.
     * @param status - Employment status.
     * @returns The employee identifier.
     */
    async function staff(rosterId: string, unit: string, status: 'active' | 'suspended' = 'active') {
      const employee = await workforce.employees.create({
        tenant_id: tenantId,
        employee_number: `V${Math.random()}`,
        name: { use: 'official', text: 'Siti', given: [], prefix: [], suffix: [] },
        other_names: [],
        display_name: 'Siti',
        administrative_gender: null,
        workforce_category: { system: 'id.workforce-category', code: 'tenaga_keperawatan' },
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
      })
      await workforce.rosterAssignments.create({
        tenant_id: tenantId,
        roster_id: rosterId,
        unit_id: unit,
        facility_id: facilityId,
        employee_id: employee.id,
        date: '2099-03-02',
        shift: { definition_id: shiftId, code: 'P', type: 'regular', start_time: '07:00', end_time: '15:00', paid_minutes: 480, is_night: false },
        starts_at: new Date('2099-03-02T00:00:00Z'),
        ends_at: new Date('2099-03-02T08:00:00Z'),
        role: 'staff',
        status: 'planned',
        source: { kind: 'roster', ref_id: rosterId },
        cancellation: null,
        change_reason: null,
        revision: 0,
        overtime: null,
        flag: null,
        is_flagged: false,
      })
      return employee.id
    }

    beforeAll(async () => {
      shiftId = (
        await workforce.shifts.create({
          tenant_id: tenantId,
          facility_id: facilityId,
          code: 'PGI',
          name: [{ locale: 'en', text: 'Pagi' }],
          type: 'regular',
          start_time: '07:00',
          end_time: '15:00',
          paid_minutes: 480,
          is_night: false,
          unit_ids: [],
          status: 'active',
        })
      ).id
    })

    it('validates a roster: lists the violations and the coverage gaps, and stores the summary', async () => {
      const { unit, roster, requirement } = await setup()
      const gone = await staff(roster.id, unit, 'suspended')

      const answer = await call('POST', `/v1/rosters/${roster.id}/validate`, validatorToken)

      expect(answer.status).toBe(201)
      expect(answer.body).toMatchObject({
        violations: [{ rule: 'HR-ROS-001', code: 'employee_not_assignable', employeeId: gone, date: '2099-03-02' }],
        coverageGaps: [{ date: '2099-03-02', shiftId, requirementId: requirement.id, reason: 'min_count', required: 2, actual: 1, overridden: false }],
        summary: { violations: 1, coverageGaps: 1, overridden: 0 },
        checkedAt: expect.any(String),
      })
      const stored = (await call('GET', `/v1/rosters/${roster.id}`, readerToken)).body as Record<string, any>
      expect(stored.validation).toMatchObject({ violations: 1, coverage_gaps: 1 })
      expect(stored.status).toBe('draft')
    })

    it('blocks submit while a roster has a violation or an open gap, and lets it through once they are fixed or accepted', async () => {
      const { unit, roster, requirement } = await setup()
      await staff(roster.id, unit)
      const gone = await staff(roster.id, unit, 'suspended')

      const invalid = await call('POST', `/v1/rosters/${roster.id}/submit`, headToken, {})
      expect(invalid.status).toBe(422)
      expect(invalid.body).toMatchObject({ code: 'roster_invalid' })
      const assignment = (await workforce.rosterAssignments.findByRoster(tenantId, roster.id, { employeeId: gone }))[0]
      await workforce.rosterAssignments.update(assignment?.id ?? '', { status: 'cancelled' })
      // One planned assignment is left, the requirement asks for two.
      const gaps = await call('POST', `/v1/rosters/${roster.id}/submit`, headToken, {})
      expect(gaps.status).toBe(422)
      expect(gaps.body).toMatchObject({ code: 'coverage_gaps' })
      expect(((await call('GET', `/v1/rosters/${roster.id}`, readerToken)).body as any).status).toBe('draft')

      const accepted = await call('POST', `/v1/rosters/${roster.id}/coverage-overrides`, overrideToken, { date: '2099-03-02', shiftId, requirementId: requirement.id, reason: 'Kekurangan tenaga' })
      expect(accepted.status).toBe(201)
      expect(accepted.body).toMatchObject({ status: 'draft', coverage_overrides: [{ date: '2099-03-02', reason: 'Kekurangan tenaga' }] })
      const submitted = await call('POST', `/v1/rosters/${roster.id}/submit`, headToken, {})
      expect(submitted.status).toBe(201)
      expect(submitted.body).toMatchObject({ status: 'submitted', validation: { violations: 0, coverage_gaps: 0 } })
    })

    it('answers 409 for an override that exists, 422 for a gap that is not there, a missing reason and a published roster', async () => {
      const { unit, roster, requirement } = await setup()
      await staff(roster.id, unit)
      const body = { date: '2099-03-02', shiftId, requirementId: requirement.id, reason: 'Diterima' }

      expect((await call('POST', `/v1/rosters/${roster.id}/coverage-overrides`, overrideToken, { ...body, date: '2099-03-03' })).body).toMatchObject({ code: 'no_such_gap' })
      expect((await call('POST', `/v1/rosters/${roster.id}/coverage-overrides`, overrideToken, { ...body, reason: '  ' })).body).toMatchObject({ code: 'reason_required' })
      expect((await call('POST', `/v1/rosters/${roster.id}/coverage-overrides`, overrideToken, body)).status).toBe(201)
      const again = await call('POST', `/v1/rosters/${roster.id}/coverage-overrides`, overrideToken, body)
      expect(again.status).toBe(409)
      expect(again.body).toMatchObject({ code: 'override_exists' })
      await workforce.rosters.update(roster.id, { status: 'published' })
      expect((await call('POST', `/v1/rosters/${roster.id}/coverage-overrides`, overrideToken, body)).body).toMatchObject({ code: 'override_not_allowed' })
    })

    it('answers 404 for a missing, malformed or foreign roster, and 400 for a malformed override', async () => {
      const { roster } = await setup()
      const body = { date: '2099-03-02', shiftId, requirementId: new Types.ObjectId().toHexString(), reason: 'x' }

      for (const id of [new Types.ObjectId().toHexString(), 'bad']) {
        expect((await call('POST', `/v1/rosters/${id}/validate`, validatorToken)).body).toMatchObject({ code: 'roster_not_found' })
        expect((await call('POST', `/v1/rosters/${id}/coverage-overrides`, overrideToken, body)).body).toMatchObject({ code: 'roster_not_found' })
      }
      const foreignValidator = await gateway.seedAndLogin(otherTenantId, 'foreign-validator', [PERMISSIONS.WORKFORCE_ROSTER_VALIDATE])
      expect((await call('POST', `/v1/rosters/${roster.id}/validate`, foreignValidator)).status).toBe(404)
      for (const bad of [{}, { ...body, date: '2099-02-30' }, { ...body, shiftId: 'bad' }, { ...body, requirementId: 'bad' }, { ...body, reason: 5 }, { ...body, version: -1 }]) {
        expect((await call('POST', `/v1/rosters/${roster.id}/coverage-overrides`, overrideToken, bad)).status).toBe(400)
      }
    })

    it('logs validate and override once each, without employees, dates or reasons', async () => {
      const { unit, roster, requirement } = await setup()
      const employeeId = await staff(roster.id, unit)
      const { written, restore } = captureLogs()
      try {
        await call('POST', `/v1/rosters/${roster.id}/validate`, validatorToken)
        await call('POST', `/v1/rosters/${roster.id}/coverage-overrides`, overrideToken, { date: '2099-03-02', shiftId, requirementId: requirement.id, reason: 'Alasan Rahasia' })
        await vi.waitFor(() => expect(written.filter((entry) => entry.event === 'http_request')).toHaveLength(2))

        expect(written.filter((entry) => entry.event !== 'http_request').map((entry) => entry.event)).toEqual(['roster_validate', 'coverage_override'])
        expect(written.find((entry) => entry.event === 'roster_validate')).toMatchObject({ violations: 0, coverageGaps: 1, overridden: 0 })
        for (const text of [employeeId, '2099-03-02', 'Alasan Rahasia']) {
          expect(JSON.stringify(written)).not.toContain(text)
        }
      } finally {
        restore()
      }
    })
  })

  it('writes no log entry when data is only read, except the access log of the request', async () => {
    const roster = (await create(await addUnit())).body as Record<string, any>
    const { written, restore } = captureLogs()
    try {
      const replies = [
        await call('GET', '/v1/rosters', readerToken),
        await call('GET', `/v1/rosters/${roster.id}`, readerToken),
        await call('GET', '/v1/rosters/bad', readerToken),
        await call('GET', '/v1/rosters?limit=0', readerToken),
      ]
      expect(replies.map((reply) => reply.status)).toEqual([200, 200, 404, 400])
      await vi.waitFor(() =>
        expect(written.filter((entry) => entry.event === 'http_request')).toHaveLength(replies.length),
      )

      expect(written.filter((entry) => entry.event !== 'http_request')).toEqual([])
    } finally {
      restore()
    }
  })

  it('logs one entry per write, without dates or reasons', async () => {
    const unitId = await addUnit()
    const { written, restore } = captureLogs()
    try {
      const roster = (await create(unitId, { period: { start: '2020-05-01', end: '2020-05-31' }, reason: 'Alasan Rahasia' })).body as Record<string, any>
      await call('POST', `/v1/rosters/${roster.id}/submit`, headToken, { reason: 'Alasan Kirim Rahasia' })
      await call('POST', `/v1/rosters/${roster.id}/return`, bossToken, { reason: 'Alasan Kembali Rahasia' })
      await call('POST', `/v1/rosters/${roster.id}/submit`, headToken, {})
      await call('POST', `/v1/rosters/${roster.id}/approve`, bossToken, {})
      await call('POST', `/v1/rosters/${roster.id}/publish`, headToken, {})
      await call('POST', `/v1/rosters/${roster.id}/close`, headToken, {})
      await vi.waitFor(() =>
        expect(written.filter((entry) => entry.event === 'http_request')).toHaveLength(7),
      )

      expect(written.filter((entry) => entry.event !== 'http_request').map((entry) => entry.event)).toEqual([
        'roster_create',
        'roster_submit',
        'roster_return',
        'roster_submit',
        'roster_approve',
        'roster_publish',
        'roster_close',
      ])
      for (const text of ['2020-05-01', 'Alasan Rahasia', 'Alasan Kirim Rahasia', 'Alasan Kembali Rahasia']) {
        expect(JSON.stringify(written)).not.toContain(text)
      }
    } finally {
      restore()
    }
  })
})
