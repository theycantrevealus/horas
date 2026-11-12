import { Module } from '@nestjs/common'
import { EventsModule } from '@utility/events/module'
import { LoggerModule } from '@utility/logger/module'
import { EventRelayService } from './event-relay.service'

/**
 * Event relay of the main connection: delivers `outbox_events` entries to the registered
 * consumers. Needs `MongoMainConnectionModule` (outbox) and `ConfigModule` with `EventsConfig` in
 * the root module. A module of a consumer imports `EventsModule` and registers itself.
 */
@Module({
  imports: [EventsModule, LoggerModule],
  providers: [EventRelayService],
})
export class EventRelayModule {}
