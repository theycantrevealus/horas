import { type LeaveLedgerEntry } from '@repository/model/leave-ledger-entry'

/**
 * The balance of one employee, leave type and entitlement period, summed from the ledger.
 *
 * @property granted - Days granted for the period.
 * @property used - Days used, net of reversals.
 * @property carriedOver - Days carried in from the previous period.
 * @property carriedOverExpiresOn - Last day the carried-over days can be used, or `null`.
 * @property expired - Days that lapsed.
 * @property adjusted - Net days added or removed by HR.
 * @property pending - Days of requests waiting for a decision.
 * @property available - Days left that a new request may use: what is left minus `pending`.
 * @property carryOverLeft - Carried-over days still left.
 * @property ownLeft - Days of the period itself still left.
 */
export interface LeaveBalanceSummary {
  granted: number
  used: number
  carriedOver: number
  carriedOverExpiresOn: string | null
  expired: number
  adjusted: number
  pending: number
  available: number
  carryOverLeft: number
  ownLeft: number
}

/**
 * The fields of a ledger entry that a balance reads.
 */
export type BalanceEntry = Pick<
  LeaveLedgerEntry,
  'kind' | 'days' | 'bucket' | 'expires_on'
>

/**
 * Turns days into whole half-days, so sums of 0.5 steps stay exact.
 *
 * @param days - Days in steps of 0.5.
 * @returns The same amount in half-days.
 */
function toHalves(days: number): number {
  return Math.round(days * 2)
}

/**
 * Sums the entries of one period into a balance (HR plan 8.2 LB6). The sums are done in half-days.
 *
 * @param entries - The ledger entries of one employee, leave type and period.
 * @param pendingDays - Days of the employee's requests of that type and period that wait for a
 * decision.
 * @returns The balance.
 */
export function summarizeBalance(
  entries: BalanceEntry[],
  pendingDays: number,
): LeaveBalanceSummary {
  const sum = (predicate: (entry: BalanceEntry) => boolean): number =>
    entries
      .filter(predicate)
      .reduce((total, entry) => total + toHalves(entry.days), 0)
  const ofKind = (kind: BalanceEntry['kind']): number =>
    sum((entry) => entry.kind === kind)
  const ownLeft = sum((entry) => entry.bucket === 'own')
  const carryOverLeft = sum((entry) => entry.bucket === 'carry_over')
  const expiries = entries
    .filter((entry) => entry.kind === 'carry_over' && entry.expires_on !== null)
    .map((entry) => entry.expires_on as string)
    .sort()
  return {
    granted: ofKind('grant') / 2,
    // `0 - x` rather than `-x`, so an empty sum is 0 and not -0.
    used: (0 - (ofKind('use') + ofKind('reversal'))) / 2,
    carriedOver: ofKind('carry_over') / 2,
    carriedOverExpiresOn: expiries.at(-1) ?? null,
    expired: (0 - ofKind('expiry')) / 2,
    adjusted: ofKind('adjustment') / 2,
    pending: pendingDays,
    available: (ownLeft + carryOverLeft - toHalves(pendingDays)) / 2,
    carryOverLeft: carryOverLeft / 2,
    ownLeft: ownLeft / 2,
  }
}

/**
 * Splits a use across the two buckets: carried-over days go first, then the days of the period (HR
 * plan 8.2 LB6). The amounts are positive; the caller posts them as negative `use` entries.
 *
 * @param summary - The balance before the use.
 * @param days - Days to use, in steps of 0.5.
 * @returns One or two parts, each with its bucket and days.
 */
export function planUse(
  summary: Pick<LeaveBalanceSummary, 'carryOverLeft'>,
  days: number,
): { bucket: 'own' | 'carry_over'; days: number }[] {
  const fromCarry = Math.min(toHalves(days), Math.max(toHalves(summary.carryOverLeft), 0)) / 2
  const fromOwn = (toHalves(days) - toHalves(fromCarry)) / 2
  return [
    ...(fromCarry > 0 ? [{ bucket: 'carry_over' as const, days: fromCarry }] : []),
    ...(fromOwn > 0 ? [{ bucket: 'own' as const, days: fromOwn }] : []),
  ]
}
