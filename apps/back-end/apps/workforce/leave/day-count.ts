import { type LocalDate } from '@repository/model/common/calendar'
import { type LeaveDay } from '@repository/model/leave-request'
import { addDays } from '../assignment/assignment-rules'

/**
 * What the count of leave days reads.
 *
 * @property counting - `working_days` (HR spec 9.4.6) or `calendar_days`.
 * @property start - First date of the leave.
 * @property end - Last date of the leave.
 * @property halfDays - A half first or last day.
 * @property rosterDays - For the dates a draft or published roster of the requester's unit covers:
 * true when the requester has a planned working shift that date, false when not. Dates no roster
 * covers are not in the map.
 * @property workingWeek - ISO weekdays (1 Monday to 7 Sunday) that count when no roster decides.
 * @property holidays - The facility's holidays by date: `public` and `local` are `holiday`,
 * `collective_leave` is itself.
 */
export interface CountDaysInput {
  counting: 'working_days' | 'calendar_days'
  start: LocalDate
  end: LocalDate
  halfDays: { first: boolean; last: boolean }
  rosterDays: Map<string, boolean>
  workingWeek: number[]
  holidays: Map<string, 'public' | 'local' | 'collective_leave'>
}

/**
 * Gives the ISO weekday of a local date.
 *
 * @param date - A valid `YYYY-MM-DD` date.
 * @returns 1 for Monday to 7 for Sunday.
 */
function isoWeekday(date: LocalDate): number {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay()
  return day === 0 ? 7 : day
}

/**
 * Counts the days of a leave (HR spec 9.4.6). For `calendar_days` every date counts. For
 * `working_days` a roster that covers a date decides it (a planned working shift counts, a day off
 * does not); a date no roster covers counts when it is a day of the working week and not a holiday
 * or a collective leave day. A half first or last day counts 0.5 on a date that counts. The Head of
 * Unit may later change a count (`set_by: 'head'`).
 *
 * @param input - The leave and what decides its days.
 * @returns One entry per date, oldest first.
 */
export function countDays(input: CountDaysInput): LeaveDay[] {
  const days: LeaveDay[] = []
  for (
    let date = input.start;
    date <= input.end;
    date = addDays(date, 1)
  ) {
    days.push(countDay(input, date))
  }
  return days
}

/**
 * Counts one date.
 *
 * @param input - The leave and what decides its days.
 * @param date - The date.
 * @returns The date with its count.
 */
function countDay(input: CountDaysInput, date: LocalDate): LeaveDay {
  let day: LeaveDay
  if (input.counting === 'calendar_days') {
    day = { date, count: 1, why: 'calendar_day', set_by: 'policy' }
  } else if (input.rosterDays.has(date)) {
    day = input.rosterDays.get(date)
      ? { date, count: 1, why: 'working', set_by: 'roster' }
      : { date, count: 0, why: 'rest_day', set_by: 'roster' }
  } else {
    const holiday = input.holidays.get(date)
    if (holiday) {
      day = {
        date,
        count: 0,
        why: holiday === 'collective_leave' ? 'collective_leave' : 'holiday',
        set_by: 'working_week',
      }
    } else if (input.workingWeek.includes(isoWeekday(date))) {
      day = { date, count: 1, why: 'working', set_by: 'working_week' }
    } else {
      day = { date, count: 0, why: 'rest_day', set_by: 'working_week' }
    }
  }
  const half =
    (date === input.start && input.halfDays.first) ||
    (date === input.end && input.halfDays.last)
  return half && day.count === 1 ? { ...day, count: 0.5 } : day
}

/**
 * Sums the counts of a leave in exact half days.
 *
 * @param days - The days.
 * @returns The total.
 */
export function totalOf(days: Pick<LeaveDay, 'count'>[]): number {
  return days.reduce((total, day) => total + Math.round(day.count * 2), 0) / 2
}
