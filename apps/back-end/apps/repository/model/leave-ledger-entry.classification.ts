import { type FieldClassification } from '@utility/history/record'
import { type LeaveLedgerEntry } from './leave-ledger-entry'

/**
 * Sensitivity of `LeaveLedgerEntry` fields for the change log. The leave type and the balances are
 * confidential (HR spec 14); identifiers and the job key are internal.
 */
export const LeaveLedgerEntryClassification: FieldClassification<LeaveLedgerEntry> =
  {
    default: 'confidential',
    fields: {
      employee_id: 'internal',
      dedupe_key: 'internal',
    },
  }
