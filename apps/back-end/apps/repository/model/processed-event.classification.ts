import { type FieldClassification } from '@utility/history/record'
import { type ProcessedEvent } from './processed-event'

/**
 * Sensitivity of `ProcessedEvent` fields. Identifiers and names of events only; nothing personal.
 */
export const ProcessedEventClassification: FieldClassification<ProcessedEvent> =
  { default: 'internal' }
