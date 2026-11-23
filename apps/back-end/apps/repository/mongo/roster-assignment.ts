import { Inject, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import {
  DEFAULT_PAGE_SIZE,
  MONGO_MAIN_CONNECTION,
} from '@utility/database/constant'
import { RepositoryValidationError } from '@utility/database/error'
import { type NewEntity } from '@utility/database/interface'
import { translateMongoError } from '@utility/database/mongo.error'
import { toObjectId } from '@utility/database/mongo.query'
import {
  TRANSACTION_MANAGER,
  type TransactionManager,
} from '@utility/database/transaction'
import { withChangeReason } from '@utility/history/reason'
import { CHANGE_RECORDER, type ChangeRecorder } from '@utility/history/recorder'
import {
  type AssignmentQuery,
  type RosterAssignmentRepository,
} from '@repository/interface/roster-assignment'
import { RosterAssignment } from '@repository/model/roster-assignment'
import { RosterAssignmentClassification } from '@repository/model/roster-assignment.classification'
import {
  CURRENT_SCHEMA_VERSION,
  LeanRecord,
  MANAGED_FIELDS,
  MongoRepositoryBase,
} from './base'
import { RosterAssignmentEntity } from './schema/roster-assignment'

/**
 * Mongo implementation of `RosterAssignmentRepository`. Assignments are never deleted. The roster,
 * unit, facility, employee and date are fixed after creation; the shift, instants, role, status,
 * reason, revision, overtime and flag can change.
 */
@Injectable()
export class RosterAssignmentRepositoryMongo
  extends MongoRepositoryBase<RosterAssignment, RosterAssignmentEntity>
  implements RosterAssignmentRepository
{
  /**
   * @param assignmentModel - Mongoose model of the `roster_assignments` collection.
   * @param transactions - Transaction manager of the main connection.
   * @param changes - Records every write in the change history.
   */
  constructor(
    @InjectModel(RosterAssignmentEntity.name, MONGO_MAIN_CONNECTION)
    assignmentModel: Model<RosterAssignmentEntity>,
    @Inject(TRANSACTION_MANAGER) transactions: TransactionManager,
    @Inject(CHANGE_RECORDER) changes: ChangeRecorder,
  ) {
    super(assignmentModel, transactions, changes, {
      name: 'RosterAssignmentRepository',
      entityType: 'roster_assignment',
      classification: RosterAssignmentClassification,
      allowUpdate: true,
      allowDelete: false,
      allowSoftDelete: false,
      updatableFields: [
        'shift',
        'starts_at',
        'ends_at',
        'role',
        'status',
        'change_reason',
        'cancellation',
        'revision',
        'overtime',
        'flag',
        'is_flagged',
      ],
    })
  }

  /**
   * Finds the assignments of a roster, ordered by date, then by employee.
   *
   * @param tenantId - Tenant to search in.
   * @param rosterId - The roster.
   * @param query - Optional filters and paging.
   * @returns The assignments.
   */
  async findByRoster(
    tenantId: string,
    rosterId: string,
    query: AssignmentQuery = {},
  ): Promise<RosterAssignment[]> {
    const operation = 'RosterAssignmentRepository.findByRoster'
    if (
      !toObjectId(tenantId) ||
      !toObjectId(rosterId) ||
      (query.employeeId !== undefined && !toObjectId(query.employeeId))
    ) {
      return []
    }
    try {
      const records = await this.model
        .find(
          this.toFilter({
            tenant_id: tenantId,
            roster_id: rosterId,
            deleted_at: null,
            ...(query.employeeId ? { employee_id: query.employeeId } : {}),
            ...(query.status ? { status: query.status } : {}),
            ...(query.date ? { date: query.date } : {}),
            ...(query.from || query.to
              ? {
                  date: {
                    ...(query.from ? { $gte: query.from } : {}),
                    ...(query.to ? { $lte: query.to } : {}),
                  },
                }
              : {}),
          }),
        )
        .sort({ date: 1, employee_id: 1 })
        .skip(query.offset ?? 0)
        .limit(query.limit ?? DEFAULT_PAGE_SIZE)
        .lean<LeanRecord<RosterAssignmentEntity>[]>()
        .exec()
      return records.map((record) => this.toModel(record))
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Finds the planned assignments of an employee on dates in a range, in every roster and unit.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - The employee.
   * @param from - First date of the range.
   * @param to - Last date of the range.
   * @returns The planned assignments.
   */
  async findPlannedByEmployeeBetween(
    tenantId: string,
    employeeId: string,
    from: string,
    to: string,
  ): Promise<RosterAssignment[]> {
    const operation = 'RosterAssignmentRepository.findPlannedByEmployeeBetween'
    if (!toObjectId(tenantId) || !toObjectId(employeeId)) {
      return []
    }
    try {
      const records = await this.model
        .find(
          this.toFilter({
            tenant_id: tenantId,
            employee_id: employeeId,
            status: 'planned',
            date: { $gte: from, $lte: to },
            deleted_at: null,
          }),
        )
        .lean<LeanRecord<RosterAssignmentEntity>[]>()
        .exec()
      return records.map((record) => this.toModel(record))
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Finds the planned assignment of an employee on a date in a roster.
   *
   * @param tenantId - Tenant to search in.
   * @param rosterId - The roster.
   * @param employeeId - The employee.
   * @param date - The date.
   * @returns The assignment, or `null`.
   */
  async findPlannedByEmployeeAndDate(
    tenantId: string,
    rosterId: string,
    employeeId: string,
    date: string,
  ): Promise<RosterAssignment | null> {
    const operation = 'RosterAssignmentRepository.findPlannedByEmployeeAndDate'
    if (
      !toObjectId(tenantId) ||
      !toObjectId(rosterId) ||
      !toObjectId(employeeId)
    ) {
      return null
    }
    try {
      const record = await this.model
        .findOne(
          this.toFilter({
            tenant_id: tenantId,
            roster_id: rosterId,
            employee_id: employeeId,
            date,
            status: 'planned',
            deleted_at: null,
          }),
        )
        .lean<LeanRecord<RosterAssignmentEntity>>()
        .exec()
      return record ? this.toModel(record) : null
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Finds the planned assignments of a unit that are on duty at an instant.
   *
   * @param tenantId - Tenant to search in.
   * @param unitId - The unit.
   * @param at - The instant.
   * @returns The assignments on duty.
   */
  async findOnDuty(
    tenantId: string,
    unitId: string,
    at: Date,
  ): Promise<RosterAssignment[]> {
    const operation = 'RosterAssignmentRepository.findOnDuty'
    if (!toObjectId(tenantId) || !toObjectId(unitId)) {
      return []
    }
    try {
      const records = await this.model
        .find(
          this.toFilter({
            tenant_id: tenantId,
            unit_id: unitId,
            status: 'planned',
            is_flagged: false,
            starts_at: { $lte: at },
            ends_at: { $gt: at },
            deleted_at: null,
          }),
        )
        .sort({ starts_at: 1, employee_id: 1 })
        .lean<LeanRecord<RosterAssignmentEntity>[]>()
        .exec()
      return records.map((record) => this.toModel(record))
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Finds planned assignments of a shift in some rosters.
   *
   * @param tenantId - Tenant to search in.
   * @param shiftId - The shift definition.
   * @param rosterIds - The rosters to look in.
   * @param limit - Most assignments to return.
   * @returns The planned assignments of the shift.
   */
  async findPlannedByShiftInRosters(
    tenantId: string,
    shiftId: string,
    rosterIds: string[],
    limit: number,
  ): Promise<RosterAssignment[]> {
    const operation = 'RosterAssignmentRepository.findPlannedByShiftInRosters'
    if (
      !toObjectId(tenantId) ||
      !toObjectId(shiftId) ||
      rosterIds.length === 0 ||
      rosterIds.some((id) => !toObjectId(id))
    ) {
      return []
    }
    try {
      const records = await this.model
        .find(
          this.toFilter({
            tenant_id: tenantId,
            'shift.definition_id': shiftId,
            roster_id: { $in: rosterIds },
            status: 'planned',
            deleted_at: null,
          }),
        )
        .limit(limit)
        .lean<LeanRecord<RosterAssignmentEntity>[]>()
        .exec()
      return records.map((record) => this.toModel(record))
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Creates many assignments of one roster in one transaction, with one change record per
   * assignment and the reason `roster_import`. Inside the caller's transaction it joins it.
   *
   * @param rosterId - The roster every assignment belongs to.
   * @param assignments - The assignments to store.
   * @returns The stored assignments, in the order given.
   */
  async createMany(
    rosterId: string,
    assignments: NewEntity<RosterAssignment>[],
  ): Promise<RosterAssignment[]> {
    const operation = 'RosterAssignmentRepository.createMany'
    const actor = this.requireActor(operation)
    if (assignments.some((item) => item.roster_id !== rosterId)) {
      throw new RepositoryValidationError(
        `${operation}: an assignment belongs to another roster`,
        { operation },
      )
    }
    if (assignments.length === 0) {
      return []
    }
    const documents = assignments.map((entity) =>
      this.asDocument({
        ...Object.fromEntries(
          Object.entries(entity).filter(
            ([key]) => !MANAGED_FIELDS.includes(key),
          ),
        ),
        schema_version: CURRENT_SCHEMA_VERSION,
        created_by: actor,
      }),
    )
    try {
      return await this.transactions.run(() =>
        withChangeReason('roster_import', async () => {
          const created = await this.model.create(documents)
          const stored: RosterAssignment[] = []
          // Sequential on purpose: a transaction session does not allow parallel operations.
          for (const document of created) {
            const after = this.toModel(document.toObject<LeanRecord<RosterAssignmentEntity>>())
            await this.record(null, after, operation)
            stored.push(after)
          }
          return stored
        }),
      )
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Finds the planned assignments of an employee dated after a date.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - The employee.
   * @param date - The last day that is kept.
   * @returns The planned assignments.
   */
  async findPlannedByEmployeeAfter(
    tenantId: string,
    employeeId: string,
    date: string,
  ): Promise<RosterAssignment[]> {
    const operation = 'RosterAssignmentRepository.findPlannedByEmployeeAfter'
    if (!toObjectId(tenantId) || !toObjectId(employeeId)) {
      return []
    }
    try {
      const records = await this.model
        .find(
          this.toFilter({
            tenant_id: tenantId,
            employee_id: employeeId,
            status: 'planned',
            date: { $gt: date },
            deleted_at: null,
          }),
        )
        .sort({ date: 1, _id: 1 })
        .lean<LeanRecord<RosterAssignmentEntity>[]>()
        .exec()
      return records.map((record) => this.toModel(record))
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Cancels assignments because an approved leave takes their days.
   *
   * @param tenantId - Tenant of the caller.
   * @param items - The assignments and the revision each carries.
   * @param leaveRequestId - The leave request.
   * @returns The cancelled assignments, in the order given.
   */
  cancelForLeave(
    tenantId: string,
    items: { id: string; revision: number }[],
    leaveRequestId: string,
  ): Promise<RosterAssignment[]> {
    return this.cancelAll(
      'RosterAssignmentRepository.cancelForLeave',
      'leave',
      tenantId,
      items,
      leaveRequestId,
    )
  }

  /**
   * Cancels assignments because a separation closes the days after the last working day.
   *
   * @param tenantId - Tenant of the caller.
   * @param items - The assignments and the revision each carries.
   * @param separationId - The separation.
   * @returns The cancelled assignments, in the order given.
   */
  cancelForSeparation(
    tenantId: string,
    items: { id: string; revision: number }[],
    separationId: string,
  ): Promise<RosterAssignment[]> {
    return this.cancelAll(
      'RosterAssignmentRepository.cancelForSeparation',
      'separation',
      tenantId,
      items,
      separationId,
    )
  }

  /**
   * Cancels assignments one by one inside one transaction, with one change record each.
   *
   * @param operation - Operation name for errors.
   * @param kind - What cancels them; also the change reason.
   * @param tenantId - Tenant of the caller.
   * @param items - The assignments and the revision each carries.
   * @param refId - The leave request or separation.
   * @returns The cancelled assignments, in the order given.
   */
  private async cancelAll(
    operation: string,
    kind: 'leave' | 'separation',
    tenantId: string,
    items: { id: string; revision: number }[],
    refId: string,
  ): Promise<RosterAssignment[]> {
    this.requireActor(operation)
    if (items.length === 0) {
      return []
    }
    try {
      return await this.transactions.run(() =>
        withChangeReason(kind, async () => {
          const cancelled: RosterAssignment[] = []
          // Sequential on purpose: a transaction session does not allow parallel operations.
          for (const item of items) {
            const current = await this.findOne(item.id)
            if (!current || current.tenant_id !== tenantId) {
              throw this.notFound(item.id, operation)
            }
            cancelled.push(
              await this.update(item.id, {
                status: 'cancelled',
                cancellation: { kind, ref_id: refId },
                change_reason: kind,
                revision: item.revision,
              }),
            )
          }
          return cancelled
        }),
      )
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Maps a stored record to the model, copying only model fields.
   *
   * @param record - Stored record.
   * @returns The assignment.
   */
  protected toModel(
    record: LeanRecord<RosterAssignmentEntity>,
  ): RosterAssignment {
    return {
      id: record._id.toHexString(),
      tenant_id: record.tenant_id.toHexString(),
      schema_version: record.schema_version,
      version: record.version,
      roster_id: record.roster_id.toHexString(),
      unit_id: record.unit_id.toHexString(),
      facility_id: record.facility_id.toHexString(),
      employee_id: record.employee_id.toHexString(),
      date: record.date,
      shift: {
        definition_id: record.shift.definition_id.toHexString(),
        code: record.shift.code,
        type: record.shift.type,
        start_time: record.shift.start_time ?? null,
        end_time: record.shift.end_time ?? null,
        paid_minutes: record.shift.paid_minutes,
        is_night: record.shift.is_night,
      },
      starts_at: record.starts_at ?? null,
      ends_at: record.ends_at ?? null,
      role: record.role,
      status: record.status,
      source: {
        kind: record.source.kind,
        ref_id: record.source.ref_id ? record.source.ref_id.toHexString() : null,
      },
      cancellation: record.cancellation
        ? {
            kind: record.cancellation.kind,
            ref_id: record.cancellation.ref_id.toHexString(),
          }
        : null,
      change_reason: record.change_reason ?? null,
      revision: record.revision,
      overtime: record.overtime
        ? {
            minutes: record.overtime.minutes,
            consent: record.overtime.consent
              ? {
                  at: record.overtime.consent.at,
                  document: record.overtime.consent.document ?? null,
                }
              : null,
          }
        : null,
      flag: record.flag
        ? {
            reason: record.flag.reason,
            failed: record.flag.failed,
            at: record.flag.at,
            resolved_at: record.flag.resolved_at ?? null,
          }
        : null,
      is_flagged: record.is_flagged ?? false,
      created_by: record.created_by,
      created_at: record.created_at,
      updated_at: record.updated_at,
      deleted_at: record.deleted_at,
    }
  }
}
