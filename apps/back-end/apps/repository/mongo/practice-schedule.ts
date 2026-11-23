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
  type PracticeScheduleOnDateQuery,
  type PracticeScheduleQuery,
  type PracticeScheduleRepository,
} from '@repository/interface/practice-schedule'
import { PracticeSchedule } from '@repository/model/practice-schedule'
import { PracticeScheduleClassification } from '@repository/model/practice-schedule.classification'
import { LeanRecord, MongoRepositoryBase } from './base'
import { PracticeScheduleEntity } from './schema/practice-schedule'

/**
 * Mongo implementation of `PracticeScheduleRepository`. Schedules are never deleted. The doctor,
 * polyclinic, facility and weekday are fixed after creation; the times, quota, period and status
 * can change.
 */
@Injectable()
export class PracticeScheduleRepositoryMongo
  extends MongoRepositoryBase<PracticeSchedule, PracticeScheduleEntity>
  implements PracticeScheduleRepository
{
  /**
   * @param scheduleModel - Mongoose model of the `practice_schedules` collection.
   * @param transactions - Transaction manager of the main connection.
   * @param changes - Records every write in the change history.
   */
  constructor(
    @InjectModel(PracticeScheduleEntity.name, MONGO_MAIN_CONNECTION)
    scheduleModel: Model<PracticeScheduleEntity>,
    @Inject(TRANSACTION_MANAGER) transactions: TransactionManager,
    @Inject(CHANGE_RECORDER) changes: ChangeRecorder,
  ) {
    super(scheduleModel, transactions, changes, {
      name: 'PracticeScheduleRepository',
      entityType: 'practice_schedule',
      classification: PracticeScheduleClassification,
      allowUpdate: true,
      allowDelete: false,
      allowSoftDelete: false,
      updatableFields: ['start_time', 'end_time', 'quota', 'period', 'status'],
    })
  }

  /**
   * Finds schedules, ordered by polyclinic, weekday and start time.
   *
   * @param tenantId - Tenant to search in.
   * @param query - Optional filters and paging.
   * @returns The schedules.
   */
  async findByFilter(
    tenantId: string,
    query: PracticeScheduleQuery = {},
  ): Promise<PracticeSchedule[]> {
    const operation = 'PracticeScheduleRepository.findByFilter'
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
            deleted_at: null,
            ...(query.unitId ? { unit_id: query.unitId } : {}),
            ...(query.employeeId ? { employee_id: query.employeeId } : {}),
            ...(query.status ? { status: query.status } : {}),
          }),
        )
        .sort({ unit_id: 1, day_of_week: 1, start_time: 1, _id: 1 })
        .skip(query.offset ?? 0)
        .limit(query.limit ?? DEFAULT_PAGE_SIZE)
        .lean<LeanRecord<PracticeScheduleEntity>[]>()
        .exec()
      return records.map((record) => this.toModel(record))
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Finds the schedules of a weekday whose period covers a date.
   *
   * @param tenantId - Tenant to search in.
   * @param dayOfWeek - ISO weekday of the date.
   * @param date - The local date.
   * @param query - Optional filters and paging.
   * @returns The schedules.
   */
  async findOnDate(
    tenantId: string,
    dayOfWeek: number,
    date: string,
    query: PracticeScheduleOnDateQuery = {},
  ): Promise<PracticeSchedule[]> {
    const operation = 'PracticeScheduleRepository.findOnDate'
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
            deleted_at: null,
            day_of_week: dayOfWeek,
            'period.start': { $lte: date },
            $or: [{ 'period.end': null }, { 'period.end': { $gte: date } }],
            ...(query.unitId ? { unit_id: query.unitId } : {}),
            ...(query.employeeId ? { employee_id: query.employeeId } : {}),
          }),
        )
        .sort({ unit_id: 1, start_time: 1, employee_id: 1, _id: 1 })
        .skip(query.offset ?? 0)
        .limit(query.limit ?? DEFAULT_PAGE_SIZE)
        .lean<LeanRecord<PracticeScheduleEntity>[]>()
        .exec()
      return records.map((record) => this.toModel(record))
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Finds every schedule of a doctor on a weekday.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - The doctor.
   * @param dayOfWeek - ISO weekday.
   * @returns The schedules.
   */
  async findByEmployeeAndDay(
    tenantId: string,
    employeeId: string,
    dayOfWeek: number,
  ): Promise<PracticeSchedule[]> {
    const operation = 'PracticeScheduleRepository.findByEmployeeAndDay'
    if (!toObjectId(tenantId) || !toObjectId(employeeId)) {
      return []
    }
    try {
      const records = await this.model
        .find(
          this.toFilter({
            tenant_id: tenantId,
            employee_id: employeeId,
            day_of_week: dayOfWeek,
            deleted_at: null,
          }),
        )
        .lean<LeanRecord<PracticeScheduleEntity>[]>()
        .exec()
      return records.map((record) => this.toModel(record))
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Finds the schedules of a doctor whose validity overlaps a range.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - The doctor.
   * @param start - First date of the range.
   * @param end - Last date of the range.
   * @returns The schedules.
   */
  async findByEmployeeCovering(
    tenantId: string,
    employeeId: string,
    start: string,
    end: string,
  ): Promise<PracticeSchedule[]> {
    const operation = 'PracticeScheduleRepository.findByEmployeeCovering'
    if (!toObjectId(tenantId) || !toObjectId(employeeId)) {
      return []
    }
    try {
      const records = await this.model
        .find(
          this.toFilter({
            tenant_id: tenantId,
            employee_id: employeeId,
            'period.start': { $lte: end },
            $or: [{ 'period.end': null }, { 'period.end': { $gte: start } }],
            deleted_at: null,
          }),
        )
        .sort({ day_of_week: 1, start_time: 1, _id: 1 })
        .lean<LeanRecord<PracticeScheduleEntity>[]>()
        .exec()
      return records.map((record) => this.toModel(record))
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Finds the schedules of a doctor whose validity runs past a date.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - The doctor.
   * @param date - The last day that is kept.
   * @returns The schedules.
   */
  async findByEmployeeRunningAfter(
    tenantId: string,
    employeeId: string,
    date: string,
  ): Promise<PracticeSchedule[]> {
    const operation = 'PracticeScheduleRepository.findByEmployeeRunningAfter'
    if (!toObjectId(tenantId) || !toObjectId(employeeId)) {
      return []
    }
    try {
      const records = await this.model
        .find(
          this.toFilter({
            tenant_id: tenantId,
            employee_id: employeeId,
            $or: [{ 'period.end': null }, { 'period.end': { $gt: date } }],
            deleted_at: null,
          }),
        )
        .sort({ day_of_week: 1, start_time: 1, _id: 1 })
        .lean<LeanRecord<PracticeScheduleEntity>[]>()
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
   * @returns The schedule.
   */
  protected toModel(
    record: LeanRecord<PracticeScheduleEntity>,
  ): PracticeSchedule {
    return {
      id: record._id.toHexString(),
      tenant_id: record.tenant_id.toHexString(),
      schema_version: record.schema_version,
      version: record.version,
      employee_id: record.employee_id.toHexString(),
      unit_id: record.unit_id.toHexString(),
      facility_id: record.facility_id.toHexString(),
      day_of_week: record.day_of_week,
      start_time: record.start_time,
      end_time: record.end_time,
      quota: record.quota ?? null,
      period: { start: record.period.start, end: record.period.end ?? null },
      status: record.status,
      created_by: record.created_by,
      created_at: record.created_at,
      updated_at: record.updated_at,
      deleted_at: record.deleted_at,
    }
  }
}
