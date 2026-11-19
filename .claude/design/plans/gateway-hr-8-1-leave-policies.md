# gateway_hr 8.1: Leave types and policies Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: **Built** (2026-11-19, PR #123 merged; as-built notes in section 7). Part of `2026-11-10-gateway-hr-plan.md` (walkthrough order 27). Endpoints: `../hr-endpoints.md` 8.1. Collection: `../human-resource-collections.md` 9.1 and 9.2 (`leave_policies`). Business rules: `../../business/administrative-operational-system/human-resource-management.md` 9.4.2 (Leave Type, Leave Policy), 9.4.8 (Indonesian bundle), `HR-LEV-001`. Rules every endpoint follows: `../../rules/back-end/workforce.md` 3. Built references: code concepts (1.3: bundles, `assertActive`), HR parameters (1.6: dated values), shift definitions (5.1).

**Goal:** HR Manager can define, version and import the leave policies that every later leave group reads.

**Architecture:** Leave types are code concepts of a `…leave-type` system, added to the Indonesian concept bundle. Their rules are `leave_policies` documents, one per tenant, type and `effective_from`, maintained by a new `LeavePolicyService` in `apps/workforce/leave/` and exposed by `gateway_hr/src/leave-policy/`. A separate policy bundle in code loads the starter policies of HR spec 9.4.8.

**Tech Stack:** NestJS 12, Mongoose, Vitest, oxlint, Node 22.

**Spec:** `../../business/administrative-operational-system/human-resource-management.md` 9.4 and `../human-resource-collections.md` 9.

## Global Constraints

- Every rule of `../../rules/back-end/workforce.md` 3 applies: tenant from `@CurrentUser()`, reads write no log, writes go through `observe`, change history by the repository, optional `version` (409 `stale_version`), paging `limit` 1 to 100 and `offset` ≥ 0, responses are models.
- Repository rules: `../../rules/back-end/database.md` sections 4, 6, 6.1 and 12 (model, classification, schema `<Name>Entity`, pinned collection, `MongoRepositoryBase`, every write recorded).
- Code and documentation never share a PR (`workforce.md` 5 step 7).
- No semicolons, JSDoc on every block (`typescript.md`, `jsdoc.md`).
- Checks run from `apps/back-end` under Node 22: `npx tsc -p apps/gateway_hr/tsconfig.app.json --noEmit`, `npx oxlint`, `npx vitest run`, `npx nest build gateway_hr`.

## Review Focus

1. A policy version that is in force must never change what an existing request was decided under: editing is allowed only before the version's `effective_from` (LP6); 8.3 adds the "used by a request" check.
2. Two versions of one type with the same `effective_from` would make "the version in force" ambiguous: the unique index and the 409 must both hold.
3. Importing the bundle twice must create nothing the second time.
4. A policy for a leave type whose concept is retired or missing is refused, and a policy naming an employment type of the wrong code system is refused.
5. `per_event` and `none` policies must not carry `period`-only settings (carry-over, collective leave), or 8.2 would grant days nobody can use.

## 1. The four endpoints

| Endpoint | Behaviour |
|---|---|
| `GET /v1/leave-policies` | Lists policy versions. Query: `leaveTypeSystem` with `leaveTypeCode`, `onDate` (only the version in force on that date, per type), `limit`, `offset`. Ordered by type code, then `effective_from` latest first. Writes no log entry. |
| `POST /v1/leave-policies` | Adds a version. Body: `leaveType` (`{ system, code }`), `effectiveFrom`, `balance`, `counting`, `halfDays`, `paid`, `employmentTypes`, `approval`, `noticeDays`, `retroactiveDays`, `maxDaysPerRequest`, `proof`, `notes`, optional `reason`. |
| `PATCH /v1/leave-policies/:id` | Edits a version that is not in force yet (LP6). Every field except `leaveType` and `effectiveFrom`. Optional `version`, `reason`. |
| `POST /v1/leave-policies/import` | Body: `bundle` (`id`), `effectiveFrom`. Creates one version per policy of the bundle (LP8). Answers `{ created, skipped }`. |

Permissions (new): `workforce.leave-policy:read` (list) and `workforce.leave-policy:write` (add, edit, import).

## 2. Rules and decisions

| # | Rule or decision | Proposed |
|---|---|---|
| LP1 | **Leave type.** A `Coding` whose system ends in `leave-type`, checked with `CodeConceptService.assertActive` (422 `invalid_leave_type` for another system; the concept service's own `unknown_code`, `code_retired`). Fixed after creation. | As stated. |
| LP2 | **Effective date.** `effectiveFrom` is a real local date from 2000-01-01 (422 `invalid_date`) and today or later in UTC (422 `effective_in_past`), so past decisions keep their rules. The import takes the same check. Unique with the type per tenant (409 `policy_exists`). | As stated. |
| LP3 | **Balance.** `{ kind: 'period', period: 'calendar_year' \| 'service_year', days, minServiceMonths, carryOver: { maxDays, expiresAfterMonths } \| null, deductCollectiveLeave }`, `{ kind: 'per_event', days }` or `{ kind: 'none' }` (422 `invalid_balance`). `days` is from 0.5 to 366 in steps of 0.5; `minServiceMonths` 0 to 120; `carryOver.maxDays` from 0.5 to `days`, `expiresAfterMonths` 1 to 24. | As stated. |
| LP4 | **Counting and days.** `counting` is `working_days` or `calendar_days` (422 `invalid_counting`). `maxDaysPerRequest` 1 to 366 (422 `invalid_max_days`). A `per_event` request is limited by `days`, so for `per_event` `maxDaysPerRequest` must equal `days` (422 `invalid_max_days`). `halfDays` and `paid` are booleans. | As stated. |
| LP5 | **Who and how.** `employmentTypes` is a list of at most 20 active codes of a system ending in `employment-type`, no repeats (422 `invalid_employment_type`, `duplicate_employment_type`); empty means all. `approval` is `{ steps: 'one_step' \| 'two_step', twoStepAboveDays: number \| null }`; `twoStepAboveDays` 0.5 to 366 and only with `one_step` (422 `invalid_approval`). `noticeDays` 0 to 365, `retroactiveDays` 0 to 30 (422 `invalid_notice`, `invalid_retroactive`). `proof` is `null` or `{ dueDays }` with 0 to 60 (422 `invalid_proof`). `notes` up to 500 characters. | As stated. |
| LP6 | **Edit.** Only a version whose `effectiveFrom` is after today (UTC) can be edited (422 `policy_in_force`); at least one field (422 `empty_update`). A version in force is replaced by adding a later one. 8.3 adds 422 `policy_in_use` for a version a request used. | As stated. |
| LP7 | **No delete, no retire.** A policy is never deleted. A leave type stops being requestable when its concept is retired (`HR-LEV-001`, checked in 8.3). | As stated. |
| LP8 | **Import.** `bundle` must name a policy bundle (422 `unknown_bundle`). Every concept of the bundle must exist and be active for the tenant (422 `concepts_missing`: import the concept bundle `id` first through `POST /v1/code-concepts/import`). A policy whose type already has a version with the same `effectiveFrom` is skipped. All versions are written in one transaction. `source` is `{ kind: 'bundle', bundle_id }`; hand-made versions are `{ kind: 'manual', bundle_id: null }`. | As stated. |
| LP9 | **Indonesian codes.** `id.leave-type` gets the 13 codes of HR spec 9.4.8 in `bundle-id.ts`, with Indonesian and English display texts and no properties; `system-rules.ts` requires no property for `…leave-type`. | As stated. |
| LP10 | **Reads.** Tenant-wide. `onDate` keeps, per type, the version with the latest `effective_from` on or before the date. A malformed filter answers an empty list. | As stated. |
| LP11 | **Logs.** `leave_policy_create`, `leave_policy_update`, `leave_policy_import` (with `count`), with the error class and `code` on failure, never a code, a number or a note. No events. | As stated. |

## 3. Repository

`LeavePolicyRepository` (`leave_policies`, token `REPOSITORY_LEAVE_POLICY`): `findByFilter(tenantId, query)`, `findInForce(tenantId, leaveType: Coding, date: string): Promise<LeavePolicy | null>`, `findByTypeAndDate(tenantId, leaveType, effectiveFrom)`, plus the base methods. Index `{ tenant_id, 'leave_type.system', 'leave_type.code', effective_from }` unique. Updatable fields: every field except `leave_type`, `effective_from`, `source`. The in-memory fake enforces the unique key (409 through `RepositoryConflictError`).

## 4. Code structure

```
apps/back-end/apps/
├── repository/model/{leave-policy.ts, leave-policy.classification.ts}   all fields internal
├── repository/{token.ts, interface/leave-policy.ts}
├── repository/mongo/{leave-policy.ts, leave-policy.module.ts, schema/leave-policy.ts} (+ spec)
├── workforce/concept/{bundle-id.ts, system-rules.ts}                     id.leave-type codes
├── workforce/leave/{leave-policy.service.ts, leave-policy-rules.ts, policy-bundles.ts} (+ specs)
├── workforce/workforce.module.ts, workforce/testing/in-memory.ts
├── identity/permission.ts                                                 workforce.leave-policy:read, :write
└── gateway_hr/src/leave-policy/                                           controller, DTOs, module, gateway test
```

## 5. Pull requests

| PR | Kind | Content |
|---|---|---|
| A | Docs | The four group 8 plans, the HR spec 9.4, collections section 9, `hr-endpoints.md` group 8 and the master plan rows (branch `docs/repo-leave-management-spec`). |
| B | Code | Tasks 1 to 4 (branch `feat/workforce-leave-policies`). |
| C | Docs | "Build in progress", then "built" (`workforce.md` 3s and permissions, this plan's status). |

## 6. Tasks

### Task 1: Model, classification and repository

**Files:**
- Create: `repository/model/leave-policy.ts`, `repository/model/leave-policy.classification.ts`, `repository/interface/leave-policy.ts`, `repository/mongo/schema/leave-policy.ts`, `repository/mongo/leave-policy.ts`, `repository/mongo/leave-policy.module.ts`
- Modify: `repository/token.ts`, `workforce/testing/in-memory.ts`, `gateway_hr/src/testing/in-memory-workforce.ts`
- Test: `repository/mongo/leave-policy.spec.ts`

**Interfaces:**
- Produces: `class LeavePolicy` with the fields of collections 9.2 (`leave_type: Coding`, `effective_from: LocalDate`, `balance: LeaveBalanceRule`, `counting: 'working_days' | 'calendar_days'`, `half_days`, `paid`, `employment_types: Coding[]`, `approval: { steps: 'one_step' | 'two_step'; two_step_above_days: number | null }`, `notice_days`, `retroactive_days`, `max_days_per_request`, `proof: { due_days: number } | null`, `notes`, `source`); `type LeaveBalanceRule` (the union of LP3, snake_case); `REPOSITORY_LEAVE_POLICY`; `LeavePolicyRepository.findInForce(tenantId: string, leaveType: Coding, date: string): Promise<LeavePolicy | null>`; `InMemoryLeavePolicyRepository`.

- [ ] **Step 1: Write the failing repository spec** (pattern of `repository/mongo/coverage-requirement.spec.ts`): `pins the collection name leave_policies`, `declares the unique index on tenant, type and effective_from`, `maps a document without _id or __v`, `findInForce returns the version with the latest effective_from on or before the date` (versions 2026-01-01 and 2027-01-01: `2026-06-30` → the first, `2027-01-01` → the second, `2025-12-31` → `null`), `records one change record of type leave_policy per write`, `never changes leave_type or effective_from on update`.
- [ ] **Step 2: Run** `npx vitest run apps/repository/mongo/leave-policy.spec.ts` — expected FAIL (module not found).
- [ ] **Step 3: Implement** the model, classification (every field `internal`), token, interface, schema (`LeavePolicyEntity`, collection `leave_policies`), `LeavePolicyRepositoryMongo` on `MongoRepositoryBase` with change type `leave_policy`, the module, and the in-memory fake with the same unique key and `findInForce`. Register the fake in `in-memory-workforce.ts`.
- [ ] **Step 4: Run** the spec and `npx vitest run apps/repository/model/classification.spec.ts` — expected PASS.
- [ ] **Step 5: Commit** `feat(repository): add the leave policy repository`.

### Task 2: Leave type codes and the policy rules

**Files:**
- Modify: `workforce/concept/bundle-id.ts`, `workforce/concept/system-rules.ts`
- Create: `workforce/leave/leave-policy-rules.ts`, `workforce/leave/policy-bundles.ts`
- Test: `workforce/concept/bundles.spec.ts`, `workforce/leave/leave-policy-rules.spec.ts`, `workforce/leave/policy-bundles.spec.ts`

**Interfaces:**
- Produces: `checkPolicyInput(input: LeavePolicyInput): LeavePolicyFields` (throws `InvalidRequestError` with the LP3 to LP5 codes; returns the snake_case fields); `interface LeavePolicyInput` (the camelCase body of section 1 without `leaveType` and `effectiveFrom`); `LEAVE_POLICY_BUNDLES: Readonly<Record<string, readonly BundlePolicy[]>>` with `BundlePolicy = { leave_type: Coding } & LeavePolicyFields`; `findPolicyBundle(name: string): readonly BundlePolicy[] | undefined`.

- [ ] **Step 1: Write failing tests:** `bundles.spec.ts` gains `the id bundle holds the 13 id.leave-type codes of HR spec 9.4.8`; `leave-policy-rules.spec.ts` asserts each LP3 to LP5 rejection by code (for example `days: 0.25` → `invalid_balance`, `per_event` with `maxDaysPerRequest: 5` and `days: 3` → `invalid_max_days`, `twoStepAboveDays` with `two_step` → `invalid_approval`, `retroactiveDays: 31` → `invalid_retroactive`, `carryOver.maxDays: 13` with `days: 12` → `invalid_balance`) and one accepted annual policy; `policy-bundles.spec.ts` asserts `every id bundle policy passes checkPolicyInput`, `tahunan is period, service_year, 12 days, 12 months, one_step, no carry-over, no collective leave`, `sakit is none with retroactive 3 and proof due 3`, `tidak_tersedia allows only id.employment-type|mitra and every other policy excludes mitra` (the other policies list `pkwtt`, `pkwt` and `intern`).
- [ ] **Step 2: Run** the three specs — expected FAIL.
- [ ] **Step 3: Implement** the codes, the rules and the bundle with the values of HR spec 9.4.8 (`melahirkan` 90 calendar days, `keguguran` 45, special leaves per the table).
- [ ] **Step 4: Run** — expected PASS.
- [ ] **Step 5: Commit** `feat(workforce): add leave type codes and policy rules`.

### Task 3: `LeavePolicyService`

**Files:**
- Create: `workforce/leave/leave-policy.service.ts`
- Modify: `workforce/workforce.module.ts`
- Test: `workforce/leave/leave-policy.service.spec.ts`

**Interfaces:**
- Consumes: Task 1, Task 2, `CodeConceptService.assertActive`.
- Produces: `LeavePolicyService.list(tenantId, query: LeavePolicyQuery): Promise<LeavePolicy[]>`, `create(tenantId, input: CreateLeavePolicyInput): Promise<LeavePolicy>`, `update(tenantId, id, input: UpdateLeavePolicyInput): Promise<LeavePolicy>`, `import(tenantId, input: { bundle: string; effectiveFrom: string; reason?: string }): Promise<{ created: number; skipped: number }>`, and `inForce(tenantId: string, leaveType: Coding, date: string): Promise<LeavePolicy | null>` for 8.2 to 8.4.

- [ ] **Step 1: Write the failing spec** with in-memory repositories (pattern of `rostering/coverage.service.spec.ts`): happy create, every LP1, LP2, LP6 and LP8 rejection by code, `policy_exists` on a second version of the same date, `import creates 13 versions then 0 with 13 skipped`, `import refuses concepts_missing before writing anything`, tenant isolation (another tenant's id answers 404 `leave_policy_not_found`), `stale_version`, `reads write no log entry` and `writes log no codes or numbers` (spies on every logger method).
- [ ] **Step 2: Run** — expected FAIL.
- [ ] **Step 3: Implement** the service; the import runs in one `TransactionManager.run`; writes go through `observe` with the LP11 event names.
- [ ] **Step 4: Run** — expected PASS.
- [ ] **Step 5: Commit** `feat(workforce): add the leave policy service`.

### Task 4: Permissions, controller and gateway test

**Files:**
- Modify: `identity/permission.ts`, `gateway_hr/src/gateway.hr.module.ts`
- Create: `gateway_hr/src/leave-policy/{leave-policy.controller.ts, leave-policy.dto.ts, leave-policy-management.module.ts, leave-policy.spec.ts}`

**Interfaces:**
- Consumes: Task 3.
- Produces: `PERMISSIONS.WORKFORCE_LEAVE_POLICY_READ` (`workforce.leave-policy:read`) and `PERMISSIONS.WORKFORCE_LEAVE_POLICY_WRITE` (`workforce.leave-policy:write`).

- [ ] **Step 1: Write the failing gateway test** with `createHrGateway` (pattern of `facility.spec.ts`): 401 without a token, 403 without the permission, the four happy paths, 404 for malformed, missing and foreign ids, 409 `policy_exists`, 400 for a body of the wrong shape, `limit=0` and `limit=101` answer 400, `onDate` keeps one version per type, reads write only the access log, writes log no values.
- [ ] **Step 2: Run** `npx vitest run apps/gateway_hr/src/leave-policy` — expected FAIL.
- [ ] **Step 3: Implement** the DTOs (shape and length only), the controller and the module; import it in `GatewayHrModule`.
- [ ] **Step 4: Run** the full checks of Global Constraints — expected all PASS.
- [ ] **Step 5: Commit** `feat(gateway-hr): add the leave policy endpoints`.

## 7. As built

- Built in one code PR, **#123**, four signed commits (repository, codes and rules, service, endpoints), as planned. `versionsInForce` (`policy-in-force.ts`) was added by the jobs PR #125 and the policy list now uses it.
- **`maxDaysPerRequest` is 0.5 to 366 in half steps** (LP4 said 1 to 366), so a per-event policy of 2.5 days can equal its limit (422 `invalid_max_days` otherwise).
- **A setting that does not belong to the balance kind is refused** with `invalid_balance` (LP3), not dropped: a per-event or balance-free policy with `carryOver`, `period`, `minServiceMonths` or `deductCollectiveLeave`, or a balance-free one with `days`.
- **Notes** are trimmed, a blank value is stored as `null`, and more than 500 characters answer 422 `invalid_notes` (the DTO limit is 500 too).
- `system-rules.ts` needed no change: leave types have no required property (LP9). `toPolicyInput` (in `leave-policy-rules.ts`) turns stored rules back into the request shape so an edit merges and checks as a whole.
- With `onDate` the list reads at most 1000 versions of the tenant and keeps the version in force of each type; `limit` and `offset` then page that result.
- **Bundle values.** The HR spec 9.4.8 table gives the days, counting, approval, after-the-fact days and proof of each Indonesian leave type. The values it does not give are **starter values to verify** with the hospital's legal team: no notice for any type, half days only for annual leave, proof due 30 days after the start for the leaves that need proof (3 days for sick leave, as the table says), `maxDaysPerRequest` 366 for balance-free types and annual leave (the days of the event for per-event types, 2 for menstrual leave), and `tidak_tersedia` unpaid. `melahirkan` (90 days) and `istri_melahirkan` (2 days) are marked to verify against UU 4/2024.
- Not built: `policy_in_use` (422 for editing a version a request used) comes with 8.3 (LR14 there); policy bundles of other countries; retiring a policy (a leave type is retired through its concept).
- Tests as planned, with the checks of Task 4: 401, 403, 404, 409, 422, 400 and list limits, reads write only the access log and writes log no codes, dates, notes or reasons. Not tested: the unique index and the import transaction against a real MongoDB replica set.
