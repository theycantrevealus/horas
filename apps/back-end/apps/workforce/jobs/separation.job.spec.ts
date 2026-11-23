import { getRequestContext, runWithRequestContext } from '@utility/logger/context'
import { InMemoryFacilities, InMemorySeparations } from '../testing/in-memory'
import { SeparationJob } from './separation.job'

describe('SeparationJob', () => {
  let separations: InMemorySeparations
  let facilities: InMemoryFacilities
  let completed: { tenant: string; id: string; actor: string | undefined; kind: string | undefined; correlation: string | undefined }[]
  let failing: Set<string>
  let job: SeparationJob
  const tenantA = 'aaaaaaaaaaaaaaaaaaaaaaaa'
  const tenantB = 'bbbbbbbbbbbbbbbbbbbbbbbb'
  const seed = { correlationId: 'seed', actor: { account_id: 'a1', display_name: 'Admin', kind: 'account' as const } }

  /**
   * Stores a facility with a time zone.
   *
   * @param tenant - Tenant of the facility.
   * @param timezone - IANA time zone.
   * @returns The facility.
   */
  function addFacility(tenant: string, timezone: string) {
    return runWithRequestContext(seed, () =>
      facilities.create({ tenant_id: tenant, organization_id: 'o', code: `f-${timezone}`, name: [], address: null, timezone, holiday_calendar_codes: [], external_ids: [], status: 'active' } as never),
    )
  }

  /**
   * Stores a separation.
   *
   * @param override - Fields that replace the defaults.
   * @returns The separation.
   */
  function addSeparation(override: object = {}) {
    return runWithRequestContext(seed, () =>
      separations.create({
        tenant_id: tenantA, employee_id: `e${Math.random()}`, facility_id: null, type: { system: 'id.separation-type', code: 'resignation' }, contract_action: 'end', last_working_day: '2026-12-31',
        notice_received_on: null, immediate: false, status: 'planned', status_since: new Date(), completion: null, checklist: [], settlement: null, ...override,
      } as never),
    )
  }

  beforeEach(() => {
    separations = new InMemorySeparations()
    facilities = new InMemoryFacilities()
    completed = []
    failing = new Set()
    const completion = {
      complete: async (tenant: string, id: string) => {
        if (failing.has(id)) {
          throw new Error('storage down')
        }
        completed.push({ tenant, id, actor: getRequestContext()?.actor?.display_name, kind: getRequestContext()?.actor?.kind, correlation: getRequestContext()?.correlationId })
        await runWithRequestContext(seed, () => separations.update(id, { status: 'completed' }))
      },
    }
    job = new SeparationJob(separations, facilities, completion as never)
  })

  it('completes a separation the day after its last working day, as the job with a new correlation id each', async () => {
    const one = await addSeparation()
    const two = await addSeparation({ tenant_id: tenantB })
    await addSeparation({ last_working_day: '2027-01-01' })

    const result = await job.run(new Date('2027-01-01T05:00:00Z'), 10)

    expect(result).toEqual({ count: 2, failed: 0, more: false })
    expect(completed.map((item) => item.id).sort((left, right) => left.localeCompare(right))).toEqual([one.id, two.id].sort((left, right) => left.localeCompare(right)))
    expect(completed.find((item) => item.id === two.id)?.tenant).toBe(tenantB)
    expect(completed.every((item) => item.actor === 'separation-job' && item.kind === 'system')).toBe(true)
    expect(new Set(completed.map((item) => item.correlation)).size).toBe(2)
    expect(completed.map((item) => item.correlation)).not.toContain('seed')
  })

  it('waits for the end of the day in the facility zone: a hospital east of UTC completes at its own midnight, one west of it later', async () => {
    const jakarta = await addFacility(tenantA, 'Asia/Jakarta')
    const losAngeles = await addFacility(tenantA, 'America/Los_Angeles')
    const east = await addSeparation({ facility_id: jakarta.id })
    const west = await addSeparation({ facility_id: losAngeles.id })

    const early = await job.run(new Date('2026-12-31T18:00:00Z'), 10)
    const late = await job.run(new Date('2027-01-01T09:00:00Z'), 10)

    expect(early.count).toBe(1)
    expect(completed[0]?.id).toBe(east.id)
    expect(late.count).toBe(1)
    expect(completed[1]?.id).toBe(west.id)
  })

  it('reads UTC for a facility that cannot be found or belongs to another tenant', async () => {
    const foreign = await addFacility(tenantB, 'Asia/Jakarta')
    await addSeparation({ facility_id: foreign.id })
    await addSeparation({ facility_id: 'cccccccccccccccccccccccc' })

    expect((await job.run(new Date('2026-12-31T18:00:00Z'), 10)).count).toBe(0)
    expect((await job.run(new Date('2027-01-01T00:30:00Z'), 10)).count).toBe(2)
  })

  it('changes nothing on a second pass, and ignores completed and cancelled separations', async () => {
    await addSeparation()
    await addSeparation({ status: 'cancelled' })
    await addSeparation({ status: 'completed' })

    expect((await job.run(new Date('2027-01-01T05:00:00Z'), 10)).count).toBe(1)
    expect(await job.run(new Date('2027-01-01T06:00:00Z'), 10)).toEqual({ count: 0, failed: 0, more: false })
    expect(completed).toHaveLength(1)
  })

  it('counts a failing separation, keeps it planned for the next pass and completes the others', async () => {
    const bad = await addSeparation()
    const good = await addSeparation()
    failing.add(bad.id)

    const result = await job.run(new Date('2027-01-01T05:00:00Z'), 10)

    expect(result).toEqual({ count: 1, failed: 1, more: false, error: 'Error', retryable: true })
    expect(completed.map((item) => item.id)).toEqual([good.id])
    expect((await separations.findOne(bad.id))?.status).toBe('planned')
    failing.clear()
    expect((await job.run(new Date('2027-01-01T06:00:00Z'), 10)).count).toBe(1)
  })

  it('stops after the batch size and says there is more, then catches up on the next pass', async () => {
    for (let index = 0; index < 3; index += 1) {
      await addSeparation()
    }

    const first = await job.run(new Date('2027-01-01T05:00:00Z'), 2)
    const second = await job.run(new Date('2027-01-01T05:10:00Z'), 2)

    expect(first).toEqual({ count: 2, failed: 0, more: true })
    expect(second).toEqual({ count: 1, failed: 0, more: false })
  })

  it('reads across pages of a hundred', async () => {
    for (let index = 0; index < 101; index += 1) {
      await addSeparation()
    }

    const result = await job.run(new Date('2027-01-01T05:00:00Z'), 500)

    expect(result.count).toBe(101)
  })
})
