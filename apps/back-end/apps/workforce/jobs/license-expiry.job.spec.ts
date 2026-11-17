import { Types } from 'mongoose'
import { RepositoryUnavailableError } from '@utility/database/error'
import { InMemoryEventOutbox } from '@utility/testing/in-memory-event-outbox'
import { runWithRequestContext } from '@utility/logger/context'
import { type ProfessionalLicense } from '@repository/model/professional-license'
import { type LicenseExpiredPayload } from '@repository/model/workforce-event'
import { InMemoryProfessionalLicenses } from '../testing/in-memory'
import { LicenseExpiryJob } from './license-expiry.job'

describe('LicenseExpiryJob', () => {
  const tenantA = new Types.ObjectId().toHexString()
  const tenantB = new Types.ObjectId().toHexString()
  const employeeId = new Types.ObjectId().toHexString()
  const now = new Date('2027-03-10T09:00:00Z')
  const actor = { account_id: 'a1', display_name: 'Admin', kind: 'account' as const }
  let licenses: InMemoryProfessionalLicenses
  let outbox: InMemoryEventOutbox
  let job: LicenseExpiryJob

  /**
   * Stores a licence.
   *
   * @param override - Fields that replace the defaults.
   * @returns The licence.
   */
  function addLicense(override: Partial<ProfessionalLicense> = {}) {
    const number = new Types.ObjectId().toHexString().slice(-6).toUpperCase()
    return runWithRequestContext({ correlationId: 'seed', actor }, () =>
      licenses.create({
        tenant_id: tenantA,
        employee_id: employeeId,
        license_type: { system: 'id.license-type', code: 'sip' },
        eligibility_role: 'practice_permit',
        profession: { system: 'id.profession', code: 'dokter' },
        specialty: null,
        document_number: number,
        document_number_normalized: number,
        issuing_authority: { code: null, name: 'Dinkes' },
        jurisdiction: { country: 'ID', subdivision: null },
        practice_location: { facility_id: new Types.ObjectId().toHexString(), name: 'RS', address: null },
        issue_date: '2025-01-01',
        expiry_date: '2027-03-09',
        document: { file_id: 'f', content_type: 'application/pdf', sha256: 'a'.repeat(64) },
        status: 'valid',
        status_effective_date: '2025-01-02',
        is_live: true,
        submission: { via: 'hr', by: actor, at: new Date() },
        verification: null,
        rejection: null,
        revocation: null,
        superseded: null,
        replaces_license_id: null,
        ...override,
      }),
    )
  }

  beforeEach(() => {
    licenses = new InMemoryProfessionalLicenses()
    outbox = new InMemoryEventOutbox()
    job = new LicenseExpiryJob(
      licenses,
      { run: (work: () => Promise<unknown>) => work() } as never,
      outbox,
    )
  })

  it('expires a valid licence whose expiry date was yesterday, effective the day after the expiry', async () => {
    const license = await addLicense({ expiry_date: '2027-03-09' })

    const result = await job.run(now, 50)

    expect(result).toEqual({ count: 1, failed: 0, more: false })
    expect(await licenses.findOne(license.id)).toMatchObject({ status: 'expired', status_effective_date: '2027-03-10', is_live: true })
  })

  it('leaves a licence that expires today, one without an expiry date and every other status', async () => {
    const today = await addLicense({ expiry_date: '2027-03-10' })
    const noExpiry = await addLicense({ expiry_date: null })
    const others = []
    for (const status of ['pending_verification', 'revoked', 'superseded', 'rejected', 'expired'] as const) {
      others.push(await addLicense({ status }))
    }

    expect(await job.run(now, 50)).toEqual({ count: 0, failed: 0, more: false })

    expect((await licenses.findOne(today.id))?.status).toBe('valid')
    expect((await licenses.findOne(noExpiry.id))?.status).toBe('valid')
    for (const other of others) {
      expect((await licenses.findOne(other.id))?.status).toBe(other.status)
    }
    expect(outbox.events).toEqual([])
  })

  it('handles licences of different tenants, each event carrying its own tenant', async () => {
    await addLicense({ tenant_id: tenantA })
    await addLicense({ tenant_id: tenantB })

    expect((await job.run(now, 50)).count).toBe(2)

    expect(outbox.events.map((event) => event.tenant_id).sort()).toEqual([tenantA, tenantB].sort())
  })

  it('writes one event per licence with identifiers, codes and dates only, and a correlation id', async () => {
    const license = await addLicense({ document_number: 'SIP 999.111' })

    await job.run(now, 50)

    expect(outbox.events).toHaveLength(1)
    const [event] = outbox.events
    expect(event).toMatchObject({
      tenant_id: tenantA,
      event_type: 'workforce.license.expired',
      aggregate: { type: 'license', id: license.id },
    })
    expect(event?.correlation_id).toMatch(/^[0-9a-f-]{36}$/)
    expect(event?.payload).toEqual({
      license_id: license.id,
      employee_id: employeeId,
      eligibility_role: 'practice_permit',
      expiry_date: '2027-03-09',
    } satisfies LicenseExpiredPayload)
    expect(JSON.stringify(event)).not.toContain('SIP')
  })

  it('is idempotent: a second pass changes nothing and writes no second event', async () => {
    await addLicense()

    await job.run(now, 50)
    const second = await job.run(now, 50)

    expect(second).toEqual({ count: 0, failed: 0, more: false })
    expect(outbox.events).toHaveLength(1)
  })

  it('takes at most a batch and says more may be due', async () => {
    for (let index = 0; index < 3; index += 1) {
      await addLicense()
    }

    expect(await job.run(now, 2)).toEqual({ count: 2, failed: 0, more: true })
    expect(await job.run(now, 2)).toEqual({ count: 1, failed: 0, more: false })
  })

  it('skips a licence changed since it was read (stale version) and keeps going', async () => {
    const first = await addLicense({ expiry_date: '2027-01-01' })
    const second = await addLicense({ expiry_date: '2027-02-01' })
    const update = licenses.update.bind(licenses)
    vi.spyOn(licenses, 'update').mockImplementation(async (id, changes, options) => {
      if (id === first.id) {
        await update(id, { status: 'revoked' })
      }
      return update(id, changes, options)
    })

    const result = await job.run(now, 50)

    expect(result).toMatchObject({ count: 1, failed: 1, more: false, retryable: false })
    expect((await licenses.findOne(first.id))?.status).toBe('revoked')
    expect((await licenses.findOne(second.id))?.status).toBe('expired')
    expect(outbox.events).toHaveLength(1)
  })

  it('counts a failing licence with the error class and retry flag, and does not stop the others', async () => {
    const first = await addLicense({ expiry_date: '2027-01-01' })
    const second = await addLicense({ expiry_date: '2027-02-01' })
    const update = licenses.update.bind(licenses)
    vi.spyOn(licenses, 'update').mockImplementation(async (id, changes, options) => {
      if (id === first.id) {
        throw new RepositoryUnavailableError('down', { operation: 'x' })
      }
      return update(id, changes, options)
    })

    const result = await job.run(now, 50)

    expect(result).toEqual({ count: 1, failed: 1, more: false, error: 'RepositoryUnavailableError', retryable: true })
    expect((await licenses.findOne(first.id))?.status).toBe('valid')
    expect((await licenses.findOne(second.id))?.status).toBe('expired')
  })

  it('does not say more is due when every licence of a full batch failed', async () => {
    await addLicense()
    vi.spyOn(licenses, 'update').mockRejectedValue(new Error('boom'))

    expect(await job.run(now, 1)).toMatchObject({ count: 0, failed: 1, more: false, error: 'Error' })
  })
})
