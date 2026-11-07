# Data Change History

Status: **Approved** (2026-11-06). Production log platform: **Grafana Loki** (assumed 2026-11-07, not final). Open questions in section 11 are still open. Applies to every collection of every module, not only accounts. Business requirements: `HR-AUD-001` to `HR-AUD-003` (`../business/administrative-operational-system/human-resource-management.md` section 15). Technical rules: `../rules/back-end/logging.md`, `../rules/back-end/database.md`.

## 1. Requirements

| # | Requirement | Source |
|---|---|---|
| R1 | Every create, update, status change, soft delete and delete of any record is recorded: who, when, what changed (before and after), why. | `HR-AUD-001`, user decision |
| R2 | Records are written by the logger to log files, not stored as `updated_by` or as history fields inside the business documents. | User decision |
| R3 | No change may be lost: a committed write without a history record is a defect. No history record may exist for a write that rolled back. | `HR-AUD-001`, error-handling rules |
| R4 | History cannot be edited or deleted by any user. | `HR-AUD-002` |
| R5 | Reading highly confidential records is also recorded. | `HR-AUD-003` |
| R6 | Authorized users can view the history of one record, and of one actor, in the application. | User decision |
| R7 | History never exposes secrets, and exposes confidential values only to readers allowed to see them. | `HR-SEC-002`, `REG-PDP` |
| R8 | Works for any database engine and any country's retention and erasure rules. | `database.md`, `CLAUDE.md` |

## 2. Recommendation

Build a **change log**: a second, dedicated logger channel next to the operational log, fed from the repository layer through a transactional outbox.

```
 service ──▶ repository.update()
                 │  inside one DB transaction:
                 │   1. write the record
                 │   2. diff before/after, mask by field class
                 │   3. insert ChangeRecord into change_outbox
                 ▼
            commit ─────────────▶ rollback: neither exists (R3)
                 │
 change relay (worker app, ordered, at-least-once)
                 │  reads change_outbox, writes each record to
                 ▼
     ChangeLogger (winston instance, own transports, own config)
                 │
     ┌───────────┴─────────────┐
     ▼                         ▼
 JSONL files              log collector
 (append-only,            ──▶ WORM archive (object lock)   R4
  never deleted by app)   ──▶ search index (OpenSearch / Loki / Elastic)
                                   ▲
                    ChangeHistoryReader port ◀── GET /history/...   R6
```

Why each part:

| Part | Reason |
|---|---|
| Capture in the repository | Every module writes through repositories (`database.md`), so one shared helper covers all data, including writes that services forget to log. The repository is also the only place that knows the stored before-state. |
| Transactional outbox | A log line cannot join a database transaction. Writing the log after commit loses changes when the process dies in between; writing it inside `run` records changes that later roll back, and duplicates them when the transaction is retried (`database.md` 7). Inserting the record in the same transaction, then logging it from a relay, satisfies R3. |
| Separate logger channel | The operational log is the wrong store for history: it forbids payloads and before/after values (`logging.md` 4.3), redacts values, drops entries below `LOG_LEVEL`, and its file transport deletes old files (`LOG_FILE_MAX_FILES`). The change log has its own rules, its own retention and narrower access. |
| WORM archive + search index | Files on one server are not tamper-proof and cannot be queried across instances. The archive gives immutability (R4); the index gives the history screen (R6). |

### 2.1 Alternatives considered

| Option | Verdict |
|---|---|
| `updated_by` and `history[]` fields in each document | Rejected (R2). Keeps only the last writer, grows documents without limit, and is editable by anyone who can edit the record. |
| Write the change log directly from the repository after commit | Simpler, but a crash between commit and write loses the change (fails R3). Acceptable only for data without an audit requirement; not recommended as the default. |
| MongoDB change streams | Capture every committed write, even from scripts, but carry no actor or reason (there is no `updated_by` to read) and are Mongo-specific (R8). Useful later as a **completeness check**: compare change-stream events with change records and alert on writes that bypassed repositories. |
| A queryable `audit_events` collection in the main database | Works, but contradicts R2 and puts tamper-protection on the same database the application can write to. |

## 3. Change record

One record per changed entity per write. Shape is engine-neutral and lives in `apps/utility/history/record.ts`.

```ts
/** One recorded change of one entity. Written once, never modified. */
interface ChangeRecord {
  event: 'data_change'
  schema_version: 1
  change_id: string                 // UUID v7: unique and time-ordered; readers dedupe on it
  occurred_at: string               // ISO 8601 UTC, the commit-side time of the write
  tenant_id: string
  entity: {
    type: string                    // stable name, e.g. 'account', 'employee', 'professional_license'
    id: string
    version: number                 // document `version` after the change (optimistic concurrency)
  }
  action: 'create' | 'update' | 'soft_delete' | 'restore' | 'delete' | 'read'
  actor: ActorRef                   // from the request context (section 4.2)
  reason: string | null             // required where a business rule requires one
  operation: string                 // 'AccountService.placeHold', the business operation
  correlation_id: string            // links to operational logs and access log of the same request
  changes: FieldChange[]            // empty for 'read' and 'delete'
  data_class: DataClass             // highest class among the changed fields: drives who may read it
}

/** One changed field. `path` uses dots and array keys, e.g. 'holds[reason=security]'. */
interface FieldChange {
  path: string
  class: DataClass
  before: unknown | MaskedValue
  after: unknown | MaskedValue
}

type DataClass = 'public' | 'internal' | 'confidential' | 'highly_confidential' | 'secret'

/** Placeholder written instead of a value the change log must not hold in plain form. */
type MaskedValue =
  | { masked: 'changed' }                           // value omitted entirely
  | { masked: 'partial'; display: string }          // e.g. '************1234'
  | { masked: 'encrypted'; key_ref: string; ciphertext: string }  // section 7.2
```

Rules:

- `created_at`, `updated_at` and `version` are not listed in `changes`; the record itself carries the time and version.
- Arrays of objects are diffed by a declared key (`login_identifiers` by `type`+`normalized`, `holds` by `reason`+`source`), so reordering does not appear as a change.
- A write that changes nothing (same values) produces no record.
- A `create` lists every non-empty field with `before: null`. A `delete` lists no fields; the previous `create` and `update` records already hold the history.
- A serialized record is at most `CHANGE_RECORD_MAX_BYTES` (default 200 000), below Loki's line limit (section 6.3). When a record would exceed it, the largest field values are replaced by `{ masked: 'changed' }` until it fits, and `truncated: true` is set on the record. The path is still listed, so the history shows that the field changed.

## 4. Capture

### 4.1 Field classification

Each model declares the class of its fields next to the model, in `apps/repository/model/<name>.classification.ts`:

```ts
export const AccountClassification: FieldClassification<Account> = {
  default: 'internal',
  fields: {
    'profile.display_name': 'public',
    'login_identifiers': 'internal',
    'holds': 'internal',
  },
  arrayKeys: { login_identifiers: ['type', 'normalized'], holds: ['reason', 'source'] },
}

export const EmployeePrivateProfileClassification: FieldClassification<EmployeePrivateProfile> = {
  default: 'confidential',
  fields: { 'identifiers': 'confidential', 'bank_accounts': 'confidential' },
  arrayKeys: { identifiers: ['system'] },
}
```

Masking by class:

| Class | Stored in the change log |
|---|---|
| `public`, `internal` | Plain value. |
| `confidential` | `partial` when the model provides a masked form (`value_masked`), otherwise `changed`. Personal values that must be shown to HR use `encrypted` (section 7.2). |
| `highly_confidential` | `changed`. The record still shows *that* the field changed, when and by whom. |
| `secret` (password hash, TOTP secret, token hashes) | `changed`. The path is recorded ("password changed"), never the value, not even encrypted. |

A model without a classification fails a unit test, so new collections cannot skip it.

### 4.2 Actor and reason

- `RequestLoggingInterceptor` already creates the request context. Extend the context with `actor: ActorRef`, built from `request.user` (set by the auth guard, which runs before the interceptor).
- Jobs, consumers and the relay start their own context with a system actor: `runWithRequestContext({ correlationId, actor: systemActor('license-expiry-job') }, work)` (`logging.md` 8).
- Services give a reason with `withChangeReason(reason, () => ...)`, which stores it in the same context. Repository signatures stay unchanged (`database.md` 5.1).
- Unauthenticated flows that write (login, password reset, account activation) set the actor to the account being authenticated, with `kind: 'account'`, before writing.
- A write with no actor in context is rejected with `RepositoryError`: every change must be attributable.

### 4.3 In the repository

A shared engine-neutral helper, `ChangeRecorder` (`CHANGE_RECORDER` token, `@utility/history/recorder`), is injected into every repository implementation:

```ts
async update(id: string, changes: EntityChanges<Account>): Promise<Account> {
  const operation = 'AccountRepository.update'
  try {
    return await this.transactions.run(async () => {
      const before = await this.accountModel.findOne(...)        // read inside the transaction
      if (!before) throw new RepositoryNotFoundError(operation)
      const after = toAccount(await this.accountModel.findOneAndUpdate(..., { new: true }))
      await this.changes.record({ type: 'account', before: toAccount(before), after, classification: AccountClassification })
      return after
    })
  } catch (error) {
    throw translateMongoError(error, operation)
  }
}
```

- `record` diffs, masks, reads actor, reason and correlation id from context, and inserts into `change_outbox` through its own repository. Because it runs inside `run`, it commits or rolls back with the write; a nested `run` joins the caller's transaction (`database.md` 7).
- Bulk writes (`updateMany`) are not allowed on recorded collections; use a loop of single writes inside one `run`, or a named repository method that records each affected entity.
- `REPOSITORY_*` fakes in service tests are unaffected; repository tests assert the outbox content.

### 4.4 Reads of highly confidential data (R5)

Services call `changes.recordAccess({ type, id, operation })` after a successful read of a highly confidential record (credentialing assessments, occupational health, discipline cases). It writes an `action: 'read'` record through the same outbox. List screens record one access per opened record, not per row shown in a list (which shows no highly confidential fields).

## 5. `change_outbox` collection

Engine-specific storage for records waiting for the relay. Not history: entries are deleted after publication.

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | Insert order. |
| `tenant_id` | ObjectId | |
| `record` | `ChangeRecord` | Already masked. |
| `published_at` | Date \| null | |
| `attempts`, `next_attempt_at`, `last_error` | | `last_error` holds the error class name only. |

Indexes: `{ published_at: 1, _id: 1 }` for the relay; TTL on `published_at` after `CHANGE_OUTBOX_KEEP_DAYS` (default 7). The application's database user may insert and update `published_at`, nothing else.

## 6. Relay and change logger

### 6.1 Relay

- Runs in the `worker` application, one active instance per connection (leader lock document with lease), so records leave in commit order.
- Reads unpublished records in `_id` order in batches, writes each to `ChangeLogger`, waits for the transport to flush, then sets `published_at`. At-least-once: after a crash a record may be written twice; readers dedupe on `change_id`.
- Logs one operational summary per batch (`event: 'change_relay'`, `count`, `durationMs`, `outcome`, `retryable`) through `AppLogger`, never the records.
- Alerts when the oldest unpublished record is older than `CHANGE_RELAY_MAX_LAG_SECONDS`.

### 6.2 `ChangeLogger`

A separate winston logger in `apps/utility/history/logger.ts`, created from a new configuration context `environment/<environment>/change-log.env` (`stack.md` 3.6). It is **not** the `AppLogger`, and `LOG_LEVEL` does not filter it.

| Variable | Default | Meaning |
|---|---|---|
| `CHANGE_LOG_STDOUT` | `false` | Also write records to stdout, tagged `stream: 'change'`, for collectors that read stdout. |
| `CHANGE_LOG_FILE_DIR` | empty | Directory for daily JSONL files `changes-YYYY-MM-DD.jsonl`. |
| `CHANGE_LOG_HASH_CHAIN` | `true` | Add `prev_hash` and `hash` (SHA-256) per tenant, so a missing or edited line is detectable. |

- Format: `jsonFormat()` only, one record per line. It does **not** run `sanitize`'s value redaction, because masking already happened at capture by field class; it does run a secret-name check that rejects a record containing a `DEFAULT_REDACT_KEYS` name with a plain value (defence in depth).
- Files rotate daily and are **never deleted by the application** (no `maxFiles`). Archival and deletion after retention belong to the log platform.
- At least one of stdout or file must be enabled; the app fails at startup otherwise.

### 6.3 Storage in production: Grafana Loki

Assumed platform (2026-11-07). The design stays engine-neutral: only the shipper configuration and `LokiChangeHistoryReader` (section 8.1) know Loki. Details marked *(verify)* are Loki defaults that differ between versions; check them against the deployed version.

```
ChangeLogger ─▶ daily JSONL files on a persistent volume
                    │                         │
        Grafana Alloy (tail, parse, label)    nightly archive job (closed day files)
                    ▼                         ▼
           Loki, tenant "change"        S3-compatible bucket, Object Lock (compliance mode)
           (search, recent window)      (legal retention, tamper-resistant)
                    ▲
        LokiChangeHistoryReader ◀── history API
```

**Why two stores.** Loki is the search index. It is not tamper-proof: its retention and delete features remove data, and its administrators can change it. The locked bucket plus the hash chain (section 6.2) provide R4. Loki can therefore keep a shorter, searchable window than the legal retention (section 7.1).

**Shipping.**

- Write files, not only stdout: files survive a collector outage and feed the archive job. In Kubernetes mount one persistent volume into the worker pod and into Alloy (sidecar or node agent). Alloy records read positions, so a restart does not resend.
- Alloy sets the log timestamp from `occurred_at`, so time-range queries mean event time.
- Delivery is at least once. Loki drops identical lines with the same stream and timestamp *(verify)*, and the reader also dedupes on `change_id`.
- Sketch of the Alloy pipeline (validate against the deployed Alloy version):

```alloy
loki.source.file "change_log" {
  targets    = [{ __path__ = "/var/log/horas/change/changes-*.jsonl", stream = "change" }]
  forward_to = [loki.process.change.receiver]
}

loki.process "change" {
  stage.json {
    expressions = {
      tenant         = "tenant_id",
      entity_type    = "entity.type",
      entity_id      = "entity.id",
      action         = "action",
      actor          = "actor.account_id",
      correlation_id = "correlation_id",
      occurred_at    = "occurred_at",
    }
  }
  stage.timestamp { source = "occurred_at", format = "RFC3339Nano" }
  stage.labels { values = { tenant = "", entity_type = "", action = "" } }
  stage.structured_metadata { values = { entity_id = "", actor = "", correlation_id = "" } }
  forward_to = [loki.write.change.receiver]
}

loki.write "change" {
  endpoint {
    url       = "http://loki-gateway/loki/api/v1/push"
    tenant_id = "change"
  }
}
```

**Labels.** Every unique label combination is a stream, so labels must have few values:

| Kind | Fields | Why |
|---|---|---|
| Labels | `stream="change"`, `tenant`, `entity_type`, `action` | A few dozen values each. `entity_type` also lets retention rules differ per type (below). |
| Structured metadata | `entity_id`, `actor`, `correlation_id` | Millions of values; as labels they would create millions of streams and break Loki. Needs Loki 3.x with the TSDB index and schema v13 *(verify)*. Queried with `| entity_id="…"`. |
| Line body | the full `ChangeRecord` JSON | The reader parses it. |

**Tenants.** Run Loki with `auth_enabled: true` and use two Loki tenants: `ops` (operational logs) and `change` (change records). This gives separate access, limits and retention without a second cluster. Platform tenants stay a label inside `change`. Do not provision a Grafana data source for `change` for operators; the history API's service account is the only reader (R7, back-end `logging.md` 13.5).

**Limits to set for the `change` tenant** *(verify defaults)*:

| Limit | Default (approx.) | Setting |
|---|---|---|
| `reject_old_samples_max_age` | 7 days | Raise to at least 30 days. With the timestamp taken from `occurred_at`, a relay or Alloy outage longer than the limit would make Loki reject the backlog. Alert on relay lag long before that (`CHANGE_RELAY_MAX_LAG_SECONDS`). |
| `max_line_size` | 256 KB | Keep above `CHANGE_RECORD_MAX_BYTES` (section 3). |
| `max_query_length` | ~30 days | The reader queries in windows of at most this length (section 8.1) instead of raising it for everyone. |
| `max_entries_limit_per_query` | 5000 | The reader's page size stays well below it. |
| Retention | none until the compactor enables it | Enable the compactor with retention. Set `retention_period` for the tenant and `retention_stream` rules per `entity_type`, for example 10 years for employee records and a shorter window for low-value types. |

**Cost of lookups.** Loki selects streams by label and then scans the matching chunks in the time range. "History of one record" is therefore a scan of one `tenant` + `entity_type` stream, fast for months and slower for years on a busy tenant. The history screen shows the last 12 months first and loads older windows on request. Expected volume (records per day) decides whether this is enough (H6).

**Single hospital without Loki.** The file transport plus the nightly archive job is the minimum, read with `FileChangeHistoryReader` (section 8.1), acceptable only at small volume.

## 7. Retention and erasure

### 7.1 Retention

Retention is configured per entity type and jurisdiction (`HR-SEC-003`, Q11 of the HR specification), for example 10 years after separation for employee records, and set as the archive's object-lock period. The application never shortens it. Loki's retention (section 6.3) is the *searchable* window and may be shorter; records older than it are still in the archive and are restored or read from there on request.

### 7.2 Erasure of personal data (`REG-PDP`, GDPR)

History cannot be edited, yet personal data must disappear after retention or on a lawful erasure request. Use **crypto-shredding** for personal values that must be readable in history (names, contacts):

- Such fields are written as `{ masked: 'encrypted', key_ref, ciphertext }`, encrypted with a key per data subject (`key_ref` = subject id, for example the employee id), held in the KMS.
- Erasure destroys the subject's key. The records stay intact and verifiable (hash chain unchanged), but those values can no longer be read.
- Identifiers that are only ever shown masked (NIK, bank number) use `partial` and need no key.

## 8. Viewing history

### 8.1 Reader port

`ChangeHistoryReader` (`CHANGE_HISTORY_READER` token, `@utility/history/reader`), engine-neutral like repositories:

```ts
/** Time window and paging for a history query. `cursor` comes from the previous page. */
interface HistoryQuery { from?: Date; to?: Date; limit?: number; cursor?: string }

/** One page of history. Cursor based because log stores cannot count or skip rows. */
interface HistoryPage { data: ChangeRecord[]; next_cursor: string | null }

interface ChangeHistoryReader {
  /** History of one entity, newest first. */
  findByEntity(tenantId: string, type: string, id: string, options: HistoryQuery): Promise<HistoryPage>
  /** Changes made by one actor in a time range. */
  findByActor(tenantId: string, accountId: string, options: HistoryQuery): Promise<HistoryPage>
  /** All changes in one request, by correlation id. */
  findByCorrelation(tenantId: string, correlationId: string): Promise<ChangeRecord[]>
}
```

`HistoryPage` replaces `Page<T>` here: a log store cannot give `totalRecords` or random page numbers cheaply, so the screen uses "load more", not page buttons.

Adapters, chosen by `CHANGE_HISTORY_BACKEND`:

- `LokiChangeHistoryReader` (production, assumed): calls `GET /loki/api/v1/query_range` with `X-Scope-OrgID: change`, `direction=backward` and the page limit. It splits long ranges into windows of at most `max_query_length`, newest window first, until the page is full. The cursor is the last record's `occurred_at` and `change_id`. It dedupes on `change_id` and sorts by `occurred_at`, then `change_id`.
- `FileChangeHistoryReader`: scans the JSONL files; for local development and small single-server installs.
- Other platforms (OpenSearch, Elastic) would add an adapter without changing callers.

LogQL queries (values are never concatenated from raw input):

```
{stream="change", tenant="<tenant>", entity_type="<type>"} | entity_id="<id>"
{stream="change", tenant="<tenant>"} | actor="<account id>"
{stream="change", tenant="<tenant>"} | correlation_id="<id>"
```

- Validate every value before it enters a query: tenant and type against `^[a-z0-9_.-]{1,64}$`, identifiers against `^[A-Za-z0-9_-]{1,64}$`. Reject anything else with `RepositoryValidationError`. Free text from a client must never reach LogQL (query injection could read another tenant's records).
- The reader always adds the `tenant` selector from the authenticated session, never from the request.
- Loki errors, timeouts and rate limits map to `RepositoryUnavailableError` (retryable); other failures to `RepositoryError`. Error messages never include query text or record values.

### 8.2 API and screen

List endpoints take `limit` and `cursor` and return `{ data, next_cursor }` (section 8.1).

- `GET /history/{entityType}/{entityId}` — timeline of one record: who, when, action, reason, field-by-field before and after.
- `GET /history?actor={accountId}&from=&to=` — what one user changed.
- `GET /history/correlation/{correlationId}` — everything one request changed, across collections.

Access:

- Viewing an entity's history requires permission to view the entity itself plus `history:view` for its module.
- The API masks again at read time: a reader who may not see `confidential` data gets `changed` instead of `partial` or decrypted values.
- Opening the history of a highly confidential record is itself recorded (section 4.4).
- Results show the actor's `display_name` snapshot from the record, so history stays readable after accounts are closed.

## 9. Consequences for existing documents

| Document | Change (applied 2026-11-06) |
|---|---|
| `../rules/logging.md` | Add: data changes are recorded in the change log, not the operational log; the "never log payloads" rule applies to the operational log. Merged into `../rules/back-end/logging.md` sections 1 and 2 on 2026-11-07; the general file was removed. |
| `../rules/back-end/logging.md` | New section: change log channel, its configuration, why it skips value redaction, separate access. |
| `../rules/back-end/database.md` | Repositories record every write through `ChangeRecorder` in the same transaction; no `updated_by`; no bulk writes on recorded collections; every model has a classification. |
| `account-and-workforce-collections.md` | Section 7.1 already points here. |
| HR specification section 15 | Implementation reference to this document. |

## 10. Testing

- Unit: diff and masking per class, array keys, no-op writes, `secret` never leaves plain values, models without classification fail.
- Repository (with `MongoMemoryReplSet`): a committed write leaves exactly one outbox record; a rolled-back transaction leaves none; a retried transaction leaves one.
- Relay: records are written in order; a crash before `published_at` causes a duplicate with the same `change_id`, not a loss.
- `ChangeLogger`: capture lines with a `transports.Stream` over an object-mode `Writable` (`logging.md` 12); assert hash chain and that secrets are rejected.
- API: a reader without confidential access never receives `partial` or decrypted values.

## 11. Open questions

| # | Question |
|---|---|
| H1 | Production log platform. **Assumed: Grafana Loki** (2026-11-07); the user has not decided finally. Confirm the Loki version (structured metadata needs 3.x) and whether it is self-hosted or Grafana Cloud (limits are set by the provider there). |
| H2 | Retention period per entity type and jurisdiction (HR specification Q11). |
| H3 | Is crypto-shredding required from the start, or are personal values in history masked (`changed`) until erasure is needed? |
| H4 | Should `created_by` also be removed from documents, since the `create` record holds it? (Kept for now: list screens show "created by" without a history query.) |
| H5 | Should authentication events (`security_events` in the account design) move to the logger as well, as a third channel? |
| H6 | Expected volume of change records per day per tenant? It decides whether Loki scans stay fast for multi-year entity history, or whether a narrower index is needed. |
| H7 | Archive target for the locked copy (S3, MinIO, Azure immutable blob) and how archived days are restored for the history screen. |

## 12. Implementation notes (2026-11-07)

Built: capture (sections 3 to 4), outbox (5), relay and change logger (6.1, 6.2). Rules for code: `../rules/back-end/logging.md` section 13. Where the build differs from this design:

| Design | Built | Why |
|---|---|---|
| `ChangeLogger` is a winston logger (6.2). | `ChangeLogger` writes JSON lines itself to sinks (`DailyFileSink` with `fsync`, `StdoutSink`). | The relay must not set `published_at` before the line is durable (6.1, R3). Winston cannot confirm that one write reached disk. |
| Outbox entries have `next_attempt_at` (5). | `attempts` and `last_error` only; the relay backs off globally. | Retrying one entry while later ones are published would break the order (6.1). |
| — | Records the change log refuses (secret guard) are marked `rejected_at` and stay in the outbox. | They must not be lost (R3) or written (R7), and must not block the queue. |
| — | Chain heads and the relay lease are stored in `change_relay_state`. | The hash chain continues after a restart; one relay per connection. |
| — | The outbox is provided by the connection module (`CHANGE_OUTBOX`), like the transaction manager. | The record must be in the same transaction, and a transaction covers one connection. |
| `ChangeHistoryReader` and the history API (8). | Not built. | Decision 2026-11-07: history is read in Grafana Loki from the shipped change-log files. Access to the `change` tenant stays restricted (6.3, R7). |
| `encrypted` values for crypto-shredding (7.2). | Not built; such values are stored as `changed`. | Open question H3. |
