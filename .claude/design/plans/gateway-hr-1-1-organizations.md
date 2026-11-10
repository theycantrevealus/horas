# gateway_hr 1.1: Organizations

Status: **Built** (2026-11-10, PR #7 merged). Part of `2026-11-10-gateway-hr-plan.md` (walkthrough order 1). Endpoints: `../hr-endpoints.md` 1.1. Collection: `../human-resource-collections.md` and `../account-and-workforce-collections.md` 3.2.

Group 1.1 is the first thing built, so its code PR also creates what every later group reuses: the `gateway_hr` application, the `workforce` context and its error handling. Nothing else is added in advance (no encryption, no date validation, no other repositories); each later group adds what it needs.

## 1. Pull requests

Documentation never shares a pull request with code.

| PR | Kind | Branch | Content |
|---|---|---|---|
| 1 | Docs | `docs/repo-hr-design` | Design documents (`human-resource-collections.md`, `hr-endpoints.md`, the edit to `account-and-workforce-collections.md`), HR specification changes, `CLAUDE.md` pointer, the plans and this document. |
| 2 | Code | `feat/repository-hr-models` | The 28 models and their classifications only. |
| 3 | Code | `feat/gateway-hr-organizations` | Application skeleton, `workforce` foundation, organization repository, service and endpoints (cut from `main` after PR 2 merges). |
| 4 | Docs | `docs/workforce-organizations` | `workforce.md` rule file, `hr-endpoints.md` and plan status updates, `authentication.md` note about `gateway_hr` (written from the merged code, after PR 3). |

The commit scope table (`git-workflow.md` 2.2) changes together with `commitlint.config.mjs` in PR 3, because that rule requires both in the same PR. It is the only documentation file in a code PR.

## 2. The four endpoints

| Endpoint | Behaviour |
|---|---|
| `GET /v1/organizations` | Lists the tenant's organizations. Filters `status`; paging `limit` (1 to 100, repository default 10 when omitted) and `offset`; sorted by `code`. Writes no log entry. |
| `POST /v1/organizations` | Creates one. Body: `code`, `legalName`, `country`, `currency`, `identifiers` (list of `{ system, value }`, optional). Starts `active`. Duplicate code in the tenant answers 409 `organization_exists`. |
| `GET /v1/organizations/:id` | Returns one. A missing, malformed or other-tenant id answers 404 `organization_not_found`. |
| `PATCH /v1/organizations/:id` | Edits `legalName`, `currency`, `identifiers`, `status`. Optional `version` makes the edit conditional (409 `stale_version` when someone changed it meanwhile). Optional `reason` is stored in the change history. An empty body answers 422. |

Permissions (new, in the identity permission catalog): `workforce.organization:read` for the two reads, `workforce.organization:write` for create and edit.

## 3. Rules and decisions to confirm

| # | Rule or decision | Proposed |
|---|---|---|
| O1 | `code` and `country` cannot change after creation. `code` is the key people refer to, and `country` selects the jurisdiction's code systems and labour rules. | Yes, fixed at creation. |
| O2 | Organizations are never deleted, only set `inactive`. | Yes. |
| O3 | Setting an organization `inactive` while it has active facilities or contracts is refused. | Rule documented now; enforced when facilities (1.2) and contracts (2.3) exist, in those groups' PRs. |
| O4 | `code` format: lower-case letters, digits, dots, hyphens and underscores, starting with a letter or digit, 2 to 32 characters. Lower-case only, so uniqueness needs no case rules. | As stated. |
| O5 | `country` is a valid ISO 3166-1 alpha-2 code and `currency` a valid ISO 4217 code, both checked with the built-in `Intl` data, no extra package. | As stated. |
| O6 | `identifiers` hold company numbers (NIB, NPWP badan, EIN, UEN). At most 20 entries; `system` and `value` required; no duplicate `system`. | As stated. |
| O7 | Port and routes: `gateway_hr` listens on 3001 (`NODE_PORT`), no global route prefix, URI versioning `/v1`, like `gateway_back_office`. | As stated. |
| O8 | Sign-in is shared with `gateway_back_office` (decision D1 of the main plan): same guards, same JWT secret, same database. Login and refresh stay on `gateway_back_office`. | As stated. |

## 4. Code structure of PR 3

```
apps/back-end/
├── nest-cli.json                         + project gateway_hr
├── package.json                          + build:hr, start:hr, start:dev:hr; type-check also checks gateway_hr
├── tsconfig.json, vitest.config.ts       + alias @workforce
├── apps/
│   ├── gateway_hr/
│   │   ├── tsconfig.app.json
│   │   └── src/
│   │       ├── main.ts                   same bootstrap as the back office, NODE_PORT 3001
│   │       ├── gateway.hr.module.ts      config, logger, Mongo, IdentityModule (guards),
│   │       │                             filters (repository, identity, workforce), access log,
│   │       │                             WorkforceManagementModule
│   │       ├── gateway.hr.controller.ts  GET /v1/health
│   │       └── organization/
│   │           ├── organization.controller.ts
│   │           ├── organization.dto.ts
│   │           ├── organization.module.ts
│   │           └── organization.spec.ts  gateway test, in-memory repository
│   ├── workforce/
│   │   ├── workforce.module.ts           exports services; imports repository modules
│   │   ├── workforce.error.ts            WorkforceError: not_found, conflict, invalid, forbidden
│   │   ├── workforce.filter.ts           maps them to 404, 409, 422, 403
│   │   ├── observe.ts                    logs one entry per write
│   │   └── structure/
│   │       ├── organization.service.ts
│   │       └── organization.service.spec.ts
│   ├── repository/
│   │   ├── token.ts                      + REPOSITORY_ORGANIZATION
│   │   ├── interface/organization.ts     findByCode(tenantId, code)
│   │   └── mongo/
│   │       ├── schema/organization.ts    collection `organizations`, unique {tenant_id, code}
│   │       ├── organization.ts           extends MongoRepositoryBase
│   │       ├── organization.module.ts
│   │       └── organization.spec.ts
│   ├── utility/testing/in-memory-repository.ts   moved from identity/testing/in-memory.ts
│   └── identity/permission.ts            + two workforce.organization permissions
```

## 5. Tasks

Each task is a testable result; tests come first.

1. **Foundation.** `@workforce` alias, workforce errors, filter and `observe`; move `InMemoryRepository` to `utility/testing` (identity tests must still pass); two new permissions; commit scopes `workforce` and `gateway-hr`.
   *Tests:* error kinds and filter status mapping (a 404 on `GET` is not logged); full back-end suite still green.
2. **Organization repository.** Interface, schema, Mongo implementation, module, token.
   *Tests (fake model token, like `lov.spec.ts`):* create records one change entry; duplicate code rejects `RepositoryConflictError`; `findByCode` finds by tenant and code; the update path ignores `code` and `country` even if passed; soft-deleted records are hidden.
3. **Organization service.** `list`, `get`, `create`, `update`.
   *Tests (in-memory repository):* create, duplicate code conflict, tenant isolation (other tenant's id is not found), stale version conflict, empty update invalid, invalid country and currency invalid, `identifiers` duplicate `system` invalid, reasons are passed to the change history.
4. **Application skeleton.** `gateway_hr` project, `main.ts`, root module, health controller, scripts.
   *Test:* the application boots in a test module and `GET /v1/health` answers 200 without a token.
5. **Organization endpoints.** Controller, DTOs, module.
   *Gateway tests (in-memory repositories, signed-in admin):* 401 without a token; 403 without the permission; create, list, get, patch happy paths; malformed id 404; foreign tenant id 404; duplicate code 409; stale `version` 409; invalid body fields 422/400 per the existing validation pipe; a `GET` writes no log entry other than the access log; the response never contains `_id` or `__v`.
6. **Checks.** `pnpm lint`, `pnpm type-check`, full test suite on Node 22; boot `gateway_hr` once against the development configuration and confirm it starts (reported honestly if MongoDB is not available).

## 6. Review focus

1. Two requests create the same `code` at the same moment: exactly one succeeds, the other gets 409 (the unique index decides).
2. `PATCH` with `code` or `country` in the body is ignored or rejected, never applied (O1).
3. `limit` of 0, 101 or a negative `offset` is rejected, not silently clamped.
4. An inactive organization is still listed and readable, with `status: 'inactive'`.
5. The change history shows who changed what for create and edit, with the reason when one was sent, and never records a read.

## 7. To try the endpoints by hand

No first administrator exists yet (`authentication.md` 5). The automated tests sign in with a test account. To call the endpoints manually someone has to insert an account, a role holding the two new permissions and a binding with `mongosh`. A seed script is a separate task.
