# gateway_hr 1.2: Facilities

Status: **Built** (2026-11-10, PR #10 merged). Decisions F1 to F10 confirmed; F1 amended to include the soft-delete condition. Part of `2026-11-10-gateway-hr-plan.md` (walkthrough order 2). Endpoints: `../hr-endpoints.md` 1.2. Collection: `../account-and-workforce-collections.md` 3.3 and `../human-resource-collections.md` 5.2. Model: `apps/back-end/apps/repository/model/facility.ts` (exists). Rules every endpoint follows: `../../rules/back-end/workforce.md` 3. Built reference: group 1.1 (organizations, PR #7).

A facility is one hospital or clinic site. It carries the time zone that every local date and time of that site is read in, so most later groups (units, positions, rostering, licences) hang on it.

## 1. The four endpoints

| Endpoint | Behaviour |
|---|---|
| `GET /v1/facilities` | Lists the tenant's facilities, ordered by `code`. Filters: `organizationId`, `status`. Paging `limit` (1 to 100) and `offset`. Writes no log entry. |
| `POST /v1/facilities` | Creates a facility, `active`. Body: `organizationId`, `code`, `name` (per language), `timezone`, `address` (optional), `holidayCalendarCodes` (optional), `externalIds` (optional). |
| `GET /v1/facilities/:id` | Returns one. A missing, malformed or other-tenant id answers 404 `facility_not_found`. |
| `PATCH /v1/facilities/:id` | Edits `name`, `address`, `holidayCalendarCodes`, `externalIds`, `status`. Optional `version` (409 `stale_version`) and `reason`. An empty body answers 422 `empty_update`. |

Permissions (new): `workforce.facility:read` for the reads, `workforce.facility:write` for create and edit.

## 2. Rules and decisions to confirm

| # | Rule or decision | Proposed |
|---|---|---|
| F1 | `organizationId` must be an organization of the tenant that is `active` and not soft-deleted when the facility is created. A missing, soft-deleted or other-tenant organization answers 422 `organization_not_found` (one answer, so nothing leaks); an `inactive` one answers 422 `organization_inactive`. Decided 2026-11-10: active **and** not soft-deleted. | Confirmed with the soft-delete condition. |
| F2 | `organizationId`, `code` and `timezone` cannot change after creation. The organization is the employer, the code is the key, and the time zone decides how every stored local date and time of the site is read: changing it would silently move shifts and contract dates. A real change (a government changes a zone, a site is sold) needs a migration and is a separate, later task. | Fixed at creation. |
| F3 | `code` is unique in the tenant (the design says tenant, not organization), same format as organization codes: lower case letters, digits, dots, hyphens, underscores, 2 to 32 characters. | As stated. |
| F4 | `timezone` is a valid IANA name (for example `Asia/Jakarta`, `Asia/Makassar`), checked with the runtime's `Intl` data. The existing `IsTimeZone` check is reused by exporting its function. | As stated. |
| F5 | `name`: at least one entry, at most 10, each `{ locale, text }` with a BCP 47 locale and text up to 200 characters, no repeated locale. | As stated. |
| F6 | `address` (optional) uses the shared `Address` shape: `country` must be a real ISO 3166-1 code, `subdivision` (optional) must look like ISO 3166-2 (`ID-JK`), at most 5 `lines`, at most 6 `admin_levels`. Editable; sending `null` clears it. | As stated. |
| F7 | `holidayCalendarCodes`: at most 10, no repeats, each in the code format. They are **not** checked against existing calendars now, because calendars arrive in group 5.2 and a facility must be creatable before them. Group 5.2 validates them when a calendar is used. | Format only for now. |
| F8 | `externalIds` (Kemenkes and SATUSEHAT facility codes and similar): at most 20, none empty, no repeated `system`; the same rule as organization identifiers, so the check becomes one shared helper instead of a copy. | Shared helper. |
| F9 | O3 from group 1.1 is enforced now: setting an organization `inactive` while it has an `active` facility answers 409 `organization_in_use`. Setting a facility `inactive` while it has active units is enforced in group 1.4 (units do not exist yet). | As stated. |
| F10 | Creating a facility under an inactive organization is refused (F1); an existing facility keeps working if its organization is later set inactive (F9 prevents that while it is active). | As stated. |

## 3. Code structure

```
apps/back-end/apps/
├── repository/
│   ├── token.ts                       + REPOSITORY_FACILITY
│   ├── interface/facility.ts          findByCode(tenantId, code); findActiveByOrganization(tenantId, organizationId)
│   └── mongo/
│       ├── schema/common/address.ts   new Address sub-schema
│       ├── schema/facility.ts         collection `facilities`; unique {tenant_id, code};
│       │                              index {tenant_id, organization_id, status}
│       ├── facility.ts                updatable: name, address, holiday_calendar_codes, external_ids, status
│       ├── facility.module.ts
│       └── facility.spec.ts
├── utility/validation/is-time-zone.ts export isTimeZone
├── workforce/
│   ├── workforce.module.ts            + FacilityRepositoryModule, FacilityService
│   ├── structure/
│   │   ├── facility.service.ts        list, get, create, update
│   │   ├── facility.service.spec.ts
│   │   ├── external-ids.ts            shared check (moved out of OrganizationService)
│   │   └── organization.service.ts    + deactivation check (F9)
│   └── testing/in-memory.ts           + InMemoryFacilities
├── identity/permission.ts             + workforce.facility:read, :write
└── gateway_hr/src/facility/
    ├── facility-management.module.ts
    ├── facility.controller.ts
    ├── facility.dto.ts
    └── facility.spec.ts               gateway test
```

`GatewayHrModule` imports `FacilityManagementModule`. No changes to `main.ts`, scripts or configuration.

## 4. Tasks

Tests come first in each task.

1. **Shared helpers.** Export `isTimeZone`; move the identifier check of `OrganizationService` into `structure/external-ids.ts` and reuse it. *Tests:* `isTimeZone` accepts `Asia/Jakarta`, `Europe/London`, rejects `Mars/Base`, `''`, `UTC+7`; the organization tests still pass unchanged.
2. **Facility repository.** Token, interface, schema (with the address sub-schema), Mongo implementation, module. *Tests (fake model):* create records one change entry; duplicate code is a conflict; `findByCode`, `findActiveByOrganization`; update touches only the editable fields (`code`, `organization_id`, `timezone` ignored); address mapped without storage fields.
3. **Facility service.** `list`, `get`, `create`, `update`, and the deactivation check in `OrganizationService.update`. *Tests (in-memory):* every rule F1 to F10 (F1 including an organization that was soft-deleted), tenant isolation, stale version, empty update, reads write no log, writes log no values.
4. **Endpoints.** Controller, DTOs, module, permissions, wiring. *Gateway tests:* 401 and 403; create, read, list, edit; 404 for malformed, missing and foreign ids; foreign organization id on create is 422, not a leak; 409 duplicate code and stale version; 422 and 400 validation; list limits; filter by organization and status; inactive stays readable; reads write only the access log; writes log no values; creating under an inactive organization and under a soft-deleted one; deactivating an organization with an active facility answers 409.
5. **Checks.** `tsc` for all three applications and specs, `oxlint`, full `vitest`, `nest build gateway_hr`.

## 5. Pull requests

| PR | Kind | Content |
|---|---|---|
| A | Docs | `workforce.md`, the 1.1 status updates, `authentication.md` note and this plan (branch `docs/workforce-organizations`, can open now). |
| B | Code | Group 1.2, branch `feat/gateway-hr-facilities`, cut from `main` (after PR A or independently: they touch different files). |
| C | Docs | After B merges: `workforce.md` permission table, `hr-endpoints.md` and plan status. |

## 6. Review focus

1. Two requests create the same facility code at once: one succeeds, the other gets 409.
2. A facility created with another tenant's `organizationId` is refused without revealing that the organization exists.
3. `PATCH` with `code`, `organizationId` or `timezone` is ignored, never applied (F2).
4. An address with a made-up country or subdivision is refused; `address: null` clears it.
5. Setting an organization inactive is refused while any active facility remains (F9), and allowed once they are all inactive.
