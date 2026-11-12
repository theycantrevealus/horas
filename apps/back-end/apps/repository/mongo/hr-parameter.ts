import { Inject, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import {
  DEFAULT_PAGE_SIZE,
  MONGO_MAIN_CONNECTION,
} from '@utility/database/constant'
import { type Page } from '@utility/database/interface'
import { translateMongoError } from '@utility/database/mongo.error'
import { toObjectId, toPage } from '@utility/database/mongo.query'
import {
  TRANSACTION_MANAGER,
  type TransactionManager,
} from '@utility/database/transaction'
import { CHANGE_RECORDER, type ChangeRecorder } from '@utility/history/recorder'
import {
  type HrParameterPageOptions,
  type HrParameterRepository,
} from '@repository/interface/hr-parameter'
import {
  HrParameter,
  type HrParameterScope,
} from '@repository/model/hr-parameter'
import { HrParameterClassification } from '@repository/model/hr-parameter.classification'
import { LeanRecord, MongoRepositoryBase } from './base'
import { HrParameterEntity } from './schema/hr-parameter'

/**
 * Mongo implementation of `HrParameterRepository`. Values are append-only: a parameter is never
 * edited or deleted, so `update`, `delete` and `deleteSoft` are not supported. A value that must
 * change is replaced by a new one from a later date, and the history stays.
 */
@Injectable()
export class HrParameterRepositoryMongo
  extends MongoRepositoryBase<HrParameter, HrParameterEntity>
  implements HrParameterRepository
{
  /**
   * @param parameterModel - Mongoose model of the `hr_parameters` collection.
   * @param transactions - Transaction manager of the main connection.
   * @param changes - Records every write in the change history.
   */
  constructor(
    @InjectModel(HrParameterEntity.name, MONGO_MAIN_CONNECTION)
    parameterModel: Model<HrParameterEntity>,
    @Inject(TRANSACTION_MANAGER) transactions: TransactionManager,
    @Inject(CHANGE_RECORDER) changes: ChangeRecorder,
  ) {
    super(parameterModel, transactions, changes, {
      name: 'HrParameterRepository',
      entityType: 'hr_parameter',
      classification: HrParameterClassification,
      allowUpdate: false,
      allowDelete: false,
      allowSoftDelete: false,
      updatableFields: [],
    })
  }

  /**
   * Finds every value that was set for a parameter, at any scope and date.
   *
   * @param tenantId - Tenant to search in.
   * @param key - Parameter key.
   * @returns The values, possibly none.
   */
  async findByKey(tenantId: string, key: string): Promise<HrParameter[]> {
    const operation = 'HrParameterRepository.findByKey'
    if (!toObjectId(tenantId)) {
      return []
    }
    try {
      const records = await this.model
        .find(this.toFilter({ tenant_id: tenantId, key, deleted_at: null }))
        .lean<LeanRecord<HrParameterEntity>[]>()
        .exec()
      return records.map((record) => this.toModel(record))
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Finds the value set for a key, scope and date.
   *
   * @param tenantId - Tenant to search in.
   * @param key - Parameter key.
   * @param scope - Level and identifier the value applies to.
   * @param effectiveFrom - First day the value applies.
   * @returns The value, or `null` when none matches.
   */
  async findOneAt(
    tenantId: string,
    key: string,
    scope: HrParameterScope,
    effectiveFrom: string,
  ): Promise<HrParameter | null> {
    const operation = 'HrParameterRepository.findOneAt'
    if (!toObjectId(tenantId) || (scope.id !== null && !toObjectId(scope.id))) {
      return null
    }
    try {
      const record = await this.model
        .findOne(
          this.toFilter({
            tenant_id: tenantId,
            key,
            'scope.kind': scope.kind,
            'scope.id': scope.id,
            effective_from: effectiveFrom,
            deleted_at: null,
          }),
        )
        .lean<LeanRecord<HrParameterEntity>>()
        .exec()
      return record ? this.toModel(record) : null
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Returns one page of values, ordered by key; with a key filter, newest date first.
   *
   * @param tenantId - Tenant to search in.
   * @param options - Filters and paging.
   * @returns The page.
   */
  async findPage(
    tenantId: string,
    options: HrParameterPageOptions,
  ): Promise<Page<HrParameter>> {
    const operation = 'HrParameterRepository.findPage'
    const limit = options.limit ?? DEFAULT_PAGE_SIZE
    const offset = options.offset ?? 0
    if (
      !toObjectId(tenantId) ||
      (options.scopeId !== undefined && !toObjectId(options.scopeId))
    ) {
      return toPage([], 0, offset, limit)
    }
    const filter = this.toFilter({
      tenant_id: tenantId,
      deleted_at: null,
      ...(options.key === undefined ? {} : { key: options.key }),
      ...(options.scopeKind === undefined
        ? {}
        : { 'scope.kind': options.scopeKind }),
      ...(options.scopeId === undefined ? {} : { 'scope.id': options.scopeId }),
    })
    const sort: Record<string, 1 | -1> =
      options.key === undefined
        ? { key: 1, effective_from: -1, _id: 1 }
        : { effective_from: -1, _id: 1 }
    try {
      // Sequential on purpose: a transaction session does not allow parallel operations.
      const records = await this.model
        .find(filter)
        .sort(sort)
        .skip(offset)
        .limit(limit)
        .lean<LeanRecord<HrParameterEntity>[]>()
        .exec()
      const total = await this.model.countDocuments(filter).exec()
      return toPage(
        records.map((record) => this.toModel(record)),
        total,
        offset,
        limit,
      )
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Maps a stored record to the model, copying only model fields.
   *
   * @param record - Stored record.
   * @returns The parameter value.
   */
  protected toModel(record: LeanRecord<HrParameterEntity>): HrParameter {
    return {
      id: record._id.toHexString(),
      tenant_id: record.tenant_id.toHexString(),
      schema_version: record.schema_version,
      version: record.version,
      key: record.key,
      scope: {
        kind: record.scope.kind,
        id: record.scope.id ? record.scope.id.toHexString() : null,
      },
      value: record.value,
      effective_from: record.effective_from,
      notes: record.notes,
      created_by: record.created_by,
      created_at: record.created_at,
      updated_at: record.updated_at,
      deleted_at: record.deleted_at,
    }
  }
}
