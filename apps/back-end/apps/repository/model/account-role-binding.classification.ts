import { type FieldClassification } from '@utility/history/record'
import { type AccountRoleBinding } from './account-role-binding'

/**
 * Sensitivity of binding fields. Access grants are security relevant and internal.
 */
export const AccountRoleBindingClassification: FieldClassification<AccountRoleBinding> =
  { default: 'internal' }
