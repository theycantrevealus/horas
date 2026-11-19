import { isLocalDate } from '@utility/validation/local-date'
import { type LeaveRequestStatus } from '@repository/model/leave-request'
import { addDays } from '../assignment/assignment-rules'
import { InvalidRequestError } from '../workforce.error'

/**
 * Statuses of a request that still claim their dates: a new request cannot share a date with one
 * (`HR-LEV-002`).
 */
export const OPEN_STATUSES: LeaveRequestStatus[] = [
  'requested',
  'head_approved',
  'approved',
]

/**
 * Longest period a request may span, in calendar days.
 */
const MAX_PERIOD_DAYS = 366

/**
 * The moves a request may make (HR spec 9.4.3). `rejected` and `cancelled` are final.
 */
const TRANSITIONS: Record<LeaveRequestStatus, LeaveRequestStatus[]> = {
  requested: ['head_approved', 'approved', 'rejected', 'cancelled'],
  head_approved: ['approved', 'rejected', 'cancelled'],
  approved: ['cancelled'],
  rejected: [],
  cancelled: [],
}

/**
 * Checks that a request may move from one status to another.
 *
 * @param from - Current status.
 * @param to - New status.
 * @throws InvalidRequestError `invalid_transition`.
 */
export function assertTransition(
  from: LeaveRequestStatus,
  to: LeaveRequestStatus,
): void {
  if (!TRANSITIONS[from].includes(to)) {
    throw new InvalidRequestError(
      'invalid_transition',
      'The request cannot move to that status.',
    )
  }
}

/**
 * Tells whether a request needs the second approval (HR plan 8.3 LR6): a two-step policy always, a
 * one-step policy only above its threshold.
 *
 * @param approval - The approval rule of the policy.
 * @param approval.steps - One or two steps.
 * @param approval.two_step_above_days - Days above which a one-step policy needs two steps, or `null`.
 * @param totalDays - The counted days of the request.
 * @returns True when HR Manager must also approve.
 */
export function needsSecondStep(
  approval: { steps: 'one_step' | 'two_step'; two_step_above_days: number | null },
  totalDays: number,
): boolean {
  return (
    approval.steps === 'two_step' ||
    (approval.two_step_above_days !== null &&
      totalDays > approval.two_step_above_days)
  )
}

/**
 * What the date checks read from the policy.
 *
 * @property noticeDays - Days between the request and the first leave day.
 * @property retroactiveDays - Days after the start the leave may still be requested; 0 for none.
 * @property halfDays - Whether half days may be requested.
 */
export interface DatePolicy {
  noticeDays: number
  retroactiveDays: number
  halfDays: boolean
}

/**
 * The dates of a request and what they are checked against.
 *
 * @property start - First date.
 * @property end - Last date.
 * @property halfDays - A half first or last day.
 * @property policy - The policy's date rules.
 * @property today - Today in the requester's zone.
 */
export interface RequestDatesInput {
  start: string
  end: string
  halfDays: { first: boolean; last: boolean }
  policy: DatePolicy
  today: string
}

/**
 * Checks that a period is made of real dates in order and spans at most 366 calendar days (HR plan
 * 8.3 LR2).
 *
 * @param start - First date.
 * @param end - Last date.
 * @throws InvalidRequestError `invalid_period` or `period_too_long`.
 */
export function checkPeriod(start: string, end: string): void {
  if (!isLocalDate(start) || !isLocalDate(end) || start > end) {
    throw new InvalidRequestError(
      'invalid_period',
      'The period needs real dates, the first not after the last.',
    )
  }
  const span = (Date.parse(end) - Date.parse(start)) / 86_400_000 + 1
  if (span > MAX_PERIOD_DAYS) {
    throw new InvalidRequestError(
      'period_too_long',
      'A request can span at most 366 days.',
    )
  }
}

/**
 * Checks the dates of a request (HR plan 8.3 LR2): real dates in order, at most 366 calendar days,
 * the notice or the after-the-fact limit, and half days only where the policy allows them. The
 * policy's limit per request is checked on the counted days, not here.
 *
 * @param input - The dates and the policy.
 * @throws InvalidRequestError `invalid_period`, `period_too_long`, `notice_too_short`, `too_late`,
 * `half_day_not_allowed` or `invalid_half_days`.
 */
export function checkRequestDates(input: RequestDatesInput): void {
  const { start, end, halfDays, policy, today } = input
  checkPeriod(start, end)
  if (policy.retroactiveDays === 0) {
    if (start < addDays(today, policy.noticeDays)) {
      throw new InvalidRequestError(
        'notice_too_short',
        'The leave must be requested earlier.',
      )
    }
  } else if (start < addDays(today, -policy.retroactiveDays)) {
    throw new InvalidRequestError(
      'too_late',
      'The leave started too long ago to be requested.',
    )
  }
  if ((halfDays.first || halfDays.last) && !policy.halfDays) {
    throw new InvalidRequestError(
      'half_day_not_allowed',
      'This leave type does not allow half days.',
    )
  }
  if (start === end && halfDays.first && halfDays.last) {
    throw new InvalidRequestError(
      'invalid_half_days',
      'A one-day leave cannot be two half days.',
    )
  }
}
