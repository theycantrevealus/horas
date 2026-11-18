# gateway_hr 8.2: Leave balances Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: **Planned** (2026-11-18). Part of `2026-11-10-gateway-hr-plan.md` (walkthrough order 28), after 8.1. Endpoints: `../hr-endpoints.md` 8.2. Collection: `../human-resource-collections.md` 9.5, 9.7, 9.8 (`leave_ledger_entries`, the jobs, the parameters). Business rules: HR spec 9.4.2 (Leave Balance), 9.4.5 (entitlements), `HR-LEV-030` to `HR-LEV-032`. Built references: the HR jobs (`gateway-hr-7-worker-expiry-jobs.md`: `HrJob`, lease, system actors, named reads for jobs only), employment contracts (2.3), position assignments (2.4), holiday calendars (5.2).

**Goal:** every employee has a traceable leave balance per type, granted, carried over and expired by the worker, and HR Manager can correct it.

**Architecture:** An append-only `leave_ledger_entries` repository. Pure functions in `apps/workforce/leave/` compute the service start, the entitlement period and the balance from entries. `LeaveBalanceService` answers balances and posts adjustments. Three new `HrJob`s in `apps/workforce/jobs/` post grants, carry-over and expiry, and collective leave, idempotent through `dedupe_key`.

**Tech Stack:** NestJS 12, Mongoose, Vitest, oxlint, Node 22.

**Spec:** HR spec 9.4 and `../human-resource-collections.md` 9.

## Global Constraints

- All constraints of `gateway-hr-8-1-leave-policies.md` (Global Constraints) apply.
- Ledger entries are never updated or deleted (`HR-LEV-030`): the repository's `update`, `delete` and `deleteSoft` reject with `RepositoryError`.
- Days are multiples of 0.5; compare and sum them in half-day integers (`days * 2`) to avoid floating-point drift.
- Jobs follow `workforce.md` 3r: one record per transaction, a fresh request context with a system actor (`leave-grant-job`, `leave-period-job`, `collective-leave-job`), the change reason (`leave_granted`, `leave_carried_over`, `leave_expired`, `collective_leave`), a failing record counted and skipped, cross-tenant reads only through named reads documented "for jobs only".

## Review Focus

1. A second run of any job on the same day must post nothing (the `dedupe_key` unique index, and the in-memory fake must refuse duplicates the same way).
2. A PKWT renewed the day after the previous contract ended continues the service; a contract starting two days later starts a new one (`serviceStart`).
3. A service anniversary on 29 February: the period starts on 28 February in years without it.
4. Carried-over days are used before the period's own days, and an `expiry` never takes more than what is left of its bucket (never below zero).
5. An employee who separated, or whose employment type the policy no longer allows, gets no new grant, and keeps the entries already posted.

## 1. The four endpoints

| Endpoint | Behaviour |
|---|---|
| `GET /v1/employees/:id/leave-balances` | Per leave type with a `period` policy in force today: `{ leaveType, period, granted, used, carriedOver, carriedOverExpiresOn, expired, adjusted, pending, available }`. `pending` is 0 until 8.3. Query `onDate` (default today in the employee's facility zone, UTC without one). Writes no log entry. |
| `GET /v1/employees/:id/leave-ledger` | The entries of one type and period. Query: `leaveTypeSystem`, `leaveTypeCode`, `periodStart`, `limit`, `offset`; ordered by `created_at`. |
| `POST /v1/employees/:id/leave-adjustments` | Body: `leaveType`, `periodStart`, `days` (signed, multiple of 0.5, not 0, at most 366 in size), `reason` (1 to 500, required). Posts an `adjustment` entry. |
| `GET /v1/employees/me/leave-balances` | The same for the signed-in employee. No permission; 403 `employee_required` without a linked employee. |

Permissions (new): `workforce.leave-balance:read` (balances and ledger of anyone), `workforce.leave-balance:adjust` (adjustments).

## 2. Rules and decisions

| # | Rule or decision | Proposed |
|---|---|---|
| LB1 | **Service start.** `serviceStart(contracts, today)`: among the employee's contracts that are `active` or `ended` (not `draft`, not `terminated` after the latest), walk back from the contract in force today while the previous contract's last day is the day before the next one's start; the earliest start of that run is the service start. No contract in force today: `null` (no grant). | As stated. |
| LB2 | **Entitlement period.** `entitlementPeriod(rule, serviceStart, date)`: `calendar_year` gives 1 January to 31 December of the date's year; `service_year` gives the anniversary of the service start on or before the date to the day before the next anniversary (29 February falls back to 28 February). | As stated. |
| LB3 | **Grant.** For a `period` policy in force on the period start, an employee whose service has lasted `minServiceMonths` on the period start (for the first period: the grant period is the one that starts on the day service reaches `minServiceMonths`) and whose current employment type the policy allows gets one `grant` of `days`, posted from `LEAVE_GRANT_LEAD_DAYS` before the period start. `dedupe_key` `<employee>:<type code>:grant:<period start>`. | As stated. |
| LB4 | **Period end.** On the day after a period ends, the job posts `carry_over` (bucket `carry_over`, `expires_on` = next period start + `expiresAfterMonths` months − 1 day) for `min(left over own days, maxDays)` in the next period, and `expiry` for the rest of the own days. On the day after `expires_on`, it posts `expiry` for what is left of that carry-over. Keys `carry_over:<period start>`, `expiry:<period end>`, `expiry_carry:<expires_on>`. The job looks back 7 days, so a missed day is caught. | As stated. |
| LB5 | **Collective leave.** The day after each `collective_leave` day of a facility's holiday calendars (active entries only), for every employee whose open primary assignment is in a unit of that facility, whose `period` policy in force that day has `deductCollectiveLeave`, and who had no `planned` assignment of a shift that is not `off` on that date: one `use` of 1 day, source `collective_leave` with the date, key `collective:<date>`. Looks back 7 days. | As stated. |
| LB6 | **Using buckets.** `use`, `reversal` and `expiry` name their bucket; `summarizeBalance` takes `use` from `carry_over` first while it lasts. 8.3 posts uses through `planUse(summary, days)`, which splits a use across buckets. | As stated. |
| LB7 | **Adjustment.** The period must be one the employee has a `grant` for (422 `period_not_found`); the policy may be any version of the type. A negative adjustment may take the balance below zero (`HR-LEV-032`). The reason goes in the change history (`withChangeReason`), not the entry. | As stated. |
| LB8 | **Separation and suspension.** No grant for a `separated` employee or one without a contract in force. A suspended employee keeps receiving grants (approved leave and suspension are separate). | As stated. |
| LB9 | **Parameters.** `LEAVE_GRANT_LEAD_DAYS` (integer 0 to 180, default 60, tenant scope) joins the catalog. `LEAVE_WORKING_WEEK` and `LEAVE_DECISION_SLA_DAYS` come with 8.3 and the notifications. | As stated. |
| LB10 | **Reads and logs.** Reads write no log. Adjustments log `leave_adjust` with no value. Jobs log through the runner (`logging.md` 15). No events: nothing consumes them yet. | As stated. |
| LB11 | **Employee place.** `LeavePlaceService.of(tenantId, employeeId)` returns `{ unit, facility }` from the open primary assignment (unit and its facility), each `null` without one. Today for an employee is `todayInZone(facility.time_zone)`, or `todayUtc()` without a facility. 8.3 and 8.4 reuse it. | As stated. |

## 3. Repository

`LeaveLedgerRepository` (`leave_ledger_entries`, token `REPOSITORY_LEAVE_LEDGER`): `append(entry: NewEntity<LeaveLedgerEntry>): Promise<LeaveLedgerEntry>` (the only write; a duplicate `dedupe_key` rejects with `RepositoryConflictError`), `findByEmployee(tenantId, employeeId, query)`, `findByEmployeeTypeAndPeriod(tenantId, employeeId, leaveTypeCode, periodStart)`, and for jobs only `findGrantsEndedBetween(from, to, afterId, limit)` and `findCarryOversExpiringBetween(from, to, afterId, limit)`. Indexes of collections 9.5, plus `{ kind, 'period.end' }` and `{ kind, expires_on }` for the job reads (they do not start with `tenant_id`, `database.md` 7.2).

New named reads elsewhere, for jobs only: `EmploymentContractRepository.findInForceForJobs(date, afterId, limit)` (contracts `active` on the date, every tenant, ordered by id) and `HolidayCalendarRepository.findWithKindOnDate(kind, date)` (index `{ 'holidays.date', 'holidays.kind' }`).

## 4. Code structure

```
apps/back-end/apps/
├── repository/model/{leave-ledger-entry.ts, leave-ledger-entry.classification.ts}   confidential
├── repository/{token.ts, interface/leave-ledger.ts}, mongo/{leave-ledger.ts, leave-ledger.module.ts, schema/leave-ledger.ts}
├── repository/{interface,mongo}/{employment-contract.ts, holiday-calendar.ts}          job reads
├── workforce/leave/{service-start.ts, entitlement-period.ts, balance.ts, leave-place.ts, leave-balance.service.ts} (+ specs)
├── workforce/jobs/{leave-grant.job.ts, leave-period.job.ts, collective-leave.job.ts} (+ specs), workforce-jobs.module.ts
├── workforce/parameter/catalog.ts                                                       LEAVE_GRANT_LEAD_DAYS
├── identity/permission.ts                                                               workforce.leave-balance:read, :adjust
└── gateway_hr/src/leave-balance/                                                        controller, DTOs, module, gateway test
```

## 5. Pull requests

| PR | Kind | Content |
|---|---|---|
| B1 | Code | Tasks 1 to 4: ledger, pure functions, service, endpoints (branch `feat/workforce-leave-balances`). |
| B2 | Code | Task 5: the three jobs (branch `feat/worker-leave-jobs`). |
| C | Docs | "Build in progress", then "built" (`workforce.md` 3s, 3r, permissions, `logging.md` 15, this plan). |

## 6. Tasks

### Task 1: Ledger model and repository

**Files:**
- Create: `repository/model/leave-ledger-entry.ts`, `.classification.ts`, `repository/interface/leave-ledger.ts`, `repository/mongo/schema/leave-ledger.ts`, `repository/mongo/leave-ledger.ts`, `.module.ts`
- Modify: `repository/token.ts`, `workforce/testing/in-memory.ts`, `gateway_hr/src/testing/in-memory-workforce.ts`
- Test: `repository/mongo/leave-ledger.spec.ts`

**Interfaces:**
- Produces: `class LeaveLedgerEntry` (fields of collections 9.5; `kind: LeaveLedgerKind`, `bucket: 'own' | 'carry_over'`); `REPOSITORY_LEAVE_LEDGER`; the methods of section 3; `InMemoryLeaveLedgerRepository`.

- [ ] **Step 1: Write the failing spec:** `pins leave_ledger_entries`, `append records one change record of type leave_ledger_entry`, `append with a used dedupe_key rejects with RepositoryConflictError`, `update, delete and deleteSoft reject with RepositoryError`, `findGrantsEndedBetween reads every tenant and only grants`, `maps without _id`.
- [ ] **Step 2: Run** `npx vitest run apps/repository/mongo/leave-ledger.spec.ts` — FAIL.
- [ ] **Step 3: Implement**, classification `confidential` for `days`, `kind`, `leave_type`, `period`, `source`; `internal` for the ids.
- [ ] **Step 4: Run** the spec and `classification.spec.ts` — PASS.
- [ ] **Step 5: Commit** `feat(repository): add the append-only leave ledger`.

### Task 2: Service start, entitlement period and balance

**Files:**
- Create: `workforce/leave/service-start.ts`, `entitlement-period.ts`, `balance.ts`
- Test: the three matching `.spec.ts`

**Interfaces:**
- Produces: `serviceStart(contracts: EmploymentContract[], today: string): string | null`; `entitlementPeriod(rule: Extract<LeaveBalanceRule, { kind: 'period' }>, serviceStart: string, date: string): { start: string; end: string }`; `summarizeBalance(entries: LeaveLedgerEntry[], pendingDays: number): LeaveBalanceSummary` (`granted`, `used`, `carriedOver`, `carriedOverExpiresOn`, `expired`, `adjusted`, `pending`, `available`, and `carryOverLeft`, `ownLeft`); `planUse(summary: LeaveBalanceSummary, days: number): { bucket: 'own' | 'carry_over'; days: number }[]`.

- [ ] **Step 1: Write failing tests** with the Review Focus cases: renewal next day continues, two-day gap restarts, no contract in force → `null`; `calendar_year` for `2026-07-10` → `2026-01-01`..`2026-12-31`; `service_year` from `2024-02-29` on `2027-03-01` → `2027-02-28`..`2028-02-28`; a summary with grant 12, carry-over 3 and use 4 → `carryOverLeft` 0, `ownLeft` 11, `available` 11 − pending; `planUse` of 4 with 3 carried over → `[{carry_over,3},{own,1}]`; sums of 0.5 steps stay exact (`0.5 × 25`).
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(workforce): compute leave service, periods and balances`.

### Task 3: `LeavePlaceService` and `LeaveBalanceService`

**Files:**
- Create: `workforce/leave/leave-place.ts`, `workforce/leave/leave-balance.service.ts`
- Modify: `workforce/workforce.module.ts`, `workforce/parameter/catalog.ts`
- Test: `workforce/leave/leave-balance.service.spec.ts`

**Interfaces:**
- Consumes: Task 1, Task 2, `LeavePolicyService.inForce` (8.1).
- Produces: `LeavePlaceService.of(tenantId: string, employeeId: string): Promise<{ unit: OrganizationUnit | null; facility: Facility | null }>`; `LeaveBalanceService.balances(tenantId, employeeId, onDate?: string): Promise<LeaveBalanceView[]>`, `ledger(tenantId, employeeId, query)`, `adjust(tenantId, employeeId, input: { leaveType: Coding; periodStart: string; days: number; reason: string }): Promise<LeaveLedgerEntry>`, and `summary(tenantId, employeeId, leaveType: Coding, periodStart: string): Promise<LeaveBalanceSummary>` for 8.3. `pendingDays` is 0 here; 8.3 replaces it.

- [ ] **Step 1: Write the failing spec:** balances of an employee with a grant and a carry-over; `onDate` picks the period; adjustment happy path and `period_not_found`, `invalid_days` (0, 0.3, 367), `reason_required`; 404 `employee_not_found` for another tenant's employee; reads write no log; `leave_adjust` logs no days or reason; the change record of the adjustment carries the reason.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(workforce): add leave balances and adjustments`.

### Task 4: Endpoints

**Files:**
- Modify: `identity/permission.ts`, `gateway_hr/src/gateway.hr.module.ts`
- Create: `gateway_hr/src/leave-balance/{leave-balance.controller.ts, leave-balance.dto.ts, leave-balance-management.module.ts, leave-balance.spec.ts}`

- [ ] **Step 1: Write the failing gateway test:** 401, 403 per permission, the four happy paths, `me` with no linked employee → 403 `employee_required`, malformed and foreign employee ids → 404, `days: 0.3` → 400, `limit` bounds, reads write only the access log.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** the full checks — PASS.
- [ ] **Step 5: Commit** `feat(gateway-hr): add the leave balance endpoints`.

### Task 5: The three jobs

**Files:**
- Create: `workforce/jobs/leave-grant.job.ts`, `leave-period.job.ts`, `collective-leave.job.ts` (+ specs)
- Modify: `workforce/jobs/workforce-jobs.module.ts` (add them to `HR_JOBS` after the eligibility sweep, in this order), `repository/interface/employment-contract.ts`, `repository/mongo/employment-contract.ts`, `repository/interface/holiday-calendar.ts`, `repository/mongo/holiday-calendar.ts` and their schemas (indexes) and fakes

**Interfaces:**
- Consumes: Tasks 1 to 3, `HrJob` (`workforce/jobs/job.ts`), `runWithRequestContext`, `systemActor`, `withChangeReason`.
- Produces: `LeaveGrantJob` (`name: 'leave-grant'`), `LeavePeriodJob` (`'leave-period'`), `CollectiveLeaveJob` (`'collective-leave'`), each `run(now, batchSize): Promise<JobPassResult>`.

- [ ] **Step 1: Write failing specs** (pattern of `license-expiry.job.spec.ts`): grant posted `LEAVE_GRANT_LEAD_DAYS` before the period and not earlier; second pass changes nothing (`count: 0`); no grant before 12 months of service, for a `mitra` on `tahunan`, for a separated employee; period end posts `carry_over` and `expiry` once; carry-over expiry takes only what is left; collective leave posts a use for an employee with no shift or only an `off` shift that date, and none for one with a working shift; `more` is true when `batchSize` changes were made; a failing record is counted in `failed` and the next record is still handled; each change runs with its system actor and reason.
- [ ] **Step 2: Run** `npx vitest run apps/workforce/jobs` — FAIL.
- [ ] **Step 3: Implement** the jobs and the named reads.
- [ ] **Step 4: Run** the full checks plus `npx nest build worker` — PASS.
- [ ] **Step 5: Commit** `feat(worker): grant, carry over and expire leave entitlements`.
