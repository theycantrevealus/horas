import { type Entity } from '@utility/database/interface'
import { type ActorRef } from '@utility/history/actor'
import { type DatePeriod } from './common/calendar'
import { type Coding } from './common/coding'
import { type DecisionRef } from './common/decision'
import { Timestamp } from './timestamp'

/**
 * Seat on a credentialing committee of one facility: Komite Medik, its subcommittees,
 * Komite Keperawatan, Mitra Bestari (`human-resource-collections.md` 4.1).
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property employee_id - The member.
 * @property facility_id - Facility whose committee it is.
 * @property committee - The committee, for example `id.committee|komite_medik`.
 * @property role - Chair, secretary, member or mitra bestari.
 * @property period - Term of office.
 * @property decision_ref - Appointment letter, or `null`.
 * @property status - Whether the seat is held.
 * @property created_by - Who created the record.
 */
export class CommitteeMembership extends Timestamp implements Entity {
  id!: string
  tenant_id!: string
  schema_version!: number
  version!: number
  employee_id!: string
  facility_id!: string
  committee!: Coding
  role!: Coding
  period!: DatePeriod
  decision_ref!: DecisionRef | null
  status!: 'active' | 'ended'
  created_by!: ActorRef
}
