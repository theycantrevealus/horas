import { type FieldClassification } from '@utility/history/record'
import { type AccountSession } from './account-session'

/**
 * Sensitivity of session fields. Sessions are not recorded in the change history, but every
 * model declares a classification (`classification.spec.ts`); the token hash is secret.
 */
export const AccountSessionClassification: FieldClassification<AccountSession> =
  {
    default: 'internal',
    fields: {
      refresh_token_hash: 'secret',
      'client.user_agent_hash': 'secret',
    },
  }
