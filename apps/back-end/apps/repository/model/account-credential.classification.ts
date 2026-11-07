import { type FieldClassification } from '@utility/history/record'
import { type AccountCredential } from './account-credential'

/**
 * Sensitivity of credential fields for the change log. Hashes and history are secret, so only
 * the fact that they changed is recorded; counters and flags are internal.
 */
export const AccountCredentialClassification: FieldClassification<AccountCredential> =
  {
    default: 'internal',
    fields: {
      account_id: 'internal',
      password_hash: 'secret',
      password_history: 'secret',
    },
  }
