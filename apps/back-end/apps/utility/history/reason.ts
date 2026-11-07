import { randomUUID } from 'node:crypto'
import {
  getRequestContext,
  runWithRequestContext,
} from '@utility/logger/context'

/**
 * Runs `work` with `reason` as the reason of every change it records.
 * The reason is stored in the request context, so repository signatures stay unchanged.
 * The rest of the context (correlation identifier, actor) is kept.
 *
 * @example
 * await withChangeReason('Account locked after a security report', () =>
 *   this.accountRepository.update(id, { status: 'locked' }),
 * )
 *
 * @param reason - Why the data is changed, as shown in the history.
 * @param work - Code that writes through repositories.
 * @returns The value returned by `work`.
 */
export function withChangeReason<T>(reason: string, work: () => T): T {
  const current = getRequestContext() ?? { correlationId: randomUUID() }
  return runWithRequestContext({ ...current, reason }, work)
}
