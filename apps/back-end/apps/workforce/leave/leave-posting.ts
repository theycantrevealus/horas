import { type LeaveLedgerRepository } from '@repository/interface/leave-ledger'
import { type Coding } from '@repository/model/common/coding'
import { type LeaveRequest } from '@repository/model/leave-request'
import { planUse } from './balance'
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
