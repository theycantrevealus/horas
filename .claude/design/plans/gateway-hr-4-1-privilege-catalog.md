# gateway_hr 4.1: Privilege catalog

Status: **Confirmed** (2026-11-14). Decisions PC1 to PC16 confirmed as proposed. Part of `2026-11-10-gateway-hr-plan.md` (walkthrough order 14). Endpoints: `../hr-endpoints.md` 4.1. Collection: `../human-resource-collections.md` 4.2 (`privilege_catalog_items`, decision C2). Business rules: `../../business/administrative-operational-system/human-resource-management.md` 7.2 and `HR-CRD-007`. Model: `apps/back-end/apps/repository/model/privilege-catalog-item.ts` (exists, with its classification). Rules every endpoint follows: `../../rules/back-end/workforce.md` 3. Built references: positions (1.5: code, localized names, close-instead-of-delete), code concepts (1.3), committees (2.5), licences and credits (3.1, 3.2: starter code systems added to the `id` bundle).

The privilege catalog (the "buku putih") is the hospital's list of clinical privileges that can be requested: each item belongs to a committee, says which professions, specialties and career levels may request it, and what evidence the requester must attach. It is shared by every facility of the tenant, optionally restricted to the facilities that have the equipment. Credential applications (4.2) pick from it and grants (4.3) point to it. This group maintains the catalog only.

## 1. The five endpoints

| Endpoint | Behaviour |
|---|---|
| `GET /v1/privileges` | Lists catalog items. Query: optional `committee` (a code), `profession` (a code: items whose professions include it), `status`, `facilityId` (items that facility may grant, including those open to all), `limit`, `offset`. Ordered by code. Writes no log entry. |
| `POST /v1/privileges` | Adds an item. Body: `code`, `name`, `description` (optional), `committee` (`Coding`), `professions`, `specialties` (optional), `minClinicalLevel` (optional `Coding`), `requiredEvidence` (optional), `externalCodes` (optional), `facilityIds` (optional), optional `reason`. Created `active`. |
| `GET /v1/privileges/:id` | Returns one item. 404 `privilege_not_found`. |
| `PATCH /v1/privileges/:id` | Edits the names, description, professions, specialties, level, required evidence, external codes and facilities of an `active` item. Optional `version` and `reason`. |
| `POST /v1/privileges/:id/retire` | Stops new requests for an item. Optional `version` and `reason`. |

Permissions (new): `workforce.privilege:read` (list and read) and `workforce.privilege:write` (add, edit, retire).

## 2. Rules and decisions to confirm

| # | Rule or decision | Proposed |
|---|---|---|
| PC1 | **Code.** Upper case after trimming, 2 to 30 characters of letters, digits, dots, hyphens, underscores and slashes (for example `PD-012`). Unique per tenant (409 `privilege_exists`) and fixed after creation. A retired code is never reused: its grants keep pointing to it. | As stated. |
| PC2 | **Names and description.** `name` is a list of localized texts with at least one entry, `description` may be empty. The checks of 1.5 (one text per locale, length limits) are reused. | As stated. |
| PC3 | **Committee.** A `Coding` of a `committee` system (`id.committee`), active (`assertActive`). It is fixed after creation: moving an item to another committee would change who may recommend its existing grants. A mistaken committee is fixed by retiring the item and adding a new one. | Fixed. |
| PC4 | **Professions and specialties (HR-CRD-007).** At least one profession, each a `Coding` of a `profession` system, active, no duplicates, at most 20 (422 `professions_required`, `duplicate_code`). Specialties are optional (empty means any), `specialty` systems, active, at most 50. The service does not check that a specialty belongs to a profession: no data says so yet. | As stated. |
| PC5 | **Career level.** `minClinicalLevel` is `null` or a `Coding` of a `clinical-level` system, active. It is stored and returned; whether a profession has levels is not checked. | As stated. |
| PC6 | **Facilities.** Empty means every facility of the tenant. Otherwise each id names a facility of the tenant that is not deleted, no duplicates, at most 50 (422 `facility_not_found`, `duplicate_facility`). An inactive facility stays allowed so a later reactivation does not need an edit. | As stated. |
| PC7 | **Required evidence.** At most 20 entries, each with a `type` (a `Coding` of an `evidence-type` system, active, no two entries with the same type), a `description` (localized texts, at least one) and `mandatory`. **A new code system `id.evidence-type` joins the `id` bundle** (as 3.1 and 3.2 added theirs): `certificate`, `logbook`, `training_record`, `recommendation_letter`, `case_list`. Starter values to confirm with HR before go-live. | As stated. |
| PC8 | **External codes.** At most 10 `Coding`s such as ICD-9-CM or SNOMED CT procedure codes. They are checked for format only (system and code of 1 to 64 characters), not against `code_concepts`: no procedure code system is imported, so every code would be refused. Checking them waits for such an import. | Format only. |
| PC9 | **Retire.** `retire` turns an `active` item into `retired` (422 `privilege_retired` when it already is). It is final: there is no endpoint to reactivate, and a privilege that is needed again is added with a new code. Retired items cannot be requested; existing grants stay until their SPK ends (HR spec 7.2). | Final. |
| PC10 | **A retired item is not edited** (422 `privilege_retired`): its fields are the history of what was requested. | As stated. |
| PC11 | **Edit rules.** `PATCH` accepts only the editable fields of PC3 to PC8 and the names; the code, the committee and the status are not in the update DTO. A body with none of the editable fields answers 422 `empty_update`. Lists are replaced as a whole, not merged. | As stated. |
| PC12 | **Who may read.** `GET` needs `workforce.privilege:read`. An employee who applies for privileges (4.2) will need a read of the requestable items; that is decided in 4.2 together with the application routes, not here. | Permission-gated now. |
| PC13 | **Who may write.** The catalog is "maintained by each committee", but committee-scoped rights need scoped permissions, which are not built (`authentication.md` 6). `workforce.privilege:write` is tenant-wide, so any holder can edit any committee's items. | Tenant-wide for now. |
| PC14 | **List filters.** `committee` and `profession` match codes (system ignored). `facilityId` returns the items open to all facilities and those naming it. Default status is every status, so retired items stay visible to HR. | As stated. |
| PC15 | **No delete, no events.** A wrong item is retired. Nothing is emitted: grants and applications read the catalog directly. | As stated. |
| PC16 | **Tenant and ids.** `tenant_id` always from `@CurrentUser()`; a foreign, missing or malformed id gives the same 404; in a body it gives 422. | As stated. |

## 3. Repository

A new `PrivilegeCatalogRepository` (token, interface, schema with a pinned collection `privilege_catalog_items`, Mongo implementation on `MongoRepositoryBase`, module, in-memory fake with the same unique rule; model and classification exist):

- Reads (`find*`): `findByCode(tenantId, code)` and `findByFilter(tenantId, query)` for the list.
- Writes through the base class, each recorded. No `delete`. Updatable fields: the names, description, professions, specialties, `min_clinical_level`, `required_evidence`, `external_codes`, `facility_ids` and `status`.
- Indexes, all starting with `tenant_id`: unique `{ tenant_id, code }`, `{ tenant_id, committee.code, status }` and `{ tenant_id, professions.code, status }`.

## 4. Code structure

```
apps/back-end/apps/
├── repository/{token.ts, interface/privilege-catalog.ts}
├── repository/mongo/{privilege-catalog.ts, .module.ts, schema/privilege-catalog.ts} (+ spec)
├── workforce/privilege/{privilege.service.ts, privilege-rules.ts} (+ spec)
├── workforce/concept/bundle-id.ts        id.evidence-type (PC7)
├── workforce/testing/in-memory.ts        in-memory repository
├── identity/permission.ts                workforce.privilege:read, :write
└── gateway_hr/src/privilege/             controller, DTOs, module, gateway test
```

`gateway_hr/src/testing/in-memory-workforce.ts` registers the repository.

## 5. Tasks and pull requests

One code PR: the group has five endpoints and one repository.

| PR | Kind | Content |
|---|---|---|
| A | Docs | This plan (branch `docs/workforce-privileges-plan`). |
| B | Code | Repository, the code system, service, controller (branch `feat/workforce-privileges`). |
| C | Docs | After B merges: `workforce.md`, `hr-endpoints.md`, the master plan walkthrough and this plan's status. |

Tests come first in each task: repository (unique code, tenant isolation, no `_id`, one change record per write), service (every rejection above, tenant isolation, stale version, retired items, reads write no log, writes log no values) and gateway (401, 403, 404, 409, validation, list limits). Checks: `tsc`, `oxlint`, full `vitest` and `nest build gateway_hr`, run from `apps/back-end` under Node 22 (`pnpm` does not start on this machine).

## 6. Review focus

1. The code and the committee never change, and a retired item is never edited or reactivated.
2. Every profession, specialty, level, evidence type and facility is checked against its code system or the tenant.
3. A privilege cannot be requested by nobody: at least one profession is required.
4. Logs carry no code, names, descriptions or evidence texts.

## 7. Decisions that need your answer

Confirmed as proposed: PC4 (at least one profession, no specialty-to-profession check), PC7 (a new code system `id.evidence-type`), PC8 (external codes checked for format only), PC9 and PC10 (retire is final and a retired item is not edited), PC12 and PC13 (tenant-wide read and write permissions; no committee-scoped rights yet). The others are proposed as stated.
