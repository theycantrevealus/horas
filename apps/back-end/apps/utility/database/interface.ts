import { InjectionToken, ModuleMetadata, Type } from '@nestjs/common'

/**
 * One page of results. The field names match what the front-end table component expects.
 *
 * @property data - Records on the current page.
 * @property totalRecords - Number of records matching the query across all pages.
 * @property first - Index of the first record on the current page.
 * @property rows - Page size.
 * @property totalPages - Number of pages available.
 * @property currentPage - Current page number, starting at 1.
 */
export interface Page<T> {
  data: T[]
  totalRecords: number
  first: number
  rows: number
  totalPages: number
  currentPage: number
}

/**
 * Base shape of every model a repository stores.
 *
 * @property id - Engine-neutral identifier, always a string.
 */
export interface Entity {
  id: string
}

/**
 * Timestamp fields managed by repositories, never set by callers.
 *
 * @property created_at - Creation date.
 * @property updated_at - Last update date.
 * @property deleted_at - Soft-delete date, or `null` when active.
 */
export interface Timestamped {
  created_at?: Date
  updated_at?: Date
  deleted_at?: Date | null
}

/**
 * Data a caller provides to create a record: the model without its identifier and timestamps.
 */
export type NewEntity<T extends Entity> = Omit<T, 'id' | keyof Timestamped>

/**
 * Fields a caller may change on an existing record.
 */
export type EntityChanges<T extends Entity> = Partial<NewEntity<T>>

/**
 * Equality conditions available on every field.
 *
 * @property eq - Field equals the value (`null` matches empty fields).
 * @property ne - Field differs from the value.
 * @property in - Field equals one of the values.
 * @property notIn - Field equals none of the values.
 */
export interface EqualityCondition<V> {
  eq?: V | null
  ne?: V | null
  in?: V[]
  notIn?: V[]
}

/**
 * Range conditions available on string, number and date fields.
 *
 * @property gt - Field is greater than the value.
 * @property gte - Field is greater than or equal to the value.
 * @property lt - Field is less than the value.
 * @property lte - Field is less than or equal to the value.
 */
export interface RangeCondition<V> {
  gt?: V
  gte?: V
  lt?: V
  lte?: V
}

/**
 * Case-insensitive text conditions available on string fields. Use at most one per field.
 *
 * @property contains - Field contains the text.
 * @property startsWith - Field starts with the text.
 */
export interface TextCondition {
  contains?: string
  startsWith?: string
}

/**
 * Conditions allowed on one field, chosen from the field's type.
 */
export type FieldCondition<V> = EqualityCondition<NonNullable<V>> &
  ([NonNullable<V>] extends [string | number | Date]
    ? RangeCondition<NonNullable<V>>
    : Record<never, never>) &
  ([NonNullable<V>] extends [string] ? TextCondition : Record<never, never>)

/**
 * Engine-neutral filter: model field names mapped to conditions. All conditions must match.
 */
export type Filter<T> = { [K in keyof T]?: FieldCondition<T[K]> }

/**
 * Sort order on one model field.
 *
 * @property field - Model field to sort by.
 * @property direction - `ASC` (default) or `DESC`.
 */
export interface SortOrder<T> {
  field: keyof T & string
  direction?: 'ASC' | 'DESC'
}

/**
 * Filter, sort and paging options shared by every repository.
 *
 * @property where - Conditions every returned record must match.
 * @property withSoft - Include soft-deleted records when true.
 * @property limit - Maximum number of records to return (page size when paginating).
 * @property offset - Number of records to skip.
 * @property orderBy - Field and direction to sort by.
 */
export interface QueryOptions<T> {
  where?: Filter<T>
  withSoft?: boolean
  limit?: number
  offset?: number
  orderBy?: SortOrder<T>
}

/**
 * Query options that ask for a paginated result.
 *
 * @property withPagination - Must be `true`; the result is a `Page`.
 */
export interface PaginatedQueryOptions<T> extends QueryOptions<T> {
  withPagination: true
}

/**
 * Query options that ask for a plain list.
 *
 * @property withPagination - Omitted or `false`; the result is an array.
 */
export interface ListQueryOptions<T> extends QueryOptions<T> {
  withPagination?: false
}

/**
 * Options for reading one record.
 *
 * @property withSoft - Return the record even when it is soft-deleted.
 */
export interface FindOneOptions {
  withSoft?: boolean
}

/**
 * Storage-agnostic data-access contract. Each database engine provides its own implementation.
 * Implementations reject with `RepositoryError` subclasses, never with driver errors.
 */
export interface Repository<T extends Entity> {
  /**
   * Returns one page of records.
   *
   * @param options - Query options with `withPagination: true`.
   * @returns The requested page and its paging metadata.
   */
  findAll(options: PaginatedQueryOptions<T>): Promise<Page<T>>
  /**
   * Returns all matching records.
   *
   * @param options - Optional query options without pagination.
   * @returns The matching records.
   */
  findAll(options?: ListQueryOptions<T>): Promise<T[]>
  /**
   * Finds one record by its identifier.
   *
   * @param id - Record identifier.
   * @param options - Whether to include soft-deleted records.
   * @returns The record, or `null` when it does not exist.
   */
  findOne(id: string, options?: FindOneOptions): Promise<T | null>
  /**
   * Creates a record. The repository sets the identifier (unless given) and the timestamps.
   *
   * @param entity - Data to store.
   * @param id - Optional identifier to use instead of a generated one.
   * @returns The stored record.
   */
  create(entity: NewEntity<T>, id?: string): Promise<T>
  /**
   * Updates part of an active record.
   *
   * @param id - Record identifier.
   * @param changes - Fields to change.
   * @returns The record after the change.
   */
  update(id: string, changes: EntityChanges<T>): Promise<T>
  /**
   * Permanently deletes a record.
   *
   * @param id - Record identifier.
   */
  delete(id: string): Promise<void>
  /**
   * Marks an active record as deleted without removing it.
   *
   * @param id - Record identifier.
   */
  deleteSoft(id: string): Promise<void>
}

/**
 * Links a repository injection token to the class that implements it.
 *
 * @property provide - Token that consumers inject.
 * @property useClass - Repository implementation Nest instantiates for the token.
 */
export interface RepositoryBinding {
  provide: InjectionToken
  useClass: Type<Repository<Entity>>
}

/**
 * Everything one feature needs from the data layer.
 *
 * @property imports - Modules the repositories depend on, for example `MongooseModule.forFeature(...)` and `ChangeHistoryModule`.
 * @property repositories - Token-to-class bindings to provide and export.
 */
export interface RepositoryFeatureOptions {
  imports?: ModuleMetadata['imports']
  repositories: RepositoryBinding[]
}
