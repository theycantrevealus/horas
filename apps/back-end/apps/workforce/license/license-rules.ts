import {
  compareLocalDates,
  isLocalDate,
} from '@utility/validation/local-date'
import { type FileRef } from '@repository/model/common/file-ref'

/**
 * Earliest date a licence may use.
 */
const EARLIEST_DATE = '1950-01-01'

/**
 * Years ahead of today that a licence date may reach.
 */
const YEARS_AHEAD = 10

/**
 * Longest document number as printed.
 */
const MAX_DOCUMENT_NUMBER = 64

/**
 * Content types accepted for the scan of a licence (HR plan 3.1 L4).
 */
const DOCUMENT_TYPES: readonly string[] = [
  'application/pdf',
  'image/jpeg',
  'image/png',
]

/**
 * A problem found in the dates of a licence.
 *
 * @property code - Stable error code.
 * @property message - Explanation for the caller.
 */
export interface LicensePeriodProblem {
  code: 'invalid_period' | 'expiry_required'
  message: string
}

/**
 * Cleans a document number as printed: trimmed, 1 to 64 characters.
 *
 * @param raw - Number as sent.
 * @returns The cleaned number, or `null` when it does not fit.
 */
export function cleanDocumentNumber(raw: string): string | null {
  const cleaned = raw.trim()
  return cleaned.length >= 1 && cleaned.length <= MAX_DOCUMENT_NUMBER
    ? cleaned
    : null
}

/**
 * Normalizes a document number for uniqueness: upper case, without spaces, dots and hyphens.
 *
 * @param documentNumber - Number as printed.
 * @returns The normalized number.
 */
export function normalizeDocumentNumber(documentNumber: string): string {
  return documentNumber.toUpperCase().replace(/[\s.-]/g, '')
}

/**
 * Checks the reference to the scan of a licence (HR plan 3.1 L4). The file itself is not checked.
 *
 * @param document - File reference as sent.
 * @returns True when it has a file id, an accepted content type and a SHA-256 hash.
 */
export function isValidDocumentRef(document: FileRef): boolean {
  return (
    document.file_id.length >= 1 &&
    document.file_id.length <= 128 &&
    DOCUMENT_TYPES.includes(document.content_type) &&
    /^[0-9a-f]{64}$/i.test(document.sha256)
  )
}

/**
 * Checks the dates of a licence against each other and against what its type requires (HR plan
 * 3.1 L5).
 *
 * @param issueDate - Issue date as sent.
 * @param expiryDate - Expiry date as sent, or `null`.
 * @param requiresExpiry - Whether the type needs an expiry date.
 * @param now - The current instant; a parameter so tests control it.
 * @returns The problem, or `null` when the dates are valid.
 */
export function checkLicenseDates(
  issueDate: string,
  expiryDate: string | null,
  requiresExpiry: boolean,
  now: Date = new Date(),
): LicensePeriodProblem | null {
  const latest = new Date(now.getTime())
  latest.setUTCFullYear(latest.getUTCFullYear() + YEARS_AHEAD)
  const latestDate = latest.toISOString().slice(0, 10)
  const dates = [issueDate, expiryDate].filter(
    (date): date is string => date !== null,
  )
  if (
    dates.some(
      (date) =>
        !isLocalDate(date) ||
        compareLocalDates(date, EARLIEST_DATE) < 0 ||
        compareLocalDates(date, latestDate) > 0,
    ) ||
    (expiryDate !== null && compareLocalDates(expiryDate, issueDate) < 0)
  ) {
    return {
      code: 'invalid_period',
      message:
        'The dates must be real dates from 1950-01-01 to ten years ahead, and the expiry not before the issue.',
    }
  }
  if (requiresExpiry && expiryDate === null) {
    return {
      code: 'expiry_required',
      message: 'This licence type needs an expiry date.',
    }
  }
  return null
}
