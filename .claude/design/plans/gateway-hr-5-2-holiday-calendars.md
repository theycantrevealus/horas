# gateway_hr 5.2: Holiday calendars

Status: **Confirmed** (2026-11-16). Decisions HC1 to HC16 and the split in two code PRs confirmed as proposed. Part of `2026-11-10-gateway-hr-plan.md` (walkthrough order 18). Endpoints: `../hr-endpoints.md` 5.2. Collections: `../human-resource-collections.md` 5.2 (`holiday_calendars`) and 5.9 (`hr_imports`, holiday CSV rules). Business rules: `../../business/administrative-operational-system/human-resource-management.md` 8.2 (coverage day pattern "weekends and public holidays"). Models: `apps/back-end/apps/repository/model/holiday-calendar.ts` and `hr-import.ts` (both exist, with their classifications). Rules every endpoint follows: `../../rules/back-end/workforce.md` 3. Master plan decisions: D3 (files are references only) and D4 (a `text/csv` request body with a size limit, parsed with `csv-parse`). Built references: shift definitions (5.1: a per-facility record with a retire flow), code concepts (1.3: bundles and an import-like flow), HR parameters (1.6: `IMPORT_MAX_ROWS`, `IMPORT_MAX_ERRORS`).

A holiday calendar lists the public holidays, collective leave days and local holidays of a country or province for one year (`id-national`, `id-jk`, or a hospital's own). Coverage requirements (5.3) use it for the day pattern "weekends and public holidays", and rosters (5.4) use it to find the days a unit needs holiday cover. HR loads a calendar from a CSV file, keeps it by hand, or both (decision C6). This group builds the calendars, the manual maintenance and the CSV import. Using the calendars is later.

It is the first group with a file import, so it also builds the `hr_imports` repository and the CSV reading that the roster import (5.9) will reuse.

## 1. The endpoints

| Endpoint | Behaviour |
|---|---|
| `GET /v1/holiday-calendars` | Lists calendars with their holidays. Query: `code`, `year`, `country`, `includeRemoved` (default false), `limit`, `offset`. Ordered by code, then year descending. Writes no log entry. |
| `POST /v1/holiday-calendars` | Creates a calendar for a year, empty. Body: `code`, `year`, `country`, `subdivision` (optional), optional `reason`. |
| `POST /v1/holiday-calendars/:id/holidays` | Adds a holiday by hand. Body: `date`, `kind`, `name` (texts per language), optional `version`, `reason`. |
| `POST /v1/holiday-calendars/:id/holidays/remove` | Removes a holiday (imported or manual). Body: `date`, `kind`, optional `version`, `reason`. |
| `POST /v1/holiday-calendars/:id/imports` | Checks or applies a holiday CSV. Body: the CSV (`Content-Type: text/csv`). Query: `apply` (default false) and `checkId`. Answers the import record with its counts and row errors. |

`:id` is the id of one calendar document, which is one code in one year (the collection design keeps one document per calendar and year). The list returns the ids.

Permissions (new): `workforce.holiday-calendar:read` (the list) and `workforce.holiday-calendar:write` (create, add, remove, import).

## 2. Rules and decisions to confirm

| # | Rule or decision | Proposed |
|---|---|---|
| HC1 | **Calendar identity.** A calendar is a code and a year, unique per tenant (409 `calendar_exists`). The code is trimmed, lower-cased, 2 to 32 letters, digits or hyphens, starting with a letter (`id-national`, `id-jk`, `rsud-anniversary`). The year is a whole number from 2000 to 2100. The code, year, country and subdivision never change. | As stated. |
| HC2 | **Country and subdivision.** `country` is an ISO 3166-1 alpha-2 code (upper case, two letters). `subdivision` is empty for a national calendar or an ISO 3166-2 code of that country (`ID-JK`: country prefix, a hyphen, 1 to 3 letters or digits). Only the format is checked: there is no code list to check them against. | As stated. |
| HC3 | **Tenant calendars only.** The collection allows platform calendars (no `tenant_id`) but this group creates and changes tenant calendars only. The list shows the tenant's calendars alone, and a platform calendar answers 404 like a foreign id. Platform calendars arrive with seed data, if ever. | As stated. |
| HC4 | **A calendar starts empty.** `POST /holiday-calendars` creates no holidays. Days come from the import or from `POST .../holidays`. | As stated. |
| HC5 | **A holiday.** `date` is a `YYYY-MM-DD` calendar date inside the calendar's year (422 `date_outside_year`); no zone is involved (`database.md` 4.4). `kind` is `public`, `collective_leave` or `local`. `name` is texts per language, checked with the shared `normalizeLocalizedTexts`. A calendar holds at most 400 holidays, removed ones included (422 `too_many_holidays`). | As stated. |
| HC6 | **Adding by hand.** The entry is `manual`, `active`, with no import. A day is identified by its date and kind: adding one that is `active` answers 409 `holiday_exists`. Adding over a `removed` entry of the same date and kind brings it back as `manual` with the new name, so HR can undo a removal, and the entry no longer belongs to the import. Two kinds on one date are allowed (a public holiday and a local one). | As stated. |
| HC7 | **Removing.** Sets the entry (imported or manual) to `removed`; nothing is deleted. Removing a missing or already removed day answers 404 `holiday_not_found`. A removed imported day is never brought back by a later import; only HR adding it again does (HC6). | As stated. |
| HC8 | **CSV format.** UTF-8 (a byte-order mark is accepted), comma separated, a header row, then one row per day. Columns: `date`, `kind`, and one `name_<locale>` column per language (`name_id-ID`, `name_en`; locale is a BCP 47 tag). At least one name column is needed, and any other column is refused as a header problem (422 `invalid_header`, HC10). An empty name cell is skipped as long as the row has one name. A date is a `YYYY-MM-DD` day in the calendar's year; the kind is `public`, `collective_leave` or `local`. The same date and kind twice in one file is an error on the second row. | As stated. |
| HC9 | **Limits.** The body is at most 512 KB (HTTP 413 above it) and has at most `IMPORT_MAX_ROWS` data rows (default 5,000; 422 `too_many_rows`), read for the tenant like any parameter. The calendar's own limit of 400 holidays still applies (HC5). At most `IMPORT_MAX_ERRORS` row errors are kept. Both parameters are described as roster-import limits today; their text is updated when built. | As stated. |
| HC10 | **Check, then apply.** A check (`apply` missing or `false`) reads the whole file, applies every rule, writes nothing to the calendar and records an import (`validated`, or `invalid` when any row fails) with the counts and row errors. An error is a row number, a column and a code, never a cell value (collection design 5.9). A file that is not a readable CSV (bad header, no rows, not UTF-8) answers 422 with a `code` and records nothing. | As stated. |
| HC11 | **Apply needs a check of the same file.** `apply=true` needs `checkId`, the id of a `validated` import of this calendar, and the same file: the service hashes the body (SHA-256) and compares it to the check (422 `check_mismatch`; a missing, foreign, `invalid`, already applied or cancelled check answers 422 `check_not_valid`). It then reads the file again, merges it and marks the import `applied`, all in one transaction with the calendar change, and writes `last_import_id`. **No file is stored** (D3), so the client sends the file twice; the second upload must match the first byte for byte. The alternative is to keep the parsed rows in the import record, which makes apply a one-id call but stores holiday text in a second collection; I propose the re-upload. | **Needs your answer.** |
| HC12 | **The merge.** A new date and kind is added as `imported`, `active`, with the import id (counted `created`). An existing `imported` entry that is `active` gets the new names, kind unchanged, and the new import id (`updated`; the same names are `skipped`). A `manual` entry is never touched (`skipped`). A `removed` imported entry is never brought back (`skipped`). Entries not in the file stay as they are: an import never removes. The merged calendar must still fit the 400 holidays (422 `too_many_holidays`, nothing applied). | As stated. |
| HC13 | **The same file twice.** A file with the same hash as an `applied` import of the same calendar is refused on apply (409 `import_already_applied`), as the collection design says. A check of an already applied file is allowed and reports everything as skipped. | As stated. |
| HC14 | **Reads and imports are stored.** `hr_imports` records the check and the apply (who, when, counts, row error codes, file hash). The file reference is `file_id` `inline:<first 16 hex of the hash>`, the content type `text/csv` and the SHA-256 (D3: there is no file service). A calendar and an import write the change history through their repositories. Reads write no log entry and there is no `GET` for imports: the check's answer carries the record. | As stated. |
| HC15 | **Changes and logs.** Writes are logged as `calendar_create`, `holiday_add`, `holiday_remove`, `holiday_import_check` and `holiday_import_apply` with the error class and the workforce `code` on failure and counts (`rows`, `created`, `updated`, `skipped`) on success, never a date, a name or a cell. An optional `reason` goes into the change history with `withChangeReason`. No events, no notifications. | As stated. |
| HC16 | **Tenant, ids, concurrency and permissions.** `tenant_id` always from `@CurrentUser()`; a foreign, missing, malformed or platform calendar id gives one 404 (`calendar_not_found`). `version` is optional on add, remove and apply (409 `stale_version`); an apply whose calendar changed since the check is not refused for that alone, because the merge is recomputed on apply. Read and write are tenant-wide until scoped permissions exist. Facilities already list `holiday_calendar_codes`; this group does not check or change them. | As stated. |

## 3. Repositories

- `HolidayCalendarRepository` (`holiday_calendars`): `findByFilter(tenantId, query)` (`code`, `year`, `country`, `limit`, `offset`; ordered by code then year descending) and `findByCodeAndYear(tenantId, code, year)`, plus the base methods. Indexes: `{ tenant_id, code, year }` unique; `{ tenant_id, country, subdivision }`. Updatable fields: `holidays`, `last_import_id`. Holidays are a whole-array replace inside one `run`, recorded by the repository with the item key `date` and `kind` from the classification.
- `HrImportRepository` (`hr_imports`, new, shared with 5.9): `findByFilter(tenantId, { kind, calendarCode, year, status, sha256, limit, offset })` and `findOneInTenant`, plus the base methods. Indexes: `{ tenant_id, kind, status, created_at: -1 }`; `{ tenant_id, 'file.sha256', kind }`. Updatable fields: `status`, `counts`, `errors`, `applied`, `failure`.
- Both in-memory fakes apply the same unique rules.

## 4. Code structure

```
apps/back-end/apps/
├── repository/{token.ts, interface/holiday-calendar.ts, interface/hr-import.ts}
├── repository/mongo/{holiday-calendar.ts, hr-import.ts, *.module.ts, schema/*} (+ specs)
├── utility/validation/csv.ts                 reads a CSV text into rows (csv-parse), limits, BOM, header check (+ spec)
├── workforce/rostering/{holiday.service.ts, holiday-rules.ts, holiday-import.ts} (+ specs)
├── workforce/testing/in-memory.ts            the fakes
├── identity/permission.ts                    workforce.holiday-calendar:read, :write
└── gateway_hr/src/holiday/                   controller, DTOs, module, gateway test, text/csv body parser
```

`csv-parse` is a new dependency (D4); it is added in the same PR with its justification (a tested parser for quoted fields and embedded commas, which a hand-written split would get wrong). The `text/csv` body is read by a Fastify content type parser registered by the holiday module's gateway code, with the 512 KB limit; `apps/utility/http/` is the place if a second route needs it (`placement.md`). `gateway_hr/src/testing/in-memory-workforce.ts` registers the two repositories.

## 5. Tasks and pull requests

| PR | Kind | Content |
|---|---|---|
| A | Docs | This plan, the master plan row and the endpoint note (branch `docs/workforce-holidays-plan`). |
| B1 | Code | The repositories, the service for calendars and manual holidays (create, list, add, remove), permissions, controller, DTOs and tests. |
| B2 | Code | The CSV reader, the import check and apply, the `text/csv` route, the `csv-parse` dependency and tests. |
| C | Docs | After each code PR as needed: a short "in progress" row update, then the "built" docs PR (`workforce.md`, `hr-endpoints.md`, this plan, the parameter descriptions). |

Two code PRs keep each one reviewable (the import is the larger part). Tests come first: repositories (indexes, tenant isolation, no `_id`, one change record per write, unique calendar), services (every rejection above, tenant isolation, stale version, reads write no log, writes log no values or dates), the CSV reader (quotes, BOM, header errors, limits, row errors without cell values, a duplicate row) and the merge (HC12 case by case), and the gateway (401, 403, 404, 409, 413, 422, validation, list limits). Checks: `tsc`, `oxlint`, full `vitest` and `nest build gateway_hr`, run from `apps/back-end` under Node 22 (`pnpm` does not start on this machine).

## 6. Review focus

1. A manual entry and a removed imported entry are never changed by an import.
2. An apply cannot run on a file different from the checked one, and the same file cannot be applied twice.
3. An invalid file changes nothing, and errors carry codes and row numbers, never cell values.
4. Dates stay local calendar dates inside the calendar's year; nothing becomes a `Date`.
5. Logs carry no dates, names or cells; responses carry no `_id`; the body size limit holds.
6. The calendar's change history records what an import changed.

## 7. Decisions that needed your answer

Confirmed as proposed: all of HC1 to HC16 and the split in two code PRs. These four changed the shape of the work most:

- **HC11** (apply by sending the same file again with the check id, so no file or row text is stored; the alternative stores the parsed rows in the import record).
- **HC6** (adding over a removed day brings it back as a manual entry, so a removal can be undone).
- **HC12** (an import adds and updates imported days only and never removes, never touches manual days and never revives a removed imported day).
- **HC3** (tenant calendars only; platform calendars are not created or shown).

The others are as stated.
