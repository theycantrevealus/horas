import { Module, type OnModuleInit } from '@nestjs/common'
import { EventConsumerRegistry } from '@utility/events/registry'
import { EventsModule } from '@utility/events/module'
import { LoggerModule } from '@utility/logger/module'
import { AccountRepositoryModule } from '@repository/mongo/account.module'
import { AccountSessionRepositoryModule } from '@repository/mongo/account-session.module'
import { ProcessedEventRepositoryModule } from '@repository/mongo/processed-event.module'
import { SecurityEventRepositoryModule } from '@repository/mongo/security-event.module'
import { SecurityAuditService } from '../authentication/security-audit.service'
import { AccountLifecycleService } from './account-lifecycle.service'
import { WorkforceEventConsumer } from './workforce-event.consumer'

/**
 * The identity context's reaction to workforce events. It imports only the account, session,
 * security event and processed event repositories, so the application that runs it (the worker)
 * needs no token, password or role services. The security log needs the `auth` configuration for
 * its retention period (`AuthConfig` loaded in the root module). It registers its consumer with
 * the event relay when the module starts.
 */
@Module({
  imports: [
    LoggerModule,
    EventsModule,
    AccountRepositoryModule,
    AccountSessionRepositoryModule,
    SecurityEventRepositoryModule,
    ProcessedEventRepositoryModule,
  ],
  providers: [
    SecurityAuditService,
    AccountLifecycleService,
    WorkforceEventConsumer,
  ],
})
export class IdentityEventsModule implements OnModuleInit {
  /**
   * @param registry - Registry of the event consumers.
   * @param consumer - The consumer of workforce events.
   */
  constructor(
    private readonly registry: EventConsumerRegistry,
    private readonly consumer: WorkforceEventConsumer,
  ) {}

  /**
   * Registers the consumer, so the relay delivers workforce events to it.
   */
  onModuleInit(): void {
    this.registry.register(this.consumer)
  }
}
