import { Types } from 'mongoose'
import { type OutboxEvent, newEvent } from '@utility/events/event'
import { runWithRequestContext } from '@utility/logger/context'
import { type AppLogger } from '@utility/logger/service'
import { type Account } from '@repository/model/account'
import { WORKFORCE_EVENTS } from '@repository/model/workforce-event'
import { SecurityAuditService } from '../authentication/security-audit.service'
import {
  InMemoryAccounts,
  InMemoryProcessedEvents,
  InMemorySecurityEvents,
  InMemorySessions,
} from '../testing/in-memory'
import { AccountLifecycleService } from './account-lifecycle.service'
import {
  InvalidWorkforceEventError,
  WorkforceEventConsumer,
} from './workforce-event.consumer'

describe('HR events to identity', () => {
  const tenantId = new Types.ObjectId().toHexString()
  const otherTenantId = new Types.ObjectId().toHexString()
  const employeeId = new Types.ObjectId().toHexString()
  const log = vi.fn()
  const warn = vi.fn()
  const error = vi.fn()
  const debug = vi.fn()
  let accounts: InMemoryAccounts
  let sessions: InMemorySessions
  let securityEvents: InMemorySecurityEvents
  let processed: InMemoryProcessedEvents
  let lifecycle: AccountLifecycleService
  let consumer: WorkforceEventConsumer
  let transactionDepth: number
  let runs: number

  const admin = {
    account_id: 'a1',
    display_name: 'Admin',
    kind: 'account' as const,
  }

  /**
   * Runs `work` as a request with an actor.
   *
   * @param work - Code to run.
   * @returns What `work` returns.
   */
  function asSystem<T>(work: () => Promise<T>): Promise<T> {
    return runWithRequestContext(
      {
        correlationId: 'c1',
        actor: {
          account_id: null,
          display_name: 'event-relay',
          kind: 'system',
        },
      },
      work,
    )
  }

  /**
   * Adds an account to the in-memory repository.
   *
   * @param override - Fields that replace the defaults.
   * @returns The account.
   */
  function addAccount(override: Partial<Account> = {}) {
    return asSystem(() =>
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
        status_changed_at: new Date('2026-01-01T00:00:00Z'),
        is_open: true,
        holds: [],
        validity: { not_before: null, expires_at: null },
        mfa_required: false,
        authz_version: 4,
        last_login_at: new Date('2026-02-01T00:00:00Z'),
        request_id: null,
        closed: null,
        ...override,
      }),
    )
  }

  /**
   * Adds a live session to an account.
   *
   * @param accountId - Account of the session.
   * @returns The session.
   */
  function addSession(accountId: string) {
    return asSystem(() =>
      sessions.create({
        tenant_id: tenantId,
        account_id: accountId,
        family_id: new Types.ObjectId().toHexString(),
        refresh_token_hash: Math.random().toString(36),
        issued_at: new Date(),
        expires_at: new Date(Date.now() + 3_600_000),
        replaced_by: null,
        revoked_at: null,
        revoke_reason: null,
        authz_version: 4,
        client: { ip: null, user_agent_hash: null },
      } as never),
    )
  }

  /**
   * Builds a status change event.
   *
   * @param to - New status.
   * @param override - Fields of the payload or the event that replace the defaults.
   * @returns The event.
   */
  function statusEvent(
    to: string,
    override: Partial<OutboxEvent> = {},
  ): OutboxEvent {
    return {
      ...newEvent({
        tenantId,
        type: WORKFORCE_EVENTS.EMPLOYEE_STATUS_CHANGED,
        aggregate: { type: 'employee', id: employeeId, version: 3 },
        payload: {
          employee_id: employeeId,
          from_status: 'active',
          to_status: to,
          effective_date: '2026-03-10',
        },
      }),
      ...override,
    }
  }

  /**
   * Hands an event to the consumer in the context the relay gives it.
   *
   * @param event - The event.
   */
  function deliver(event: OutboxEvent) {
    return asSystem(() => consumer.handle(event))
  }

  beforeEach(() => {
    vi.resetAllMocks()
    accounts = new InMemoryAccounts()
    sessions = new InMemorySessions()
    securityEvents = new InMemorySecurityEvents()
    processed = new InMemoryProcessedEvents()
    transactionDepth = 0
    runs = 0
    const transactions = {
      run: async (work: () => Promise<unknown>) => {
        runs += 1
        transactionDepth += 1
        try {
          return await work()
        } finally {
          transactionDepth -= 1
        }
      },
    } as never
    const audit = new SecurityAuditService(securityEvents, {
      securityEventRetentionDays: 365,
    } as never)
    lifecycle = new AccountLifecycleService(
      accounts,
      sessions,
      transactions,
      audit,
    )
    consumer = new WorkforceEventConsumer(processed, lifecycle, transactions, {
      log,
      warn,
      error,
      debug,
    } as unknown as AppLogger)
  })

  describe('a suspended employee', () => {
    it('gets a suspend hold from HR, the sessions end, the token version goes up and a security entry is written', async () => {
      const account = await addAccount()
      const session = await addSession(account.id)
      const event = statusEvent('suspended')

      await deliver(event)

      const held = await accounts.findOne(account.id)
      expect(held).toMatchObject({
        status: 'suspended',
        authz_version: 5,
        holds: [
          {
            kind: 'suspend',
            reason: 'employment_suspended',
            source: 'workforce',
            source_ref: event.event_id,
            placed_by: { display_name: 'workforce-events', kind: 'system' },
          },
        ],
      })
      expect((await sessions.findOne(session.id))?.revoked_at).not.toBeNull()
      expect(securityEvents.all()).toMatchObject([
        {
          type: 'account_hold_placed',
          account_id: account.id,
          reason_code: 'employment_suspended',
          outcome: 'success',
        },
      ])
    })

    it('does nothing for an employee without an open account, a closed account and another tenant', async () => {
      await addAccount({ employee_id: new Types.ObjectId().toHexString() })
      const closed = await addAccount({
        employee_id: employeeId,
        status: 'closed',
        is_open: false,
      })
      const foreign = await addAccount({ tenant_id: otherTenantId })

      await deliver(statusEvent('suspended'))

      expect((await accounts.findOne(closed.id))?.holds).toEqual([])
      expect((await accounts.findOne(foreign.id))?.holds).toEqual([])
      expect(securityEvents.all()).toEqual([])
    })
  })

  describe('a reactivated employee', () => {
    it('gets back only the hold HR placed, and keeps a security hold and an administrator hold', async () => {
      const account = await addAccount()
      await deliver(statusEvent('suspended'))
      const kept = (await accounts.findOne(account.id))!
      await accounts.update(account.id, {
        holds: [
          ...kept.holds,
          {
            kind: 'suspend',
            reason: 'security',
            source: 'security',
            source_ref: null,
            placed_by: admin,
            placed_at: new Date(),
          },
          {
            kind: 'suspend',
            reason: 'administrative',
            source: 'identity',
            source_ref: null,
            placed_by: admin,
            placed_at: new Date(),
          },
        ],
      })

      await deliver(statusEvent('active'))

      const after = (await accounts.findOne(account.id))!
      expect(after.holds.map((hold) => hold.reason)).toEqual([
        'security',
        'administrative',
      ])
      expect(after.status).toBe('suspended')
      expect(securityEvents.all().map((event) => event.type)).toEqual([
        'account_hold_placed',
        'account_hold_lifted',
      ])
    })

    it('returns the account to active when the HR hold was the last one, and bumps the token version', async () => {
      const account = await addAccount()
      await deliver(statusEvent('suspended'))
      const suspended = (await accounts.findOne(account.id))!

      await deliver(statusEvent('probation'))

      const after = (await accounts.findOne(account.id))!
      expect(after).toMatchObject({ status: 'active', holds: [] })
      expect(after.authz_version).toBe(suspended.authz_version + 1)
    })

    it('leaves an account without a hold alone, and does not bump its token version', async () => {
      const account = await addAccount()

      await deliver(statusEvent('active'))

      expect(await accounts.findOne(account.id)).toMatchObject({
        authz_version: 4,
        holds: [],
      })
      expect(securityEvents.all()).toEqual([])
    })
  })

  describe('a separated employee', () => {
    it('gets a disable hold, the sessions end, and no later event re-enables the account', async () => {
      const account = await addAccount()
      const session = await addSession(account.id)

      await deliver(statusEvent('separated'))
      await deliver(statusEvent('active'))
      await deliver(statusEvent('probation'))

      const after = (await accounts.findOne(account.id))!
      expect(after.status).toBe('disabled')
      expect(after.holds).toMatchObject([
        { kind: 'disable', reason: 'employment_ended', source: 'workforce' },
      ])
      expect((await sessions.findOne(session.id))?.revoked_at).not.toBeNull()
    })

    it('replaces a suspension with the disable hold and keeps the account disabled', async () => {
      const account = await addAccount()
      await deliver(statusEvent('suspended'))

      await deliver(statusEvent('separated'))

      const after = (await accounts.findOne(account.id))!
      expect(after.status).toBe('disabled')
      expect(after.holds.map((hold) => hold.kind).sort()).toEqual([
        'disable',
        'suspend',
      ])
    })

    it('disables an account that was never activated', async () => {
      const account = await addAccount({
        status: 'pending_activation',
        last_login_at: null,
      })

      await deliver(statusEvent('separated'))

      expect((await accounts.findOne(account.id))?.status).toBe('disabled')
    })
  })

  describe('delivery', () => {
    it('does nothing the second time for a redelivered event, and writes one security entry', async () => {
      const account = await addAccount()
      const event = statusEvent('suspended')

      await deliver(event)
      const first = (await accounts.findOne(account.id))!
      await deliver(event)

      expect(await accounts.findOne(account.id)).toEqual(first)
      expect(securityEvents.all()).toHaveLength(1)
      expect(
        await processed.findByEvent(
          'identity.workforce-events',
          event.event_id,
        ),
      ).toMatchObject({ event_type: WORKFORCE_EVENTS.EMPLOYEE_STATUS_CHANGED })
    })

    it('does the reaction and records the event inside one transaction', async () => {
      await addAccount()
      const order: string[] = []
      const create = processed.create.bind(processed)
      processed.create = async (...args) => {
        order.push(`record@${transactionDepth}`)
        return create(...args)
      }
      const update = accounts.update.bind(accounts)
      accounts.update = async (...args) => {
        order.push(`hold@${transactionDepth}`)
        return update(...args)
      }

      await deliver(statusEvent('suspended'))

      expect(order).toEqual(['hold@1', 'record@1'])
      expect(runs).toBe(1)
    })

    it('records an event even when the employee has no account, so it is not retried', async () => {
      const event = statusEvent('suspended', {
        tenant_id: otherTenantId,
      })

      await deliver(event)

      expect(
        await processed.findByEvent(
          'identity.workforce-events',
          event.event_id,
        ),
      ).not.toBeNull()
    })

    it('ignores contract events and unknown events, without a record', async () => {
      const account = await addAccount()
      const contractEvent = newEvent({
        tenantId,
        type: WORKFORCE_EVENTS.CONTRACT_ENDED,
        aggregate: { type: 'employment_contract', id: 'x', version: 1 },
        payload: {
          contract_id: 'x',
          employee_id: employeeId,
          organization_id: 'o',
        },
      })
      const unknown = newEvent({
        tenantId,
        type: 'billing.invoice.paid',
        aggregate: { type: 'invoice', id: 'i', version: null },
        payload: {},
      })

      await deliver(contractEvent)
      await deliver(unknown)

      expect(await accounts.findOne(account.id)).toMatchObject({
        holds: [],
        authz_version: 4,
      })
      expect(processed.size()).toBe(0)
    })

    it('fails loudly on a status change with a bad payload, and holds nothing', async () => {
      const account = await addAccount()

      for (const payload of [
        {},
        {
          employee_id: employeeId,
          from_status: 'active',
          to_status: 'gone',
          effective_date: '2026-03-10',
        },
        {
          employee_id: 7,
          from_status: 'active',
          to_status: 'suspended',
          effective_date: '2026-03-10',
        },
      ]) {
        await expect(
          deliver({ ...statusEvent('suspended'), payload }),
        ).rejects.toBeInstanceOf(InvalidWorkforceEventError)
      }
      expect((await accounts.findOne(account.id))?.holds).toEqual([])
    })

    it('writes no log for a reaction that changed nothing, and one entry without identifiers for one that did', async () => {
      await addAccount()

      await deliver(statusEvent('active'))
      expect(log).not.toHaveBeenCalled()
      await deliver(statusEvent('suspended'))

      expect(log).toHaveBeenCalledTimes(1)
      expect(log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'account_lifecycle',
          outcome: 'success',
          toStatus: 'suspended',
        }),
      )
      expect(JSON.stringify(log.mock.calls)).not.toContain(employeeId)
    })

    it('refuses to overwrite an account changed meanwhile, so the relay retries', async () => {
      const account = await addAccount()
      const find = accounts.findByEmployeeId.bind(accounts)
      accounts.findByEmployeeId = async (...args) => {
        const found = await find(...args)
        await accounts.update(account.id, {
          preferences: {
            locale: 'id',
            timezone: null,
            default_facility_id: null,
          },
        })
        return found
      }

      await expect(deliver(statusEvent('suspended'))).rejects.toBeDefined()
      expect((await accounts.findOne(account.id))?.holds).toEqual([])
    })
  })
})
