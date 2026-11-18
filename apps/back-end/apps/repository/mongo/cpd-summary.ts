import { Inject, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import { translateMongoError } from '@utility/database/mongo.error'
import { toObjectId } from '@utility/database/mongo.query'
import {
  TRANSACTION_MANAGER,
  type TransactionManager,
} from '@utility/database/transaction'
import { CHANGE_RECORDER, type ChangeRecorder } from '@utility/history/recorder'
import { type CpdSummaryRepository } from '@repository/interface/cpd-summary'
import { CpdSummary } from '@repository/model/cpd-summary'
import { CpdSummaryClassification } from '@repository/model/cpd-summary.classification'
import { LeanRecord, MongoRepositoryBase } from './base'
import { toCoding } from './employee'
import { CpdSummaryEntity } from './schema/cpd-summary'

/**
 * Mongo implementation of `CpdSummaryRepository`. Summaries are never deleted. The employee and
 * the credit system are fixed; the profession, the cycle, the total and the date it was read
 * change when a new total replaces the old one.
 */
@Injectable()
export class CpdSummaryRepositoryMongo
  extends MongoRepositoryBase<CpdSummary, CpdSummaryEntity>
  implements CpdSummaryRepository
{
  /**
   * @param summaryModel - Mongoose model of the `cpd_summaries` collection.
   * @param transactions - Transaction manager of the main connection.
   * @param changes - Records every write in the change history.
   */
  constructor(
    @InjectModel(CpdSummaryEntity.name, MONGO_MAIN_CONNECTION)
    summaryModel: Model<CpdSummaryEntity>,
    @Inject(TRANSACTION_MANAGER) transactions: TransactionManager,
    @Inject(CHANGE_RECORDER) changes: ChangeRecorder,
  ) {
    super(summaryModel, transactions, changes, {
      name: 'CpdSummaryRepository',
      entityType: 'cpd_summary',
      classification: CpdSummaryClassification,
      allowUpdate: true,
      allowDelete: false,
      allowSoftDelete: false,
      updatableFields: [
        'profession',
        'cycle',
        'total_points',
        'checked_at',
        'source',
      ],
    })
  }

  /**
   * Finds the summaries of an employee, ordered by credit system code.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - The employee.
   * @returns The summaries.
   */
  async findByEmployee(
    tenantId: string,
    employeeId: string,
  ): Promise<CpdSummary[]> {
    const operation = 'CpdSummaryRepository.findByEmployee'
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
          }),
        )
        .sort({ 'credit_system.code': 1, _id: 1 })
        .lean<LeanRecord<CpdSummaryEntity>[]>()
        .exec()
      return records.map((record) => this.toModel(record))
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Finds the summary of an employee in one credit system.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - The employee.
   * @param creditSystem - Credit system code system.
   * @param creditCode - Credit system code.
   * @returns The summary, or `null`.
   */
  async findByEmployeeAndSystem(
    tenantId: string,
    employeeId: string,
    creditSystem: string,
    creditCode: string,
  ): Promise<CpdSummary | null> {
    const operation = 'CpdSummaryRepository.findByEmployeeAndSystem'
    if (!toObjectId(tenantId) || !toObjectId(employeeId)) {
      return null
    }
    try {
      const record = await this.model
        .findOne(
          this.toFilter({
            tenant_id: tenantId,
            employee_id: employeeId,
            'credit_system.system': creditSystem,
            'credit_system.code': creditCode,
            deleted_at: null,
          }),
        )
        .lean<LeanRecord<CpdSummaryEntity>>()
        .exec()
      return record ? this.toModel(record) : null
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Maps a stored record to the model, copying only model fields.
   *
   * @param record - Stored record.
   * @returns The summary.
   */
  protected toModel(record: LeanRecord<CpdSummaryEntity>): CpdSummary {
    return {
      id: record._id.toHexString(),
      tenant_id: record.tenant_id.toHexString(),
      schema_version: record.schema_version,
      version: record.version,
      employee_id: record.employee_id.toHexString(),
      credit_system: toCoding(record.credit_system),
      profession: toCoding(record.profession),
      cycle: {
        start: record.cycle.start,
        end: record.cycle.end ?? record.cycle.start,
      },
      total_points: record.total_points,
      checked_at: record.checked_at,
      source: record.source,
      created_by: record.created_by,
      created_at: record.created_at,
      updated_at: record.updated_at,
      deleted_at: record.deleted_at,
    }
  }
}
