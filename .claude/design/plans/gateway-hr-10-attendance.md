# gateway_hr 10: Attendance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: **Planned** (2026-11-23). Part of `2026-11-10-gateway-hr-plan.md` (walkthrough orders 32 to 34). Endpoints: `../hr-endpoints.md` 10. Collections: `../human-resource-collections.md` 11. Business rules: HR spec 9.3, `HR-ATT-001` to `HR-ATT-013`. Built references: roster imports (5.6: `readCsv`, check then apply, `hr_imports`), roster assignments (5.5: instants, `zonedInstant`), the leave ledger (8.2: an append-only repository), the worker HR jobs (7: `HrJobsRunner`, `JobLease`, reads "for jobs only"), leave decisions (8.3: a Head who decides, `LeaveCaller`-style callers).

**Goal:** clock events from the devices become one attendance record per planned shift, the Head fixes and approves what is wrong, and a roster closes only on a true record.

**Architecture:** four repositories (devices, enrolments, clock events, records) and a correction pair. `ClockEventService` takes device batches and CSV imports; the pure `reconcile.ts` turns a planned shift and its events into a record; the worker job `AttendanceReconcileJob` applies it to shifts whose window has closed and to records marked dirty; `AttendanceCorrectionService` and `OvertimeService` hold the Head's decisions. A device gateway signs in as an ordinary account (a service account of the hospital) that holds `workforce.attendance:ingest`.

**Tech Stack:** NestJS 12, Mongoose, Vitest, oxlint, Node 22, `csv-parse` (already used).

**Spec:** HR spec 9.3 and `../human-resource-collections.md` 11.

## Global Constraints

- All constraints of `workforce.md` section 3.
- No biometric data and no location are accepted or stored (`HR-ATT-001`): the batch DTO has no field for them and rejects unknown fields.
- Clock events are append-only and are not recorded in the change history (high volume, like `security_events`); records, corrections and devices are.
- Instants in UTC; the shift window and dates in the facility's zone (`HR-ATT-006`).
- The pure reconciliation gives the same record for the same inputs (`HR-ATT-005`); the job only applies it.
- Parameters are read through `ParameterService.resolve` at the unit; no value is hard-coded beyond the catalog defaults (HR spec 10).

## Review Focus

1. A night shift 21:00 to 07:00 with clock-in 20:52 and clock-out 07:10: one record, worked, not late, no overtime under `OVERTIME_MIN_MINUTES`, the events of the next morning shift's window not taken.
2. Two shifts the same day for one person (07:00 to 15:00 and 15:00 to 23:00) with three events: each event goes to the nearer shift and no event is used twice.
3. A device batch sent twice, or with events out of order and some for an unknown user number: each event is stored once, the unknown ones are unmatched, nothing is guessed.
4. An assignment cancelled after its record exists (a retroactive leave approval): the record is removed from the period and does not block the roster close.
5. An employee who asks to correct their own record and is also the Head of the unit: the correction needs the parent unit's Head, never themselves.

## 1. Endpoints

As `../hr-endpoints.md` 10. Permissions (new): `workforce.attendance-device:read`, `:write` (devices and enrolments); `workforce.attendance:ingest` (the device gateway); `workforce.attendance:import`; `workforce.attendance:read` (records of the tenant, unmatched events); `workforce.attendance:resolve` (unmatched events); `workforce.attendance:decide` (a Head: corrections and overtime of the units they head; the caller's employee must be that Head, found as for leave, 8.3 LR6). Self-service routes need a sign-in and a linked employee.

## 2. Rules and decisions

| # | Rule or decision | Proposed |
|---|---|---|
| AT1 | **Devices.** Code `^[A-Z0-9-]{1,32}$`, unique per facility and never reused (409 `device_exists`); the facility active (422 `facility_not_found`); retire is final (422 `device_retired`). | As stated. |
| AT2 | **Enrolments.** One active enrolment per employee and facility (409 `enrolment_exists`) and per user number and facility (409 `user_number_taken`); the employee of the tenant and not separated; ending sets `ended_on` (today in the facility's zone). Past events keep their employee. | As stated. |
| AT3 | **Batches** (`POST /v1/attendance/events`): 1 to 500 events of one facility; each `{ deviceCode, deviceEventId (1 to 64), userNumber, at (ISO instant), direction? }`; an event more than 31 days old or more than 5 minutes in the future is refused per event (`event_too_old`, `event_in_future`); an unknown or retired device refuses the event (`device_unknown`). The answer is `{ stored, duplicates, unmatched, refused: { index, code }[] }`; a duplicate is not an error. Stored events of a shift whose record is no longer `open` mark that record dirty. | As stated. |
| AT4 | **Import.** CSV `user_number, at, direction?, device_code?` (512 KB, `IMPORT_MAX_ROWS`), check then apply with the same hash rule as 5.6; imported events carry `source.kind: 'import'`. | As stated. |
| AT5 | **Reconcile** (`reconcile(shift, events, limits): ReconciledRecord`, pure). Window `[starts_at − MATCH_BEFORE, ends_at + MATCH_AFTER]`; when two shifts of the employee overlap windows, an event goes to the shift whose planned start or end is nearer, ties to the earlier shift. First in = earliest event (direction ignored except a single `out` event, which is `missing_in`); last out = latest; one event = `missing_out` unless it says `out`. `late_minutes = max(0, first_in − starts_at − GRACE)` rounded down to whole minutes, `early_minutes` likewise at the end; `overtime.minutes = max(0, last_out − ends_at)` counted only from `OVERTIME_MIN_MINUTES`; planned overtime with consent sets `approved_minutes = min(minutes, planned)` and the rest is `overtime_pending`. No event = `absent`. | As stated. |
| AT6 | **Job** (`AttendanceReconcileJob`, after the separation job). Reads planned assignments that are not `off` whose `ends_at + CLOSE_AFTER` has passed (new read `findPlannedEndedBetween(from, to, afterId, limit)` on assignments, for jobs only, index `{ status, ends_at }`, window of the last 7 days) and dirty records (`findDirty(afterId, limit)`), creates or updates the record in its own transaction with the actor `attendance-job`, and builds unplanned work records for employee days whose events matched no shift. A cancelled assignment's record that is not `final` is soft-deleted. | As stated. |
| AT7 | **Corrections.** By the employee for their own record within `CORRECTION_DAYS` of its date (422 `correction_too_late`), or by the Head (decided at once); one pending correction per record (409 `correction_exists`); kinds `add_in`, `add_out`, `replace_in`, `replace_out` (with `at` inside the window) and `excuse_absence` (only `absent`); a reason 1 to 500. The decider is the Head of the record's unit (or the parent's Head when the requester is that Head, else HR Manager), never the requester (403 `decider_is_requester`). Approve writes `correction` clock events (a `replace_*` adds the new instant and drops the old from `event_ids`, which never deletes it) and marks the record dirty; reject needs a reason. A `final` record refuses (422 `record_final`). | As stated. |
| AT8 | **Overtime** (`POST /v1/attendance-records/:id/overtime`, `:decide` and the Head): `approvedMinutes` 0 to `overtime.minutes`, sets `decided`, clears `overtime_pending`. | As stated. |
| AT9 | **Roster close.** `RosterService.close` answers 422 `attendance_not_reconciled` while a record of the roster is `open` or dirty, a correction is `requested`, or a record has `overtime_pending`; it then sets `final` on every record of the roster in the same transaction. | As stated. |
| AT10 | **Reads.** Records list by `unitId` (required unless `employeeId`), `from`/`to` (at most 62 days), `status`, `flag`; the Head sees the units they head, `:read` the tenant, the employee their own (`HR-ATT-011`). Reads write no log. | As stated. |
| AT11 | **Logs.** `attendance_device_*`, `attendance_enrolment_*`, `attendance_events_ingest` (counts), `attendance_import_check`/`_apply`, `attendance_correction_*`, `attendance_overtime_decide`; the job writes `hr_job`. Never a user number, an instant, an employee or a reason. | As stated. |
| AT12 | **Not built in this group.** The alerts of HR spec 9.3.6 and `ATTENDANCE_DECISION_SLA_DAYS` (no notification service), the attendance summary report, attendance for staff without a roster, mobile clocking, payroll amounts (Q8). | As stated. |

## 3. Repositories

`AttendanceDeviceRepository`, `AttendanceEnrolmentRepository` (`findActiveByUserNumber(tenantId, facilityId, userNumber)`, `findActiveByEmployee`), `ClockEventRepository` (`appendMany(events)` skipping duplicates by the unique index and answering what was new, `findByEmployeeBetween(tenantId, employeeId, from, to)`, `findUnmatched(tenantId, query)`, `assignEmployee(id, employeeId)`), `AttendanceRecordRepository` (`findByAssignment`, `findByFilter`, `findDirty` for jobs only, `findOpenOrPendingByRoster(tenantId, rosterId)`, `markDirty(tenantId, ids)`, `finalizeRoster(tenantId, rosterId)` a named write), `AttendanceCorrectionRepository` and its detail. Tokens `REPOSITORY_ATTENDANCE_*` and `REPOSITORY_CLOCK_EVENT`.

## 4. Code structure

```
apps/back-end/apps/
├── repository/{model,interface,mongo}/{attendance-device, attendance-enrolment, clock-event, attendance-record, attendance-correction, attendance-correction-detail}.ts
├── workforce/attendance/{device.service, enrolment.service, clock-event.service, attendance-import.service, reconcile, attendance-record.service, attendance-correction.service, overtime.service}.ts (+ specs)
├── workforce/jobs/attendance-reconcile.job.ts (+ spec)
├── workforce/rostering/roster.service.ts                                AT9
├── workforce/parameter/catalog.ts                                       HR spec 10 (six keys)
├── identity/permission.ts
└── gateway_hr/src/{attendance-device, attendance, attendance-correction}/
```

## 5. Pull requests

| PR | Kind | Content |
|---|---|---|
| 10.1 | Code | Tasks 1 and 2: devices, enrolments, clock events, batches, import, unmatched events (branch `feat/workforce-attendance-intake`). |
| 10.2 | Code | Tasks 3 and 4: reconciliation, the job, records, overtime (branch `feat/workforce-attendance-records`). |
| 10.3 | Code | Task 5: corrections and the roster close (branch `feat/workforce-attendance-corrections`). |
| C | Docs | One "built" docs PR for group 10. |

## 6. Tasks

### Task 1: Devices and enrolments

**Files:** repositories, services, controllers, DTOs for devices and enrolments; permissions; fakes.

- [ ] **Step 1: Write failing specs:** every AT1 and AT2 rejection by code; uniqueness of codes and user numbers; ending an enrolment frees the user number; tenant isolation; reads write no log. Gateway: 401, 403, 404, 409.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(gateway-hr): manage attendance devices and enrolments`.

### Task 2: Clock events in

**Interfaces:**
- Produces: `ClockEventService.ingest(tenantId, facilityId, batch): Promise<IngestResult>`; `ClockEventRepository.findByEmployeeBetween(tenantId, employeeId, from: Date, to: Date): Promise<ClockEvent[]>`.

- [ ] **Step 1: Write failing specs:** a batch stored once when sent twice (`duplicates` counted); unknown user numbers unmatched; per-event refusals with their index (`event_too_old`, `event_in_future`, `device_unknown`); a body field for biometric data or location is refused (400, the DTO whitelist); resolving an unmatched event assigns the employee and marks the affected record dirty; the CSV import checks and applies like 5.6; events are not in the change history; logs carry counts only.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(gateway-hr): receive clock events from devices and files`.

### Task 3: Reconciliation

**Files:** create `workforce/attendance/reconcile.ts` (+ spec).

**Interfaces:**
- Produces: `reconcile(shift: PlannedShift, events: ClockEvent[], others: PlannedShift[], limits: AttendanceLimits): ReconciledRecord`.

- [ ] **Step 1: Write the failing spec** with the Review Focus cases 1 and 2 and: on time; late beyond grace (a 07:11 clock-in for a 07:00 start with a grace of 5 is 6 late minutes, `11 − 5`); early leave; a single `out`; no events = absent; overtime under and over `OVERTIME_MIN_MINUTES`; planned overtime with consent approved up to its plan; an event at the window's edge included; the same inputs give the same record.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(workforce): reconcile a shift with its clock events`.

### Task 4: The job, records and overtime

**Files:** create `workforce/jobs/attendance-reconcile.job.ts`, `workforce/attendance/{attendance-record.service, overtime.service}.ts` (+ specs); the assignment read `findPlannedEndedBetween`; controllers and DTOs of 10.2; parameter catalog keys.

- [ ] **Step 1: Write failing specs:** the job creates one record per ended planned shift and none for `off` or cancelled ones; dirty records are reconciled again; unplanned work records; a cancelled assignment's record is soft-deleted unless final; idempotent; a failing record counted and retried; actor `attendance-job`. Records reads per AT10; overtime decisions per AT8 (403 for another unit's Head, 422 above the minutes).
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** the full checks — PASS.
- [ ] **Step 5: Commit** `feat(worker): reconcile attendance after each shift`.

### Task 5: Corrections and the roster close

**Files:** create `workforce/attendance/attendance-correction.service.ts` (+ spec); modify `rostering/roster.service.ts` (+ spec); controllers and DTOs of 10.3; gateway tests.

- [ ] **Step 1: Write failing specs:** every AT7 code; a replaced event is kept and not used; an excused absence stays `absent` with `excused`; the Review Focus case 5; a final record refuses; the close refuses with `attendance_not_reconciled` while anything of AT9 is open and marks every record final when it succeeds; logs carry no values.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** the full checks — PASS.
- [ ] **Step 5: Commit** `feat(gateway-hr): correct attendance and close rosters on it`.
