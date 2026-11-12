# gateway_hr Plan

Status: **In progress** (2026-11-10). Groups 1.1 to 1.3 built (PR #7, #10, #14). Replaces `2026-11-07-workforce-core-implementation.md`.

**Goal:** a new NestJS application `gateway_hr`, built like `gateway_back_office`, that serves the HR endpoints of `../hr-endpoints.md` on top of the approved collections (`../human-resource-collections.md`, `../account-and-workforce-collections.md`).

**How we work:** we walk through the endpoint groups in the order of section 3, one at a time. For each group: discuss and agree the endpoints, then build them, test them, and open one PR. Nothing in a group is built before it is agreed.

## 1. Code structure

```
apps/back-end/
├── apps/
│   ├── gateway_hr/                  new Nest application (mirrors gateway_back_office)
│   │   ├── tsconfig.app.json
│   │   └── src/
│   │       ├── main.ts              Fastify bootstrap, same settings, own port
│   │       ├── gateway.hr.module.ts root: config, logger, Mongo, guards, filters, access log
│   │       ├── gateway.hr.controller.ts   health check
│   │       ├── http/                HTTP-only helpers (for example CSV request bodies)
│   │       └── <area>/              one folder per HR area: module, controllers, DTOs, gateway test
│   ├── workforce/                   new domain context, no HTTP code (alias @workforce)
│   │   ├── workforce.module.ts, workforce.error.ts, workforce.filter.ts, observe.ts
│   │   ├── structure/ employee/ contract/ assignment/ concept/ parameter/
│   │   ├── license/ credentialing/ rostering/ import/ eligibility/
│   │   └── testing/in-memory.ts     in-memory repositories for tests
│   ├── repository/                  token.ts, interface/, mongo/ schemas, implementations, modules
│   │                                (models already exist in model/)
│   ├── utility/                     crypto/ (field encryption), validation/local-date.ts,
│   │                                testing/in-memory-repository.ts (moved from identity)
│   ├── configuration/encryption.ts  new config context
│   └── identity/permission.ts       HR permissions added to the existing catalog
└── environment/development/encryption.env
```

Each HR area has a domain folder in `workforce/` (services and rules) and an HTTP folder in `gateway_hr/src/` (controllers and DTOs). Repositories for an area are built together with the area that first needs them.

## 2. Steps

| # | Step | Content | Status |
|---|---|---|---|
| 0 | Commit the models | Two PRs, documentation and code, never mixed (#5 models, #6 documents). | Done |
| 1 | Shared foundations | Built inside the first code PR (group 1.1) and then group by group, never in advance: `@workforce` alias, workforce errors, filter and logging helper, shared in-memory test repository and commit scopes arrive with 1.1; field encryption arrives with 2.2 (private profile); local-date validation with the first group that stores dates. | Partly done in PR #7 (alias, errors, filter, logging helper, shared test repository, commit scopes) |
| 2 | Application skeleton | `gateway_hr` project in `nest-cli.json`, `tsconfig`, `main.ts` (`NODE_PORT=3001`), root module, health endpoint, `package.json` scripts (build, dev, type-check). Built in the group 1.1 PR. | Done (PR #7) |
| 3 | Endpoint groups | One group at a time, in the order of section 3: repositories it needs, services, controllers, DTOs, permissions, tests. One branch and PR per group. | In progress: 1.1 to 1.6 done, 2.1 in discussion |
| 4 | Docs and checks | `workforce.md` rule file, `authentication.md` update, lint, type-check, full test suite on Node 22, each time a group is finished. | `workforce.md` written (docs PR after 1.1); repeated per group |

## 3. Walkthrough order

Groups follow their dependencies: units need facilities and codes, employees need units and codes, licences need employees, credentialing needs licences, rostering needs licences and SPKs.

| Order | Group (`hr-endpoints.md`) | Endpoints | Discussion | Build |
|---|---|---|---|---|
| 1 | 1.1 Organizations | 4 | Done (`gateway-hr-1-1-organizations.md`) | Built, PR #7 |
| 2 | 1.2 Facilities | 4 | Done (`gateway-hr-1-2-facilities.md`) | Built, PR #10 |
| 3 | 1.3 Code concepts | 4 | Done (`gateway-hr-1-3-code-concepts.md`) | Built, PR #14 |
| 4 | 1.4 Organization units | 7 | Done (`gateway-hr-1-4-organization-units.md`) | Built, PR #17 |
| 5 | 1.5 Positions | 5 | Done (`gateway-hr-1-5-positions.md`) | Built, PR #19 |
| 6 | 1.6 HR parameters | 4 | Done (`gateway-hr-1-6-hr-parameters.md`) | Built, PR #21 |
| 7 | 2.1 Employee records | 6 | In discussion (`gateway-hr-2-1-employee-records.md`) | — |
| 8 | 2.2 Private profile | 6 | — | — |
| 9 | 2.3 Employment contracts | 6 | — | — |
| 10 | 2.4 Position assignments | 4 | — | — |
| 11 | 2.5 Committee memberships | 3 | — | — |
| 12 | 3.1 Licences | 7 | — | — |
| 13 | 3.2 Professional credits | 6 | — | — |
| 14 | 4.1 Privilege catalog | 5 | — | — |
| 15 | 4.2 Credential applications | 14 | — | — |
| 16 | 4.3 SPK and granted privileges | 9 | — | — |
| 17 | 5.1 Shift definitions | 4 | — | — |
| 18 | 5.2 Holiday calendars | 5 | — | — |
| 19 | 5.3 Coverage requirements | 4 | — | — |
| 20 | 5.4 Rosters | 10 | — | — |
| 21 | 5.5 Roster assignments | 7 | — | — |
| 22 | 5.6 Imports | 3 | — | — |
| 23 | 5.7 Shift swaps | 6 | — | — |
| 24 | 5.8 Practice schedules | 6 | — | — |
| 25 | 6 Clinical eligibility | 1 | — | — |

Groups 1.1 and 1.2 are small and can be built in one PR if you agree both.

## 4. Open decisions

Each is settled when we reach the group that first needs it. The proposed default applies only if you agree.

| # | Decision | Proposed default | Settle at |
|---|---|---|---|
| D1 | Sign-in for `gateway_hr` (decided, built in 1.1) | Reuse identity's guards and the shared JWT secret (same database, same deployment); login stays on `gateway_back_office`. Switching to asymmetric keys (`authentication.md` 3) is a separate task. | Step 2 |
| D2 | "Own record" and "units I head" access | "Own" through the account's `employee_id` now; Head of Unit access stays tenant-wide until scoped permissions exist. | 2.1 Employee records |
| D3 | File uploads (licence scans, SPK letters) | Accept file references only; no file service yet. | 3.1 Licences |
| D4 | CSV imports | `text/csv` request body with a size limit; parse with the `csv-parse` package. | 5.2 Holiday calendars |
| D5 | Scheduled jobs and alerts | Out of scope: expiry jobs, eligibility re-checks and notifications go to the worker in a later task. | 3.1 Licences |
| D6 | Pull request size and kind | One branch and PR per group (or per two small groups), merged before the next starts. Documentation and code are always separate PRs; documentation about built behaviour is written after the code merged. | Step 0 |

## 5. Not in this plan

- The outline HR sub-processes (recruitment, attendance, leave, training, performance, payroll, occupational health, discipline, separation details): their specification must be detailed first.
- HR events to the identity module, account requests and role derivation.
- Front-end screens.
