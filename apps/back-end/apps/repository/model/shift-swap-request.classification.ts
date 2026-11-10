import { type FieldClassification } from '@utility/history/record'
import { type ShiftSwapRequest } from './shift-swap-request'

/**
 * Sensitivity of `ShiftSwapRequest` fields for the change log. Swap requests are internal; free-text reasons are confidential.
 */
export const ShiftSwapRequestClassification: FieldClassification<ShiftSwapRequest> =
  {
    default: 'internal',
    fields: {
      reason: 'confidential',
      'decision.reason': 'confidential',
    },
  }
