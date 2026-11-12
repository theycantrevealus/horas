import { Global, Module } from '@nestjs/common'
import { ConfigType } from '@nestjs/config'
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose'
import { Connection } from 'mongoose'
import {
  ChangeLogConfig,
  type ChangeLogConfigType,
} from '@configuration/change-log'
import { MongoConfig } from '@configuration/mongo'
import { EVENT_OUTBOX } from '@utility/events/event'
import { CHANGE_OUTBOX } from '@utility/history/outbox'
import { MONGO_MAIN_CONNECTION } from './constant'
import {
  EventOutboxEntity,
  EventRelayStateEntity,
  EventRelayStateSchema,
  MongoEventOutbox,
  createEventOutboxSchema,
} from './mongo.event-outbox'
import { TRANSACTION_MANAGER } from './transaction'
import {
  ChangeOutboxEntity,
  ChangeRelayStateEntity,
  ChangeRelayStateSchema,
  MongoChangeOutbox,
  createChangeOutboxSchema,
} from './mongo.change-outbox'
import {
  MongoTransactionManager,
  enableTransactionContext,
} from './mongo.transaction'

/**
 * Opens the main MongoDB connection from the typed `mongo` configuration and provides its
 * `TRANSACTION_MANAGER`, `CHANGE_OUTBOX` and `EVENT_OUTBOX`. The outboxes belong to the connection
 * because a change record or an event must be written in the same transaction as the data it
 * describes.
 * Global, so feature modules can inject both. Import it once in each application's root module.
 */
@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      connectionName: MONGO_MAIN_CONNECTION,
      inject: [MongoConfig.KEY],
      /**
       * Maps the `mongo` configuration namespace to Mongoose connection options.
       *
       * @param mongo - Typed `mongo` configuration.
       * @returns Mongoose connection options.
       */
      useFactory: (mongo: ConfigType<typeof MongoConfig>) => ({
        uri: mongo.url,
        user: mongo.user,
        pass: mongo.password,
        dbName: mongo.dbName,
        connectionFactory: enableTransactionContext,
      }),
    }),
    MongooseModule.forFeatureAsync(
      [
        {
          name: ChangeOutboxEntity.name,
          inject: [ChangeLogConfig.KEY],
          /**
           * Builds the outbox schema with the configured TTL.
           *
           * @param changeLog - Typed `changeLog` configuration.
           * @returns The outbox schema.
           */
          useFactory: (changeLog: ChangeLogConfigType) =>
            createChangeOutboxSchema(changeLog.outboxKeepDays),
        },
        {
          name: EventOutboxEntity.name,
          /**
           * Returns the event outbox schema.
           *
           * @returns The event outbox schema.
           */
          useFactory: () => createEventOutboxSchema(),
        },
        {
          name: EventRelayStateEntity.name,
          /**
           * Returns the event relay-state schema.
           *
           * @returns The event relay-state schema.
           */
          useFactory: () => EventRelayStateSchema,
        },
        {
          name: ChangeRelayStateEntity.name,
          /**
           * Returns the relay-state schema.
           *
           * @returns The relay-state schema.
           */
          useFactory: () => ChangeRelayStateSchema,
        },
      ],
      MONGO_MAIN_CONNECTION,
    ),
  ],
  providers: [
    { provide: CHANGE_OUTBOX, useClass: MongoChangeOutbox },
    { provide: EVENT_OUTBOX, useClass: MongoEventOutbox },
    {
      provide: TRANSACTION_MANAGER,
      inject: [getConnectionToken(MONGO_MAIN_CONNECTION)],
      /**
       * Builds the transaction manager for the main connection.
       *
       * @param connection - Main Mongo connection.
       * @returns The transaction manager.
       */
      useFactory: (connection: Connection) =>
        new MongoTransactionManager(connection, MONGO_MAIN_CONNECTION),
    },
  ],
  exports: [TRANSACTION_MANAGER, CHANGE_OUTBOX, EVENT_OUTBOX],
})
export class MongoMainConnectionModule {}
