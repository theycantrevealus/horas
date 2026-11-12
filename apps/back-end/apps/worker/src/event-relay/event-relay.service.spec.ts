import { Test } from '@nestjs/testing'
import { EventsConfig } from '@configuration/events'
import { RepositoryUnavailableError } from '@utility/database/error'
import {
  EVENT_OUTBOX,
  type EventConsumer,
  type OutboxEvent,
  newEvent,
} from '@utility/events/event'
import { EventConsumerRegistry } from '@utility/events/registry'
import { getRequestContext } from '@utility/logger/context'
import { AppLogger } from '@utility/logger/service'
import { InMemoryEventOutbox } from '@utility/testing/in-memory-event-outbox'
import { EventRelayService } from './event-relay.service'

describe('EventRelayService', () => {
  const log = vi.fn()
  const warn = vi.fn()
  const error = vi.fn()
  const debug = vi.fn()
  let outbox: InMemoryEventOutbox
  let registry: EventConsumerRegistry
  let relay: EventRelayService

  /**
   * Builds the relay around fresh fakes.
   *
   * @param batchSize - Events read per pass.
   * @param maxLagSeconds - Lag after which the relay warns.
   */
  async function build(batchSize = 100, maxLagSeconds = 300) {
    outbox = new InMemoryEventOutbox()
    registry = new EventConsumerRegistry()
    const moduleRef = await Test.createTestingModule({
      providers: [
        EventRelayService,
        { provide: EVENT_OUTBOX, useValue: outbox },
        { provide: EventConsumerRegistry, useValue: registry },
        {
          provide: EventsConfig.KEY,
          useValue: {
            relay: { intervalMs: 1000, batchSize, maxLagSeconds },
          },
        },
        { provide: AppLogger, useValue: { log, warn, error, debug } },
      ],
    }).compile()
    relay = moduleRef.get(EventRelayService)
  }

  /**
   * Appends an event.
   *
   * @param id - Aggregate identifier, to tell events apart.
   * @param tenantId - Tenant of the event.
   * @returns The event.
   */
  async function append(id: string, tenantId = 't1'): Promise<OutboxEvent> {
    const event = newEvent({
      tenantId,
      type: 'workforce.employee.status_changed',
      aggregate: { type: 'employee', id, version: 1 },
      payload: { employee_id: id, to_status: 'suspended' },
    })
    await outbox.append(event)
    return event
  }

  /**
   * A consumer that records what it handled, and can be made to fail.
   *
   * @param name - Consumer name.
   * @returns The consumer and its record.
   */
  function consumer(name = 'c1') {
    const handled: string[] = []
    const contexts: ReturnType<typeof getRequestContext>[] = []
    const failOn = new Set<string>()
    const instance: EventConsumer = {
      name,
      handle: async (event) => {
        contexts.push(getRequestContext())
        if (failOn.has(event.aggregate.id)) {
          throw new RepositoryUnavailableError('down', { operation: 'x' })
        }
        handled.push(event.aggregate.id)
      },
    }
    return { instance, handled, contexts, failOn }
  }

  beforeEach(async () => {
    vi.resetAllMocks()
    await build()
  })

  it('delivers pending events to the consumer in the order they were written and marks them', async () => {
    const first = consumer()
    registry.register(first.instance)
    await append('1')
    await append('2')
    await append('3')

    const result = await relay.runOnce()

    expect(first.handled).toEqual(['1', '2', '3'])
    expect(result).toEqual({ published: 3, more: false })
    expect(await outbox.findPending(10)).toEqual([])
  })

  it('hands each event to every consumer before marking it, and to nobody twice in one pass', async () => {
    const first = consumer('a')
    const second = consumer('b')
    registry.register(first.instance)
    registry.register(second.instance)
    await append('1')

    await relay.runOnce()
    await relay.runOnce()

    expect(first.handled).toEqual(['1'])
    expect(second.handled).toEqual(['1'])
  })

  it('runs each delivery in the context of the event, with the relay as system actor', async () => {
    const first = consumer()
    registry.register(first.instance)
    const event = await append('1')

    await relay.runOnce()

    expect(first.contexts[0]?.correlationId).toBe(event.correlation_id)
    expect(first.contexts[0]?.actor).toMatchObject({
      kind: 'system',
      display_name: 'event-relay',
    })
  })

  it('leaves the queue alone while no consumer is registered, so events wait for one', async () => {
    await append('1')

    const idle = await relay.runOnce()
    expect(idle).toEqual({ published: 0, more: false })
    expect(outbox.isPublished(0)).toBe(false)
    expect(debug).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'idle', reason: 'no_consumers' }),
    )

    const late = consumer()
    registry.register(late.instance)
    await relay.runOnce()
    expect(late.handled).toEqual(['1'])
  })

  it('stops at a failing event, marks the ones before it, counts the attempt, and never lets a later event overtake', async () => {
    const first = consumer()
    first.failOn.add('2')
    registry.register(first.instance)
    await append('1')
    await append('2')
    await append('3')

    await expect(relay.runOnce()).rejects.toBeInstanceOf(
      RepositoryUnavailableError,
    )

    expect(first.handled).toEqual(['1'])
    expect(outbox.isPublished(0)).toBe(true)
    expect(outbox.isPublished(1)).toBe(false)
    expect(outbox.isPublished(2)).toBe(false)
    expect(outbox.attempts(1)).toBe(1)
    expect(outbox.lastError(1)).toBe('RepositoryUnavailableError')

    first.failOn.clear()
    await relay.runOnce()
    expect(first.handled).toEqual(['1', '2', '3'])
  })

  it('does not mark an event when a second consumer fails, so the first sees it again', async () => {
    const first = consumer('a')
    const second = consumer('b')
    second.failOn.add('1')
    registry.register(first.instance)
    registry.register(second.instance)
    await append('1')

    await expect(relay.runOnce()).rejects.toBeDefined()
    expect(outbox.isPublished(0)).toBe(false)

    second.failOn.clear()
    await relay.runOnce()
    expect(first.handled).toEqual(['1', '1'])
    expect(second.handled).toEqual(['1'])
    expect(outbox.isPublished(0)).toBe(true)
  })

  it('reads one batch at a time and says more may be pending', async () => {
    await build(2)
    const first = consumer()
    registry.register(first.instance)
    for (const id of ['1', '2', '3']) {
      await append(id)
    }

    const one = await relay.runOnce()
    const two = await relay.runOnce()

    expect(one).toEqual({ published: 2, more: true })
    expect(two).toEqual({ published: 1, more: false })
  })

  it('does nothing without the lease', async () => {
    const first = consumer()
    registry.register(first.instance)
    await append('1')
    await outbox.acquireRelayLease('another-relay', 60_000)

    const result = await relay.runOnce()

    expect(result).toEqual({ published: 0, more: false })
    expect(first.handled).toEqual([])
  })

  it('writes one summary entry per pass with counts only, never a payload, tenant or identifier', async () => {
    const first = consumer()
    registry.register(first.instance)
    await append('employee-secret-1')
    await append('employee-secret-2')

    await relay.runOnce()

    expect(log).toHaveBeenCalledTimes(1)
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'event_relay',
        outcome: 'success',
        count: 2,
      }),
    )
    const text = JSON.stringify([...log.mock.calls, ...warn.mock.calls])
    expect(text).not.toContain('employee-secret')
    expect(text).not.toContain('suspended')
  })

  it('logs a failure with the event type and error class but no payload', async () => {
    const first = consumer()
    first.failOn.add('employee-secret-1')
    registry.register(first.instance)
    await append('employee-secret-1')

    await expect(relay.runOnce()).rejects.toBeDefined()

    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'event_relay',
        outcome: 'failure',
        error: 'RepositoryUnavailableError',
        retryable: true,
        eventType: 'workforce.employee.status_changed',
        attempts: 1,
      }),
    )
    expect(JSON.stringify(log.mock.calls)).not.toContain('employee-secret')
  })

  it('warns when the oldest pending event waited longer than the limit', async () => {
    await build(100, 60)
    const first = consumer()
    first.failOn.add('1')
    registry.register(first.instance)
    await append('1')
    outbox.ageOldestPending(new Date(Date.now() - 120_000))

    await expect(relay.runOnce()).rejects.toBeDefined()

    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'event_relay_lag',
        maxLagSeconds: 60,
      }),
    )
  })

  it('does not warn about lag for a young queue or an empty one', async () => {
    const first = consumer()
    registry.register(first.instance)
    await relay.runOnce()
    await append('1')
    first.failOn.add('1')
    await expect(relay.runOnce()).rejects.toBeDefined()

    expect(warn).not.toHaveBeenCalled()
  })

  it('delivers events of every tenant with their own tenant id', async () => {
    const first = consumer()
    const seen: string[] = []
    registry.register({
      name: 'tenants',
      handle: async (event) => {
        seen.push(`${event.tenant_id}:${event.aggregate.id}`)
      },
    })
    registry.register(first.instance)
    await append('1', 'tenant-a')
    await append('2', 'tenant-b')

    await relay.runOnce()

    expect(seen).toEqual(['tenant-a:1', 'tenant-b:2'])
  })
})
