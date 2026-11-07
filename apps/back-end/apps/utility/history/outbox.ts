import { ChangeRecord } from './record'

/**
 * Injection token for the change outbox of the main connection.
 * The connection module provides it, because records must be written on the same
 * connection, and so in the same transaction, as the data they describe.
 */
export const CHANGE_OUTBOX = Symbol('CHANGE_OUTBOX')

/**
 * A change record waiting for the relay.
 *
 * @property id - Outbox entry identifier; entries are read in this order.
 * @property record - The change record, already masked.
 * @property attempts - Failed publish attempts so far.
 * @property created_at - When the entry was inserted.
 */
export interface ChangeOutboxEntry {
  id: string
  record: ChangeRecord
  attempts: number
  created_at: Date
}

/**
 * Last hash of each tenant's chain, so the chain continues after a restart.
 */
export type ChainHeads = Record<string, string>

/**
 * Engine-neutral storage of change records between the write and the change log
 * (transactional outbox, design section 5). Not history: entries expire after publication.
 * Implementations reject only with `RepositoryError` subclasses.
 */
export interface ChangeOutbox {
  /**
   * Inserts a record. Inside `TransactionManager.run` it joins the transaction, so it
   * commits or rolls back with the write it describes.
   *
   * @param record - Masked change record.
   */
  append(record: ChangeRecord): Promise<void>

  /**
   * Reads unpublished, non-rejected entries in insertion order.
   *
   * @param limit - Largest number of entries to return.
   * @returns The oldest pending entries.
   */
  findPending(limit: number): Promise<ChangeOutboxEntry[]>

  /**
   * Marks entries as written to the change log. They expire after `CHANGE_OUTBOX_KEEP_DAYS`.
   *
   * @param ids - Entry identifiers.
   * @param publishedAt - When they were written.
   */
  markPublished(ids: string[], publishedAt: Date): Promise<void>

  /**
   * Counts a failed publish attempt on entries.
   *
   * @param ids - Entry identifiers.
   * @param error - Error class name only, never a message.
   */
  markFailed(ids: string[], error: string): Promise<void>

  /**
   * Takes an entry out of the queue without publishing it, because the change log refused it.
   * The entry stays in the outbox (it never expires) for an operator to fix.
   *
   * @param id - Entry identifier.
   * @param reason - Short machine-readable reason.
   */
  markRejected(id: string, reason: string): Promise<void>

  /**
   * Returns when the oldest pending entry was inserted, to measure relay lag.
   *
   * @returns The insertion time, or `null` when nothing is pending.
   */
  oldestPendingAt(): Promise<Date | null>

  /**
   * Takes or renews the relay lease, so only one relay publishes per connection and
   * records leave in order.
   *
   * @param owner - Unique name of the relay instance.
   * @param leaseMs - How long the lease lasts unless renewed.
   * @returns `true` when this instance holds the lease.
   */
  acquireRelayLease(owner: string, leaseMs: number): Promise<boolean>

  /**
   * Reads the last hash of each tenant's chain.
   *
   * @returns Chain heads by tenant; empty before the first write.
   */
  loadChainHeads(): Promise<ChainHeads>

  /**
   * Stores the chain heads after a batch was written. Only the lease owner may store them.
   *
   * @param owner - Lease owner.
   * @param heads - Chain heads by tenant.
   */
  saveChainHeads(owner: string, heads: ChainHeads): Promise<void>
}
