import { AsyncLocalStorage } from 'node:async_hooks'
import { Logger } from '@nestjs/common'
import { Connection } from 'mongoose'
import { TransactionManager } from './transaction'
import { translateMongoError } from './mongo.error'
import { RepositoryError } from './error'

/**
 * Turns on Mongoose's transaction AsyncLocalStorage, so every model call inside
 * `connection.transaction()` uses the transaction session without passing it by hand.
 * Used as the `connectionFactory` of Mongo connection modules.
 *
 * @param connection - Connection created by `MongooseModule`.
 * @returns The same connection.
 */
export function enableTransactionContext(connection: Connection): Connection {
  connection.base.set('transactionAsyncLocalStorage', true)
  return connection
}

/**
 * MongoDB implementation of the transaction port for one connection.
 * Requires a replica set or sharded cluster; a standalone server rejects transactions.
 */
export class MongoTransactionManager implements TransactionManager {
  private readonly logger = new Logger(MongoTransactionManager.name)
  private readonly active = new AsyncLocalStorage<true>()

  /**
   * @param connection - Connection the transactions run on.
   * @param name - Connection name, used in logs.
   */
  constructor(
    private readonly connection: Connection,
    private readonly name: string,
  ) {}

  /**
   * Runs `work` in a transaction, or inside the current one when already in a transaction.
   * Mongoose retries `work` on transient transaction errors before giving up.
   *
   * @param work - Repository calls to run atomically.
   * @returns The value returned by `work` after the commit.
   */
  async run<T>(work: () => Promise<T>): Promise<T> {
    if (this.active.getStore()) {
      return work()
    }

    const startedAt = Date.now()
    try {
      const result = await this.active.run(true, () =>
        this.connection.transaction(() => work()),
      )
      this.logger.debug({
        event: 'transaction',
        connection: this.name,
        outcome: 'committed',
        durationMs: Date.now() - startedAt,
      })
      return result
    } catch (error: unknown) {
      const translated = translateMongoError(error, `transaction:${this.name}`)
      this.logger.warn({
        event: 'transaction',
        connection: this.name,
        outcome: 'aborted',
        error: translated instanceof Error ? translated.name : 'UnknownError',
        retryable:
          translated instanceof RepositoryError && translated.retryable,
        durationMs: Date.now() - startedAt,
      })
      throw translated
    }
  }
}
