import { addDays } from '../credentialing/appointment-rules'
import { daysOf } from './coverage-check'

/**
 * Finds the places where an employee has no rest day in 7 consecutive days (`HR-ROS-014`). A rest
 * day is a day on which the employee does not work: a day off, or a day with no shift at all. A
 * window of 7 days breaks the rule when the employee works on every one of its days. Windows that
 * overlap are reported once, at the last day of the first of them.
 *
 * @param workDates - The days the employee works, in every roster and unit.
 * @param period - The period of the roster being checked; only windows that end in it count.
 * @param period.start - First day.
 * @param period.end - Last day.
 * @returns The last day of each run of broken windows, in order.
 */
export function findMissingRestDays(
  workDates: ReadonlySet<string>,
  period: { start: string; end: string },
): string[] {
  const broken: string[] = []
  let previousBroken = false
  for (const end of daysOf(period)) {
    let working = 0
    for (let offset = 0; offset < 7; offset += 1) {
      if (workDates.has(addDays(end, -offset))) {
        working += 1
      }
    }
    const isBroken = working === 7
    if (isBroken && !previousBroken) {
      broken.push(end)
    }
    previousBroken = isBroken
  }
  return broken
}
