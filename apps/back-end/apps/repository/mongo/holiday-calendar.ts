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
  type HolidayCalendarQuery,
  type HolidayCalendarRepository,
} from '@repository/interface/holiday-calendar'
import {
  HolidayCalendar,
  type HolidayEntry,
} from '@repository/model/holiday-calendar'
import { HolidayCalendarClassification } from '@repository/model/holiday-calendar.classification'
import { LeanRecord, MongoRepositoryBase } from './base'
import { HolidayCalendarEntity } from './schema/holiday-calendar'

/**
 * Mongo implementation of `HolidayCalendarRepository`. Calendars are never deleted. The code, the
 * year, the country and the subdivision are fixed after creation; only the holidays and the last
 * import change.
 */
@Injectable()
export class HolidayCalendarRepositoryMongo
  extends MongoRepositoryBase<HolidayCalendar, HolidayCalendarEntity>
  implements HolidayCalendarRepository
{
  /**
   * @param calendarModel - Mongoose model of the `holiday_calendars` collection.
   * @param transactions - Transaction manager of the main connection.
   * @param changes - Records every write in the change history.
   */
  constructor(
    @InjectModel(HolidayCalendarEntity.name, MONGO_MAIN_CONNECTION)
    calendarModel: Model<HolidayCalendarEntity>,
    @Inject(TRANSACTION_MANAGER) transactions: TransactionManager,
    @Inject(CHANGE_RECORDER) changes: ChangeRecorder,
  ) {
    super(calendarModel, transactions, changes, {
      name: 'HolidayCalendarRepository',
      entityType: 'holiday_calendar',
      classification: HolidayCalendarClassification,
      allowUpdate: true,
      allowDelete: false,
      allowSoftDelete: false,
      updatableFields: ['holidays', 'last_import_id'],
    })
  }

  /**
   * Finds the calendar of a code in a year.
   *
   * @param tenantId - Tenant to search in.
   * @param code - Calendar code.
   * @param year - Calendar year.
   * @returns The calendar, or `null`.
   */
  async findByCodeAndYear(
    tenantId: string,
    code: string,
    year: number,
  ): Promise<HolidayCalendar | null> {
    const operation = 'HolidayCalendarRepository.findByCodeAndYear'
    if (!toObjectId(tenantId)) {
      return null
    }
    try {
      const record = await this.model
        .findOne(
          this.toFilter({ tenant_id: tenantId, code, year, deleted_at: null }),
        )
        .lean<LeanRecord<HolidayCalendarEntity>>()
        .exec()
      return record ? this.toModel(record) : null
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Finds the tenant's calendars, ordered by code and then year, latest first.
   *
   * @param tenantId - Tenant to search in.
   * @param query - Optional filters and paging.
   * @returns The calendars.
   */
  async findByFilter(
    tenantId: string,
    query: HolidayCalendarQuery = {},
  ): Promise<HolidayCalendar[]> {
    const operation = 'HolidayCalendarRepository.findByFilter'
    if (!toObjectId(tenantId)) {
      return []
    }
    try {
      const records = await this.model
        .find(
          this.toFilter({
            tenant_id: tenantId,
            deleted_at: null,
            ...(query.code ? { code: query.code } : {}),
            ...(query.year !== undefined ? { year: query.year } : {}),
            ...(query.country ? { country: query.country } : {}),
          }),
        )
        .sort({ code: 1, year: -1 })
        .skip(query.offset ?? 0)
        .limit(query.limit ?? DEFAULT_PAGE_SIZE)
        .lean<LeanRecord<HolidayCalendarEntity>[]>()
        .exec()
      return records.map((record) => this.toModel(record))
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Finds the calendars of every tenant with an active day of one kind on a date (a cross-tenant
   * read for the collective leave job).
   *
   * @param kind - The kind of day.
   * @param date - Local date.
   * @returns The calendars.
   */
  async findWithKindOnDate(
    kind: HolidayEntry['kind'],
    date: string,
  ): Promise<HolidayCalendar[]> {
    const operation = 'HolidayCalendarRepository.findWithKindOnDate'
    try {
      const records = await this.model
        .find(
          this.toFilter({
            holidays: { $elemMatch: { date, kind, status: 'active' } },
            deleted_at: null,
          }),
        )
        .lean<LeanRecord<HolidayCalendarEntity>[]>()
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
   * @returns The calendar.
   */
  protected toModel(record: LeanRecord<HolidayCalendarEntity>): HolidayCalendar {
    return {
      id: record._id.toHexString(),
      ...(record.tenant_id ? { tenant_id: record.tenant_id.toHexString() } : {}),
      schema_version: record.schema_version,
      version: record.version,
      code: record.code,
      year: record.year,
      country: record.country,
      subdivision: record.subdivision ?? null,
      holidays: record.holidays.map((holiday) => ({
        date: holiday.date,
        name: holiday.name.map(({ locale, text }) => ({ locale, text })),
        kind: holiday.kind,
        source: holiday.source,
        status: holiday.status,
        import_id: holiday.import_id ? holiday.import_id.toHexString() : null,
      })),
      last_import_id: record.last_import_id
        ? record.last_import_id.toHexString()
        : null,
      created_by: record.created_by,
      created_at: record.created_at,
      updated_at: record.updated_at,
      deleted_at: record.deleted_at,
    }
  }
}
