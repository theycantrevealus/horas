import { Test } from '@nestjs/testing'
import { ChangeLogConfig } from '@configuration/change-log'
import { RepositoryUnavailableError } from '@utility/database/error'
import { TRANSACTION_MANAGER } from '@utility/database/transaction'
import { ChangeLogger, type ChangeLogSink } from '@utility/history/logger'
import {
  CHANGE_OUTBOX,
  type ChainHeads,
  type ChangeOutboxEntry,
} from '@utility/history/outbox'
import { type ChangeRecord } from '@utility/history/record'
import { getRequestContext } from '@utility/logger/context'
import { AppLogger } from '@utility/logger/service'
import { ChangeRelayService } from './change-relay.service'

/**
 * Builds a change record.
 *
 * @param changeId - Record identifier.
 * @param changes - Field changes.
 * @returns The record.
 */
function record(
  changeId: string,
  changes: ChangeRecord['changes'] = [],
): ChangeRecord {
  return {
    event: 'data_change',
    schema_version: 1,
    change_id: changeId,
    occurred_at: '2026-11-07T01:00:00.000Z',
    tenant_id: 't1',
    entity: { type: 'account', id: 'a1', version: 1 },
    action: 'update',
    actor: { account_id: 'u1', display_name: 'HR Admin', kind: 'account' },
    reason: null,
    operation: 'AccountRepository.update',
    correlation_id: 'c1',
    changes,
    data_class: 'internal',
  }
}

/**
 * In-memory outbox that records every call.
 */
class FakeOutbox {
  entries: ChangeOutboxEntry[] = []
  published: string[] = []
  failed: string[] = []
  rejected: { id: string; reason: string }[] = []
  heads: ChainHeads = {}
  lease = true
  oldest: Date | null = null

  acquireRelayLease = vi.fn(async () => this.lease)
  findPending = vi.fn(async (limit: number) => this.entries.slice(0, limit))
  loadChainHeads = vi.fn(async () => ({ ...this.heads }))
  markPublished = vi.fn(async (ids: string[]) => {
    this.published.push(...ids)
  })
  markFailed = vi.fn(async (ids: string[]) => {
    this.failed.push(...ids)
  })
  markRejected = vi.fn(async (id: string, reason: string) => {
    this.rejected.push({ id, reason })
  })
  saveChainHeads = vi.fn(async (_owner: string, heads: ChainHeads) => {
    this.heads = heads
  })
  oldestPendingAt = vi.fn(async () => this.oldest)
}

describe('ChangeRelayService', () => {
  let outbox: FakeOutbox
  let lines: string[]
  let sinkFails: boolean
  let logger: {
    log: ReturnType<typeof vi.fn>
    warn: ReturnType<typeof vi.fn>
    error: ReturnType<typeof vi.fn>
  }
  let relay: ChangeRelayService

  beforeEach(async () => {
    outbox = new FakeOutbox()
    lines = []
    sinkFails = false
    logger = { log: vi.fn(), warn: vi.fn(), error: vi.fn() }
    const sink: ChangeLogSink = {
      write: async (written) => {
        if (sinkFails) {
          throw new RepositoryUnavailableError('disk', { operation: 'sink' })
        }
        lines.push(...written)
      },
    }
    const moduleRef = await Test.createTestingModule({
      providers: [
        ChangeRelayService,
        { provide: CHANGE_OUTBOX, useValue: outbox },
        {
          provide: TRANSACTION_MANAGER,
          useValue: { run: (work: () => Promise<unknown>) => work() },
        },
        { provide: ChangeLogger, useValue: new ChangeLogger([sink], true) },
        {
          provide: ChangeLogConfig.KEY,
          useValue: {
            relay: { intervalMs: 1000, batchSize: 2, maxLagSeconds: 60 },
          },
        },
        { provide: AppLogger, useValue: logger },
      ],
    }).compile()
    relay = moduleRef.get(ChangeRelayService)
  })

  /**
   * Adds pending outbox entries.
   *
   * @param records - Records to queue, in order.
   */
  function queue(...records: ChangeRecord[]): void {
    outbox.entries = records.map((item, index) => ({
      id: `e${index + 1}`,
      record: item,
      attempts: 0,
      created_at: new Date(),
    }))
  }

  it('writes pending records in order, marks them published and stores the chain heads', async () => {
    queue(record('r1'), record('r2'), record('r3'))
    const result = await relay.runOnce()

    expect(result).toEqual({ published: 2, rejected: 0, more: true })
    expect(
      lines.map((line) => (JSON.parse(line) as ChangeRecord).change_id),
    ).toEqual(['r1', 'r2'])
    expect(outbox.published).toEqual(['e1', 'e2'])
    expect(outbox.heads.t1).toBe(
      (JSON.parse(lines[1]) as { hash: string }).hash,
    )
    expect(logger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'change_relay',
        outcome: 'success',
        count: 2,
        durationMs: expect.any(Number),
      }),
    )
  })

  it('does nothing without the lease', async () => {
    outbox.lease = false
    queue(record('r1'))
    expect(await relay.runOnce()).toEqual({
      published: 0,
      rejected: 0,
      more: false,
    })
    expect(outbox.findPending).not.toHaveBeenCalled()
  })

  it('keeps records pending and counts the failure when the change log cannot be written', async () => {
    queue(record('r1'))
    sinkFails = true
    await expect(relay.runOnce()).rejects.toBeInstanceOf(
      RepositoryUnavailableError,
    )

    expect(outbox.published).toEqual([])
    expect(outbox.failed).toEqual(['e1'])
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'change_relay',
        outcome: 'failure',
        retryable: true,
      }),
    )
  })

  it('takes refused records out of the queue and reports them without their values', async () => {
    const leaking = record('r1', [
      { path: 'password', class: 'internal', before: null, after: 'hunter2' },
    ])
    queue(leaking, record('r2'))
    const result = await relay.runOnce()

    expect(result).toMatchObject({ published: 1, rejected: 1 })
    expect(outbox.rejected).toEqual([
      { id: 'e1', reason: 'plain_value_under_secret_name' },
    ])
    expect(outbox.published).toEqual(['e2'])
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'change_log_rejected', changeId: 'r1' }),
    )
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain('hunter2')
  })

  it('warns when the oldest pending record waits too long', async () => {
    outbox.oldest = new Date(Date.now() - 120_000)
    await relay.runOnce()
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'change_relay_lag', maxLagSeconds: 60 }),
    )
  })

  it('runs each pass in its own context with the relay as system actor', async () => {
    let seen: unknown
    outbox.findPending.mockImplementation(async () => {
      seen = getRequestContext()
      return []
    })
    await relay.runOnce()
    expect(seen).toMatchObject({
      actor: { kind: 'system', display_name: 'change-relay' },
    })
  })
})
