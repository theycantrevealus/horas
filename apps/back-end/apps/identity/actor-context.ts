import { randomUUID } from 'node:crypto'
import { type ActorRef } from '@utility/history/actor'
import {
  getRequestContext,
  runWithRequestContext,
} from '@utility/logger/context'
import { type Account } from '@repository/model/account'

/**
 * Builds the actor snapshot of an account, for history and `created_by`.
 *
 * @param account - The acting account.
 * @returns The actor.
 */
export function accountActor(account: Account): ActorRef {
  return {
    account_id: account.id,
    display_name: account.profile.display_name,
    kind: account.account_type === 'service' ? 'service' : 'account',
  }
}

/**
 * Runs `work` with `actor` as the acting account, keeping the correlation identifier and reason.
 * Used where a write happens before the caller is authenticated, such as login, where the
 * request context has no actor yet.
 *
 * @param actor - Who acts.
 * @param work - Code that writes through repositories.
 * @returns What `work` returns.
 */
export function runAs<T>(actor: ActorRef, work: () => T): T {
  const current = getRequestContext() ?? { correlationId: randomUUID() }
  return runWithRequestContext({ ...current, actor }, work)
}
