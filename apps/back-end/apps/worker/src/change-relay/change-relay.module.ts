import { Module } from '@nestjs/common'
import { ChangeLogModule } from '@utility/history/module'
import { LoggerModule } from '@utility/logger/module'
import { ChangeRelayService } from './change-relay.service'

/**
 * Change relay of the main connection: publishes `change_outbox` entries to the change log.
 * Needs `MongoMainConnectionModule` (outbox, transactions) and `ConfigModule` with
 * `ChangeLogConfig` in the root module.
 */
@Module({
  imports: [ChangeLogModule, LoggerModule],
  providers: [ChangeRelayService],
})
export class ChangeRelayModule {}
