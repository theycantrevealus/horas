import { randomUUID } from 'node:crypto'
import { getRequestContext } from '@utility/logger/context'

/**
 * Injection token for the event outbox of the main connection. The connection module provides it,
 * because an event must be written on the same connection, and so in the same transaction, as the
 * change it announces.
 */
export const EVENT_OUTBOX = Symbol('EVENT_OUTBOX')

/**
 * What an event is about.
 *
 * @property type - Kind of record, for example `employee`.
 * @property id - Identifier of the record.
 * @property version - Version of the record after the change, or `null`.
 */
export interface EventAggregate {
  type: string
  id: string
  version: number | null
}

/**
 * An event other contexts react to (design `account-and-workforce-collections.md` 6.4). The
 * payload holds identifiers, codes and dates only, never names, identifiers of persons or contact
 * data. Consumers dedupe on `event_id`, because delivery is at least once.
 *
 * @property tenant_id - Tenant of the event.
 * @property event_id - Unique identifier.
 * @property event_type - Name, for example `workforce.employee.status_changed`.
 * @property aggregate - What the event is about.
 * @property payload - Plain data of the event.
 * @property correlation_id - Correlation identifier of the request that caused it.
 * @property occurred_at - When it happened.
 */
export interface OutboxEvent {
  tenant_id: string
  event_id: string
  event_type: string
  aggregate: EventAggregate
  payload: Record<string, unknown>
  correlation_id: string
  occurred_at: Date
}

/**
 * An event waiting for the relay.
 *
 * @property id - Outbox entry identifier; entries are read in this order.
 * @property event - The event.
 * @property attempts - Failed delivery attempts so far.
 * @property created_at - When the entry was inserted.
 */
export interface EventOutboxEntry {
  id: string
  event: OutboxEvent
  attempts: number
  created_at: Date
}

/**
 * Engine-neutral storage of events between the write and their delivery (transactional outbox).
 * Not business data: it is not recorded in the change history. Entries expire after delivery.
 * Implementations reject only with `RepositoryError` subclasses.
 */
export interface EventOutbox {
  /**
   * Inserts an event. Inside `TransactionManager.run` it joins the transaction, so it commits or
   * rolls back with the change it announces.
   *
   * @param event - The event.
   */
  append(event: OutboxEvent): Promise<void>

  /**
   * Reads undelivered entries in insertion order.
   *
   * @param limit - Largest number of entries to return.
   * @returns The oldest pending entries.
   */
  findPending(limit: number): Promise<EventOutboxEntry[]>

  /**
   * Marks entries as delivered to every consumer.
   *
   * @param ids - Entry identifiers.
   * @param publishedAt - When they were delivered.
   */
  markPublished(ids: string[], publishedAt: Date): Promise<void>

  /**
   * Counts a failed delivery attempt on entries.
   *
   * @param ids - Entry identifiers.
   * @param error - Error class name only, never a message.
   */
  markFailed(ids: string[], error: string): Promise<void>

  /**
   * Returns when the oldest pending entry was inserted, to measure relay lag.
   *
   * @returns The insertion time, or `null` when nothing is pending.
   */
  oldestPendingAt(): Promise<Date | null>

  /**
   * Takes or renews the relay lease, so only one relay delivers per connection and events leave in
   * order.
   *
   * @param owner - Unique name of the relay instance.
   * @param leaseMs - How long the lease lasts unless renewed.
   * @returns `true` when this instance holds the lease.
   */
  acquireRelayLease(owner: string, leaseMs: number): Promise<boolean>
}

/**
 * A context that reacts to events, for example the identity module reacting to HR events.
 * `handle` must be idempotent: it is called again for an event it already handled when the relay
 * crashed after delivery and before marking it.
 */
export interface EventConsumer {
  /**
   * Stable name of the consumer, used to record which events it handled.
   */
  readonly name: string

  /**
   * Reacts to one event. Events of types the consumer does not know are handled by doing nothing.
   * Rejects when the reaction failed and must be retried.
   *
   * @param event - The event.
   */
  handle(event: OutboxEvent): Promise<void>
}

/**
 * Tells whether a value is plain data: text, number, boolean, `null`, or lists and objects of
 * plain data. Dates, `undefined`, functions and class instances are not.
 *
 * @param value - Value to check.
 * @returns True when the value is plain data.
 */
export function isPlainData(value: unknown): boolean {
  if (value === null) {
    return true
  }
  switch (typeof value) {
    case 'string':
    case 'boolean':
      return true
    case 'number':
      return Number.isFinite(value)
    case 'object': {
      if (Array.isArray(value)) {
        return value.every(isPlainData)
      }
      const proto = Object.getPrototypeOf(value) as unknown
      return (
        (proto === Object.prototype || proto === null) &&
        Object.values(value as Record<string, unknown>).every(isPlainData)
      )
    }
    default:
      return false
  }
}

/**
 * Builds an event. The correlation identifier comes from the request context, so the event, the
 * change history and the logs of one request can be read together (`logging.md` 8); outside a
 * request a new one is made. The payload must be plain data.
 *
 * @param input - Tenant, name, subject and payload of the event.
 * @param input.tenantId - Tenant of the event.
 * @param input.type - Event name.
 * @param input.aggregate - What the event is about.
 * @param input.payload - Plain data of the event.
 * @returns The event.
 * @throws Error when the payload is not plain data.
 */
export function newEvent(input: {
  tenantId: string
  type: string
  aggregate: EventAggregate
  payload: Record<string, unknown>
}): OutboxEvent {
  if (!isPlainData(input.payload)) {
    throw new Error(`The payload of ${input.type} must be plain data`)
  }
  return {
    tenant_id: input.tenantId,
    event_id: randomUUID(),
    event_type: input.type,
    aggregate: input.aggregate,
    payload: input.payload,
    correlation_id: getRequestContext()?.correlationId ?? randomUUID(),
    occurred_at: new Date(),
  }
}
