import { isLocalDate } from '@utility/validation/local-date'
import { InvalidRequestError } from '../workforce.error'

/**
 * Longest reason of a separation.
 */
export const MAX_REASON_LENGTH = 1000

/**
 * Longest reason of a cancellation.
 */
export const MAX_CANCEL_REASON_LENGTH = 500

/**
 * Most items of an exit checklist.
 */
export const MAX_CHECKLIST_ITEMS = 50

/**
 * Checks and trims a free-text reason.
 *
 * @param reason - The reason as sent.
 * @param max - Longest allowed length.
 * @returns The trimmed reason.
 * @throws InvalidRequestError `reason_required` or `invalid_reason`.
 */
export function checkReason(reason: unknown, max: number): string {
  const text = typeof reason === 'string' ? reason.trim() : ''
  if (text.length === 0) {
    throw new InvalidRequestError('reason_required', 'A reason is required.')
  }
  if (text.length > max) {
    throw new InvalidRequestError(
      'invalid_reason',
      `The reason must have at most ${max} characters.`,
    )
  }
  return text
}

/**
 * Checks the last working day (HR plan 9 SP1, `HR-SEP-002`): a real date, today or later in the
 * facility's zone, unless the separation is immediate, which may name a date in the past but not
 * one before the employee was hired.
 *
 * @param lastWorkingDay - The date as sent.
 * @param today - Today in the facility's zone.
 * @param immediate - Whether the separation is immediate.
 * @param hiredOn - The employee's original hire date.
 * @throws InvalidRequestError `invalid_last_working_day`.
 */
export function checkLastWorkingDay(
  lastWorkingDay: unknown,
  today: string,
  immediate: boolean,
  hiredOn: string,
): asserts lastWorkingDay is string {
  if (
    typeof lastWorkingDay !== 'string' ||
    !isLocalDate(lastWorkingDay) ||
    (!immediate && lastWorkingDay < today) ||
    lastWorkingDay < hiredOn
  ) {
    throw new InvalidRequestError(
      'invalid_last_working_day',
      'The last working day must be a real date, today or later, and not before the hire date.',
    )
  }
}

/**
 * Checks the date notice was given: a real date, not after the last working day.
 *
 * @param noticeReceivedOn - The date as sent, or `null`.
 * @param lastWorkingDay - The last working day.
 * @throws InvalidRequestError `invalid_notice_date`.
 */
export function checkNoticeDate(
  noticeReceivedOn: unknown,
  lastWorkingDay: string,
): asserts noticeReceivedOn is string | null {
  if (noticeReceivedOn === null) {
    return
  }
  if (
    typeof noticeReceivedOn !== 'string' ||
    !isLocalDate(noticeReceivedOn) ||
    noticeReceivedOn > lastWorkingDay
  ) {
    throw new InvalidRequestError(
      'invalid_notice_date',
      'The notice date must be a real date that is not after the last working day.',
    )
  }
}
