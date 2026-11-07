import { type FieldClassification } from '@utility/history/record'
import { type Account } from './account'

/**
 * Sensitivity of account fields for the change log. Accounts are internal data;
 * login identifiers are personal contact data, so their values are confidential and never logged in plain form.
 */
export const AccountClassification: FieldClassification<Account> = {
  default: 'internal',
  fields: {
    username: 'confidential',
    login_identifiers: 'confidential',
    'profile.display_name': 'internal',
    'profile.given_name': 'confidential',
    'profile.family_name': 'confidential',
    'holds.notes': 'confidential',
  },
  arrayKeys: {
    login_identifiers: ['type', 'normalized'],
    holds: ['kind', 'reason', 'source'],
  },
}
