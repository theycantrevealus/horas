import { type FieldClassification } from '@utility/history/record'
import { type Role } from './role'

/**
 * Sensitivity of role fields. Roles are internal configuration; their changes are security relevant,
 * so values are logged in plain form.
 */
export const RoleClassification: FieldClassification<Role> = {
  default: 'internal',
  arrayKeys: { name: ['locale'], description: ['locale'] },
}
