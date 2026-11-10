import { type Entity } from '@utility/database/interface'
import { type ActorRef } from '@utility/history/actor'
import { type ActorStamp } from './common/actor-stamp'
import { type FileRef } from './common/file-ref'
import { Timestamp } from './timestamp'

/**
 * What a file import loads.
 */
export type HrImportKind = 'roster_assignments' | 'holiday_calendar'

/**
 * Import status: checked first, applied only after confirmation.
 */
export type HrImportStatus =
  | 'uploaded'
  | 'validated'
  | 'invalid'
  | 'applying'
  | 'applied'
  | 'failed'
  | 'cancelled'

/**
 * Where an import writes.
 */
export type HrImportTarget =
  { roster_id: string } | { calendar_code: string; year: number }

/**
 * Row counts of an import.
 *
 * @property rows - Rows in the file.
 * @property valid - Rows that passed validation.
 * @property invalid - Rows that failed.
 * @property created - Records created when applied.
 * @property updated - Records updated when applied.
 * @property skipped - Rows that changed nothing.
 */
export interface HrImportCounts {
  rows: number
  valid: number
  invalid: number
  created: number
  updated: number
  skipped: number
}

/**
 * One validation error. Codes only, never cell values, which can hold personal data.
 *
 * @property row - Row number in the file, starting at 1 after the header.
 * @property column - Column name, or `null` for a whole-row error.
 * @property code - Error code, for example `unknown_employee` or `rest_too_short`.
 */
export interface HrImportError {
  row: number
  column: string | null
  code: string
}

/**
 * One CSV import of roster assignments or holidays (`human-resource-collections.md` 5.9).
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property kind - What it loads.
 * @property target - Roster or calendar it writes to.
 * @property file - Uploaded file; its `sha256` prevents importing the same file twice.
 * @property status - Current status.
 * @property counts - Row counts.
 * @property errors - Validation errors, at most `IMPORT_MAX_ERRORS`.
 * @property uploaded - Upload.
 * @property applied - Application, or `null`.
 * @property failure - Error class name and retry flag when applying failed, or `null`.
 * @property created_by - Who created the record.
 */
export class HrImport extends Timestamp implements Entity {
  id!: string
  tenant_id!: string
  schema_version!: number
  version!: number
  kind!: HrImportKind
  target!: HrImportTarget
  file!: FileRef
  status!: HrImportStatus
  counts!: HrImportCounts
  errors!: HrImportError[]
  uploaded!: ActorStamp
  applied!: ActorStamp | null
  failure!: { error: string; retryable: boolean } | null
  created_by!: ActorRef
}
