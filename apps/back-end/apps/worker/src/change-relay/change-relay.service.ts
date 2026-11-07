import { randomUUID } from 'node:crypto'
import { hostname } from 'node:os'
import {
  Inject,
  Injectable,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common'
import {
  ChangeLogConfig,
  type ChangeLogConfigType,
} from '@configuration/change-log'
import { RepositoryError } from '@utility/database/error'
import {
  TRANSACTION_MANAGER,
  type TransactionManager,
} from '@utility/database/transaction'
import { systemActor } from '@utility/history/actor'
import { ChangeLogger } from '@utility/history/logger'
import {
  CHANGE_OUTBOX,
  type ChangeOutbox,
  type ChangeOutboxEntry,
} from '@utility/history/outbox'
import { runWithRequestContext } from '@utility/logger/context'
import { AppLogger } from '@utility/logger/service'

/**
 * Name of the relay as a system actor.
 */
const RELAY_ACTOR = 'change-relay'

/**
 * Longest wait between attempts after repeated failures.
 */
const MAX_BACKOFF_MS = 60_000

/**
 * Shortest lease, so a slow batch does not lose it.
 */
const MIN_LEASE_MS = 30_000

/**
 * Outcome of one relay pass.
 *
 * @property published - Records written to the change log.
 * @property rejected - Records refused by the secret guard.
 * @property more - Whether a full batch was read, so more may be pending.
 */
export interface RelayPassResult {
  published: number
  rejected: number
  more: boolean
}

/**
 * Publishes change records from the outbox to the change log (design section 6.1).
 * One instance per connection holds the lease, so records leave in order. Delivery is at
 * least once: a crash after the write and before `published_at` writes the record again with
 * the same `change_id`, and readers dedupe on it.
 */
@Injectable()
export class ChangeRelayService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly owner = `${hostname()}:${process.pid}:${randomUUID()}`
  private timer: NodeJS.Timeout | undefined
  private running: Promise<void> | undefined
  private stopped = false
  private failures = 0

  /**
   * @param outbox - Change outbox of the main connection.
   * @param transactions - Transaction manager of the main connection.
   * @param changeLogger - Writer of the change log.
   * @param config - Change-log settings.
   * @param logger - Operational logger.
   */
  constructor(
    @Inject(CHANGE_OUTBOX) private readonly outbox: ChangeOutbox,
    @Inject(TRANSACTION_MANAGER)
    private readonly transactions: TransactionManager,
    @Inject(ChangeLogger) private readonly changeLogger: ChangeLogger,
    @Inject(ChangeLogConfig.KEY) private readonly config: ChangeLogConfigType,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /**
   * Starts the relay loop once the application is up.
   */
  onApplicationBootstrap(): void {
    this.schedule(0)
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
   * Runs one pass: takes the lease, writes one batch, marks it published and checks the lag.
   * Each pass runs in its own request context with the relay as system actor.
   *
   * @returns What the pass did.
   */
  async runOnce(): Promise<RelayPassResult> {
    const context = {
      correlationId: randomUUID(),
      actor: systemActor(RELAY_ACTOR),
    }
    return runWithRequestContext(context, () => this.pass())
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
   * Runs a pass and schedules the next: at once when more is pending, after the interval
   * otherwise, and with exponential backoff after failures.
   */
  private async loop(): Promise<void> {
    let delay = this.config.relay.intervalMs
    try {
      const result = await this.runOnce()
      this.failures = 0
      if (result.more) {
        delay = 0
      }
    } catch {
      this.failures += 1
      delay = Math.min(
        this.config.relay.intervalMs * 2 ** this.failures,
        MAX_BACKOFF_MS,
      )
    }
    this.schedule(delay)
  }

  /**
   * One relay pass inside the request context.
   *
   * @returns What the pass did.
   */
  private async pass(): Promise<RelayPassResult> {
    const leaseMs = Math.max(this.config.relay.intervalMs * 10, MIN_LEASE_MS)
    if (!(await this.outbox.acquireRelayLease(this.owner, leaseMs))) {
      return { published: 0, rejected: 0, more: false }
    }

    const startedAt = performance.now()
    const batchSize = this.config.relay.batchSize
    const entries = await this.outbox.findPending(batchSize)
    const counts =
      entries.length > 0
        ? await this.publish(entries, startedAt)
        : { published: 0, rejected: 0 }
    await this.checkLag()
    return { ...counts, more: entries.length === batchSize }
  }

  /**
   * Writes one batch to the change log, then marks it published and stores the chain heads
   * in one transaction. Logging happens after the transaction resolves.
   *
   * @param entries - Pending entries in order.
   * @param startedAt - Start of the pass, for `durationMs`.
   * @returns How many records were published and rejected.
   */
  private async publish(
    entries: ChangeOutboxEntry[],
    startedAt: number,
  ): Promise<Pick<RelayPassResult, 'published' | 'rejected'>> {
    const ids = entries.map((entry) => entry.id)
    try {
      const heads = await this.outbox.loadChainHeads()
      const result = await this.changeLogger.write(
        entries.map((entry) => entry.record),
        heads,
      )
      const rejectedIds = new Set(
        result.rejected.map((item) => item.record.change_id),
      )
      const rejected = entries.filter((entry) =>
        rejectedIds.has(entry.record.change_id),
      )
      const published = entries.filter(
        (entry) => !rejectedIds.has(entry.record.change_id),
      )
      const reasons = new Map(
        result.rejected.map((item) => [item.record.change_id, item.reason]),
      )

      await this.transactions.run(async () => {
        for (const entry of rejected) {
          await this.outbox.markRejected(
            entry.id,
            reasons.get(entry.record.change_id) ?? 'rejected',
          )
        }
        await this.outbox.markPublished(
          published.map((entry) => entry.id),
          new Date(),
        )
        await this.outbox.saveChainHeads(this.owner, result.heads)
      })

      for (const entry of rejected) {
        this.logger.error({
          event: 'change_log_rejected',
          operation: 'ChangeRelayService.publish',
          changeId: entry.record.change_id,
          entityType: entry.record.entity.type,
          reason: reasons.get(entry.record.change_id),
        })
      }
      this.logger.log({
        event: 'change_relay',
        operation: 'ChangeRelayService.publish',
        outcome: 'success',
        count: published.length,
        rejected: rejected.length,
        durationMs: Math.round(performance.now() - startedAt),
      })
      return { published: published.length, rejected: rejected.length }
    } catch (error: unknown) {
      await this.countFailure(ids, error)
      this.logger.error({
        event: 'change_relay',
        operation: 'ChangeRelayService.publish',
        outcome: 'failure',
        count: entries.length,
        error: error instanceof Error ? error.name : 'UnknownError',
        retryable: error instanceof RepositoryError ? error.retryable : true,
        durationMs: Math.round(performance.now() - startedAt),
      })
      throw error
    }
  }

  /**
   * Counts a failed attempt on the batch. A failure here is logged, never thrown, so the
   * original error is the one reported.
   *
   * @param ids - Entry identifiers of the batch.
   * @param error - Error that failed the batch.
   */
  private async countFailure(ids: string[], error: unknown): Promise<void> {
    try {
      await this.outbox.markFailed(
        ids,
        error instanceof Error ? error.name : 'UnknownError',
      )
    } catch (markError: unknown) {
      this.logger.warn({
        event: 'change_relay_mark_failed',
        operation: 'ChangeRelayService.countFailure',
        outcome: 'failure',
        error: markError instanceof Error ? markError.name : 'UnknownError',
      })
    }
  }

  /**
   * Warns when the oldest pending record waited longer than `CHANGE_RELAY_MAX_LAG_SECONDS`,
   * long before the log platform starts rejecting old samples.
   */
  private async checkLag(): Promise<void> {
    const oldest = await this.outbox.oldestPendingAt()
    if (!oldest) {
      return
    }
    const lagSeconds = Math.round((Date.now() - oldest.getTime()) / 1000)
    if (lagSeconds > this.config.relay.maxLagSeconds) {
      this.logger.warn({
        event: 'change_relay_lag',
        operation: 'ChangeRelayService.checkLag',
        lagSeconds,
        maxLagSeconds: this.config.relay.maxLagSeconds,
      })
    }
  }
}
