import { type Coding } from '@repository/model/common/coding'
import { type LeaveLedgerEntry } from '@repository/model/leave-ledger-entry'
import { type ClosedDatePeriod } from '@repository/model/common/calendar'

/**
 * Days a request still holds in one bucket of one entitlement period.
 *
 * @property leave_type - The leave type of the entries.
 * @property period - The entitlement period of the entries.
 * @property bucket - Own days or carried-over days.
 * @property days - Days still used, positive.
 */
export interface HeldDays {
  leave_type: Coding
  period: ClosedDatePeriod
  bucket: 'own' | 'carry_over'
  days: number
}

/**
 * Works out what a request still uses: its `use` entries less its `reversal` entries, per leave
 * type, period and bucket. A request that was approved, changed to another type and approved again
 * holds days only under the last type. Sums are done in half-days, so 0.5 steps stay exact.
 *
 * @param entries - The ledger entries the request posted.
 * @returns The days still used, one item per bucket with something left; none when everything was
 * reversed.
 */
export function heldDays(entries: LeaveLedgerEntry[]): HeldDays[] {
  const held = new Map<string, HeldDays & { halves: number }>()
  for (const entry of entries) {
    if (entry.kind !== 'use' && entry.kind !== 'reversal') {
      continue
    }
    const key = `${entry.leave_type.system}|${entry.leave_type.code}|${entry.period.start}|${entry.bucket}`
    const current = held.get(key) ?? {
      leave_type: { system: entry.leave_type.system, code: entry.leave_type.code },
      period: { start: entry.period.start, end: entry.period.end },
      bucket: entry.bucket,
      days: 0,
      halves: 0,
    }
    // A `use` is negative and a `reversal` positive, so the sum is minus what is still used.
    current.halves -= Math.round(entry.days * 2)
    held.set(key, current)
  }
  return [...held.values()]
    .filter((item) => item.halves > 0)
    .map(({ halves, ...item }) => ({ ...item, days: halves / 2 }))
}
