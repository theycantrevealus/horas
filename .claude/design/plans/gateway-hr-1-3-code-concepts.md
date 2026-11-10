# gateway_hr 1.3: Code concepts

Status: **Decisions C1 to C11 confirmed as proposed** (2026-11-10). Part of `2026-11-10-gateway-hr-plan.md` (walkthrough order 3). Endpoints: `../hr-endpoints.md` 1.3. Collection: `../account-and-workforce-collections.md` 3.4 and 2.4, `../human-resource-collections.md` 3.1. Model: `apps/back-end/apps/repository/model/code-concept.ts` (exists). Rules every endpoint follows: `../../rules/back-end/workforce.md` 3. Built references: groups 1.1 and 1.2.

A code concept is one code of a code system that business rules depend on: a workforce category, an employment type, a licence type, a unit type. Records store a `Coding` (`{ system, code }`) instead of a fixed list in the code, so another country configures its own codes. The system name carries the jurisdiction (`id.license-type`, `us.license-type`). This group has no later group to wait for: units (1.4), employees (2.1), contracts, licences and committees all validate their codes against it.

## 1. The four endpoints and one internal service

| Endpoint | Behaviour |
|---|---|
| `GET /v1/code-concepts?system=…` | Lists the codes of one system, ordered by `code`: the tenant's concepts plus the platform-wide ones, where a tenant concept replaces a platform concept with the same code. `system` is required. Optional `status`. Not paged (one system has tens of codes). Writes no log entry. |
| `POST /v1/code-concepts` | Adds a tenant concept, `active`. Body: `system`, `code`, `display` (per language), `properties` (optional), `mappings` (optional), `period` (optional). Using the code of a platform concept creates the tenant's own version of it. |
| `PATCH /v1/code-concepts/:id` | Edits `display`, `properties`, `mappings`, `period`, `status` (`retired` or `active`) of a tenant concept. Optional `version` and `reason`. Empty body answers 422 `empty_update`. |
| `POST /v1/code-concepts/import` | Loads a ready-made bundle of concepts into the tenant. Body: `bundle` (`id` for the Indonesian defaults). Creates what is missing, skips what exists, never overwrites an edit. Answers `{ bundle, created, skipped }`. |

Permissions (new): `workforce.code-concept:read` for the list, `workforce.code-concept:manage` for create, edit and import.

The service also offers what later groups need, with no endpoint: `assertActive(tenantId, coding)` (the concept exists, is active, and its `period` covers today) and `resolve(tenantId, system, code)`.

## 2. Rules and decisions to confirm

| # | Rule or decision | Proposed |
|---|---|---|
| C1 | **Where the defaults live.** Import copies the bundle into the tenant as tenant concepts, so the hospital owns and can edit them. Platform-wide concepts (no `tenant_id`) are supported for reading and lookup precedence, but nothing in the API writes them; a platform operator loads them with a migration. Alternative: ship defaults only as platform-wide concepts shared by all tenants (no copies, but tenants then edit by overriding one code at a time). | Copy into the tenant; platform-wide supported for lookups only. |
| C2 | `system` and `code` cannot change after creation. Records refer to them. To rename, retire the concept and add a new one. | Fixed at creation. |
| C3 | `system` format: lower-case letters, digits, dots, hyphens, underscores, 2 to 64 characters, normally `<country>.<name>` (`id.license-type`). `code` format: the same characters, 1 to 64 (so ISCO codes like `2211` fit). Mapped codes in `mappings` are free text of 1 to 64 characters, because other systems use their own case (SNOMED, ICD). | As stated. |
| C4 | `display`: 1 to 10 languages, text 1 to 200 characters, no repeated language (the shared per-language check from 1.2). | As stated. |
| C5 | `properties` hold what rules read (for example `is_clinical`). A plain JSON object, at most 30 keys, key names in lower snake case up to 64 characters, values text, number, boolean, null or lists of those (no nesting), at most 4 KB when serialized. | As stated. |
| C6 | **Known systems are checked.** Rules in later groups read specific properties, so a missing one would break them at run time. The service knows the required properties of the systems the HR specification names and rejects a concept without them (422 `invalid_properties`). It matches on the name after the country prefix, so `id.license-type` and `us.license-type` follow the same rule. Unknown systems accept any properties. The required properties are in section 4. | Check known systems. |
| C7 | `period` (when the concept may be used) is optional, `{ start, end }` with local dates `YYYY-MM-DD`, `end` empty or not before `start`. This group adds the local-date check (`isLocalDate`) that every later group storing dates reuses. | Supported. |
| C8 | Concepts are never deleted: `retired` hides a concept from new records while old records keep working. Retired concepts can be activated again. | As stated. |
| C9 | A platform-wide concept cannot be edited through the API: `PATCH` on its id answers 404, like any id outside the tenant. A tenant changes one by creating its own concept with the same system and code (C1 override). | As stated. |
| C10 | The import bundle `id` is code, versioned with the application. Importing twice changes nothing the second time. Unknown bundle names answer 422 `unknown_bundle`. | As stated. |
| C11 | Only the `id` bundle now. Its systems: workforce category, employment type, licence type, unit type, assignment kind, committee, committee role and a starter list of professions (section 4). A Tenaga Medis profession list is legally defined, but mappings to ISCO-08 and the exact list need HR and legal to verify before go-live. | As stated. |

## 3. Code structure

```
apps/back-end/apps/
├── repository/
│   ├── token.ts                        + REPOSITORY_CODE_CONCEPT
│   ├── interface/code-concept.ts       findByCode(tenantId, system, code): tenant first, then platform
│   │                                   findBySystem(tenantId, system): tenant and platform rows
│   │                                   findOwn(tenantId, system, code): the tenant's own concept only
│   └── mongo/
│       ├── schema/common/coding.ts     exists
│       ├── schema/code-concept.ts      collection `code_concepts`; unique {tenant_id, system, code};
│       │                               index {tenant_id, system, status}
│       ├── code-concept.ts             updatable: display, properties, mappings, period, status
│       ├── code-concept.module.ts
│       └── code-concept.spec.ts
├── utility/validation/local-date.ts    isLocalDate, compareLocalDates, isValidPeriod (+ spec)
├── workforce/
│   ├── workforce.module.ts             + CodeConceptRepositoryModule, CodeConceptService
│   ├── concept/
│   │   ├── code-concept.service.ts     list, create, update, import, assertActive, resolve
│   │   ├── system-rules.ts             required properties of the known systems
│   │   ├── properties.ts               shape check of properties (C5)
│   │   ├── bundles.ts                  bundle registry (C10)
│   │   ├── bundle-id.ts                the Indonesian defaults
│   │   └── *.spec.ts
│   └── testing/in-memory.ts            + InMemoryCodeConcepts
├── identity/permission.ts              + workforce.code-concept:read, :manage
└── gateway_hr/src/
    ├── code-concept/                   module, controller, DTOs, gateway test
    └── testing/in-memory-workforce.ts  + code concepts
```

## 4. The Indonesian bundle and the known-system rules

Display is given in `id-ID` and `en` for every concept.

| System | Codes | Required properties (C6) |
|---|---|---|
| `id.workforce-category` | `tenaga_medis`, `tenaga_keperawatan`, `tenaga_kesehatan_lain`, `non_klinis` | `is_clinical` (boolean), `credentialing_committee` (text or null: the code of the committee in `id.committee`) |
| `id.employment-type` | `pkwtt`, `pkwt`, `mitra`, `intern`; each mapped to the universal `employment-type` codes `permanent`, `fixed_term`, `contractor`, `trainee` | `allows_probation` (boolean), `requires_end_date` (boolean) |
| `id.license-type` | `str`, `sip` | `eligibility_role` (`registration`, `practice_permit` or null), `requires_expiry_date` (boolean), `location_specific` (boolean); optional `max_locations_parameter` (text or null) |
| `id.unit-type` | `directorate`, `department`, `installation`, `ward`, `polyclinic` | `clinical_default` (boolean) |
| `id.assignment-kind` | `hire`, `transfer`, `promotion`, `acting`, `secondment` | none |
| `id.committee` | `komite_medik`, `komite_keperawatan`, `komite_tenaga_kesehatan_lain` | none |
| `id.committee-role` | `chair`, `secretary`, `member`, `mitra_bestari` | none |
| `id.profession` | starter list: `dokter`, `dokter_spesialis`, `dokter_gigi`, `perawat`, `bidan`, `apoteker`, `fisioterapis`, `ahli_gizi`, `analis_kesehatan`, `radiografer`; each mapped to an ISCO-08 code | `workforce_category` (text: the code in `id.workforce-category`) |

Systems not in the table (for example `us.license-type` with different codes) follow the same rules by name where they have the same suffix.

## 5. Tasks

Tests come first in each task.

1. **Local dates.** `isLocalDate`, `compareLocalDates`, `isValidPeriod`. *Tests:* real days, leap day, 30 February, wrong formats, a `Date` object, a period that ends before it starts.
2. **Repository.** Token, interface, schema, Mongo implementation, module. *Tests (fake model):* tenant concept wins over platform in `findByCode`; `findBySystem` returns both; a concept without `tenant_id` maps correctly; duplicate system and code is a conflict; update touches only the editable fields.
3. **Rules and bundle.** `properties.ts`, `system-rules.ts`, `bundles.ts`, `bundle-id.ts`. *Tests:* property shape limits; every bundle concept passes its own system's rules; both languages present; no duplicate system and code; mappings valid.
4. **Service.** list, create, update, import, `assertActive`, `resolve`. *Tests (in-memory):* tenant overrides platform in lists and lookups; create refuses a duplicate in the tenant but allows an override of a platform code; edit of a platform concept is not found; retire and reactivate; `assertActive` refuses missing, retired and expired concepts; invalid properties for known systems; import creates, then skips, never overwrites an edited concept; unknown bundle; reads write no log, writes log no values; tenant isolation; stale version.
5. **Endpoints.** Controller, DTOs, module, permissions, wiring. *Gateway tests:* 401 and 403; list without `system` is 400; create, list, edit; import twice; 404 for foreign and platform ids; 409 duplicate and stale version; 422 and 400 validation; reads write only the access log.
6. **Checks.** `tsc` for all apps and specs, `oxlint`, full `vitest`, `nest build gateway_hr`.

## 6. Pull requests

| PR | Kind | Content |
|---|---|---|
| A | Docs | Group 1.2 status updates and this plan (branch `docs/workforce-facilities`). |
| B | Code | Group 1.3 (branch `feat/gateway-hr-code-concepts`, cut from `main`). |
| C | Docs | After B merges: permission table and status updates. |

## 7. Review focus

1. Two requests create the same system and code in one tenant at once: one succeeds, the other gets 409.
2. A tenant concept with the code of a platform concept replaces it in lists and lookups, and retiring the tenant concept does not bring the platform one back silently (it stays retired for that tenant until the tenant concept is activated again or deleted by a migration).
3. `PATCH` with `system` or `code` is ignored, never applied.
4. A concept for a known system without its required properties is refused; the same properties on an unknown system are accepted.
5. A retired concept and a concept whose period ended cannot be used by `assertActive`, but still appear in a list filtered by `status=retired`.
6. Import twice changes nothing; import after a tenant edited a concept leaves the edit untouched.
