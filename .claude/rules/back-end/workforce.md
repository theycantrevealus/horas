# Back End Workforce (HR)

The workforce context (`apps/back-end/apps/workforce`, alias `@workforce/*`) holds the domain rules of the Human Resource Management module. It is exposed over HTTP by `gateway_hr` (`apps/back-end/apps/gateway_hr`). Business source: `.claude/business/administrative-operational-system/human-resource-management.md`. Collections: `.claude/design/human-resource-collections.md` and `account-and-workforce-collections.md`. Endpoints and build order: `.claude/design/hr-endpoints.md` and `.claude/design/plans/`. Repository rules: `database.md`. Logging rules: `logging.md`. Placement: `placement.md`.

## 1. Layout

| Path | Contents |
|---|---|
| `apps/workforce/workforce.module.ts` | `WorkforceModule`: imports the repository modules and exports the services. Each HR area adds its own here. |
| `apps/workforce/workforce.error.ts` | `WorkforceError` and `NotFoundError`, `ConflictError`, `InvalidRequestError`, `ForbiddenError`. Transport-neutral, with a stable `code`. |
| `apps/workforce/workforce.filter.ts` | `WorkforceExceptionFilter`: 404, 409, 422, 403. A 404 on `GET` or `HEAD` is answered but not logged. |
| `apps/workforce/observe.ts` | `observe(logger, event, operation, work)`: one structured log entry per write. |
| `apps/workforce/<area>/` | Services and their specs, one folder per HR area (`structure/`, later `employee/`, `license/`, ...). |
| `apps/workforce/structure/{codes,external-ids,localized-texts,address}.ts` | Shared checks for HR data (code format, identifiers given by other systems, texts per language, postal address). Each returns the cleaned value or `null`; the service picks the error code. Reuse them instead of writing new ones. `structure/unit-tree.ts` builds the organization chart from a flat list. |
| `apps/workforce/concept/` | `CodeConceptService` (list, create, update, import, `assertActive`, `resolve`), the required properties of known code systems (`system-rules.ts`) and the import bundles (`bundles.ts`, `bundle-id.ts`). |
| `apps/utility/validation/local-date.ts` | `isLocalDate`, `isValidPeriod`, `todayUtc`, `todayInZone(timeZone)` (today in a facility's zone), `@IsLocalDate()`. Calendar dates are `YYYY-MM-DD` strings (`database.md` 4.4). |
| `apps/workforce/testing/in-memory.ts` | In-memory repositories for service and gateway tests. |
| `apps/gateway_hr/src/<area>/` | `<area>-management.module.ts`, controllers, DTOs and the gateway test. No business rules. |
| `apps/gateway_hr/src/testing/` | `hr-gateway.ts` (`createHrGateway`: boots the gateway in memory, signs accounts in, sends requests) and `in-memory-workforce.ts` (`createInMemoryWorkforce`: in-memory repositories of every collection `WorkforceModule` uses). |
| `apps/gateway_hr/src/gateway.hr.module.ts` | Root module: config, logger, Mongo, `IdentityModule` (guards), filters, access log. |

Rules:

- The context stays transport-neutral: no HTTP, headers or Nest request types in `apps/workforce` (`placement.md`).
- `apps/workforce` may import `apps/repository`, `apps/utility`, `apps/configuration` and, for tests only, `apps/identity/testing`. It must not import identity services. `gateway_hr` imports identity only for its guards, decorators, filter, permission catalog and `AuthenticatedUser`.
- Do not duplicate `identity`'s error classes. Use the workforce ones.

## 2. Sign-in

`gateway_hr` shares sign-in with `gateway_back_office`: the same `AuthenticationGuard` and `PermissionsGuard`, the same `AUTH_JWT_SECRET`, the same database. It has no login or refresh route; users sign in on `gateway_back_office` and use the access token on both gateways (`authentication.md` 3). Both must therefore run with the same `auth.env`.

## 3. Rules for every HR endpoint

- **Tenant.** Services receive `tenant_id` from `@CurrentUser()`. A record of another tenant, a missing record and a malformed id all answer 404 with the same code. Never take the tenant or `employee_id` from a request body or query.
- **Reads write no log entry**, on success or on failure (`logging.md` 4.3). Do not wrap a read in `observe`. Name repository reads `find*`.
- **Writes** go through `observe` with an event name `<noun>_<verb>` (for example `organization_create`) and write one entry with the shared fields. Never log request values, names, identifiers or numbers; log the error class and the workforce `code`.
- **Change history.** Every write is recorded by the repository (`database.md` 6.1). An optional `reason` in the request body is passed with `withChangeReason`. Do not add `updated_by` or history fields.
- **Concurrency.** Update bodies accept an optional `version`. A stale version answers 409 `stale_version`.
- **Parents.** A record that points to a parent (a facility to its organization) checks that the parent exists in the tenant, is active and is not soft-deleted. A missing, deleted and foreign parent give one answer (422 `<parent>_not_found`), so nothing leaks across tenants. Deactivating a parent is refused (409 `<parent>_in_use`) while it has active children.
- **Immutable fields.** A field that other records depend on (a code, a country, a time zone, a parent) is not in the repository's `updatableFields`, not in the update DTO, and not in the update service input. A request that sends only immutable fields answers 422 `empty_update`.
- **No delete.** HR records are set inactive or closed, never deleted, unless the collection design says otherwise.
- **Validation.** The DTO checks shape and length (400). The service checks business rules (422), so a second transport would get the same rules. A code from a code system (a `Coding`) is validated with `CodeConceptService.assertActive(tenantId, coding)`: the concept must exist (the tenant's own or platform-wide), be active and cover today. Never accept a `Coding` unchecked, and never copy a code list into the service.
- **Paging.** Lists accept `limit` (1 to 100) and `offset` (0 or more) and reject other values; without `limit` the repository default applies (`DEFAULT_PAGE_SIZE`, 10). Lists are ordered by a stable field, usually `code`.
- **Responses** are models: no `_id`, no `__v`.

## 4. Permissions

Permissions are in `apps/identity/permission.ts` (`PERMISSIONS`). HR names follow `workforce.<resource>:<action>`. Each group adds its own; roles can only hold catalog permissions. Today only tenant-wide bindings give permissions (`authentication.md` 5), so Head of Unit and "own record" rules are not enforced per unit yet.

| Permission | Routes |
|---|---|
| `workforce.organization:read` | `GET /v1/organizations`, `GET /v1/organizations/:id` |
| `workforce.organization:write` | `POST /v1/organizations`, `PATCH /v1/organizations/:id` |
| `workforce.facility:read` | `GET /v1/facilities`, `GET /v1/facilities/:id` |
| `workforce.facility:write` | `POST /v1/facilities`, `PATCH /v1/facilities/:id` |
| `workforce.unit:read` | `GET /v1/units`, `GET /v1/units/tree`, `GET /v1/units/:id` |
| `workforce.unit:write` | `POST /v1/units`, `PATCH /v1/units/:id`, `POST /v1/units/:id/move`, `POST /v1/units/:id/close` |
| `workforce.position:read` | `GET /v1/positions`, `GET /v1/positions/:id` |
| `workforce.position:write` | `POST /v1/positions`, `PATCH /v1/positions/:id`, `POST /v1/positions/:id/close` |
| `workforce.code-concept:read` | `GET /v1/code-concepts` |
| `workforce.code-concept:manage` | `POST /v1/code-concepts`, `PATCH /v1/code-concepts/:id`, `POST /v1/code-concepts/import` |

## 5. Adding an HR area

1. Read the group in `hr-endpoints.md` and its plan in `.claude/design/plans/`; settle the open decisions with the user first.
2. Add the repository when the area needs one (`database.md` 12): token, interface with named `find*` queries, schema with indexes starting with `tenant_id`, Mongo implementation on `MongoRepositoryBase`, module, and a repository spec. The model and classification already exist in `apps/repository/model/`.
3. Add the in-memory repository to `workforce/testing/in-memory.ts`, with the same uniqueness rules as the indexes, and register it (token and entity) in `gateway_hr/src/testing/in-memory-workforce.ts`.
4. Add the service in `workforce/<area>/` with its spec (in-memory repositories): happy paths, every rejection, tenant isolation, stale version, reads write no log, writes log no values.
5. Add the permissions to the catalog.
6. Add the controller, DTOs and module in `gateway_hr/src/<area>/`, import the module in `GatewayHrModule`, and write the gateway test with `createHrGateway` (`facility.spec.ts` is the reference): 401, 403, happy paths, 404 for malformed, missing and foreign ids, 409 cases, validation, list limits, reads write only the access log, writes log no values.
7. Update `workforce.md` (permissions, rules), the status in `hr-endpoints.md` and the plan, in a **separate documentation PR** after the code merged. Code and documentation never share a PR (the commit scope table in `git-workflow.md` changing together with `commitlint.config.mjs` is the one exception).

## 6. Running

| Command (from `apps/back-end`) | Does |
|---|---|
| `pnpm start:dev:hr` | Runs `gateway_hr` with reload on port 3001 (`NODE_PORT`). |
| `pnpm start:hr`, `pnpm start:prod:hr` | Run it once, from source or from `dist`. |
| `pnpm build:hr` | Builds only `gateway_hr` (`pnpm build` builds all applications). |
| `pnpm type-check` | Checks `gateway_back_office`, `gateway_hr` and `worker`. |

From the repository root, `pnpm dev:hr` starts it. The application needs the same environment files as `gateway_back_office` (`application`, `mongo`, `logger`, `change-log`, `auth`) and a MongoDB replica set.

No first administrator exists (`authentication.md` 5). To call HR endpoints by hand, insert an account, a role holding the HR permissions and a tenant binding with `mongosh`, then sign in on `gateway_back_office`.

## 7. Not built yet

- Every HR group after organizations (see `hr-endpoints.md` for the order), and the repositories for their collections.
- HR events to the identity module, account requests, role derivation, expiry and eligibility jobs, notifications (the worker).
- Scoped permissions (unit and own-record access), field encryption of personal identifiers (arrives with the private profile), file uploads.
