# gateway_hr 8.3: Leave requests and approval Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: **Planned** (2026-11-18). Part of `2026-11-10-gateway-hr-plan.md` (walkthrough order 29), after 8.2. **Released together with 8.4**: without 8.4 an approved leave leaves the person planned to work. Endpoints: `../hr-endpoints.md` 8.3. Collections: `../human-resource-collections.md` 9.3, 9.4. Business rules: HR spec 9.4.3, 9.4.4.1, 9.4.4.2, 9.4.4.4 (balance part), 9.4.4.6 (dates), 9.4.4.7, 9.4.6, `HR-LEV-001` to `HR-LEV-012`, `HR-LEV-040`, `HR-LEV-041`. Built references: shift swaps (5.7: personal routes, decider checks, `decider_is_party`), credential assessments (4.2: highly confidential reads with `recordAccess`), positions (1.5: `findActiveHead`).

**Goal:** an employee requests leave, the right Head decides (and HR Manager for two-step types), and the balance follows every move.

**Architecture:** `leave_requests` and `leave_request_details` repositories. Pure functions in `apps/workforce/leave/` count days and move statuses; `decider.ts` chooses and resolves the deciding Head. Four services: `LeaveRequestService` (preview, create, lists, read, cancel), `LeaveDecisionService` (days, approve, reject), `LeaveDetailService` (details, proof) and `LeaveTypeChangeService`. Approval posts ledger entries through `LeaveBalanceService` (8.2) inside the same `TransactionManager.run`. 8.4 adds the roster effects to the approve, cancel and end-early paths through one port defined here.

**Tech Stack:** NestJS 12, Mongoose, Vitest, oxlint, Node 22.

**Spec:** HR spec 9.4 and `../human-resource-collections.md` 9.

## Global Constraints

- All constraints of `gateway-hr-8-1-leave-policies.md` (Global Constraints) and the half-day arithmetic of `gateway-hr-8-2-leave-balances.md` apply.
- The reason and the proof live only in `leave_request_details`; no list, log, change record in plain form, or other response carries them (`HR-LEV-041`, `HR-SEC-002`). Every read of a detail records one access entry (`recordAccess`) after the read; if recording fails, nothing is returned.
- A request's `rules` snapshot, not the current policy, decides its counting and steps.

## Review Focus

1. A Head who is also the requester's replacement, or a Head who requests leave in their own unit: the decider is the parent unit's head, and the same person never gives both steps (`HR-LEV-010`).
2. The Head appointed after the request was made decides it, and the former Head gets 403 `not_the_decider`.
3. A request over the end of an entitlement period, or larger than the available days counting the employee's other pending requests, is refused; and re-checked at each approval after the Head's day changes.
4. A request that overlaps a `rejected` or `cancelled` request is accepted; one that overlaps a `requested`, `head_approved` or `approved` request is refused, half days included.
5. Two approvals sent at once on the same request: one wins, the other answers 409 `stale_version` and posts no second use.

## 1. The thirteen endpoints

| Endpoint | Permission | Behaviour |
|---|---|---|
| `POST /v1/leave-requests/preview` | sign-in (own), `:write` with `employeeId` | Body as create. Answers `{ days, totalDays, entitlementPeriod, available, deciders }` and the first rule broken, without writing. |
| `POST /v1/employees/me/leave-requests` | sign-in, linked employee | Body: `leaveType`, `start`, `end`, `halfDays` (`{ first, last }`), `reason` (1 to 1000). |
| `POST /v1/leave-requests` | `workforce.leave-request:write` | The same with `employeeId`, on the employee's behalf (HR spec 9.4.4.1). |
| `GET /v1/employees/me/leave-requests` | sign-in | My requests. Query `status`, `from`, `to`, `limit`, `offset`. |
| `GET /v1/leave-requests` | `:read`, or `:decide` / `:approve-hr` with `waitingForMe=true` | Query `unitId`, `employeeId`, `status`, `from`, `to`, `waitingForMe`, `limit`, `offset`; latest first. |
| `GET /v1/leave-requests/:id` | `:read`, or the requester, or a decider | The request (no reason, no proof). |
| `GET /v1/leave-requests/:id/details` | the requester, a decider, or `:read-details` | `{ reason, proof }`; recorded. |
| `PUT /v1/leave-requests/:id/proof` | the requester, or `:write` | Body `proof` (`FileRef`). |
| `PATCH /v1/leave-requests/:id/days` | the first-step decider | Body `days: { date, count }[]`; only `requested`. |
| `POST /v1/leave-requests/:id/approve` | the decider of the current step | First step: `replacementEmployeeId` or `noReplacementReason`. Optional `version`. |
| `POST /v1/leave-requests/:id/reject` | the decider of the current step | `reason` (1 to 500). |
| `POST /v1/leave-requests/:id/cancel` | the requester, or `:write` | Optional `reason`; required (1 to 500) for an `approved` leave. |
| `POST /v1/leave-requests/:id/change-type` | `workforce.leave-request:change-type` | `leaveType`, `reason`; only `approved`. |

Permissions (new): `workforce.leave-request:read`, `:read-details`, `:write`, `:decide` (Heads; the caller's employee must also be the resolved Head), `:approve-hr` (HR Manager: second steps, and first steps whose decider kind is `hr_manager`), `:change-type`.

## 2. Rules and decisions

| # | Rule or decision | Proposed |
|---|---|---|
| LR1 | **Policy and type.** The type's concept must be active (`assertActive`) and a policy in force on `start` (`LeavePolicyService.inForce`, 422 `no_policy`); the employee's current employment type is allowed (422 `employment_type_not_allowed`); status `probation` or `active` (422 `employee_not_assignable`). | As stated. |
| LR2 | **Dates.** `start` ≤ `end`, real dates (422 `invalid_period`); at most `maxDaysPerRequest` calendar days (422 `too_many_days`). With `retroactiveDays` 0: `start` ≥ today + `noticeDays` in the employee's zone (422 `notice_too_short`); otherwise `start` ≥ today − `retroactiveDays` (422 `too_late`). Half days only when the policy allows (422 `half_day_not_allowed`); a one-day request with both halves is one full day (422 `invalid_half_days`). | As stated. |
| LR3 | **Overlap.** 409 `leave_overlaps` against the employee's `requested`, `head_approved` and `approved` requests (`HR-LEV-002`). Read then write. | As stated. |
| LR4 | **Day count** (`countDays`, HR spec 9.4.6). `calendar_days`: every date 1 (`why: 'calendar_day'`, `set_by: 'policy'`). `working_days`: per date, a `draft` or `published` roster of the employee's unit covering the date decides (1 when a planned non-`off` assignment exists, else 0 `rest_day`, `set_by: 'roster'`); otherwise `LEAVE_WORKING_WEEK` of the facility and the facility's holiday calendars (`holiday` for `public` and `local`, `collective_leave` for that kind, both 0). A half first or last day counts 0.5 on a date that counts. | As stated. |
| LR5 | **Entitlement.** `period` policies: the period of `start` (8.2 `entitlementPeriod`); `end` past its end → 422 `crosses_period`; `totalDays` > available → 422 `insufficient_balance`. `per_event`: `totalDays` ≤ `days`. `none`: no balance check. | As stated. |
| LR6 | **Deciders** (`chooseDecider`, at create): open primary assignment's unit U. The caller-independent kind is `unit_head` when U has an active head position with an open holder who is not the requester; `parent_head` when the requester holds U's head position or U has no holder, and U's parent has a holder who is not the requester; else `hr_manager` (also without a primary assignment). `second` is true for `two_step`, or for `one_step` with `twoStepAboveDays` < `totalDays`. At decision time `resolveHead` finds the current holder of the stored unit's head position (403 `not_the_decider` when the caller's employee is not it; when that unit has no holder any more, the request falls to `hr_manager`). | As stated. |
| LR7 | **Approve.** Status `requested` → (first step) `head_approved` when `second`, else `approved`; `head_approved` → `approved` (second step, `:approve-hr`, caller ≠ first-step decider: 403 `same_decider`). Caller's employee = requester → 403 `decider_is_requester` (also for `:approve-hr`). First step needs `replacementEmployeeId` (an employee of the tenant on `probation` or `active`, not the requester: 422 `invalid_replacement`) or `noReplacementReason` (1 to 500), not both (422 `replacement_required`). Balance re-checked without the own reservation (LR5). The final step, in one `run`: status, `decisions`, `use` entries (`planUse`, source `request`), then `LeaveEffects.onApproved` (no-op until 8.4). | As stated. |
| LR8 | **Reject.** From `requested` or `head_approved` by that step's decider; reason 1 to 500 (422 `reason_required`). The reason is stored in `decisions`. | As stated. |
| LR9 | **Days.** `PATCH .../days` only on `requested` by the first-step decider; each date must be inside the period (422 `date_outside_period`), `count` 0, 0.5 (on a half first/last date only) or 1; `set_by: 'head'`. The balance is re-checked (LR5). | As stated. |
| LR10 | **Cancel.** `requested`, `head_approved` by the requester or `:write`. `approved` with `start` after today: reason required; `reversal` entries for every `use` of the request, then `LeaveEffects.onCancelled`. `approved` that has started: 422 `leave_started` (8.4 adds end-early). Other statuses 422 `invalid_transition`. | As stated. |
| LR11 | **Proof.** `PUT .../proof` on `requested`, `head_approved` or `approved`; sets `proof_received`. `proof_due_on` = `start` + `dueDays` at create. Overdue is `proof_due_on` < today and not received; the list filter `proofOverdue=true` needs `:read`. | As stated. |
| LR12 | **Change type.** Only `approved`; the new type has a policy in force on `start` that allows the employee (LR1); `rules` are replaced by the new policy's; `reversal` of the old uses then `use` of the new in one `run`, 422 `insufficient_balance` writes nothing. The day breakdown is kept unless the new policy counts `calendar_days`, then recounted. The roster is not touched. | As stated. |
| LR13 | **Pending in balances.** `LeaveBalanceService.summary` (8.2) now subtracts the `totalDays` of `requested` and `head_approved` requests of the type and period, except the request being decided. | As stated. |
| LR14 | **Policy in use.** `PATCH /v1/leave-policies/:id` answers 422 `policy_in_use` when a request has that `policy_id` (8.1 LP6). | As stated. |
| LR15 | **Logs and history.** `leave_request_create`, `leave_request_approve`, `leave_request_reject`, `leave_request_cancel`, `leave_days_adjust`, `leave_proof_attach`, `leave_type_change`, with the step and error class and `code`, never a type, date, count or reason. Reads write no operational log. The change history classifies `leave_type`, `days` and `total_days` as confidential; `reason`, `proof` and decision reasons as highly confidential. No events. | As stated. |
| LR16 | **Parameters.** `LEAVE_WORKING_WEEK`: list of ISO weekdays 1 to 7, 1 to 7 items, no repeats, facility scope, default `[1, 2, 3, 4, 5]`. | As stated. |
| LR17 | **Not built in group 8.** The alerts of HR spec 9.4.9 and `LEAVE_DECISION_SLA_DAYS` (no notification service yet), the "Leave taken" report (HR spec 12), proration (open question Q13), and the effect of separation or suspension on pending and future leave (HR spec 9.4.10). | As stated. |

## 3. Repositories

- `LeaveRequestRepository` (`leave_requests`, `REPOSITORY_LEAVE_REQUEST`): `findByFilter(tenantId, query)`, `findOverlapping(tenantId, employeeId, start, end, statuses)`, `findPendingByEmployeeTypeAndPeriod(tenantId, employeeId, leaveTypeCode, periodStart)`, `findWaitingForHead(tenantId, unitIds, limit, offset)`, `findAnyByPolicy(tenantId, policyId): Promise<boolean>`, and for 8.4 `findApprovedCovering(tenantId, employeeId, date)`. Indexes of collections 9.3. Updatable: `status`, `status_since`, `days`, `total_days`, `period`, `leave_type`, `policy_id`, `rules`, `replacement`, `decisions`, `deciders`, `proof_received`, `cover`.
- `LeaveRequestDetailRepository` (`leave_request_details`, `REPOSITORY_LEAVE_REQUEST_DETAIL`): `findByRequest(tenantId, requestId)`; updatable `proof`.

## 4. Code structure

```
apps/back-end/apps/
├── repository/model/{leave-request.ts, leave-request-detail.ts} (+ .classification.ts)
├── repository/{token.ts, interface/, mongo/}                                  two repositories
├── workforce/leave/{day-count.ts, decider.ts, leave-request-rules.ts, leave-effects.ts} (+ specs)
├── workforce/leave/{leave-request.service.ts, leave-decision.service.ts, leave-detail.service.ts, leave-type-change.service.ts} (+ specs)
├── workforce/leave/{leave-balance.service.ts, leave-policy.service.ts}         pending (LR13), in use (LR14)
├── workforce/parameter/catalog.ts                                              LEAVE_WORKING_WEEK
├── identity/permission.ts                                                      six permissions
└── gateway_hr/src/leave-request/                                               controllers, DTOs, module, gateway tests
```

## 5. Pull requests

| PR | Kind | Content |
|---|---|---|
| B1 | Code | Tasks 1 to 3: repositories, day count, deciders, create, preview, lists, read, details, proof (branch `feat/workforce-leave-requests`). |
| B2 | Code | Tasks 4 and 5: decisions, cancel, change type, pending in balances, policy in use (branch `feat/workforce-leave-decisions`). |
| C | Docs | After 8.4 merged, one "built" docs PR for 8.3 and 8.4. |

## 6. Tasks

### Task 1: Repositories

**Files:** models, classifications, interfaces, schemas, Mongo implementations and modules of section 3; `repository/token.ts`; fakes in `workforce/testing/in-memory.ts` and registration in `gateway_hr/src/testing/in-memory-workforce.ts`. Tests: `repository/mongo/leave-request.spec.ts`, `leave-request-detail.spec.ts`.

**Interfaces:**
- Produces: `class LeaveRequest`, `class LeaveRequestDetail` (fields of collections 9.3 and 9.4), `type LeaveRequestStatus`, `type LeaveDay = { date: LocalDate; count: 0 | 0.5 | 1; why: LeaveDayReason; set_by: LeaveDaySource }`, the methods of section 3.

- [ ] **Step 1: Write failing specs:** pinned collections, indexes of collections 9.3 and 9.4, `findOverlapping` with each status, unique `request_id` in details, change records of types `leave_request` and `leave_request_detail` with the reason and proof masked as highly confidential, no `_id`.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** with `classification.spec.ts` — PASS.
- [ ] **Step 5: Commit** `feat(repository): add leave request repositories`.

### Task 2: Day count, deciders and request rules

**Files:** create `workforce/leave/day-count.ts`, `decider.ts`, `leave-request-rules.ts`, `leave-effects.ts`; specs for the first three; `workforce/parameter/catalog.ts`.

**Interfaces:**
- Produces: `countDays(input: { counting: 'working_days' | 'calendar_days'; start: string; end: string; halfDays: { first: boolean; last: boolean }; rosterDays: Map<string, boolean>; workingWeek: number[]; holidays: Map<string, 'public' | 'local' | 'collective_leave'> }): LeaveDay[]` (`rosterDays` holds only the dates covered by a draft or published roster, true when a working shift is planned); `chooseDecider(...)` and `resolveHead(...)` with the LR6 behaviour; `assertTransition(from: LeaveRequestStatus, to: LeaveRequestStatus): void` (422 `invalid_transition`); `interface LeaveEffects { onApproved(request: LeaveRequest): Promise<void>; onCancelled(request: LeaveRequest): Promise<void>; onShortened(request: LeaveRequest, previousEnd: string): Promise<void> }` with token `LEAVE_EFFECTS` and the no-op `NoLeaveEffects` bound in `WorkforceModule`.

- [ ] **Step 1: Write failing tests:** a ward week with roster days Mon to Sat working and Sunday off → 6; office staff without a roster over a week holding one public holiday and one collective leave day → 3; half first day on a working date → 0.5, on a rest day → 0; `calendar_days` over 90 days → 90; each LR6 case (own unit head; requester is the head → parent; no parent holder → `hr_manager`; no primary assignment → `hr_manager`); `two_step_above_days` 5 with 6 days → `second: true`; every allowed and refused transition of HR spec 9.4.3.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(workforce): count leave days and choose deciders`.

### Task 3: Create, preview, read, details and proof

**Files:** create `workforce/leave/leave-request.service.ts`, `leave-detail.service.ts` (+ specs); modify `workforce/workforce.module.ts`, `identity/permission.ts`; create `gateway_hr/src/leave-request/` (controller for requests and `me` routes, DTOs, module, `leave-request.spec.ts`); modify `gateway.hr.module.ts`.

**Interfaces:**
- Consumes: Tasks 1, 2; `LeavePolicyService.inForce`, `LeaveBalanceService.summary`, `LeavePlaceService.of`, `ParameterService.resolve`.
- Produces: `LeaveRequestService.preview`, `create`, `list`, `listOwn`, `get`; `LeaveDetailService.read(tenantId, id, caller)`, `attachProof(tenantId, id, proof, caller)`; `type LeaveCaller = { accountId: string; employeeId: string | null; permissions: ReadonlySet<string> }`.

- [ ] **Step 1: Write failing service specs:** every LR1 to LR5 rejection by code; create writes the request and its detail in one `run`; preview writes nothing; `waitingForMe` lists only requests whose resolved decider is the caller; `get` hides the reason; `details` records one access entry and returns nothing when recording fails; tenant isolation (404 `leave_request_not_found`); reads write no log; writes log no values.
- [ ] **Step 2: Write the failing gateway test:** 401, 403 per route, `me` without a linked employee → 403 `employee_required`, happy paths, 404 for malformed, missing and foreign ids, 400 shapes, list limits, reads write only the access log.
- [ ] **Step 3: Run** — FAIL. **Step 4: Implement.** **Step 5: Run** the full checks — PASS.
- [ ] **Step 6: Commit** `feat(gateway-hr): request leave and read leave requests`.

### Task 4: Decisions and cancel

**Files:** create `workforce/leave/leave-decision.service.ts` (+ spec); modify `leave-request.service.ts` (cancel), `leave-balance.service.ts` (LR13), `leave-policy.service.ts` (LR14), the controller, DTOs and gateway test.

**Interfaces:**
- Consumes: `LEAVE_EFFECTS`, `planUse` (8.2), `LeaveLedgerRepository.append`.
- Produces: `LeaveDecisionService.adjustDays(tenantId, id, input, caller)`, `approve(tenantId, id, input: { replacementEmployeeId?: string; noReplacementReason?: string; version?: number }, caller)`, `reject(tenantId, id, input: { reason: string; version?: number }, caller)`; `LeaveRequestService.cancel(tenantId, id, input, caller)`.

- [ ] **Step 1: Write failing specs:** one-step approval posts uses split by bucket and calls `onApproved` once; two-step goes through `head_approved` then `approved` and posts uses only at the end; `same_decider`, `decider_is_requester`, `not_the_decider` (former Head), `replacement_required`, `invalid_replacement`, re-check `insufficient_balance` after `adjustDays`; reject from each step; cancel of each status, with reversals and `onCancelled` for an approved one, 422 `leave_started` once started; available days drop while a request is pending and come back when it is rejected; `policy_in_use`; stale version 409 with no second use posted.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(workforce): decide and cancel leave requests`.

### Task 5: Change type

**Files:** create `workforce/leave/leave-type-change.service.ts` (+ spec); controller, DTO, gateway test.

- [ ] **Step 1: Write the failing spec:** sick to annual posts a reversal of nothing (`none` type) and a use of the annual days; annual to unpaid reverses the annual uses; `insufficient_balance` writes nothing; only `approved`; a `calendar_days` target recounts; `leave_type_change` logs no type.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** the full checks — PASS.
- [ ] **Step 5: Commit** `feat(workforce): change the type of an approved leave`.
