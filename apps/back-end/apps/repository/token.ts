/**
 * Injection token for the LOV repository.
 * It names no database engine, so consumers don't depend on how LOV is stored.
 */
export const REPOSITORY_LOV = Symbol('REPOSITORY_LOV')
