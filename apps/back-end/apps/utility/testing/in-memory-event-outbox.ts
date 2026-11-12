import {
  type EventOutbox,
  type EventOutboxEntry,
  type OutboxEvent,
} from '@utility/events/event'

/**
 * Event outbox kept in memory, for tests. It keeps events in insertion order and implements the
 * relay's queries and lease like the Mongo outbox.
 */
export class InMemoryEventOutbox implements EventOutbox {
  private readonly entries: (EventOutboxEntry & {
    published_at: Date | null
    last_error: string | null
  })[] = []
  private nextId = 1
  private lease: { owner: string; expiresAt: number } | null = null

  /**
   * Every event ever appended, delivered or not, in order.
   *
   * @returns The events.
   */
  get events(): OutboxEvent[] {
    return this.entries.map((entry) => entry.event)
  }

  /**
   * Inserts an event.
   *
   * @param event - The event.
   */
  async append(event: OutboxEvent): Promise<void> {
    this.entries.push({
      id: String(this.nextId++).padStart(24, '0'),
      event: structuredClone(event),
      attempts: 0,
      created_at: new Date(),
      published_at: null,
      last_error: null,
    })
  }

  /**
   * Reads undelivered entries in insertion order.
   *
   * @param limit - Largest number of entries.
   * @returns The oldest pending entries.
   */
  async findPending(limit: number): Promise<EventOutboxEntry[]> {
    return this.entries
      .filter((entry) => entry.published_at === null)
      .slice(0, limit)
      .map(({ id, event, attempts, created_at }) => ({
        id,
        event: structuredClone(event),
        attempts,
        created_at,
      }))
  }

  /**
   * Marks entries as delivered.
   *
   * @param ids - Entry identifiers.
   * @param publishedAt - Delivery time.
   */
  async markPublished(ids: string[], publishedAt: Date): Promise<void> {
    for (const entry of this.entries) {
      if (ids.includes(entry.id)) {
        entry.published_at = publishedAt
      }
    }
  }

  /**
   * Counts a failed attempt on entries.
   *
   * @param ids - Entry identifiers.
   * @param error - Error class name.
   */
  async markFailed(ids: string[], error: string): Promise<void> {
    for (const entry of this.entries) {
      if (ids.includes(entry.id)) {
        entry.attempts += 1
        entry.last_error = error
      }
    }
  }

  /**
   * Returns the insertion time of the oldest pending entry.
   *
   * @returns The time, or `null`.
   */
  async oldestPendingAt(): Promise<Date | null> {
    return (
      this.entries.find((entry) => entry.published_at === null)?.created_at ??
      null
    )
  }

  /**
   * Takes or renews the relay lease.
   *
   * @param owner - Relay instance name.
   * @param leaseMs - Lease duration.
   * @returns `true` when `owner` holds the lease.
   */
  async acquireRelayLease(owner: string, leaseMs: number): Promise<boolean> {
    const now = Date.now()
    if (
      !this.lease ||
      this.lease.owner === owner ||
      this.lease.expiresAt <= now
    ) {
      this.lease = { owner, expiresAt: now + leaseMs }
      return true
    }
    return false
  }

  /**
   * Last error recorded for an entry, for tests.
   *
   * @param index - Position of the entry.
   * @returns The error class name, or `null`.
   */
  lastError(index: number): string | null {
    return this.entries[index]?.last_error ?? null
  }

  /**
   * Attempts counted for an entry, for tests.
   *
   * @param index - Position of the entry.
   * @returns The attempts.
   */
  attempts(index: number): number {
    return this.entries[index]?.attempts ?? 0
  }

  /**
   * Whether an entry was delivered, for tests.
   *
   * @param index - Position of the entry.
   * @returns True when delivered.
   */
  isPublished(index: number): boolean {
    return this.entries[index]?.published_at !== null
  }

  /**
   * Makes the oldest pending entry look older, for lag tests.
   *
   * @param createdAt - New insertion time.
   */
  ageOldestPending(createdAt: Date): void {
    const entry = this.entries.find((item) => item.published_at === null)
    if (entry) {
      entry.created_at = createdAt
    }
  }
}
