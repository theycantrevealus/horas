/**
 * How a privilege may be performed (HR spec 7.2): independently, only with a named
 * supervisor, or with written restrictions.
 */
export type PrivilegeCondition = 'full' | 'supervised' | 'restricted'

/**
 * Whether credentialing happens per facility (Indonesia) or once for the whole group
 * (`human-resource-collections.md` 4.7).
 */
export type CredentialingScope = 'facility' | 'group'
