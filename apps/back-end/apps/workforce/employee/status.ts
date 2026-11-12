import { type EmploymentStatus } from '@repository/model/employee'
import { todayUtc } from '@utility/validation/local-date'

/**
 * Status changes HR specification 5.4 allows, plus `onboarding` straight to `active` for contract
 * types that do not allow probation (HR plan E15). `separated` is final.
 */
const TRANSITIONS: Readonly<
  Record<EmploymentStatus, readonly EmploymentStatus[]>
> = {
  onboarding: ['probation', 'active', 'separated'],
  probation: ['active', 'separated'],
  active: ['suspended', 'separated'],
  suspended: ['active', 'separated'],
  separated: [],
}

/**
 * Statuses a change to which needs a reason (HR plan E16).
 */
const REASON_REQUIRED: ReadonlySet<EmploymentStatus> = new Set([
  'suspended',
  'separated',
])

/**
 * Tells whether an employee may move from one status to another.
 *
 * @param from - Current status.
 * @param to - Wanted status.
 * @returns True when the change is allowed.
 */
export function canTransition(
  from: EmploymentStatus,
  to: EmploymentStatus,
): boolean {
  return TRANSITIONS[from].includes(to)
}

/**
 * Tells whether a change to a status needs a reason.
 *
 * @param to - Wanted status.
 * @returns True when a reason is required.
 */
export function needsReason(to: EmploymentStatus): boolean {
  return REASON_REQUIRED.has(to)
}

/**
 * The latest date a status change may take effect: tomorrow in UTC, so a change made today in any
 * time zone is accepted (HR plan E16).
 *
 * @param now - The current instant; a parameter so tests control it.
 * @returns The local date.
 */
export function latestEffectiveDate(now: Date = new Date()): string {
  return todayUtc(new Date(now.getTime() + 24 * 60 * 60 * 1000))
}
