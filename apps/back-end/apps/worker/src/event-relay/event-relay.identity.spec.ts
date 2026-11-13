import { Types } from 'mongoose'
import { EventConsumerRegistry } from '@utility/events/registry'
import { newEvent, type OutboxEvent } from '@utility/events/event'
import { runWithRequestContext } from '@utility/logger/context'
import { type AppLogger } from '@utility/logger/service'
import { InMemoryEventOutbox } from '@utility/testing/in-memory-event-outbox'
import { WORKFORCE_EVENTS } from '@repository/model/workforce-event'
import { SecurityAuditService } from '@identity/authentication/security-audit.service'
import { AccountLifecycleService } from '@identity/events/account-lifecycle.service'
import { WorkforceEventConsumer } from '@identity/events/workforce-event.consumer'
import {
  InMemoryAccounts,
  InMemoryProcessedEvents,
  InMemorySecurityEvents,
  InMemorySessions,
} from '@identity/testing/in-memory'
import { EventRelayService } from './event-relay.service'

describe('event relay with the identity consumer', () => {
  const tenantId = new Types.ObjectId().toHexString()
  const employeeId = new Types.ObjectId().toHexString()
  const log = vi.fn()
  const warn = vi.fn()
  const error = vi.fn()
  const debug = vi.fn()
  let accounts: InMemoryAccounts
  let sessions: InMemorySessions
  let outbox: InMemoryEventOutbox
  let registry: EventConsumerRegistry
  let relay: EventRelayService
  let consumer: WorkforceEventConsumer
  let accountId: string
  let sessionId: string

  /**
   * Runs `work` as the system.
   *
   * @param work - Code to run.
   * @returns What `work` returns.
   */
  function asSystem<T>(work: () => Promise<T>): Promise<T> {
    return runWithRequestContext(
      {
        correlationId: 'c1',
        actor: { account_id: null, display_name: 'hr', kind: 'system' },
      },
      work,
    )
  }

  /**
   * Builds a status change event.
   *
   * @param to - New status.
   * @returns The event.
   */
  function statusEvent(to: string): OutboxEvent {
    return newEvent({
      tenantId,
      type: WORKFORCE_EVENTS.EMPLOYEE_STATUS_CHANGED,
      aggregate: { type: 'employee', id: employeeId, version: 1 },
      payload: {
        employee_id: employeeId,
        from_status: 'active',
        to_status: to,
        effective_date: '2026-03-10',
      },
    })
  }

  beforeEach(async () => {
    vi.resetAllMocks()
    accounts = new InMemoryAccounts()
    sessions = new InMemorySessions()
    outbox = new InMemoryEventOutbox()
    registry = new EventConsumerRegistry()
    const transactions = {
      run: (work: () => Promise<unknown>) => work(),
    } as never
    const logger = { log, warn, error, debug } as unknown as AppLogger
    consumer = new WorkforceEventConsumer(
      new InMemoryProcessedEvents(),
      new AccountLifecycleService(
        accounts,
        sessions,
        transactions,
        new SecurityAuditService(new InMemorySecurityEvents(), {
          securityEventRetentionDays: 365,
        } as never),
      ),
      transactions,
      logger,
    )
    relay = new EventRelayService(
      outbox,
      registry,
      { relay: { intervalMs: 1000, batchSize: 100, maxLagSeconds: 300 } },
      logger,
    )
    const account = await asSystem(() =>
      accounts.create({
        tenant_id: tenantId,
        account_type: 'workforce',
        employee_id: employeeId,
        sponsor_account_id: null,
        username: 'siti',
        login_identifiers: [],
        profile: { display_name: 'Siti' },
        profile_source: 'hr',
        preferences: {
          locale: 'en',
          timezone: null,
          default_facility_id: null,
        },
        status: 'active',
        status_changed_at: new Date(),
        is_open: true,
        holds: [],
        validity: { not_before: null, expires_at: null },
        mfa_required: false,
        authz_version: 1,
        last_login_at: new Date(),
        request_id: null,
        closed: null,
      }),
    )
    accountId = account.id
    sessionId = (
      await asSystem(() =>
        sessions.create({
          tenant_id: tenantId,
          account_id: accountId,
          family_id: new Types.ObjectId().toHexString(),
          refresh_token_hash: 'hash',
          issued_at: new Date(),
          expires_at: new Date(Date.now() + 3_600_000),
          replaced_by: null,
          revoked_at: null,
          revoke_reason: null,
          authz_version: 1,
          client: { ip: null, user_agent_hash: null },
        } as never),
      )
    ).id
  })

  it('suspends, reactivates and separates through the outbox, the relay and the consumer, in order', async () => {
    registry.register(consumer)

    await asSystem(() => outbox.append(statusEvent('suspended')))
    await relay.runOnce()
    expect((await accounts.findOne(accountId))?.status).toBe('suspended')
    expect((await sessions.findOne(sessionId))?.revoked_at).not.toBeNull()

    await asSystem(() => outbox.append(statusEvent('active')))
    await relay.runOnce()
    expect((await accounts.findOne(accountId))?.status).toBe('active')

    await asSystem(() => outbox.append(statusEvent('separated')))
    await relay.runOnce()
    expect((await accounts.findOne(accountId))?.status).toBe('disabled')
    expect(await outbox.findPending(10)).toEqual([])
  })

  it('applies events written before the consumer existed, in the order they were written', async () => {
    for (const to of ['suspended', 'active', 'separated']) {
      await asSystem(() => outbox.append(statusEvent(to)))
    }

    await relay.runOnce()
    expect((await accounts.findOne(accountId))?.holds).toEqual([])
    expect(outbox.isPublished(0)).toBe(false)
    registry.register(consumer)
    await relay.runOnce()

    expect((await accounts.findOne(accountId))?.status).toBe('disabled')
    expect(outbox.isPublished(2)).toBe(true)
  })

  it('stops at an event the consumer cannot handle and holds nothing behind it', async () => {
    registry.register(consumer)
    await asSystem(() =>
      outbox.append({ ...statusEvent('suspended'), payload: {} }),
    )
    await asSystem(() => outbox.append(statusEvent('separated')))

    await expect(relay.runOnce()).rejects.toMatchObject({
      name: 'InvalidWorkforceEventError',
    })

    expect((await accounts.findOne(accountId))?.holds).toEqual([])
    expect(outbox.isPublished(1)).toBe(false)
  })
})
