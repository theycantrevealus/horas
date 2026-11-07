# Back End Database

Database access goes through repositories. Business code (services, controllers, domain logic) depends only on engine-neutral contracts: repository tokens, repository interfaces, models, `RepositoryError` classes and the `TransactionManager` port. Changing the database engine must only change files under `apps/repository/<engine>/` and `apps/utility/database/<engine>.*.ts`, plus the bindings in `<name>.module.ts`.

## 1. Layout

### 1.1 Engine-neutral (business code may import these)

| Path | Alias | Contents |
|---|---|---|
| `apps/utility/database/interface.ts` | `@utility/database/interface` | `Repository<T>`, `Entity`, `NewEntity<T>`, `EntityChanges<T>`, `Filter<T>`, `QueryOptions<T>`, `Page<T>`. |
| `apps/utility/database/error.ts` | `@utility/database/error` | `RepositoryError` and its subclasses. |
| `apps/utility/database/transaction.ts` | `@utility/database/transaction` | `TransactionManager` port and `TRANSACTION_MANAGER` token. |
| `apps/utility/database/constant.ts` | `@utility/database/constant` | Connection names and `DEFAULT_PAGE_SIZE`. |
| `apps/utility/database/module.ts` | `@utility/database/module` | `RepositoryModule.forFeature`. |
| `apps/repository/token.ts` | `@repository/token` | Repository injection tokens. |
| `apps/repository/model/` | `@repository/model/*` | Models: plain classes that services and repositories exchange. |
| `apps/repository/interface/` | `@repository/interface/*` | One repository interface per model, for example `LovRepository`. |
| `apps/utility/history/` | `@utility/history/*` | `ChangeRecorder` port, `ChangeOutbox` port, `withChangeReason`, `FieldClassification` (`logging.md` 13). |

### 1.2 Engine-specific (only repository implementations and root modules may import these)

| Path | Alias | Contents |
|---|---|---|
| `apps/utility/database/<engine>.ts` | `@utility/database/<engine>` | Connection modules, for example `MongoMainConnectionModule`. |
| `apps/utility/database/<engine>.error.ts` | `@utility/database/<engine>.error` | Driver-error translation, for example `translateMongoError`. |
| `apps/utility/database/<engine>.query.ts` | `@utility/database/<engine>.query` | Translation of `Filter`, `SortOrder` and identifiers to the engine's query syntax. |
| `apps/utility/database/<engine>.transaction.ts` | `@utility/database/<engine>.transaction` | `TransactionManager` implementation. |
| `apps/utility/database/<engine>.change-outbox.ts` | `@utility/database/<engine>.change-outbox` | `ChangeOutbox` implementation and its storage shapes. |
| `apps/repository/<engine>/schema/` | `@repository/<engine>/schema/*` | Storage shapes, for example Mongoose `@Schema` classes. |
| `apps/repository/<engine>/<name>.ts` | `@repository/<engine>/<name>` | Repository implementation. |
| `apps/repository/<engine>/<name>.module.ts` | `@repository/<engine>/<name>.module` | `RepositoryModule.forFeature(...)` result for that repository. |

Rules:

- `apps/utility/database` stays generic. Do not put domain-specific tokens, models or schemas there.
- `apps/utility/database/module.ts`, `interface.ts`, `error.ts` and `transaction.ts` must not import any driver package (`mongoose`, `@nestjs/mongoose`, `typeorm`, ...).
- Business code must never import from `apps/repository/<engine>/`, `@utility/database/<engine>*`, or a driver package.

## 2. Connections

- Each connection has a name constant in `apps/utility/database/constant.ts`. Use that constant everywhere: in `forRootAsync`, `forFeature` and `@InjectModel`. Never repeat the name as a string literal.
- Each connection has one `@Global()` connection module in `apps/utility/database/<engine>.ts`. It opens the connection with the driver's `forRootAsync` and a `connectionName`, and provides and exports that connection's transaction manager and change outbox (`CHANGE_OUTBOX`). The outbox belongs to the connection because a change record must be written in the same transaction as its data.
- Connection modules read settings from the typed config (`inject: [MongoConfig.KEY]` with `ConfigType<typeof MongoConfig>`), following `stack.md` section 3. Never read `process.env` there.
- Mongo connection modules set `connectionFactory: enableTransactionContext`, so model calls join transactions automatically (section 7).
- Import connection modules once, in the application's root module. Do not import them in feature modules or nest them inside `RepositoryModule`.
- To add a database, add a new connection name, connection module, transaction token (`TRANSACTION_MANAGER_<NAME>`) and outbox token (`CHANGE_OUTBOX_<NAME>`, with a relay for it), plus a new config context (`stack.md` section 3.6). Do not reuse an existing connection's name.

## 3. Tokens

- Declare every repository token in `apps/repository/token.ts` as a `Symbol`, named `REPOSITORY_<NAME>`, for example `REPOSITORY_LOV`.
- Tokens name the data, not the engine. `REPOSITORY_LOV` is correct; `REPOSITORY_MONGO_LOV` is not.
- Do not use string tokens.

## 4. Models, interfaces and schemas

### 4.1 Models

- Models live in `apps/repository/model/<name>.ts`, never in an engine folder.
- A model implements `Entity` (`id: string`) and extends `Timestamp` when it has timestamps. It has no database decorators and no engine types (no `ObjectId`, no `_id`).
- Do not use `any` for fields. Use a concrete type, `Record<string, unknown>` or `unknown`.

### 4.2 Repository interfaces

- Each model has an interface in `apps/repository/interface/<name>.ts` that extends `Repository<Model>`, for example `LovRepository`.
- Declare model-specific queries there as named methods (`findByGroup(groupName)`), instead of building `where` objects in services. The engine query stays inside the implementation.
- **Name every read `find*`** (`findAll`, `findOne`, `findByGroup`, `findInForce`). Any other name (`create`, `update`, `consume`, `revokeFamily`, `registerFailedAttempt`) is a write. The logs depend on it: reads are never logged and failed reads are not logged by `RepositoryExceptionFilter` (`logging.md` 4.3), while writes are logged and recorded in the change history (section 6.1). Do not hide a write behind a `find*` name.

### 4.3 Schemas

- The schema (`<engine>/schema/<name>.ts`) is the storage shape. Name it `<Name>Entity` so it never shares a class name with the model. Export `<Name>Schema` and `<Name>Document = HydratedDocument<<Name>Entity>`.
- Pin the collection or table name explicitly (`@Schema({ collection: '...' })`). Otherwise, renaming a class silently changes where the data is stored.
- Timestamp defaults store the current instant in UTC (`default: () => new Date()`). Repositories use the same clock when they set `updated_at` or `deleted_at`. See section 4.4.

### 4.4 Time

The platform serves hospitals in several time zones (Indonesia alone has WIB, WITA and WIT). Stored values must not depend on the server's or any one hospital's time zone.

| Kind of value | Examples | Stored as |
|---|---|---|
| Instant: a point in time | `created_at`, `updated_at`, `deleted_at`, login time, `published_at` | `Date` holding the real UTC instant (`new Date()`). |
| Calendar date: a local day | birth date, join date, contract start, separation date, roster date | `YYYY-MM-DD` string, interpreted in the time zone of the facility it belongs to. |
| Local time of day | shift start and end | `HH:mm` string, plus the facility's IANA time zone. Convert to UTC instants when an exact moment is needed (overlap and rest checks). |

- Never build a `Date` from a wall-clock time in a named zone. `TimeManagement.getTimezone(...)` does this (it shifts the stored instant by the zone's offset) and must not be used for stored values.
- Each facility stores its IANA time zone (for example `Asia/Jakarta`, `Asia/Makassar`). Never hard-code a zone in repositories, schemas or business logic.
- Convert to a local zone only at the edges: for display, for reports, and for rules about local day boundaries (for example "end of the separation date in the facility's zone").
- Do not store a calendar date as a `Date` at midnight; depending on the zone it reads back as the previous or next day.
- Data written before this rule used `getTimezone('Asia/Jakarta')` and is 7 hours ahead of the real instant. Migrate it (subtract 7 hours from every instant field) in the same release that switches the code to `new Date()`, and never mix both forms in one collection.

### 4.5 Common fields

Every stored record has these fields, in addition to its own. The reference design is `.claude/design/account-and-workforce-collections.md` section 2.

| Field | Meaning |
|---|---|
| `id` (`_id` in Mongo) | Identifier (section 4.1). |
| `tenant_id` | The customer (a hospital or a hospital group) the record belongs to. It is the first key of every compound index, and every repository query filters by it. Platform-wide reference data that is identical for all tenants may omit it; its schema comment says so. |
| `schema_version` | Version of the stored shape, so documents can be migrated lazily. |
| `version` | Optimistic concurrency counter (Mongoose `optimisticConcurrency: true`). An update based on a stale version rejects with `RepositoryConflictError`. |
| `created_at`, `updated_at`, `deleted_at` | Timestamps (section 4.4), set by the repository. |
| `created_by` | `ActorRef` snapshot (`account_id`, `display_name`, `kind`) of who created the record. |

- Do not add `updated_by`, `deleted_by` or history arrays to records. Who changed what, when and why belongs to the change history (section 6.1), not to the record.
- `ActorRef` replaces the embedded `IAccount` / `RawAccount` summary. Business approvals that are part of the data (for example `approved_by` on a role binding, `verified_by` on a license) are ordinary fields and stay.

### 4.6 Portable values

The platform serves hospitals in more than one country. Stored shapes must not encode one country's concepts in field names.

- Codes that differ per country or hospital (profession, workforce category, employment type, license type, unit type, reason codes) are stored as `Coding` (`{ system, code, display? }`) and validated against the `code_concepts` collection. The `system` name carries the jurisdiction, for example `id.employment-type`.
- Fixed technical states that code branches on (account status, assignment status) are TypeScript literal unions, not `Coding`.
- Personal identifiers (national id, passport, tax id, social insurance numbers) are stored in a `PersonIdentifier` list (`type`, `system`, `issuing_country`), never as fields named after a document such as `nik` or `npwp`.
- The identifier value is encrypted. Lookups and uniqueness use `value_hash`, a keyed hash with a per-tenant key; display uses `value_masked`. Encryption and hashing happen inside the repository implementation.
- Names use `HumanName` (prefix and suffix hold academic and professional titles), addresses use `Address` (ISO 3166 country and subdivision, plus `admin_levels` for local divisions), phone numbers are E.164, currencies are ISO 4217, languages are BCP 47 and time zones are IANA names.
- Keep data of different sensitivity classes (public, internal, confidential, highly confidential, secret) in different collections when access differs, rather than hiding fields per query. Secrets (password hashes, MFA secrets, token hashes) always have their own collection, read only by the authentication service.

## 5. Repository contract

### 5.1 Methods

| Method | Behaviour |
|---|---|
| `findAll(options)` | With `withPagination: true`, returns a `Page<T>` (page size `limit`, default `DEFAULT_PAGE_SIZE`). Otherwise returns `T[]`. Excludes soft-deleted records unless `withSoft: true`. |
| `findOne(id, options?)` | Returns the record or `null`. An identifier the engine cannot parse also returns `null`. |
| `create(entity, id?)` | Takes `NewEntity<T>` (no `id`, no timestamps). The repository sets the identifier and timestamps. |
| `update(id, changes)` | Takes `EntityChanges<T>`, refreshes `updated_at`, and returns the full record. Rejects with `RepositoryNotFoundError` when the record is missing or soft-deleted. |
| `delete(id)` | Removes the record permanently. Rejects with `RepositoryNotFoundError` when missing. |
| `deleteSoft(id)` | Sets `deleted_at`. Rejects with `RepositoryNotFoundError` when missing or already deleted. |

### 5.2 Filters

`QueryOptions.where` is a `Filter<T>`: model field names (checked by TypeScript) mapped to engine-neutral conditions. All conditions must match.

| Operator | Fields | Meaning |
|---|---|---|
| `eq`, `ne` | all | Equal / not equal. `eq: null` matches empty fields. |
| `in`, `notIn` | all | Equal to one / none of the values. |
| `gt`, `gte`, `lt`, `lte` | string, number, date | Range comparisons. |
| `contains`, `startsWith` | string | Case-insensitive text match. Use at most one per field. |

```ts
await lovRepository.findAll({
  where: { group_name: { eq: 'gender' }, created_at: { gte: since } },
  orderBy: { field: 'set_value', direction: 'ASC' },
})
```

- Never pass engine syntax (`$gte`, `$regex`, SQL fragments) in `where`. If a query cannot be expressed with these operators, add a named method to the model's repository interface.
- Use `id` for the identifier. The implementation maps it to the engine's key (`_id` in Mongo).

### 5.3 Errors

Repositories reject only with these classes from `@utility/database/error`, never with driver errors and never with Nest HTTP exceptions:

| Class | Meaning | `retryable` | HTTP (gateway filter) |
|---|---|---|---|
| `RepositoryNotFoundError` | Record missing or soft-deleted. | no | 404 |
| `RepositoryConflictError` | Uniqueness rule broken (duplicate key). | no | 409 |
| `RepositoryValidationError` | Data or identifier rejected by storage rules. | no | 400 |
| `RepositoryUnavailableError` | Database unreachable or transient failure. | **yes** | 503 |
| `RepositoryError` (base) | Unexpected data-layer defect. | no | 500 |

- Every error carries `operation` (for example `LovRepository.update`) and the original driver error as `cause`.
- Error messages never include document values; duplicate-key messages from drivers can contain patient data. The `cause` is for logs only and is never sent to clients.
- Business code may catch these classes, for example to turn `RepositoryConflictError` into a business rejection. It must never catch driver errors.
- `RepositoryExceptionFilter` (`@utility/filter/repository`) maps them to HTTP responses. Register it with `APP_FILTER` in each HTTP application's root module. It logs the errors of writes only; a failed read (`find*`) is answered but not logged (`logging.md` 4.3).

## 6. Repository implementation

- Implement the model's repository interface (`LovRepository`), typed with the model, not the schema.
- Decorate the class with `@Injectable()` and inject the driver model with its connection name: `@InjectModel(LovEntity.name, MONGO_MAIN_CONNECTION)`. Name it after its data (`lovModel`) and mark it `private readonly`.
- Build filters and sorts with the engine helpers (`toMongoFilter`, `toMongoSort`, `toObjectId`, `toPage`). Do not hand-write soft-delete or identifier handling in each method.
- Map every result to the model with an explicit mapper (`toLov`) that copies only model fields. Never return driver documents, `_id` or `__v`.
- When writing, copy only the fields the caller may change, so ids and timestamps cannot be overwritten.
- Wrap each method body in `try`/`catch` and rethrow `translateMongoError(error, operation)`.
- Run queries sequentially inside a method. A transaction session does not allow parallel operations.

### 6.1 Recording changes

Every write is recorded in the change history (`logging.md` section 13, `.claude/design/data-change-history.md`).

- Inject `ChangeRecorder` (`@Inject(CHANGE_RECORDER)`) and the `TransactionManager` of the repository's connection, and add `ChangeHistoryModule` to the `imports` of the repository's `RepositoryModule.forFeature` (section 8). `LOVRepositoryMongo` is the reference implementation.
- In every writing method (`create`, `update`, `delete`, `deleteSoft` and named write methods), inside one `run`: read the stored before-state, write, then call `changes.record({ type, before, after, classification, operation })`. The change record is inserted into the change outbox in the same transaction, so it commits or rolls back with the write. A `run` inside a caller's `run` joins it (section 7).
- `type` is the entity's stable name (`account`, `employee`), never the collection or class name, so renaming storage does not split its history.
- Each model declares its field classification in `apps/repository/model/<name>.classification.ts` (`FieldClassification<Model>`): the sensitivity class of each field and the keys that identify items of object arrays. A model without one fails its test.
- Do not use bulk writes (`updateMany`, `deleteMany`, `bulkWrite`) on recorded collections. Write each entity inside one `run`, or add a named method that records every affected entity.
- A write with no actor in the request context rejects with `RepositoryError`.
- Collections that are not business data are not recorded: outboxes, `processed_events`, sessions and `security_events`. Their repository comment says so.

## 7. Transactions

Use the `TransactionManager` port when several writes must succeed or fail together:

```ts
constructor(
  @Inject(TRANSACTION_MANAGER) private readonly transactions: TransactionManager,
  @Inject(REPOSITORY_LOV) private readonly lovRepository: LovRepository,
) {}

await this.transactions.run(async () => {
  await this.lovRepository.create(first)
  await this.lovRepository.create(second)
})
```

- Repository calls inside `run` join the transaction automatically. Do not pass sessions or engine transaction objects through business code or repository signatures.
- A `run` inside another `run` joins the outer transaction. If anything throws, everything rolls back.
- Errors from inside `work` are rethrown unchanged when they are business errors, and translated when they come from the driver.
- The engine may retry `work` after a transient failure. Inside `work`, only make repository calls; do not send messages, call external APIs or write logs that must happen once. Do those after `run` resolves.
- A transaction covers one connection only. Never span two connections in one `run`.
- MongoDB transactions need a replica set or sharded cluster. Every environment, including local development, must run MongoDB as a replica set (a single-node replica set is enough).

### 7.1 Changes other modules must see

A module never writes another module's collections. When other modules must react to a change (for example the identity module to an employee's separation), the owning module inserts an event into its outbox collection **in the same `run`** as the change. A relay publishes the event after commit.

- Event payloads carry identifiers, codes and dates only, never names, identifiers of persons or contact data.
- Every event has a unique `event_id`. Consumers record handled ids and ignore duplicates, because delivery is at least once.
- Use the outbox even when both modules share one connection, so the modules can move to separate databases without changing business code.
- The account and workforce events are listed in `.claude/design/account-and-workforce-collections.md` section 6.

## 8. Registering a repository

Use `RepositoryModule.forFeature`. It imports the engine modules and binds each token with `useClass`:

```ts
export const LovRepositoryModule = RepositoryModule.forFeature({
  imports: [
    MongooseModule.forFeature([{ name: LovEntity.name, schema: LovSchema }], MONGO_MAIN_CONNECTION),
    ChangeHistoryModule,
  ],
  repositories: [{ provide: REPOSITORY_LOV, useClass: LOVRepositoryMongo }],
})
```

- Import the `<name>.module.ts` result in the feature module that uses the repository. While no such module exists, import it in the root module.
- Do not make repository modules global.
- Do not create repositories manually (`new`, `moduleRef.create`). Nest must own them, so that lifecycle hooks run and `overrideProvider` works in tests.
- Each token is declared in exactly one `forFeature` call.

## 9. Consuming a repository

```ts
constructor(@Inject(REPOSITORY_LOV) private readonly lovRepository: LovRepository) {}
```

Depend on the token, the model's repository interface and the model only (section 1.1).

## 10. Changing the engine of a repository

1. Add the schema for the new engine in `apps/repository/<new-engine>/schema/`.
2. Implement the same repository interface in `apps/repository/<new-engine>/<name>.ts`, with the engine's helpers (`<new-engine>.query.ts`, `<new-engine>.error.ts`).
3. Add a `<name>.module.ts` for the new engine and import it instead of the old one.
4. If the engine is new, add its connection module and `TransactionManager` implementation (section 2).

Services, controllers, models, tokens and repository interfaces do not change. If they have to, the abstraction leaked; fix the leak instead of adapting business code.

## 11. Testing

- To test services without a database, override the repository token and the transaction manager: `overrideProvider(REPOSITORY_LOV).useValue(fake)`, and `overrideProvider(TRANSACTION_MANAGER).useValue({ run: (work) => work() })`.
- To test a repository's wiring without a database, override the model token: `overrideProvider(getModelToken(LovEntity.name, MONGO_MAIN_CONNECTION))`.
- To test repository queries and transactions, run against a real MongoDB replica set, for example `mongodb-memory-server`'s `MongoMemoryReplSet`.
- To test services without the change history, override the recorder: `overrideProvider(CHANGE_RECORDER).useValue({ record: vi.fn(), recordAccess: vi.fn() })`.
- To test a repository's change recording without a database, provide fakes for `CHANGE_OUTBOX`, `TRANSACTION_MANAGER` and `ChangeLogConfig.KEY` in a global test module and override the model token (`apps/repository/mongo/lov.spec.ts`).
- Repository tests assert change recording: one outbox record per committed write with the expected masked fields, none after a rollback.

## 12. Adding a repository

1. Add the token to `apps/repository/token.ts`.
2. Add the model (implements `Entity`) to `apps/repository/model/`.
3. Add the repository interface (extends `Repository<Model>`) to `apps/repository/interface/`.
4. Add the schema (`<Name>Entity`, `<Name>Schema`, pinned collection) to `apps/repository/<engine>/schema/`.
5. Add the field classification to `apps/repository/model/<name>.classification.ts` (section 6.1).
6. Implement the interface in `apps/repository/<engine>/<name>.ts` (section 6), recording every write (section 6.1).
7. Export the `RepositoryModule.forFeature(...)` result from `apps/repository/<engine>/<name>.module.ts`.
8. Import it in the feature module that uses it.
