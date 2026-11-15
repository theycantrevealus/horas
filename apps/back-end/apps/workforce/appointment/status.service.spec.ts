import { Types } from 'mongoose'
import { runWithRequestContext } from '@utility/logger/context'
import { type AppLogger } from '@utility/logger/service'
import { type ClinicalAppointment } from '@repository/model/clinical-appointment'
import { type PrivilegeGrant } from '@repository/model/privilege-grant'
import {
  InMemoryClinicalAppointments,
  InMemoryFacilities,
  InMemoryPrivilegeGrants,
} from '../testing/in-memory'
import { StatusService } from './status.service'

describe('StatusService', () => {
  const tenantId = new Types.ObjectId().toHexString()
  const otherTenantId = new Types.ObjectId().toHexString()
  const organizationId = new Types.ObjectId().toHexString()
  const log = vi.fn()
  const warn = vi.fn()
  const error = vi.fn()
  const debug = vi.fn()
  const input = { reason: 'Temuan Rahasia', decisionNumber: 'SK/09/2026' }
  let appointments: InMemoryClinicalAppointments
  let grants: InMemoryPrivilegeGrants
  let facilities: InMemoryFacilities
  let service: StatusService
  let facilityId: string
  let counter = 0

  /**
   * Runs `work` as a signed-in request.
   *
   * @param work - Code to run.
   * @returns What `work` returns.
   */
  function asDirector<T>(work: () => Promise<T>): Promise<T> {
    return runWithRequestContext(
      {
        correlationId: 'c1',
        actor: { account_id: 'a9', display_name: 'Director', kind: 'account' },
      },
      work,
    )
  }

  /**
   * Adds an SPK.
   *
   * @param override - Fields that replace the defaults.
   * @returns The appointment.
   */
  function addAppointment(
    override: Partial<ClinicalAppointment> = {},
  ): Promise<ClinicalAppointment> {
    counter += 1
    const status = override.status ?? 'active'
    const person = new Types.ObjectId().toHexString()
    return asDirector(() =>
      appointments.create({
        tenant_id: tenantId,
        appointment_number: `SPK/${counter}`,
        employee_id: person,
        credentialing_facility_id: facilityId,
        credentialing_scope: 'facility',
        facility_ids: [facilityId],
        unit_ids: [],
        source_application_id: new Types.ObjectId().toHexString(),
        valid_period: { start: '2026-01-01', end: '2028-12-31' },
        is_temporary: false,
        status,
        is_current: status === 'active' || status === 'suspended',
        issued: { by: { account_id: 'a9', display_name: 'Director', kind: 'account' }, director_employee_id: person, date: '2026-01-01' },
        signed_document: null,
        suspension: null,
        revocation: null,
        superseded_by_id: null,
        ...override,
      }),
    )
  }

  /**
   * Adds a grant of an SPK.
   *
   * @param appointment - The SPK.
   * @param override - Fields that replace the defaults.
   * @returns The grant.
   */
  function addGrant(
    appointment: ClinicalAppointment,
    override: Partial<PrivilegeGrant> = {},
  ): Promise<PrivilegeGrant> {
    counter += 1
    return asDirector(() =>
      grants.create({
        tenant_id: appointment.tenant_id,
        appointment_id: appointment.id,
        employee_id: appointment.employee_id,
        facility_ids: appointment.facility_ids,
        unit_ids: appointment.unit_ids,
        catalog_item_id: new Types.ObjectId().toHexString(),
        code: `PD-${counter}`,
        condition: 'full',
        supervisor: null,
        restriction_notes: null,
        status: 'active',
        status_change: null,
        flag: null,
        ...override,
      }),
    )
  }

  /**
   * Builds a supervisor and a supervised practitioner: the supervisor's SPK holds a full grant
   * and the practitioner's SPK holds a supervised grant that points to it.
   *
   * @returns Both SPKs and both grants.
   */
  async function chain() {
    const supervisorSpk = await addAppointment()
    const full = await addGrant(supervisorSpk, { code: 'PD-F' })
    const practitionerSpk = await addAppointment()
    const supervised = await addGrant(practitionerSpk, {
      code: 'PD-S',
      condition: 'supervised',
      catalog_item_id: full.catalog_item_id,
      supervisor: { employee_id: supervisorSpk.employee_id, grant_id: full.id },
    })
    return { supervisorSpk, full, practitionerSpk, supervised }
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

  const grantOf = async (id: string) => (await grants.findOne(id)) as PrivilegeGrant
  const spkOf = async (id: string) => (await appointments.findOne(id)) as ClinicalAppointment
  const run = <T>(work: () => Promise<T>) => asDirector(work)

  beforeEach(async () => {
    vi.resetAllMocks()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-03-10T12:00:00Z'))
    appointments = new InMemoryClinicalAppointments()
    grants = new InMemoryPrivilegeGrants()
    facilities = new InMemoryFacilities()
    service = new StatusService(
      appointments,
      grants,
      facilities,
      { run: (work: () => Promise<unknown>) => work() } as never,
      { log, warn, error, debug } as unknown as AppLogger,
    )
    facilityId = (
      await asDirector(() =>
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
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('suspending an SPK', () => {
    it('suspends an active SPK with the decision dated today in the facility zone, and leaves its grants alone', async () => {
      vi.setSystemTime(new Date('2026-03-10T18:00:00Z'))
      const spk = await addAppointment()
      const grant = await addGrant(spk)

      const result = await run(() => service.suspendAppointment(tenantId, spk.id, input))

      expect(result.appointment).toMatchObject({
        status: 'suspended',
        is_current: true,
        suspension: {
          effective_date: '2026-03-11',
          reason: 'Temuan Rahasia',
          decision_ref: { number: 'SK/09/2026', document: null },
        },
        revocation: null,
      })
      expect(result.grants.map((item) => item.id)).toEqual([grant.id])
      expect((await grantOf(grant.id)).status).toBe('active')
    })

    it('writes one log entry without the reason or the decision number', async () => {
      const spk = await addAppointment()

      await run(() => service.suspendAppointment(tenantId, spk.id, input))

      expect(log).toHaveBeenCalledTimes(1)
      expect(log.mock.calls[0]?.[0]).toMatchObject({ event: 'appointment_suspend', outcome: 'success' })
      const written = JSON.stringify([log.mock.calls, warn.mock.calls, error.mock.calls])
      expect(written).not.toContain('Temuan Rahasia')
      expect(written).not.toContain('SK/09/2026')
    })

    it('flags the supervised grants of the full grants of the SPK (HR-CRD-006), once', async () => {
      const { supervisorSpk, supervised } = await chain()

      await run(() => service.suspendAppointment(tenantId, supervisorSpk.id, input))

      expect((await grantOf(supervised.id)).flag).toEqual({
        reason: 'supervisor_lost_privilege',
        at: new Date('2026-03-10T12:00:00Z'),
        resolved_at: null,
      })
      vi.setSystemTime(new Date('2026-03-11T12:00:00Z'))
      await run(() => service.revokeAppointment(tenantId, supervisorSpk.id, input))
      expect((await grantOf(supervised.id)).flag?.at).toEqual(new Date('2026-03-10T12:00:00Z'))
    })

    it('does not flag a supervised grant that is revoked, nor for a restricted or supervised grant of the SPK', async () => {
      const { supervisorSpk, full, supervised } = await chain()
      await run(() => service.revokeGrant(tenantId, supervised.id, input))
      await addGrant(supervisorSpk, { condition: 'restricted', restriction_notes: 'x' })

      await run(() => service.suspendAppointment(tenantId, supervisorSpk.id, input))

      expect((await grantOf(supervised.id)).flag).toBeNull()
      expect((await grantOf(full.id)).status).toBe('active')
    })

    it('needs an active SPK', async () => {
      for (const status of ['suspended', 'revoked', 'expired', 'superseded'] as const) {
        const spk = await addAppointment({ status })
        expect(await rejection(() => run(() => service.suspendAppointment(tenantId, spk.id, input)))).toMatchObject({
          kind: 'invalid',
          code: 'invalid_transition',
        })
      }
    })
  })

  describe('lifting the suspension of an SPK', () => {
    it('makes the SPK active again, clears the suspension and resolves the flags it raised', async () => {
      const { supervisorSpk, supervised } = await chain()
      await run(() => service.suspendAppointment(tenantId, supervisorSpk.id, input))
      vi.setSystemTime(new Date('2026-03-12T12:00:00Z'))

      const result = await run(() => service.liftAppointmentSuspension(tenantId, supervisorSpk.id, { reason: 'Selesai', decisionNumber: 'SK/10/2026' }))

      expect(result.appointment).toMatchObject({ status: 'active', is_current: true, suspension: null })
      expect((await grantOf(supervised.id)).flag).toEqual({
        reason: 'supervisor_lost_privilege',
        at: new Date('2026-03-10T12:00:00Z'),
        resolved_at: new Date('2026-03-12T12:00:00Z'),
      })
      expect(log.mock.calls.at(-1)?.[0]).toMatchObject({ event: 'appointment_lift_suspension', outcome: 'success' })
    })

    it('needs a suspended SPK, a reason and a decision number', async () => {
      const active = await addAppointment()
      expect(await rejection(() => run(() => service.liftAppointmentSuspension(tenantId, active.id, input)))).toMatchObject({ code: 'invalid_transition' })
      const suspended = await addAppointment({ status: 'suspended' })
      expect(await rejection(() => run(() => service.liftAppointmentSuspension(tenantId, suspended.id, { reason: 'x', decisionNumber: ' ' })))).toMatchObject({ code: 'decision_number_required' })
      expect(await rejection(() => run(() => service.liftAppointmentSuspension(tenantId, suspended.id, { reason: ' ', decisionNumber: 'SK/1' })))).toMatchObject({ code: 'reason_required' })
      expect((await spkOf(suspended.id)).status).toBe('suspended')
    })
  })

  describe('revoking an SPK', () => {
    it('revokes an active or a suspended SPK and every grant that is not revoked, in one decision', async () => {
      for (const status of ['active', 'suspended'] as const) {
        const spk = await addAppointment({ status })
        const live = await addGrant(spk)
        const suspended = await addGrant(spk, { status: 'suspended' })
        const gone = await addGrant(spk, {
          status: 'revoked',
          status_change: { effective_date: '2026-01-05', reason: 'Lama', decision_ref: null },
        })

        const result = await run(() => service.revokeAppointment(tenantId, spk.id, input))

        const decision = { effective_date: '2026-03-10', reason: 'Temuan Rahasia', decision_ref: { number: 'SK/09/2026', document: null } }
        expect(result.appointment).toMatchObject({ status: 'revoked', is_current: false, revocation: decision })
        expect(await grantOf(live.id)).toMatchObject({ status: 'revoked', status_change: decision })
        expect(await grantOf(suspended.id)).toMatchObject({ status: 'revoked', status_change: decision })
        expect((await grantOf(gone.id)).status_change?.reason).toBe('Lama')
      }
    })

    it('flags the supervised grants of other SPKs, and not those of the same SPK, which are revoked with it', async () => {
      const { supervisorSpk, full, supervised } = await chain()
      const second = await addGrant(supervisorSpk, { condition: 'supervised', supervisor: { employee_id: supervisorSpk.employee_id, grant_id: full.id } })

      await run(() => service.revokeAppointment(tenantId, supervisorSpk.id, input))

      expect((await grantOf(supervised.id)).flag).toMatchObject({ reason: 'supervisor_lost_privilege', resolved_at: null })
      expect((await grantOf(second.id)).flag).toBeNull()
      expect((await grantOf(second.id)).status).toBe('revoked')
    })

    it('never touches another SPK or another tenant', async () => {
      const spk = await addAppointment()
      const other = await addAppointment()
      const otherGrant = await addGrant(other)

      await run(() => service.revokeAppointment(tenantId, spk.id, input))

      expect((await spkOf(other.id)).status).toBe('active')
      expect((await grantOf(otherGrant.id)).status).toBe('active')
    })

    it('is final: revoked, expired and superseded SPKs cannot be changed', async () => {
      for (const status of ['revoked', 'expired', 'superseded'] as const) {
        const spk = await addAppointment({ status })
        const acts = [
          () => service.revokeAppointment(tenantId, spk.id, input),
          () => service.suspendAppointment(tenantId, spk.id, input),
          () => service.liftAppointmentSuspension(tenantId, spk.id, input),
        ]
        for (const act of acts) {
          expect(await rejection(() => run(act))).toMatchObject({ code: 'invalid_transition' })
        }
      }
    })
  })

  describe('every SPK decision', () => {
    it('checks the reason and the decision number before writing', async () => {
      const spk = await addAppointment()
      const cases: [object, string][] = [
        [{ reason: '  ', decisionNumber: 'SK/1' }, 'reason_required'],
        [{ reason: 'x'.repeat(501), decisionNumber: 'SK/1' }, 'invalid_reason'],
        [{ reason: 'x', decisionNumber: '' }, 'decision_number_required'],
        [{ reason: 'x', decisionNumber: 'S'.repeat(65) }, 'invalid_decision_number'],
      ]
      for (const [body, code] of cases) {
        expect(await rejection(() => run(() => service.suspendAppointment(tenantId, spk.id, body as never)))).toMatchObject({ kind: 'invalid', code })
      }
      expect((await spkOf(spk.id)).status).toBe('active')
    })

    it('answers 404 for a missing, malformed or foreign SPK, 422 for a facility that is gone, and 409 for a stale version', async () => {
      const foreign = await addAppointment({ tenant_id: otherTenantId })
      for (const id of [new Types.ObjectId().toHexString(), 'bad', foreign.id]) {
        expect(await rejection(() => run(() => service.suspendAppointment(tenantId, id, input)))).toMatchObject({ kind: 'not_found', code: 'appointment_not_found' })
      }
      const homeless = await addAppointment({ credentialing_facility_id: new Types.ObjectId().toHexString() })
      expect(await rejection(() => run(() => service.suspendAppointment(tenantId, homeless.id, input)))).toMatchObject({ code: 'facility_not_found' })
      const spk = await addAppointment()
      expect(await rejection(() => run(() => service.suspendAppointment(tenantId, spk.id, { ...input, version: spk.version + 5 })))).toMatchObject({ kind: 'conflict', code: 'stale_version' })
      expect((await spkOf(spk.id)).status).toBe('active')
    })
  })

  describe('superseded records (HR plan 4.4 RN13)', () => {
    it('cannot be suspended, lifted or revoked, and a superseded grant is never flagged', async () => {
      const spk = await addAppointment()
      const gone = await addGrant(spk, { status: 'superseded' as never })
      for (const act of [
        () => service.suspendGrant(tenantId, gone.id, input),
        () => service.liftGrantSuspension(tenantId, gone.id, input),
        () => service.revokeGrant(tenantId, gone.id, input),
      ]) {
        expect(await rejection(() => run(act))).toMatchObject({ code: 'invalid_transition' })
      }
      const { supervisorSpk, full, practitionerSpk } = await chain()
      const old = await addGrant(practitionerSpk, {
        condition: 'supervised',
        status: 'superseded' as never,
        supervisor: { employee_id: supervisorSpk.employee_id, grant_id: full.id },
      })

      await run(() => service.suspendGrant(tenantId, full.id, input))

      expect((await grantOf(old.id)).flag).toBeNull()
    })
  })

  describe('suspending a grant', () => {
    it('suspends an active grant of a current SPK with the decision, and flags the grants it supervises', async () => {
      const { full, supervised } = await chain()

      const result = await run(() => service.suspendGrant(tenantId, full.id, input))

      expect(result).toMatchObject({
        id: full.id,
        status: 'suspended',
        status_change: { effective_date: '2026-03-10', reason: 'Temuan Rahasia', decision_ref: { number: 'SK/09/2026', document: null } },
      })
      expect((await grantOf(supervised.id)).flag).toMatchObject({ reason: 'supervisor_lost_privilege', resolved_at: null })
      expect(log.mock.calls[0]?.[0]).toMatchObject({ event: 'grant_suspend', outcome: 'success' })
      expect(JSON.stringify(log.mock.calls)).not.toContain('Temuan Rahasia')
    })

    it('does not flag anything for a grant that is not full', async () => {
      const spk = await addAppointment()
      const restricted = await addGrant(spk, { condition: 'restricted', restriction_notes: 'x' })
      await run(() => service.suspendGrant(tenantId, restricted.id, input))
      expect((await grantOf(restricted.id)).status).toBe('suspended')
    })

    it('needs an active grant of a current SPK', async () => {
      const spk = await addAppointment()
      for (const status of ['suspended', 'revoked'] as const) {
        const grant = await addGrant(spk, { status })
        expect(await rejection(() => run(() => service.suspendGrant(tenantId, grant.id, input)))).toMatchObject({ code: 'invalid_transition' })
      }
      for (const status of ['revoked', 'expired', 'superseded'] as const) {
        const closed = await addAppointment({ status })
        const grant = await addGrant(closed)
        expect(await rejection(() => run(() => service.suspendGrant(tenantId, grant.id, input)))).toMatchObject({ kind: 'invalid', code: 'appointment_not_current' })
      }
    })
  })

  describe('lifting the suspension of a grant', () => {
    it('makes the grant active again, clears the decision and resolves the flags', async () => {
      const { full, supervised } = await chain()
      await run(() => service.suspendGrant(tenantId, full.id, input))
      vi.setSystemTime(new Date('2026-03-12T12:00:00Z'))

      const result = await run(() => service.liftGrantSuspension(tenantId, full.id, { reason: 'Selesai', decisionNumber: 'SK/10/2026' }))

      expect(result).toMatchObject({ status: 'active', status_change: null })
      expect((await grantOf(supervised.id)).flag?.resolved_at).toEqual(new Date('2026-03-12T12:00:00Z'))
    })

    it('leaves the flags open while the SPK is itself suspended', async () => {
      const { supervisorSpk, full, supervised } = await chain()
      await run(() => service.suspendGrant(tenantId, full.id, input))
      await run(() => service.suspendAppointment(tenantId, supervisorSpk.id, input))

      await run(() => service.liftGrantSuspension(tenantId, full.id, input))

      expect((await grantOf(supervised.id)).flag?.resolved_at).toBeNull()
      await run(() => service.liftAppointmentSuspension(tenantId, supervisorSpk.id, input))
      expect((await grantOf(supervised.id)).flag?.resolved_at).not.toBeNull()
    })

    it('needs a suspended grant of a current SPK', async () => {
      const spk = await addAppointment()
      const active = await addGrant(spk)
      expect(await rejection(() => run(() => service.liftGrantSuspension(tenantId, active.id, input)))).toMatchObject({ code: 'invalid_transition' })
      const closed = await addAppointment({ status: 'revoked' })
      const grant = await addGrant(closed, { status: 'suspended' })
      expect(await rejection(() => run(() => service.liftGrantSuspension(tenantId, grant.id, input)))).toMatchObject({ code: 'appointment_not_current' })
    })
  })

  describe('revoking a grant', () => {
    it('revokes an active or a suspended grant for good, and flags the grants it supervises', async () => {
      const { full, supervised } = await chain()

      const result = await run(() => service.revokeGrant(tenantId, full.id, input))

      expect(result).toMatchObject({ status: 'revoked', status_change: { reason: 'Temuan Rahasia' } })
      expect((await grantOf(supervised.id)).flag).toMatchObject({ reason: 'supervisor_lost_privilege' })
      const spk = await addAppointment()
      const suspended = await addGrant(spk, { status: 'suspended' })
      expect((await run(() => service.revokeGrant(tenantId, suspended.id, input))).status).toBe('revoked')
      expect(await rejection(() => run(() => service.revokeGrant(tenantId, suspended.id, input)))).toMatchObject({ code: 'invalid_transition' })
      expect(await rejection(() => run(() => service.liftGrantSuspension(tenantId, suspended.id, input)))).toMatchObject({ code: 'invalid_transition' })
    })

    it('answers 404 for a missing, malformed or foreign grant, 422 for bad input, and 409 for a stale version', async () => {
      const foreignSpk = await addAppointment({ tenant_id: otherTenantId })
      const foreign = await addGrant(foreignSpk)
      for (const id of [new Types.ObjectId().toHexString(), 'bad', foreign.id]) {
        expect(await rejection(() => run(() => service.revokeGrant(tenantId, id, input)))).toMatchObject({ kind: 'not_found', code: 'grant_not_found' })
      }
      const spk = await addAppointment()
      const grant = await addGrant(spk)
      expect(await rejection(() => run(() => service.revokeGrant(tenantId, grant.id, { reason: ' ', decisionNumber: 'SK/1' })))).toMatchObject({ code: 'reason_required' })
      expect(await rejection(() => run(() => service.revokeGrant(tenantId, grant.id, { ...input, version: grant.version + 5 })))).toMatchObject({ code: 'stale_version' })
      expect((await grantOf(grant.id)).status).toBe('active')
    })
  })
})
