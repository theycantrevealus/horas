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
  type HrImportQuery,
  type HrImportRepository,
} from '@repository/interface/hr-import'
import { HrImport, type HrImportTarget } from '@repository/model/hr-import'
import { HrImportClassification } from '@repository/model/hr-import.classification'
import { LeanRecord, MongoRepositoryBase } from './base'
import { HrImportEntity, type HrImportTargetEntity } from './schema/hr-import'

/**
 * Mongo implementation of `HrImportRepository`. Imports are never deleted. Only the progress of an
 * import changes: its status, counts, errors, who applied it and its failure.
 */
@Injectable()
export class HrImportRepositoryMongo
  extends MongoRepositoryBase<HrImport, HrImportEntity>
  implements HrImportRepository
{
  /**
   * @param importModel - Mongoose model of the `hr_imports` collection.
   * @param transactions - Transaction manager of the main connection.
   * @param changes - Records every write in the change history.
   */
  constructor(
    @InjectModel(HrImportEntity.name, MONGO_MAIN_CONNECTION)
    importModel: Model<HrImportEntity>,
    @Inject(TRANSACTION_MANAGER) transactions: TransactionManager,
    @Inject(CHANGE_RECORDER) changes: ChangeRecorder,
  ) {
    super(importModel, transactions, changes, {
      name: 'HrImportRepository',
      entityType: 'hr_import',
      classification: HrImportClassification,
      allowUpdate: true,
      allowDelete: false,
      allowSoftDelete: false,
      updatableFields: ['status', 'counts', 'errors', 'applied', 'failure'],
    })
  }

  /**
   * Finds imports, latest first.
   *
   * @param tenantId - Tenant to search in.
   * @param query - Optional filters and paging.
   * @returns The imports.
   */
  async findByFilter(
    tenantId: string,
    query: HrImportQuery = {},
  ): Promise<HrImport[]> {
    const operation = 'HrImportRepository.findByFilter'
    if (!toObjectId(tenantId)) {
      return []
    }
    try {
      const records = await this.model
        .find(
          this.toFilter({
            tenant_id: tenantId,
            deleted_at: null,
            ...(query.kind ? { kind: query.kind } : {}),
            ...(query.status ? { status: query.status } : {}),
            ...(query.calendarCode
              ? { 'target.calendar_code': query.calendarCode }
              : {}),
            ...(query.year !== undefined ? { 'target.year': query.year } : {}),
            ...(query.sha256 ? { 'file.sha256': query.sha256 } : {}),
          }),
        )
        .sort({ created_at: -1 })
        .skip(query.offset ?? 0)
        .limit(query.limit ?? DEFAULT_PAGE_SIZE)
        .lean<LeanRecord<HrImportEntity>[]>()
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
   * @returns The import.
   */
  protected toModel(record: LeanRecord<HrImportEntity>): HrImport {
    return {
      id: record._id.toHexString(),
      tenant_id: record.tenant_id.toHexString(),
      schema_version: record.schema_version,
      version: record.version,
      kind: record.kind,
      target: this.toTarget(record.target),
      file: {
        file_id: record.file.file_id,
        content_type: record.file.content_type,
        sha256: record.file.sha256,
      },
      status: record.status,
      counts: {
        rows: record.counts.rows,
        valid: record.counts.valid,
        invalid: record.counts.invalid,
        created: record.counts.created,
        updated: record.counts.updated,
        skipped: record.counts.skipped,
      },
      errors: record.errors.map(({ row, column, code }) => ({
        row,
        column: column ?? null,
        code,
      })),
      uploaded: { by: record.uploaded.by, at: record.uploaded.at },
      applied: record.applied
        ? { by: record.applied.by, at: record.applied.at }
        : null,
      failure: record.failure
        ? { error: record.failure.error, retryable: record.failure.retryable }
        : null,
      created_by: record.created_by,
      created_at: record.created_at,
      updated_at: record.updated_at,
      deleted_at: record.deleted_at,
    }
  }

  /**
   * Maps the stored target to the model: a roster, or a calendar code and year.
   *
   * @param target - Stored target.
   * @returns The target.
   */
  private toTarget(target: HrImportTargetEntity): HrImportTarget {
    return target.roster_id
      ? { roster_id: target.roster_id.toHexString() }
      : { calendar_code: target.calendar_code ?? '', year: target.year ?? 0 }
  }
}
