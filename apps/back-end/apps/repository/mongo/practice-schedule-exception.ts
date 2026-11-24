import { Inject, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import {
  DEFAULT_PAGE_SIZE,
  MONGO_MAIN_CONNECTION,
} from '@utility/database/constant'
import { translateMongoError } from '@utility/database/mongo.error'
import { toObjectId } from '@utility/database/mongo.query'
import {
  TRANSACTION_MANAGER,
  type TransactionManager,
} from '@utility/database/transaction'
import { CHANGE_RECORDER, type ChangeRecorder } from '@utility/history/recorder'
import {
  type MovedToQuery,
  type PracticeScheduleExceptionRepository,
} from '@repository/interface/practice-schedule-exception'
import { PracticeScheduleException } from '@repository/model/practice-schedule-exception'
import { PracticeScheduleExceptionClassification } from '@repository/model/practice-schedule-exception.classification'
import { LeanRecord, MongoRepositoryBase } from './base'
import { PracticeScheduleExceptionEntity } from './schema/practice-schedule-exception'

/**
 * Mongo implementation of `PracticeScheduleExceptionRepository`. An exception is never changed;
 * undoing one soft-deletes it, so the history keeps who undid it and when.
 */
@Injectable()
export class PracticeScheduleExceptionRepositoryMongo
  extends MongoRepositoryBase<
    PracticeScheduleException,
    PracticeScheduleExceptionEntity
  >
  implements PracticeScheduleExceptionRepository
{
  /**
   * @param exceptionModel - Mongoose model of the `practice_schedule_exceptions` collection.
   * @param transactions - Transaction manager of the main connection.
   * @param changes - Records every write in the change history.
   */
  constructor(
    @InjectModel(PracticeScheduleExceptionEntity.name, MONGO_MAIN_CONNECTION)
    exceptionModel: Model<PracticeScheduleExceptionEntity>,
    @Inject(TRANSACTION_MANAGER) transactions: TransactionManager,
    @Inject(CHANGE_RECORDER) changes: ChangeRecorder,
  ) {
    super(exceptionModel, transactions, changes, {
      name: 'PracticeScheduleExceptionRepository',
      entityType: 'practice_schedule_exception',
      classification: PracticeScheduleExceptionClassification,
      allowUpdate: false,
      allowDelete: false,
      allowSoftDelete: true,
      updatableFields: [],
    })
  }

  /**
   * Finds the exception of a schedule on a date, if one is in force.
   *
   * @param tenantId - Tenant to search in.
   * @param scheduleId - The schedule.
   * @param date - The date of the session.
   * @returns The exception, or `null`.
   */
  async findByScheduleAndDate(
    tenantId: string,
    scheduleId: string,
    date: string,
  ): Promise<PracticeScheduleException | null> {
    const operation = 'PracticeScheduleExceptionRepository.findByScheduleAndDate'
    if (!toObjectId(tenantId) || !toObjectId(scheduleId)) {
      return null
    }
    try {
      const record = await this.model
        .findOne(
          this.toFilter({
            tenant_id: tenantId,
            schedule_id: scheduleId,
            date,
            deleted_at: null,
          }),
        )
        .lean<LeanRecord<PracticeScheduleExceptionEntity>>()
        .exec()
      return record ? this.toModel(record) : null
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Finds the exceptions an approved leave made.
   *
   * @param tenantId - Tenant to search in.
   * @param leaveRequestId - The leave request.
   * @returns The exceptions in force.
   */
  async findByLeave(
    tenantId: string,
    leaveRequestId: string,
  ): Promise<PracticeScheduleException[]> {
    const operation = 'PracticeScheduleExceptionRepository.findByLeave'
    if (!toObjectId(tenantId) || !toObjectId(leaveRequestId)) {
      return []
    }
    try {
      const records = await this.model
        .find(
          this.toFilter({
            tenant_id: tenantId,
            'source.kind': 'leave',
            'source.ref_id': leaveRequestId,
            deleted_at: null,
          }),
        )
        .sort({ date: 1, _id: 1 })
        .lean<LeanRecord<PracticeScheduleExceptionEntity>[]>()
        .exec()
      return records.map((record) => this.toModel(record))
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Finds the exceptions of a doctor that move a session onto a date after a given one.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - The doctor.
   * @param date - The last day that is kept.
   * @returns The exceptions in force.
   */
  async findMovedAfterByEmployee(
    tenantId: string,
    employeeId: string,
    date: string,
  ): Promise<PracticeScheduleException[]> {
    const operation = 'PracticeScheduleExceptionRepository.findMovedAfterByEmployee'
    if (!toObjectId(tenantId) || !toObjectId(employeeId)) {
      return []
    }
    try {
      const records = await this.model
        .find(
          this.toFilter({
            tenant_id: tenantId,
            employee_id: employeeId,
            kind: 'moved',
            'moved_to.date': { $gt: date },
            deleted_at: null,
          }),
        )
        .sort({ date: 1, _id: 1 })
        .lean<LeanRecord<PracticeScheduleExceptionEntity>[]>()
        .exec()
      return records.map((record) => this.toModel(record))
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Finds the exceptions in force on a date for some schedules.
   *
   * @param tenantId - Tenant to search in.
   * @param scheduleIds - The schedules.
   * @param date - The date of the sessions.
   * @returns The exceptions.
   */
  async findBySchedulesAndDate(
    tenantId: string,
    scheduleIds: string[],
    date: string,
  ): Promise<PracticeScheduleException[]> {
    const operation = 'PracticeScheduleExceptionRepository.findBySchedulesAndDate'
    if (
      !toObjectId(tenantId) ||
      scheduleIds.length === 0 ||
      scheduleIds.some((id) => !toObjectId(id))
    ) {
      return []
    }
    try {
      const records = await this.model
        .find(
          this.toFilter({
            tenant_id: tenantId,
            schedule_id: { $in: scheduleIds },
            date,
            deleted_at: null,
          }),
        )
        .lean<LeanRecord<PracticeScheduleExceptionEntity>[]>()
        .exec()
      return records.map((record) => this.toModel(record))
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Finds the sessions moved onto a date.
   *
   * @param tenantId - Tenant to search in.
   * @param date - The new date.
   * @param query - Optional filters and a limit.
   * @returns The moved exceptions.
   */
  async findMovedTo(
    tenantId: string,
    date: string,
    query: MovedToQuery = {},
  ): Promise<PracticeScheduleException[]> {
    const operation = 'PracticeScheduleExceptionRepository.findMovedTo'
    if (
      !toObjectId(tenantId) ||
      (query.unitId !== undefined && !toObjectId(query.unitId)) ||
      (query.employeeId !== undefined && !toObjectId(query.employeeId))
    ) {
      return []
    }
    try {
      const records = await this.model
        .find(
          this.toFilter({
            tenant_id: tenantId,
            kind: 'moved',
            'moved_to.date': date,
            deleted_at: null,
            ...(query.unitId ? { unit_id: query.unitId } : {}),
            ...(query.employeeId ? { employee_id: query.employeeId } : {}),
          }),
        )
        .sort({ unit_id: 1, 'moved_to.start_time': 1, employee_id: 1, _id: 1 })
        .limit(query.limit ?? DEFAULT_PAGE_SIZE)
        .lean<LeanRecord<PracticeScheduleExceptionEntity>[]>()
        .exec()
      return records.map((record) => this.toModel(record))
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Finds the exceptions of a doctor that touch a date.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - The doctor.
   * @param date - The date.
   * @returns The exceptions.
   */
  async findByEmployeeAndDate(
    tenantId: string,
    employeeId: string,
    date: string,
  ): Promise<PracticeScheduleException[]> {
    const operation = 'PracticeScheduleExceptionRepository.findByEmployeeAndDate'
    if (!toObjectId(tenantId) || !toObjectId(employeeId)) {
      return []
    }
    try {
      const records = await this.model
        .find(
          this.toFilter({
            tenant_id: tenantId,
            employee_id: employeeId,
            deleted_at: null,
            $or: [{ date }, { 'moved_to.date': date }],
          }),
        )
        .lean<LeanRecord<PracticeScheduleExceptionEntity>[]>()
        .exec()
      return records.map((record) => this.toModel(record))
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Maps a stored record to the model, copying only model fields.
   *
   * @param record - Stored record.
   * @returns The exception.
   */
  protected toModel(
    record: LeanRecord<PracticeScheduleExceptionEntity>,
  ): PracticeScheduleException {
    return {
      id: record._id.toHexString(),
      tenant_id: record.tenant_id.toHexString(),
      schema_version: record.schema_version,
      version: record.version,
      schedule_id: record.schedule_id.toHexString(),
      employee_id: record.employee_id.toHexString(),
      unit_id: record.unit_id.toHexString(),
      date: record.date,
      kind: record.kind,
      moved_to: record.moved_to
        ? {
            date: record.moved_to.date,
            start_time: record.moved_to.start_time,
            end_time: record.moved_to.end_time,
          }
        : null,
      reason: record.reason
        ? {
            system: record.reason.system,
            code: record.reason.code,
            ...(record.reason.display ? { display: record.reason.display } : {}),
          }
        : null,
      source: {
        kind: record.source.kind,
        ref_id: record.source.ref_id ? record.source.ref_id.toHexString() : null,
      },
      created_by: record.created_by,
      created_at: record.created_at,
      updated_at: record.updated_at,
      deleted_at: record.deleted_at,
    }
  }
}
