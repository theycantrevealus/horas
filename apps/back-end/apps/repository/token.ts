/**
 * Injection token for the LOV repository.
 * It names no database engine, so consumers don't depend on how LOV is stored.
 */
export const REPOSITORY_LOV = Symbol('REPOSITORY_LOV')

/**
 * Injection token for the account repository (identity context).
 */
export const REPOSITORY_ACCOUNT = Symbol('REPOSITORY_ACCOUNT')

/**
 * Injection token for the account credential repository. Only the authentication service uses it.
 */
export const REPOSITORY_ACCOUNT_CREDENTIAL = Symbol(
  'REPOSITORY_ACCOUNT_CREDENTIAL',
)

/**
 * Injection token for the account session repository. Only the authentication service uses it.
 */
export const REPOSITORY_ACCOUNT_SESSION = Symbol('REPOSITORY_ACCOUNT_SESSION')

/**
 * Injection token for the security event repository.
 */
export const REPOSITORY_SECURITY_EVENT = Symbol('REPOSITORY_SECURITY_EVENT')

/**
 * Injection token for the role repository.
 */
export const REPOSITORY_ROLE = Symbol('REPOSITORY_ROLE')

/**
 * Injection token for the account role binding repository.
 */
export const REPOSITORY_ACCOUNT_ROLE_BINDING = Symbol(
  'REPOSITORY_ACCOUNT_ROLE_BINDING',
)
