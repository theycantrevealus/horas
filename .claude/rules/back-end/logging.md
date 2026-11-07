# Back End Logging

The back end writes two separate log channels: the **operational log** (what the system did) and the **change log** (what happened to data). Sections 1 and 2 apply to both. Sections 3 to 12 describe the operational log, and section 13 the change log.

The operational log is built on `winston` through `nest-winston`. Business code (services, controllers, filters, repositories, domain logic) injects `AppLogger` and never touches winston. `main.ts` routes Nest's logger to winston, so changing the logging library must only change files under `apps/utility/logger/` and the application bootstrap.

## 1. Principles

For every relevant processing step that changes data or state, the logs must let someone investigating find out:

- What operation was attempted.
- Which service processed it.
- Which correlation or transaction identifier was involved.
- Whether it succeeded or failed.
- Whether the failure is retryable.
- How long the operation took.

Rules:

- Use structured logs: objects with the shared fields of section 4.2, never interpolated strings.
- Keep one correlation identifier per request, across services and asynchronous boundaries (section 8).
- Never log credentials, secrets, or patient and personal data. Log identifiers and counts instead of payloads (section 4.3).
- Do not log reads. Fetching data writes no log entry (section 4.3).
- Do not log inside high-volume loops. Log one summary entry after the loop.
- When adding a processing stage (endpoint, consumer, job, relay), make its success, failure, latency and retry behaviour observable, and assert those entries in a test (section 12).

## 2. Log channels

| Channel | Content | Written by | Rules |
|---|---|---|---|
| Operational log | Operations that change data or state, their outcomes, latency, retries and errors, and the access log. Not data reads. | `AppLogger` | Sections 3 to 12. Never payloads or record values. |
| Change log | One record per created, changed or deleted entity (who, when, before and after per field, reason), and reads of highly confidential records. | `ChangeRecorder`, then the change relay and `ChangeLogger` | Section 13 and `.claude/design/data-change-history.md`. Values only in masked form; secrets never. |

- Record data changes in the change log only: never in the operational log, and never as `updated_by` or history fields in the records themselves (`database.md` 4.5).
- The "never log payloads" rule applies to the operational log. The change log is the only place where field values may appear, and only in the masked form its design requires.
- Both channels carry the same `correlationId` for one request, so they can be read together.
- The channels have separate storage, retention and access. Operators read operational logs; change history is read only by the accounts allowed to (section 13.5).

## 3. Layout

| Path | Alias | Contents |
|---|---|---|
| `apps/utility/logger/module.ts` | `@utility/logger/module` | `LoggerModule`: configures winston from `LoggerConfig` and exports `AppLogger`. Not global. |
| `apps/utility/logger/service.ts` | `@utility/logger/service` | `AppLogger`: the logger business code injects. |
| `apps/utility/logger/transport.ts` | `@utility/logger/transport` | `createLoggerOptions` and `createTransports`, built from the typed config. |
| `apps/utility/logger/format.ts` | `@utility/logger/format` | `sanitize` (redaction), `requestContext` (correlation identifier), `prettyFormat`, `jsonFormat`, `DEFAULT_REDACT_KEYS`. |
| `apps/utility/logger/level.ts` | `@utility/logger/level` | `LOG_LEVELS`, `LogLevelName`, `toLogLevelName`, `createLogLevelMapper`. |
| `apps/utility/logger/context.ts` | `@utility/logger/context` | Request context (`AsyncLocalStorage`): `runWithRequestContext`, `getRequestContext`, `attachRequestContext`, `runInRequestContextOf`. |
| `apps/utility/logger/interceptor.ts` | `@utility/logger/interceptor` | `RequestLoggingInterceptor`, `CORRELATION_HEADER`, `RequestLogEntry`. |
| `apps/utility/logger/bridge.ts` | `@utility/logger/bridge` | `createExternalLogHandler` for third-party library logs. |
| `apps/configuration/logger.ts` | `@configuration/logger` | `LoggerSchema` and `LoggerConfig` (`logger` namespace). |

Rules:

- `apps/utility/logger` stays generic. Do not put domain types (accounts, patients, models) there.
- Only `apps/utility/logger/` and `main.ts` may import `winston` or `nest-winston`. The exception is code that bridges a library's logger and needs `WINSTON_MODULE_PROVIDER` (section 10).
- Business code must not import `Logger` from `@nestjs/common` for its own logging. Inject `AppLogger` instead (section 4.1). The only exception is a class that Nest does not create, such as `MongoTransactionManager`, which is built with `new` inside a connection factory; it may use `new Logger(Class.name)`.
- Do not use `console.*` outside bootstrap failure handling in `main.ts`.

## 4. Writing logs

### 4.1 Getting a logger

Inject `AppLogger` in the constructor, and import `LoggerModule` in the module that declares the class:

```ts
constructor(
  @Inject(REPOSITORY_LOV) private readonly lovRepository: LovRepository,
  @Inject(AppLogger) private readonly logger: AppLogger,
) {}
```

`AppLogger` is transient: each class gets its own instance, whose `context` is that class's name, so entries are searchable by service without passing the name. It holds only that name and forwards every call to the shared winston logger installed by `app.useLogger`. Injecting it creates no new winston logger, transport or file handle. It offers Nest's `Logger` methods (`log`, `error`, `warn`, `debug`, `verbose`, `fatal`).

### 4.2 Entry fields

Log structured objects with these fields where they apply, so entries can be searched the same way across services:

| Field | Meaning |
|---|---|
| `event` | Stable, snake_case name of what happened, for example `transaction`, `repository_error`, `lov_imported`. |
| `operation` | What was attempted, as `Class.method`, for example `LovRepository.update`. |
| `outcome` | `success`, `failure`, `committed`, `aborted`, ... |
| `durationMs` | How long the operation took, measured with `performance.now()` or `Date.now()`. |
| `retryable` | Whether a failure is transient. Copy it from `RepositoryError.retryable` when there is one. |
| `error` | Error class name only. Never the message of a driver error, which can contain document values. |

```ts
this.logger.warn({
  event: 'transaction',
  outcome: 'aborted',
  error: translated.name,
  retryable: translated.retryable,
  durationMs: Date.now() - startedAt,
})
```

- The service name (`context`), timestamp, level, process and `correlationId` are added automatically. Do not add them by hand.
- `GatewayBackOfficeService.createLov` and `updateLov` (through `writeLov`) are the reference example: one entry per write with `event`, `operation`, `outcome`, `durationMs`, and `error` and `retryable` on failure; they log neither the values written nor the record.

### 4.3 What not to log

- **Never log a data read.** Fetching data (`findAll`, `findOne`, `findBy*`, and the service methods that only call them: `get`, `list`, `getLovByGroup`) writes no entry, on success or on failure. Wrapping a read in `observe(...)` or a hand-written `try`/`catch` that logs is not allowed. Log the writes: create, update, delete, soft delete, holds, grants, revocations, sign-in and sign-out.
  - A failed read is not logged by the data layer either. `RepositoryExceptionFilter` skips repository errors whose operation is a read (`isReadOperation`: the method is named `find*`), and `IdentityExceptionFilter` skips `not_found` rejections of `GET` and `HEAD` requests. The client still gets the error response, and the access log (section 9) still records the status, error name and retry flag of the request.
  - Authentication and permission rejections (401, 403) are not data reads and stay logged, whatever the method.
  - A repository method is a read only if its name starts with `find`; any other name is treated as a write (`database.md` 4.2). A read with another name would be logged as a write, so name reads `find*`.
  - The one deliberate exception is the change-log access record of a highly confidential record (`recordAccess`, section 13.2), an audit requirement (`HR-AUD-003`). It is opt-in per service, never written by a repository, and no service calls it yet.
- Never log request payloads, response results, full documents, query strings or path parameters. Log identifiers (`accountId`, record `id`) and counts instead.
- Never log before and after values of a change. They belong to the change log (section 2).
- Inside `TransactionManager.run` work, do not write logs that must happen once; the work may be retried (`database.md` section 7). Log after `run` resolves.

### 4.4 Levels

The platform levels are winston's `npm` levels plus `fatal`. Nest `Logger` methods map to them as follows:

| Level | Nest method | Use for |
|---|---|---|
| `fatal` | `fatal` | The process cannot continue. |
| `error` | `error` | Unexpected defects and server errors (5xx). |
| `warn` | `warn` | Business rejections, client errors (4xx), aborted transactions, retries. |
| `info` | `log` | Important state changes and startup. |
| `http` | `log({ ..., level: 'http' })` | Access log; written by `RequestLoggingInterceptor` only. |
| `verbose` | `verbose` | Detailed flow that is useful in pre-production. |
| `debug` | `debug` | Diagnostics, for example committed transactions. |

## 5. Configuration

Logger settings are a configuration context of their own (`stack.md` section 3), in `environment/<environment>/logger.env`:

| Variable | Values | Default | Meaning |
|---|---|---|---|
| `LOG_LEVEL` | a platform level | `info` | Most verbose level written. |
| `LOG_FORMAT` | `pretty`, `json` | `json` | Console output style. `pretty` is for local development only. |
| `LOG_FILE_PATH` | path or empty | empty | When set, entries are also written as JSON to this file. |
| `LOG_FILE_MAX_SIZE_MB` | positive integer | `20` | File size that triggers rotation. |
| `LOG_FILE_MAX_FILES` | positive integer | `10` | Rotated files kept. |
| `LOG_REDACT_KEYS` | comma-separated names | empty | Field names to redact in addition to `DEFAULT_REDACT_KEYS`. |

- `preproduction` and `production` use `LOG_FORMAT=json` and log to stdout. Use a file only where no log collector reads stdout.
- Read logger settings through `LoggerConfig` (`@Inject(LoggerConfig.KEY)`), never through `process.env`.

## 6. Formats and transports

Every entry goes through this pipeline before any transport sees it:

1. `format.errors({ stack: true })`: keeps the stack of logged `Error` objects.
2. `requestContext()`: adds `correlationId` from the current request context.
3. `sanitize({ redactKeys })`: redacts, serializes errors and limits size (section 7).

Then each transport applies its output format:

- Console: `prettyFormat()` (`time LEVEL pid [context] (correlationId) message {meta}`) or `jsonFormat()` (one JSON object per line, ISO timestamp). It also handles uncaught exceptions and unhandled rejections.
- File (optional): always `jsonFormat()`, never colours.

Rules:

- Create transports inside `createTransports`, never at module level, so importing a file opens no handles.
- To add a transport (for example a log collector), add it in `createTransports`, driven by new `logger.env` variables. Do not choose transports by `NODE_ENV` name.
- Register colours for any new level in `LOG_LEVEL_COLORS`; the pretty format fails on levels without a colour.

## 7. Redaction

`sanitize` runs on every entry, at every depth:

- Fields whose name matches `DEFAULT_REDACT_KEYS` or `LOG_REDACT_KEYS` are replaced with `[REDACTED]`. Matching ignores case and non-alphanumeric characters, so `access_token`, `accessToken` and `Access-Token` all match `accesstoken`.
- The defaults cover credentials (`password`, `token`, `authorization`, `cookie`, `apikey`, ...) and Indonesian patient identifiers (`nik`, `bpjs`, `nobpjs`, ...).
- `Error` values become `{ name, message, code, retryable }`. Strings longer than 2000 characters, arrays longer than 50 items and nesting deeper than 6 levels are cut. Circular references become `[Circular]`.

Redaction is a safety net, not permission to log data; section 4.3 still applies. When a new sensitive field name appears in the domain (for example a medical record number), add it to `DEFAULT_REDACT_KEYS` in the same change.

## 8. Correlation identifiers

`RequestLoggingInterceptor` gives every HTTP request a correlation identifier:

- It reuses the incoming `x-request-id` header when it matches `^[A-Za-z0-9._-]{1,128}$`. Otherwise it creates a UUID, so clients cannot inject text into logs.
- It returns the identifier in the `x-request-id` response header.
- It runs the handler inside the request context, so every log written by the handler, and by anything it awaits, carries `correlationId`.
- It attaches the context to the request object, because exception filters run outside the handler's async flow. Filters must log inside `runInRequestContextOf(host.switchToHttp().getRequest(), () => ...)`, as `RepositoryExceptionFilter` does.

Rules:

- Do not use `AsyncLocalStorage.enterWith` for the request context. It does not reach exception filters and leaks between requests.
- Guards and pipes run before interceptors, so their logs have no correlation identifier. Keep logging in guards minimal until this is solved.
- Work that does not start from an HTTP request (message consumers, scheduled jobs, bootstrap tasks) must start its own context: `runWithRequestContext({ correlationId }, () => work())`, reusing the identifier carried by the message when there is one.
- When calling another service (HTTP, Kafka, ...), send the current `correlationId` (`getRequestContext()`) in the `x-request-id` header or message header.

## 9. Access log

`RequestLoggingInterceptor` writes one `RequestLogEntry` (`event: 'http_request'`) per HTTP request, when the response closes, so the status set by exception filters is the one recorded:

| Field | Meaning |
|---|---|
| `operation` | Handler, as `Controller.method`. Used instead of the URL, which may contain patient data. |
| `method`, `statusCode` | HTTP method and final status. |
| `outcome` | `success` (< 400), `failure` (>= 400), or `aborted` when the client disconnected before the response finished. |
| `durationMs` | Time from the interceptor to the end of the response. |
| `ip`, `accountId` | Client address and `request.user.id`, when an auth guard set it. |
| `error`, `retryable` | Name and retry flag of the error thrown by the handler. |

The level is `error` for 5xx, `warn` for 4xx and aborted requests, otherwise `http`. Do not add a second access log in controllers or other interceptors.

## 10. Third-party library logs

Route library logs through winston, so they get the same transports, redaction and correlation identifier:

```ts
// kafkajs levels: NOTHING 0, ERROR 1, WARN 2, INFO 4, DEBUG 5
const kafkaLevel = createLogLevelMapper({ 0: 'error', 1: 'error', 2: 'warn', 4: 'info', 5: 'debug' })

constructor(@Inject(WINSTON_MODULE_PROVIDER) winstonLogger: Logger) {
  const handle = createExternalLogHandler(winstonLogger, kafkaLevel)
  this.logCreator = () => ({ namespace, level, label, log: { message, ...meta } }) =>
    handle({ namespace, level, label, message, meta })
}
```

- Map library levels with `createLogLevelMapper` (numeric levels) or `toLogLevelName` (named levels, which also knows `warning`, `critical`, `trace`, ...). Do not import a library only to read its level constants.
- Turn off the library's own console output (for example Fastify's `logger: false`) so entries are not written twice.

## 11. Wiring into an application

In each application's root module (see `GatewayBackOfficeModule`):

1. Add `${environmentIdentifier}/logger.env` to `envFilePath` and `LoggerConfig` to `load` in `ConfigModule.forRoot`.
2. Import `LoggerModule` in the root module, and in every feature module whose classes inject `AppLogger`. It is not global (`stack.md` section 2). Importing it again does not create a second winston logger.
3. For HTTP applications, register `{ provide: APP_INTERCEPTOR, useClass: RequestLoggingInterceptor }`.

In `main.ts`, call `app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER))` right after `NestFactory.create`. Do not set `bufferLogs: true`: a startup that hangs (for example on an unreachable database) would then print nothing. Logs written before `useLogger` go to Nest's console logger.

## 12. Testing

- Unit-test formats by calling `format.transform(info, format.options)`; winston passes the options as the second argument.
- To test a class that injects `AppLogger` without winston, provide a fake for the token: `overrideProvider(AppLogger).useValue({ debug: vi.fn(), error: vi.fn() })`, or `useMocker` when building the module. See `apps/gateway_back_office/src/gateway.back.office.service.spec.ts`.
- To capture log entries in a Nest test, register `WinstonModule.forRoot` with `levels: LOG_LEVELS`, the same `requestContext()` and `sanitize()` formats, and a `transports.Stream` over an object-mode `Writable`. Add `AppLogger` to the providers and call `app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER))`. See `apps/utility/logger/service.spec.ts` and `apps/utility/logger/interceptor.spec.ts`.
- The access log is written when the response closes; wait for the entry instead of reading it right after `app.inject` returns.
- When a change adds a log entry that section 1 requires (failure, retry, latency), assert its fields in a test, including that no payload values appear.
- When a change adds a read (a `find*` method or a service method that only reads), assert that it writes no log entry, on success and on failure. See `apps/gateway_back_office/src/gateway.back.office.service.spec.ts` (fake logger) and the read-only test in `apps/gateway_back_office/src/account/account-management.spec.ts` (spies on every log level, expects only the access log).

## 13. Change log

The change log is the second channel (section 2). The full design is `.claude/design/data-change-history.md`; this section lists the rules code must follow. The application writes the change log; it does not read it back. History is read from the log platform (Grafana Loki), which indexes the change-log files (section 13.5).

```
repository write ──▶ TransactionManager.run
                       1. read before-state   2. write   3. ChangeRecorder.record → change_outbox
                     commit (or roll back: neither exists)
worker: ChangeRelayService ──▶ change_outbox (pending, in order)
                       ──▶ ChangeLogger: secret guard, hash chain, fsync to every sink
                       ──▶ mark published + store chain heads (one transaction)
```

### 13.1 Layout

| Path | Alias | Contents |
|---|---|---|
| `apps/utility/history/record.ts` | `@utility/history/record` | `ChangeRecord`, `FieldChange`, `ChangeAction`, `DataClass`, `MaskedValue`, `FieldClassification`, `PLATFORM_TENANT`. |
| `apps/utility/history/actor.ts` | `@utility/history/actor` | `ActorRef`, `systemActor(name)`, `toActorRef(request.user)`. |
| `apps/utility/history/diff.ts` | `@utility/history/diff` | `diffEntity`, `maskValue`: diff by field and mask by class (design section 4.1). |
| `apps/utility/history/reason.ts` | `@utility/history/reason` | `withChangeReason(reason, work)`. |
| `apps/utility/history/recorder.ts` | `@utility/history/recorder` | `ChangeRecorder` port, `CHANGE_RECORDER` token, `OutboxChangeRecorder`. |
| `apps/utility/history/outbox.ts` | `@utility/history/outbox` | `ChangeOutbox` port and `CHANGE_OUTBOX` token. |
| `apps/utility/history/logger.ts` | `@utility/history/logger` | `ChangeLogger`, `DailyFileSink`, `StdoutSink`, `verifyLine`. |
| `apps/utility/history/module.ts` | `@utility/history/module` | `ChangeHistoryModule` (recorder, for repositories) and `ChangeLogModule` (logger, for the relay). |
| `apps/utility/history/id.ts` | `@utility/history/id` | `uuidv7()` for `change_id`. |
| `apps/utility/database/mongo.change-outbox.ts` | `@utility/database/mongo.change-outbox` | Mongo `ChangeOutbox`: collections `change_outbox` and `change_relay_state`. |
| `apps/worker/src/change-relay/` | | `ChangeRelayService` and `ChangeRelayModule`. |
| `apps/configuration/change-log.ts` | `@configuration/change-log` | `ChangeLogSchema` and `ChangeLogConfig` (`changeLog` namespace). |

`apps/utility/history` stays generic, like `apps/utility/logger`: no domain types.

### 13.2 Capturing changes

- Business code never writes change records directly. Repositories record every write through `ChangeRecorder` (`database.md` 6.1); `LOVRepositoryMongo` is the reference implementation.
- Each write reads the stored before-state, writes, and calls `changes.record({ type, before, after, classification, operation })`, all inside one `TransactionManager.run`. The recorder diffs, masks, adds actor, reason and correlation identifier from the request context, and appends the record to `CHANGE_OUTBOX`.
- The action is derived from the states: `before` null is `create`, `after` null is `delete`, `deleted_at` set or cleared is `soft_delete` or `restore`, anything else is `update`. An `update` that changes nothing records nothing.
- Records without a `tenant_id` (platform reference data such as LOV) use the tenant `platform`.
- Services only add the reason with `withChangeReason(reason, () => ...)`, and record reads of highly confidential records with `changes.recordAccess({ type, id, operation, tenantId })` after the read succeeded.
- Change records are never written through `AppLogger`, and `AppLogger` entries never contain before/after values.
- The actor comes from the request context. `RequestLoggingInterceptor` builds it from `request.user` with `toActorRef` (the auth guard runs first). Jobs and consumers start their context with a system actor: `runWithRequestContext({ correlationId, actor: systemActor('license-expiry-job') }, work)`. A write without an actor rejects with `RepositoryError`.

### 13.3 Publishing

- `ChangeRelayService` in the `worker` application publishes the outbox. It takes a lease in `change_relay_state`, so one instance per connection publishes and records leave in order. Every pass runs in its own context with the system actor `change-relay`.
- A pass reads up to `CHANGE_RELAY_BATCH_SIZE` pending entries, writes them with `ChangeLogger`, then marks them published and stores the chain heads in one transaction. Delivery is at least once: a crash between the write and the mark writes the record again with the same `change_id`.
- The relay logs one operational summary per batch through `AppLogger` (`event: 'change_relay'`, `count`, `rejected`, `outcome`, `durationMs`, `retryable`), never the records. A failed batch stays pending, counts an attempt (`attempts`, `last_error` with the error class name) and is retried with exponential backoff.
- It warns with `event: 'change_relay_lag'` when the oldest pending entry is older than `CHANGE_RELAY_MAX_LAG_SECONDS`.
- Published entries expire after `CHANGE_OUTBOX_KEEP_DAYS` (TTL index on `published_at`).

### 13.4 Configuration

A configuration context of its own, `environment/<environment>/change-log.env` (`stack.md` 3.6), loaded by both applications: the gateway needs the record size limit and outbox TTL, the worker everything. Read it through `ChangeLogConfig`, never through `process.env`.

| Variable | Default | Meaning |
|---|---|---|
| `CHANGE_LOG_STDOUT` | `false` | Also write records to stdout, tagged `stream: 'change'`. |
| `CHANGE_LOG_FILE_DIR` | empty | Directory for daily files `changes-YYYY-MM-DD.jsonl`. `/var/log/horas/change` in preproduction and production. |
| `CHANGE_LOG_HASH_CHAIN` | `true` | Add `prev_hash` and `hash` per tenant. |
| `CHANGE_RELAY_MAX_LAG_SECONDS` | `300` | Warn when the oldest unpublished record is older. |
| `CHANGE_RELAY_INTERVAL_MS` | `1000` | Wait between relay passes when nothing more is pending. |
| `CHANGE_RELAY_BATCH_SIZE` | `100` | Records per relay pass (1 to 1000). |
| `CHANGE_OUTBOX_KEEP_DAYS` | `7` | How long published outbox entries are kept. |
| `CHANGE_RECORD_MAX_BYTES` | `200000` | Largest serialized record. Larger records have their largest values replaced by `changed` and get `truncated: true`; every path stays listed. Must stay below the log store's line limit. |

At least one of stdout or file must be enabled; the schema rejects a configuration with neither.

### 13.5 Change logger, storage and access

- `ChangeLogger` writes one JSON line per record (`stream: 'change'`, ISO timestamps) and resolves only after every sink made the batch durable (`DailyFileSink` appends and `fsync`s). It does not use winston, because winston cannot confirm that a line reached disk, and the relay must not mark a record published before that.
- `LOG_LEVEL` and `sanitize` do not apply: every record is written, and values were masked by field class at capture.
- Secret guard: a record holding a plain value under a `DEFAULT_REDACT_KEYS` name (a wrong classification) is not written. The relay marks it rejected (`rejected_at`, `rejection_reason`); it stays in the outbox and never expires, for an operator to fix the classification and requeue. The relay reports it through `AppLogger` as `event: 'change_log_rejected'` with the `change_id` only.
- Hash chain: `hash` is the SHA-256 of the line without `hash`, and `prev_hash` is the tenant's previous `hash`. Chain heads are stored in `change_relay_state`, so the chain continues after a restart. `verifyLine` checks one line. A record written twice after a crash forms a short fork; verifiers dedupe on `change_id`.
- Files rotate daily by UTC date and are never deleted by the application. Archival and deletion after retention belong to the log platform.
- Shipping is not done by the application. Grafana Alloy tails the change-log files and pushes them to the Loki tenant `change` (design section 6.3). Do not push to Loki from application code: the files are the durable copy and feed the archive.
- Operational logs go to the Loki tenant `ops`, change records to `change`. Operators get `ops` only. Labels are `stream`, `tenant`, `entity_type` and `action` only; identifiers (`entity_id`, `actor`, `correlation_id`, `change_id`) are structured metadata, never labels.
- A job copies closed daily files to a bucket with Object Lock (compliance mode), so records cannot be deleted before the legal retention ends.

### 13.6 Testing

- Unit-test diffs and masking with `diffEntity` (`apps/utility/history/diff.spec.ts`): each class, array keys, no-op writes, secrets never in plain form.
- Test the recorder with a fake `ChangeOutbox` inside `runWithRequestContext` (`recorder.spec.ts`).
- Test the change logger with an in-memory `ChangeLogSink`: lines, hash chain (`verifyLine`), the secret guard and a failing sink (`logger.spec.ts`).
- Test a repository's recording without a database: a global test module provides fakes for `CHANGE_OUTBOX`, `TRANSACTION_MANAGER` and `ChangeLogConfig.KEY`, and the model token is overridden (`apps/repository/mongo/lov.spec.ts`).
- Test the relay with a fake outbox (`apps/worker/src/change-relay/change-relay.service.spec.ts`): order, lease, failure, rejection, lag.
- Repository tests against a real replica set (`MongoMemoryReplSet`) assert the outbox content: one record per committed write, none after rollback, one after a retried transaction.
- Every model has a classification; `apps/repository/model/classification.spec.ts` fails otherwise.
