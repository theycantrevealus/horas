import { type FieldClassification } from '@utility/history/record'
import { type SecurityEvent } from './security-event'

/**
 * Sensitivity of security-event fields. The client address is personal data in many jurisdictions.
 */
export const SecurityEventClassification: FieldClassification<SecurityEvent> = {
  default: 'internal',
  fields: { ip: 'confidential', user_agent_hash: 'confidential' },
}
