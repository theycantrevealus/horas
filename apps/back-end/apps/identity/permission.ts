/**
 * Catalog of permissions, defined in code. A role can only hold permissions listed here;
 * unknown permissions are rejected when a role is written (`account-and-workforce-collections.md` 5.7).
 * Names follow `<module>.<resource>:<action>`.
 */
export const PERMISSIONS = {
  ACCOUNT_READ: 'identity.account:read',
  ACCOUNT_CREATE: 'identity.account:create',
  ACCOUNT_UPDATE: 'identity.account:update',
  ACCOUNT_HOLD: 'identity.account:hold',
  ACCOUNT_RESET_PASSWORD: 'identity.account:reset-password',
  ROLE_READ: 'identity.role:read',
  ROLE_MANAGE: 'identity.role:manage',
  ROLE_BINDING_MANAGE: 'identity.role-binding:manage',
  WORKFORCE_ORGANIZATION_READ: 'workforce.organization:read',
  WORKFORCE_ORGANIZATION_WRITE: 'workforce.organization:write',
  WORKFORCE_FACILITY_READ: 'workforce.facility:read',
  WORKFORCE_FACILITY_WRITE: 'workforce.facility:write',
  WORKFORCE_UNIT_READ: 'workforce.unit:read',
  WORKFORCE_UNIT_WRITE: 'workforce.unit:write',
  WORKFORCE_POSITION_READ: 'workforce.position:read',
  WORKFORCE_POSITION_WRITE: 'workforce.position:write',
  WORKFORCE_PARAMETER_READ: 'workforce.parameter:read',
  WORKFORCE_PARAMETER_WRITE: 'workforce.parameter:write',
  WORKFORCE_CODE_CONCEPT_READ: 'workforce.code-concept:read',
  WORKFORCE_CODE_CONCEPT_MANAGE: 'workforce.code-concept:manage',
  LOV_READ: 'reference.lov:read',
  LOV_WRITE: 'reference.lov:write',
} as const

/**
 * A permission code from the catalog.
 */
export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

/**
 * Every permission code, for validating values that come from outside the type system.
 */
export const ALL_PERMISSIONS: readonly Permission[] = Object.values(PERMISSIONS)

/**
 * Checks whether a string is a permission of the catalog.
 *
 * @param value - Value to check.
 * @returns `true` when the catalog contains it.
 */
export function isPermission(value: string): value is Permission {
  return (ALL_PERMISSIONS as readonly string[]).includes(value)
}
