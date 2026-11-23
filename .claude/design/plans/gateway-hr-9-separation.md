# gateway_hr 9: Separation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: **Planned** (2026-11-23). Part of `2026-11-10-gateway-hr-plan.md` (walkthrough order 31). Endpoints: `../hr-endpoints.md` 9. Collections: `../human-resource-collections.md` 10. Business rules: HR spec 9.10, `HR-SEP-001` to `HR-SEP-008`. Built references: leave cover and effects (8.4: `RosterLeaveEffects`, cancelling assignments with a revision raise), leave decisions (8.3: cancel and end early with reversals), SPK status decisions (4.3: revoke with supervisor flags), employee status change (2.1), contracts (2.3), the worker HR jobs (7: `HrJobsRunner`, `JobLease`, named reads "for jobs only").

**Goal:** HR records that someone is leaving, nobody plans them after their last day, and the day after it everything that names them is closed in one transaction.

**Architecture:** `separations` and `separation_details` repositories. `SeparationService` records, changes, cancels and lists; `SeparationImpactService` answers what completion would close; `SeparationCompletionService` closes everything for one separation inside one `TransactionManager.run`, called by the worker job `SeparationJob` (the day after the last working day) and by the immediate-completion route. `SeparationCalendar.isLeavingBefore(tenantId, employeeId, date)` is the planning guard the roster, import, swap, practice, leave, contract and credentialing paths call, like `LeaveCalendar` (8.4).

**Tech Stack:** NestJS 12, Mongoose, Vitest, oxlint, Node 22.

**Spec:** HR spec 9.10 and `../human-resource-collections.md` 10.

## Global Constraints

- All constraints of `workforce.md` section 3 (tenant, reads write no log, writes through `observe`, change history by the repository, `version`, 404 for foreign ids).
- The reason lives only in `separation_details`; lists, logs and notifications carry the type only (`HR-SEP-008`). Each detail read records one access entry.
- Completion is one transaction per separation: everything in HR spec 9.10.4.3 or nothing (`HR-SEP-004`). Repository calls only inside `run`, sequentially.
- Completion of a planned separation runs after the last working day has ended in the facility's zone (`HR-SEP-005`); the job reads today in that zone, UTC when it cannot be read.
- No country-specific code: separation types and checklist items are tenant code concepts (`id.separation-type`, `id.exit-checklist-item`), with an Indonesian starter bundle.

## Review Focus

1. A separation planned with a last working day inside an approved leave: completion ends the leave on the last working day and gives back only the days after it.
2. Moving the last working day earlier while planned: shifts already planned between the new and the old date are not cancelled until completion, and the guard now refuses new ones after the new date.
3. An employee with a suspended SPK and supervised grants of others that name their full grants: completion revokes the SPK and flags the supervised grants (`supervisor_lost_privilege`).
4. The job running twice, or completion failing halfway: a second pass changes nothing; a failure leaves the separation `planned` and the employee untouched, and the next pass retries.
5. An immediate separation of an employee who is working a shift today: today's shift stays (it is not after the last working day), the account is disabled at once.

## 1. The nine endpoints

| Endpoint | Permission | Behaviour |
|---|---|---|
| `POST /v1/employees/:id/separations` | `workforce.separation:write` | Body `type` (`Coding`), `lastWorkingDay`, `noticeReceivedOn?`, `immediate?`, `reason` (1 to 1000). An immediate separation also needs `workforce.separation:complete` and completes in the same request. |
| `GET /v1/separations` | `workforce.separation:read` | Filters `status`, `typeCode`, `unitId`, `facilityId`, `from`, `to` (last working day), paging, by last working day. |
| `GET /v1/separations/:id` | `:read` | No reason. |
| `GET /v1/separations/:id/details` | `workforce.separation:read-details` | `{ reason }`, recorded. |
| `GET /v1/separations/:id/impact` | `:read` | `{ assignments, sessions, leaveRequests, appointments, grants, memberships, positionAssignments, contract }`: identifiers and counts of what completion would close. |
| `PATCH /v1/separations/:id` | `:write` | `lastWorkingDay`, `type`, `noticeReceivedOn`, `reason`; only `planned`; optional `version`. |
| `POST /v1/separations/:id/cancel` | `:write` | `reason`; only `planned`. |
| `POST /v1/separations/:id/complete` | `workforce.separation:complete` | Completes an `immediate` separation that is still `planned` (after a retry). |
| `PUT /v1/separations/:id/checklist/:system/:code` | `:write` | Body `done: boolean`. |

## 2. Rules and decisions

| # | Rule or decision | Proposed |
|---|---|---|
| SP1 | **Recording.** The employee is of the tenant and not `separated` (404 `employee_not_found`, 422 `employee_separated`); no other separation that is not cancelled (409 `separation_exists`, partial unique index); the type is an active `…separation-type` concept with the property `contract_action` `end` or `terminate` (422 `invalid_separation_type`); `lastWorkingDay` is a real date today or later in the facility's zone (422 `invalid_last_working_day`), or any real date from the start of the contract in force when `immediate`; `noticeReceivedOn` not after `lastWorkingDay` (422 `invalid_notice_date`). The facility is that of the open primary assignment, else the contract's organization's first facility, else UTC. The checklist gets one item per active `…exit-checklist-item` concept (none is allowed). | As stated. |
| SP2 | **Guard.** `SeparationCalendar.isLeavingBefore(tenantId, employeeId, date)` is true when a `planned` or `completed` separation has `last_working_day` before `date`. It refuses with 422 `employee_leaving`: adding a roster assignment, an import row (row error), either person of a swap, a new practice schedule or one whose validity runs past the day (its end is capped instead: refused only if it starts after it), a moved session, a leave request that ends after the day, activating a contract that ends after it, and a credential application. | As stated. |
| SP3 | **Change and cancel.** Only `planned` (422 `separation_not_planned`); `lastWorkingDay` as SP1; the type change rechecks the concept and copies `contract_action`; cancel needs a reason (1 to 500). `immediate` cannot be changed. | As stated. |
| SP4 | **Completion** (`SeparationCompletionService.complete(tenantId, separationId)`), in one `run`, in this order: (a) planned assignments dated after the last working day cancelled through a new named write `cancelForSeparation` (cancellation `{ kind: 'separation', ref_id }`, reason `separation`), rosters handled as `RosterLeaveEffects` does (published: revision + 1; submitted, approved: validation null; closed: untouched); (b) practice schedules whose validity runs past the day get `period.end` = the day and `status` `ended`, and exceptions moving a session onto a later date are soft-deleted; (c) leave: `requested` and `head_approved` requests cancelled, `approved` ones starting after the day cancelled with reversals, those running past it ended on it with reversals (reuse `postUses`/`reverseUses` and the end-early cut), no `LeaveEffects` call; (d) current SPKs revoked effective the next day with the system decision `separation` and their grants revoked, supervisor flags raised (reuse `StatusService`'s revoke internals through a shared function); open credential applications withdrawn; (e) open committee memberships and position assignments ended on the day; (f) the contract in force ended or terminated on the day by `contract_action`; (g) the employee set to `separated` with `separation_date` = the day, writing `workforce.employee.status_changed` to the event outbox; (h) the settlement from `LeaveBalanceService.summary` per yearly leave type in force; (i) the separation `completed` with the counts. Actor `separation-job` for the job, the HR Manager for the route; change reason `separation`. | As stated. |
| SP5 | **Job** (`SeparationJob`, the seventh HR job, after collective leave). Reads `planned` separations with `last_working_day` before today in UTC (`findPlannedEndedBefore(date, afterId, limit)`, for jobs only, index `{ status, last_working_day }`), rechecks each in its facility's zone, and completes each in its own request context and transaction. A failure is counted and retried on the next pass. | As stated. |
| SP6 | **Logs.** `separation_create`, `separation_update`, `separation_cancel`, `separation_complete` (counts of each closed kind), `separation_checklist`; the job writes the `hr_job` summary (`logging.md` 15). Never a reason, a type, a date or an employee. | As stated. |
| SP7 | **Permissions.** `workforce.separation:read`, `:read-details`, `:write`, `:complete`. | As stated. |
| SP8 | **Codes bundle.** `concept/bundles.ts` gains `id.separation-type` (5 codes with `contract_action`) and `id.exit-checklist-item` (badge, uniform, keys, patient handover, IT equipment); `system-rules.ts` requires the property `contract_action` for `…separation-type`. | As stated. |
| SP9 | **Not built in this group.** The alerts of HR spec 9.10.6 (no notification service), rehire, self-service resignation, the exit interview, pay and severance, retention (Q11). | As stated. |

## 3. Repositories

- `SeparationRepository` (`separations`, `REPOSITORY_SEPARATION`): `findByFilter(tenantId, query)`, `findOpenByEmployee(tenantId, employeeId)` (not cancelled), `findPlannedEndedBefore(date, afterId, limit)` (jobs only). Updatable: `type`, `contract_action`, `last_working_day`, `notice_received_on`, `status`, `status_since`, `completion`, `checklist`, `settlement`.
- `SeparationDetailRepository` (`separation_details`, `REPOSITORY_SEPARATION_DETAIL`): `findBySeparation(tenantId, separationId)`; updatable `reason`.
- `RosterAssignmentRepository.cancelForSeparation(tenantId, items: { id: string; revision: number }[], separationId: string)` and `findPlannedByEmployeeAfter(tenantId, employeeId, date)`.
- `PracticeScheduleRepository.findByEmployeeRunningAfter(tenantId, employeeId, date)`; `LeaveRequestRepository.findOpenByEmployeeEndingAfter(tenantId, employeeId, date)` (statuses `requested`, `head_approved`, `approved`); `CredentialApplicationRepository.findOpenByEmployee(tenantId, employeeId)` (new: statuses before `approved`, `rejected`, `withdrawn`) and `CommitteeMembershipRepository.findActiveByEmployee(tenantId, employeeId)` (new: every active seat, in any committee and facility). Existing reads used as they are: `ClinicalAppointmentRepository.findByEmployee` (filtered to current: `active` and `suspended` with `is_current`), `PositionAssignmentRepository.findOpenByEmployee`, `EmploymentContractRepository.findActiveByEmployee`.

## 4. Code structure

```
apps/back-end/apps/
├── repository/{model,interface,mongo}/{separation, separation-detail}.ts (+ classifications, modules, specs)
├── repository/model/roster-assignment.ts                         cancellation.kind 'separation'
├── repository/model/practice-schedule-exception.ts               source.kind 'separation'
├── workforce/separation/{separation.service, separation-impact.service, separation-completion.service, separation-calendar, separation-rules}.ts (+ specs)
├── workforce/jobs/separation.job.ts (+ spec)                      the seventh HR job
├── workforce/{rostering,leave,contract,credentialing}/…            the guard (SP2)
├── workforce/concept/{bundles,system-rules}.ts                     SP8
├── identity/permission.ts                                          SP7
└── gateway_hr/src/separation/                                      controller, DTOs, module, gateway test
```

## 5. Pull requests

| PR | Kind | Content |
|---|---|---|
| B1 | Code | Tasks 1 to 3: repositories, recording, change, cancel, lists, details, impact, checklist, the guard (branch `feat/workforce-separation`). |
| B2 | Code | Tasks 4 and 5: completion, the job, the immediate route (branch `feat/workforce-separation-completion`). |
| C | Docs | One "built" docs PR: `workforce.md` (new 3u, permissions, 3r job list, notes in 3m to 3t), `logging.md` 15, `hr-endpoints.md`, this plan, the collection design. |

## 6. Tasks

### Task 1: Repositories and codes

**Files:** models, classifications, interfaces, Mongo schemas, repositories and modules for `separations` and `separation_details`; `token.ts`; fakes in `workforce/testing/in-memory.ts` and `gateway_hr/src/testing/in-memory-workforce.ts`; the model changes of `roster-assignment` and `practice-schedule-exception`; `concept/bundles.ts`, `concept/system-rules.ts`.

- [ ] **Step 1: Write failing tests:** the mappers drop storage fields; the partial unique index per employee ignores `cancelled`; `findPlannedEndedBefore` reads across tenants with a cursor and its index; the detail is `highly_confidential`; `cancelForSeparation` records one change per assignment with the reason `separation`; a `…separation-type` concept without `contract_action` is refused.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(repository): add the separation repositories`.

### Task 2: Recording, change, cancel, reads and checklist

**Files:** create `workforce/separation/{separation.service, separation-impact.service, separation-rules}.ts` (+ specs); `identity/permission.ts`; `workforce.module.ts`; `gateway_hr/src/separation/` (controller, DTOs, module, `separation.spec.ts`).

**Interfaces:**
- Produces: `SeparationService.create(tenantId, employeeId, input)`, `update`, `cancel`, `list`, `get`, `details`, `setChecklistItem`; `SeparationImpactService.impact(tenantId, id): Promise<SeparationImpact>`.

- [ ] **Step 1: Write failing specs:** every SP1 and SP3 rejection by code; the facility choice; the checklist from active concepts; details record one access entry and return nothing when recording fails; the impact lists exactly what SP4 would close (assignments after the day only, leave running past it, current SPKs); tenant isolation; reads write no log; writes log no values. Gateway test: 401, 403 per permission, 404 for malformed, missing and foreign ids, 409 `separation_exists`.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(gateway-hr): record separations and their impact`.

### Task 3: The planning guard

**Files:** create `workforce/separation/separation-calendar.ts` (+ spec); modify the roster assignment, import, swap, practice schedule, practice exception, leave request, contract activation and credential application services and their specs.

**Interfaces:**
- Produces: `SeparationCalendar.isLeavingBefore(tenantId: string, employeeId: string, date: string): Promise<boolean>`.

- [ ] **Step 1: Write failing tests:** each path of SP2 answers 422 `employee_leaving` (import: row error) for a date after the last working day and accepts the last working day itself; a cancelled separation blocks nothing; a practice schedule that runs past the day is refused only when it starts after it.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** the full checks — PASS.
- [ ] **Step 5: Commit** `feat(workforce): refuse planning after a last working day`.

### Task 4: Completion

**Files:** create `workforce/separation/separation-completion.service.ts` (+ spec); a shared revoke function extracted from `appointment/status.service.ts`; the leave cut extracted from `leave-end-early.service.ts` so both use it.

**Interfaces:**
- Produces: `SeparationCompletionService.complete(tenantId: string, separationId: string): Promise<Separation>`.

- [ ] **Step 1: Write failing specs** with in-memory repositories, one per step of SP4 plus: everything before the last working day is untouched; a closed roster is untouched; a leave spanning the day is cut and gives back only the days after it; supervised grants of other people are flagged; the contract is ended or terminated by `contract_action`; the status event is written once with the correlation id; a second completion answers 422 `separation_not_planned` and writes nothing; the settlement lists the days left per yearly type, negative when overdrawn.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(workforce): complete a separation`.

### Task 5: The job and immediate completion

**Files:** create `workforce/jobs/separation.job.ts` (+ spec); add it last to `HR_JOBS` and `WorkforceJobsModule`; route `POST /v1/separations/:id/complete` and the immediate branch of create; gateway test.

- [ ] **Step 1: Write failing specs:** the job completes a separation whose last working day ended in its facility's zone and leaves one that has not; idempotent; a failing separation is counted, stays `planned`, and does not stop the others; actor `separation-job`, reason `separation`, a fresh correlation id per separation; the job's lease. Gateway: an immediate separation completes in the request and disables nothing else than the plan says; `complete` refuses a non-immediate one (422 `separation_not_immediate`).
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** the full checks — PASS.
- [ ] **Step 5: Commit** `feat(worker): complete separations after the last working day`.
