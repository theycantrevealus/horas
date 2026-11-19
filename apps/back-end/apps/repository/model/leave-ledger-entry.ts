import { type Entity } from '@utility/database/interface'
import { type ActorRef } from '@utility/history/actor'
import { type ClosedDatePeriod, type LocalDate } from './common/calendar'
import { type Coding } from './common/coding'
import { Timestamp } from './timestamp'

/**
 * What a ledger entry does to a balance (`human-resource-management.md` 9.4.2).
 */
export type LeaveLedgerKind =
  | 'grant'
  | 'use'
  | 'reversal'
  | 'adjustment'
  | 'carry_over'
  | 'expiry'

/**
 * One line of an employee's leave balance (`human-resource-collections.md` 9.5). A ledger entry is
 * only created, never edited or deleted; the balance is the sum of the entries of a period.
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property employee_id - The employee the days belong to.
 * @property leave_type - The leave type.
 * @property period - The entitlement period the entry belongs to.
 * @property kind - What the entry does.
 * @property days - Signed, in steps of 0.5: positive for `grant`, `carry_over`, `reversal` and a
 * positive `adjustment`; negative for `use`, `expiry` and a negative `adjustment`.
 * @property bucket - Which days a `use`, `reversal` or `expiry` touches: carried-over days are used
 * first.
 * @property expires_on - For `carry_over`: the last day the carried days can be used.
 * @property source - What posted the entry: a request, a job, an HR adjustment or a collective leave
 * day (with its date).
 * @property dedupe_key - Makes the jobs idempotent; `null` for request and adjustment entries.
 * @property created_by - Who created the record.
 */
export class LeaveLedgerEntry extends Timestamp implements Entity {
  id!: string
  tenant_id!: string
  schema_version!: number
  version!: number
  employee_id!: string
  leave_type!: Coding
  period!: ClosedDatePeriod
  kind!: LeaveLedgerKind
  days!: number
  bucket!: 'own' | 'carry_over'
  expires_on!: LocalDate | null
  source!: {
    kind: 'request' | 'job' | 'adjustment' | 'collective_leave'
    ref_id: string | null
    date: LocalDate | null
  }
  dedupe_key!: string | null
  created_by!: ActorRef
}
