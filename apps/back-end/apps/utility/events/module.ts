import { Module } from '@nestjs/common'
import { EventConsumerRegistry } from './registry'

/**
 * Provides the registry of event consumers. Import it in the module of a consumer, which registers
 * itself, and in the relay module, which delivers to the registered consumers. Every importer
 * shares the one registry of the application.
 */
@Module({
  providers: [EventConsumerRegistry],
  exports: [EventConsumerRegistry],
})
export class EventsModule {}
