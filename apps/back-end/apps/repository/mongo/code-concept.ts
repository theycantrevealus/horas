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
import { type CodeConceptRepository } from '@repository/interface/code-concept'
import { CodeConcept } from '@repository/model/code-concept'
import { CodeConceptClassification } from '@repository/model/code-concept.classification'
import { LeanRecord, MongoRepositoryBase } from './base'
import { CodeConceptEntity } from './schema/code-concept'

/**
 * Mongo implementation of `CodeConceptRepository`. Concepts are never deleted, only retired.
 * `system` and `code` cannot be changed after creation: they are not updatable fields, because
 * other records refer to them.
 */
@Injectable()
export class CodeConceptRepositoryMongo
  extends MongoRepositoryBase<CodeConcept, CodeConceptEntity>
  implements CodeConceptRepository
{
  /**
   * @param conceptModel - Mongoose model of the `code_concepts` collection.
   * @param transactions - Transaction manager of the main connection.
   * @param changes - Records every write in the change history.
   */
  constructor(
    @InjectModel(CodeConceptEntity.name, MONGO_MAIN_CONNECTION)
    conceptModel: Model<CodeConceptEntity>,
    @Inject(TRANSACTION_MANAGER) transactions: TransactionManager,
    @Inject(CHANGE_RECORDER) changes: ChangeRecorder,
  ) {
    super(conceptModel, transactions, changes, {
      name: 'CodeConceptRepository',
      entityType: 'code_concept',
      classification: CodeConceptClassification,
      allowUpdate: true,
      allowDelete: false,
      allowSoftDelete: false,
      updatableFields: [
        'display',
        'properties',
        'mappings',
        'period',
        'status',
      ],
    })
  }

  /**
   * Finds the concept a tenant sees for a code: its own, otherwise the platform-wide one.
   *
   * @param tenantId - Tenant that asks.
   * @param system - Code system.
   * @param code - Code inside the system.
   * @returns The concept, or `null` when neither exists.
   */
  async findByCode(
    tenantId: string,
    system: string,
    code: string,
  ): Promise<CodeConcept | null> {
    const own = await this.findOwn(tenantId, system, code)
    if (own) {
      return own
    }
    const operation = 'CodeConceptRepository.findByCode'
    try {
      const record = await this.model
        .findOne(
          this.toFilter({ tenant_id: null, system, code, deleted_at: null }),
        )
        .lean<LeanRecord<CodeConceptEntity>>()
        .exec()
      return record ? this.toModel(record) : null
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Finds the concept the tenant itself owns for a code.
   *
   * @param tenantId - Tenant that owns the concept.
   * @param system - Code system.
   * @param code - Code inside the system.
   * @returns The tenant's concept, or `null`.
   */
  async findOwn(
    tenantId: string,
    system: string,
    code: string,
  ): Promise<CodeConcept | null> {
    const operation = 'CodeConceptRepository.findOwn'
    if (!toObjectId(tenantId)) {
      return null
    }
    try {
      const record = await this.model
        .findOne(
          this.toFilter({
            tenant_id: tenantId,
            system,
            code,
            deleted_at: null,
          }),
        )
        .lean<LeanRecord<CodeConceptEntity>>()
        .exec()
      return record ? this.toModel(record) : null
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Finds every concept of a system that a tenant can see, its own and the platform-wide ones.
   *
   * @param tenantId - Tenant that asks.
   * @param system - Code system.
   * @returns The concepts ordered by code, possibly none.
   */
  async findBySystem(tenantId: string, system: string): Promise<CodeConcept[]> {
    const operation = 'CodeConceptRepository.findBySystem'
    if (!toObjectId(tenantId)) {
      return []
    }
    try {
      const records = await this.model
        .find(
          this.toFilter({
            system,
            tenant_id: { $in: [tenantId, null] },
            deleted_at: null,
          }),
        )
        .sort({ code: 1 })
        .lean<LeanRecord<CodeConceptEntity>[]>()
        .exec()
      return records.map((record) => this.toModel(record))
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Maps a stored record to the model, copying only model fields. A platform-wide concept has
   * no `tenant_id`.
   *
   * @param record - Stored record.
   * @returns The code concept.
   */
  protected toModel(record: LeanRecord<CodeConceptEntity>): CodeConcept {
    return {
      id: record._id.toHexString(),
      ...(record.tenant_id
        ? { tenant_id: record.tenant_id.toHexString() }
        : {}),
      schema_version: record.schema_version,
      version: record.version,
      system: record.system,
      code: record.code,
      display: record.display.map(({ locale, text }) => ({ locale, text })),
      properties: { ...record.properties },
      mappings: record.mappings.map(({ system, code, display }) => ({
        system,
        code,
        ...(display === undefined ? {} : { display }),
      })),
      period: record.period
        ? { start: record.period.start, end: record.period.end ?? null }
        : null,
      status: record.status,
      created_by: record.created_by,
      created_at: record.created_at,
      updated_at: record.updated_at,
      deleted_at: record.deleted_at,
    }
  }
}
