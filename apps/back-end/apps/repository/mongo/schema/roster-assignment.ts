import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, SchemaTypes, Types } from 'mongoose'
import {
  type AssignmentFlag,
  type RosterRole,
} from '@repository/model/roster-assignment'
import { type ShiftType } from '@repository/model/shift-definition'
import { type ActorRef } from '@utility/history/actor'
import { ActorRefSchema } from './common/actor-ref'

/**
 * Hydrated Mongoose document of a roster assignment.
 */
export type RosterAssignmentDocument = HydratedDocument<RosterAssignmentEntity>

/**
 * Storage shape of the snapshot of the shift an assignment was made with.
 *
 * @property definition_id - The shift definition at the time.
 * @property code - Shift code at the time.
 * @property type - Shift type at the time.
 * @property start_time - Local start `HH:mm`, or `null` for a day off.
 * @property end_time - Local end `HH:mm`, or `null` for a day off.
 * @property paid_minutes - Working time counted.
 * @property is_night - Counts toward the consecutive-night limit.
 */
@Schema({ _id: false })
export class AssignedShiftEntity {
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  definition_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.String, required: true })
  code!: string

  @Prop({
    type: SchemaTypes.String,
    enum: ['regular', 'on_call_onsite', 'on_call_remote', 'off'],
    required: true,
  })
  type!: ShiftType

  @Prop({ type: SchemaTypes.String, default: null })
  start_time!: string | null

  @Prop({ type: SchemaTypes.String, default: null })
  end_time!: string | null

  @Prop({ type: SchemaTypes.Number, required: true })
  paid_minutes!: number

  @Prop({ type: SchemaTypes.Boolean, required: true })
  is_night!: boolean
}

/**
 * Mongoose schema of the shift snapshot.
 */
export const AssignedShiftSchema = SchemaFactory.createForClass(AssignedShiftEntity)

/**
 * Storage shape of where an assignment came from.
 *
 * @property kind - Roster screen, import, swap or change request.
 * @property ref_id - The import, swap or request, or `null`.
 */
@Schema({ _id: false })
export class AssignmentSourceEntity {
  @Prop({
    type: SchemaTypes.String,
    enum: ['roster', 'import', 'swap', 'change_request', 'leave_cover'],
    required: true,
  })
  kind!: 'roster' | 'import' | 'swap' | 'change_request' | 'leave_cover'

  @Prop({ type: SchemaTypes.ObjectId, default: null })
  ref_id!: Types.ObjectId | null
}

/**
 * Mongoose schema of the assignment source.
 */
export const AssignmentSourceSchema = SchemaFactory.createForClass(
  AssignmentSourceEntity,
)

/**
 * Storage shape of what cancelled an assignment.
 *
 * @property kind - What cancelled it.
 * @property ref_id - The leave request.
 */
@Schema({ _id: false })
export class AssignmentCancellationEntity {
  @Prop({ type: SchemaTypes.String, enum: ['leave'], required: true })
  kind!: 'leave'

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  ref_id!: Types.ObjectId
}

/**
 * Mongoose schema of the assignment cancellation.
 */
export const AssignmentCancellationSchema = SchemaFactory.createForClass(
  AssignmentCancellationEntity,
)

/**
 * Storage shape of the consent given for overtime.
 *
 * @property at - When consent was given.
 * @property document - File reference of the consent document, or `null`.
 */
@Schema({ _id: false })
export class OvertimeConsentEntity {
  @Prop({ type: SchemaTypes.Date, required: true })
  at!: Date

  @Prop({ type: SchemaTypes.Mixed, default: null })
  document!: { file_id: string; content_type: string; sha256: string } | null
}

/**
 * Mongoose schema of the overtime consent.
 */
export const OvertimeConsentSchema = SchemaFactory.createForClass(
  OvertimeConsentEntity,
)

/**
 * Storage shape of the overtime an assignment adds to its week.
 *
 * @property minutes - Overtime minutes this assignment adds.
 * @property consent - Consent of the employee, or `null`.
 */
@Schema({ _id: false })
export class AssignmentOvertimeEntity {
  @Prop({ type: SchemaTypes.Number, required: true })
  minutes!: number

  @Prop({ type: OvertimeConsentSchema, default: null })
  consent!: OvertimeConsentEntity | null
}

/**
 * Mongoose schema of the assignment overtime.
 */
export const AssignmentOvertimeSchema = SchemaFactory.createForClass(
  AssignmentOvertimeEntity,
)

/**
 * Storage shape of the flag set when an employee stops being eligible (filled by a later group).
 *
 * @property reason - Why it is flagged.
 * @property failed - The condition that failed.
 * @property at - When it was flagged.
 * @property resolved_at - When it was resolved, or `null`.
 */
@Schema({ _id: false })
export class AssignmentFlagEntity {
  @Prop({ type: SchemaTypes.String, enum: ['eligibility_lost'], required: true })
  reason!: AssignmentFlag['reason']

  @Prop({
    type: SchemaTypes.String,
    enum: ['employment', 'str', 'sip', 'spk', 'leave', 'suspension'],
    required: true,
  })
  failed!: AssignmentFlag['failed']

  @Prop({ type: SchemaTypes.Date, required: true })
  at!: Date

  @Prop({ type: SchemaTypes.Date, default: null })
  resolved_at!: Date | null
}

/**
 * Mongoose schema of the assignment flag.
 */
export const AssignmentFlagSchema = SchemaFactory.createForClass(AssignmentFlagEntity)

/**
 * Mongo storage shape of a `RosterAssignment`, in the collection `roster_assignments`. Only the
 * Mongo repository uses it.
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property roster_id - The roster.
 * @property unit_id - The unit of the roster.
 * @property facility_id - The facility of the roster.
 * @property employee_id - The employee.
 * @property date - Local date the shift starts.
 * @property shift - Snapshot of the shift.
 * @property starts_at - UTC instant the shift starts, or `null` for a day off.
 * @property ends_at - UTC instant the shift ends, or `null` for a day off.
 * @property role - Role in the shift.
 * @property status - `planned` or `cancelled`.
 * @property source - Where it came from.
 * @property cancellation - What cancelled it, or `null`.
 * @property change_reason - Why it was last changed after publication, or `null`.
 * @property revision - Roster revision that created or last changed it.
 * @property overtime - Overtime it adds, or `null`.
 * @property flag - Eligibility flag, or `null`.
 * @property is_flagged - True while the flag is unresolved.
 * @property created_by - Who created the record.
 */
@Schema({
  collection: 'roster_assignments',
  versionKey: 'version',
  optimisticConcurrency: true,
})
export class RosterAssignmentEntity {
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  tenant_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.Number, required: true })
  schema_version!: number

  version!: number

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  roster_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  unit_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  facility_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  employee_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.String, required: true })
  date!: string

  @Prop({ type: AssignedShiftSchema, required: true })
  shift!: AssignedShiftEntity

  @Prop({ type: SchemaTypes.Date, default: null })
  starts_at!: Date | null

  @Prop({ type: SchemaTypes.Date, default: null })
  ends_at!: Date | null

  @Prop({
    type: SchemaTypes.String,
    enum: ['staff', 'team_leader', 'supervisor', 'dpjp_on_call'],
    required: true,
  })
  role!: RosterRole

  @Prop({ type: SchemaTypes.String, enum: ['planned', 'cancelled'], required: true })
  status!: 'planned' | 'cancelled'

  @Prop({ type: AssignmentSourceSchema, required: true })
  source!: AssignmentSourceEntity

  @Prop({ type: AssignmentCancellationSchema, default: null })
  cancellation!: AssignmentCancellationEntity | null

  @Prop({ type: SchemaTypes.String, default: null })
  change_reason!: string | null

  @Prop({ type: SchemaTypes.Number, required: true })
  revision!: number

  @Prop({ type: AssignmentOvertimeSchema, default: null })
  overtime!: AssignmentOvertimeEntity | null

  @Prop({ type: AssignmentFlagSchema, default: null })
  flag!: AssignmentFlagEntity | null

  @Prop({ type: SchemaTypes.Boolean, default: false })
  is_flagged!: boolean

  @Prop({ type: ActorRefSchema, required: true })
  created_by!: ActorRef

  @Prop({ type: SchemaTypes.Date, default: () => new Date() })
  created_at?: Date

  @Prop({ type: SchemaTypes.Date, default: () => new Date() })
  updated_at?: Date

  @Prop({ type: SchemaTypes.Date, default: null })
  deleted_at?: Date | null
}

/**
 * Mongoose schema of the roster assignment.
 */
export const RosterAssignmentSchema = SchemaFactory.createForClass(
  RosterAssignmentEntity,
)

// Overlap, rest, weekly hours and night-run checks across all units (HR-ROS-010 to 016).
RosterAssignmentSchema.index({ tenant_id: 1, employee_id: 1, starts_at: 1 })
// The same checks by local date, which day-off shifts (no instants) need.
RosterAssignmentSchema.index({ tenant_id: 1, employee_id: 1, date: 1 })
// The roster screen.
RosterAssignmentSchema.index({ tenant_id: 1, roster_id: 1, date: 1 })
// Who is on duty in a unit now (HR spec 13).
RosterAssignmentSchema.index({
  tenant_id: 1,
  unit_id: 1,
  status: 1,
  starts_at: 1,
  ends_at: 1,
})
// Unresolved flags (HR-ROS-031).
RosterAssignmentSchema.index(
  { tenant_id: 1, unit_id: 1, is_flagged: 1 },
  { partialFilterExpression: { is_flagged: true } },
)
