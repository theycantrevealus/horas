import { InMemoryJobLease } from '@utility/testing/in-memory-job-lease'
import { type HrJob, type JobPassResult } from '@workforce/jobs/job'
import { HrJobsRunner } from './hr-jobs.runner'

describe('HrJobsRunner', () => {
  const config = { enabled: true, intervalMs: 3_600_000, batchSize: 10, leaseSeconds: 300 }
  let log: ReturnType<typeof vi.fn>
  let warn: ReturnType<typeof vi.fn>
  let error: ReturnType<typeof vi.fn>
  let debug: ReturnType<typeof vi.fn>
  let lease: InMemoryJobLease

  /**
   * Builds a job that answers the given results in turn, then an idle result.
   *
   * @param name - Job name.
   * @param results - Results of the first passes.
   * @returns The job and its `run` mock.
   */
  function jobOf(name: string, ...results: (JobPassResult | Error)[]) {
    const run = vi.fn(async () => {
      const next = results.shift() ?? { count: 0, failed: 0, more: false }
      if (next instanceof Error) {
        throw next
      }
      return next
    })
    return { job: { name, run } as HrJob, run }
  }

  /**
   * Builds a runner over jobs.
   *
   * @param jobs - The jobs.
   * @param owner - Value of the lease owner to simulate another instance, when needed.
   * @returns The runner.
   */
  function runnerOf(jobs: HrJob[]) {
    return new HrJobsRunner(jobs, lease, config, { log, warn, error, debug } as never)
  }

  beforeEach(() => {
    log = vi.fn()
    warn = vi.fn()
    error = vi.fn()
    debug = vi.fn()
    lease = new InMemoryJobLease()
  })

  it('runs the jobs in order and writes one summary of what changed, with counts only', async () => {
    const first = jobOf('one', { count: 3, failed: 0, more: false })
    const second = jobOf('two')

    await runnerOf([first.job, second.job]).runOnce()

    expect(first.run).toHaveBeenCalledTimes(1)
    expect(second.run).toHaveBeenCalledTimes(1)
    expect(first.run).toHaveBeenCalledWith(expect.any(Date), 10)
    expect(log).toHaveBeenCalledTimes(1)
    expect(log.mock.calls[0]?.[0]).toMatchObject({ event: 'hr_job', operation: 'HrJobsRunner.one', outcome: 'success', count: 3, failed: 0 })
    expect(warn).not.toHaveBeenCalled()
  })

  it('writes nothing for an idle pass', async () => {
    await runnerOf([jobOf('one').job]).runOnce()

    expect(log).not.toHaveBeenCalled()
    expect(warn).not.toHaveBeenCalled()
  })

  it('runs a job again at once while it fills a batch and sums the counts', async () => {
    const busy = jobOf('one', { count: 10, failed: 0, more: true }, { count: 4, failed: 0, more: false })

    await runnerOf([busy.job]).runOnce()

    expect(busy.run).toHaveBeenCalledTimes(2)
    expect(log.mock.calls[0]?.[0]).toMatchObject({ count: 14 })
  })

  it('warns that a job is behind when it still fills batches after the re-run limit', async () => {
    const run = vi.fn(async () => ({ count: 10, failed: 0, more: true }))

    await runnerOf([{ name: 'one', run }]).runOnce()

    expect(run).toHaveBeenCalledTimes(21)
    expect(warn.mock.calls.some(([entry]) => (entry as { event: string }).event === 'hr_job_lag')).toBe(true)
  })

  it('warns with the error class and retry flag when records failed, and still runs the next job', async () => {
    const failing = jobOf('one', { count: 1, failed: 2, more: false, error: 'RepositoryUnavailableError', retryable: true })
    const next = jobOf('two')

    await runnerOf([failing.job, next.job]).runOnce()

    expect(warn.mock.calls[0]?.[0]).toMatchObject({ event: 'hr_job', outcome: 'failure', count: 1, failed: 2, error: 'RepositoryUnavailableError', retryable: true })
    expect(next.run).toHaveBeenCalledTimes(1)
  })

  it('logs a job that throws as an error and still runs the next job', async () => {
    const throwing = jobOf('one', new TypeError('secret value'))
    const next = jobOf('two')

    await runnerOf([throwing.job, next.job]).runOnce()

    expect(error.mock.calls[0]?.[0]).toMatchObject({ event: 'hr_job', outcome: 'failure', error: 'TypeError' })
    expect(JSON.stringify(error.mock.calls)).not.toContain('secret')
    expect(next.run).toHaveBeenCalledTimes(1)
  })

  it('skips a job whose lease another instance holds', async () => {
    await lease.acquire('one', 'another-instance', 60_000)
    const held = jobOf('one', { count: 1, failed: 0, more: false })
    const free = jobOf('two')

    await runnerOf([held.job, free.job]).runOnce()

    expect(held.run).not.toHaveBeenCalled()
    expect(free.run).toHaveBeenCalledTimes(1)
    expect(debug.mock.calls[0]?.[0]).toMatchObject({ event: 'hr_job', outcome: 'idle', reason: 'lease_not_held' })
  })

  it('starts the loop on bootstrap and stops it on shutdown, and does nothing when the jobs are off', async () => {
    vi.useFakeTimers()
    const active = jobOf('one')
    const runner = runnerOf([active.job])

    runner.onApplicationBootstrap()
    await vi.advanceTimersByTimeAsync(0)
    expect(active.run).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(config.intervalMs)
    expect(active.run).toHaveBeenCalledTimes(2)
    await runner.onApplicationShutdown()
    await vi.advanceTimersByTimeAsync(config.intervalMs * 3)
    expect(active.run).toHaveBeenCalledTimes(2)

    const off = jobOf('two')
    const disabled = new HrJobsRunner([off.job], lease, { ...config, enabled: false }, { log, warn, error, debug } as never)
    disabled.onApplicationBootstrap()
    await vi.advanceTimersByTimeAsync(config.intervalMs * 2)
    expect(off.run).not.toHaveBeenCalled()
    vi.useRealTimers()
  })
})
