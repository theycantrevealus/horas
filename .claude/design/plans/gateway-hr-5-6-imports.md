# gateway_hr 5.6: Imports

Status: **Confirmed** (2026-11-18). Decisions IM1 to IM20 and the two code PRs (B1, B2) confirmed as proposed, including the dropped generic apply. Part of `2026-11-10-gateway-hr-plan.md` (walkthrough order 22). Endpoints: `../hr-endpoints.md` 5.6 (moved here from 5.5 by RA2). Collection: `../human-resource-collections.md` 5.9 (`hr_imports`) and its "Rules for the roster CSV". Business rules: `../../business/administrative-operational-system/human-resource-management.md` 8.4.1 (the import step), 8.5 (every rule applies to an imported assignment) and the parameters `IMPORT_MAX_ROWS` and `IMPORT_MAX_ERRORS`. Models: `apps/back-end/apps/repository/model/hr-import.ts` (built with 5.2). Built references: holiday calendars (5.2: the CSV reader, the check-then-apply flow, the `hr_imports` repository and the `text/csv` body parser), roster assignments (5.5: every rule an imported row must follow, `RosterAssignmentService`, `RosterValidationService`).

An import loads many assignments into a draft roster from a CSV file: one row per assignment (`employee_number`, `date`, `shift_code`, optionally `role`). The file is **checked first** as a whole, every rule of HR spec 8.5 is run on it, and nothing is written until the user applies it. A bad file changes nothing. 5.2 built the same flow for holiday calendars; this group builds it for rosters and the two reads every import needs (view and cancel).

## 1. A change to the endpoint list that needs your answer

`hr-endpoints.md` lists four endpoints: the roster CSV check, `GET /hr-imports/:id`, `POST /hr-imports/:id/apply` and `POST /hr-imports/:id/cancel`. The generic **apply** has no body, so it can only work if the parsed rows are stored. 5.2 decided not to store files or rows (D3 and HC11): to apply, the client sends the same file again with the id of its check, and the service compares the SHA-256 hashes. The holiday import already works that way.

I propose the same for rosters, so **`POST /hr-imports/:id/apply` is not built**: the roster import is one route with a check and an apply, like the holiday one (`POST /v1/rosters/:id/imports`, query `apply`, `checkId`). That leaves three endpoints (IM1). The alternative, storing the rows in the import record, makes apply a one-id call but keeps employee numbers and dates in a second collection and needs a new field in `hr_imports`.

## 2. The three endpoints

| Endpoint | Behaviour |
|---|---|
| `POST /v1/rosters/:id/imports` | Checks a roster CSV (`text/csv` body, at most 512 KB) and records an import; with `apply=true&checkId=<id>` and the same file again, applies it. Query: `apply`, `checkId`, `version`, `reason`. Answers the import record with its counts and row errors. |
| `GET /v1/hr-imports/:id` | Views one import (any kind, roster or holiday): status, counts, row errors, who and when. Writes no log entry. |
| `POST /v1/hr-imports/:id/cancel` | Discards a checked import so it can no longer be applied. Optional `version`, `reason`. |

Permissions (new): `workforce.roster:import` (the roster route), `workforce.hr-import:read` and `workforce.hr-import:cancel`.

## 3. The file

| Column | Meaning |
|---|---|
| `employee_number` | The employee's number (unique in the tenant). |
| `date` | `YYYY-MM-DD`, the date the shift starts, inside the roster's period. |
| `shift_code` | The code of a shift of the roster's facility. |
| `role` | Optional: `staff` (default), `team_leader`, `supervisor` or `dpjp_on_call`. |
| `overtime_consent` | Optional: `yes` or `no` (default `no`), the employee's consent to overtime on that row (IM9). |

UTF-8, comma separated, a header row, then one row per assignment. Any other column is refused (422 `invalid_header`), as for holidays.

## 4. Rules and decisions to confirm

| # | Rule or decision | Proposed |
|---|---|---|
| IM1 | **Scope.** Three endpoints. `POST /hr-imports/:id/apply` is not built: applying is the same route as checking, with the file sent again (section 1). | **Needs your answer.** |
| IM2 | **Draft rosters only.** The roster must be a `draft` (422 `roster_locked` for `submitted`, `approved` and `published`, `roster_closed` for `closed`). Changes to a published roster stay one at a time with a reason (5.5). | As stated. |
| IM3 | **File limits and errors.** The same reader as the holiday import (`readCsv`): a file that is empty, not UTF-8, not a valid CSV or has no rows answers 422 (`empty_file`, `invalid_encoding`, `invalid_csv`, `no_rows`) and records nothing; a body that is not text answers 422 `csv_required`; more than `IMPORT_MAX_ROWS` rows (default 5,000) answers 422 `too_many_rows`. At most `IMPORT_MAX_ERRORS` row errors are kept. A row error is a row number, a column and a code, **never a cell value**: employee numbers are not written to the record or the log. | As stated. |
| IM4 | **Row checks.** Each row is checked as if it were added one at a time with `POST /rosters/:id/assignments` (5.5 RA5 to RA14): the employee exists (by number) and is on `probation` or `active`; the shift exists in the roster's facility, is active and usable by the unit; the date is in the period and **not in the past**; the role is valid; a clinical employee in a clinical unit is generally clinically eligible on the date. The codes are those of 5.5 (`employee_not_found`, `employee_not_assignable`, `shift_not_found`, `shift_retired`, `shift_unit_not_allowed`, `date_outside_period`, `assignment_in_past`, `invalid_role`, `not_eligible_*`), plus `invalid_date`, `invalid_shift_code` and `invalid_consent` for cells that are not of the right form. No `reason` or correct-past permission applies to an import. | As stated. |
| IM5 | **Whole-file working time (`HR-ROS-010` to `013`, `015`, `016`).** The rows are checked **together with the assignments already in the roster and the employee's assignments in every other roster and unit**: each row is checked against the employee's planned assignments that come earlier (date, start, then file order), plus the rows of the file accepted before it, so each clash is reported once, on the later row. A row that repeats an employee and a date of the file, or one that exists already as a planned assignment of the roster, is an error (`duplicate_row`, `assignment_exists`). The rule that an employee has a rest day in 7 days (`HR-ROS-014`) and the coverage rules are not row errors (IM6). | **Needs your answer.** |
| IM6 | **Coverage gaps are reported, not blocking** (collection design 5.9). The check counts the coverage gaps and the missing rest days that the roster would have with the file applied, and answers them next to the import record (`coverageGaps`, `restDayGaps`), not stored in `hr_imports`; they block submission later (`HR-ROS-021`, 5.5), not the import. | As stated. |
| IM7 | **Check and apply.** A check records an `hr_imports` record of kind `roster_assignments`, target `{ roster_id }`, `validated` when every row is valid and `invalid` otherwise, with `rows`, `valid`, `invalid` and `created` counts (`created` is the number of assignments the file would add), and **changes nothing in the roster**. Apply (`apply=true&checkId=`) needs the same file again: the service hashes the body and compares it to the check (422 `check_mismatch`), the check must be `validated`, for this roster and not applied (422 `check_not_valid`, `check_required`), and the file must not have been applied to this roster before (409 `import_already_applied`). | As stated. |
| IM8 | **Apply is all or nothing, and checked again.** Apply reads the file again and runs every row check against the roster **as it is now**, because the roster, the employees, the licences or the other rosters may have changed since the check. If any row fails now, **nothing is written**: the import record becomes `invalid` with the new row errors, and the answer is 422 `import_not_valid_anymore`. Otherwise one transaction writes every assignment (`createMany`, IM10), marks the import `applied` with counts and who, and answers the record. The roster must still be a draft (IM2) and its version is read at the start (409 `stale_version`). | **Needs your answer.** |
| IM9 | **Overtime consent in a file.** The checks of 5.5 need the employee's consent for overtime. A file may say `overtime_consent` per row; without it, a row that adds overtime is an error (`overtime_consent_required`). The consent is stored as in 5.5 (`overtime.consent` with the import date and no document); a document cannot be attached through a file. | As stated. |
| IM10 | **One write method, one change record per assignment.** The assignment repository gets a named method `createMany(rosterId, assignments)` that inserts them inside the caller's transaction and records **one change record per assignment** with the reason `roster_import` (`database.md` 6.1 allows a named method that records every affected entity; `insertMany` stays forbidden). Each assignment has source `{ kind: 'import', ref_id: <import id> }`, the roster's `revision`, a snapshot of its shift and its UTC instants (5.5 RA7, RA10). | As stated. |
| IM11 | **Size.** A file of at most 5,000 rows is written in one transaction. If the platform's database turns out to refuse a transaction of that size, the limit `IMPORT_MAX_ROWS` is lowered for rosters; it is a parameter. | As stated. |
| IM12 | **The same file twice.** A file with the same hash as an `applied` import of the same roster is refused on apply (409 `import_already_applied`); checking it again is allowed and reports every row as an existing assignment (IM5). | As stated. |
| IM13 | **View** (`GET /hr-imports/:id`). Any import of the tenant, roster or holiday; a missing, malformed or foreign id answers 404 `import_not_found`. The record has no `_id`, no file content, no cell values. | As stated. |
| IM14 | **Cancel.** Only a `validated` or `invalid` import can be cancelled (status `cancelled`); an `applied` or `cancelled` one answers 422 `invalid_transition`. A cancelled check can no longer be applied (the apply of 5.2 and of this group both need `validated`). Nothing is deleted. Cancelling works for imports of both kinds. | As stated. |
| IM15 | **Permissions.** `workforce.roster:import` for the roster route (check and apply), `workforce.hr-import:read` and `workforce.hr-import:cancel`, all tenant-wide until scoped permissions exist. The business matrix gives the Head of Unit the right to import into their own unit; that limit comes with scoped permissions. | As stated. |
| IM16 | **Changes and logs.** The import record and every assignment are recorded by their repositories. Each route writes one operational entry (`roster_import_check`, `roster_import_apply`, `hr_import_cancel`) with counts (`rows`, `invalid`, `created`) and the error class and workforce `code` on failure, never a number, a date, a shift code or a reason. Reads write no log entry. No events and no notifications. | As stated. |
| IM17 | **Tenant and ids.** `tenant_id` always from `@CurrentUser()`; a foreign, missing or malformed roster id answers 404 `roster_not_found`; a check of another roster or tenant answers 422 `check_not_valid`. Nothing is deleted. | As stated. |
| IM18 | **Employees are found by number** (`findByNumber`), so a row cannot reach an employee of another tenant, and an unknown number is the same error as a foreign one. | As stated. |
| IM19 | **A holiday import keeps working as built in 5.2.** Its apply stays on `POST /holiday-calendars/:id/imports`; this group only adds view and cancel for it. | As stated. |
| IM20 | **Not built:** a list of imports, rows that name an existing assignment to cancel or change, the pre-fill of a draft from a previous period, a CSV for published rosters, and the roster export. | As stated. |

## 5. Repository and code

- `RosterAssignmentRepository.createMany(rosterId, assignments)` (IM10), with its in-memory fake and spec (one change record per assignment, in one transaction, rejected without an acting account). `HrImportRepository` already exists (5.2); the import's status moves through `updatableFields` it already has.
- The checks of 5.5 (`RosterAssignmentService`: shift, employee, eligibility, working time) are **extracted into a shared checker** so the import and the single add use the same code and cannot drift apart. The single add keeps its behaviour and its tests.
- A pure `roster-import.ts` reads the rows (header, cells, role, consent) the way `holiday-import.ts` does, and the service `RosterImportService` runs the row checks, builds the check record and does the apply.

```
apps/back-end/apps/
├── repository/{interface,mongo}/roster-assignment*.ts        createMany (+ spec, fake)
├── workforce/rostering/{roster-import.ts, roster-import.service.ts} (+ specs)
├── workforce/rostering/assignment-checks.ts                  the shared checks, used by the add and by the import
├── workforce/import/{hr-import.service.ts}                    view and cancel (+ spec)
├── identity/permission.ts                                     workforce.roster:import, workforce.hr-import:read, :cancel
├── gateway_hr/src/roster-import/                              the roster route (text/csv)
└── gateway_hr/src/hr-import/                                  view and cancel
```

## 6. Tasks and pull requests

| PR | Kind | Content |
|---|---|---|
| A | Docs | This plan, the master plan row and the endpoint note (branch `docs/workforce-hr-imports-plan`). |
| B1 | Code | The shared checks extracted from `RosterAssignmentService`, the file reader and row checks, the **check** route, `GET /hr-imports/:id` and `POST /hr-imports/:id/cancel`, with the tests. |
| B2 | Code | `createMany`, the **apply** (all or nothing, checked again) and the tests. |
| C | Docs | After each code PR as needed: a short "in progress" row update, then the "built" docs PR (`workforce.md`, `hr-endpoints.md`, this plan's status, the master plan counts). |

Tests come first: the reader (header, cells, roles, consent, row numbers), the row checks case by case against the rules of 5.5 (including a file that clashes with itself, with the roster and with another roster), the check (valid, invalid, errors capped, nothing written to the roster), the apply (a good file, a file that stopped being valid, a changed roster, the same file twice, a mismatch, a cancelled check, one change record per assignment, one transaction) and the gateway (401, 403, 404, 409, 413, 415, 422, 400, a full check-then-apply over HTTP). Checks: `tsc`, `oxlint`, full `vitest` and `nest build gateway_hr`, run from `apps/back-end` under Node 22 (`pnpm` does not start on this machine).

## 7. Review focus

1. A file that fails anywhere writes nothing to the roster, at check and at apply.
2. The import uses the same rules as the single add, from one shared piece of code.
3. Errors and logs carry row numbers, columns and codes only: no employee numbers, dates or shift codes.
4. Apply cannot run on another file than the one checked, on another roster, twice, or after a cancel.
5. Every assignment of an import has one change record and the source `import`.

## 8. Decisions that needed your answer

Confirmed as proposed: all of IM1 to IM20 and the two code PRs. These four changed the shape of the work most:

- **IM1** (no generic `POST /hr-imports/:id/apply`: the roster import is check and apply on one route with the file sent again, like holidays; this makes 5.6 three endpoints instead of four).
- **IM5** (rows are checked against the roster, the employee's other rosters and the earlier rows of the file; the rest-day rule and coverage are reported, not errors).
- **IM8** (apply checks everything again, writes all or nothing in one transaction, and answers 422 `import_not_valid_anymore` if the file is no longer valid).
- **The two PRs** (B1 the check, view and cancel with the extracted shared checks; B2 the apply with `createMany`).

Open, not decided here: whether a Head of Unit may import only into their own unit (needs scoped permissions) and whether a list of imports is wanted (IM20). The others are as stated.
