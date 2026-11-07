import { Inject, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, QueryFilter, Types } from 'mongoose'
import {
  DEFAULT_PAGE_SIZE,
  MONGO_MAIN_CONNECTION,
} from '@utility/database/constant'
import {
  RepositoryNotFoundError,
  RepositoryValidationError,
} from '@utility/database/error'
import {
  EntityChanges,
  FindOneOptions,
  ListQueryOptions,
  NewEntity,
  Page,
  PaginatedQueryOptions,
} from '@utility/database/interface'
import { translateMongoError } from '@utility/database/mongo.error'
import {
  toMongoFilter,
  toMongoSort,
  toObjectId,
  toPage,
} from '@utility/database/mongo.query'
import {
  TRANSACTION_MANAGER,
  type TransactionManager,
} from '@utility/database/transaction'
import { CHANGE_RECORDER, type ChangeRecorder } from '@utility/history/recorder'
import { TimeManagement } from '@utility/time'
import { LovRepository } from '@repository/interface/lov'
import { LOV } from '@repository/model/lov'
import { LovClassification } from '@repository/model/lov.classification'
import { LovEntity } from './schema/lov'

/**
 * A LOV document as returned by a lean query.
 */
type LovRecord = LovEntity & { _id: Types.ObjectId }

/**
 * Operation name prefix used in errors and logs.
 */
const OPERATION = 'LovRepository'

/**
 * Stable entity name of LOVs in the change history.
 */
const ENTITY_TYPE = 'lov'

/**
 * Converts a stored LOV document to the engine-neutral model.
 * Only model fields are copied, so `_id`, `__v` and other storage fields never leave the repository.
 *
 * @param record - Lean LOV document.
 * @returns The LOV model.
 */
function toLov(record: LovRecord): LOV {
  return {
    id: record._id.toHexString(),
    group_name: record.group_name,
    set_value: record.set_value,
    description: record.description,
    additional: record.additional,
    created_at: record.created_at,
    updated_at: record.updated_at,
    deleted_at: record.deleted_at,
  }
}

/**
 * Returns the current time on the same clock as the schema defaults.
 *
 * @returns The current date in the `Asia/Jakarta` timezone.
 */
function now(): Date {
  return new TimeManagement().getTimezone('Asia/Jakarta')
}

/**
 * MongoDB implementation of the LOV repository, on the main connection.
 * Calls inside `TransactionManager.run` join the transaction automatically.
 * Every write reads the stored state, writes and records the change in one transaction
 * (`database.md` 6.1), so the change record commits or rolls back with the data.
 */
@Injectable()
export class LOVRepositoryMongo implements LovRepository {
  /**
   * @param lovModel - Mongoose model of the LOV collection on the main connection.
   * @param transactions - Transaction manager of the main connection.
   * @param changes - Recorder of the change history.
   */
  constructor(
    @InjectModel(LovEntity.name, MONGO_MAIN_CONNECTION)
    private readonly lovModel: Model<LovEntity>,
    @Inject(TRANSACTION_MANAGER)
    private readonly transactions: TransactionManager,
    @Inject(CHANGE_RECORDER) private readonly changes: ChangeRecorder,
  ) {}

  /**
   * Returns one page of LOV records.
   *
   * @param options - Query options with `withPagination: true`.
   * @returns The requested page and its paging metadata.
   */
  findAll(options: PaginatedQueryOptions<LOV>): Promise<Page<LOV>>
  /**
   * Returns all matching LOV records.
   *
   * @param options - Optional query options without pagination.
   * @returns The matching records.
   */
  findAll(options?: ListQueryOptions<LOV>): Promise<LOV[]>
  /**
   * Shared implementation of both `findAll` overloads.
   *
   * @param options - Query options.
   * @returns The matching records or one page of them.
   */
  async findAll(
    options?: PaginatedQueryOptions<LOV> | ListQueryOptions<LOV>,
  ): Promise<LOV[] | Page<LOV>> {
    const operation = `${OPERATION}.findAll`
    try {
      const filter = this.toFilter(
        toMongoFilter(options?.where, options?.withSoft, operation),
      )
      const sort = toMongoSort(options?.orderBy)

      if (options?.withPagination) {
        const limit = options.limit ?? DEFAULT_PAGE_SIZE
        const offset = options.offset ?? 0
        // Sequential on purpose: a transaction session does not allow parallel operations.
        const records = await this.lovModel
          .find(filter)
          .sort(sort)
          .skip(offset)
          .limit(limit)
          .lean<LovRecord[]>()
          .exec()
        const total = await this.lovModel.countDocuments(filter).exec()
        return toPage(records.map(toLov), total, offset, limit)
      }

      const query = this.lovModel.find(filter).sort(sort)
      if (options?.offset) {
        query.skip(options.offset)
      }
      if (options?.limit) {
        query.limit(options.limit)
      }
      const records = await query.lean<LovRecord[]>().exec()
      return records.map(toLov)
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Returns the active LOVs of one group, sorted by value.
   *
   * @param groupName - Group to read.
   * @returns The group's LOVs.
   */
  findByGroup(groupName: string): Promise<LOV[]> {
    return this.findAll({
      where: { group_name: { eq: groupName } },
      orderBy: { field: 'set_value' },
    })
  }

  /**
   * Finds one LOV by identifier.
   *
   * @param id - Record identifier.
   * @param options - Whether to include soft-deleted records.
   * @returns The LOV, or `null` when it does not exist.
   */
  async findOne(id: string, options?: FindOneOptions): Promise<LOV | null> {
    const operation = `${OPERATION}.findOne`
    const objectId = toObjectId(id)
    if (!objectId) {
      return null
    }
    try {
      const filter = this.toFilter({
        _id: objectId,
        ...(options?.withSoft ? {} : { deleted_at: null }),
      })
      const record = await this.lovModel
        .findOne(filter)
        .lean<LovRecord>()
        .exec()
      return record ? toLov(record) : null
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Creates a LOV and records it. Timestamps come from the schema defaults.
   *
   * @param entity - LOV data to store.
   * @param id - Optional identifier; must be a 24-character hexadecimal ObjectId.
   * @returns The stored LOV.
   */
  async create(entity: NewEntity<LOV>, id?: string): Promise<LOV> {
    const operation = `${OPERATION}.create`
    const objectId = id === undefined ? undefined : toObjectId(id)
    if (objectId === null) {
      throw new RepositoryValidationError(`${operation}: invalid identifier`, {
        operation,
      })
    }
    try {
      return await this.transactions.run(async () => {
        const [document] = await this.lovModel.create([
          {
            group_name: entity.group_name,
            set_value: entity.set_value,
            description: entity.description,
            additional: entity.additional,
            ...(objectId ? { _id: objectId } : {}),
          },
        ])
        const after = toLov(document.toObject<LovRecord>())
        await this.changes.record({
          type: ENTITY_TYPE,
          before: null,
          after,
          classification: LovClassification,
          operation,
        })
        return after
      })
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Updates part of an active LOV and refreshes `updated_at`.
   *
   * @param id - Record identifier.
   * @param changes - Fields to change.
   * @returns The LOV after the change.
   */
  async update(id: string, changes: EntityChanges<LOV>): Promise<LOV> {
    const operation = `${OPERATION}.update`
    const objectId = this.requireObjectId(id, operation)
    const filter = this.toFilter({ _id: objectId, deleted_at: null })
    try {
      return await this.transactions.run(async () => {
        const before = await this.lovModel
          .findOne(filter)
          .lean<LovRecord>()
          .exec()
        if (!before) {
          throw new RepositoryNotFoundError(
            `${operation}: LOV ${id} not found`,
            { operation },
          )
        }
        const record = await this.lovModel
          .findOneAndUpdate(
            filter,
            { $set: { ...this.pickChanges(changes), updated_at: now() } },
            { returnDocument: 'after', runValidators: true },
          )
          .lean<LovRecord>()
          .exec()
        if (!record) {
          throw new RepositoryNotFoundError(
            `${operation}: LOV ${id} not found`,
            { operation },
          )
        }
        const after = toLov(record)
        await this.changes.record({
          type: ENTITY_TYPE,
          before: toLov(before),
          after,
          classification: LovClassification,
          operation,
        })
        return after
      })
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Permanently deletes a LOV, active or soft-deleted.
   *
   * @param id - Record identifier.
   */
  async delete(id: string): Promise<void> {
    const operation = `${OPERATION}.delete`
    const objectId = this.requireObjectId(id, operation)
    const filter = this.toFilter({ _id: objectId })
    try {
      await this.transactions.run(async () => {
        const before = await this.lovModel
          .findOne(filter)
          .lean<LovRecord>()
          .exec()
        if (!before) {
          throw new RepositoryNotFoundError(
            `${operation}: LOV ${id} not found`,
            { operation },
          )
        }
        await this.lovModel.deleteOne(filter).exec()
        await this.changes.record({
          type: ENTITY_TYPE,
          before: toLov(before),
          after: null,
          classification: LovClassification,
          operation,
        })
      })
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Marks an active LOV as deleted.
   *
   * @param id - Record identifier.
   */
  async deleteSoft(id: string): Promise<void> {
    const operation = `${OPERATION}.deleteSoft`
    const objectId = this.requireObjectId(id, operation)
    const filter = this.toFilter({ _id: objectId, deleted_at: null })
    try {
      await this.transactions.run(async () => {
        const before = await this.lovModel
          .findOne(filter)
          .lean<LovRecord>()
          .exec()
        if (!before) {
          throw new RepositoryNotFoundError(
            `${operation}: LOV ${id} not found`,
            { operation },
          )
        }
        const deletedAt = now()
        await this.lovModel
          .updateOne(filter, {
            $set: { deleted_at: deletedAt, updated_at: deletedAt },
          })
          .exec()
        const previous = toLov(before)
        await this.changes.record({
          type: ENTITY_TYPE,
          before: previous,
          after: { ...previous, deleted_at: deletedAt, updated_at: deletedAt },
          classification: LovClassification,
          operation,
        })
      })
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Converts an identifier, treating an invalid one as a missing record.
   *
   * @param id - Record identifier.
   * @param operation - Operation name for the error.
   * @returns The ObjectId.
   */
  private requireObjectId(id: string, operation: string): Types.ObjectId {
    const objectId = toObjectId(id)
    if (!objectId) {
      throw new RepositoryNotFoundError(`${operation}: LOV ${id} not found`, {
        operation,
      })
    }
    return objectId
  }

  /**
   * Keeps only the fields a caller may change, so ids and timestamps cannot be overwritten.
   *
   * @param changes - Fields the caller asked to change.
   * @returns The allowed fields that are set.
   */
  private pickChanges(changes: EntityChanges<LOV>): Partial<LovEntity> {
    const allowed: Partial<LovEntity> = {
      group_name: changes.group_name,
      set_value: changes.set_value,
      description: changes.description,
      additional: changes.additional,
    }
    return Object.fromEntries(
      Object.entries(allowed).filter(([, value]) => value !== undefined),
    )
  }

  /**
   * Types a filter built by the shared Mongo helpers for this model.
   * The helpers build filters from model field names, which Mongoose cannot check statically.
   *
   * @param filter - Mongo filter.
   * @returns The same filter, typed for the LOV model.
   */
  private toFilter(filter: Record<string, unknown>): QueryFilter<LovEntity> {
    return filter as QueryFilter<LovEntity>
  }
}
