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
  type CpdRecordQuery,
  type CpdRecordRepository,
} from '@repository/interface/cpd-record'
import { type Coding } from '@repository/model/common/coding'
import { CpdRecord } from '@repository/model/cpd-record'
import { CpdRecordClassification } from '@repository/model/cpd-record.classification'
import { LeanRecord, MongoRepositoryBase } from './base'
import { toCoding } from './employee'
import { CpdRecordEntity } from './schema/cpd-record'

/**
 * Mongo implementation of `CpdRecordRepository`. Records are never deleted. Only the status
 * changes after creation (a review); the points, the activity and the employee are fixed.
 */
@Injectable()
export class CpdRecordRepositoryMongo
  extends MongoRepositoryBase<CpdRecord, CpdRecordEntity>
  implements CpdRecordRepository
{
  /**
   * @param recordModel - Mongoose model of the `cpd_records` collection.
   * @param transactions - Transaction manager of the main connection.
   * @param changes - Records every write in the change history.
   */
  constructor(
    @InjectModel(CpdRecordEntity.name, MONGO_MAIN_CONNECTION)
    recordModel: Model<CpdRecordEntity>,
    @Inject(TRANSACTION_MANAGER) transactions: TransactionManager,
    @Inject(CHANGE_RECORDER) changes: ChangeRecorder,
  ) {
    super(recordModel, transactions, changes, {
      name: 'CpdRecordRepository',
      entityType: 'cpd_record',
      classification: CpdRecordClassification,
      allowUpdate: true,
      allowDelete: false,
      allowSoftDelete: false,
      updatableFields: ['status'],
    })
  }

  /**
   * Finds the credit records of an employee, newest activity date first.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - The employee.
   * @param query - Optional filters and paging.
   * @returns The records.
   */
  async findByEmployee(
    tenantId: string,
    employeeId: string,
    query: CpdRecordQuery = {},
  ): Promise<CpdRecord[]> {
    const operation = 'CpdRecordRepository.findByEmployee'
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
            ...(query.creditSystem
              ? { 'credit_system.code': query.creditSystem }
              : {}),
            ...(query.status ? { status: query.status } : {}),
          }),
        )
        .sort({ activity_date: -1, _id: 1 })
        .skip(query.offset ?? 0)
        .limit(query.limit ?? DEFAULT_PAGE_SIZE)
        .lean<LeanRecord<CpdRecordEntity>[]>()
        .exec()
      return records.map((record) => this.toModel(record))
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Finds the accepted records of an employee in one credit system inside a period.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - The employee.
   * @param creditSystem - The credit system.
   * @param from - First day of the period.
   * @param to - Last day of the period.
   * @returns The accepted records.
   */
  async findAcceptedInCycle(
    tenantId: string,
    employeeId: string,
    creditSystem: Coding,
    from: string,
    to: string,
  ): Promise<CpdRecord[]> {
    const operation = 'CpdRecordRepository.findAcceptedInCycle'
    if (!toObjectId(tenantId) || !toObjectId(employeeId)) {
      return []
    }
    try {
      const records = await this.model
        .find(
          this.toFilter({
            tenant_id: tenantId,
            employee_id: employeeId,
            status: 'accepted',
            'credit_system.system': creditSystem.system,
            'credit_system.code': creditSystem.code,
            activity_date: { $gte: from, $lte: to },
            deleted_at: null,
          }),
        )
        .sort({ activity_date: 1, _id: 1 })
        .lean<LeanRecord<CpdRecordEntity>[]>()
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
   * @returns The credit record.
   */
  protected toModel(record: LeanRecord<CpdRecordEntity>): CpdRecord {
    return {
      id: record._id.toHexString(),
      tenant_id: record.tenant_id.toHexString(),
      schema_version: record.schema_version,
      version: record.version,
      employee_id: record.employee_id.toHexString(),
      credit_system: toCoding(record.credit_system),
      activity: {
        title: record.activity.title,
        category: toCoding(record.activity.category),
        provider: record.activity.provider,
      },
      activity_date: record.activity_date,
      points: record.points,
      evidence: record.evidence
        ? {
            file_id: record.evidence.file_id,
            content_type: record.evidence.content_type,
            sha256: record.evidence.sha256,
          }
        : null,
      source: record.source,
      status: record.status,
      created_by: record.created_by,
      created_at: record.created_at,
      updated_at: record.updated_at,
      deleted_at: record.deleted_at,
    }
  }
}
