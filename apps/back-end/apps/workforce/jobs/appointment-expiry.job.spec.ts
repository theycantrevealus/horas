import { Types } from 'mongoose'
import { RepositoryUnavailableError } from '@utility/database/error'
import { runWithRequestContext } from '@utility/logger/context'
import { InMemoryEventOutbox } from '@utility/testing/in-memory-event-outbox'
import { type ClinicalAppointment } from '@repository/model/clinical-appointment'
import { type PrivilegeGrant } from '@repository/model/privilege-grant'
import {
  InMemoryClinicalAppointments,
  InMemoryFacilities,
  InMemoryPrivilegeGrants,
} from '../testing/in-memory'
import { AppointmentExpiryJob } from './appointment-expiry.job'

describe('AppointmentExpiryJob', () => {
  const tenantA = new Types.ObjectId().toHexString()
  const tenantB = new Types.ObjectId().toHexString()
  const organizationId = new Types.ObjectId().toHexString()
  const director = { account_id: 'a9', display_name: 'Director', kind: 'account' as const }
  // 2027-03-10 02:00 in Jakarta (UTC+7) is still 2027-03-09 19:00 UTC.
  const now = new Date('2027-03-10T09:00:00Z')
  let appointments: InMemoryClinicalAppointments
  let grants: InMemoryPrivilegeGrants
  let facilities: InMemoryFacilities
  let outbox: InMemoryEventOutbox
  let job: AppointmentExpiryJob
  let facilityId: string
  let counter = 0

  /**
   * Runs `work` as a signed-in request.
   *
   * @param work - Code to run.
   * @returns What `work` returns.
   */
  function asDirector<T>(work: () => Promise<T>): Promise<T> {
    return runWithRequestContext({ correlationId: 'seed', actor: director }, work)
  }

  /**
   * Stores a facility in a time zone.
   *
   * @param timezone - IANA zone.
   * @param tenant - Tenant of the facility.
   * @returns The facility identifier.
   */
  async function addFacility(timezone: string, tenant = tenantA): Promise<string> {
    counter += 1
    return (
      await asDirector(() =>
        facilities.create({ tenant_id: tenant, organization_id: organizationId, code: `rs-${counter}`, name: [{ locale: 'en', text: 'RS' }], address: null, timezone, holiday_calendar_codes: [], external_ids: [], status: 'active' }),
      )
    ).id
  }

  /**
   * Stores an SPK.
   *
   * @param override - Fields that replace the defaults.
   * @returns The SPK.
   */
  function addSpk(override: Partial<ClinicalAppointment> = {}) {
    counter += 1
    return asDirector(() =>
      appointments.create({
        tenant_id: tenantA,
        appointment_number: `SPK/${counter}`,
        employee_id: new Types.ObjectId().toHexString(),
        credentialing_facility_id: facilityId,
        credentialing_scope: 'facility',
        facility_ids: [facilityId],
        unit_ids: [],
        source_application_id: new Types.ObjectId().toHexString(),
        valid_period: { start: '2025-01-01', end: '2027-03-09' },
        is_temporary: false,
        status: 'active',
        is_current: true,
        issued: { by: director, director_employee_id: new Types.ObjectId().toHexString(), date: '2025-01-01' },
        signed_document: null,
        suspension: null,
        revocation: null,
        superseded_by_id: null,
        ...override,
      }),
    )
  }

  /**
   * Stores a grant of an SPK.
   *
   * @param spk - The SPK.
   * @param override - Fields that replace the defaults.
   * @returns The grant.
   */
  function addGrant(spk: ClinicalAppointment, override: Partial<PrivilegeGrant> = {}) {
    return asDirector(() =>
      grants.create({
        tenant_id: spk.tenant_id,
        appointment_id: spk.id,
        employee_id: spk.employee_id,
        facility_ids: spk.facility_ids,
        unit_ids: spk.unit_ids,
        catalog_item_id: new Types.ObjectId().toHexString(),
        code: 'PD-1',
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

  beforeEach(async () => {
    appointments = new InMemoryClinicalAppointments()
    grants = new InMemoryPrivilegeGrants()
    facilities = new InMemoryFacilities()
    outbox = new InMemoryEventOutbox()
    job = new AppointmentExpiryJob(
      appointments,
      grants,
      facilities,
      { run: (work: () => Promise<unknown>) => work() } as never,
      outbox,
    )
    facilityId = await addFacility('Asia/Jakarta')
  })

  it('expires an active SPK whose last valid day was yesterday and stops it being current', async () => {
    const spk = await addSpk()

    expect(await job.run(now, 50)).toEqual({ count: 1, failed: 0, more: false })

    expect(await appointments.findOne(spk.id)).toMatchObject({ status: 'expired', is_current: false })
  })

  it('expires a suspended SPK too', async () => {
    const spk = await addSpk({ status: 'suspended' })

    await job.run(now, 50)

    expect((await appointments.findOne(spk.id))?.status).toBe('expired')
  })

  it('leaves an SPK whose last valid day is today, and every status that is not current', async () => {
    const today = await addSpk({ valid_period: { start: '2025-01-01', end: '2027-03-10' } })
    const others = []
    for (const status of ['revoked', 'superseded', 'expired'] as const) {
      others.push(await addSpk({ status, is_current: false }))
    }

    expect(await job.run(now, 50)).toEqual({ count: 0, failed: 0, more: false })

    expect((await appointments.findOne(today.id))?.status).toBe('active')
    for (const other of others) {
      expect((await appointments.findOne(other.id))?.status).toBe(other.status)
    }
    expect(outbox.events).toEqual([])
  })

  it('reads the last valid day in the facility zone: an SPK ending on the UTC date is still valid west of UTC', async () => {
    const west = await addFacility('America/New_York')
    // 2027-03-10 09:00 UTC is 2027-03-10 04:00 in New York and 16:00 in Jakarta.
    const early = new Date('2027-03-10T03:00:00Z') // New York: 2027-03-09 22:00
    const inNewYork = await addSpk({ credentialing_facility_id: west, valid_period: { start: '2025-01-01', end: '2027-03-09' } })
    const inJakarta = await addSpk({ valid_period: { start: '2025-01-01', end: '2027-03-09' } })

    const result = await job.run(early, 50)

    expect(result.count).toBe(1)
    expect((await appointments.findOne(inNewYork.id))?.status).toBe('active')
    expect((await appointments.findOne(inJakarta.id))?.status).toBe('expired')
  })

  it('falls back to UTC when the facility cannot be read', async () => {
    const spk = await addSpk({ credentialing_facility_id: new Types.ObjectId().toHexString() })

    expect((await job.run(now, 50)).count).toBe(1)
    expect((await appointments.findOne(spk.id))?.status).toBe('expired')
  })

  it('leaves the grants as they are and flags the supervised grants of its full grants', async () => {
    const supervisorSpk = await addSpk()
    const full = await addGrant(supervisorSpk)
    const restricted = await addGrant(supervisorSpk, { condition: 'restricted', restriction_notes: 'n' })
    const otherSpk = await addSpk({ valid_period: { start: '2025-01-01', end: '2028-12-31' } })
    const dependent = await addGrant(otherSpk, {
      condition: 'supervised',
      supervisor: { employee_id: supervisorSpk.employee_id, grant_id: full.id },
    })

    await job.run(now, 50)

    expect((await grants.findOne(full.id))?.status).toBe('active')
    expect((await grants.findOne(restricted.id))?.status).toBe('active')
    expect((await grants.findOne(dependent.id))?.flag).toMatchObject({ reason: 'supervisor_lost_privilege', resolved_at: null })
    expect((await appointments.findOne(otherSpk.id))?.status).toBe('active')
  })

  it('does not flag again a grant that already has an open flag', async () => {
    const spk = await addSpk()
    const full = await addGrant(spk)
    const otherSpk = await addSpk({ valid_period: { start: '2025-01-01', end: '2028-12-31' } })
    const openFlag = { reason: 'supervisor_lost_privilege' as const, at: new Date('2027-01-01T00:00:00Z'), resolved_at: null }
    const dependent = await addGrant(otherSpk, { condition: 'supervised', supervisor: { employee_id: spk.employee_id, grant_id: full.id }, flag: openFlag })

    await job.run(now, 50)

    expect((await grants.findOne(dependent.id))?.flag?.at).toEqual(openFlag.at)
  })

  it('writes one event with identifiers and dates only, its own tenant and a correlation id', async () => {
    const other = await addFacility('Asia/Jakarta', tenantB)
    const spk = await addSpk({ appointment_number: 'SPK/SECRET-1' })
    await addSpk({ tenant_id: tenantB, credentialing_facility_id: other })

    await job.run(now, 50)

    expect(outbox.events.map((event) => event.tenant_id).sort()).toEqual([tenantA, tenantB].sort())
    const event = outbox.events.find((item) => item.tenant_id === tenantA)
    expect(event).toMatchObject({ event_type: 'workforce.appointment.expired', aggregate: { type: 'clinical_appointment', id: spk.id } })
    expect(event?.payload).toEqual({
      appointment_id: spk.id,
      employee_id: spk.employee_id,
      credentialing_facility_id: facilityId,
      valid_until: '2027-03-09',
    })
    expect(event?.correlation_id).toMatch(/^[0-9a-f-]{36}$/)
    expect(JSON.stringify(outbox.events)).not.toContain('SECRET')
  })

  it('is idempotent: a second pass changes nothing and writes no second event', async () => {
    await addSpk()

    await job.run(now, 50)
    expect(await job.run(now, 50)).toEqual({ count: 0, failed: 0, more: false })

    expect(outbox.events).toHaveLength(1)
  })

  it('takes at most a batch and says more may be due', async () => {
    for (let index = 0; index < 3; index += 1) {
      await addSpk()
    }

    expect(await job.run(now, 2)).toEqual({ count: 2, failed: 0, more: true })
    expect(await job.run(now, 2)).toEqual({ count: 1, failed: 0, more: false })
  })

  it('skips an SPK changed since it was read (stale version) and keeps going', async () => {
    const first = await addSpk({ valid_period: { start: '2025-01-01', end: '2027-01-01' } })
    const second = await addSpk({ valid_period: { start: '2025-01-01', end: '2027-02-01' } })
    const update = appointments.update.bind(appointments)
    vi.spyOn(appointments, 'update').mockImplementation(async (id, changes, options) => {
      if (id === first.id) {
        await update(id, { status: 'revoked', is_current: false })
      }
      return update(id, changes, options)
    })

    const result = await job.run(now, 50)

    expect(result).toMatchObject({ count: 1, failed: 1, more: false, retryable: false })
    expect((await appointments.findOne(first.id))?.status).toBe('revoked')
    expect((await appointments.findOne(second.id))?.status).toBe('expired')
    expect(outbox.events).toHaveLength(1)
  })

  it('counts a failing SPK with the error class and retry flag and does not stop the others', async () => {
    const first = await addSpk({ valid_period: { start: '2025-01-01', end: '2027-01-01' } })
    const second = await addSpk({ valid_period: { start: '2025-01-01', end: '2027-02-01' } })
    const update = appointments.update.bind(appointments)
    vi.spyOn(appointments, 'update').mockImplementation(async (id, changes, options) => {
      if (id === first.id) {
        throw new RepositoryUnavailableError('down', { operation: 'x' })
      }
      return update(id, changes, options)
    })

    expect(await job.run(now, 50)).toEqual({ count: 1, failed: 1, more: false, error: 'RepositoryUnavailableError', retryable: true })
    expect((await appointments.findOne(first.id))?.status).toBe('active')
    expect((await appointments.findOne(second.id))?.status).toBe('expired')
  })
})
