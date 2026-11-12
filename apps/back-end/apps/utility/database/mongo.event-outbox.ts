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
  type EventOutbox,
  type EventOutboxEntry,
  type OutboxEvent,
} from '@utility/events/event'
import { MONGO_MAIN_CONNECTION } from './constant'
import { translateMongoError } from './mongo.error'
import { toObjectId } from './mongo.query'

/**
 * Operation name prefix used in errors.
 */
const OPERATION = 'EventOutbox'

/**
 * Identifier of the single relay-state document of a connection.
 */
const RELAY_STATE_ID = 'event-relay'

/**
 * MongoDB error code for a duplicate key, raised when two relays upsert the lease at once.
 */
const DUPLICATE_KEY_CODE = 11000

/**
 * Days a delivered event stays in the outbox before the TTL index removes it. A fixed value, not a
 * setting: every application creates this index, and two values would conflict.
 */
export const EVENT_OUTBOX_KEEP_DAYS = 7

/**
 * Seconds per day, for the TTL index.
 */
const SECONDS_PER_DAY = 86_400

/**
 * Mongo storage shape of one outbox event. Not business data and not recorded in the change
 * history: delivered entries expire `EVENT_OUTBOX_KEEP_DAYS` after delivery. `minimize: false`
 * keeps empty objects inside payloads.
 *
 * @property tenant_id - Tenant of the event.
 * @property event_id - Unique identifier; consumers dedupe on it.
 * @property event_type - Event name.
 * @property aggregate - What the event is about.
 * @property payload - Plain data of the event.
 * @property correlation_id - Correlation identifier of the request that caused it.
 * @property occurred_at - When it happened.
 * @property published_at - When it was delivered to every consumer, or `null`.
 * @property attempts - Failed delivery attempts.
 * @property last_error - Error class name of the last failure.
 * @property created_at - Insertion time, used to measure relay lag.
 */
@Schema({ collection: 'outbox_events', versionKey: false, minimize: false })
export class EventOutboxEntity {
  @Prop({ type: SchemaTypes.String, required: true })
  tenant_id!: string

  @Prop({ type: SchemaTypes.String, required: true })
  event_id!: string

  @Prop({ type: SchemaTypes.String, required: true })
  event_type!: string

  @Prop({ type: SchemaTypes.Mixed, required: true })
  aggregate!: OutboxEvent['aggregate']

  @Prop({ type: SchemaTypes.Mixed, required: true })
  payload!: Record<string, unknown>

  @Prop({ type: SchemaTypes.String, required: true })
  correlation_id!: string

  @Prop({ type: SchemaTypes.Date, required: true })
  occurred_at!: Date

  @Prop({ type: SchemaTypes.Date, default: null })
  published_at!: Date | null

  @Prop({ type: SchemaTypes.Number, default: 0 })
  attempts!: number

  @Prop({ type: SchemaTypes.String, default: null })
  last_error!: string | null

  @Prop({ type: SchemaTypes.Date, default: () => new Date() })
  created_at!: Date
}

/**
 * Mongo storage shape of the relay state of one connection: the lease that lets one relay deliver
 * at a time.
 *
 * @property _id - Always `event-relay`.
 * @property owner - Relay instance holding the lease.
 * @property expires_at - When the lease ends unless renewed.
 */
@Schema({ collection: 'event_relay_state', versionKey: false })
export class EventRelayStateEntity {
  @Prop({ type: SchemaTypes.String })
  _id!: string

  @Prop({ type: SchemaTypes.String, required: true })
  owner!: string

  @Prop({ type: SchemaTypes.Date, required: true })
  expires_at!: Date
}

/**
 * Mongoose schema of the relay state.
 */
export const EventRelayStateSchema = SchemaFactory.createForClass(
  EventRelayStateEntity,
)

/**
 * Builds the outbox schema with its indexes: a unique event identifier, one for the relay's
 * pending query, and a TTL index that removes delivered entries.
 *
 * @returns The schema.
 */
export function createEventOutboxSchema(): MongooseSchema<EventOutboxEntity> {
  const schema = SchemaFactory.createForClass(EventOutboxEntity)
  schema.index({ event_id: 1 }, { unique: true })
  schema.index({ published_at: 1, _id: 1 })
  schema.index(
    { published_at: 1 },
    { expireAfterSeconds: EVENT_OUTBOX_KEEP_DAYS * SECONDS_PER_DAY },
  )
  return schema
}

/**
 * An outbox entry as returned by a lean query.
 */
type OutboxRecord = EventOutboxEntity & { _id: Types.ObjectId }

/**
 * Filter of entries waiting for the relay.
 */
const PENDING = { published_at: null }

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
 * MongoDB event outbox of the main connection. `append` joins the active transaction
 * automatically (`enableTransactionContext`), so an event commits or rolls back with its change.
 */
@Injectable()
export class MongoEventOutbox implements EventOutbox {
  /**
   * @param outboxModel - Outbox collection on the main connection.
   * @param stateModel - Relay-state collection on the main connection.
   */
  constructor(
    @InjectModel(EventOutboxEntity.name, MONGO_MAIN_CONNECTION)
    private readonly outboxModel: Model<EventOutboxEntity>,
    @InjectModel(EventRelayStateEntity.name, MONGO_MAIN_CONNECTION)
    private readonly stateModel: Model<EventRelayStateEntity>,
  ) {}

  /**
   * Inserts an event into the outbox.
   *
   * @param event - The event.
   */
  async append(event: OutboxEvent): Promise<void> {
    try {
      await this.outboxModel.create([event])
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
  async findPending(limit: number): Promise<EventOutboxEntry[]> {
    try {
      const records = await this.outboxModel
        .find(PENDING)
        .sort({ _id: 1 })
        .limit(limit)
        .lean<OutboxRecord[]>()
        .exec()
      return records.map((item) => ({
        id: item._id.toHexString(),
        event: {
          tenant_id: item.tenant_id,
          event_id: item.event_id,
          event_type: item.event_type,
          aggregate: item.aggregate,
          payload: item.payload,
          correlation_id: item.correlation_id,
          occurred_at: item.occurred_at,
        },
        attempts: item.attempts,
        created_at: item.created_at,
      }))
    } catch (error: unknown) {
      throw translateMongoError(error, `${OPERATION}.findPending`)
    }
  }

  /**
   * Marks entries as delivered.
   *
   * @param ids - Entry identifiers.
   * @param publishedAt - Delivery time.
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
   * Takes or renews the relay lease. A free or expired lease is taken; a lease held by another
   * live relay is left alone.
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
          { $set: { owner, expires_at: new Date(now.getTime() + leaseMs) } },
          { upsert: true, returnDocument: 'after' },
        )
        .lean<EventRelayStateEntity>()
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
}
