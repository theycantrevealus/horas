import {
  DATA_CLASSES,
  DataClass,
  FieldChange,
  FieldClassification,
  MaskedValue,
} from './record'

/**
 * Fields that are never listed in `changes`: the record itself carries the identifier,
 * time, version and tenant, and the action says whether the entity was (un)deleted.
 */
const IGNORED_ROOT_FIELDS = new Set([
  'id',
  'tenant_id',
  'version',
  'schema_version',
  'created_at',
  'updated_at',
  'deleted_at',
])

/**
 * Field that marks an object as having a display-safe masked form, such as `PersonIdentifier.value_masked`.
 */
const MASKED_FORM_FIELD = 'value_masked'

/**
 * Placeholder for a value that is omitted entirely.
 */
const CHANGED: MaskedValue = { masked: 'changed' }

/**
 * A plain object.
 */
type PlainObject = Record<string, unknown>

/**
 * Checks whether a value is a plain object (not an array, date or binary value).
 *
 * @param value - Value to check.
 * @returns `true` for plain objects.
 */
function isPlainObject(value: unknown): value is PlainObject {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Date) &&
    !(value instanceof Uint8Array)
  )
}

/**
 * Checks whether an object provides a masked form for display.
 *
 * @param value - Value to check.
 * @returns `true` when the object has a string `value_masked`.
 */
function hasMaskedForm(value: unknown): value is PlainObject {
  return isPlainObject(value) && typeof value[MASKED_FORM_FIELD] === 'string'
}

/**
 * Converts a value to the JSON form stored in the change log: dates become ISO strings,
 * identifiers become strings, binary values become a placeholder, `undefined` becomes `null`.
 *
 * @param value - Value to convert.
 * @returns The JSON-safe value.
 */
export function normalizeValue(value: unknown): unknown {
  if (value === undefined || value === null) {
    return null
  }
  if (value instanceof Date) {
    return value.toISOString()
  }
  if (value instanceof Uint8Array) {
    return CHANGED
  }
  if (typeof value === 'bigint') {
    return value.toString()
  }
  if (Array.isArray(value)) {
    return value.map(normalizeValue)
  }
  if (typeof value === 'object') {
    if ('toHexString' in value && typeof value.toHexString === 'function') {
      return String(value.toHexString())
    }
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, normalizeValue(item)]),
    )
  }
  return value
}

/**
 * Compares two values by their normalized JSON form, ignoring key order.
 *
 * @param left - First value.
 * @param right - Second value.
 * @returns `true` when both hold the same data.
 */
function isSameValue(left: unknown, right: unknown): boolean {
  return canonical(normalizeValue(left)) === canonical(normalizeValue(right))
}

/**
 * Serializes a normalized value with sorted keys, so equal data gives equal text.
 *
 * @param value - Normalized value.
 * @returns Canonical JSON text.
 */
function canonical(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonical).join(',')}]`
  }
  if (isPlainObject(value)) {
    const keys = Object.keys(value).sort()
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

/**
 * Checks whether a value counts as empty for a `create` (nothing to list).
 *
 * @param value - Value to check.
 * @returns `true` for `null`, `undefined`, empty strings, arrays and objects.
 */
function isEmpty(value: unknown): boolean {
  if (value === undefined || value === null || value === '') {
    return true
  }
  if (Array.isArray(value)) {
    return value.length === 0
  }
  return isPlainObject(value) && Object.keys(value).length === 0
}

/**
 * Returns the more sensitive of two classes.
 *
 * @param left - First class.
 * @param right - Second class.
 * @returns The higher class.
 */
export function higherClass(left: DataClass, right: DataClass): DataClass {
  return DATA_CLASSES.indexOf(left) >= DATA_CLASSES.indexOf(right)
    ? left
    : right
}

/**
 * Diffs one entity and masks every value by its field class.
 */
class EntityDiff<T> {
  private readonly changes: FieldChange[] = []

  /**
   * @param classification - Field classification of the model.
   */
  constructor(private readonly classification: FieldClassification<T>) {}

  /**
   * Compares two states of an entity.
   *
   * @param before - State before the write, or `null` for a create.
   * @param after - State after the write, or `null` for a delete.
   * @returns The changed fields, masked.
   */
  run(before: PlainObject | null, after: PlainObject | null): FieldChange[] {
    const keys = new Set([
      ...Object.keys(before ?? {}),
      ...Object.keys(after ?? {}),
    ])
    for (const key of [...keys].sort()) {
      if (!IGNORED_ROOT_FIELDS.has(key)) {
        this.compare(key, key, before?.[key], after?.[key])
      }
    }
    return this.changes
  }

  /**
   * Compares one value and records the differences under `path`.
   *
   * @param path - Path of the value, with array item keys.
   * @param classPath - Path without array item keys, used to look up the class.
   * @param before - Value before.
   * @param after - Value after.
   */
  private compare(
    path: string,
    classPath: string,
    before: unknown,
    after: unknown,
  ): void {
    if (isSameValue(before, after)) {
      return
    }
    if (hasMaskedForm(before) || hasMaskedForm(after)) {
      this.push(path, classPath, before, after)
      return
    }
    const bothObjects =
      (isPlainObject(before) || before == null) &&
      (isPlainObject(after) || after == null) &&
      (isPlainObject(before) || isPlainObject(after))
    if (bothObjects) {
      this.compareObjects(path, classPath, before ?? {}, after ?? {})
      return
    }
    const itemKeys = this.arrayKeysOf(classPath)
    if (
      itemKeys &&
      (Array.isArray(before) || before == null) &&
      (Array.isArray(after) || after == null)
    ) {
      this.compareArrays(path, classPath, itemKeys, before ?? [], after ?? [])
      return
    }
    this.push(path, classPath, before, after)
  }

  /**
   * Compares two objects field by field.
   *
   * @param path - Path of the objects.
   * @param classPath - Path without array item keys.
   * @param before - Object before (empty when it did not exist).
   * @param after - Object after (empty when it was removed).
   */
  private compareObjects(
    path: string,
    classPath: string,
    before: unknown,
    after: unknown,
  ): void {
    const left = isPlainObject(before) ? before : {}
    const right = isPlainObject(after) ? after : {}
    const keys = new Set([...Object.keys(left), ...Object.keys(right)])
    for (const key of [...keys].sort()) {
      this.compare(
        `${path}.${key}`,
        `${classPath}.${key}`,
        left[key],
        right[key],
      )
    }
  }

  /**
   * Compares two object arrays item by item, matching items by their declared key,
   * so reordering is not a change.
   *
   * @param path - Path of the arrays.
   * @param classPath - Path without array item keys.
   * @param itemKeys - Item fields that identify an item.
   * @param before - Items before.
   * @param after - Items after.
   */
  private compareArrays(
    path: string,
    classPath: string,
    itemKeys: readonly string[],
    before: unknown[],
    after: unknown[],
  ): void {
    const left = this.indexItems(before, itemKeys)
    const right = this.indexItems(after, itemKeys)
    if (!left || !right) {
      this.push(path, classPath, before, after)
      return
    }
    const keys = new Set([...left.keys(), ...right.keys()])
    for (const key of [...keys].sort()) {
      this.compare(`${path}[${key}]`, classPath, left.get(key), right.get(key))
    }
  }

  /**
   * Indexes array items by their key, for example `type=email,normalized=a@b.c`.
   *
   * @param items - Array items.
   * @param itemKeys - Item fields that identify an item.
   * @returns The items by key, or `null` when an item is not an object or keys repeat.
   */
  private indexItems(
    items: unknown[],
    itemKeys: readonly string[],
  ): Map<string, unknown> | null {
    const index = new Map<string, unknown>()
    for (const item of items) {
      if (!isPlainObject(item)) {
        return null
      }
      const key = itemKeys
        .map((field) => `${field}=${String(normalizeValue(item[field]))}`)
        .join(',')
      if (index.has(key)) {
        return null
      }
      index.set(key, item)
    }
    return index
  }

  /**
   * Records one changed value, masked by its class.
   *
   * @param path - Path of the value.
   * @param classPath - Path without array item keys.
   * @param before - Value before.
   * @param after - Value after.
   */
  private push(
    path: string,
    classPath: string,
    before: unknown,
    after: unknown,
  ): void {
    const dataClass = this.classOf(classPath)
    this.changes.push({
      path,
      class: dataClass,
      before: maskValue(before, dataClass),
      after: maskValue(after, dataClass),
    })
  }

  /**
   * Finds the class of a path: the longest declared path that matches, else the default.
   *
   * @param classPath - Path without array item keys.
   * @returns The data class.
   */
  private classOf(classPath: string): DataClass {
    const fields: Readonly<Record<string, DataClass | undefined>> =
      this.classification.fields ?? {}
    const parts = classPath.split('.')
    for (let length = parts.length; length > 0; length--) {
      const declared = fields[parts.slice(0, length).join('.')]
      if (declared) {
        return declared
      }
    }
    return this.classification.default
  }

  /**
   * Finds the declared item key of an object array.
   *
   * @param classPath - Path of the array without item keys.
   * @returns The item key fields, or `undefined` when none is declared.
   */
  private arrayKeysOf(classPath: string): readonly string[] | undefined {
    const arrayKeys: Readonly<Record<string, readonly string[] | undefined>> =
      this.classification.arrayKeys ?? {}
    return arrayKeys[classPath]
  }
}

/**
 * Classes whose values are stored in plain form.
 */
const PLAIN_CLASSES: ReadonlySet<DataClass> = new Set(['public', 'internal'])

/**
 * Masks one value for the change log by its class (design section 4.1):
 *
 * - `public`, `internal`: the plain value.
 * - `confidential`: the masked form (`value_masked`) when the value has one, else `changed`.
 * - `highly_confidential`, `secret`: always `changed`.
 *
 * A value with a masked form never appears in plain form, whatever its class, because it also
 * holds the encrypted value and its hash. Empty values stay `null`: absence reveals nothing.
 *
 * @param value - Value to store.
 * @param dataClass - Class of the field.
 * @returns The value as stored in the change log.
 */
export function maskValue(value: unknown, dataClass: DataClass): unknown {
  if (value === undefined || value === null) {
    return null
  }
  const showsMaskedForm =
    PLAIN_CLASSES.has(dataClass) || dataClass === 'confidential'
  if (hasMaskedForm(value)) {
    return showsMaskedForm
      ? { masked: 'partial', display: String(value[MASKED_FORM_FIELD]) }
      : CHANGED
  }
  return PLAIN_CLASSES.has(dataClass) ? normalizeValue(value) : CHANGED
}

/**
 * Lists the changed fields between two states of an entity, masked by field class.
 * A create (`before` is `null`) lists every non-empty field; a delete (`after` is `null`)
 * lists none, because earlier records already hold the history.
 *
 * @param before - Model before the write, or `null`.
 * @param after - Model after the write, or `null`.
 * @param classification - Field classification of the model.
 * @returns The changed fields; empty when nothing changed.
 */
export function diffEntity<T extends object>(
  before: T | null,
  after: T | null,
  classification: FieldClassification<T>,
): FieldChange[] {
  if (after === null) {
    return []
  }
  const right = toPlain(after)
  if (before === null) {
    const nonEmpty = Object.fromEntries(
      Object.entries(right).filter(([, value]) => !isEmpty(value)),
    )
    return new EntityDiff(classification).run(null, nonEmpty)
  }
  return new EntityDiff(classification).run(toPlain(before), right)
}

/**
 * Reads a model as a plain object.
 *
 * @param model - Model instance or object.
 * @returns Its own enumerable fields.
 */
function toPlain(model: object): PlainObject {
  return Object.fromEntries(Object.entries(model))
}
