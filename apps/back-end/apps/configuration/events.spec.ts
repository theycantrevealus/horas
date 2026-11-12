import { EventsConfig, EventsSchema } from './events'

describe('EventsSchema', () => {
  it('accepts an empty file and applies the defaults', () => {
    const { error, value } = EventsSchema.validate({})

    expect(error).toBeUndefined()
    expect(value).toEqual({
      EVENT_RELAY_INTERVAL_MS: 1000,
      EVENT_RELAY_BATCH_SIZE: 100,
      EVENT_RELAY_MAX_LAG_SECONDS: 300,
    })
  })

  it.each([
    { EVENT_RELAY_INTERVAL_MS: '50' },
    { EVENT_RELAY_BATCH_SIZE: '0' },
    { EVENT_RELAY_BATCH_SIZE: '1001' },
    { EVENT_RELAY_MAX_LAG_SECONDS: '-1' },
  ])('refuses %j', (input) => {
    expect(EventsSchema.validate(input).error).toBeDefined()
  })

  it('reads the values or falls back to the defaults', () => {
    process.env.EVENT_RELAY_BATCH_SIZE = '25'
    delete process.env.EVENT_RELAY_INTERVAL_MS

    expect(EventsConfig().relay).toMatchObject({
      batchSize: 25,
      intervalMs: 1000,
    })
    delete process.env.EVENT_RELAY_BATCH_SIZE
  })
})
