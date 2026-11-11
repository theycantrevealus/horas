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

/**
 * Injection token for the organization repository (HR legal employers).
 */
export const REPOSITORY_ORGANIZATION = Symbol('REPOSITORY_ORGANIZATION')

/**
 * Injection token for the facility repository (HR hospital and clinic sites).
 */
export const REPOSITORY_FACILITY = Symbol('REPOSITORY_FACILITY')

/**
 * Injection token for the organization unit repository (HR organization chart).
 */
export const REPOSITORY_ORGANIZATION_UNIT = Symbol(
  'REPOSITORY_ORGANIZATION_UNIT',
)

/**
 * Injection token for the code concept repository (HR code systems).
 */
export const REPOSITORY_CODE_CONCEPT = Symbol('REPOSITORY_CODE_CONCEPT')

/**
 * Injection token for the position repository (HR jobs in organization units).
 */
export const REPOSITORY_POSITION = Symbol('REPOSITORY_POSITION')
