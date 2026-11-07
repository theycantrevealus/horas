/**
 * Kind of actor that performed an action.
 * `account` is a signed-in person, `system` an internal job, `service` another application.
 */
export type ActorKind = 'account' | 'system' | 'service'

/**
 * Who performed an action. A snapshot: it stays readable after the account is renamed or closed.
 *
 * @property account_id - Account identifier, or `null` for system actors.
 * @property display_name - Name shown in history at the time of the action.
 * @property kind - Kind of actor.
 * @property on_behalf_of_account_id - Account a service or administrator acted for, when any.
 */
export interface ActorRef {
  account_id: string | null
  display_name: string
  kind: ActorKind
  on_behalf_of_account_id?: string
}

/**
 * Valid actor kinds, for checking values that come from outside the type system.
 */
const ACTOR_KINDS: readonly ActorKind[] = ['account', 'system', 'service']

/**
 * Builds the actor of an internal job, consumer or relay.
 *
 * @param name - Stable job name, for example `license-expiry-job`.
 * @returns A system actor.
 */
export function systemActor(name: string): ActorRef {
  return { account_id: null, display_name: name, kind: 'system' }
}

/**
 * Reads a string property of an unknown object.
 *
 * @param value - Object to read.
 * @param key - Property name.
 * @returns The property when it is a non-empty string.
 */
function readString(value: object, key: string): string | undefined {
  const property: unknown = Reflect.get(value, key)
  return typeof property === 'string' && property.length > 0
    ? property
    : undefined
}

/**
 * Builds the actor from the authenticated user that an auth guard put on the request.
 * Accepts `account_id` or `id` as the identifier and `display_name` or `name` as the name.
 *
 * @param user - `request.user`.
 * @returns The actor, or `undefined` when the request is not authenticated.
 */
export function toActorRef(user: unknown): ActorRef | undefined {
  if (typeof user !== 'object' || user === null) {
    return undefined
  }
  const accountId = readString(user, 'account_id') ?? readString(user, 'id')
  if (!accountId) {
    return undefined
  }
  const kind = readString(user, 'kind')
  const onBehalfOf = readString(user, 'on_behalf_of_account_id')
  return {
    account_id: accountId,
    display_name:
      readString(user, 'display_name') ?? readString(user, 'name') ?? accountId,
    kind: ACTOR_KINDS.find((item) => item === kind) ?? 'account',
    ...(onBehalfOf ? { on_behalf_of_account_id: onBehalfOf } : {}),
  }
}
