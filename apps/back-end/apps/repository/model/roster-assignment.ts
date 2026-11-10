import { type Entity } from '@utility/database/interface'
import { type ActorRef } from '@utility/history/actor'
import { type FileRef } from './common/file-ref'
import { type LocalDate, type LocalTime } from './common/calendar'
import { type ShiftType } from './shift-definition'
import { Timestamp } from './timestamp'

/**
 * Role of a person in a shift (HR spec 8.2).
 */
export type RosterRole = 'staff' | 'team_leader' | 'supervisor' | 'dpjp_on_call'

/**
 * Copy of the shift definition at the time of assignment, so later edits do not rewrite the past.
 *
 * @property definition_id - The shift definition.
 * @property code - Shift code.
 * @property type - Shift type.
 * @property start_time - Local start, or `null`.
 * @property end_time - Local end, or `null`.
 * @property paid_minutes - Working time counted.
 * @property is_night - Night shift.
 */
export interface AssignedShift {
  definition_id: string
  code: string
  type: ShiftType
  start_time: LocalTime | null
  end_time: LocalTime | null
  paid_minutes: number
  is_night: boolean
}

/**
 * How an assignment came to exist.
 *
 * @property kind - Roster entry, CSV import, swap, or change after publication.
 * @property ref_id - Import or swap request, or `null`.
 */
export interface AssignmentSource {
  kind: 'roster' | 'import' | 'swap' | 'change_request'
  ref_id: string | null
}

/**
 * Overtime in an assignment (`HR-ROS-013`).
 *
 * @property minutes - Overtime minutes.
 * @property consent - The employee's documented consent, or `null` while missing.
 */
export interface AssignmentOvertime {
  minutes: number
  consent: { at: Date; document: FileRef | null } | null
}

/**
 * Warning that an assignment is no longer valid; flagged, not cancelled (`HR-ROS-031`).
 *
 * @property reason - Why it was flagged.
 * @property failed - Failing condition (`HR-ELG-002`).
 * @property at - When flagged.
 * @property resolved_at - When resolved, or `null`.
 */
export interface AssignmentFlag {
  reason: 'eligibility_lost'
  failed: 'employment' | 'str' | 'sip' | 'spk' | 'leave' | 'suspension'
  at: Date
  resolved_at: Date | null
}

/**
 * One person, one shift, one date in a roster (`human-resource-collections.md` 5.5). Any
 * employment type can be assigned, including `mitra` (decision C5).
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property roster_id - The roster.
 * @property unit_id - Unit of the roster.
 * @property facility_id - Facility of the unit.
 * @property employee_id - The person.
 * @property date - Local date the shift starts.
 * @property shift - Copy of the shift definition.
 * @property starts_at - UTC start, computed with the facility time zone; `null` for `off`.
 * @property ends_at - UTC end; `null` for `off`.
 * @property role - Role in the shift.
 * @property status - Planned or cancelled; whether it was worked belongs to attendance.
 * @property source - How it was created.
 * @property change_reason - Required for changes after publication, otherwise `null`.
 * @property revision - Roster revision that created or last changed it.
 * @property overtime - Overtime, or `null`.
 * @property flag - Open warning, or `null`.
 * @property is_flagged - True while `flag` is unresolved; exists for a partial index.
 * @property created_by - Who created the record.
 */
export class RosterAssignment extends Timestamp implements Entity {
  id!: string
  tenant_id!: string
  schema_version!: number
  version!: number
  roster_id!: string
  unit_id!: string
  facility_id!: string
  employee_id!: string
  date!: LocalDate
  shift!: AssignedShift
  starts_at!: Date | null
  ends_at!: Date | null
  role!: RosterRole
  status!: 'planned' | 'cancelled'
  source!: AssignmentSource
  change_reason!: string | null
  revision!: number
  overtime!: AssignmentOvertime | null
  flag!: AssignmentFlag | null
  is_flagged!: boolean
  created_by!: ActorRef
}
