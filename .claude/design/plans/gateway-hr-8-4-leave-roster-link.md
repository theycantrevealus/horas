# gateway_hr 8.4: Leave, roster and practice-schedule link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: **Planned** (2026-11-18). Part of `2026-11-10-gateway-hr-plan.md` (walkthrough order 30), after 8.3 and **released with it**. Endpoints: `../hr-endpoints.md` 8.4. Collections: `../human-resource-collections.md` 9.6 (refinements of `roster_assignments`, `practice_schedule_exceptions`, `rosters`). Business rules: HR spec 9.4.4.3 to 9.4.4.6, `HR-LEV-020` to `HR-LEV-023`, `HR-ROS-003`, `HR-ROS-041`, 8.4.4. Built references: roster assignments (5.5: `assignment-checks.ts`, revision raise in one transaction, past-date corrections), shift swaps (5.7: assignments created one by one with a source), practice exceptions (5.8: create, undo by soft delete).

**Goal:** an approved leave clears the person's shifts and polyclinic sessions, the Head confirms the cover by the replacement, and nobody can be planned on a leave day afterwards.

**Architecture:** `RosterLeaveEffects` implements the `LeaveEffects` port of 8.3 (token `LEAVE_EFFECTS`) in `apps/workforce/leave/`, so the leave services stay unchanged; it runs inside the approval's `run`. `LeaveCoverService` builds and confirms the proposal with the checks of `assignment-checks.ts`. `LeaveCalendar` answers "is this employee on approved leave on this date" for the assignment, import, swap and practice-exception paths (`HR-ROS-003`).

**Tech Stack:** NestJS 12, Mongoose, Vitest, oxlint, Node 22.

**Spec:** HR spec 9.4 and `../human-resource-collections.md` 9.

## Global Constraints

- All constraints of `gateway-hr-8-3-leave-requests.md` apply.
- A leave approval never fails because of a roster rule (HR spec 9.4.4.3). The only failures are the request's own checks and infrastructure errors.
- Repository calls only inside `run`; writes sequential (`database.md` 7).
- A cancelled assignment shows only `cancellation: { kind: 'leave', ref_id }`; the leave type is never copied onto rosters or exceptions (`HR-LEV-041`).

## Review Focus

1. A leave requested after the fact over a past date of a **closed** roster: the assignment is left alone, the approval succeeds.
2. A leave approved over a `submitted` roster: its assignments are cancelled, `validation` is cleared, and the roster cannot be published until validated again (the gate of 3l already re-runs on `submit`; `publish` of an approved roster must now refuse when `validation` is null: 422 `validation_required`).
3. Confirming the cover twice, or after the roster was published or locked meanwhile: 409 `cover_confirmed`, 422 `roster_locked`.
4. Cancelling or shortening a leave restores no assignment, but does undo the leave's practice exceptions of today or later, and only those (`source.ref_id` of this request).
5. A half-day leave cancels nothing and blocks nothing: the Head adjusts that shift by hand.

## 1. The three endpoints, and changes to existing routes

| Endpoint | Permission | Behaviour |
|---|---|---|
| `GET /v1/leave-requests/:id/cover` | the first-step decider, or `workforce.leave-request:read` | `{ items: { assignmentId, rosterId, date, shiftCode, role, status: 'available' \| 'past' \| 'roster_locked' \| 'roster_closed' \| <rule code> }[], movedInSessions, confirmed }`, checked now against the replacement. Writes no log. |
| `POST /v1/leave-requests/:id/cover` | the first-step decider | Body `items: { assignmentId, role? }[]` (1 to 200), optional `version`. Creates one assignment per item that passes; answers `{ created: id[], refused: { assignmentId, code }[] }`. Once per request. |
| `POST /v1/leave-requests/:id/end-early` | `workforce.leave-request:write` | Body `lastDate`, `reason` (1 to 500), optional `version`. |

Changed: `POST /v1/rosters/:id/assignments`, the roster CSV import, `POST /v1/shift-swaps` and its accept and approve, and `POST /v1/practice-schedules/:id/exceptions` (a moved session's new date) answer 422 `on_leave` (import: row error `on_leave`) when the employee is on approved leave on that date. `POST /v1/rosters/:id/publish` answers 422 `validation_required` for an `approved` roster whose `validation` is null.

## 2. Rules and decisions

| # | Rule or decision | Proposed |
|---|---|---|
| LK1 | **Shifts on approval** (`onApproved`). The requester's `planned` assignments with a `date` whose day `count` is 1 (full day; any `why`), in rosters that are not `closed`: `status: 'cancelled'`, `cancellation: { kind: 'leave', ref_id }`, `change_reason: 'leave'`. Per roster: `published` → `revision` + 1 written with the version read, and the cancelled assignments carry it; `submitted` or `approved` → `validation: null`; `draft` → nothing more. Past dates are cancelled the same way (a correction, `HR-ROS-041`, by the approval: no `correct-past` permission is asked). The ids go to `request.cover.cancelled_assignment_ids`. | As stated. |
| LK2 | **Practice sessions on approval.** For each full leave day, each of the requester's practice schedules whose weekday and period cover it and that has no live exception that date gets an exception `{ kind: 'cancelled', reason: null, source: { kind: 'leave', ref_id } }`, past dates included. A date that already has a manual exception is left. A session moved onto a leave date by a manual exception is not cancelled; the cover proposal lists it (`movedInSessions`) for the Head. | As stated. |
| LK3 | **Cover proposal.** Items are the cancelled assignments with a date today or later. Each is checked as an assignment of the replacement added by hand: `assertAssignable`, `assertEligible`, one planned assignment per employee and date (`assignment_exists`), `firstWorkingTimeViolation` without overtime consent (a cover that adds overtime is refused, `overtime_consent_required`, as in swaps), the replacement's own leave (`on_leave`), and the roster's state (`draft` or `published`). No replacement (`noReplacementReason`): every item is `no_replacement` and the confirmation answers 422 `no_replacement`. | As stated. |
| LK4 | **Confirm.** Only `approved` requests (422 `invalid_transition`), once (409 `cover_confirmed`, set in the same `run`). Each passing item becomes an assignment of the replacement with the cancelled one's shift snapshot, date, instants, the given role or the old one, `source: { kind: 'leave_cover', ref_id }`, created one by one; a `published` roster gets `revision` + 1 once for the confirmation and `change_reason: 'leave_cover'`. Items rechecked inside the `run`; a refused item is reported, not created. | As stated. |
| LK5 | **Cancel an approved leave** (`onCancelled`). Soft-delete the request's exceptions dated today or later (`source.ref_id` = request). Assignments are not restored (`HR-LEV-023`). | As stated. |
| LK6 | **End early.** Only `approved` and started (`start` ≤ today; 422 `leave_not_started`, use cancel instead). `lastDate` from `start` to the day before `end` (422 `invalid_last_date`). In one `run`: `period.end` and `days` cut, `total_days` recomputed, `reversal` entries for the removed days (bucket order reversed: own first, then carry-over), then `onShortened`, which soft-deletes the exceptions after `lastDate` that are today or later. | As stated. |
| LK7 | **On leave** (`LeaveCalendar.isOnLeave(tenantId, employeeId, date)`): true when an `approved` request covers the date with a day `count` of 1. Pending requests and half days do not block. | As stated. |
| LK8 | **Model changes.** `RosterAssignment.source.kind` adds `'leave_cover'`; `RosterAssignment.cancellation: { kind: 'leave'; ref_id: string } \| null` (default `null`, existing documents map to `null`); `PracticeScheduleException.reason: Coding \| null`, required for `source.kind: 'manual'` (unchanged 422 `invalid_exception_reason`). Classifications updated. No data migration. | As stated. |
| LK9 | **Logs.** `leave_request_approve` gains `cancelled` and `exceptions` counts; `leave_cover_confirm` (`created`, `refused`); `leave_end_early`. Never an employee, a date or a shift. Reads write no log. | As stated. |

## 3. Repository changes

- `RosterAssignmentRepository`: `findPlannedByEmployeeBetween` exists; add `cancelForLeave(tenantId, ids: string[], leaveRequestId: string, revisionByRoster: Map<string, number>)`, a named write that records one change record per assignment (reason `leave`), sequential inside the caller's `run`.
- `PracticeScheduleRepository`: `findActiveByEmployeeCovering(tenantId, employeeId, start, end)`. `PracticeScheduleExceptionRepository`: `findByLeave(tenantId, leaveRequestId)`.
- `RosterRepository`: updatable `validation` already; nothing new.
- Fakes follow.

## 4. Code structure

```
apps/back-end/apps/
├── repository/model/{roster-assignment.ts, practice-schedule-exception.ts} (+ classifications)   LK8
├── repository/{interface,mongo}/{roster-assignment.ts, practice-schedule.ts, practice-schedule-exception.ts}
├── workforce/leave/{roster-leave-effects.ts, leave-cover.service.ts, leave-calendar.ts, leave-end-early.service.ts} (+ specs)
├── workforce/rostering/{roster-assignment.service.ts, roster-import.service.ts, swap.service.ts, practice-exception.service.ts, roster.service.ts}   on_leave, validation_required
├── workforce/workforce.module.ts                                                  LEAVE_EFFECTS → RosterLeaveEffects
└── gateway_hr/src/leave-request/                                                  cover and end-early routes, gateway tests
```

## 5. Pull requests

| PR | Kind | Content |
|---|---|---|
| B1 | Code | Tasks 1 to 3: model changes, effects on approve and cancel, `on_leave` everywhere (branch `feat/workforce-leave-roster-effects`). |
| B2 | Code | Tasks 4 and 5: cover proposal and confirmation, end early (branch `feat/workforce-leave-cover`). |
| C | Docs | One "built" docs PR for 8.3 and 8.4: `workforce.md` 3s (leave) and the changed 3m, 3n, 3o, 3p, permissions, `hr-endpoints.md`, the four plans' status, and HR spec 9.4 status notes. |

## 6. Tasks

### Task 1: Model changes

**Files:** modify the two models, their classifications, schemas, Mongo mappers and fakes; tests `repository/mongo/roster-assignment.spec.ts`, `practice-schedule-exception.spec.ts`, `workforce/rostering/practice-exception.service.spec.ts`.

- [ ] **Step 1: Write failing tests:** a stored assignment without `cancellation` maps to `null`; `cancelForLeave` records one change record per assignment with reason `leave`; a `source.kind: 'leave'` exception with `reason: null` is stored; a manual exception without a reason still answers 422 `invalid_exception_reason`.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(repository): mark assignments and exceptions cancelled by leave`.

### Task 2: `RosterLeaveEffects` on approve and cancel

**Files:** create `workforce/leave/roster-leave-effects.ts` (+ spec); modify `workforce/workforce.module.ts`.

**Interfaces:**
- Consumes: `LeaveEffects`, `LEAVE_EFFECTS` (8.3), Task 1.
- Produces: `RosterLeaveEffects implements LeaveEffects`.

- [ ] **Step 1: Write the failing spec** with in-memory repositories: draft, published (revision + 1, once per roster), submitted and approved (`validation` null) rosters each lose the requester's full-day assignments; a closed roster is untouched; half days cancel nothing; past dates of an after-the-fact leave are cancelled; sessions get `leave` exceptions, past ones too, a date with a manual exception is skipped; cancel soft-deletes only this request's exceptions of today or later and restores no assignment; the ids land in `cover.cancelled_assignment_ids`; another tenant's records are never read.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(workforce): cancel shifts and sessions of an approved leave`.

### Task 3: `on_leave` and `validation_required`

**Files:** create `workforce/leave/leave-calendar.ts` (+ spec); modify `roster-assignment.service.ts`, `roster-import.service.ts`, `swap.service.ts`, `practice-exception.service.ts`, `roster.service.ts` and their specs; gateway tests of those routes.

**Interfaces:**
- Produces: `LeaveCalendar.isOnLeave(tenantId: string, employeeId: string, date: string): Promise<boolean>`.

- [ ] **Step 1: Write failing tests:** add on a full leave day → 422 `on_leave`; on a half day or a pending leave → accepted; import row `on_leave`; a swap whose result puts either party on a leave day → 422 `on_leave` at create, accept and approve; a session moved onto the doctor's leave day → 422 `on_leave`; publishing an approved roster with `validation: null` → 422 `validation_required`.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** the full checks — PASS.
- [ ] **Step 5: Commit** `feat(workforce): refuse assignments on approved leave days`.

### Task 4: Cover proposal and confirmation

**Files:** create `workforce/leave/leave-cover.service.ts` (+ spec); controller routes, DTOs, gateway test.

**Interfaces:**
- Consumes: `assertAssignable`, `assertEligible`, `toWorkingShift`, `firstWorkingTimeViolation` (`rostering/assignment-checks.ts`), `LeaveCalendar`, `resolveHead` (8.3).
- Produces: `LeaveCoverService.proposal(tenantId, requestId, caller): Promise<LeaveCoverProposal>`, `confirm(tenantId, requestId, input: { items: { assignmentId: string; role?: RosterRole }[]; version?: number }, caller): Promise<{ created: string[]; refused: { assignmentId: string; code: string }[] }>`.

- [ ] **Step 1: Write failing specs:** proposal marks past, locked and closed items and each LK3 rule by code; `no_replacement`; confirm creates only passing items with source `leave_cover` and the cancelled shift's snapshot; a published roster's revision rises once; `cover_confirmed` on a second call; only the first-step decider (403 `not_the_decider`); the item list must hold only the request's cancelled assignments (422 `not_in_cover`); `leave_cover_confirm` logs counts only.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(workforce): propose and confirm the cover of a leave`.

### Task 5: End early

**Files:** create `workforce/leave/leave-end-early.service.ts` (+ spec); controller route, DTO, gateway test.

- [ ] **Step 1: Write failing specs:** a 10-day annual leave ended after 4 days reverses 6 days (own bucket first back); `leave_not_started`, `invalid_last_date` (the end itself, before the start); exceptions after `lastDate` and today or later are undone; assignments are not restored; `stale_version`; `leave_end_early` logs no date.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** the full checks — PASS.
- [ ] **Step 5: Commit** `feat(workforce): end an approved leave early`.
