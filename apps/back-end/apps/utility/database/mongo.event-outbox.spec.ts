import { Types, mongo } from 'mongoose'
import { RepositoryError } from '@utility/database/error'
import { newEvent } from '@utility/events/event'
import {
  EVENT_OUTBOX_KEEP_DAYS,
  MongoEventOutbox,
  createEventOutboxSchema,
} from './mongo.event-outbox'

/**
 * Wraps a value as a chainable Mongoose query.
 *
 * @param value - Query result.
 * @returns The fake query.
 */
function chain(value: unknown) {
  const self = {
    sort: () => self,
    limit: () => self,
    select: () => self,
    lean: () => self,
    exec: async () => value,
  }
  return self
}

describe('MongoEventOutbox', () => {
  const outboxModel = {
    create: vi.fn(async (_documents: unknown[]) => undefined),
    find: vi.fn((..._args: unknown[]) => chain([])),
    findOne: vi.fn((..._args: unknown[]) => chain(null)),
    updateMany: vi.fn((..._args: unknown[]) => chain(undefined)),
  }
  const stateModel = {
    findOneAndUpdate: vi.fn((..._args: unknown[]) => chain(null)),
  }
  let outbox: MongoEventOutbox

  const event = newEvent({
    tenantId: 't1',
    type: 'workforce.employee.status_changed',
    aggregate: { type: 'employee', id: 'e1', version: 1 },
    payload: { employee_id: 'e1' },
  })

  beforeEach(() => {
    vi.resetAllMocks()
    outboxModel.create.mockResolvedValue(undefined)
    outboxModel.find.mockImplementation(() => chain([]))
    outboxModel.findOne.mockImplementation(() => chain(null))
    outboxModel.updateMany.mockImplementation(() => chain(undefined))
    stateModel.findOneAndUpdate.mockImplementation(() => chain(null))
    outbox = new MongoEventOutbox(outboxModel as never, stateModel as never)
  })

  it('inserts the event as one document with its envelope', async () => {
    await outbox.append(event)

    expect(outboxModel.create).toHaveBeenCalledWith([event])
  })

  it('reads pending entries in order and maps them to events without storage fields', async () => {
    const id = new Types.ObjectId()
    outboxModel.find.mockReturnValueOnce(
      chain([
        {
          _id: id,
          ...event,
          published_at: null,
          attempts: 2,
          last_error: 'Boom',
          created_at: new Date('2026-01-01T00:00:00Z'),
        },
      ]),
    )

    const [entry] = await outbox.findPending(10)

    expect(entry).toEqual({
      id: id.toHexString(),
      event,
      attempts: 2,
      created_at: new Date('2026-01-01T00:00:00Z'),
    })
    expect(outboxModel.find).toHaveBeenCalledWith({ published_at: null })
  })

  it('marks entries delivered and failed, and ignores empty and invalid identifier lists', async () => {
    const id = new Types.ObjectId().toHexString()
    const at = new Date()

    await outbox.markPublished([id, 'not-an-id'], at)
    await outbox.markFailed([id], 'Boom')
    await outbox.markPublished([], at)
    await outbox.markFailed([], 'Boom')

    expect(outboxModel.updateMany).toHaveBeenCalledTimes(2)
    const [filter, update] = outboxModel.updateMany.mock
      .calls[0] as unknown as [
      { _id: { $in: unknown[] } },
      { $set: { published_at: Date } },
    ]
    expect(filter._id.$in).toHaveLength(1)
    expect(update.$set.published_at).toBe(at)
    expect(outboxModel.updateMany.mock.calls[1][1]).toEqual({
      $inc: { attempts: 1 },
      $set: { last_error: 'Boom' },
    })
  })

  it('answers the insertion time of the oldest pending entry, or null', async () => {
    outboxModel.findOne.mockReturnValueOnce(
      chain({ created_at: new Date('2026-01-01T00:00:00Z') }),
    )

    expect(await outbox.oldestPendingAt()).toEqual(
      new Date('2026-01-01T00:00:00Z'),
    )
    expect(await outbox.oldestPendingAt()).toBeNull()
  })

  it('holds the lease when the stored owner is this relay, and not when another holds it', async () => {
    stateModel.findOneAndUpdate.mockReturnValueOnce(chain({ owner: 'me' }))
    stateModel.findOneAndUpdate.mockReturnValueOnce(chain({ owner: 'other' }))
    stateModel.findOneAndUpdate.mockReturnValueOnce(chain(null))

    expect(await outbox.acquireRelayLease('me', 1000)).toBe(true)
    expect(await outbox.acquireRelayLease('me', 1000)).toBe(false)
    expect(await outbox.acquireRelayLease('me', 1000)).toBe(false)
  })

  it('answers false for a lease race lost to a duplicate key, and translates other failures', async () => {
    stateModel.findOneAndUpdate.mockImplementationOnce(() => {
      throw new mongo.MongoServerError({ message: 'E11000', code: 11000 })
    })
    outboxModel.create.mockRejectedValueOnce(
      new mongo.MongoServerError({ message: 'E11000 dup', code: 11000 }),
    )

    expect(await outbox.acquireRelayLease('me', 1000)).toBe(false)
    await expect(outbox.append(event)).rejects.toBeInstanceOf(RepositoryError)
  })

  it('builds a schema with a unique event id and a TTL index on delivered entries', () => {
    const indexes = createEventOutboxSchema().indexes()

    expect(
      indexes.some(
        ([keys, options]) =>
          JSON.stringify(keys) === '{"event_id":1}' && options.unique === true,
      ),
    ).toBe(true)
    expect(
      indexes.some(
        ([keys, options]) =>
          JSON.stringify(keys) === '{"published_at":1}' &&
          options.expireAfterSeconds === EVENT_OUTBOX_KEEP_DAYS * 86_400,
      ),
    ).toBe(true)
  })
})
