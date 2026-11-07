import { Types } from 'mongoose'
import { RepositoryValidationError } from './error'
import { Filter, Page, SortOrder } from './interface'

/**
 * Mongo operator for each engine-neutral comparison operator.
 */
const COMPARISON_OPERATORS: Readonly<Record<string, string>> = {
  eq: '$eq',
  ne: '$ne',
  in: '$in',
  notIn: '$nin',
  gt: '$gt',
  gte: '$gte',
  lt: '$lt',
  lte: '$lte',
}

/**
 * Engine-neutral text operators, translated to case-insensitive regular expressions.
 */
const TEXT_OPERATORS = new Set(['contains', 'startsWith'])

/**
 * Pattern of a MongoDB ObjectId in hexadecimal form.
 */
const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i

/**
 * Checks whether a value is a plain object.
 *
 * @param value - Value to check.
 * @returns `true` when the value is a non-array object.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Escapes characters that have a meaning in regular expressions.
 *
 * @param text - Text to search for literally.
 * @returns The escaped text.
 */
function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Converts a model identifier to a Mongo ObjectId.
 *
 * @param id - Model identifier.
 * @returns The ObjectId, or `null` when `id` is not a valid ObjectId (such an id can never match).
 */
export function toObjectId(id: string): Types.ObjectId | null {
  return OBJECT_ID_PATTERN.test(id) ? new Types.ObjectId(id) : null
}

/**
 * Maps a model field name to its Mongo field name.
 *
 * @param field - Model field name.
 * @returns `_id` for `id`, otherwise the same name.
 */
function toMongoField(field: string): string {
  return field === 'id' ? '_id' : field
}

/**
 * Converts one condition value, turning identifiers into ObjectIds.
 *
 * @param field - Model field the value belongs to.
 * @param value - Condition value.
 * @returns The value in Mongo form.
 */
function toMongoValue(field: string, value: unknown): unknown {
  return field === 'id' && typeof value === 'string' ? toObjectId(value) : value
}

/**
 * Translates the conditions of one field to Mongo operators.
 *
 * @param field - Model field name.
 * @param condition - Engine-neutral conditions for the field.
 * @param operation - Operation name, used in validation errors.
 * @returns Mongo operators for the field.
 */
function toMongoCondition(
  field: string,
  condition: Record<string, unknown>,
  operation: string,
): Record<string, unknown> {
  const operators: Record<string, unknown> = {}
  let textOperators = 0

  for (const [operator, value] of Object.entries(condition)) {
    if (value === undefined) {
      continue
    }
    if (TEXT_OPERATORS.has(operator)) {
      if (typeof value !== 'string') {
        throw new RepositoryValidationError(
          `${operation}: ${operator} on ${field} needs text`,
          {
            operation,
          },
        )
      }
      textOperators += 1
      const pattern = escapeRegExp(value)
      operators.$regex = operator === 'startsWith' ? `^${pattern}` : pattern
      operators.$options = 'i'
      continue
    }
    const mongoOperator = COMPARISON_OPERATORS[operator]
    if (!mongoOperator) {
      throw new RepositoryValidationError(
        `${operation}: unknown filter operator on ${field}`,
        {
          operation,
        },
      )
    }
    operators[mongoOperator] = Array.isArray(value)
      ? value.map((item: unknown) => toMongoValue(field, item))
      : toMongoValue(field, value)
  }

  if (textOperators > 1) {
    throw new RepositoryValidationError(
      `${operation}: use one text operator per field (${field})`,
      {
        operation,
      },
    )
  }
  return operators
}

/**
 * Translates an engine-neutral filter into a Mongo filter.
 * Soft-deleted records are excluded unless `withSoft` is true or the filter sets `deleted_at` itself.
 *
 * @param where - Engine-neutral filter.
 * @param withSoft - Include soft-deleted records.
 * @param operation - Operation name, used in validation errors.
 * @returns The Mongo filter.
 */
export function toMongoFilter<T>(
  where: Filter<T> | undefined,
  withSoft: boolean | undefined,
  operation: string,
): Record<string, unknown> {
  const filter: Record<string, unknown> = {}

  for (const [field, condition] of Object.entries(where ?? {})) {
    if (!isRecord(condition)) {
      continue
    }
    const operators = toMongoCondition(field, condition, operation)
    if (Object.keys(operators).length > 0) {
      filter[toMongoField(field)] = operators
    }
  }

  if (!withSoft && !('deleted_at' in filter)) {
    filter.deleted_at = null
  }
  return filter
}

/**
 * Translates an engine-neutral sort order into a Mongo sort.
 * `_id` is always added last, so pages stay stable when sort values repeat.
 *
 * @param orderBy - Engine-neutral sort order.
 * @returns The Mongo sort specification.
 */
export function toMongoSort<T>(
  orderBy: SortOrder<T> | undefined,
): Record<string, 1 | -1> {
  const sort: Record<string, 1 | -1> = {}
  if (orderBy) {
    sort[toMongoField(orderBy.field)] = orderBy.direction === 'DESC' ? -1 : 1
  }
  if (!('_id' in sort)) {
    sort._id = 1
  }
  return sort
}

/**
 * Builds a page from the records of one page and the total count.
 *
 * @param data - Records on the page.
 * @param totalRecords - Number of records matching the query.
 * @param offset - Index of the first record on the page.
 * @param limit - Page size.
 * @returns The page with its metadata.
 */
export function toPage<T>(
  data: T[],
  totalRecords: number,
  offset: number,
  limit: number,
): Page<T> {
  return {
    data,
    totalRecords,
    first: offset,
    rows: limit,
    totalPages: Math.ceil(totalRecords / limit),
    currentPage: Math.floor(offset / limit) + 1,
  }
}
