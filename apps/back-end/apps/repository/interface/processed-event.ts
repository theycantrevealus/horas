import { type Repository } from '@utility/database/interface'
import { type ProcessedEvent } from '@repository/model/processed-event'

/**
 * Processed event data access. Inject it with `REPOSITORY_PROCESSED_EVENT`. Records are
 * append-only: use `create` and `findByEvent`; update and delete are rejected.
 */
export interface ProcessedEventRepository extends Repository<ProcessedEvent> {
  /**
   * Finds the record that a consumer handled an event.
   *
   * @param consumer - Name of the consumer.
   * @param eventId - Identifier of the event.
   * @returns The record, or `null` when the consumer has not handled the event.
   */
  findByEvent(consumer: string, eventId: string): Promise<ProcessedEvent | null>
}
