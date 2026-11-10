import { Types } from 'mongoose'
import { RepositoryConflictError } from '@utility/database/error'
import {
  type Entity,
  type EntityChanges,
  type FindOneOptions,
  type ListQueryOptions,
  type NewEntity,
  type Page,
  type PaginatedQueryOptions,
  type QueryOptions,
  type Repository,
  type Timestamped,
  type UpdateOptions,
} from '@utility/database/interface'
import { systemActor, type ActorRef } from '@utility/history/actor'
import { getRequestContext } from '@utility/logger/context'

/**
 * Smallest model the in-memory repository can store.
 */
export type StoredModel = Entity &
  Timestamped & { version: number; created_by: ActorRef }

/**
 * Reads a field of a model by name.
 *
 * @param model - The model.
 * @param field - Field name.
 * @returns The field value.
 */
function read(model: object, field: string): unknown {
  return Reflect.get(model, field === 'id' ? 'id' : field)
}

/**
 * Checks one engine-neutral condition against a value.
 *
 * @param value - Field value.
 * @param condition - Conditions: `eq`, `ne`, `in`, `notIn`, `contains`, `startsWith`.
 * @returns `true` when all conditions hold.
 */
function matches(value: unknown, condition: Record<string, unknown>): boolean {
  return Object.entries(condition).every(([operator, expected]) => {
    switch (operator) {
      case 'eq':
        return expected === null ? value == null : value === expected
      case 'ne':
        return value !== expected
      case 'in':
        return Array.isArray(expected) && expected.includes(value)
      case 'notIn':
        return Array.isArray(expected) && !expected.includes(value)
      case 'contains':
        return (
          typeof value === 'string' &&
          typeof expected === 'string' &&
          value.toLowerCase().includes(expected.toLowerCase())
        )
      case 'startsWith':
        return (
          typeof value === 'string' &&
          typeof expected === 'string' &&
          value.toLowerCase().startsWith(expected.toLowerCase())
        )
      default:
        return expected === undefined
    }
  })
}

/**
 * Repository kept in memory, for tests that need real services without a database. It
 * follows the contract of `Repository`: soft-delete filtering, optimistic concurrency via
 * `expectedVersion`, `created_by` from the request context and a version counter that starts at 0
 * like the Mongo implementation. It records no change history.
 */
export class InMemoryRepository<
  M extends StoredModel,
> implements Repository<M> {
  protected readonly items = new Map<string, M>()

  /**
   * Returns one page of records.
   *
   * @param options - Query options with `withPagination: true`.
   * @returns The requested page.
   */
  findAll(options: PaginatedQueryOptions<M>): Promise<Page<M>>
  /**
   * Returns all matching records.
   *
   * @param options - Optional query options.
   * @returns The matching records.
   */
  findAll(options?: ListQueryOptions<M>): Promise<M[]>
  /**
   * Shared implementation of both overloads.
   *
   * @param options - Query options.
   * @returns The matching records or a page.
   */
  async findAll(
    options?: QueryOptions<M> & { withPagination?: boolean },
  ): Promise<M[] | Page<M>> {
    const where: Record<string, unknown> = { ...options?.where }
    const rows = [...this.items.values()]
      .filter((item) => options?.withSoft || !item.deleted_at)
      .filter((item) =>
        Object.entries(where).every(
          ([field, condition]) =>
            typeof condition !== 'object' ||
            condition === null ||
            matches(read(item, field), condition as Record<string, unknown>),
        ),
      )
      .map((item) => structuredClone(item))
    if (options?.orderBy) {
      const { field, direction } = options.orderBy
      rows.sort((left, right) => {
        const a = String(read(left, field))
        const b = String(read(right, field))
        return (direction === 'DESC' ? -1 : 1) * a.localeCompare(b)
      })
    }
    if (!options?.withPagination) {
      return rows
    }
    const limit = options.limit ?? 10
    const offset = options.offset ?? 0
    return {
      data: rows.slice(offset, offset + limit),
      totalRecords: rows.length,
      first: offset,
      rows: limit,
      totalPages: Math.ceil(rows.length / limit),
      currentPage: Math.floor(offset / limit) + 1,
    }
  }

  /**
   * Finds one record by identifier.
   *
   * @param id - Record identifier.
   * @param options - Whether to include soft-deleted records.
   * @returns The record, or `null`.
   */
  async findOne(id: string, options?: FindOneOptions): Promise<M | null> {
    const item = this.items.get(id)
    return item && (options?.withSoft || !item.deleted_at)
      ? structuredClone(item)
      : null
  }

  /**
   * Creates a record.
   *
   * @param entity - Data to store.
   * @param id - Optional identifier.
   * @returns The stored record.
   */
  async create(entity: NewEntity<M>, id?: string): Promise<M> {
    const now = new Date()
    // The model type cannot be built from its parts generically; the fields are exactly the ones the
    // Mongo repository stamps.
    const item = {
      ...entity,
      id: id ?? new Types.ObjectId().toHexString(),
      version: 0,
      schema_version: 1,
      created_by: getRequestContext()?.actor ?? systemActor('test'),
      created_at: now,
      updated_at: now,
      deleted_at: null,
    } as unknown as M
    this.items.set(item.id, item)
    return structuredClone(item)
  }

  /**
   * Updates a record.
   *
   * @param id - Record identifier.
   * @param changes - Fields to change.
   * @param options - Optional concurrency check.
   * @returns The updated record.
   */
  async update(
    id: string,
    changes: EntityChanges<M>,
    options?: UpdateOptions,
  ): Promise<M> {
    const item = this.items.get(id)
    if (!item || item.deleted_at) {
      throw new Error(`not found: ${id}`)
    }
    if (
      options?.expectedVersion !== undefined &&
      options.expectedVersion !== item.version
    ) {
      throw new RepositoryConflictError('stale version', {
        operation: 'InMemoryRepository.update',
      })
    }
    const defined = Object.fromEntries(
      Object.entries(changes).filter(([, value]) => value !== undefined),
    )
    const updated = {
      ...item,
      ...defined,
      version: item.version + 1,
      updated_at: new Date(),
    }
    this.items.set(id, updated)
    return structuredClone(updated)
  }

  /**
   * Deletes a record permanently.
   *
   * @param id - Record identifier.
   */
  async delete(id: string): Promise<void> {
    this.items.delete(id)
  }

  /**
   * Marks a record as deleted.
   *
   * @param id - Record identifier.
   */
  async deleteSoft(id: string): Promise<void> {
    const item = this.items.get(id)
    if (item) {
      this.items.set(id, { ...item, deleted_at: new Date() })
    }
  }

  /**
   * Finds the first stored record that matches a predicate.
   *
   * @param predicate - Condition on the model.
   * @returns A copy of the record, or `null`.
   */
  protected find(predicate: (item: M) => boolean): M | null {
    const item = [...this.items.values()].find(predicate)
    return item ? structuredClone(item) : null
  }

  /**
   * Lists the stored records that match a predicate.
   *
   * @param predicate - Condition on the model.
   * @returns Copies of the matching records.
   */
  protected filter(predicate: (item: M) => boolean): M[] {
    return [...this.items.values()]
      .filter(predicate)
      .map((item) => structuredClone(item))
  }
}
