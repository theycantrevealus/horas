import { InMemoryJobLease } from './in-memory-job-lease'

describe('InMemoryJobLease', () => {
  it('lets one owner hold a job, lets it renew and keeps other jobs apart', async () => {
    const lease = new InMemoryJobLease()

    expect(await lease.acquire('a', 'one', 1000)).toBe(true)
    expect(await lease.acquire('a', 'two', 1000)).toBe(false)
    expect(await lease.acquire('a', 'one', 1000)).toBe(true)
    expect(await lease.acquire('b', 'two', 1000)).toBe(true)
  })

  it('gives the lease to another owner once it expired', async () => {
    vi.useFakeTimers()
    const lease = new InMemoryJobLease()
    await lease.acquire('a', 'one', 1000)

    vi.advanceTimersByTime(1001)

    expect(await lease.acquire('a', 'two', 1000)).toBe(true)
    vi.useRealTimers()
  })
})
