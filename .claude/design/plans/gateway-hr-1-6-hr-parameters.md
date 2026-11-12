# gateway_hr 1.6: HR parameters

Status: **Built** (2026-11-13, PR #21 merged). Decisions R1 to R11 confirmed as proposed. Part of `2026-11-10-gateway-hr-plan.md` (walkthrough order 6). Endpoints: `../hr-endpoints.md` 1.6. Collection: `../human-resource-collections.md` 6 and HR specification 10. Model: `apps/back-end/apps/repository/model/hr-parameter.ts` (exists). Rules every endpoint follows: `../../rules/back-end/workforce.md` 3. Built references: groups 1.1 to 1.5.

HR parameters are the numbers and switches the HR rules read: how many days before a licence expires to alert, the maximum weekly hours, the minimum rest between shifts. They change without code changes and must explain past decisions, so each value has a scope (the whole tenant, an organization, a facility or a unit) and a date from which it applies. A decision made last month, for example a roster check, can then be explained with the value that was in force that day.

This group is configuration only. The rules that read a parameter (rostering, licences, credentialing) come in later groups and call the same lookup this group builds.

## 1. The four endpoints and one internal service

| Endpoint | Behaviour |
|---|---|
| `GET /v1/parameters` | Lists the values that were set. Filters: `key`, `scopeKind`, `scopeId`. Paging `limit` and `offset`. Ordered by `key`; with a `key` filter, newest `effective_from` first. Writes no log entry. |
| `GET /v1/parameters/effective?key=…` | The value in force for one key at one place and date. Optional `organizationId`, `facilityId` or `unitId` (at most one: the most specific place) and `date` (default today). Answers the value and where it comes from (`unit`, `facility`, `organization`, `tenant` or `default`). Writes no log entry. |
| `POST /v1/parameters` | Sets a value from a date. Body: `key`, `scope` (`{ kind, id }`), `value`, `effectiveFrom`, `notes` (optional), `reason` (optional, for the change history). |
| `GET /v1/parameters/catalog` | The catalog in code: each key, its type, its default, its allowed scopes and what uses it. The screen needs it to show a form for each key. |

The catalog read is not in `hr-endpoints.md` yet: without it a client cannot know the keys, types and allowed scopes, and it is the same table the validation uses. It is added there with this plan.

The service also offers what later groups need, with no endpoint: `resolve(tenantId, key, place, date)` returns the value in force, so a rule never reads the collection itself.

Permissions (new): `workforce.parameter:read` for the reads (list, effective and catalog), `workforce.parameter:write` for setting a value. The HR specification gives the values to the HR Manager.

## 2. Rules and decisions to confirm

| # | Rule or decision | Proposed |
|---|---|---|
| R1 | **The catalog is code.** `parameters/catalog.ts` lists every key of HR specification 10 with its type, default, allowed scopes and a short description. Only catalog keys can be set (422 `unknown_parameter`). A new key is a code change with its default, never a free-text key. | As stated. |
| R2 | **Types.** A key has one of these types: `integer` (with minimum and maximum), `decimal` (with minimum and maximum), `integer_list` (positive whole numbers, at most 10, no repeats, stored from largest to smallest), `boolean`, `choice` (one of a fixed list), `profession_points` (a list of `{ profession, points }`: each profession is an active `Coding` of a profession system, no repeats, points a whole number from 0 to 10,000). A value of the wrong type or outside its limits answers 422 `invalid_value`. The per-profession map of the design is stored as a list, because a code such as `id.profession` cannot be a storage key. | As stated. |
| R3 | **Scopes.** `tenant` (the id is `null`), `organization`, `facility`, `unit`. Each key lists the scopes it allows (for example `CREDENTIALING_SCOPE` only `tenant`; `MAX_WEEKLY_HOURS` tenant, organization, facility and unit); another scope answers 422 `scope_not_allowed`. For a scope other than `tenant`, the record must exist in the caller's tenant and not be soft-deleted, otherwise 422 `scope_not_found` (one answer for missing and foreign records, so nothing leaks). Inactive facilities and closed units are accepted: a value may be set for a place that is being wound down. | As stated. |
| R4 | **The committee scope is not available yet.** The design allows `committee` for `MIN_ASSESSORS`, but committees do not exist until the credentialing group. The key is in the catalog with the `committee` scope, but setting it answers 422 `scope_not_available` until then. | Deferred. |
| R5 | **Append only.** A value is never edited or deleted: setting a new value from a later date replaces it from that date, and the history stays. There is no `PATCH` and no `DELETE`. Setting a second value for the same key, scope and date answers 409 `parameter_exists`, backed by the unique index `{ tenant, key, scope kind, scope id, effective_from }`. A mistake is fixed by setting the right value from a later date; if that turns out to be too hard in practice, an edit endpoint is a later, separate decision. | Append only. |
| R6 | **No dates in the past.** `effectiveFrom` must not be before yesterday's date in UTC. A past date would change what the lookup answers for days that already happened, and so would rewrite the explanation of decisions already made. Yesterday (UTC) is allowed so that a facility east of UTC, or one west of it, can still set "today" in its own zone. Alternative: allow any date and rely on the change history. | Not before yesterday (UTC). |
| R7 | **Lookup.** The most specific scope wins, then the latest `effective_from` on or before the date inside that scope; with none, the catalog default applies. The place named in the request is expanded to its chain: a `unitId` also looks at the unit's facility and organization, a `facilityId` at its organization. Specificity beats recency: a unit value from last year beats an organization value from yesterday. | As the design says. |
| R8 | **Effective date default.** `date` defaults to today in the facility's time zone when the place is a facility or a unit, otherwise today in UTC. An unknown or foreign place answers 422 `scope_not_found`, not an answer for the default, so a typo is not mistaken for "default applies". | As stated. |
| R9 | **Defaults without a value.** `SKP_REQUIRED_POINTS` has no regulatory default yet (HR specification marks it to verify): its default is an empty list, and the answer says `source: 'default'`. Other defaults come from HR specification 10; those marked *(verify)* there stay marked in the catalog description. | As stated. |
| R10 | `notes` (optional, up to 500 characters) holds the legal basis, for example the PKB article. `reason` goes to the change history like in other groups. | As stated. |
| R11 | A list for a scope id of another tenant answers an empty result, not 404 (nothing to leak); a malformed `scopeId` answers 400. `scopeId` needs a `scopeKind`. | As stated. |

## 3. The catalog

Defaults and meaning follow HR specification 10. "Scopes" lists what each key allows.

| Key | Type and limits | Default | Scopes |
|---|---|---|---|
| `LICENSE_ALERT_DAYS` | integer list | 180, 90, 60, 30 | tenant, organization, facility |
| `SKP_REQUIRED_POINTS` | profession points | none (empty) | tenant |
| `MAX_PRACTICE_LOCATIONS_MEDIS` | integer 1 to 20 | 3 *(verify)* | tenant |
| `SPK_VALIDITY_YEARS` | integer 1 to 10 | 3 *(verify)* | tenant, organization, facility |
| `RECREDENTIAL_LEAD_DAYS` | integer 1 to 365 | 90 | tenant, organization, facility |
| `MIN_ASSESSORS` | integer 1 to 20 | 1 | committee (not available yet) |
| `CREDENTIAL_SLA_DAYS` | integer 1 to 365 | 14 | tenant, organization, facility |
| `TEMPORARY_PRIVILEGE_MAX_DAYS` | integer 1 to 365 | 60 | tenant, organization, facility |
| `ROSTER_PERIOD` | choice: `month`, `week`, `two_weeks` | `month` | tenant, organization, facility |
| `ROSTER_PUBLISH_LEAD_DAYS` | integer 0 to 90 | 7 | tenant, organization, facility, unit |
| `ROSTER_APPROVAL_REQUIRED` | boolean | true | tenant, organization, facility, unit |
| `ROSTER_LOOKAHEAD_DAYS` | integer 1 to 90 | 14 | tenant, organization, facility, unit |
| `MIN_REST_HOURS` | decimal 0 to 24 | 8 | tenant, organization, facility, unit |
| `MAX_WEEKLY_HOURS` | decimal 1 to 168 | 40 *(verify)* | tenant, organization, facility, unit |
| `MAX_OVERTIME_HOURS_DAY` | decimal 0 to 24 | 4 *(verify)* | tenant, organization, facility, unit |
| `MAX_OVERTIME_HOURS_WEEK` | decimal 0 to 168 | 18 *(verify)* | tenant, organization, facility, unit |
| `MAX_CONSECUTIVE_NIGHTS` | integer 1 to 14 | 3 | tenant, organization, facility, unit |
| `CREDENTIALING_SCOPE` | choice: `facility`, `group` | `facility` | tenant |
| `IMPORT_MAX_ROWS` | integer 1 to 100,000 | 5,000 | tenant |
| `IMPORT_MAX_ERRORS` | integer 1 to 10,000 | 500 | tenant |

The limits are sanity limits to catch typing mistakes (a weekly limit of 400 hours), not legal limits. The `choice` values of `ROSTER_PERIOD` beyond `month` are an addition for hospitals that roster by week; HR specification 10 only names the calendar month. Say if `week` and `two_weeks` should be left out until rostering is designed.

## 4. Code structure

```
apps/back-end/apps/
├── repository/
│   ├── token.ts                         + REPOSITORY_HR_PARAMETER
│   ├── interface/hr-parameter.ts        findByKey(tenantId, key)               (every row of the key, for the lookup)
│   │                                    findOneAt(tenantId, key, scope, effectiveFrom)
│   └── mongo/
│       ├── schema/hr-parameter.ts       collection `hr_parameters`; unique {tenant_id, key, scope.kind, scope.id, effective_from};
│       │                                index {tenant_id, key}; value stored as mixed
│       ├── hr-parameter.ts              no updatable fields (append only)
│       ├── hr-parameter.module.ts
│       └── hr-parameter.spec.ts
├── workforce/
│   ├── workforce.module.ts              + HrParameterRepositoryModule, ParameterService
│   ├── parameter/
│   │   ├── catalog.ts                   the keys of section 3, with types and defaults
│   │   ├── value-types.ts               checks and normalises a value for each type (R2)
│   │   ├── parameter.service.ts         list, catalog, set, effective, resolve
│   │   └── *.spec.ts
│   └── testing/in-memory.ts             + InMemoryHrParameters
├── identity/permission.ts               + workforce.parameter:read, :write
└── gateway_hr/src/
    ├── parameter/                       module, controller, DTOs, gateway test
    └── testing/in-memory-workforce.ts   + parameters
```

The repository has no updatable fields and no delete: its `update`, `delete` and `deleteSoft` stay disabled. `value` is stored as a mixed value; its shape is the service's job, never the database's.

## 5. Tasks

Tests come first in each task.

1. **Catalog and value types.** `catalog.ts`, `value-types.ts`. *Tests:* every catalog default passes its own type check; every allowed scope is a known scope; each type accepts valid values and refuses wrong types, out-of-range numbers, repeats, too long lists, unknown choices, negative points; integer lists are stored largest first; no two catalog keys share a name.
2. **Repository.** Token, interface, schema, Mongo implementation, module. *Tests (fake model):* create records one change entry; a duplicate key, scope and date is a conflict; `findByKey` filters by tenant and key; a scope without an id is stored as `null`; update and delete are not supported; malformed tenant id gives an empty result.
3. **Parameter service.** *Tests (in-memory):* every rule R1 to R11; the lookup picks the unit over the facility over the organization over the tenant, the latest date not after the given date, and the default when nothing matches; specificity beats recency; the unit and facility chain is followed; the default date uses the facility's time zone; tenant isolation; reads write no log; writes log no values.
4. **Endpoints.** Controller, DTOs, module, permissions, wiring. *Gateway tests:* 401 and 403; set, list, effective, catalog; 422 for unknown keys, wrong types, wrong scopes and foreign scope records without leaking; 409 duplicate; 400 for malformed filters; list limits; reads write only the access log; writes log no values.
5. **Checks.** `tsc` for all apps and specs, `oxlint`, full `vitest`, `nest build gateway_hr`.

## 6. Pull requests

| PR | Kind | Content |
|---|---|---|
| A | Docs | Group 1.5 status updates and this plan (branch `docs/workforce-positions`). |
| B | Code | Group 1.6 (branch `feat/gateway-hr-parameters`, cut from `main`). |
| C | Docs | After B merges: permission table and status updates. |

## 7. Review focus

1. Two requests set the same key, scope and date at once: one succeeds, the other gets 409 `parameter_exists`.
2. A value from last year at unit level beats a value from yesterday at tenant level, and the lookup for a past date ignores values that start later.
3. A foreign or missing facility or unit in `scope` or in the lookup answers the same 422 `scope_not_found`.
4. A key with a tenant-only scope refuses a facility scope, and the committee scope is refused until committees exist.
5. A value outside its limits (weekly hours of 400, an empty alert list, a repeated profession) is refused, and the stored list order is largest first.
6. The default for a facility or unit lookup uses the facility's time zone for "today".
