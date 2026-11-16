# gateway_hr 5.3: Coverage requirements

Status: **Proposed** (2026-11-16). Decisions CR1 to CR16 are proposals for you to confirm or change (section 7). Part of `2026-11-10-gateway-hr-plan.md` (walkthrough order 19). Endpoints: `../hr-endpoints.md` 5.3. Collection: `../human-resource-collections.md` 5.3 (`coverage_requirements`). Business rules: `../../business/administrative-operational-system/human-resource-management.md` 8.2 (Coverage Requirement), `HR-ROS-020` to `HR-ROS-022` (the checks that read these records) and the role matrix row "Shift definitions and coverage requirements". Model: `apps/back-end/apps/repository/model/coverage-requirement.ts` (exists, with its classification). Rules every endpoint follows: `../../rules/back-end/workforce.md` 3. Built references: shift definitions (5.1: a record under a facility and its units, retiring is final, and its not-built note `shift_in_use`), privilege catalog (4.1: codings checked with `assertActive`, `minClinicalLevel`), positions (1.5: a record under a unit), holiday calendars (5.2).

A coverage requirement is the minimum staffing of one unit for one shift: "ICU, shift M, every day: at least 3 nurses of level PK2 or higher, one of them team leader". Rosters (group 5.4) count the people assigned to each shift of each day and report a gap when a requirement is not met (`HR-ROS-020`); a gap blocks submitting the roster unless the approver records an override (`HR-ROS-021`). This group only defines and maintains the requirements; checking rosters against them is 5.4.

It is small and like 5.1: four endpoints, one repository, one service, one code PR. It also adds the check that 5.1 promised: a shift that an active requirement uses cannot be retired (`shift_in_use`).

## 1. The four endpoints

| Endpoint | Behaviour |
|---|---|
| `GET /v1/coverage-requirements` | Lists requirements. Query: `unitId`, `shiftId`, `status`, `dayPattern`, `onDate` (requirements whose period covers that date), `limit`, `offset`. Ordered by unit, shift, then period start. Writes no log entry. |
| `POST /v1/coverage-requirements` | Adds a requirement. Body: `unitId`, `shiftId`, `dayPattern`, `match` (optional criteria), `minCount`, `teamLeaderRequired`, `period` (`start`, optional `end`), optional `reason`. |
| `PATCH /v1/coverage-requirements/:id` | Edits a requirement (what can change depends on whether it has started, CR8). Optional `version`, `reason`. |
| `POST /v1/coverage-requirements/:id/retire` | Stops checking a requirement. Final. Optional `version`, `reason`. |

Permissions (new): `workforce.coverage-requirement:read` (the list) and `workforce.coverage-requirement:write` (add, edit, retire).

## 2. Rules and decisions to confirm

| # | Rule or decision | Proposed |
|---|---|---|
| CR1 | **Unit and shift.** A requirement belongs to one unit and one shift, both fixed after creation. The unit must exist in the tenant, be `active` and not deleted (422 `unit_not_found`, `unit_closed`; a foreign, missing and deleted unit give one answer). The shift must exist in the tenant, be `active` (422 `shift_not_found`, `shift_retired`), belong to the unit's facility (422 `shift_outside_facility`) and be usable by the unit: its unit list is empty or holds the unit (422 `shift_unit_not_allowed`). Any unit may have requirements, clinical or not. | As stated. |
| CR2 | **Shifts that can be counted.** A requirement needs a shift people work: `regular`, `on_call_onsite` or `on_call_remote`. An `off` shift has no staff to count (422 `shift_not_countable`). | As stated. |
| CR3 | **Day pattern.** `all`, `weekdays` or `weekends_holidays` (422 `invalid_day_pattern`). Which days these are is decided when rosters are checked (5.4): this group stores the pattern and does not read the calendars. | As stated. |
| CR4 | **Who counts (`match`).** Four optional criteria: workforce category, profession, specialty and minimum clinical level, each a `Coding` checked with `assertActive` against its code system (the category from a `…workforce-category` system, the profession from `…profession`, the specialty from `…specialty`, the level from `…clinical-level`; 422 `invalid_category`, `invalid_profession`, `invalid_specialty`, `invalid_clinical_level`). An unset criterion matches anyone, so a requirement with no criteria counts every assigned employee. The level means "this level or higher", compared by rank when rosters are checked (5.4). | As stated. |
| CR5 | **Count.** `minCount` is a whole number from 1 to 99 (422 `invalid_min_count`). A requirement of 0 is not a requirement: it is not stored. | As stated. |
| CR6 | **Team leader.** `teamLeaderRequired` is true or false (default false). When true, exactly one counted person in the shift must hold the role `team_leader` (`HR-ROS-022`); that is checked with the roster (5.4). Nothing is checked about the criteria here, so a team leader requirement with no criteria is allowed. | As stated. |
| CR7 | **Period.** `period.start` is a local date (`YYYY-MM-DD`, from 2000-01-01); `period.end` is empty (open-ended) or a date on or after the start (422 `invalid_period`). Dates are read in the unit's facility's zone when rosters are checked; nothing is converted here (`database.md` 4.4). A start in the past is allowed, so rules that already apply can be entered. | As stated. |
| CR8 | **Edit.** `PATCH` can change `dayPattern`, `match`, `minCount`, `teamLeaderRequired` and `period.end`, never the unit, the shift or `period.start`. At least one field is needed (422 `empty_update`). **A requirement that has started** (its `period.start` is today or earlier in the facility's zone) can change **only `period.end`**; any other field answers 422 `requirement_in_force`. A change to what a requirement means is made by ending it (`period.end`) and adding a new one that starts later, so the roster checks of past dates do not change (rosters recompute their checks, `human-resource-collections.md` 5.4). A requirement that has not started can change freely. A retired requirement cannot be edited (422 `requirement_retired`). Optional `version` (409 `stale_version`). | **Needs your answer.** |
| CR9 | **No duplicates.** Two `active` requirements of the same unit, shift and day pattern with the same `match` (every criterion equal, unset equal to unset) and overlapping periods are refused (409 `requirement_exists`). Requirements with different `match` criteria, for example nurses and one doctor, apply together. The check reads then writes, so two simultaneous requests can both pass (the same limit as 3a). | As stated. |
| CR10 | **Retire.** Final: a retired requirement is not checked at all, for any date, and cannot be edited or reactivated (422 `requirement_retired` on a second retire). Retiring is for a requirement entered by mistake; one that stops applying from a date is ended with `period.end` (CR8). Retired requirements stay in the list (`status=retired`). | As stated. |
| CR11 | **A shift in use cannot be retired (`shift_in_use`).** Group 5.1 promised this check (SH9): `POST /v1/shift-definitions/:id/retire` answers 409 `shift_in_use` while an `active` coverage requirement uses the shift, whatever its period. Open rosters are added by 5.4. This changes the shift service and its tests in the same code PR. | As stated. |
| CR12 | **Closed units and retired shifts.** Closing a unit does not touch its requirements and is not blocked by them; the roster checks ignore a unit that is closed (5.4). The shift check of CR11 keeps a retired shift from having an active requirement. Nothing else is cascaded. | As stated. |
| CR13 | **Reads.** The list is tenant-wide and filters by `unitId`, `shiftId`, `status` (`active` or `retired`), `dayPattern` and `onDate` (`period.start` on or before the date and `period.end` empty or on or after it). A malformed id answers an empty list; `limit` is 1 to 100 and the default applies when it is missing. | As stated. |
| CR14 | **Permissions.** Read and write are tenant-wide until scoped permissions exist, so any holder of `workforce.coverage-requirement:write` can change any unit's requirements. The business matrix gives HR Manager (and HR Admin to view) the right to define them and the Head of Unit the right for their own unit; the own-unit limit comes with scoped permissions. | As stated. |
| CR15 | **Changes and logs.** The repository records every write in the change history; an optional `reason` goes with it. Each write logs one entry (`coverage_create`, `coverage_update`, `coverage_retire`) with the error class and the workforce `code` on failure and never a code, a count or a date. Reads write no log entry. No events, no notifications. | As stated. |
| CR16 | **Tenant, ids and no delete.** `tenant_id` always from `@CurrentUser()`; a foreign, missing or malformed id gives the same 404 (`requirement_not_found`); in a body it gives 422. Nothing is deleted. | As stated. |

## 3. Repository

`CoverageRequirementRepository` (`coverage_requirements`): `findByFilter(tenantId, query)` (`unitId`, `shiftId`, `status`, `dayPattern`, `onDate`, `limit`, `offset`; ordered by unit, shift and period start), `findActiveByShift(tenantId, shiftId, limit)` for CR11, and `findActiveByUnitAndShift(tenantId, unitId, shiftId)` for CR9, plus the base methods. Indexes: `{ tenant_id, unit_id, status }` (collection design); `{ tenant_id, shift_definition_id, status }` for CR11. Updatable fields: `day_pattern`, `match`, `min_count`, `team_leader_required`, `period`, `status`. The unit and the shift never change. The in-memory fake applies the same rules.

## 4. Code structure

```
apps/back-end/apps/
├── repository/{token.ts, interface/coverage-requirement.ts}
├── repository/mongo/{coverage-requirement.ts, coverage-requirement.module.ts, schema/coverage-requirement.ts} (+ spec)
├── workforce/rostering/{coverage.service.ts, coverage-rules.ts} (+ specs)   the service and the match, count and period checks
├── workforce/rostering/shift.service.ts                                      retire refuses a shift in use (CR11)
├── workforce/testing/in-memory.ts                                            the fake
├── identity/permission.ts                                                    workforce.coverage-requirement:read, :write
└── gateway_hr/src/coverage/                                                  controller, DTOs, module, gateway test
```

`gateway_hr/src/testing/in-memory-workforce.ts` registers the repository.

## 5. Tasks and pull requests

| PR | Kind | Content |
|---|---|---|
| A | Docs | This plan, the master plan row and the endpoint note (branch `docs/workforce-coverage-plan`). |
| B | Code | The repository, the service, the permissions, the controller, the `shift_in_use` check and the tests (branch `feat/workforce-coverage-requirements`). |
| C | Docs | After the code PR: a small "build in progress" docs PR for the master plan row, then the "built" docs PR (`workforce.md`, `hr-endpoints.md`, this plan's status, and the 5.1 notes about `shift_in_use`). |

Tests come first: repository (indexes, tenant isolation, no `_id`, one change record per write, the unit and shift never change), service (every rejection above, tenant isolation, stale version, the in-force rule of CR8, the overlap rule of CR9, reads write no log, writes log no values), the shift retire check (CR11: refused while an active requirement exists, allowed after it is retired) and gateway (401, 403, 404, 409, 422, validation, list limits, `onDate`). Checks: `tsc`, `oxlint`, full `vitest` and `nest build gateway_hr`, run from `apps/back-end` under Node 22 (`pnpm` does not start on this machine).

## 6. Review focus

1. A requirement's unit and shift never change, and the shift belongs to the unit's facility and may be used by the unit.
2. A requirement that has started cannot be rewritten, only ended, so past roster checks stay the same.
3. Only active units, active shifts and active codes are accepted; an `off` shift never has a requirement.
4. A shift with an active requirement cannot be retired.
5. Logs carry no codes, counts or dates, and responses carry no `_id`.

## 7. Decisions that need your answer

All of CR1 to CR16 are proposals. These four change the shape of the work most, so I would like an explicit answer:

- **CR8** (a requirement that has started can only be ended with `period.end`; a changed rule is a new requirement. The alternative is to let it be edited freely, which silently changes how past rosters are checked).
- **CR9** (identical requirements with overlapping periods are refused; different criteria apply together).
- **CR11** (retiring a shift is refused while an active requirement uses it, and it ships in this PR).
- **CR1 and CR2** (the shift must belong to the unit's facility, be usable by the unit, and not be an `off` shift).

Also open, not decided here: which weekdays "weekends" means in other countries (CR3: left to the roster check in 5.4). The others are proposed as stated.
