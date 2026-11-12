# gateway_hr 2.1: Employee records

Status: **In discussion** (2026-11-13). Part of `2026-11-10-gateway-hr-plan.md` (walkthrough order 7). Endpoints: `../hr-endpoints.md` 2.1. Collection: `../account-and-workforce-collections.md` 4.1 and 10, HR specification 5.1, 5.2, 5.4 and 14. Model: `apps/back-end/apps/repository/model/employee.ts` (exists). Rules every endpoint follows: `../../rules/back-end/workforce.md` 3. Built references: groups 1.1 to 1.6, especially units and positions (1.4, 1.5) for the code and date patterns.

An employee record is the public and internal part of one person who works for the hospital: number, name, category, profession, specialties, status, work contacts. It is not an account (an employee needs no login, and an account needs no employee record) and it holds nothing confidential: birth date, addresses, national identifiers and bank accounts are in the private profile (2.2), a separate collection with its own permissions and encryption. Contracts (2.3) and assignments (2.4) fill the `current_employment` and `primary_assignment` summaries later.

## 1. The six endpoints

| Endpoint | Behaviour |
|---|---|
| `GET /v1/employees` | Searches the tenant's employees, ordered by `employee_number`. Filters: `name` (part of the display name), `employeeNumber` (starts with), `status`, `workforceCategory` (code), `isClinical`, `unitId` (the unit of the primary assignment). Paging `limit` and `offset`. Writes no log entry. |
| `GET /v1/employees/me` | The signed-in user's own record, found through the account's `employee_id`. Needs sign-in only. 404 `employee_not_found` when the account has no employee. |
| `POST /v1/employees` | Registers an employee, in `onboarding`. Body: `employeeNumber`, `name`, `otherNames`, `administrativeGender`, `workforceCategory`, `profession`, `specialties`, `clinicalLevel`, `hireDate`, `practitionerIds`, `workContacts`, `preferredLanguage`. |
| `GET /v1/employees/:id` | Returns one employee. A missing, malformed or other-tenant id answers 404 `employee_not_found`. |
| `PATCH /v1/employees/:id` | Edits the fields in E12. Optional `version` and `reason`. An empty body answers 422 `empty_update`. |
| `POST /v1/employees/:id/status` | Changes the employment status. Body: `status`, `effectiveDate` (optional), `reason` (required for `suspended` and `separated`), `version` (optional). |

`/me` is declared before `/:id` so `me` is never read as an identifier.

Permissions (new): `workforce.employee:read` for the list and `GET /:id`, `workforce.employee:write` for register and edit, `workforce.employee:status` for status changes (separate so HR Admin can register and edit while status stays with the HR Manager, if a hospital wants that split; a role may hold all three).

## 2. Rules and decisions to confirm

| # | Rule or decision | Proposed |
|---|---|---|
| E1 | **Employee number.** Entered by HR at registration, in the shared code format but upper case and also allowing `/` (for example `RS-2026/0042`): 1 to 32 characters, normalized to upper case. Unique in the tenant and never reused: employees are never deleted, and the unique index is not partial. Automatic numbering is a later addition (it needs a counter). Fixed after registration. | Entered by HR. |
| E2 | **Names.** `name` is the official name: `text` (full name as printed), optional `family`, `given` list, `prefix` and `suffix` (titles such as `dr.` and `Sp.PD`), up to 5 entries each, entries up to 100 characters, text up to 200. `display_name` is computed from `name.text` by the service and cannot be sent. `otherNames`: up to 5 more names with a `use` (`usual`, `maiden`, `alias`) and optional `script` (ISO 15924, four letters). | As stated. |
| E3 | **Gender.** `administrativeGender` is optional. It is stored as a `Coding` in the system `fhir.administrative-gender` with one of `male`, `female`, `other`, `unknown`. This is the international FHIR value set, so the four codes are fixed in code and need no code concept. | Fixed FHIR set. |
| E4 | **Workforce category.** Required: a `Coding` of a `workforce-category` system (`id.workforce-category`), active (`assertActive`). `is_clinical` is copied from the concept's `is_clinical` property and cannot be sent. | As stated. |
| E5 | **Profession.** A `Coding` of a `profession` system, active. Required when the category is clinical. The profession concept's `workforce_category` property must be the category's code (a dentist cannot be registered as `tenaga_keperawatan`): 422 `profession_category_mismatch`. A non-clinical employee may have no profession; if one is given it must match too. | As stated. |
| E6 | **Specialties.** Clinical employees only. Up to 10, each a `Coding` of a `specialty` system, active, no repeats, and exactly one primary when the list is not empty (matched against licences by `HR-LIC-003`). The Indonesian bundle ships no specialties; a hospital adds its own with the code concept endpoints. | As stated. |
| E7 | **Clinical level** (PK I to V): clinical employees only, a `Coding` of a `clinical-level` system, active, optional. | As stated. |
| E8 | **Practitioner identifiers** (SATUSEHAT IHS number, NPI, GMC number): at most 20, none empty, no repeated system (the shared check). Public registry numbers, not secret, so not encrypted. A system and value pair can belong to one employee in the tenant only: 409 `practitioner_id_taken`, backed by a partial unique index. | As stated. |
| E9 | **Work contacts.** At most 5. A `system` of `phone` or `email` with `use` fixed to `work` (personal contacts are in 2.2). Phones are E.164 (`+62812…`); emails are lower-cased and must look like an email address. At most one primary per system. `verified_at` is not accepted yet. | As stated. |
| E10 | `preferredLanguage` is optional, a BCP 47 tag. | As stated. |
| E11 | **Photo** is not accepted yet: it needs the file service. The field stays `null`. | Later. |
| E12 | **Editable fields.** `name`, `otherNames`, `administrativeGender`, `profession`, `specialties`, `clinicalLevel`, `practitionerIds`, `workContacts`, `preferredLanguage`. Not editable through `PATCH`: the number, the category and `is_clinical`, the hire date, the status and its date (the status endpoint), the separation date, `current_employment` and `primary_assignment` (kept by 2.3 and 2.4). A separated employee cannot be edited at all (422 `employee_separated`). | As stated. |
| E13 | **Category and hire date while onboarding.** A wrong category or hire date at registration would otherwise be permanent. They may be corrected only while the status is `onboarding`; after that they are fixed. This adds `workforceCategory` and `hireDate` to the `PATCH` body, refused with 422 `employee_started` once the employee has left onboarding. Changing the category re-checks the profession, specialties and clinical level against it. | Editable while onboarding. |
| E14 | **Hire date.** Required at registration, a local date between 1950-01-01 and one year ahead. The new employee is `onboarding` with `employment_status_since` equal to the hire date, no separation date and no contract or assignment summary. | As stated. |
| E15 | **Status transitions** follow HR specification 5.4: `onboarding` to `probation` or `active`, `probation` to `active`, `active` to `suspended` and back, and `onboarding`, `probation`, `active` or `suspended` to `separated`. Anything else answers 422 `invalid_transition`. `separated` is final: there is no rehire in this group (a returning person gets a new employee record until rehire is designed; `original_hire_date` is kept for that). The diagram draws `onboarding` to `probation` only; going from `onboarding` straight to `active` is added for contract types that do not allow probation (the type concepts have an `allows_probation` property). Say if the straight move should be left out. | Diagram plus `onboarding` to `active`. |
| E16 | **Status change details.** `effectiveDate` defaults to today in UTC (an employee has no facility yet, so no time zone), cannot be before the current `employment_status_since` and cannot be later than tomorrow (UTC). A `reason` is required for `suspended` and `separated`; it goes to the change history, not into the record. Becoming `separated` sets `separation_date` to the effective date. The status, its date and the separation date change in one write with one change record. Optional `version` (409 `stale_version`). | As stated. |
| E17 | **Checks that wait for other groups.** Leaving `onboarding` needs an active contract (2.3) and, for clinical employees, a valid STR and SIP (`HR-LIC-009`, licence group); `probation` needs a contract type that allows it (2.3). None of these records exist yet, so 2.1 does not check them. Each later group adds its check in the same PR that creates its records, and the PR will say that earlier status changes were not checked. | Checks arrive with their groups. |
| E18 | **Effects on the identity module are not built.** HR specification and the design say a separation or suspension disables the person's account, through an event to identity. The domain event outbox, its relay and the identity consumer do not exist yet. Until they do, changing a status writes the record and its change history only, and **an account of a separated employee stays usable until an administrator places a hold on it by hand**. This is a real gap, so the plan records it: the events should be built right after contracts (2.3), before any production use. | Gap accepted for now, events next. |
| E19 | **Search.** `name` matches part of the display name, case-insensitively; `employeeNumber` matches the start of the number; `workforceCategory` is the category code; `unitId` matches the unit of the primary assignment and returns nothing until 2.4 fills it. The list is ordered by employee number. The repository gets one named method for it, because several filters are nested fields. A foreign or malformed `unitId` gives an empty result or 400 as in 1.4. | As stated. |
| E20 | **Who sees what.** The collection holds only public and internal fields, so the read endpoints return the whole record to anyone holding `workforce.employee:read`. The reduced directory view for all staff and the Head of Unit view of their unit need scoped permissions, which do not exist yet (`authentication.md` 5); they come with that work. `/me` returns the caller's own complete record (`HR-SEC-004`). | Whole record for readers. |

## 3. Code structure

```
apps/back-end/apps/
├── repository/
│   ├── token.ts                         + REPOSITORY_EMPLOYEE
│   ├── interface/employee.ts            findByNumber(tenantId, number)
│   │                                    findByPractitionerId(tenantId, system, value)
│   │                                    findPage(tenantId, filters, paging)
│   └── mongo/
│       ├── schema/employee.ts           collection `employees`; unique {tenant_id, employee_number};
│       │                                {tenant_id, employment_status, is_clinical};
│       │                                {tenant_id, primary_assignment.unit_id, employment_status};
│       │                                partial unique {tenant_id, practitioner_ids.system, practitioner_ids.value}
│       ├── employee.ts                  updatable: the E12 fields, category, is_clinical, hire date, status fields
│       ├── employee.module.ts
│       └── employee.spec.ts
├── workforce/
│   ├── workforce.module.ts              + EmployeeRepositoryModule, EmployeeService
│   ├── employee/
│   │   ├── employee.service.ts          list, get, getOwn, register, update, changeStatus
│   │   ├── names.ts                     checks and cleans HumanName lists (E2)
│   │   ├── contacts.ts                  checks work contacts (E9)
│   │   ├── status.ts                    the transition table (E15) and date rules (E16)
│   │   └── *.spec.ts
│   └── testing/in-memory.ts             + InMemoryEmployees
├── identity/permission.ts               + workforce.employee:read, :write, :status
└── gateway_hr/src/
    ├── employee/                        module, controller, DTOs, gateway test
    └── testing/in-memory-workforce.ts   + employees
```

`EmployeeService.getOwn` takes the account's `employee_id` from `@CurrentUser()`, never from the request. It reuses `normalizeExternalIds`, the code format helpers and `CodeConceptService.assertActive`; the contact and name checks are new shared helpers in `employee/`.

## 4. Tasks

Tests come first in each task.

1. **Shared checks.** `names.ts`, `contacts.ts`, `status.ts`. *Tests:* names (limits, repeated uses, script codes, computed display name); contacts (E.164, emails lower-cased, one primary per system, work use only); every allowed and refused transition; date rules (before the current date, after tomorrow, default).
2. **Repository.** Token, interface, schema, Mongo implementation, module. *Tests (fake model):* create records one change entry; duplicate number and duplicate practitioner id are conflicts; `findByNumber`, `findByPractitionerId`, `findPage` filters; update touches only the editable fields (number, category flag and summaries ignored where E12 says so); malformed ids give empty results.
3. **Employee service.** *Tests (in-memory):* every rule E1 to E20; clinical and non-clinical registration; profession and category mismatch; specialties; category and hire date corrections while onboarding and refused afterwards; every status transition and the final separated state; separated employees cannot be edited; tenant isolation; `getOwn` with and without an employee link; stale version; reads write no log; writes log no values (no names, numbers or contacts).
4. **Endpoints.** Controller, DTOs, module, permissions, wiring. *Gateway tests:* 401 and 403; register, read, list with every filter, edit, status changes; `/me` with a linked and an unlinked account; 404 for malformed, missing and foreign ids; 409 for a duplicate number, a duplicate practitioner id and a stale version; validation (400 and 422); list limits; reads write only the access log; writes log no values.
5. **Checks.** `tsc` for all apps and specs, `oxlint`, full `vitest`, `nest build gateway_hr`.

## 5. Pull requests

| PR | Kind | Content |
|---|---|---|
| A | Docs | Group 1.6 status updates and this plan (branch `docs/workforce-parameters`). |
| B | Code | Group 2.1 (branch `feat/gateway-hr-employees`, cut from `main`). |
| C | Docs | After B merges: permission table and status updates. |

This is the largest group so far (six endpoints, name and contact rules, a status machine). If the diff goes past what a reviewer can read, the PR is split in two: registration, reading and editing first, status changes and `/me` second.

## 6. Review focus

1. Two requests register the same employee number at once: one succeeds, the other gets 409. The same for a practitioner identifier.
2. A clinical employee cannot be registered without a profession, or with a profession of another category, and a non-clinical one cannot carry specialties or a clinical level.
3. `PATCH` with the number, `is_clinical`, the status, the separation date or a summary field is ignored, never applied; the category and hire date change only while onboarding.
4. Every transition outside E15 is refused, and a separated employee cannot be changed, edited or moved again.
5. A status change writes one change record containing the status, its date and the separation date together, and the reason appears only in the change history.
6. `/me` never answers another person's record, and an account without an employee link answers 404, not an empty record.
7. No log entry holds a name, number, contact or identifier.
