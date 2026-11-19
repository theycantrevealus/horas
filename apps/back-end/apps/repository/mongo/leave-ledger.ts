import { Inject, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { type NewEntity } from '@utility/database/interface'
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
  type LeaveLedgerQuery,
  type LeaveLedgerRepository,
} from '@repository/interface/leave-ledger'
import { type Coding } from '@repository/model/common/coding'
import { LeaveLedgerEntry } from '@repository/model/leave-ledger-entry'
import { LeaveLedgerEntryClassification } from '@repository/model/leave-ledger-entry.classification'
import { LeanRecord, MongoRepositoryBase } from './base'
import { LeaveLedgerEntryEntity } from './schema/leave-ledger'

/**
 * Mongo implementation of `LeaveLedgerRepository`. The ledger is append-only: the base class's
 * update, delete and soft delete are switched off, so they reject (`HR-LEV-030`).
 */
@Injectable()
export class LeaveLedgerRepositoryMongo
  extends MongoRepositoryBase<LeaveLedgerEntry, LeaveLedgerEntryEntity>
  implements LeaveLedgerRepository
{
  /**
   * @param entryModel - Mongoose model of the `leave_ledger_entries` collection.
   * @param transactions - Transaction manager of the main connection.
   * @param changes - Records every write in the change history.
   */
  constructor(
    @InjectModel(LeaveLedgerEntryEntity.name, MONGO_MAIN_CONNECTION)
    entryModel: Model<LeaveLedgerEntryEntity>,
    @Inject(TRANSACTION_MANAGER) transactions: TransactionManager,
    @Inject(CHANGE_RECORDER) changes: ChangeRecorder,
  ) {
    super(entryModel, transactions, changes, {
      name: 'LeaveLedgerRepository',
      entityType: 'leave_ledger_entry',
      classification: LeaveLedgerEntryClassification,
      allowUpdate: false,
      allowDelete: false,
      allowSoftDelete: false,
      updatableFields: [],
    })
  }

  /**
   * Appends an entry. A used `dedupe_key` rejects with `RepositoryConflictError`.
   *
   * @param entry - The entry.
   * @returns The stored entry.
   */
  append(entry: NewEntity<LeaveLedgerEntry>): Promise<LeaveLedgerEntry> {
    return this.create(entry)
  }

  /**
   * Finds an employee's entries, oldest first.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - The employee.
   * @param query - Optional filters and paging.
   * @returns The entries.
   */
  async findByEmployee(
    tenantId: string,
    employeeId: string,
    query: LeaveLedgerQuery = {},
  ): Promise<LeaveLedgerEntry[]> {
    const operation = 'LeaveLedgerRepository.findByEmployee'
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
            ...(query.leaveTypeSystem
              ? { 'leave_type.system': query.leaveTypeSystem }
              : {}),
            ...(query.leaveTypeCode
              ? { 'leave_type.code': query.leaveTypeCode }
              : {}),
            ...(query.periodStart
              ? { 'period.start': query.periodStart }
              : {}),
          }),
        )
        .sort({ created_at: 1, _id: 1 })
        .skip(query.offset ?? 0)
        .limit(query.limit ?? DEFAULT_PAGE_SIZE)
        .lean<LeanRecord<LeaveLedgerEntryEntity>[]>()
        .exec()
      return records.map((record) => this.toModel(record))
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Finds every entry of one employee, leave type and entitlement period.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - The employee.
   * @param leaveType - The leave type.
   * @param periodStart - First day of the entitlement period.
   * @returns The entries.
   */
  async findByEmployeeTypeAndPeriod(
    tenantId: string,
    employeeId: string,
    leaveType: Coding,
    periodStart: string,
  ): Promise<LeaveLedgerEntry[]> {
    const operation = 'LeaveLedgerRepository.findByEmployeeTypeAndPeriod'
    if (!toObjectId(tenantId) || !toObjectId(employeeId)) {
      return []
    }
    try {
      const records = await this.model
        .find(
          this.toFilter({
            tenant_id: tenantId,
            employee_id: employeeId,
            'leave_type.system': leaveType.system,
            'leave_type.code': leaveType.code,
            'period.start': periodStart,
            deleted_at: null,
          }),
        )
        .sort({ created_at: 1, _id: 1 })
        .lean<LeanRecord<LeaveLedgerEntryEntity>[]>()
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
   * @returns The ledger entry.
   */
  protected toModel(
    record: LeanRecord<LeaveLedgerEntryEntity>,
  ): LeaveLedgerEntry {
    return {
      id: record._id.toHexString(),
      tenant_id: record.tenant_id.toHexString(),
      schema_version: record.schema_version,
      version: record.version,
      employee_id: record.employee_id.toHexString(),
      leave_type: {
        system: record.leave_type.system,
        code: record.leave_type.code,
      },
      period: { start: record.period.start, end: record.period.end },
      kind: record.kind,
      days: record.days,
      bucket: record.bucket,
      expires_on: record.expires_on ?? null,
      source: {
        kind: record.source.kind,
        ref_id: record.source.ref_id?.toHexString() ?? null,
        date: record.source.date ?? null,
      },
      dedupe_key: record.dedupe_key ?? null,
      created_by: record.created_by,
      created_at: record.created_at,
      updated_at: record.updated_at,
      deleted_at: record.deleted_at,
    }
  }
}
