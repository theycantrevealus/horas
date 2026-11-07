import { Model, QueryFilter, Types } from 'mongoose'
import {
  DEFAULT_PAGE_SIZE,
  MONGO_MAIN_CONNECTION,
} from '@utility/database/constant'
import {
  RepositoryConflictError,
  RepositoryError,
  RepositoryNotFoundError,
  RepositoryValidationError,
} from '@utility/database/error'
import {
  Entity,
  EntityChanges,
  FindOneOptions,
  ListQueryOptions,
  NewEntity,
  Page,
  PaginatedQueryOptions,
  Repository,
  Timestamped,
  UpdateOptions,
} from '@utility/database/interface'
import { translateMongoError } from '@utility/database/mongo.error'
import {
  toMongoFilter,
  toMongoSort,
  toObjectId,
  toPage,
} from '@utility/database/mongo.query'
import { type TransactionManager } from '@utility/database/transaction'
import {
  type ChangeRecorder,
  type RecordableEntity,
} from '@utility/history/recorder'
import { type FieldClassification } from '@utility/history/record'
import { getRequestContext } from '@utility/logger/context'
import { type ActorRef } from '@utility/history/actor'

/**
 * Version of the stored shape written by this code, so documents can be migrated lazily.
 */
export const CURRENT_SCHEMA_VERSION = 1

/**
 * Connection every identity repository uses.
 */
export { MONGO_MAIN_CONNECTION }

/**
 * Smallest shape a model needs to use the shared Mongo repository.
 */
export type StoredModel = Entity & Timestamped & RecordableEntity

/**
 * A stored document as returned by a lean query.
 */
export type LeanRecord<E> = E & { _id: Types.ObjectId }

/**
 * Behaviour that differs between repositories.
 *
 * @property name - Repository name used in operations and logs, for example `AccountRepository`.
 * @property entityType - Stable entity name in the change history, for example `account`.
 * @property classification - Field classification; when omitted the collection is not business data and writes are not recorded.
 * @property allowUpdate - Whether `update` is supported.
 * @property allowDelete - Whether `delete` is supported.
 * @property allowSoftDelete - Whether `deleteSoft` is supported.
 * @property updatableFields - Model fields a caller may change; anything else is ignored.
 */
export interface MongoRepositoryOptions<M extends StoredModel> {
  name: string
  entityType: string
  classification?: FieldClassification<M>
  allowUpdate: boolean
  allowDelete: boolean
  allowSoftDelete: boolean
  updatableFields: readonly string[]
}

/**
 * Fields the repository sets itself, which a caller can never provide on create.
 */
const MANAGED_FIELDS = [
  'id',
  '_id',
  'created_at',
  'updated_at',
  'deleted_at',
  'version',
  'schema_version',
  'created_by',
]

/**
 * Shared MongoDB implementation of the repository contract for identity collections.
 * It implements paging, soft delete, optimistic concurrency, actor stamping and change recording once,
 * so a concrete repository only maps between the model and the stored document and adds named queries.
 *
 * Every write runs in one `TransactionManager.run`: read the stored state, write, record the change
 * (`database.md` 6.1). Timestamps are real UTC instants (`database.md` 4.4).
 */
export abstract class MongoRepositoryBase<
  M extends StoredModel,
  E extends object,
> implements Repository<M> {
  /**
   * @param model - Mongoose model of the collection on the main connection.
   * @param transactions - Transaction manager of the main connection.
   * @param changes - Recorder of the change history.
   * @param options - Behaviour of this repository.
   */
  protected constructor(
    protected readonly model: Model<E>,
    protected readonly transactions: TransactionManager,
    protected readonly changes: ChangeRecorder,
    protected readonly options: MongoRepositoryOptions<M>,
  ) {}

  /**
   * Converts a stored document to the engine-neutral model, copying only model fields.
   *
   * @param record - Lean stored document.
   * @returns The model.
   */
  protected abstract toModel(record: LeanRecord<E>): M

  /**
   * Returns one page of records.
   *
   * @param options - Query options with `withPagination: true`.
   * @returns The requested page and its paging metadata.
   */
  findAll(options: PaginatedQueryOptions<M>): Promise<Page<M>>
  /**
   * Returns all matching records.
   *
   * @param options - Optional query options without pagination.
   * @returns The matching records.
   */
  findAll(options?: ListQueryOptions<M>): Promise<M[]>
  /**
   * Shared implementation of both `findAll` overloads.
   *
   * @param options - Query options.
   * @returns The matching records or one page of them.
   */
  async findAll(
    options?: PaginatedQueryOptions<M> | ListQueryOptions<M>,
  ): Promise<M[] | Page<M>> {
    const operation = `${this.options.name}.findAll`
    try {
      const filter = this.toFilter(
        toMongoFilter(options?.where, options?.withSoft, operation),
      )
      const sort = toMongoSort(options?.orderBy)

      if (options?.withPagination) {
        const limit = options.limit ?? DEFAULT_PAGE_SIZE
        const offset = options.offset ?? 0
        // Sequential on purpose: a transaction session does not allow parallel operations.
        const records = await this.model
          .find(filter)
          .sort(sort)
          .skip(offset)
          .limit(limit)
          .lean<LeanRecord<E>[]>()
          .exec()
        const total = await this.model.countDocuments(filter).exec()
        return toPage(
          records.map((record) => this.toModel(record)),
          total,
          offset,
          limit,
        )
      }

      const query = this.model.find(filter).sort(sort)
      if (options?.offset) {
        query.skip(options.offset)
      }
      if (options?.limit) {
        query.limit(options.limit)
      }
      const records = await query.lean<LeanRecord<E>[]>().exec()
      return records.map((record) => this.toModel(record))
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Finds one record by identifier.
   *
   * @param id - Record identifier.
   * @param options - Whether to include soft-deleted records.
   * @returns The record, or `null` when it does not exist.
   */
  async findOne(id: string, options?: FindOneOptions): Promise<M | null> {
    const operation = `${this.options.name}.findOne`
    const objectId = toObjectId(id)
    if (!objectId) {
      return null
    }
    try {
      const record = await this.model
        .findOne(
          this.toFilter({
            _id: objectId,
            ...(options?.withSoft ? {} : { deleted_at: null }),
          }),
        )
        .lean<LeanRecord<E>>()
        .exec()
      return record ? this.toModel(record) : null
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Creates a record, stamping the schema version and the acting account, and records the change.
   * Rejects with `RepositoryError` when the request context has no actor.
   *
   * @param entity - Data to store.
   * @param id - Optional identifier; must be a 24-character hexadecimal ObjectId.
   * @returns The stored record.
   */
  async create(entity: NewEntity<M>, id?: string): Promise<M> {
    const operation = `${this.options.name}.create`
    const objectId = id === undefined ? undefined : toObjectId(id)
    if (objectId === null) {
      throw new RepositoryValidationError(`${operation}: invalid identifier`, {
        operation,
      })
    }
    const actor = this.requireActor(operation)
    const values = Object.fromEntries(
      Object.entries(entity).filter(([key]) => !MANAGED_FIELDS.includes(key)),
    )
    try {
      return await this.transactions.run(async () => {
        const [document] = await this.model.create([
          this.asDocument({
            ...values,
            schema_version: CURRENT_SCHEMA_VERSION,
            created_by: actor,
            ...(objectId ? { _id: objectId } : {}),
          }),
        ])
        const after = this.toModel(document.toObject<LeanRecord<E>>())
        await this.record(null, after, operation)
        return after
      })
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Updates part of an active record, refreshes `updated_at`, increments `version` and records the change.
   *
   * @param id - Record identifier.
   * @param changes - Fields to change; fields outside `updatableFields` are ignored.
   * @param options - With `expectedVersion`, rejects with `RepositoryConflictError` when the stored version differs.
   * @returns The record after the change.
   */
  async update(
    id: string,
    changes: EntityChanges<M>,
    options?: UpdateOptions,
  ): Promise<M> {
    const operation = `${this.options.name}.update`
    this.requireSupported(this.options.allowUpdate, 'update', operation)
    const objectId = this.requireObjectId(id, operation)
    const filter = this.toFilter({ _id: objectId, deleted_at: null })
    const expected = options?.expectedVersion
    try {
      return await this.transactions.run(async () => {
        const before = await this.model
          .findOne(filter)
          .lean<LeanRecord<E>>()
          .exec()
        if (!before) {
          throw this.notFound(id, operation)
        }
        const guarded = this.toFilter({
          _id: objectId,
          deleted_at: null,
          ...(expected === undefined ? {} : { version: expected }),
        })
        const record = await this.model
          .findOneAndUpdate(
            guarded,
            {
              $set: { ...this.pickChanges(changes), updated_at: new Date() },
              $inc: { version: 1 },
            },
            { returnDocument: 'after', runValidators: true },
          )
          .lean<LeanRecord<E>>()
          .exec()
        if (!record) {
          throw expected === undefined
            ? this.notFound(id, operation)
            : new RepositoryConflictError(
                `${operation}: ${this.options.entityType} ${id} was changed by someone else`,
                { operation },
              )
        }
        const after = this.toModel(record)
        await this.record(this.toModel(before), after, operation)
        return after
      })
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Permanently deletes a record, active or soft-deleted, and records the deletion.
   *
   * @param id - Record identifier.
   */
  async delete(id: string): Promise<void> {
    const operation = `${this.options.name}.delete`
    this.requireSupported(this.options.allowDelete, 'delete', operation)
    const objectId = this.requireObjectId(id, operation)
    const filter = this.toFilter({ _id: objectId })
    try {
      await this.transactions.run(async () => {
        const before = await this.model
          .findOne(filter)
          .lean<LeanRecord<E>>()
          .exec()
        if (!before) {
          throw this.notFound(id, operation)
        }
        await this.model.deleteOne(filter).exec()
        await this.record(this.toModel(before), null, operation)
      })
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Marks an active record as deleted and records the change.
   *
   * @param id - Record identifier.
   */
  async deleteSoft(id: string): Promise<void> {
    const operation = `${this.options.name}.deleteSoft`
    this.requireSupported(
      this.options.allowSoftDelete,
      'soft delete',
      operation,
    )
    const objectId = this.requireObjectId(id, operation)
    const filter = this.toFilter({ _id: objectId, deleted_at: null })
    try {
      await this.transactions.run(async () => {
        const before = await this.model
          .findOne(filter)
          .lean<LeanRecord<E>>()
          .exec()
        if (!before) {
          throw this.notFound(id, operation)
        }
        const deletedAt = new Date()
        await this.model
          .updateOne(filter, {
            $set: { deleted_at: deletedAt, updated_at: deletedAt },
            $inc: { version: 1 },
          })
          .exec()
        const previous = this.toModel(before)
        await this.record(
          previous,
          { ...previous, deleted_at: deletedAt, updated_at: deletedAt },
          operation,
        )
      })
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Records a change in the change history, unless this collection is not business data.
   *
   * @param before - State before the write, or `null` for a create.
   * @param after - State after the write, or `null` for a delete.
   * @param operation - Operation that wrote.
   */
  protected async record(
    before: M | null,
    after: M | null,
    operation: string,
  ): Promise<void> {
    const classification = this.options.classification
    if (!classification) {
      return
    }
    await this.changes.record({
      type: this.options.entityType,
      before,
      after,
      classification,
      operation,
    })
  }

  /**
   * Reads the acting account from the request context.
   *
   * @param operation - Operation name for the error.
   * @returns The actor.
   * @throws RepositoryError when the context has no actor, so no record is created without an author.
   */
  protected requireActor(operation: string): ActorRef {
    const actor = getRequestContext()?.actor
    if (!actor) {
      throw new RepositoryError(
        `${operation}: no actor in the request context`,
        {
          operation,
        },
      )
    }
    return actor
  }

  /**
   * Converts an identifier, treating an invalid one as a missing record.
   *
   * @param id - Record identifier.
   * @param operation - Operation name for the error.
   * @returns The ObjectId.
   */
  protected requireObjectId(id: string, operation: string): Types.ObjectId {
    const objectId = toObjectId(id)
    if (!objectId) {
      throw this.notFound(id, operation)
    }
    return objectId
  }

  /**
   * Builds the error for a missing record. The message holds the identifier but no document values.
   *
   * @param id - Record identifier.
   * @param operation - Operation name.
   * @returns The error to throw.
   */
  protected notFound(id: string, operation: string): RepositoryNotFoundError {
    return new RepositoryNotFoundError(
      `${operation}: ${this.options.entityType} ${id} not found`,
      { operation },
    )
  }

  /**
   * Rejects an operation this collection does not support.
   *
   * @param allowed - Whether the operation is supported.
   * @param what - Operation description for the message.
   * @param operation - Operation name.
   */
  private requireSupported(
    allowed: boolean,
    what: string,
    operation: string,
  ): void {
    if (!allowed) {
      throw new RepositoryValidationError(
        `${operation}: ${what} is not supported on ${this.options.entityType}`,
        { operation },
      )
    }
  }

  /**
   * Keeps only the fields a caller may change, so ids, tenant, counters and timestamps cannot be overwritten.
   *
   * @param changes - Fields the caller asked to change.
   * @returns The allowed fields that are set.
   */
  protected pickChanges(changes: EntityChanges<M>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(changes).filter(
        ([key, value]) =>
          value !== undefined && this.options.updatableFields.includes(key),
      ),
    )
  }

  /**
   * Types a filter built from model field names for this collection.
   * Mongoose cannot check model field names against the storage shape statically.
   *
   * @param filter - Mongo filter.
   * @returns The same filter, typed for the collection.
   */
  protected toFilter(filter: Record<string, unknown>): QueryFilter<E> {
    return filter as QueryFilter<E>
  }

  /**
   * Types a document to create. Mongoose validates the content against the schema at runtime;
   * the static type cannot express which model fields map to which stored fields.
   *
   * @param values - Document values.
   * @returns The same values, typed for the collection.
   */
  protected asDocument(values: Record<string, unknown>): Partial<E> {
    return values as Partial<E>
  }
}
