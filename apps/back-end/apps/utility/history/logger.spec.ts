import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Writable } from 'node:stream'
import {
  ChangeLogger,
  type ChangeLogSink,
  DailyFileSink,
  findSecretValue,
  StdoutSink,
  verifyLine,
} from './logger'
import { type ChangeRecord } from './record'

/**
 * Builds a change record.
 *
 * @param changeId - Record identifier.
 * @param tenantId - Tenant.
 * @param changes - Field changes.
 * @returns The record.
 */
function record(
  changeId: string,
  tenantId = 't1',
  changes: ChangeRecord['changes'] = [],
): ChangeRecord {
  return {
    event: 'data_change',
    schema_version: 1,
    change_id: changeId,
    occurred_at: '2026-11-07T01:00:00.000Z',
    tenant_id: tenantId,
    entity: { type: 'account', id: 'a1', version: 2 },
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
 * Sink that keeps lines in memory.
 */
class MemorySink implements ChangeLogSink {
  readonly lines: string[] = []

  /**
   * Stores lines.
   *
   * @param lines - Serialized lines.
   */
  async write(lines: readonly string[]): Promise<void> {
    this.lines.push(...lines)
  }
}

describe('ChangeLogger', () => {
  it('writes one JSON line per record, tagged with the change stream', async () => {
    const sink = new MemorySink()
    await new ChangeLogger([sink], false).write(
      [record('r1'), record('r2')],
      {},
    )
    expect(sink.lines.map((line) => JSON.parse(line))).toMatchObject([
      { change_id: 'r1', stream: 'change' },
      { change_id: 'r2', stream: 'change' },
    ])
    expect(sink.lines[0]).not.toContain('hash')
  })

  it('chains hashes per tenant and continues from the stored heads', async () => {
    const sink = new MemorySink()
    const logger = new ChangeLogger([sink], true)
    const first = await logger.write(
      [record('r1', 't1'), record('r2', 't2')],
      {},
    )
    const second = await logger.write([record('r3', 't1')], first.heads)

    const lines = sink.lines.map(
      (line) => JSON.parse(line) as { prev_hash: string | null; hash: string },
    )
    expect(lines[0].prev_hash).toBeNull()
    expect(lines[1].prev_hash).toBeNull()
    expect(lines[2].prev_hash).toBe(lines[0].hash)
    expect(second.heads).toEqual({ t1: lines[2].hash, t2: lines[1].hash })
    expect(sink.lines.every(verifyLine)).toBe(true)
  })

  it('detects an edited line', async () => {
    const sink = new MemorySink()
    await new ChangeLogger([sink], true).write([record('r1')], {})
    expect(verifyLine(sink.lines[0].replace('HR Admin', 'Someone else'))).toBe(
      false,
    )
  })

  it('refuses records with a plain value under a secret name and writes the rest', async () => {
    const sink = new MemorySink()
    const leaking = record('r1', 't1', [
      {
        path: 'credentials.password',
        class: 'internal',
        before: null,
        after: 'hunter2',
      },
    ])
    const result = await new ChangeLogger([sink], true).write(
      [leaking, record('r2')],
      {},
    )
    expect(result.rejected).toEqual([
      { record: leaking, reason: 'plain_value_under_secret_name' },
    ])
    expect(result.written.map((item) => item.change_id)).toEqual(['r2'])
    expect(sink.lines.join('\n')).not.toContain('hunter2')
  })

  it('does not write when every sink must succeed and one fails', async () => {
    const failing: ChangeLogSink = {
      write: () => Promise.reject(new Error('disk full')),
    }
    await expect(
      new ChangeLogger([failing], true).write([record('r1')], {}),
    ).rejects.toThrow('disk full')
  })
})

describe('findSecretValue', () => {
  it('accepts masked or empty values under secret names', () => {
    expect(
      findSecretValue(
        record('r1', 't1', [
          {
            path: 'password_hash',
            class: 'secret',
            before: { masked: 'changed' },
            after: { masked: 'changed' },
          },
          {
            path: 'tokens[type=api].token',
            class: 'secret',
            before: null,
            after: { masked: 'changed' },
          },
        ]),
      ),
    ).toBeNull()
  })
})

describe('DailyFileSink', () => {
  let directory: string

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'change-log-'))
  })

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true })
  })

  it('appends to the file of the UTC day and never replaces it', async () => {
    const sink = new DailyFileSink(
      join(directory, 'change'),
      () => new Date('2026-11-07T23:59:59Z'),
    )
    await sink.write(['{"a":1}'])
    await sink.write(['{"b":2}', '{"c":3}'])
    const text = await readFile(
      join(directory, 'change', 'changes-2026-11-07.jsonl'),
      'utf8',
    )
    expect(text).toBe('{"a":1}\n{"b":2}\n{"c":3}\n')
  })
})

describe('StdoutSink', () => {
  it('resolves after the stream accepted the lines', async () => {
    const chunks: string[] = []
    const stream = new Writable({
      write(chunk: Buffer, _encoding, done) {
        chunks.push(chunk.toString())
        done()
      },
    })
    await new StdoutSink(stream).write(['{"a":1}'])
    expect(chunks).toEqual(['{"a":1}\n'])
  })
})
