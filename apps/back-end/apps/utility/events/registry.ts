import { Injectable } from '@nestjs/common'
import { type EventConsumer } from './event'

/**
 * Collects the event consumers of the application. A consumer registers itself when its module
 * starts, and the relay delivers every event to all of them. Nest has no multi-provider, so this
 * singleton stands in for one.
 */
@Injectable()
export class EventConsumerRegistry {
  private readonly consumers = new Map<string, EventConsumer>()

  /**
   * Registers a consumer. Registering the same name again replaces the earlier consumer.
   *
   * @param consumer - The consumer.
   */
  register(consumer: EventConsumer): void {
    this.consumers.set(consumer.name, consumer)
  }

  /**
   * Lists the registered consumers in registration order.
   *
   * @returns The consumers.
   */
  list(): EventConsumer[] {
    return [...this.consumers.values()]
  }
}
