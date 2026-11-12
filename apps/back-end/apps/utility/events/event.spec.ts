import { runWithRequestContext } from '@utility/logger/context'
import { InMemoryEventOutbox } from '@utility/testing/in-memory-event-outbox'
import { isPlainData, newEvent } from './event'
import { EventConsumerRegistry } from './registry'

describe('newEvent', () => {
  const input = {
    tenantId: 't1',
    type: 'workforce.employee.status_changed',
    aggregate: { type: 'employee', id: 'e1', version: 2 },
    payload: { employee_id: 'e1', to_status: 'suspended' },
  }

  it('builds an event with a unique id, the time and the request correlation id', () => {
    const first = runWithRequestContext({ correlationId: 'corr-1' }, () =>
      newEvent(input),
    )
    const second = runWithRequestContext({ correlationId: 'corr-1' }, () =>
      newEvent(input),
    )

    expect(first).toMatchObject({
      tenant_id: 't1',
      event_type: 'workforce.employee.status_changed',
      aggregate: { type: 'employee', id: 'e1', version: 2 },
      payload: { employee_id: 'e1', to_status: 'suspended' },
      correlation_id: 'corr-1',
    })
    expect(first.event_id).not.toBe(second.event_id)
    expect(first.occurred_at).toBeInstanceOf(Date)
  })

  it('makes a correlation id outside a request', () => {
    const event = newEvent(input)

    expect(event.correlation_id).toMatch(/^[0-9a-f-]{36}$/)
  })

  it.each([
    ['a date', { at: new Date() }],
    ['undefined', { value: undefined }],
    ['a function', { run: () => 1 }],
    ['a class instance', { map: new Map() }],
    ['NaN', { count: NaN }],
  ])('refuses a payload with %s', (_label, payload) => {
    expect(() => newEvent({ ...input, payload })).toThrow(/plain data/)
  })
})

describe('isPlainData', () => {
  it('accepts text, numbers, booleans, null, lists and nested plain objects', () => {
    expect(
      isPlainData({ a: 'x', b: 1, c: true, d: null, e: [1, { f: 'g' }] }),
    ).toBe(true)
  })

  it('refuses anything else', () => {
    for (const bad of [undefined, () => 1, Symbol('x'), 10n, [new Date()]]) {
      expect(isPlainData(bad)).toBe(false)
    }
  })
})

describe('EventConsumerRegistry', () => {
  it('keeps consumers in registration order and replaces one with the same name', () => {
    const registry = new EventConsumerRegistry()
    const first = { name: 'a', handle: async () => undefined }
    const second = { name: 'b', handle: async () => undefined }
    const replacement = { name: 'a', handle: async () => undefined }

    registry.register(first)
    registry.register(second)
    expect(registry.list()).toEqual([first, second])
    registry.register(replacement)

    expect(registry.list()).toEqual([replacement, second])
  })
})

describe('InMemoryEventOutbox', () => {
  const event = (id: string) => ({
    ...newEvent({
      tenantId: 't1',
      type: 'x.y',
      aggregate: { type: 'a', id, version: null },
      payload: {},
    }),
  })

  it('keeps events in order, delivers them once and counts failures', async () => {
    const outbox = new InMemoryEventOutbox()
    await outbox.append(event('1'))
    await outbox.append(event('2'))
    await outbox.append(event('3'))

    const pending = await outbox.findPending(2)
    await outbox.markFailed([pending[0].id], 'Boom')
    await outbox.markPublished([pending[0].id], new Date())

    expect(pending.map((entry) => entry.event.aggregate.id)).toEqual(['1', '2'])
    expect(
      (await outbox.findPending(10)).map((entry) => entry.event.aggregate.id),
    ).toEqual(['2', '3'])
    expect(outbox.attempts(0)).toBe(1)
    expect(outbox.lastError(0)).toBe('Boom')
    expect(outbox.isPublished(0)).toBe(true)
    expect(await outbox.oldestPendingAt()).toBeInstanceOf(Date)
  })

  it('lets one relay hold the lease until it expires', async () => {
    const outbox = new InMemoryEventOutbox()

    expect(await outbox.acquireRelayLease('a', 60_000)).toBe(true)
    expect(await outbox.acquireRelayLease('b', 60_000)).toBe(false)
    expect(await outbox.acquireRelayLease('a', 60_000)).toBe(true)
    expect(await outbox.acquireRelayLease('b', -1)).toBe(false)
  })
})
