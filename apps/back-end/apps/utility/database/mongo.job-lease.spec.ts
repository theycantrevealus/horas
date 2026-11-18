import { mongo } from 'mongoose'
import { RepositoryUnavailableError } from './error'
import { MongoJobLease } from './mongo.job-lease'

/**
 * Wraps a value as a chainable Mongoose query.
 *
 * @param run - Function that produces the result.
 * @returns The fake query.
 */
function chain(run: () => unknown) {
  const self = { lean: () => self, exec: async () => run() }
  return self
}

describe('MongoJobLease', () => {
  const findOneAndUpdate = vi.fn((..._args: unknown[]) =>
    chain(() => ({ _id: 'license-expiry', owner: 'one' })),
  )
  const lease = new MongoJobLease({ findOneAndUpdate } as never)

  beforeEach(() => findOneAndUpdate.mockClear())

  it('upserts the lease of the job for the owner, free or expired or already its own', async () => {
    expect(await lease.acquire('license-expiry', 'one', 5000)).toBe(true)

    const [filter, update, options] = findOneAndUpdate.mock.calls[0] as [
      Record<string, unknown>,
      { $set: { owner: string; expires_at: Date } },
      Record<string, unknown>,
    ]
    expect(filter._id).toBe('license-expiry')
    expect(filter.$or).toEqual([{ owner: 'one' }, { expires_at: { $lte: expect.any(Date) } }])
    expect(update.$set.owner).toBe('one')
    expect(options).toMatchObject({ upsert: true, returnDocument: 'after' })
  })

  it('answers false when another owner holds the lease', async () => {
    findOneAndUpdate.mockImplementationOnce(() => chain(() => ({ _id: 'x', owner: 'two' })))

    expect(await lease.acquire('x', 'one', 5000)).toBe(false)
  })

  it('answers false when two workers upsert at once (duplicate key)', async () => {
    findOneAndUpdate.mockImplementationOnce(() =>
      chain(() => {
        throw new mongo.MongoServerError({ message: 'dup', code: 11000 })
      }),
    )

    expect(await lease.acquire('x', 'one', 5000)).toBe(false)
  })

  it('translates a network failure into a retryable error without the driver message', async () => {
    findOneAndUpdate.mockImplementationOnce(() =>
      chain(() => {
        throw new mongo.MongoNetworkError('secret driver text')
      }),
    )

    const failure = await lease.acquire('x', 'one', 5000).catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(RepositoryUnavailableError)
    expect((failure as Error).message).not.toContain('secret')
  })
})
