import { randomUUID } from 'node:crypto'
import { hostname } from 'node:os'
import {
  Inject,
  Injectable,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common'
import { EventsConfig, type EventsConfigType } from '@configuration/events'
import { RepositoryError } from '@utility/database/error'
import {
  EVENT_OUTBOX,
  type EventOutbox,
  type EventOutboxEntry,
} from '@utility/events/event'
import { EventConsumerRegistry } from '@utility/events/registry'
import { systemActor } from '@utility/history/actor'
import { runWithRequestContext } from '@utility/logger/context'
import { AppLogger } from '@utility/logger/service'

/**
 * Name of the relay as a system actor.
 */
const RELAY_ACTOR = 'event-relay'

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
 * @property published - Events delivered to every consumer.
 * @property more - Whether a full batch was read, so more may be pending.
 */
export interface EventRelayPassResult {
  published: number
  more: boolean
}

/**
 * Delivers events from the outbox to the registered consumers (`.claude/design/plans/gateway-hr-events-to-identity.md`
 * H1 and H4). One instance per connection holds the lease, so events leave in the order they were
 * written. Delivery is at least once: a crash after a consumer handled an event and before it was
 * marked leaves it pending, and consumers dedupe on `event_id`. An event is marked only after
 * every consumer handled it. A failing event stops the pass, so no later event overtakes it; it is
 * retried with backoff, and the lag warning says it is stuck.
 *
 * With no consumer registered the relay leaves the queue alone: events wait until a consumer
 * exists, instead of being marked delivered to nobody.
 */
@Injectable()
export class EventRelayService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly owner = `${hostname()}:${process.pid}:${randomUUID()}`
  private timer: NodeJS.Timeout | undefined
  private running: Promise<void> | undefined
  private stopped = false
  private failures = 0

  /**
   * @param outbox - Event outbox of the main connection.
   * @param registry - Registry of the event consumers.
   * @param config - Event relay settings.
   * @param logger - Operational logger.
   */
  constructor(
    @Inject(EVENT_OUTBOX) private readonly outbox: EventOutbox,
    @Inject(EventConsumerRegistry)
    private readonly registry: EventConsumerRegistry,
    @Inject(EventsConfig.KEY) private readonly config: EventsConfigType,
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
   * Runs one pass: takes the lease, delivers one batch in order, marks what was delivered and
   * checks the lag.
   *
   * @returns What the pass did.
   * @throws The error of the first event that a consumer failed to handle, after counting it.
   */
  async runOnce(): Promise<EventRelayPassResult> {
    const consumers = this.registry.list()
    if (consumers.length === 0) {
      this.logger.debug({
        event: 'event_relay',
        operation: 'EventRelayService.runOnce',
        outcome: 'idle',
        reason: 'no_consumers',
      })
      return { published: 0, more: false }
    }
    const leaseMs = Math.max(this.config.relay.intervalMs * 10, MIN_LEASE_MS)
    if (!(await this.outbox.acquireRelayLease(this.owner, leaseMs))) {
      return { published: 0, more: false }
    }

    const startedAt = performance.now()
    const batchSize = this.config.relay.batchSize
    const entries = await this.outbox.findPending(batchSize)
    const delivered: string[] = []
    let failure: unknown
    let failedEntry: EventOutboxEntry | undefined
    for (const entry of entries) {
      try {
        await this.deliver(entry)
        delivered.push(entry.id)
      } catch (error: unknown) {
        failure = error
        failedEntry = entry
        break
      }
    }
    if (delivered.length > 0) {
      await this.outbox.markPublished(delivered, new Date())
    }
    if (entries.length > 0) {
      this.logger.log({
        event: 'event_relay',
        operation: 'EventRelayService.runOnce',
        outcome: failedEntry ? 'failure' : 'success',
        count: delivered.length,
        durationMs: Math.round(performance.now() - startedAt),
        ...(failedEntry
          ? {
              error: failure instanceof Error ? failure.name : 'UnknownError',
              retryable:
                failure instanceof RepositoryError ? failure.retryable : true,
              eventType: failedEntry.event.event_type,
              attempts: failedEntry.attempts + 1,
            }
          : {}),
      })
    }
    if (failedEntry) {
      await this.countFailure(failedEntry.id, failure)
      await this.checkLag()
      throw failure
    }
    await this.checkLag()
    return { published: delivered.length, more: entries.length === batchSize }
  }

  /**
   * Hands one event to every consumer, in the request context of the event: its correlation
   * identifier and the relay as system actor, so the logs and change records of the reaction are
   * read together with the request that caused it (`logging.md` 8).
   *
   * @param entry - The pending entry.
   * @throws The error of the first consumer that failed.
   */
  private async deliver(entry: EventOutboxEntry): Promise<void> {
    await runWithRequestContext(
      {
        correlationId: entry.event.correlation_id,
        actor: systemActor(RELAY_ACTOR),
      },
      async () => {
        for (const consumer of this.registry.list()) {
          await consumer.handle(entry.event)
        }
      },
    )
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
   * Counts a failed attempt on the entry. A failure here is logged, never thrown, so the original
   * error is the one reported.
   *
   * @param id - Entry identifier.
   * @param error - Error that failed the delivery.
   */
  private async countFailure(id: string, error: unknown): Promise<void> {
    try {
      await this.outbox.markFailed(
        [id],
        error instanceof Error ? error.name : 'UnknownError',
      )
    } catch (markError: unknown) {
      this.logger.warn({
        event: 'event_relay_mark_failed',
        operation: 'EventRelayService.countFailure',
        outcome: 'failure',
        error: markError instanceof Error ? markError.name : 'UnknownError',
      })
    }
  }

  /**
   * Warns when the oldest pending event waited longer than `EVENT_RELAY_MAX_LAG_SECONDS`: a
   * stuck event keeps every later one waiting, and account holds depend on this queue.
   */
  private async checkLag(): Promise<void> {
    const oldest = await this.outbox.oldestPendingAt()
    if (!oldest) {
      return
    }
    const lagSeconds = Math.round((Date.now() - oldest.getTime()) / 1000)
    if (lagSeconds > this.config.relay.maxLagSeconds) {
      this.logger.warn({
        event: 'event_relay_lag',
        operation: 'EventRelayService.checkLag',
        lagSeconds,
        maxLagSeconds: this.config.relay.maxLagSeconds,
      })
    }
  }
}
