import { type LocalDate } from './calendar'
import { type FileRef } from './file-ref'

/**
 * Reference to an official decision letter, such as an SK.
 *
 * @property number - Letter number.
 * @property document - Scan of the signed letter, when uploaded.
 */
export interface DecisionRef {
  number: string
  document: FileRef | null
}

/**
 * A dated decision that changes a record's status, such as a suspension or revocation.
 *
 * @property effective_date - Local date the decision takes effect.
 * @property reason - Why it was decided.
 * @property decision_ref - Letter that records it, when there is one.
 */
export interface StatusDecision {
  effective_date: LocalDate
  reason: string
  decision_ref: DecisionRef | null
}
