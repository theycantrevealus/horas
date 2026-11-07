import { createHash } from 'node:crypto'
import { mkdir, open } from 'node:fs/promises'
import { join } from 'node:path'
import { DEFAULT_REDACT_KEYS } from '@utility/logger/format'
import { type ChainHeads } from './outbox'
import { ChangeRecord } from './record'

/**
 * Value of the `stream` field on every change-log line, so collectors that read a shared
 * stdout can tell change records from operational logs.
 */
export const CHANGE_STREAM = 'change'

/**
 * One line as written to the change log: the record plus its stream tag and hash-chain links.
 *
 * @property stream - Always `change`.
 * @property prev_hash - Hash of the tenant's previous line, or `null` for the first line.
 * @property hash - SHA-256 of this line without `hash`.
 */
export type ChangeLogLine = ChangeRecord & {
  stream: typeof CHANGE_STREAM
  prev_hash?: string | null
  hash?: string
}

/**
 * A destination of change-log lines. `write` resolves only when the lines are durable,
 * so the relay can mark them published.
 */
export interface ChangeLogSink {
  /**
   * Writes lines in order.
   *
   * @param lines - Serialized lines, without line breaks.
   */
  write(lines: readonly string[]): Promise<void>
}

/**
 * A record the change log refused.
 *
 * @property record - The refused record.
 * @property reason - Machine-readable reason, safe to log.
 */
export interface RejectedRecord {
  record: ChangeRecord
  reason: string
}

/**
 * Result of writing one batch.
 *
 * @property written - Records written, in order.
 * @property rejected - Records refused by the secret guard.
 * @property heads - Chain heads after the batch.
 */
export interface ChangeLogWriteResult {
  written: ChangeRecord[]
  rejected: RejectedRecord[]
  heads: ChainHeads
}

/**
 * Normalizes a field name for comparison with `DEFAULT_REDACT_KEYS`, as `sanitize` does.
 *
 * @param name - Field name.
 * @returns Lower-case letters and digits only.
 */
function normalizeKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
 * Normalized secret field names.
 */
const SECRET_KEYS = new Set(DEFAULT_REDACT_KEYS.map(normalizeKey))

/**
 * Checks whether a stored value is a masked placeholder or empty.
 *
 * @param value - `before` or `after` of a field change.
 * @returns `true` when it holds no plain value.
 */
function isMaskedOrEmpty(value: unknown): boolean {
  return value === null || (typeof value === 'object' && 'masked' in value)
}

/**
 * Lists the field names in a change path, for example `holds[reason=x].note` → `holds`, `note`.
 *
 * @param path - Field change path.
 * @returns The field names.
 */
function namesOf(path: string): string[] {
  return path
    .replace(/\[[^\]]*\]/g, '')
    .split('.')
    .filter((name) => name.length > 0)
}

/**
 * Secret guard (defence in depth): finds a plain value stored under a secret field name,
 * which means the model's classification is wrong.
 *
 * @param record - Change record.
 * @returns The reason to refuse the record, or `null` when it is safe.
 */
export function findSecretValue(record: ChangeRecord): string | null {
  for (const change of record.changes) {
    const secretName = namesOf(change.path).some((name) =>
      SECRET_KEYS.has(normalizeKey(name)),
    )
    if (
      secretName &&
      !(isMaskedOrEmpty(change.before) && isMaskedOrEmpty(change.after))
    ) {
      return 'plain_value_under_secret_name'
    }
  }
  return null
}

/**
 * SHA-256 of a text, in hexadecimal.
 *
 * @param text - Text to hash.
 * @returns The digest.
 */
function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

/**
 * Serializes a record as one change-log line, linked to the tenant's previous line when the
 * hash chain is on. `hash` covers the line without `hash`, so a verifier removes `hash`,
 * serializes the rest and compares.
 *
 * @param record - Change record.
 * @param prevHash - Hash of the tenant's previous line, or `undefined` when the chain is off.
 * @returns The line text and its hash.
 */
export function toLine(
  record: ChangeRecord,
  prevHash: string | null | undefined,
): { text: string; hash?: string } {
  if (prevHash === undefined) {
    return { text: JSON.stringify({ ...record, stream: CHANGE_STREAM }) }
  }
  const unsigned = { ...record, stream: CHANGE_STREAM, prev_hash: prevHash }
  const hash = sha256(JSON.stringify(unsigned))
  return { text: JSON.stringify({ ...unsigned, hash }), hash }
}

/**
 * Checks one line of the hash chain.
 *
 * @param text - Line text as read from the log.
 * @returns `true` when its `hash` matches its content.
 */
export function verifyLine(text: string): boolean {
  const parsed: unknown = JSON.parse(text)
  if (typeof parsed !== 'object' || parsed === null || !('hash' in parsed)) {
    return false
  }
  const { hash, ...unsigned } = parsed
  return typeof hash === 'string' && sha256(JSON.stringify(unsigned)) === hash
}

/**
 * Writes change records to the change log (`logging.md` section 13.4): one JSON line per record,
 * with a per-tenant hash chain, after the secret guard. It is not the `AppLogger`:
 * `LOG_LEVEL` and `sanitize` do not apply, because values were masked at capture.
 * Only the change relay calls it.
 */
export class ChangeLogger {
  /**
   * @param sinks - Destinations; every one must accept a batch before it counts as written.
   * @param hashChain - Whether to add `prev_hash` and `hash`.
   */
  constructor(
    private readonly sinks: readonly ChangeLogSink[],
    private readonly hashChain: boolean,
  ) {}

  /**
   * Writes a batch of records in order and resolves when every sink made it durable.
   * Records refused by the secret guard are not written and are returned in `rejected`.
   *
   * @param records - Records in outbox order.
   * @param heads - Chain heads before the batch.
   * @returns What was written and the chain heads after the batch.
   */
  async write(
    records: readonly ChangeRecord[],
    heads: ChainHeads,
  ): Promise<ChangeLogWriteResult> {
    const nextHeads: ChainHeads = { ...heads }
    const written: ChangeRecord[] = []
    const rejected: RejectedRecord[] = []
    const lines: string[] = []

    for (const record of records) {
      const reason = findSecretValue(record)
      if (reason) {
        rejected.push({ record, reason })
        continue
      }
      const prevHash = this.hashChain
        ? (nextHeads[record.tenant_id] ?? null)
        : undefined
      const line = toLine(record, prevHash)
      if (line.hash) {
        nextHeads[record.tenant_id] = line.hash
      }
      lines.push(line.text)
      written.push(record)
    }

    if (lines.length > 0) {
      for (const sink of this.sinks) {
        await sink.write(lines)
      }
    }
    return { written, rejected, heads: nextHeads }
  }
}

/**
 * Appends lines to daily files `changes-YYYY-MM-DD.jsonl` (UTC date of the write) and syncs
 * them to disk. Files are never rotated away or deleted by the application; archival and
 * deletion after retention belong to the log platform.
 */
export class DailyFileSink implements ChangeLogSink {
  private directoryReady = false

  /**
   * @param directory - Directory of the daily files.
   * @param clock - Current time; replaceable in tests.
   */
  constructor(
    private readonly directory: string,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  /**
   * Appends lines to today's file and waits for `fsync`.
   *
   * @param lines - Serialized lines.
   */
  async write(lines: readonly string[]): Promise<void> {
    if (!this.directoryReady) {
      await mkdir(this.directory, { recursive: true })
      this.directoryReady = true
    }
    const day = this.clock().toISOString().slice(0, 10)
    const file = await open(join(this.directory, `changes-${day}.jsonl`), 'a')
    try {
      await file.appendFile(`${lines.join('\n')}\n`, 'utf8')
      await file.sync()
    } finally {
      await file.close()
    }
  }
}

/**
 * Writes lines to stdout for collectors that read it. Lines carry `stream: 'change'`.
 */
export class StdoutSink implements ChangeLogSink {
  /**
   * @param stream - Output stream; stdout by default.
   */
  constructor(
    private readonly stream: NodeJS.WritableStream = process.stdout,
  ) {}

  /**
   * Writes lines and waits until the stream accepted them.
   *
   * @param lines - Serialized lines.
   */
  write(lines: readonly string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      this.stream.write(`${lines.join('\n')}\n`, (error?: Error | null) =>
        error ? reject(error) : resolve(),
      )
    })
  }
}
