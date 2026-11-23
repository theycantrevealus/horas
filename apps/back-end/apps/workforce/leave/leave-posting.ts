import { type LeaveLedgerRepository } from '@repository/interface/leave-ledger'
import { type Coding } from '@repository/model/common/coding'
import { type LeaveDay, type LeaveRequest } from '@repository/model/leave-request'
import { planUse } from './balance'
import { totalOf } from './day-count'
import { type LeaveBalanceService } from './leave-balance.service'
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

/**
 * Posts the `use` entries of an approved request, carried-over days first (HR plan 8.2 LB6). A
 * request without a yearly entitlement posts nothing.
 *
 * @param ledger - Leave ledger repository.
 * @param balances - Leave balances, for the carried-over days left.
 * @param tenantId - Tenant of the caller.
 * @param request - The request, with the leave type, period and rules to post under.
 */
export async function postUses(
  ledger: LeaveLedgerRepository,
  balances: LeaveBalanceService,
  tenantId: string,
  request: LeaveRequest,
): Promise<void> {
  if (request.rules.balance_kind !== 'period' || !request.entitlement_period) {
    return
  }
  const period = request.entitlement_period
  const summary = await balances.summary(
    tenantId,
    request.employee_id,
    request.leave_type,
    period.start,
    request.id,
  )
  for (const part of planUse(summary, request.total_days)) {
    await ledger.append({
      tenant_id: tenantId,
      employee_id: request.employee_id,
      leave_type: {
        system: request.leave_type.system,
        code: request.leave_type.code,
      },
      period: { start: period.start, end: period.end },
      kind: 'use',
      days: 0 - part.days,
      bucket: part.bucket,
      expires_on: null,
      source: { kind: 'request', ref_id: request.id, date: null },
      dedupe_key: null,
    })
  }
}

/**
 * Reverses what a request still uses, bucket by bucket, under whatever leave type it was posted.
 *
 * @param ledger - Leave ledger repository.
 * @param tenantId - Tenant of the caller.
 * @param request - The request.
 */
export async function reverseUses(
  ledger: LeaveLedgerRepository,
  tenantId: string,
  request: LeaveRequest,
): Promise<void> {
  const entries = await ledger.findByRequest(tenantId, request.id)
  for (const held of heldDays(entries)) {
    await ledger.append({
      tenant_id: tenantId,
      employee_id: request.employee_id,
      leave_type: held.leave_type,
      period: held.period,
      kind: 'reversal',
      days: held.days,
      bucket: held.bucket,
      expires_on: null,
      source: { kind: 'request', ref_id: request.id, date: null },
      dedupe_key: null,
    })
  }
}

/**
 * Cuts the day breakdown of a leave after a date: the days after it are removed and the total is
 * recounted. Used when a leave is ended early and when a separation ends it on the last working day.
 *
 * @param request - The request.
 * @param lastDate - The last day that is kept.
 * @returns The kept days, their total and the days no longer taken.
 */
export function cutLeaveAfter(
  request: Pick<LeaveRequest, 'days' | 'total_days'>,
  lastDate: string,
): { days: LeaveDay[]; total: number; removed: number } {
  const days = request.days.filter((day) => day.date <= lastDate)
  const total = totalOf(days)
  return { days, total, removed: request.total_days - total }
}

/**
 * Gives days back to the ledger, own days first and then carried-over days. A request without a
 * yearly entitlement posted nothing, so nothing is reversed.
 *
 * @param ledger - Leave ledger repository.
 * @param tenantId - Tenant of the caller.
 * @param request - The request whose entries are reversed.
 * @param removed - The days no longer taken.
 */
export async function reverseDays(
  ledger: LeaveLedgerRepository,
  tenantId: string,
  request: Pick<LeaveRequest, 'id' | 'employee_id'>,
  removed: number,
): Promise<void> {
  if (removed <= 0) {
    return
  }
  const held = heldDays(await ledger.findByRequest(tenantId, request.id))
  let left = Math.round(removed * 2)
  for (const bucket of ['own', 'carry_over'] as const) {
    for (const item of held.filter((entry) => entry.bucket === bucket)) {
      const give = Math.min(left, Math.round(item.days * 2))
      if (give <= 0) {
        continue
      }
      left -= give
      await ledger.append({
        tenant_id: tenantId,
        employee_id: request.employee_id,
        leave_type: item.leave_type,
        period: item.period,
        kind: 'reversal',
        days: give / 2,
        bucket: item.bucket,
        expires_on: null,
        source: { kind: 'request', ref_id: request.id, date: null },
        dedupe_key: null,
      })
    }
  }
}

