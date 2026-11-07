import { Injectable } from '@nestjs/common'
import { InjectModel, Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import {
  Model,
  Schema as MongooseSchema,
  SchemaTypes,
  Types,
  mongo,
} from 'mongoose'
import {
  type ChainHeads,
  type ChangeOutbox,
  type ChangeOutboxEntry,
} from '@utility/history/outbox'
import { type ChangeRecord } from '@utility/history/record'
import { MONGO_MAIN_CONNECTION } from './constant'
import { RepositoryConflictError } from './error'
import { translateMongoError } from './mongo.error'
import { toObjectId } from './mongo.query'

/**
 * Operation name prefix used in errors.
 */
const OPERATION = 'ChangeOutbox'

/**
 * Identifier of the single relay-state document of a connection.
 */
const RELAY_STATE_ID = 'change-relay'

/**
 * MongoDB error code for a duplicate key, raised when two relays upsert the lease at once.
 */
const DUPLICATE_KEY_CODE = 11000

/**
 * Seconds per day, for the TTL index.
 */
const SECONDS_PER_DAY = 86_400

/**
 * Mongo storage shape of one outbox entry (design section 5). Not history and not recorded:
 * entries expire `CHANGE_OUTBOX_KEEP_DAYS` after publication. `minimize: false` keeps empty
 * objects inside records, so the stored record is exactly what was captured.
 *
 * @property tenant_id - Tenant of the record.
 * @property record - The masked change record.
 * @property published_at - When the relay wrote it to the change log, or `null`.
 * @property rejected_at - When the change log refused it, or `null`; rejected entries never expire.
 * @property rejection_reason - Machine-readable reason of the refusal.
 * @property attempts - Failed publish attempts.
 * @property last_error - Error class name of the last failure.
 * @property created_at - Insertion time, used to measure relay lag.
 */
@Schema({ collection: 'change_outbox', versionKey: false, minimize: false })
export class ChangeOutboxEntity {
  @Prop({ type: SchemaTypes.String, required: true })
  tenant_id!: string

  @Prop({ type: SchemaTypes.Mixed, required: true })
  record!: ChangeRecord

  @Prop({ type: SchemaTypes.Date, default: null })
  published_at!: Date | null

  @Prop({ type: SchemaTypes.Date, default: null })
  rejected_at!: Date | null

  @Prop({ type: SchemaTypes.String, default: null })
  rejection_reason!: string | null

  @Prop({ type: SchemaTypes.Number, default: 0 })
  attempts!: number

  @Prop({ type: SchemaTypes.String, default: null })
  last_error!: string | null

  @Prop({ type: SchemaTypes.Date, default: () => new Date() })
  created_at!: Date
}

/**
 * Last hash of one tenant's chain.
 *
 * @property tenant_id - Tenant.
 * @property hash - Hash of the tenant's last written line.
 */
interface ChainHead {
  tenant_id: string
  hash: string
}

/**
 * Mongo storage shape of the relay state of one connection: the lease that lets one relay
 * publish at a time, and the chain heads. Heads are a list, so tenant ids are never used as keys.
 *
 * @property _id - Always `change-relay`.
 * @property owner - Relay instance holding the lease.
 * @property expires_at - When the lease ends unless renewed.
 * @property chain_heads - Last hash per tenant.
 */
@Schema({ collection: 'change_relay_state', versionKey: false })
export class ChangeRelayStateEntity {
  @Prop({ type: SchemaTypes.String })
  _id!: string

  @Prop({ type: SchemaTypes.String, required: true })
  owner!: string

  @Prop({ type: SchemaTypes.Date, required: true })
  expires_at!: Date

  @Prop({
    type: [
      { tenant_id: SchemaTypes.String, hash: SchemaTypes.String, _id: false },
    ],
    default: [],
  })
  chain_heads!: ChainHead[]
}

/**
 * Builds the outbox schema with its indexes: one for the relay's pending query, and a TTL
 * index that removes published entries after `keepDays`.
 *
 * @param keepDays - Days a published entry is kept.
 * @returns The schema.
 */
export function createChangeOutboxSchema(
  keepDays: number,
): MongooseSchema<ChangeOutboxEntity> {
  const schema = SchemaFactory.createForClass(ChangeOutboxEntity)
  schema.index({ published_at: 1, rejected_at: 1, _id: 1 })
  schema.index(
    { published_at: 1 },
    { expireAfterSeconds: keepDays * SECONDS_PER_DAY },
  )
  return schema
}

/**
 * Mongoose schema of the relay state.
 */
export const ChangeRelayStateSchema = SchemaFactory.createForClass(
  ChangeRelayStateEntity,
)

/**
 * An outbox entry as returned by a lean query.
 */
type OutboxRecord = ChangeOutboxEntity & { _id: Types.ObjectId }

/**
 * Filter of entries waiting for the relay.
 */
const PENDING = { published_at: null, rejected_at: null }

/**
 * Converts identifiers, skipping invalid ones (they cannot match an entry).
 *
 * @param ids - Entry identifiers.
 * @returns The ObjectIds.
 */
function toObjectIds(ids: readonly string[]): Types.ObjectId[] {
  return ids.map(toObjectId).filter((id): id is Types.ObjectId => id !== null)
}

/**
 * MongoDB change outbox of the main connection. `append` joins the active transaction
 * automatically (`enableTransactionContext`), so a record commits or rolls back with its write.
 */
@Injectable()
export class MongoChangeOutbox implements ChangeOutbox {
  /**
   * @param outboxModel - Outbox collection on the main connection.
   * @param stateModel - Relay-state collection on the main connection.
   */
  constructor(
    @InjectModel(ChangeOutboxEntity.name, MONGO_MAIN_CONNECTION)
    private readonly outboxModel: Model<ChangeOutboxEntity>,
    @InjectModel(ChangeRelayStateEntity.name, MONGO_MAIN_CONNECTION)
    private readonly stateModel: Model<ChangeRelayStateEntity>,
  ) {}

  /**
   * Inserts a record into the outbox.
   *
   * @param record - Masked change record.
   */
  async append(record: ChangeRecord): Promise<void> {
    try {
      await this.outboxModel.create([{ tenant_id: record.tenant_id, record }])
    } catch (error: unknown) {
      throw translateMongoError(error, `${OPERATION}.append`)
    }
  }

  /**
   * Reads pending entries in insertion order.
   *
   * @param limit - Largest number of entries.
   * @returns The oldest pending entries.
   */
  async findPending(limit: number): Promise<ChangeOutboxEntry[]> {
    try {
      const records = await this.outboxModel
        .find(PENDING)
        .sort({ _id: 1 })
        .limit(limit)
        .lean<OutboxRecord[]>()
        .exec()
      return records.map((item) => ({
        id: item._id.toHexString(),
        record: item.record,
        attempts: item.attempts,
        created_at: item.created_at,
      }))
    } catch (error: unknown) {
      throw translateMongoError(error, `${OPERATION}.findPending`)
    }
  }

  /**
   * Marks entries as published.
   *
   * @param ids - Entry identifiers.
   * @param publishedAt - Publication time.
   */
  async markPublished(ids: string[], publishedAt: Date): Promise<void> {
    if (ids.length === 0) {
      return
    }
    try {
      await this.outboxModel
        .updateMany(
          { _id: { $in: toObjectIds(ids) } },
          { $set: { published_at: publishedAt } },
        )
        .exec()
    } catch (error: unknown) {
      throw translateMongoError(error, `${OPERATION}.markPublished`)
    }
  }

  /**
   * Counts a failed attempt on entries.
   *
   * @param ids - Entry identifiers.
   * @param error - Error class name.
   */
  async markFailed(ids: string[], error: string): Promise<void> {
    if (ids.length === 0) {
      return
    }
    try {
      await this.outboxModel
        .updateMany(
          { _id: { $in: toObjectIds(ids) } },
          { $inc: { attempts: 1 }, $set: { last_error: error } },
        )
        .exec()
    } catch (caught: unknown) {
      throw translateMongoError(caught, `${OPERATION}.markFailed`)
    }
  }

  /**
   * Takes an entry out of the queue without publishing it.
   *
   * @param id - Entry identifier.
   * @param reason - Machine-readable reason.
   */
  async markRejected(id: string, reason: string): Promise<void> {
    try {
      await this.outboxModel
        .updateOne(
          { _id: toObjectId(id) },
          { $set: { rejected_at: new Date(), rejection_reason: reason } },
        )
        .exec()
    } catch (error: unknown) {
      throw translateMongoError(error, `${OPERATION}.markRejected`)
    }
  }

  /**
   * Returns the insertion time of the oldest pending entry.
   *
   * @returns The time, or `null` when nothing is pending.
   */
  async oldestPendingAt(): Promise<Date | null> {
    try {
      const oldest = await this.outboxModel
        .findOne(PENDING)
        .sort({ _id: 1 })
        .select({ created_at: 1 })
        .lean<Pick<OutboxRecord, 'created_at'>>()
        .exec()
      return oldest?.created_at ?? null
    } catch (error: unknown) {
      throw translateMongoError(error, `${OPERATION}.oldestPendingAt`)
    }
  }

  /**
   * Takes or renews the relay lease. A free or expired lease is taken; a lease held by
   * another live relay is left alone.
   *
   * @param owner - Relay instance name.
   * @param leaseMs - Lease duration.
   * @returns `true` when `owner` holds the lease.
   */
  async acquireRelayLease(owner: string, leaseMs: number): Promise<boolean> {
    const now = new Date()
    try {
      const state = await this.stateModel
        .findOneAndUpdate(
          {
            _id: RELAY_STATE_ID,
            $or: [{ owner }, { expires_at: { $lte: now } }],
          },
          {
            $set: { owner, expires_at: new Date(now.getTime() + leaseMs) },
            $setOnInsert: { chain_heads: [] },
          },
          { upsert: true, returnDocument: 'after' },
        )
        .lean<ChangeRelayStateEntity>()
        .exec()
      return state?.owner === owner
    } catch (error: unknown) {
      if (
        error instanceof mongo.MongoServerError &&
        error.code === DUPLICATE_KEY_CODE
      ) {
        return false
      }
      throw translateMongoError(error, `${OPERATION}.acquireRelayLease`)
    }
  }

  /**
   * Reads the chain heads.
   *
   * @returns Last hash per tenant.
   */
  async loadChainHeads(): Promise<ChainHeads> {
    try {
      const state = await this.stateModel
        .findOne({ _id: RELAY_STATE_ID })
        .lean<ChangeRelayStateEntity>()
        .exec()
      return Object.fromEntries(
        (state?.chain_heads ?? []).map((head) => [head.tenant_id, head.hash]),
      )
    } catch (error: unknown) {
      throw translateMongoError(error, `${OPERATION}.loadChainHeads`)
    }
  }

  /**
   * Stores the chain heads; rejects when `owner` no longer holds the lease.
   *
   * @param owner - Lease owner.
   * @param heads - Last hash per tenant.
   */
  async saveChainHeads(owner: string, heads: ChainHeads): Promise<void> {
    const operation = `${OPERATION}.saveChainHeads`
    try {
      const result = await this.stateModel
        .updateOne(
          { _id: RELAY_STATE_ID, owner },
          {
            $set: {
              chain_heads: Object.entries(heads).map(([tenant, hash]) => ({
                tenant_id: tenant,
                hash,
              })),
            },
          },
        )
        .exec()
      if (result.matchedCount === 0) {
        throw new RepositoryConflictError(`${operation}: relay lease lost`, {
          operation,
        })
      }
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }
}
