# gateway_hr 5.8: Practice schedules

Status: **Proposed** (2026-11-18), waiting for your answers on the decisions marked "Needs your answer". Part of `2026-11-10-gateway-hr-plan.md` (walkthrough order 24). Endpoints: `../hr-endpoints.md` 5.8. Collections: `../human-resource-collections.md` 5.6 (`practice_schedules`) and 5.7 (`practice_schedule_exceptions`). Business rules: `../../business/administrative-operational-system/human-resource-management.md` section 8.2 (Practice Schedule), 8.4.4 (maintenance), `HR-ROS-004` (only an eligible Tenaga Medis), `HR-ROS-030`/`031` (eligibility changes, not built here), the alert table 8.6 (not built) and the registration query of section 13. Models and classifications: `apps/back-end/apps/repository/model/practice-schedule*.ts` and `practice-schedule-exception*.ts` (exist; no token, interface, schema or repository yet). Built references: shift swaps (5.7: own-list and decide patterns), roster assignments (5.5: `assignment-checks.ts`, `EligibilityService.general`, local dates in the facility's zone), coverage requirements (5.3: edit rules, period) and the on-duty read (`DutyService`).

A practice schedule is the recurring weekly outpatient session of a doctor in a polyclinic: one weekday, a local start and end, an optional quota and a validity period. Patient registration asks "which doctors practise in polyclinic C on date D, with what quota?". An exception cancels or moves one session on one date (leave, training, emergency). This is the last group of the rostering block.

## 1. The six endpoints

`hr-endpoints.md` lists six endpoints and this plan builds those six (PS1). The one read serves two uses by the same route.

| Endpoint | Behaviour |
|---|---|
| `GET /v1/practice-schedules` | Without `date`: lists schedules. Query `unitId`, `employeeId`, `status`, `limit`, `offset`; ordered by unit, weekday, start time. With `date`: answers the **sessions of that date** for registration (section 3, PS2). |
| `POST /v1/practice-schedules` | Adds a doctor's weekly session. Body: `employeeId`, `unitId`, `dayOfWeek`, `startTime`, `endTime`, optional `quota`, `validFrom`, optional `validUntil`, optional `reason`. Created `active`. |
| `PATCH /v1/practice-schedules/:id` | Changes the times, the quota and the validity of an `active` schedule. Optional `version` and `reason`. |
| `POST /v1/practice-schedules/:id/end` | Ends the schedule after a date. Body: `lastDate`, optional `version`, `reason`. |
| `POST /v1/practice-schedules/:id/exceptions` | Cancels or moves one session on a date. Body: `date`, `kind`, `reason` (`Coding`), `movedTo` (for `moved`), optional `version`. |
| `POST /v1/practice-schedule-exceptions/:id/cancel` | Undoes an exception. Optional `version`, `reason`. |

Permissions (new): `workforce.practice-schedule:read` (the read, which registration's service account holds) and `workforce.practice-schedule:write` (create, edit, end, exceptions, undo). Both are tenant-wide until scoped permissions exist, so "the Head of the polyclinic maintains" is not limited to their own unit yet (PS16).

## 2. The rules

| # | Rule or decision | Proposed |
|---|---|---|
| PS1 | **Scope.** The six endpoints of `hr-endpoints.md`, no more. There is no `GET /practice-schedules/:id`: the list carries the whole record. | As stated. |
| PS2 | **The read by date.** With `date=YYYY-MM-DD` (and optionally `unitId`, `employeeId`) the route answers one **session** for each schedule whose weekday is the date's and whose period covers it, whatever its status (an `ended` schedule still serves the days before its last date), plus sessions **moved onto** that date. A session carries `scheduleId`, `employeeId`, `unitId`, `facilityId`, `date`, `startTime`, `endTime`, `quota`, and a `state`: `scheduled`; `cancelled` (an exception cancels it); `moved` (the regular session of that date was moved elsewhere, with `movedTo`); `moved_in` (arrives from another date, at its new time). It also carries `eligible` and, when false, `failed` (the condition of `HR-ROS-004`), **derived from the records at the time of the call and never stored** (`HR-ELG-001`), so registration never books a doctor whose permit lapsed; and the doctor's `displayName` and `specialties`, which are public inside the hospital (HR spec 14). Ordered by unit, start time, employee. Any date is answered, a past one too (a history question). | **Needs your answer.** |
| PS3 | **Who can have a schedule (`HR-ROS-004`).** The employee must be a Tenaga Medis: a clinical employee whose workforce category is `id.workforce-category` with the code `tenaga_medis`, on `probation` or `active` (422 `not_tenaga_medis`, `employee_not_assignable`, `employee_not_found` for a missing, malformed or foreign id). They must be **generally clinically eligible** for the polyclinic (conditions 1 to 4 of HR spec 5.5, `EligibilityService.general`) **on the first session date from today or the start of the validity, whichever is later** (422 `not_eligible_employment`, `not_eligible_str`, `not_eligible_sip`, `not_eligible_spk`). If the validity has no such weekday, 422 `no_session_in_period`. The same check runs when an edit changes the times or the validity, and for the new date of a moved session. A doctor who stops being eligible later is not touched here (PS15). | **Needs your answer.** |
| PS4 | **The polyclinic.** The unit must exist in the tenant, be `active` and be marked clinical (422 `unit_not_found`, `unit_closed`, `unit_not_clinical`). Unit types are codes of the tenant, so no type is hard-coded; the facility and its zone are read from the unit. A foreign, missing, malformed and deleted unit give one answer. | As stated. |
| PS5 | **Times, quota, validity.** `dayOfWeek` is an ISO weekday, 1 to 7 (422 `invalid_day_of_week`). `startTime` and `endTime` are local `HH:mm` and the end is **after** the start on the same day (422 `invalid_times`): an outpatient session does not run past midnight, unlike a shift. `quota` is a whole number from 1 to 9999 or missing for no limit (422 `invalid_quota`). `validFrom` is a real date from 2000-01-01 and `validUntil` is missing or not before it (422 `invalid_period`). A start in the past is allowed. Nothing is converted to an instant (`database.md` 4.4). | **Needs your answer.** |
| PS6 | **What an edit may change.** The employee, polyclinic, facility and weekday never change: a different doctor or day is a new schedule. `PATCH` changes `startTime`, `endTime`, `quota`, `validUntil`, and `validFrom` **only while the schedule has not started** (its start is after today in the unit's zone; otherwise 422 `schedule_started`). At least one field (422 `empty_update`); the times and the period are rechecked together. An `ended` schedule cannot be edited (422 `schedule_ended`). Optional `version` (409 `stale_version`). | As stated. |
| PS7 | **No double booking.** A doctor cannot have two sessions that overlap in time on the same weekday in periods that overlap, **in any polyclinic** (409 `schedule_overlaps`): one person cannot be in two places. Two sessions that only touch (one ends when the other starts) do not overlap. The check reads then writes, so two simultaneous requests can both pass. A clash with the doctor's **roster assignments** is not checked (PS15). | As stated. |
| PS8 | **Ending.** `lastDate` is the **last day the schedule applies**. It must be today or later in the unit's zone, not before the start, and not after the current end if there is one (422 `invalid_last_date`). The end sets `period.end` to `lastDate` and `status` to `ended` **at once**: `ended` means closed to edits, not "no longer applies", so the sessions up to `lastDate` are still offered to registration (PS2). Ending is final (422 `schedule_ended` for a second end). Exceptions after `lastDate` stay in the history and are ignored. | **Needs your answer.** |
| PS9 | **Exceptions.** An exception belongs to one session: `date` must be a date the schedule has a session on, that is its weekday inside its period (422 `no_session_on_date`), and **today or later** in the unit's zone (422 `date_in_past`). One exception per schedule and date (409 `exception_exists`, backed by a unique index). `kind` is `cancelled` or `moved`. `reason` is a code of `id.practice-exception-reason` (leave, training, emergency, other), checked with `assertActive`. `movedTo` is required for `moved` and refused for `cancelled` (422 `moved_to_required`, `moved_to_not_allowed`): a date today or later, a time of the rules of PS5, and not the same date and times as the session (422 `not_moved`). The employee and the unit are copied from the schedule. The source is `manual`; the sources `leave` and `training` are for the leave module (PS15). | As stated. |
| PS10 | **A moved session follows the same rules as a schedule.** On its new date the doctor must still be generally eligible (PS3) and must not overlap another session of theirs that day, regular or moved (409 `schedule_overlaps`). A session moved away from a date does not count on that date. | As stated. |
| PS11 | **Undoing an exception.** `POST /practice-schedule-exceptions/:id/cancel` **soft-deletes** the exception (`deleted_at`, the repository's `deleteSoft`), so the session is back and the change history keeps who undid it and when. The unique index of PS9 ignores soft-deleted records, so a new exception can follow. It needs a date today or later (422 `date_in_past`) and an exception that is not already undone (404 `exception_not_found`). The answer is the exception as it was. A foreign, missing or malformed id answers the same 404. | **Needs your answer.** |
| PS12 | **Paging.** Both read modes accept `limit` (1 to 100) and `offset` (0 or more) and reject other values; without `limit` the repository default applies. Reads write no log entry. | As stated. |
| PS13 | **Tenant and ids.** `tenant_id` always from `@CurrentUser()`; the employee, unit and facility ids come from the body and the records, never from the token. A foreign, missing or malformed schedule id answers 404 `schedule_not_found`. Nothing is deleted except as PS11. | As stated. |
| PS14 | **Changes and logs.** The schedules and the exceptions are recorded by their repositories (`database.md` 6.1). An optional `reason` is kept with `withChangeReason`. Each write route writes one operational entry (`practice_schedule_create`, `_update`, `_end`, `practice_exception_create`, `_cancel`) with the error class and `code` on failure, never an employee, a date, a time or a reason. The change log keeps the schedules `public` and the exceptions `internal`, as classified. | As stated. |
| PS15 | **Not built here.** The notification of registration and the Head of the polyclinic on every change (HR spec 8.4.4, 8.6) and events, the flag when a doctor stops being eligible (`HR-ROS-030`, `031`, the worker group), exceptions created by approved leave or training (leave module), a check against the doctor's roster assignments, a copy of a schedule to a new period, and a single read. | As stated. |
| PS16 | **Scoped permissions.** `workforce.practice-schedule:write` is tenant-wide: any holder can maintain any polyclinic's schedules until scoped permissions exist. The business matrix gives the Head of the polyclinic their own unit only. | As stated. |

## 3. Repository and code

Two repositories are needed; the models and classifications exist.

- Tokens `REPOSITORY_PRACTICE_SCHEDULE` and `REPOSITORY_PRACTICE_SCHEDULE_EXCEPTION`, interfaces with named reads: `PracticeScheduleRepository.findByFilter(tenantId, { unitId, employeeId, status, limit, offset })`, `findOnDate(tenantId, dayOfWeek, date, { unitId, employeeId, limit, offset })` (period covers the date) and `findActiveByEmployee(tenantId, employeeId, dayOfWeek)` (PS7); `PracticeScheduleExceptionRepository.findBySchedulesAndDate`, `findByScheduleAndDate`, `findMovedTo(tenantId, date, { unitId, employeeId })` and `findByEmployeeOnDate` (PS10).
- Schemas `PracticeScheduleEntity` and `PracticeScheduleExceptionEntity` with the collections pinned, the indexes of the design (`{ tenant_id, unit_id, day_of_week, status }`, `{ tenant_id, employee_id, status }`; exceptions `{ tenant_id, schedule_id, date }` **unique with a partial filter on `deleted_at: null`** so PS11 works, and `{ tenant_id, unit_id, date }`) plus `{ tenant_id, 'moved_to.date', unit_id }` for the moved-in sessions. Mongo implementations on the shared base (the schedule can be updated, the exception can be soft-deleted), modules, specs, and the in-memory fakes registered in `gateway_hr/src/testing/in-memory-workforce.ts`.
- `PracticeScheduleService` in `workforce/rostering/practice-schedule.service.ts` (list, sessions by date, create, edit, end) and `PracticeExceptionService` (create, undo), with `practice-schedule-rules.ts` (weekday, times, quota, period, the first session date, overlap) and the eligibility check through `EligibilityService.general` and `assertAssignable`. The Tenaga Medis check reads the employee's workforce category; no code list is copied (the code is a constant of the rule, not a list).
- Permissions `WORKFORCE_PRACTICE_SCHEDULE_READ` and `_WRITE` in `identity/permission.ts`; the code concept system `id.practice-exception-reason` is a code system of the tenant (`system-rules.ts` needs no entry; the import bundle gets the four starter codes if bundles list known systems).
- `gateway_hr/src/practice-schedule/`: the two controllers, DTOs, module and gateway tests.

```
apps/back-end/apps/
├── repository/{token.ts,interface,mongo,mongo/schema}/practice-schedule*.ts          (+ specs, modules)
├── workforce/rostering/{practice-schedule,practice-exception}.service.ts
│                       {practice-schedule-rules.ts}                                    (+ specs)
├── workforce/testing/in-memory.ts                       InMemoryPracticeSchedules, InMemoryPracticeScheduleExceptions
├── identity/permission.ts                               workforce.practice-schedule:read, :write
└── gateway_hr/src/practice-schedule/                    the six routes
```

## 4. Tasks and pull requests

| PR | Kind | Content |
|---|---|---|
| A | Docs | This plan, the master plan row and the endpoint note (branch `docs/workforce-hr-practice-schedules-plan`). |
| B1 | Code | The schedule repository, the permissions, **create**, **edit**, **end**, and the list with the sessions by date (scheduled sessions and the eligibility flag; no exceptions yet), with the tests. |
| B2 | Code | The exception repository, **exceptions** and **undo**, and the exceptions in the sessions by date (`cancelled`, `moved`, `moved_in`), with the tests. |
| C | Docs | After each code PR as needed: a short "in progress" row update, then the "built" docs PR (`workforce.md` 3p, `hr-endpoints.md`, this plan's status, the master plan counts). |

Tests come first: the rules of PS3 to PS11 case by case (a doctor who is not a Tenaga Medis, not eligible, a polyclinic that is closed or not clinical, a weekday outside the period, two overlapping sessions in two polyclinics, touching sessions, an edit of a started schedule, an end before today, an exception on a date without a session, a moved session that overlaps), the sessions by date (a regular week, an `ended` schedule before its last date, a cancelled, a moved and a moved-in session, a doctor who lost a permit shown `eligible: false`), the undo and a new exception after it, tenant isolation, stale version, reads write no log entry, writes log no values, and the gateway (401, 403, 404, 409, 422, 400, a full create, exception and read over HTTP). Checks: `tsc`, `oxlint`, full `vitest` and `nest build gateway_hr`, run from `apps/back-end` under Node 22 (`pnpm` does not start on this machine).

## 5. Review focus

1. Registration never gets a session of a doctor who is not eligible on that date without being told (`eligible`, `failed`).
2. A doctor is never in two places at once, and a moved session follows the same rules as a schedule.
3. The date read is correct for every weekday, for ended schedules, and for cancelled, moved and moved-in sessions.
4. Undoing an exception keeps the history and lets a new exception be made.
5. Logs carry the error class and code only: no employees, dates, times or reasons.

## 6. Decisions that need your answer

- **PS2** (the read by date answers sessions with their state, the derived `eligible` flag and the doctor's public name and specialties).
- **PS3** (a Tenaga Medis, eligible on the first session date from today or the start).
- **PS5** (no session past midnight; the quota from 1 to 9999).
- **PS8** (`lastDate` is the last day the schedule applies; `status` becomes `ended` at once and the days up to `lastDate` are still offered).
- **PS11** (undoing an exception soft-deletes it, with a partial unique index).

The others are as stated. Open, not decided here: whether a Head of the polyclinic may maintain only their own unit (needs scoped permissions).
