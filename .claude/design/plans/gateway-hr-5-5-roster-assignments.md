# gateway_hr 5.5: Roster assignments

Status: **Confirmed** (2026-11-17). Decisions RA1 to RA25 and the three code PRs (B1, B2, B3) confirmed as proposed. Part of `2026-11-10-gateway-hr-plan.md` (walkthrough order 21). Endpoints: `../hr-endpoints.md` 5.5. Collection: `../human-resource-collections.md` 5.5 (`roster_assignments`). Business rules: `../../business/administrative-operational-system/human-resource-management.md` 8.2 (Roster Assignment), 8.4.1 to 8.4.3 (prepare, change after publication), 8.5 (`HR-ROS-001` to `HR-ROS-042`), 5.5 (clinical eligibility, conditions 1 to 4), section 13 (the on-duty question) and the parameters `MIN_REST_HOURS`, `MAX_WEEKLY_HOURS`, `MAX_OVERTIME_HOURS_DAY`, `MAX_OVERTIME_HOURS_WEEK` and `MAX_CONSECUTIVE_NIGHTS`. Model: `apps/back-end/apps/repository/model/roster-assignment.ts` (exists, with its classification). Rules every endpoint follows: `../../rules/back-end/workforce.md` 3. Built references: rosters (5.4: the status flow and `revision`, and the endpoints moved here by RS1), shift definitions (5.1: the times and the night flag), coverage requirements (5.3: what `validate` counts), contracts and assignments (2.3, 2.4: status and employment), licences and SPKs (3.1, 4.3: what general eligibility reads).

An assignment puts one employee on one shift on one date in a roster. Everything the business says about working time, eligibility and coverage (`HR-ROS-001` to `HR-ROS-022`) is checked here, so this is the largest group of the rostering block and the first that reads licences, SPKs, contracts, shifts, requirements and parameters together. It is split in three code PRs (section 6).

## 1. What this group builds, and what moves

`hr-endpoints.md` lists nine endpoints in 5.5. I propose eight, in this order of work:

| Endpoint | Behaviour |
|---|---|
| `GET /v1/rosters/:id/assignments` | New (RS1 moved the assignment list out of `GET /rosters/:id`). Lists a roster's assignments: query `date`, `from`, `to`, `employeeId`, `status`, `limit`, `offset`. |
| `POST /v1/rosters/:id/assignments` | Adds one person to one shift on one date. Body: `employeeId`, `date`, `shiftId`, optional `role`, optional `reason`. |
| `PATCH /v1/roster-assignments/:id` | Changes an assignment: `shiftId`, `role` (the employee and the date do not change; move a person by cancelling and adding). Reason required after publication. |
| `POST /v1/roster-assignments/:id/cancel` | Cancels an assignment. Reason required after publication. |
| `POST /v1/rosters/:id/validate` | Runs every rule on the whole roster and answers the violations and the coverage gaps. |
| `POST /v1/rosters/:id/coverage-overrides` | Accepts a coverage gap with a reason. |
| `GET /v1/units/:id/on-duty` | Who is on duty in a unit at a moment (for the clinical modules). |
| `GET /v1/employees/me/roster` | The signed-in employee's own shifts for a date range. |

**Moved out.** `POST /rosters/:id/imports` (the roster CSV) goes to 5.6 with the rest of the roster import, because its check needs the assignment rules of this group and the apply of 5.6 (RA2). `POST /roster-assignments/:id/resolve-flag` goes to the group that builds the eligibility checks that raise the flags (a worker job, master plan D5): without them nothing ever sets a flag (RA3). The pre-fill of a draft from the previous period and rotation patterns are not built (RA4).

Permissions (new): `workforce.roster-assignment:read` (the lists), `workforce.roster-assignment:write` (add, change, cancel), `workforce.roster:validate` (validate) and `workforce.roster:override` (coverage overrides). The on-duty query uses `workforce.roster-assignment:read`; `GET /employees/me/roster` needs only a sign-in.

## 2. The rules, and where they are checked

| Rule | Checked when an assignment is added or changed | Checked by `validate` |
|---|---|---|
| `HR-ROS-001` status `probation` or `active` | Yes | Yes |
| `HR-ROS-002` general clinical eligibility (conditions 1 to 4) for a clinical employee in a clinical unit | Yes | Yes |
| `HR-ROS-003` approved leave or training | Not built (needs 9.4); a `suspended` employee is refused by `HR-ROS-001` | Not built |
| `HR-ROS-010` no overlap, in any unit | Yes | Yes |
| `HR-ROS-011` rest of at least `MIN_REST_HOURS` | Yes | Yes |
| `HR-ROS-012` weekly regular hours up to `MAX_WEEKLY_HOURS` | Yes (overtime is allowed, see RA13) | Yes |
| `HR-ROS-013` overtime limits and consent | Yes, for the weekly limit | Yes |
| `HR-ROS-014` one rest day in 7 days | No (a roster is filled step by step) | Yes |
| `HR-ROS-015` at most `MAX_CONSECUTIVE_NIGHTS` nights in a row | Yes | Yes |
| `HR-ROS-016` across all units | Yes (the checks read the employee's assignments in every roster) | Yes |
| `HR-ROS-020` to `022` coverage and team leader | No | Yes |
| `HR-ROS-040`, `041` a closed roster and the past are fixed | Yes | n/a |

## 3. Decisions to confirm

| # | Rule or decision | Proposed |
|---|---|---|
| RA1 | **Scope.** The eight endpoints above, in three code PRs. `GET /rosters/:id` stays as 5.4 built it (the roster only); the assignments have their own list. | As stated. |
| RA2 | **Roster CSV import moves to 5.6.** | As stated. |
| RA3 | **Flags move out.** `resolve-flag` and the job that sets a flag (`HR-ROS-030`, `031`) arrive with the worker. The model fields `flag` and `is_flagged` exist and stay empty. | As stated. |
| RA4 | **No pre-fill and no rotation patterns.** `POST /rosters` is unchanged. Open question for later: how a rotation pattern is defined. | As stated. |
| RA5 | **Adding is for `draft` and `published` rosters.** A roster in `submitted` or `approved` is frozen (422 `roster_locked`); `closed` is final (`HR-ROS-040`, 422 `roster_closed`). In a `draft` an assignment is added or changed without a reason; in a `published` roster every change needs a `reason` of 1 to 500 characters (422 `reason_required`, HR spec 8.4.3) and increases the roster's `revision` by 1 (RA19). A change in the past needs HR Admin and a reason (`HR-ROS-041`, RA21). | **Needs your answer.** |
| RA6 | **The date.** The date must lie inside the roster's period (422 `date_outside_period`) and is a local date in the roster's facility. | As stated. |
| RA7 | **The shift.** The shift must be an `active` shift of the roster's facility that the roster's unit may use, as for coverage requirements (422 `shift_not_found`, `shift_retired`, `shift_outside_facility`, `shift_unit_not_allowed`). A shift of type `off` is allowed and is the rest day (`L`). The assignment stores a **snapshot** of the shift (`definition_id`, `code`, `type`, times, paid minutes, night flag) so editing the definition never rewrites the past. | As stated. |
| RA8 | **The employee.** An employee of the tenant, not separated, with status `probation` or `active` on the date (`HR-ROS-001`, 422 `employee_not_assignable`); a foreign, missing and malformed id give 422 `employee_not_found`. Any employment type may be assigned, `mitra` included (collection design, C5). | As stated. |
| RA9 | **One employee, one shift, one date per roster.** A second assignment of the same employee on the same date in the same roster answers 409 `assignment_exists`, unless the first is `cancelled`. Two shifts in a day for one person (a double shift) are two assignments of different rosters or a different design; not built. | As stated. |
| RA10 | **Instants.** `starts_at` and `ends_at` are computed from the date, the shift times and the facility's IANA zone, DST-safe, and are `null` for an `off` shift. An overnight shift (end earlier than start) ends the next day. These are the only instants used by the overlap, rest, night-run and on-duty checks. | As stated. |
| RA11 | **Eligibility (`HR-ROS-002`).** For a clinical employee (`is_clinical`) in a clinical unit, conditions 1 to 4 of HR spec 5.5 must hold on the date: status, a `valid` registration (STR) of their profession, a `valid` practice permit (SIP) at the unit's facility, and an `active` SPK of that facility that covers the unit. The answer names the failing condition (`employment`, `str`, `sip`, `spk`, `HR-ELG-002`; 422 `not_eligible` with `failed`). The derivation is a service of this group, **`EligibilityService.general`**, built here instead of in group 6, and group 6 later adds the endpoint and condition 5 (the privilege). Nothing is cached (`HR-ELG-001`). | **Needs your answer.** |
| RA12 | **Overlap and rest (`HR-ROS-010`, `011`).** Read from the employee's `planned` assignments of every roster of the tenant, by instants. The rest between two shifts must be at least `MIN_REST_HOURS` (422 `overlap`, `rest_too_short`). An `off` shift has no instants and never conflicts. | As stated. |
| RA13 | **Weekly hours and overtime (`HR-ROS-012`, `013`).** The week is Monday to Sunday of the assignment's date. Regular working time is the sum of the `paid_minutes` of the week's `planned` assignments, on-call shifts included at the paid minutes HR entered (the on-call counting rule is open, Q6). The part above `MAX_WEEKLY_HOURS` is overtime. Overtime is allowed only with the employee's documented consent on the assignment (`overtime.consent`, set by the caller) and up to `MAX_OVERTIME_HOURS_WEEK` (422 `overtime_consent_required`, `overtime_limit_exceeded`). **The daily overtime limit (`MAX_OVERTIME_HOURS_DAY`) is not checked**: the business spec does not say what counts as a day's regular time, and I propose to leave it open instead of guessing. | **Needs your answer.** |
| RA14 | **Night shifts (`HR-ROS-015`).** Counts the run of consecutive days with a `planned` night shift (`is_night`) around the new one; more than `MAX_CONSECUTIVE_NIGHTS` answers 422 `too_many_nights`. | As stated. |
| RA15 | **Rest day (`HR-ROS-014`) and coverage (`HR-ROS-020` to `022`)** are checked by `validate` only, because a half-filled roster would break them at every step. A rest day is a date with an `off` assignment; 7 consecutive days are all the windows inside the roster's period and the days before it that already have assignments. | As stated. |
| RA16 | **Validate answers, never blocks.** `POST /rosters/:id/validate` runs the rules on the whole roster and answers `{ violations, coverageGaps, summary }`: each violation names the rule, the employee, the date and the failing condition, never a name; each gap names the date, the shift and the requirement. It stores only the summary on the roster (`validation.checked_at`, `violations`, `coverage_gaps`; the details are recomputed). It writes one log entry with the counts. | As stated. |
| RA17 | **The gate (`HR-ROS-021`, in PR B).** `submit` of 5.4, and `publish` when approval is not required, re-validate the roster: any violation answers 422 `roster_invalid`. A coverage gap answers 422 `coverage_gaps` unless every gap has an override. The overrides are accepted by the holder of `workforce.roster:override` with a reason, one per date, shift and requirement (409 `override_exists`), and appear in the validation answer. The roster's own `validation` summary is refreshed by every gate. | **Needs your answer.** |
| RA18 | **Coverage (`HR-ROS-020`, `022`).** For each day, shift and active requirement of the unit that applies on that day (`period`, `day_pattern`: `weekdays` is Monday to Friday, `weekends_holidays` is Saturday, Sunday and the days of the facility's holiday calendars), the number of `planned` assignments whose employee matches the requirement's criteria must reach `min_count`. A team leader requirement needs exactly one assignment with the role `team_leader` who meets the profession and the level (`level` is compared by the rank of the concept). Weekends are Saturday and Sunday for every facility until a parameter says otherwise (the open point of CR3). Closed units are not checked. | As stated. |
| RA19 | **Revision.** A change to a `published` roster (add, change, cancel) increases `roster.revision` by 1 and stamps the assignment with the new revision; changes to a draft do not. The change history keeps the earlier versions (`HR-ROS-042`). The roster and the assignment change in one transaction. | As stated. |
| RA20 | **Cancel.** Sets `status` to `cancelled`; nothing is deleted. A cancelled assignment no longer counts in any check and leaves room for a new one (RA9). | As stated. |
| RA21 | **The past.** An assignment whose date is before today in the facility's zone cannot be added, changed or cancelled (422 `assignment_in_past`), except by a holder of `workforce.roster:correct-past` with a reason (`HR-ROS-041`, for the attendance correction of 9.3, which is not built). | As stated. |
| RA22 | **On duty (`GET /units/:id/on-duty`).** Answers the `planned` assignments of a unit whose `starts_at` is on or before the moment and `ends_at` after it (`at` defaults to now), with the role, and never an assignment of an unpublished roster. An assignment with an unresolved flag is not on duty (`HR-ROS-031`; there are none until RA3). Query: `at`. | As stated. |
| RA23 | **My roster (`GET /employees/me/roster`).** Needs a sign-in and a linked employee (403 `employee_required`), answers the employee's own `planned` assignments of `published` and `closed` rosters between `from` and `to` (at most 62 days, 422 `invalid_range`), ordered by date. No permission is needed (D2). | As stated. |
| RA24 | **Changes and logs.** The repository records every write in the change history. Each write logs one entry (`assignment_add`, `assignment_change`, `assignment_cancel`, `roster_validate`, `coverage_override`) with the error class and the workforce `code` on failure and never an employee, a date or a reason. Reads write no log entry. No events and no notifications on a change (HR spec 8.4.3 asks to notify affected employees; that arrives with the notification service). | As stated. |

## 4. Repositories

- `RosterAssignmentRepository` (`roster_assignments`): `findByRoster(tenantId, rosterId, query)`, `findByEmployeeBetween(tenantId, employeeId, from, to)` (the working-time checks), `findOnDuty(tenantId, unitId, at)`, `findByEmployeeAndDate(tenantId, rosterId, employeeId, date)` and `findActiveByShift(tenantId, shiftId, limit)` for the `shift_in_use` check of 5.1 (RA25 below), plus the base methods. Indexes (collection design): `{ tenant_id, employee_id, starts_at }`, `{ tenant_id, roster_id, date }`, `{ tenant_id, unit_id, status, starts_at, ends_at }` and the partial `{ tenant_id, unit_id, is_flagged }`. Updatable fields: `shift`, `starts_at`, `ends_at`, `role`, `status`, `change_reason`, `revision`, `overtime`, `flag`, `is_flagged`. The roster, unit, facility, employee and date never change.
- `RosterRepository` gets two updatable fields it already has in its model: `validation` and `coverage_overrides` (5.4 left them out of `updatableFields`).
- A transaction covers the assignment write, the roster revision and, in a published roster, nothing else (`database.md` 7).

**RA25 (follow-up of 5.1 SH9).** Retiring a shift is refused with 409 `shift_in_use` also while an `open` roster (`draft`, `submitted`, `approved`, `published`) holds a `planned` assignment of it. This ships in PR A, with the assignment repository.

## 5. Code structure

```
apps/back-end/apps/
├── repository/{token.ts, interface/roster-assignment.ts}
├── repository/mongo/{roster-assignment.ts, roster-assignment.module.ts, schema/roster-assignment.ts} (+ spec)
├── workforce/rostering/{assignment.service.ts, assignment-rules.ts}    add, change, cancel, list; the instants and the week
├── workforce/rostering/{working-time.ts}                               HR-ROS-010 to 016 as pure functions on a list of shifts
├── workforce/rostering/{validation.service.ts, coverage.ts}            validate, overrides and the coverage count (PR B)
├── workforce/rostering/{duty.service.ts}                               on-duty and my roster (PR B)
├── workforce/eligibility/{eligibility.service.ts}                      general clinical eligibility (RA11)
├── workforce/rostering/roster.service.ts                               the gate on submit and publish (PR B)
├── identity/permission.ts                                              the four new permissions
└── gateway_hr/src/roster-assignment/                                   controller, DTOs, module, gateway test
```

## 6. Tasks and pull requests

| PR | Kind | Content |
|---|---|---|
| A | Docs | This plan, the master plan row and the endpoint note (branch `docs/workforce-roster-assignments-plan`). |
| B1 | Code | The assignment repository, `EligibilityService.general`, the working-time rules (`HR-ROS-001`, `002`, `010`, `011`, `012`, `013`, `015`, `016`), add, change and cancel in a draft, the assignment list and the `shift_in_use` check for open rosters (RA25). |
| B2 | Code | Changes after publication (RA5, RA19, RA21): the reason, the revision and the past. |
| B3 | Code | `validate`, the coverage count, the overrides, the gate on `submit` and `publish`, the on-duty query and `GET /employees/me/roster` (RA15 to RA18, RA22, RA23). |
| C | Docs | After each code PR as needed: a short "in progress" row update, then the "built" docs PR (`workforce.md`, `hr-endpoints.md` with the endpoints moved to 5.6 and later, this plan's status, the master plan counts). |

Tests come first. The working-time rules are pure functions and are tested case by case (overlap at the boundary, a rest of exactly `MIN_REST_HOURS`, a week that crosses a month, an overnight shift on the last day of the week, a night run of exactly the limit, DST in a zone that has it). Services are tested with the in-memory repositories (every rejection, both statuses of a roster, tenant isolation, stale version, reads write no log, writes log no employee or date), and the gateway (401, 403, 404, 409, 422, validation, list limits). Checks: `tsc`, `oxlint`, full `vitest` and `nest build gateway_hr`, run from `apps/back-end` under Node 22 (`pnpm` does not start on this machine).

## 7. Review focus

1. Every instant is computed in the facility's zone and no check compares local times across zones.
2. An assignment never changes its employee or its date, and a cancelled one never counts.
3. The checks read the employee's assignments in every roster (`HR-ROS-016`), not only this roster's.
4. A published roster changes only with a reason and a new revision; a closed roster and the past never change.
5. `validate` never blocks by itself; the gate on `submit` and `publish` is the only place that refuses a roster.
6. Logs and answers carry no names; violations are codes with an employee identifier and a date.

## 8. Decisions that needed your answer

Confirmed as proposed: all of RA1 to RA25 and the three code PRs. These five changed the shape of the work most:

- **RA5** (a roster in `submitted` or `approved` is frozen; a `published` one changes only with a reason and a new revision; a change in the past needs a special permission and a reason).
- **RA11** (general clinical eligibility is built here as a service, ahead of group 6, so `HR-ROS-002` can be enforced now).
- **RA13** (weekly overtime needs consent on the assignment and stays under the weekly limit; the daily overtime limit is not checked because the business spec does not define a day's regular time).
- **RA17** (the gate: `submit` and `publish` re-validate; violations always block, coverage gaps block unless overridden).
- **RA2, RA3 and RA4** (the roster CSV import moves to 5.6, the flags and `resolve-flag` move to the worker group, and the pre-fill and rotation patterns are not built). This changes the endpoint counts: 5.5 becomes 8 endpoints, 5.6 becomes 4.

Open, not decided here: which weekdays "weekends" are in other countries (CR3), how on-call time counts toward weekly hours (Q6) and the definition of a day's regular time for the daily overtime limit. The others are as stated.
