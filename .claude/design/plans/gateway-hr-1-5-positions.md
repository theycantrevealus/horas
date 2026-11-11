# gateway_hr 1.5: Positions

Status: **In discussion** (2026-11-11). Part of `2026-11-10-gateway-hr-plan.md` (walkthrough order 5). Endpoints: `../hr-endpoints.md` 1.5. Collection: `../account-and-workforce-collections.md` 4.5 and HR specification 5.3 and 9.2. Model: `apps/back-end/apps/repository/model/position.ts` (exists). Rules every endpoint follows: `../../rules/back-end/workforce.md` 3. Built references: groups 1.1 to 1.4, especially units (1.4).

A position is a job in a unit: Head of Ward, Staff Nurse, Registered Nurse (ICU), Clinical Pharmacist. It says which professions may fill it and how many people it is budgeted for. Assignments (2.4) connect an employee to a position, and the unit's head is the holder of its head position. Positions are the budget side of the organization chart; people come later.

## 1. The five endpoints

| Endpoint | Behaviour |
|---|---|
| `GET /v1/positions?unitId=…` | Lists the positions of one unit, ordered by `code`. Filters: `status`, `kind`, `isHeadOfUnit`. Paging `limit` and `offset`. `unitId` is required. Writes no log entry. |
| `POST /v1/positions` | Creates a position, `active`. Body: `unitId`, `code`, `title` (per language), `kind` (`structural` or `functional`), `isHeadOfUnit` (optional, default false), `allowedProfessions` (optional), `grade` (optional), `budgetedHeadcount` (optional, default 1), `startDate` (optional). |
| `GET /v1/positions/:id` | Returns one position. A missing, malformed or other-tenant id answers 404 `position_not_found`. |
| `PATCH /v1/positions/:id` | Edits `title`, `grade`, `allowedProfessions`, `budgetedHeadcount`. Optional `version` and `reason`. An empty body answers 422 `empty_update`. |
| `POST /v1/positions/:id/close` | Closes a position. Body: optional `endDate`, `version`, `reason`. |

Permissions (new): `workforce.position:read` for the reads, `workforce.position:write` for create, edit and close.

## 2. Rules and decisions to confirm

| # | Rule or decision | Proposed |
|---|---|---|
| P1 | `unitId` is fixed at creation. The unit must exist in the tenant and be `active` (one 422 answer `unit_not_found` for missing and foreign units; `unit_closed` for a closed one). A position does not move to another unit; close it and create a new one. | As stated. |
| P2 | `code` is unique per unit, in the shared code format (lower case, 2 to 32 characters). Fixed after creation. | As stated. |
| P3 | `kind` and `isHeadOfUnit` are fixed at creation: other records (assignments, rosters) will copy them. A head position must be `structural` (422 `head_must_be_structural`) and have a headcount of 1 (422 `head_headcount`). | As stated. |
| P4 | **One active head position per unit.** Creating a second answers 409 `head_position_exists`. Closing a head position frees the place, so a new one can be created. A partial unique index on `tenant_id` and `unit_id` where `is_head_of_unit` and `status` is `active` backs the service check, so two requests at once cannot both win. | As stated. |
| P5 | `allowedProfessions`: at most 20 codes, no repeats, each a `Coding` from a profession system (name ends in `profession`, for example `id.profession`) and active (`assertActive`). An empty list means "any", the normal case for non-clinical positions. Replacing the list is allowed; people already holding the position are not re-checked now (the assignment rules of 2.4 check the profession when someone is assigned). The list is not tied to the unit's `is_clinical`: a doctor can sit in a non-clinical unit (for example a quality office). | As stated. |
| P6 | `grade` (optional, clearable with `null`): a `Coding` from a job-grade system (name ends in `job-grade`), active. The Indonesian bundle ships no grades, because grades are hospital-specific; a hospital adds its own with the code concept endpoints before using them. | As stated. |
| P7 | `budgetedHeadcount`: a whole number from 1 to 1,000, default 1. It can be raised or lowered. Lowering it below the number of current holders is refused when assignments exist (rule added in 2.4's PR, because holders do not exist yet). | As stated. |
| P8 | `startDate` (optional local date) defaults to today in the facility's time zone (the facility of the unit, read through the unit). The `period` is `{ start, end: null }`; closing sets `end`. Edits do not change the period. | As stated. |
| P9 | **Close.** `endDate` defaults to today in the facility's time zone and cannot be before the start. A closed position is immutable (422 `position_closed`) and is not reopened (same reasoning as U9). The rule "close a position that nobody holds" cannot be enforced yet, because assignments arrive in 2.4: until then closing never fails on holders, and 2.4's PR adds the check (409 `position_in_use`) in the same change that creates assignments. | Holder check arrives with 2.4. |
| P10 | **Unit rule completing U8.** Closing a unit is refused while it has `active` positions (409 `unit_in_use`, the same code as for active child units). `UnitService` gets a position-repository dependency. | As stated. |
| P11 | The response is the position model. It does not list the holders yet, although `hr-endpoints.md` describes the view as "with who holds it": holders come from assignments (2.4), and adding a `holders` field then is backward compatible, like the unit head (U10). | Holders later. |
| P12 | `job_description` (a file reference) is not accepted yet: it needs the file service, which is not built. The field stays `null`; the endpoint to attach a document arrives with file uploads. | Later. |
| P13 | A list for a unit of another tenant, or one that does not exist, answers an empty result, not 404; a malformed `unitId` answers 400 (the same as U12). | As stated. |

## 3. Code structure

```
apps/back-end/apps/
├── repository/
│   ├── token.ts                         + REPOSITORY_POSITION
│   ├── interface/position.ts            findByCode(tenantId, unitId, code)
│   │                                    findActiveByUnit(tenantId, unitId, limit?)
│   │                                    findActiveHead(tenantId, unitId)
│   └── mongo/
│       ├── schema/position.ts           collection `positions`; unique {tenant_id, unit_id, code};
│       │                                partial unique {tenant_id, unit_id} where is_head_of_unit and status 'active';
│       │                                index {tenant_id, unit_id, status}
│       ├── position.ts                  updatable: title, grade, allowed_professions, budgeted_headcount, period, status
│       ├── position.module.ts
│       └── position.spec.ts
├── workforce/
│   ├── workforce.module.ts              + PositionRepositoryModule, PositionService
│   ├── structure/
│   │   ├── position.service.ts          list, get, create, update, close
│   │   ├── unit.service.ts              + unit_in_use check for active positions (P10)
│   │   └── *.spec.ts
│   └── testing/in-memory.ts             + InMemoryPositions
├── identity/permission.ts               + workforce.position:read, :write
└── gateway_hr/src/
    ├── position/                        module, controller, DTOs, gateway test
    └── testing/in-memory-workforce.ts   + positions
```

`PositionService` reuses `normalizeLocalizedTexts` (titles, up to 200 characters), the code format, `todayInZone`, and `CodeConceptService.assertActive`. The system-name checks (`profession`, `job-grade`) follow the same pattern as the unit-type check; if a third caller appears, the check moves to a shared helper then.

## 4. Tasks

Tests come first in each task.

1. **Repository.** Token, interface, schema, Mongo implementation, module. *Tests (fake model):* create records one change entry; duplicate code is a conflict; `findActiveHead` and `findActiveByUnit` filters; update touches only the editable fields (unit, code, kind and head flag ignored); malformed ids give null or empty.
2. **Position service and the unit rule.** *Tests (in-memory):* every rule P1 to P13, plus tenant isolation, stale version, reads write no log, writes log no values; a second head is refused and allowed again after the first closes; head must be structural with headcount 1; professions and grade validated (unknown, retired, wrong system, repeats, more than 20); a closed unit cannot receive positions; a unit with an active position cannot be closed and can afterwards.
3. **Endpoints.** Controller, DTOs, module, permissions, wiring. *Gateway tests:* 401 and 403; create, read, list, edit, close; 404 for malformed, missing and foreign ids; 422 for a foreign unit without leaking; 409 duplicate code, second head, stale version, closing a unit with an active position; validation (400 and 422); `unitId` required on the list; list limits; reads write only the access log; writes log no values.
4. **Checks.** `tsc` for all apps and specs, `oxlint`, full `vitest`, `nest build gateway_hr`.

## 5. Pull requests

| PR | Kind | Content |
|---|---|---|
| A | Docs | Group 1.4 status updates and this plan (branch `docs/workforce-units`). |
| B | Code | Group 1.5 (branch `feat/gateway-hr-positions`, cut from `main`). |
| C | Docs | After B merges: permission table and status updates. |

## 6. Review focus

1. Two requests create the same position code in one unit at once: one succeeds, the other gets 409 `position_exists`.
2. Two requests create a head position for the same unit at once: one succeeds, the other gets 409 `head_position_exists`, not a duplicate-code message.
3. `PATCH` with `unitId`, `code`, `kind`, `isHeadOfUnit`, `status` or `period` is ignored, never applied.
4. A position cannot be created in a closed unit, and a unit with an active position cannot be closed.
5. Grades and professions come only from active concepts of the right kind of system; a unit-type code in `allowedProfessions` is refused.
6. The start and end dates are read in the facility's time zone, not the server's.
