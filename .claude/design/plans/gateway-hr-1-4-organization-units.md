# gateway_hr 1.4: Organization units

Status: **Built** (2026-11-11, PR #17 merged). Decisions U1 to U13 confirmed as proposed. Part of `2026-11-10-gateway-hr-plan.md` (walkthrough order 4). Endpoints: `../hr-endpoints.md` 1.4. Collection: `../account-and-workforce-collections.md` 4.4 and HR specification 5.3 and 9.2. Model: `apps/back-end/apps/repository/model/organization-unit.ts` (exists). Rules every endpoint follows: `../../rules/back-end/workforce.md` 3. Built references: groups 1.1 to 1.3.

An organization unit is a node of the hospital's organization chart: a directorate, department, installation, ward or polyclinic. A unit belongs to one facility and has at most one parent. Positions (1.5), assignments (2.4), rosters and practice schedules all hang on units, and the unit's `ancestor_ids` lets "everything under directorate X" be one indexed query.

This is the first group that uses the code concepts of 1.3: a unit's type is a `Coding` checked with `CodeConceptService.assertActive`.

## 1. The seven endpoints

| Endpoint | Behaviour |
|---|---|
| `GET /v1/units?facilityId=…` | Lists the units of one facility, ordered by `code`. Filters: `parentId` (direct children of that unit), `status`. Paging `limit` and `offset`. `facilityId` is required. Writes no log entry. |
| `GET /v1/units/tree?facilityId=…` | The facility's organization chart as nested nodes, ordered by code at every level. Optional `rootId` (only that unit's subtree) and `includeClosed` (default: active units only). |
| `POST /v1/units` | Creates a unit, `active`. Body: `facilityId`, `code`, `name` (per language), `type` (`{ system, code }`), `parentId` (optional; none means a top unit), `isClinical` (optional), `startDate` (optional), `externalIds` (optional). |
| `GET /v1/units/:id` | Returns one unit. A missing, malformed or other-tenant id answers 404 `unit_not_found`. |
| `PATCH /v1/units/:id` | Edits `name`, `type`, `isClinical`, `externalIds`. Optional `version` and `reason`. An empty body answers 422 `empty_update`. |
| `POST /v1/units/:id/move` | Moves a unit, with all units below it, under another parent in the same facility, or to the top with `parentId: null`. Optional `version` and `reason`. |
| `POST /v1/units/:id/close` | Closes a unit. Body: optional `endDate`, `version`, `reason`. |

Permissions (new): `workforce.unit:read` for the three reads, `workforce.unit:write` for create, edit, move and close.

## 2. Rules and decisions to confirm

| # | Rule or decision | Proposed |
|---|---|---|
| U1 | `facilityId` is fixed at creation. `organization_id` is never sent: it is copied from the facility. A unit does not move between facilities (to do that, close it and create a new one). | As stated. |
| U2 | `code` is unique per facility (design 4.4), in the shared code format (lower case, 2 to 32 characters). Fixed after creation. | As stated. |
| U3 | `type` is a `Coding` whose system name ends in `unit-type` (`id.unit-type`, `us.unit-type`), and the concept must be active (`assertActive`). Editable later. When `isClinical` is left out it takes the concept's `clinical_default`. | As stated. |
| U4 | The facility of a new unit must exist in the tenant, be active and not soft-deleted (one 422 answer `facility_not_found` for missing, deleted or foreign; `facility_inactive` for inactive), like facilities and organizations (F1). | As stated. |
| U5 | The parent must be in the same facility and `active`; otherwise 422 `parent_not_found` (also for another tenant's or another facility's unit) or `parent_closed`. The chart has at most **10 levels** (a top unit is level 1) so tree queries stay bounded; deeper is 422 `too_deep`. A facility may have several top units. | As stated. |
| U6 | `startDate` (optional, local date) defaults to today **in the facility's time zone**. The unit's `period` is `{ start, end: null }`; closing sets `end`. Edits do not change the period. This adds `todayInZone(timeZone)` next to `todayUtc` in the local-date helper. | As stated. |
| U7 | **Move.** The new parent must be in the same facility, active, not the unit itself and not one of its descendants (422 `unit_cycle`), and the moved subtree must still fit in 10 levels. Moving to the parent it already has answers 422 `same_parent`. The unit and every unit below it get their `ancestor_ids` rewritten in one transaction, one write per unit, each with its own change record (the reason applies to all). | As stated. |
| U8 | **Close.** Refused with 409 `unit_in_use` while the unit has `active` child units. Positions (1.5) and assignments (2.4) will add their own checks when they exist, in their PRs. `endDate` defaults to today in the facility's time zone and cannot be before the unit's start. A closed unit cannot be edited, moved or given new children (422 `unit_closed`). | As stated. |
| U9 | **No reopening in 1.4.** `PATCH` does not accept `status`. Closing is a deliberate act that other records may already rely on (history, rosters); if reopening turns out to be needed, it becomes a separate endpoint. | No reopen for now. |
| U10 | The unit's head is not in the response yet. The head is the active assignment of the unit's head position, which exists only after 1.5 and 2.4; adding a `head` field then is backward compatible. | Later. |
| U11 | Deactivating a facility is refused while it has `active` units (409 `facility_in_use`), completing rule F9 of group 1.2. Units are checked through the unit repository, so `FacilityService` gets a new dependency. | As stated. |
| U12 | A list or tree for a facility of another tenant, or a facility that does not exist, answers an empty result, not 404 (nothing to leak); a malformed `facilityId` or `parentId` answers 400. | As stated. |
| U13 | The tree answers nodes, not whole records: `id`, `code`, `name`, `type`, `isClinical` (as `is_clinical`), `status`, `children`. It reads at most 2,000 units of a facility; a facility with more answers 422 `tree_too_large` and its units have to be read by `parentId`. This is the one place an endpoint does not return the model. | As stated. |

## 3. Code structure

```
apps/back-end/apps/
├── repository/
│   ├── token.ts                         + REPOSITORY_ORGANIZATION_UNIT
│   ├── interface/organization-unit.ts   findByCode(tenantId, facilityId, code)
│   │                                    findChildren(tenantId, parentId)
│   │                                    findDescendants(tenantId, unitId)       (ancestor_ids contains it)
│   │                                    findByFacility(tenantId, facilityId)    (all statuses, ordered by code)
│   │                                    findActiveByFacility(tenantId, facilityId)
│   │                                    moveSubtree(id, newParentId, options)           (a write; reads the new parent and works out the ancestors inside the transaction)
│   └── mongo/
│       ├── schema/organization-unit.ts  collection `organization_units`; unique {tenant_id, facility_id, code};
│       │                                index {tenant_id, ancestor_ids}; index {tenant_id, facility_id, parent_id, status}
│       ├── organization-unit.ts         updatable: name, type, is_clinical, external_ids, period, status
│       ├── organization-unit.module.ts
│       └── organization-unit.spec.ts
├── utility/validation/local-date.ts     + todayInZone(timeZone, now?)
├── workforce/
│   ├── workforce.module.ts              + OrganizationUnitRepositoryModule, UnitService
│   ├── structure/
│   │   ├── unit.service.ts              list, tree, get, create, update, move, close
│   │   ├── unit-tree.ts                 builds the nested tree from a flat list
│   │   ├── facility.service.ts          + facility_in_use check (U11)
│   │   └── *.spec.ts
│   └── testing/in-memory.ts             + InMemoryOrganizationUnits
├── identity/permission.ts               + workforce.unit:read, :write
└── gateway_hr/src/
    ├── unit/                            module, controller, DTOs, gateway test
    └── testing/in-memory-workforce.ts   + units
```

`period` and `status` are updatable at the repository level because close sets them; the service never lets a request change them directly. `ancestor_ids` is set by the service on create and by `moveSubtree`; it is not an updatable field.

## 4. Tasks

Tests come first in each task.

1. **Local date in a zone.** `todayInZone(timeZone, now)`. *Tests:* a fixed instant gives different dates in `Pacific/Kiritimati` (+14) and `Pacific/Pago_Pago` (-11); `Asia/Jakarta` crosses midnight at 17:00 UTC.
2. **Repository.** (Built as `moveSubtree(id, newParentId, options)`: the ancestors are computed inside the transaction, so a stale check cannot write a loop.) Token, interface, schema, Mongo implementation, module. *Tests (fake model):* create records one change entry; duplicate code is a conflict; `findDescendants` filters on `ancestor_ids`; `moveSubtree` updates the unit and each descendant one by one, recording one change entry for each, inside one transaction; a rejected expected version aborts without partial writes; update ignores code, facility and parent.
3. **Unit service and the facility rule.** *Tests (in-memory):* every rule U1 to U13, plus tenant isolation, stale version, reads write no log, writes log no values; the facility cannot be deactivated while it has an active unit and can afterwards; the tree is nested and ordered, honours `rootId` and `includeClosed`, and refuses more than 2,000 units; moving a subtree rewrites every descendant's `ancestor_ids`; the 10-level limit is checked on create and on move; a move into the unit's own subtree is refused; close refuses active children.
4. **Endpoints.** Controller, DTOs, module, permissions, wiring. *Gateway tests:* 401 and 403; create, read, list, edit, move, close; 404 for malformed, missing and foreign ids; 422 for a foreign facility and parent without leaking; 409 duplicate code, stale version, close with active children, deactivating a facility with an active unit; type validation against code concepts (unknown, retired and wrong-system types); `isClinical` default from the concept; list requires `facilityId`; list limits; tree shape; reads write only the access log; writes log no values.
5. **Checks.** `tsc` for all apps and specs, `oxlint`, full `vitest`, `nest build gateway_hr`.

## 5. Pull requests

| PR | Kind | Content |
|---|---|---|
| A | Docs | Group 1.3 status updates and this plan (branch `docs/workforce-code-concepts`). |
| B | Code | Group 1.4 (branch `feat/gateway-hr-units`, cut from `main`). |
| C | Docs | After B merges: permission table and status updates. |

## 6. Review focus

1. Two requests create the same unit code in one facility at once: one succeeds, the other gets 409.
2. A move into a descendant is refused, and two moves that would each be valid alone but form a loop together cannot both succeed: the transaction re-reads the new parent's ancestors, and the second move fails or aborts instead of writing a loop. (A real replica set decides this; the in-memory tests only cover the sequential case, which the PR will say.)
3. After a move, every unit below has the new ancestors, none keeps an old one, and the unit's old parent no longer lists it as a child.
4. Closing sets the end date in the facility's time zone, not the server's.
5. `PATCH` with `facilityId`, `code`, `parentId`, `status` or `period` is ignored, never applied.
6. A unit of an inactive or closed parent facility or unit cannot receive children, but stays readable.
