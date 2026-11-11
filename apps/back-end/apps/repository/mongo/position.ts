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
import { type PositionRepository } from '@repository/interface/position'
import { type Coding } from '@repository/model/common/coding'
import { Position } from '@repository/model/position'
import { PositionClassification } from '@repository/model/position.classification'
import { LeanRecord, MongoRepositoryBase } from './base'
import { type CodingEntity } from './schema/common/coding'
import { PositionEntity } from './schema/position'

/**
 * Maps a stored coding to the model, copying only model fields.
 *
 * @param record - Stored coding.
 * @returns The coding.
 */
function toCoding(record: CodingEntity): Coding {
  return {
    system: record.system,
    code: record.code,
    ...(record.display === undefined ? {} : { display: record.display }),
  }
}

/**
 * Mongo implementation of `PositionRepository`. Positions are never deleted, only closed.
 * `unit_id`, `code`, `kind` and `is_head_of_unit` cannot be changed after creation: they are not
 * updatable fields, because assignments copy them. `period` and `status` are updatable because
 * closing a position sets them; the service never lets a request change them directly.
 */
@Injectable()
export class PositionRepositoryMongo
  extends MongoRepositoryBase<Position, PositionEntity>
  implements PositionRepository
{
  /**
   * @param positionModel - Mongoose model of the `positions` collection.
   * @param transactions - Transaction manager of the main connection.
   * @param changes - Records every write in the change history.
   */
  constructor(
    @InjectModel(PositionEntity.name, MONGO_MAIN_CONNECTION)
    positionModel: Model<PositionEntity>,
    @Inject(TRANSACTION_MANAGER) transactions: TransactionManager,
    @Inject(CHANGE_RECORDER) changes: ChangeRecorder,
  ) {
    super(positionModel, transactions, changes, {
      name: 'PositionRepository',
      entityType: 'position',
      classification: PositionClassification,
      allowUpdate: true,
      allowDelete: false,
      allowSoftDelete: false,
      updatableFields: [
        'title',
        'grade',
        'allowed_professions',
        'budgeted_headcount',
        'period',
        'status',
      ],
    })
  }

  /**
   * Finds a position by its code inside a unit.
   *
   * @param tenantId - Tenant to search in.
   * @param unitId - Unit the position belongs to.
   * @param code - Position code, unique inside the unit.
   * @returns The position, or `null` when none matches.
   */
  async findByCode(
    tenantId: string,
    unitId: string,
    code: string,
  ): Promise<Position | null> {
    return this.findFirst('findByCode', [tenantId, unitId], {
      tenant_id: tenantId,
      unit_id: unitId,
      code,
    })
  }

  /**
   * Finds the active positions of a unit, ordered by code.
   *
   * @param tenantId - Tenant to search in.
   * @param unitId - Unit the positions belong to.
   * @param limit - Most positions to return; omit for all.
   * @returns The active positions, possibly none.
   */
  async findActiveByUnit(
    tenantId: string,
    unitId: string,
    limit?: number,
  ): Promise<Position[]> {
    const operation = 'PositionRepository.findActiveByUnit'
    if (!toObjectId(tenantId) || !toObjectId(unitId)) {
      return []
    }
    try {
      const query = this.model
        .find(
          this.toFilter({
            tenant_id: tenantId,
            unit_id: unitId,
            status: 'active',
            deleted_at: null,
          }),
        )
        .sort({ code: 1 })
      if (limit !== undefined) {
        query.limit(limit)
      }
      const records = await query.lean<LeanRecord<PositionEntity>[]>().exec()
      return records.map((record) => this.toModel(record))
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Finds the active head position of a unit.
   *
   * @param tenantId - Tenant to search in.
   * @param unitId - Unit whose head position is read.
   * @returns The head position, or `null` when the unit has none.
   */
  async findActiveHead(
    tenantId: string,
    unitId: string,
  ): Promise<Position | null> {
    return this.findFirst('findActiveHead', [tenantId, unitId], {
      tenant_id: tenantId,
      unit_id: unitId,
      is_head_of_unit: true,
      status: 'active',
    })
  }

  /**
   * Maps a stored record to the model, copying only model fields.
   *
   * @param record - Stored record.
   * @returns The position.
   */
  protected toModel(record: LeanRecord<PositionEntity>): Position {
    return {
      id: record._id.toHexString(),
      tenant_id: record.tenant_id.toHexString(),
      schema_version: record.schema_version,
      version: record.version,
      unit_id: record.unit_id.toHexString(),
      code: record.code,
      title: record.title.map(({ locale, text }) => ({ locale, text })),
      kind: record.kind,
      is_head_of_unit: record.is_head_of_unit,
      allowed_professions: record.allowed_professions.map(toCoding),
      grade: record.grade ? toCoding(record.grade) : null,
      budgeted_headcount: record.budgeted_headcount,
      job_description: record.job_description
        ? {
            file_id: record.job_description.file_id,
            content_type: record.job_description.content_type,
            sha256: record.job_description.sha256,
          }
        : null,
      period: record.period
        ? { start: record.period.start, end: record.period.end }
        : null,
      status: record.status,
      created_by: record.created_by,
      created_at: record.created_at,
      updated_at: record.updated_at,
      deleted_at: record.deleted_at,
    }
  }

  /**
   * Runs a named read for the first matching, not soft-deleted position.
   *
   * @param name - Method name for the operation label.
   * @param ids - Identifiers in the filter; a malformed one gives no result.
   * @param filter - Filter on model fields.
   * @returns The position, or `null`.
   */
  private async findFirst(
    name: string,
    ids: string[],
    filter: Record<string, unknown>,
  ): Promise<Position | null> {
    const operation = `PositionRepository.${name}`
    if (ids.some((value) => !toObjectId(value))) {
      return null
    }
    try {
      const record = await this.model
        .findOne(this.toFilter({ ...filter, deleted_at: null }))
        .lean<LeanRecord<PositionEntity>>()
        .exec()
      return record ? this.toModel(record) : null
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }
}
