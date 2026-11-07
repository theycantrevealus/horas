/**
 * Injection token for the transaction manager of the main connection.
 */
export const TRANSACTION_MANAGER = Symbol('TRANSACTION_MANAGER')

/**
 * Engine-neutral transaction port. Services use it to make several repository calls succeed or fail together.
 */
export interface TransactionManager {
  /**
   * Runs `work` in one transaction. Repository calls inside `work` join the transaction automatically.
   * A call made while a transaction is already active joins that transaction instead of starting a new one.
   * The engine may run `work` more than once after a transient failure, so `work` must only touch the database.
   *
   * @param work - Repository calls to run atomically.
   * @returns The value returned by `work` after the transaction commits.
   */
  run<T>(work: () => Promise<T>): Promise<T>
}
