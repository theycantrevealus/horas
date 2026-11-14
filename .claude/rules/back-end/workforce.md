# Back End Workforce (HR)

The workforce context (`apps/back-end/apps/workforce`, alias `@workforce/*`) holds the domain rules of the Human Resource Management module. It is exposed over HTTP by `gateway_hr` (`apps/back-end/apps/gateway_hr`). Business source: `.claude/business/administrative-operational-system/human-resource-management.md`. Collections: `.claude/design/human-resource-collections.md` and `account-and-workforce-collections.md`. Endpoints and build order: `.claude/design/hr-endpoints.md` and `.claude/design/plans/`. Repository rules: `database.md`. Logging rules: `logging.md`. Placement: `placement.md`.

## 1. Layout

| Path | Contents |
|---|---|
| `apps/workforce/workforce.module.ts` | `WorkforceModule`: imports the repository modules and exports the services. Each HR area adds its own here. |
| `apps/workforce/workforce.error.ts` | `WorkforceError` and `NotFoundError`, `ConflictError`, `InvalidRequestError`, `ForbiddenError`. Transport-neutral, with a stable `code`. |
| `apps/workforce/workforce.filter.ts` | `WorkforceExceptionFilter`: 404, 409, 422, 403. A 404 or 422 on `GET` or `HEAD` is answered but not logged; conflicts and 403 stay logged. |
| `apps/workforce/observe.ts` | `observe(logger, event, operation, work)`: one structured log entry per write. |
| `apps/workforce/<area>/` | Services and their specs, one folder per HR area (`structure/`, later `employee/`, `license/`, ...). |
| `apps/workforce/structure/{codes,external-ids,localized-texts,address}.ts` | Shared checks for HR data (code format, identifiers given by other systems, texts per language, postal address). Each returns the cleaned value or `null`; the service picks the error code. Reuse them instead of writing new ones. `structure/unit-tree.ts` builds the organization chart from a flat list. |
| `apps/workforce/concept/` | `CodeConceptService` (list, create, update, import, `assertActive`, `resolve`), the required properties of known code systems (`system-rules.ts`) and the import bundles (`bundles.ts`, `bundle-id.ts`). |
| `apps/utility/validation/local-date.ts` | `isLocalDate`, `isValidPeriod`, `todayUtc`, `todayInZone(timeZone)` (today in a facility's zone), `@IsLocalDate()`. Calendar dates are `YYYY-MM-DD` strings (`database.md` 4.4). |
| `apps/workforce/license/` | `LicenseService` (list, list by employee, get, register for HR and for the signed-in employee, verify, revoke) and the licence rules (`license-rules.ts`: document number, scan reference, dates). Verifying a renewal runs in one transaction with the licence it supersedes. Dates are UTC: a licence has no facility zone. |
| `apps/workforce/committee/` | `CommitteeMembershipService` (list, appoint, end) and the date checks (`committee-rules.ts`). Dates use the facility's time zone. |
| `apps/workforce/assignment/` | `AssignmentService` (list by employee and by unit, create, end) and the assignment rules (`assignment-rules.ts`: period, FTE, decision number, overlap). Creating and ending run in one transaction with the employee's `primary_assignment` summary. Local dates use the facility's time zone, read through the position's unit. |
| `apps/workforce/contract/` | `ContractService` (list, get, create, correct a draft, activate, end, terminate) and the contract rules (`contract-rules.ts`). Activating, ending and terminating run in one transaction with the employee's `current_employment` summary. |
| `apps/workforce/employee/` | `EmployeeService` (search, get, own record, register, update, status change), the name and work-contact checks (`names.ts`, `contacts.ts`) and the status transition table (`status.ts`). |
| `apps/workforce/private-profile/` | `PrivateProfileService` (confidential profile: save, replace identifiers and bank accounts, reveal, own profile), the identifier formats (`identifier-formats.ts`) and the bank account checks (`bank-accounts.ts`). Secrets are encrypted, hashed and masked in the repository, never here. |
| `apps/utility/encryption/` | `FieldCipher` port (`FIELD_CIPHER`), `AesGcmFieldCipher` (AES-256-GCM, per-tenant keys derived from `encryption.env`), `EncryptionModule` and `mask()`. Only repository implementations use it. |
| `apps/workforce/parameter/` | `ParameterService` (list, catalog, set, effective, `resolve`), the parameter catalog in code (`catalog.ts`: keys, types, defaults, allowed scopes) and the value checks (`value-types.ts`). Rules that need a parameter call `resolve`, never the collection. |
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
| `workforce.employee:read` | `GET /v1/employees`, `GET /v1/employees/:id` |
| `workforce.employee:write` | `POST /v1/employees`, `PATCH /v1/employees/:id` |
| `workforce.employee:status` | `POST /v1/employees/:id/status` |
| none (sign-in only) | `GET /v1/employees/me` |
| `workforce.private-profile:read` | `GET /v1/employees/:id/private-profile` |
| `workforce.private-profile:write` | `PUT /v1/employees/:id/private-profile`, `PUT .../identifiers`, `PUT .../bank-accounts` |
| `workforce.private-profile:reveal` | `GET /v1/employees/:id/private-profile/identifiers/:system` |
| none (sign-in only) | `GET /v1/employees/me/private-profile` |
| `workforce.contract:read` | `GET /v1/employees/:id/contracts`, `GET /v1/contracts/:id` |
| `workforce.contract:write` | `POST /v1/contracts`, `PATCH /v1/contracts/:id` (drafts), `POST /v1/contracts/:id/activate`, `POST /v1/contracts/:id/end` |
| `workforce.contract:terminate` | `POST /v1/contracts/:id/terminate` |
| `workforce.position:read` | `GET /v1/positions`, `GET /v1/positions/:id` |
| `workforce.position:write` | `POST /v1/positions`, `PATCH /v1/positions/:id`, `POST /v1/positions/:id/close` |
| `workforce.assignment:read` | `GET /v1/employees/:id/assignments`, `GET /v1/units/:id/assignments` |
| `workforce.assignment:write` | `POST /v1/assignments`, `POST /v1/assignments/:id/end` |
| `workforce.committee-membership:read` | `GET /v1/committee-memberships` |
| `workforce.committee-membership:write` | `POST /v1/committee-memberships`, `POST /v1/committee-memberships/:id/end` |
| `workforce.license:read` | `GET /v1/licenses`, `GET /v1/licenses/:id`, `GET /v1/employees/:id/licenses` |
| `workforce.license:write` | `POST /v1/licenses` |
| `workforce.license:verify` | `POST /v1/licenses/:id/verify`, `POST /v1/licenses/:id/revoke` (HR Admin only) |
| none (sign-in only) | `POST /v1/employees/me/licenses` |
| `workforce.parameter:read` | `GET /v1/parameters`, `GET /v1/parameters/catalog`, `GET /v1/parameters/effective` |
| `workforce.parameter:write` | `POST /v1/parameters` |
| `workforce.code-concept:read` | `GET /v1/code-concepts` |
| `workforce.code-concept:manage` | `POST /v1/code-concepts`, `PATCH /v1/code-concepts/:id`, `POST /v1/code-concepts/import` |

## 3a. Assignments

- An employee has at most one open primary assignment and a head-of-unit position at most one open holder (partial unique indexes on `is_open`). Other checks (409 `fte_exceeded`, `headcount_exceeded`) read then write, so two simultaneous creates can both pass.
- Overlapping open assignments under one contract must not exceed the contract's `fte`. Acting assignments do not count against a position's budgeted headcount.
- An assignment lies inside its contract's period; acting and secondment need an end date. It is created `planned` when it starts after today in the facility's zone, otherwise `active`. Nothing activates a planned assignment yet.
- Assignments are never edited or deleted: end one (`POST /assignments/:id/end`) and create another. A position with an open assignment cannot be closed (409 `position_in_use`).

## 3b. Committee memberships

- A person has at most one active membership in a committee of a facility (409 `membership_exists`); a committee of a facility has at most one active chair and one active secretary (409 `chair_exists`, `secretary_exists`). Partial unique indexes on `status: 'active'` back the checks.
- The committee and the role are codes (`id.committee`, `id.committee-role`), checked with `assertActive`. The member must be an employee of the tenant who has not separated; the facility must be active.
- An appointment starts no later than tomorrow in the facility's zone and its end, if given, is not in the past; a membership ends on a date from its start to tomorrow. Nothing is edited or deleted: end a membership and appoint again.

## 3c. Licences

- A licence starts `pending_verification`. Only a different account than the submitter may verify it (403 `verifier_is_submitter`), and only HR Admin holds `workforce.license:verify`.
- The licence type (a code concept) decides what a licence needs: `requires_expiry_date` (expiry date), `location_specific` (a practice location) and `eligibility_role` (copied onto the licence). A document number is unique per type while the record is live (normalized: upper case, no spaces, dots or hyphens). The scan is a file reference only (`file_id`, content type, SHA-256); nothing checks that the file exists.
- A match needs the licence's profession to equal the employee's and its specialty to be empty or equal the employee's primary specialty. An expired licence, or one issued later than today (UTC), cannot be verified. A mismatch rejects it with a reason; nothing is edited or deleted, a corrected licence is registered anew.
- At most one valid practice permit per employee, profession and facility (409 `valid_license_exists`). A renewal names the valid licence it replaces; verifying it supersedes that one.
- Nothing expires licences yet: a `valid` licence past its date stays `valid` until a worker job exists, so eligibility must read the date too.

## 4a. Events

Workforce writes events to the event outbox in the same transaction as the data (`database.md` 7.1). Plan: `.claude/design/plans/gateway-hr-events-to-identity.md`.

| Event | Emitted by | Payload |
|---|---|---|
| `workforce.employee.status_changed` | `EmployeeService.changeStatus` | `employee_id`, `from_status`, `to_status`, `effective_date` |
| `workforce.contract.activated`, `.ended`, `.terminated` | `ContractService` | `contract_id`, `employee_id`, `organization_id` |

- A refused change (invalid transition, stale version, failed activation) writes no event. Registering an employee emits nothing.
- Payloads hold identifiers, codes and dates only, never a name, number, contact, reason or note.
- Identity reacts to status changes with account holds (`authentication.md` 5). Contract events are published and ignored for now. Delivery is at least once, in order, by the worker's relay (`logging.md` 14); the worker must be running for holds to be applied.
- A new HR event adds its name and payload to `workforce-event.ts`, an emit inside the writing transaction, and a test that it is written once, with the right correlation id and no personal values.

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

`gateway_hr` also needs `encryption.env` (`ENCRYPTION_MASTER_KEY`, `ENCRYPTION_HASH_KEY`: base64, 32 bytes each, `openssl rand -base64 32`). Never commit it; back both keys up, because losing the master key makes stored profiles unreadable and changing the hash key breaks identifier uniqueness checks.

No first administrator exists (`authentication.md` 5). To call HR endpoints by hand, insert an account, a role holding the HR permissions and a tenant binding with `mongosh`, then sign in on `gateway_back_office`.

## 7. Not built yet

- Every HR group after organizations (see `hr-endpoints.md` for the order), and the repositories for their collections.
- Account requests, role derivation, assignment, committee and licence events, daily expiry of licences, the practice-location limit (`HR-LIC-007`), the licence rule for leaving `onboarding` (`HR-LIC-009`), activation of planned assignments and ending assignments when an employee separates (a worker job or an event consumer), the tenant policy for account lifecycle, reconciliation, a tool to re-queue or skip a blocked event, expiry and eligibility jobs, notifications (the worker).
- Scoped permissions (unit and own-record access), field encryption of personal identifiers (arrives with the private profile), file uploads.
