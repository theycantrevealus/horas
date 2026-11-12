import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ApplicationConfig } from '@configuration/application'
import { ChangeLogConfig } from '@configuration/change-log'
import { EventsConfig } from '@configuration/events'
import { ConfigSchema } from '@configuration/index'
import { LoggerConfig } from '@configuration/logger'
import { MongoConfig } from '@configuration/mongo'
import { MongoMainConnectionModule } from '@utility/database/mongo'
import { environmentIdentifier } from '@utility/environment'
import { LoggerModule } from '@utility/logger/module'
import { ChangeRelayModule } from './change-relay/change-relay.module'
import { EventRelayModule } from './event-relay/event-relay.module'
import { WorkerController } from './worker.controller'
import { WorkerService } from './worker.service'

/**
 * Root module of the worker service application.
 * It loads configuration, sets up logging, opens the main Mongo connection and runs the
 * change relay, which publishes recorded data changes to the change log, and the event relay,
 * which delivers events to the contexts that react to them.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        `${environmentIdentifier}/application.env`,
        `${environmentIdentifier}/mongo.env`,
        `${environmentIdentifier}/logger.env`,
        `${environmentIdentifier}/change-log.env`,
        `${environmentIdentifier}/events.env`,
      ],
      load: [
        ApplicationConfig,
        MongoConfig,
        LoggerConfig,
        ChangeLogConfig,
        EventsConfig,
      ],
      validationSchema: ConfigSchema,
    }),
    LoggerModule,
    MongoMainConnectionModule,
    ChangeRelayModule,
    EventRelayModule,
  ],
  controllers: [WorkerController],
  providers: [WorkerService],
})
export class WorkerModule {}
