import { randomUUID } from 'node:crypto'
import { Inject, Injectable } from '@nestjs/common'
import {
  ChangeLogConfig,
  type ChangeLogConfigType,
} from '@configuration/change-log'
import { RepositoryError } from '@utility/database/error'
import { getRequestContext } from '@utility/logger/context'
import { diffEntity, higherClass } from './diff'
import { uuidv7 } from './id'
import { CHANGE_OUTBOX, type ChangeOutbox } from './outbox'
import {
  ChangeAction,
  ChangeRecord,
  DataClass,
  FieldChange,
  FieldClassification,
  PLATFORM_TENANT,
} from './record'

/**
 * Injection token of the change recorder.
 */
export const CHANGE_RECORDER = Symbol('CHANGE_RECORDER')

/**
 * Smallest shape of an entity the recorder can describe.
 *
 * @property id - Entity identifier.
 * @property tenant_id - Tenant, when the entity is tenant data.
 * @property version - Optimistic-concurrency version, when the model has one.
 * @property deleted_at - Soft-delete time, when the model supports soft delete.
 */
export interface RecordableEntity {
  id: string
  tenant_id?: string
  version?: number
  deleted_at?: Date | null
}

/**
 * One write to record.
 *
 * @property type - Stable entity name, for example `account`; never the collection or class name.
 * @property before - Stored state before the write, or `null` for a create.
 * @property after - State after the write, or `null` for a delete.
 * @property classification - Field classification of the model.
 * @property operation - Operation that wrote, for example `AccountRepository.update`.
 * @property action - Overrides the action derived from `before` and `after`.
 */
export interface RecordChangeInput<T extends RecordableEntity> {
  type: string
  before: T | null
  after: T | null
  classification: FieldClassification<T>
  operation: string
  action?: ChangeAction
}

/**
 * One read of a highly confidential record (design section 4.4).
 *
 * @property type - Stable entity name.
 * @property id - Entity identifier.
 * @property operation - Business operation that read it, for example `DisciplineService.getCase`.
 * @property tenantId - Tenant of the record; `platform` when omitted.
 * @property dataClass - Class of the record; `highly_confidential` when omitted.
 */
export interface RecordAccessInput {
  type: string
  id: string
  operation: string
  tenantId?: string
  dataClass?: DataClass
}

/**
 * Records data changes into the change outbox (`logging.md` section 13, `database.md` 6.1).
 * Repositories call `record` inside the `TransactionManager.run` of their write, so the record
 * commits or rolls back with the data.
 */
export interface ChangeRecorder {
  /**
   * Diffs, masks and stores one write. A write that changes nothing stores nothing.
   * Rejects with `RepositoryError` when no actor is in the request context.
   *
   * @param input - The write to record.
   * @returns The stored record, or `null` when nothing changed.
   */
  record<T extends RecordableEntity>(
    input: RecordChangeInput<T>,
  ): Promise<ChangeRecord | null>

  /**
   * Stores one read of a highly confidential record. Call it after the read succeeded.
   *
   * @param input - The read to record.
   * @returns The stored record.
   */
  recordAccess(input: RecordAccessInput): Promise<ChangeRecord>
}

/**
 * Placeholder that replaces a value dropped to keep a record under the size limit.
 */
const DROPPED = { masked: 'changed' } as const

/**
 * Size of a record as written to the log, in bytes.
 *
 * @param record - Change record.
 * @returns UTF-8 byte length of its JSON form.
 */
function sizeOf(record: ChangeRecord): number {
  return Buffer.byteLength(JSON.stringify(record), 'utf8')
}

/**
 * Size of one field value, for choosing which values to drop first.
 *
 * @param value - Field value.
 * @returns UTF-8 byte length of its JSON form.
 */
function valueSize(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value) ?? '', 'utf8')
}

/**
 * Drops the largest values until the record fits, keeping every path, so the history still
 * shows which fields changed (design section 3).
 *
 * @param record - Change record.
 * @param maxBytes - Size limit.
 * @returns The record, marked `truncated` when values were dropped.
 */
export function fitRecord(
  record: ChangeRecord,
  maxBytes: number,
): ChangeRecord {
  if (sizeOf(record) <= maxBytes) {
    return record
  }
  const changes: FieldChange[] = record.changes.map((change) => ({ ...change }))
  const fitted: ChangeRecord = { ...record, changes, truncated: true }
  const bySize = changes
    .map((change) => ({
      change,
      size: valueSize(change.before) + valueSize(change.after),
    }))
    .sort((left, right) => right.size - left.size)
  for (const { change } of bySize) {
    if (sizeOf(fitted) <= maxBytes) {
      break
    }
    change.before = change.before === null ? null : DROPPED
    change.after = change.after === null ? null : DROPPED
  }
  return fitted
}

/**
 * Chooses the action of a write from the states before and after it.
 *
 * @param before - State before, or `null`.
 * @param after - State after, or `null`.
 * @returns The action.
 */
function deriveAction(
  before: RecordableEntity | null,
  after: RecordableEntity | null,
): ChangeAction {
  if (before === null) {
    return 'create'
  }
  if (after === null) {
    return 'delete'
  }
  const wasDeleted = before.deleted_at != null
  const isDeleted = after.deleted_at != null
  if (!wasDeleted && isDeleted) {
    return 'soft_delete'
  }
  if (wasDeleted && !isDeleted) {
    return 'restore'
  }
  return 'update'
}

/**
 * `ChangeRecorder` that writes to the change outbox of the main connection.
 * Actor, reason and correlation identifier come from the request context.
 */
@Injectable()
export class OutboxChangeRecorder implements ChangeRecorder {
  /**
   * @param outbox - Change outbox of the connection the repositories write to.
   * @param config - Change-log settings (size limit).
   */
  constructor(
    @Inject(CHANGE_OUTBOX) private readonly outbox: ChangeOutbox,
    @Inject(ChangeLogConfig.KEY) private readonly config: ChangeLogConfigType,
  ) {}

  /**
   * Diffs, masks and stores one write.
   *
   * @param input - The write to record.
   * @returns The stored record, or `null` when nothing changed.
   */
  async record<T extends RecordableEntity>(
    input: RecordChangeInput<T>,
  ): Promise<ChangeRecord | null> {
    const entity = input.after ?? input.before
    if (!entity) {
      throw new RepositoryError(
        `${input.operation}: change without before or after state`,
        {
          operation: input.operation,
        },
      )
    }
    const action = input.action ?? deriveAction(input.before, input.after)
    const changes =
      action === 'delete'
        ? []
        : diffEntity(input.before, input.after, input.classification)
    if (changes.length === 0 && action === 'update') {
      return null
    }
    const dataClass = changes.reduce<DataClass>(
      (highest, change) => higherClass(highest, change.class),
      changes.length === 0 ? input.classification.default : 'public',
    )
    return this.store({
      type: input.type,
      id: entity.id,
      tenantId: entity.tenant_id,
      version: input.after?.version ?? input.before?.version ?? null,
      action,
      operation: input.operation,
      changes,
      dataClass,
    })
  }

  /**
   * Stores one read of a highly confidential record.
   *
   * @param input - The read to record.
   * @returns The stored record.
   */
  async recordAccess(input: RecordAccessInput): Promise<ChangeRecord> {
    return this.store({
      type: input.type,
      id: input.id,
      tenantId: input.tenantId,
      version: null,
      action: 'read',
      operation: input.operation,
      changes: [],
      dataClass: input.dataClass ?? 'highly_confidential',
    })
  }

  /**
   * Builds the record from the request context and inserts it into the outbox.
   *
   * @param parts - Record content that does not come from the context.
   * @param parts.type - Entity name.
   * @param parts.id - Entity identifier.
   * @param parts.tenantId - Tenant, if any.
   * @param parts.version - Entity version, if any.
   * @param parts.action - What happened.
   * @param parts.operation - Operation that wrote or read.
   * @param parts.changes - Masked field changes.
   * @param parts.dataClass - Highest class of the record.
   * @returns The stored record.
   */
  private async store(parts: {
    type: string
    id: string
    tenantId?: string
    version: number | null
    action: ChangeAction
    operation: string
    changes: FieldChange[]
    dataClass: DataClass
  }): Promise<ChangeRecord> {
    const context = getRequestContext()
    if (!context?.actor) {
      throw new RepositoryError(
        `${parts.operation}: no actor in the request context`,
        {
          operation: parts.operation,
        },
      )
    }
    const now = Date.now()
    const record = fitRecord(
      {
        event: 'data_change',
        schema_version: 1,
        change_id: uuidv7(now),
        occurred_at: new Date(now).toISOString(),
        tenant_id: parts.tenantId ?? PLATFORM_TENANT,
        entity: { type: parts.type, id: parts.id, version: parts.version },
        action: parts.action,
        actor: context.actor,
        reason: context.reason ?? null,
        operation: parts.operation,
        correlation_id: context.correlationId || randomUUID(),
        changes: parts.changes,
        data_class: parts.dataClass,
      },
      this.config.recordMaxBytes,
    )
    await this.outbox.append(record)
    return record
  }
}
