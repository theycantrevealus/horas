import { randomUUID } from 'node:crypto'
import { hostname } from 'node:os'
import {
  Inject,
  Injectable,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common'
import { JobsConfig, type JobsConfigType } from '@configuration/jobs'
import { JOB_LEASE, type JobLease } from '@utility/jobs/lease'
import { AppLogger } from '@utility/logger/service'
import { HR_JOBS, type HrJob } from '@workforce/jobs/job'

/**
 * Most times a job is run again at once in one pass while it keeps filling a batch, so one busy job
 * cannot starve the others.
 */
const MAX_RERUNS = 20

/**
 * Runs the scheduled HR jobs in order, one pass every `HR_JOBS_INTERVAL_MS`
 * (`.claude/design/plans/gateway-hr-7-worker-expiry-jobs.md` WJ2, WJ3, WJ12). A job runs only while
 * this instance holds its lease, so several workers never run the same job at once. A pass that
 * changed or failed something writes one summary entry; an idle pass writes nothing.
 */
@Injectable()
export class HrJobsRunner
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly owner = `${hostname()}:${process.pid}:${randomUUID()}`
  private timer: NodeJS.Timeout | undefined
  private running: Promise<void> | undefined
  private stopped = false

  /**
   * @param jobs - The jobs, in the order a pass runs them.
   * @param lease - Job lease of the main connection.
   * @param config - HR job settings.
   * @param logger - Operational logger.
   */
  constructor(
    @Inject(HR_JOBS) private readonly jobs: HrJob[],
    @Inject(JOB_LEASE) private readonly lease: JobLease,
    @Inject(JobsConfig.KEY) private readonly config: JobsConfigType,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /**
   * Starts the loop once the application is up, unless the jobs are turned off.
   */
  onApplicationBootstrap(): void {
    if (this.config.enabled) {
      this.schedule(0)
    }
  }

  /**
   * Stops the loop and waits for the running pass to finish.
   */
  async onApplicationShutdown(): Promise<void> {
    this.stopped = true
    clearTimeout(this.timer)
    await this.running
  }

  /**
   * Runs every job once, in order. A job whose lease another instance holds is skipped; a job that
   * throws does not stop the others.
   */
  async runOnce(): Promise<void> {
    const leaseMs = this.config.leaseSeconds * 1000
    for (const job of this.jobs) {
      try {
        if (!(await this.lease.acquire(job.name, this.owner, leaseMs))) {
          this.logger.debug({
            event: 'hr_job',
            operation: `HrJobsRunner.${job.name}`,
            outcome: 'idle',
            reason: 'lease_not_held',
          })
          continue
        }
        await this.runJob(job, leaseMs)
      } catch (error: unknown) {
        this.logger.error({
          event: 'hr_job',
          operation: `HrJobsRunner.${job.name}`,
          outcome: 'failure',
          error: error instanceof Error ? error.name : 'UnknownError',
        })
      }
    }
  }

  /**
   * Runs one job, again while it keeps filling a batch, and writes one summary entry when it
   * changed or failed something.
   *
   * @param job - The job.
   * @param leaseMs - Lease duration, renewed before each re-run.
   */
  private async runJob(job: HrJob, leaseMs: number): Promise<void> {
    const startedAt = performance.now()
    let count = 0
    let failed = 0
    let error: string | undefined
    let retryable: boolean | undefined
    let more = true
    for (let pass = 0; more && pass <= MAX_RERUNS; pass += 1) {
      if (pass > 0 && !(await this.lease.acquire(job.name, this.owner, leaseMs))) {
        return
      }
      const result = await job.run(new Date(), this.config.batchSize)
      count += result.count
      failed += result.failed
      error = result.error ?? error
      retryable = result.retryable ?? retryable
      more = result.more
      if (more && pass === MAX_RERUNS) {
        this.logger.warn({
          event: 'hr_job_lag',
          operation: `HrJobsRunner.${job.name}`,
          outcome: 'behind',
          count,
        })
      }
    }
    if (count === 0 && failed === 0) {
      return
    }
    const entry = {
      event: 'hr_job',
      operation: `HrJobsRunner.${job.name}`,
      outcome: failed > 0 ? 'failure' : 'success',
      count,
      failed,
      durationMs: Math.round(performance.now() - startedAt),
      ...(failed > 0 ? { error, retryable } : {}),
    }
    if (failed > 0) {
      this.logger.warn(entry)
    } else {
      this.logger.log(entry)
    }
  }

  /**
   * Schedules the next pass.
   *
   * @param delayMs - Wait before the pass.
   */
  private schedule(delayMs: number): void {
    if (this.stopped) {
      return
    }
    this.timer = setTimeout(() => {
      this.running = this.loop()
    }, delayMs)
  }

  /**
   * Runs a pass and schedules the next after the interval.
   */
  private async loop(): Promise<void> {
    await this.runOnce()
    this.schedule(this.config.intervalMs)
  }
}
