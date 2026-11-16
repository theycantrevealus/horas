# gateway_hr 5.1: Shift definitions

Status: **Built** (2026-11-16, PR #74 merged). Decisions confirmed as proposed, with the note in section 8. Decisions SH1 to SH15 and the single code PR confirmed as proposed. Part of `2026-11-10-gateway-hr-plan.md` (walkthrough order 17). Endpoints: `../hr-endpoints.md` 5.1. Collection: `../human-resource-collections.md` 5.1 (`shift_definitions`). Business rules: `../../business/administrative-operational-system/human-resource-management.md` 8.2 (Shift Definition), 8.5 (`HR-ROS-010` to `HR-ROS-015` use the shift data) and open question Q6 (on-call time). Model: `apps/back-end/apps/repository/model/shift-definition.ts` (exists, with its classification). Rules every endpoint follows: `../../rules/back-end/workforce.md` 3. Built references: privilege catalog (4.1: a code that is unique, fixed and never reused, retiring is final), positions (1.5: a record under a facility and its units), facilities and units (1.2, 1.4), shared checks (`structure/localized-texts.ts`, `structure/codes.ts`).

A shift definition is a shift a facility uses in its rosters: `P` (pagi), `S` (siang), `M` (malam), `L` (libur, a day off), `ND` (an office day with no shift). It carries the local start and end time, the paid minutes and whether it is a night shift. Rosters (group 5.4) assign employees to these shifts, and the working-time rules (`HR-ROS-011` to `HR-ROS-015`) read their times, paid minutes and night flag. This group only defines and maintains the shifts; assigning them is later.

It is the first group of the rostering block and is small: four endpoints, one repository, one service, built in one code PR (like the privilege catalog in 4.1).

## 1. The four endpoints

| Endpoint | Behaviour |
|---|---|
| `GET /v1/shift-definitions` | Lists shifts. Query: `facilityId`, `status`, `type`, `unitId` (shifts that unit may use: the shift lists the unit or lists none), `limit`, `offset`. Ordered by facility, then code. Writes no log entry. |
| `POST /v1/shift-definitions` | Defines a shift. Body: `facilityId`, `code`, `name` (texts per language), `type`, `startTime`, `endTime`, `paidMinutes`, `isNight`, `unitIds` (optional), optional `reason`. |
| `PATCH /v1/shift-definitions/:id` | Edits a shift: `name`, `startTime`, `endTime`, `paidMinutes`, `isNight`, `unitIds`. Optional `version`, `reason`. |
| `POST /v1/shift-definitions/:id/retire` | Stops a shift from being assigned. Final. Optional `version`, `reason`. |

Permissions (new): `workforce.shift-definition:read` (the list) and `workforce.shift-definition:write` (define, edit, retire).

## 2. Rules and decisions to confirm

| # | Rule or decision | Proposed |
|---|---|---|
| SH1 | **Facility.** A shift belongs to one facility, which must exist in the tenant and be `active` (422 `facility_not_found`, `facility_inactive`; a foreign, missing and deleted facility give one answer). The facility is fixed after creation. | As stated. |
| SH2 | **Code.** Trimmed and upper-cased, 1 to 8 letters or digits (`P`, `ND`, `M2`). Unique per facility, retired shifts included, so a code is never reused for a different shift (409 `shift_exists`). The code is fixed after creation. | As stated. |
| SH3 | **Name.** Texts per language, checked with the shared `normalizeLocalizedTexts` (at least one text, no repeated language, bounded length). | As stated. |
| SH4 | **Type and times.** The type is `regular`, `on_call_onsite`, `on_call_remote` or `off` and is fixed after creation (coverage rules and rosters rely on its meaning). `off` has no times (`startTime` and `endTime` must be missing or `null`), `paidMinutes` 0 and `isNight` false. The other types need `startTime` and `endTime` as `HH:mm` (`00:00` to `23:59`). An end earlier than the start means the next day. Equal start and end answer 422 `invalid_times` (a shift of 24 hours is not allowed). Times are local times of the facility (`database.md` 4.4): nothing is converted or stored as an instant here. | As stated. |
| SH5 | **Paid minutes.** A whole number from 0 up to the length of the shift (422 `paid_exceeds_duration`); a `regular` shift needs more than 0 (422 `paid_required`). On-call shifts may be paid for fewer minutes than they last, or 0. How on-call time counts toward weekly hours and overtime is open question Q6 and is not decided here: the number HR enters is what the working-time rules will read. | As stated. |
| SH6 | **Night flag.** `isNight` is entered by HR and is independent of the times: it is the flag `MAX_CONSECUTIVE_NIGHTS` (`HR-ROS-015`) counts. A shift that crosses midnight is not forced to be a night shift. | As stated. |
| SH7 | **Units.** `unitIds` lists the units that may use the shift; empty means every unit of the facility. Each unit must exist in the tenant, be `active` and belong to the shift's facility (422 `unit_not_found`, `unit_closed`, `unit_outside_facility`; a foreign and a missing unit give one answer), without repeats and at most 100 (422 `invalid_units`, `duplicate_unit`). | As stated. |
| SH8 | **Edit.** `PATCH` replaces the fields that are sent and keeps the rest, then checks the whole shift again (SH4 to SH7). At least one field is needed (422 `empty_update`). The facility, the code and the type are not in the body. A retired shift cannot be edited (422 `shift_retired`). Optional `version` (409 `stale_version`). Past assignments keep their own copy of the times (group 5.4), so an edit never changes a published roster. | As stated. |
| SH9 | **Retire.** Final: a retired shift cannot be assigned, edited or reactivated (422 `shift_retired` on a second retire, an edit or a later reactivation); a shift that is needed again is defined with a new code. Retired shifts stay in the list (`status=retired`). Refusing to retire a shift that an active coverage requirement or an open roster still uses (409 `shift_in_use`) is added by groups 5.3 and 5.4, which own those records. | As stated. |
| SH10 | **Reads.** The list is tenant-wide and filters by `facilityId`, `status` (`active` or `retired`), `type` and `unitId`. `unitId` keeps the shifts of that unit's facility whose unit list is empty or holds the unit. A malformed id answers an empty list; the `limit` is 1 to 100 and the default applies when it is missing. | As stated. |
| SH11 | **Permissions.** Read and write are tenant-wide until scoped permissions exist, so any holder of `workforce.shift-definition:write` can change any facility's shifts (a Head of Unit's own-unit limits come later). | As stated. |
| SH12 | **Starter shifts.** No shifts are created for you. HR defines the shifts of each facility (`P`, `S`, `M`, `L`, `ND` and the like). A set of starter shifts per facility could be offered later, like the code bundles of 1.3; it is not part of this group. | Not built. |
| SH13 | **Changes and logs.** The repository records every write in the change history; an optional `reason` goes with it. Each write logs one entry (`shift_create`, `shift_update`, `shift_retire`) with the error class and the workforce `code` on failure and never a name, code or time. Reads write no log entry. No events, no notifications. | As stated. |
| SH14 | **Tenant and ids.** `tenant_id` always from `@CurrentUser()`; a foreign, missing or malformed id gives the same 404 (`shift_not_found`); in a body it gives 422. Nothing is deleted. | As stated. |
| SH15 | **One facility per shift, no sharing.** A group that wants the same `P` in several facilities defines it in each: shifts are per facility (collection design 5.1 has a `facility_id`). Sharing across a facility group is not built. | As stated. |

## 3. Repository

`ShiftDefinitionRepository` (`shift_definitions`): `findByFilter(tenantId, query)` for the list (`facilityId`, `status`, `type`, `allowsUnitId`, `limit`, `offset`; ordered by facility and code) and `findByCode(tenantId, facilityId, code)`, plus the base methods. Indexes: `{ tenant_id, facility_id, code }` unique (SH2); `{ tenant_id, facility_id, status }`; `{ tenant_id, unit_ids }`. Updatable fields: `name`, `start_time`, `end_time`, `paid_minutes`, `is_night`, `unit_ids`, `status`. The facility, the code and the type never change. The in-memory fake applies the same unique rule.

## 4. Code structure

```
apps/back-end/apps/
├── repository/{token.ts, interface/shift-definition.ts}
├── repository/mongo/{shift-definition.ts, shift-definition.module.ts, schema/shift-definition.ts} (+ spec)
├── workforce/rostering/{shift.service.ts, shift-rules.ts} (+ specs)     the service and the time and code checks
├── workforce/testing/in-memory.ts                                        the fake
├── identity/permission.ts                                                workforce.shift-definition:read, :write
└── gateway_hr/src/shift/                                                 controller, DTOs, module, gateway test
```

`gateway_hr/src/testing/in-memory-workforce.ts` registers the repository.

## 5. Tasks and pull requests

| PR | Kind | Content |
|---|---|---|
| A | Docs | This plan, the master plan row and the endpoint note (branch `docs/workforce-shifts-plan`). |
| B | Code | The repository, the service, the permissions, the controller and the tests (branch `feat/workforce-shift-definitions`). |
| C | Docs | After the code PR: a small "build in progress" docs PR for the master plan row, then the "built" docs PR (`workforce.md`, `hr-endpoints.md`, this plan's status). |

Tests come first: repository (indexes, tenant isolation, no `_id`, one change record per write, unique code), service (every rejection above, tenant isolation, stale version, reads write no log, writes log no values, the time arithmetic of SH4 and SH5 including a shift that crosses midnight) and gateway (401, 403, 404, 409, 422, validation, list limits). Checks: `tsc`, `oxlint`, full `vitest` and `nest build gateway_hr`, run from `apps/back-end` under Node 22 (`pnpm` does not start on this machine).

## 6. Review focus

1. A shift's code, facility and type never change, and a code is never reused.
2. Times and paid minutes are consistent: no equal start and end, an overnight shift lasts the right number of minutes, paid minutes never exceed it, `off` carries no time.
3. A unit of another facility, a closed unit or a foreign unit cannot be listed on a shift.
4. A retired shift cannot be changed or brought back.
5. Logs and responses carry no names, codes or times in the logs, and responses carry no `_id`.

## 7. Decisions that needed your answer

Confirmed as proposed: all of SH1 to SH15. These four changed the shape of the work most:

- **SH2** (a 1 to 8 character code, unique per facility and never reused, retired shifts included).
- **SH4** (the type is fixed after creation; `off` has no times and no paid minutes; equal start and end are refused).
- **SH5** (paid minutes between 0 and the shift's length, more than 0 for a regular shift; on-call counting stays open as Q6).
- **SH7** (a shift's units must be active units of the same facility; empty means every unit).

The others are as stated.

## 8. Build notes

- Built in one code PR (#74): repository, service, permissions, controller and tests, as planned.
- **Deviation from SH8.** An edit rechecks the units (active, same facility, no repeats) only when `unitIds` is sent. SH8 said the whole shift is checked again; a shift whose unit was closed later can therefore still have its times or name edited without touching the unit list. The times, paid minutes and night flag are always rechecked together.
- The facility is checked (SH1) at creation only, so a shift of a facility set inactive later can still be edited or retired.
- `shift_in_use` (SH9): the part for coverage requirements was built in 5.3 (PR #83); the part for open rosters is added by 5.4.
- The in-memory transaction fake cannot roll back, so tests check results, not a failure inside a transaction.
