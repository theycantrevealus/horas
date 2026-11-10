# Human Resource Management Collection Design

Status: **Approved** (2026-11-07). Models: `apps/back-end/apps/repository/model/` (built 2026-11-07); schemas and repositories not yet built. Business source: `../business/administrative-operational-system/human-resource-management.md` (rules `HR-*`). It builds on `account-and-workforce-collections.md` (approved), which already defines the shared conventions (section 2), the platform collections (section 3) and the core workforce collections (section 4). This document does not repeat them. It adds:

- the refinements to the core collections found while planning slice 1 (section 2);
- the collections of the three fully specified sub-processes: licences (section 3), credentialing (section 4) and rostering (section 5);
- the configurable parameters (section 6).

The outline sub-processes (HR spec 9.1 and 9.3 to 9.10: recruitment, attendance, leave, training, performance, payroll, occupational health, discipline, separation details) get collections only after the spec details them.

Every collection here follows `account-and-workforce-collections.md` 2.1 (`tenant_id`, `schema_version`, `version`, `created_at`, `updated_at`, `created_by`, no `updated_by`), `database.md` 4.4 (instants in UTC, calendar dates as `YYYY-MM-DD`, times of day as `HH:mm` with the facility's time zone) and `database.md` 6.1 (every write recorded in the change history). Fields in the tables below are in addition to those.

## 1. Overview

```
platform            organizations · facilities · code_concepts
core (approved)     employees ── employee_private_profiles
                       │  employment_contracts
                       │  organization_units ── positions ── position_assignments
                       │  committee_memberships
licences (§3)          ├── professional_licenses
                       ├── cpd_records · cpd_summaries
credentialing (§4)     ├── credential_applications ── credential_assessments
                       │       ▲ privilege_catalog_items
                       ├── clinical_appointments (SPK) ── privilege_grants
rostering (§5)         ├── shift_definitions · coverage_requirements · holiday_calendars
                       ├── rosters ── roster_assignments
                       ├── practice_schedules ── practice_schedule_exceptions
                       ├── shift_swap_requests
                       └── hr_imports (CSV: rosters, holidays)
parameters (§6)     hr_parameters
```

All HR records reference `employee_id`, never `account_id` (an employee may have no account).

**Clinical eligibility is not a collection.** `HR-ELG-001` forbids storing it. It is computed on demand from `employees.employment_status`, `professional_licenses`, `clinical_appointments` and `privilege_grants`. The indexes below are chosen so that this check is a few indexed lookups per employee.

## 2. Refinements to the core collections

Changes to `account-and-workforce-collections.md` section 4, found while planning slice 1. They are folded into that document when this one is approved.

| Collection | Change | Reason |
|---|---|---|
| `code_concepts` | `tenant_id` is `null` for platform-wide concepts. A tenant concept with the same `system` and `code` overrides the platform one. | One Indonesian or ISCO concept list shared by all tenants, with local additions. |
| `employee_private_profiles` | `identifiers` hold only `value_masked`, `value_hash` and the encrypted value; writes take a separate input shape with the plain `value`. `birth_date` is stored encrypted. `family_members` carry no identifiers until payroll needs them. | Plain values never leave the repository except through one reveal method. |
| `position_assignments` | Add `is_open: boolean` (true while `planned` or `active`). The "one primary per employee" and "one head per unit" unique indexes filter on `is_open: true`. | MongoDB partial indexes cannot use `$in` or `$ne`. |
| `committee_memberships` | Implemented with credentialing (section 4), not with the core. | Only credentialing uses committees. |

## 3. Professional licences (HR spec section 6)

### 3.1 Licence types as concepts

Licence types are configuration, not code (HR spec 6.2). They are `code_concepts` in a jurisdiction system (`id.license-type`, `us.license-type`, ...) with these `properties`:

| Property | Type | Meaning |
|---|---|---|
| `eligibility_role` | `'registration' \| 'practice_permit' \| null` | Which eligibility condition it satisfies. In Indonesia STR is `registration` and SIP is `practice_permit` (HR spec 5.5 conditions 2 and 3). A specialist certificate is `null`: recorded, not part of eligibility. |
| `requires_expiry_date` | boolean | SIP `true` (`HR-LIC-005`); STR `false` (`HR-LIC-004`). |
| `location_specific` | boolean | The licence names a practice location (SIP). |
| `max_locations_parameter` | string \| null | Parameter limiting active locations (`MAX_PRACTICE_LOCATIONS_MEDIS`, `HR-LIC-007`). |
| `professions` | `Coding[]` | Professions the type applies to; empty means all clinical professions. |

Eligibility code asks "is there a valid `registration` and a valid `practice_permit` for this facility", so another country only configures its own types.

### 3.2 `professional_licenses`

Never deleted (`HR-LIC-008`). A correction rejects the record and registers a new one.

| Field | Type | Notes |
|---|---|---|
| `employee_id` | ObjectId | |
| `license_type` | `Coding` | Validated against `code_concepts`. |
| `eligibility_role` | `'registration' \| 'practice_permit' \| null` | Copied from the type at registration, so later concept edits do not change history. |
| `profession`, `specialty` | `Coding`, `Coding \| null` | Must equal the employee's to be verified (`HR-LIC-003`). |
| `document_number` | string | As printed. |
| `document_number_normalized` | string | Upper-case, without spaces, dots and hyphens; used for uniqueness. |
| `issuing_authority` | `{ code: Coding \| null; name: string }` | KKI, Kemenkes, a Dinas Kesehatan, a state board. |
| `jurisdiction` | `{ country: string; subdivision: string \| null }` | ISO 3166-1 and 3166-2 (a SIP's kabupaten/kota is in `practice_location.address`). |
| `practice_location` | `{ facility_id: ObjectId \| null; name: string; address: Address \| null } \| null` | Required when the type is `location_specific`. `facility_id` set means "this hospital" (replaces the spec's "Is this hospital"). Other locations are declared by the employee (`HR-LIC-007`). |
| `issue_date` | string (date) | |
| `expiry_date` | string (date) \| null | Required when the type requires it. |
| `document` | `FileRef` | Scan of the original. |
| `status` | `'pending_verification' \| 'valid' \| 'rejected' \| 'expired' \| 'revoked' \| 'superseded'` | HR spec 6.3, plus `superseded` (section 3.3). |
| `status_effective_date` | string (date) | When the current status took effect (revocation date, expiry date). |
| `is_live` | boolean | `false` once `rejected`. Drives the uniqueness index. |
| `submission` | `{ via: 'self_service' \| 'hr'; by: ActorRef; at: Date }` | `HR-LIC-002`: the verifier must differ from `submission.by`. |
| `verification` | `{ by: ActorRef; at: Date; method: Coding; outcome: 'match' \| 'mismatch'; notes: string \| null } \| null` | `method` e.g. `manual_registry_check` (HR spec 6.4.2). |
| `rejection` | `{ reason: Coding; notes: string \| null } \| null` | |
| `revocation` | `{ effective_date: string; reason: Coding; notes: string \| null } \| null` | Recorded by HR Admin (HR spec 6.4.4). |
| `replaces_license_id` | ObjectId \| null | Renewal chain: a renewed SIP is a new record (HR spec 6.4.3). |
| `superseded` | `{ by_license_id: ObjectId; effective_date: string } \| null` | Set on the old SIP when its renewal is verified (section 3.3). |

Indexes:

| Index | Purpose |
|---|---|
| `{ tenant_id, license_type.system, license_type.code, document_number_normalized }` unique, partial `is_live: true` | One live record per document number and type. A rejected record does not block its correction. |
| `{ tenant_id, employee_id, eligibility_role, status }` | Eligibility check. |
| `{ tenant_id, status, expiry_date }` | Daily expiry job and the licence-expiry report (`LICENSE_ALERT_DAYS`). |
| `{ tenant_id, 'practice_location.facility_id', status }` | Facility report. |
| `{ tenant_id, employee_id, profession.system, profession.code, 'practice_location.facility_id' }` unique, partial `{ status: 'valid', eligibility_role: 'practice_permit', 'practice_location.facility_id': { $type: 'objectId' } }` | At most one valid practice permit per employee, profession and facility of this tenant (`HR-LIC-006`, decision C1). |

Classification: `internal` (licence numbers and expiry are internal, HR spec 14); `rejection.notes`, `revocation.notes`, `verification.notes` are `confidential`.

### 3.3 One valid SIP per facility (decision C1)

A SIP names exactly one hospital or clinic, and at most one valid SIP may exist per employee, profession and facility at a time (decided 2026-11-07). The index above enforces it. A renewal therefore works like this:

1. The new SIP is registered while the old one is still valid; it stays `pending_verification` (allowed, because the index counts only `valid` records).
2. When HR Admin verifies the new SIP, the old one becomes `superseded` (with `superseded.by_license_id` and `effective_date` = the new SIP's issue date) and the new one becomes `valid`, in one transaction.
3. If the new SIP's issue date is in the future, verification is refused until that date, so the employee is never left without a valid SIP in between.

`superseded` is a new licence status; the HR specification needs the change listed in section 8.

### 3.4 `cpd_records` (SKP, CME, CPD)

| Field | Type | Notes |
|---|---|---|
| `employee_id` | ObjectId | |
| `credit_system` | `Coding` | `id.skp`, `us.cme`, `gb.cpd`. |
| `activity` | `{ title: string; category: Coding; provider: string \| null }` | |
| `activity_date` | string (date) | |
| `points` | number | Decimal; stored as a number with at most 2 decimals. |
| `evidence` | `FileRef \| null` | |
| `source` | `'manual' \| 'training_record' \| 'external_platform'` | `training_record` when created from HR spec 9.5 later. |
| `status` | `'submitted' \| 'accepted' \| 'rejected'` | |

Index: `{ tenant_id, employee_id, credit_system, activity_date }`.

### 3.5 `cpd_summaries`

When the national platform (SKP Kemenkes, a board's CME system) is the source of truth, HRM keeps only the latest known total (HR spec 6.2).

| Field | Type | Notes |
|---|---|---|
| `employee_id`, `credit_system` | | Unique together per tenant. |
| `profession` | `Coding` | The requirement depends on it (`SKP_REQUIRED_POINTS`). |
| `cycle` | `DatePeriod` | The counting period, usually the SIP's validity. |
| `total_points` | number | |
| `checked_at` | Date | |
| `source` | `'computed' \| 'external_platform'` | |

`HR-LIC-010` compares `total_points` with the requirement when an expiry alert is sent.

## 4. Credentialing and clinical privileging (HR spec section 7)

### 4.1 `committee_memberships`

As in `account-and-workforce-collections.md` 4.7 (`employee_id`, `committee: Coding`, `role: Coding` chair/secretary/member/mitra_bestari, `facility_id`, `period`, `decision_ref`, `status`). Index `{ tenant_id, facility_id, committee, status }`.

### 4.2 `privilege_catalog_items` ("buku putih")

| Field | Type | Notes |
|---|---|---|
| `facility_ids` | ObjectId[] | Shared by every facility of the tenant (decision C2). Empty means all facilities; a non-empty list restricts an item to sites that have the equipment (for example a cath lab). |
| `code` | string | `PD-012`. Unique per tenant. |
| `name`, `description` | `LocalizedText[]` | |
| `committee` | `Coding` | Owning committee. |
| `professions`, `specialties` | `Coding[]` | Who may request it (`HR-CRD-007`). |
| `min_clinical_level` | `Coding \| null` | Nurses and midwives: required career level. |
| `required_evidence` | `{ type: Coding; description: LocalizedText[]; mandatory: boolean }[]` | Certificates, logbook, training. |
| `external_codes` | `Coding[]` | Optional mapping (ICD-9-CM procedure, SNOMED CT procedure). |
| `status` | `'active' \| 'retired'` | Retired items cannot be requested; existing grants stay. |

Index: `{ tenant_id, code }` unique; `{ tenant_id, committee, status }`.

### 4.3 `credential_applications`

| Field | Type | Notes |
|---|---|---|
| `employee_id` | ObjectId | |
| `credentialing_facility_id` | ObjectId | Facility whose committee credentials the applicant and whose Director decides (decision C7). With `CREDENTIALING_SCOPE` `facility`, every requested unit must belong to it (section 4.7). |
| `credentialing_scope` | `'facility' \| 'group'` | Copied from `CREDENTIALING_SCOPE` when the application is created. |
| `type` | `'initial' \| 'recredentialing' \| 'privilege_extension' \| 'temporary'` | |
| `committee` | `Coding` | From the employee's workforce category (`credentialing_committee` property). |
| `status` | `'draft' \| 'submitted' \| 'under_review' \| 'returned' \| 'assessed' \| 'recommended' \| 'approved' \| 'rejected' \| 'withdrawn'` | HR spec 7.3. `returned` moves back to `draft` when the applicant edits. |
| `status_since` | Date | For `CREDENTIAL_SLA_DAYS` alerts. |
| `requested_privileges` | `{ catalog_item_id: ObjectId; code: string; requested_condition: 'full' \| 'supervised' \| 'restricted'; proposed_supervisor_employee_id: ObjectId \| null; notes: string \| null }[]` | `code` is a snapshot of the catalog code. |
| `requested_unit_ids` | ObjectId[] | Units in any facility of the tenant (decision C3). |
| `requested_facility_ids` | ObjectId[] | Derived from the units; used for the SIP check per facility. |
| `documents` | `{ type: Coding; file: FileRef; license_id: ObjectId \| null }[]` | `license_id` links an attached STR/SIP to its licence record. |
| `assessors` | `{ employee_id: ObjectId; appointed_at: Date; appointed_by: ActorRef; conflict_declaration: { declared_at: Date; has_conflict: boolean; relationship: Coding \| null } \| null }[]` | `HR-CRD-005`: an assessor with a conflict, the applicant, or a relative cannot assess. At least `MIN_ASSESSORS`. |
| `recommendation` | `{ decided_at: Date; signed_by: ActorRef; summary: string; privileges: { catalog_item_id: ObjectId; outcome: 'recommended' \| 'not_recommended'; condition: 'full' \| 'supervised' \| 'restricted' \| null; supervisor_employee_id: ObjectId \| null; restriction_notes: string \| null }[] } \| null` | `HR-CRD-008`: never more than requested. |
| `decision` | `{ outcome: 'approved' \| 'rejected'; decided_by: ActorRef; decided_at: Date; reason: string \| null; appointment_id: ObjectId \| null } \| null` | Director's decision. |
| `return_reason`, `withdrawal_reason` | string \| null | Last one only; earlier ones are in the change history. |
| `temporary` | `{ requested_days: number; urgency: Coding } \| null` | Type `temporary` only; at most `TEMPORARY_PRIVILEGE_MAX_DAYS`. |
| `previous_appointment_id` | ObjectId \| null | The SPK being renewed or extended. |

Indexes: `{ tenant_id, employee_id, status }`; `{ tenant_id, committee, status, status_since }` (committee work queue and SLA). Classification: `internal`; `recommendation.summary`, `decision.reason`, `return_reason` are `highly_confidential` (HR spec 14: credentialing assessments).

Never deleted (`HR-CRD-010`); every status change carries a reason in the change history.

### 4.4 `credential_assessments`

Kept apart from applications because assessments are highly confidential and read-audited (`HR-AUD-003`). Only the committee and the Director can read them.

| Field | Type | Notes |
|---|---|---|
| `application_id`, `employee_id` | ObjectId | `employee_id` is the applicant (denormalized for access checks). |
| `assessor_employee_id` | ObjectId | |
| `catalog_item_id` | ObjectId | |
| `methods` | `Coding[]` | document review, interview, observation, logbook. |
| `outcome` | `'recommended' \| 'not_recommended'` | |
| `recommended_condition` | `'full' \| 'supervised' \| 'restricted' \| null` | |
| `reason` | string | |
| `assessed_at` | Date | |

Index: `{ tenant_id, application_id, assessor_employee_id, catalog_item_id }` unique. Classification: default `highly_confidential`.

### 4.5 `clinical_appointments` (SPK)

| Field | Type | Notes |
|---|---|---|
| `appointment_number` | string | SPK letter number. Unique per tenant. |
| `employee_id` | ObjectId | |
| `credentialing_facility_id` | ObjectId | Facility whose committee recommended it and whose Director issued it (decision C7). |
| `facility_ids` | ObjectId[] | Derived from `unit_ids`. Exactly `[credentialing_facility_id]` under scope `facility`; several facilities only under scope `group` (section 4.7). |
| `source_application_id` | ObjectId | |
| `unit_ids` | ObjectId[] | Explicit units, possibly in several facilities (`HR-CRD-009`). |
| `valid_period` | `{ start: string; end: string }` | Local dates; at most `SPK_VALIDITY_YEARS` (`HR-CRD-004`), at most `TEMPORARY_PRIVILEGE_MAX_DAYS` when temporary. |
| `is_temporary` | boolean | |
| `status` | `'active' \| 'suspended' \| 'revoked' \| 'expired' \| 'superseded'` | HR spec 7.3. Expiry is set by the system. |
| `is_current` | boolean | `true` while `active` or `suspended`. Drives "one current non-temporary appointment per employee and credentialing facility": a doctor who practises in two hospitals of the group has two SPKs. |
| `issued` | `{ by: ActorRef; director_employee_id: ObjectId; date: string }` | Director (or delegate, HR spec Q4) of the credentialing facility. |
| `signed_document` | `FileRef \| null` | |
| `suspension` | `{ effective_date: string; reason: string; decision_ref: string } \| null` | `HR-CRD-003`: a lapsed licence is not a suspension; no status change. |
| `revocation` | `{ effective_date: string; reason: string; decision_ref: string } \| null` | |
| `superseded_by_id` | ObjectId \| null | |

An SPK spanning facilities does not replace the per-facility SIP: eligibility in a unit still needs a valid SIP for that unit's facility (HR spec 5.5 condition 3, decision C1). Issuing an SPK checks `HR-CRD-002` for every facility in `facility_ids`.

Indexes: `{ tenant_id, appointment_number }` unique; `{ tenant_id, employee_id, credentialing_facility_id, is_temporary }` unique, partial `is_current: true, is_temporary: false`; `{ tenant_id, unit_ids, status }` (eligibility for a unit); `{ tenant_id, employee_id, status }` (eligibility); `{ tenant_id, status, 'valid_period.end' }` (expiry job, `RECREDENTIAL_LEAD_DAYS`).

### 4.6 `privilege_grants` (lines of the RKK)

Separate from appointments so "who holds privilege Z" and supervisor checks are indexed queries.

| Field | Type | Notes |
|---|---|---|
| `appointment_id` | ObjectId | |
| `employee_id`, `facility_ids`, `unit_ids` | | Denormalized from the appointment. |
| `catalog_item_id` | ObjectId | |
| `code` | string | Snapshot. |
| `condition` | `'full' \| 'supervised' \| 'restricted'` | |
| `supervisor` | `{ employee_id: ObjectId; grant_id: ObjectId } \| null` | Required when `supervised`; the supervisor's own grant must be `full` and active (`HR-CRD-006`). |
| `restriction_notes` | string \| null | Required when `restricted`. |
| `status` | `'active' \| 'suspended' \| 'revoked'` | |
| `status_change` | `{ effective_date: string; reason: string; decision_ref: string } \| null` | Latest; earlier ones in the change history. |
| `flag` | `{ reason: 'supervisor_lost_privilege'; at: Date; resolved_at: Date \| null } \| null` | `HR-CRD-006`. |

Indexes: `{ tenant_id, employee_id, status }`; `{ tenant_id, catalog_item_id, status }` (privilege directory); `{ tenant_id, 'supervisor.grant_id' }` (find supervised grants when a supervisor loses theirs).

### 4.7 Credentialing scope (decisions C3 and C7)

Under Indonesian regulation each hospital or primary facility credentials its own staff through its own Komite Medik (or Komite Keperawatan, Komite Tenaga Kesehatan Lain), and its own Director issues the SPK. Some international hospital groups instead credential once, centrally, for all their sites. The collections support both; a tenant parameter chooses:

| `CREDENTIALING_SCOPE` | Who credentials | What an SPK covers |
|---|---|---|
| `facility` (default, Indonesia) | The committee of `credentialing_facility_id`. | Units of that facility only. A practitioner working in several facilities of the group holds one SPK per facility, each from its own committee and Director. |
| `group` | A committee whose `committee_memberships.facility_id` is the group's lead facility, acting for the whole tenant. | Units in any facility of the tenant (decision C3). |

In both cases eligibility in a unit needs a valid SIP for that unit's facility (decision C1), and the privilege catalog is shared by the group (decision C2). The scope is read when an application is created and copied into it, so changing the parameter later does not alter applications or SPKs already in progress.

## 5. Shift scheduling and rostering (HR spec section 8)

### 5.1 `shift_definitions`

| Field | Type | Notes |
|---|---|---|
| `facility_id` | ObjectId | |
| `code`, `name` | string, `LocalizedText[]` | `P`, `S`, `M`, `L`, `ND`. Unique per facility. |
| `type` | `'regular' \| 'on_call_onsite' \| 'on_call_remote' \| 'off'` | |
| `start_time`, `end_time` | string (`HH:mm`) \| null | Null for `off`. `end_time` earlier than `start_time` means the next day. |
| `paid_minutes` | number | Working time counted (on-call per HR spec Q6). |
| `is_night` | boolean | For `MAX_CONSECUTIVE_NIGHTS` (`HR-ROS-015`). |
| `unit_ids` | ObjectId[] | Empty: all units. |
| `status` | `'active' \| 'retired'` | |

### 5.2 `holiday_calendars`

The coverage day pattern "weekends and public holidays" needs holidays, and they differ per country, province and hospital.

| Field | Type | Notes |
|---|---|---|
| `code` | string | `id-national`, `id-jk` (Jakarta), a hospital's own. |
| `country`, `subdivision` | string, string \| null | |
| `holidays` | `HolidayEntry[]` | One document per calendar and year (`year` field) to keep documents small. |
| `last_import_id` | ObjectId \| null | Latest `hr_imports` run that loaded this calendar (section 5.9). |
| `year` | number | Unique with `code` per tenant (`tenant_id` null for platform calendars). |

```ts
interface HolidayEntry {
  date: string                                   // YYYY-MM-DD
  name: LocalizedText[]
  kind: 'public' | 'collective_leave' | 'local'
  source: 'imported' | 'manual'                  // decision C6: both, combined
  status: 'active' | 'removed'                   // HR can remove an imported day without deleting it
  import_id: ObjectId | null                     // set when source is 'imported'
}
```

Imported and HR-maintained days live in the same calendar (decision C6). An entry is identified by `date` and `kind`. A new import adds and updates `imported` entries but never touches `manual` entries, and never brings back an imported entry HR set to `removed`. HR can add `manual` days (for example a hospital anniversary) to any calendar.

`facilities` gets `holiday_calendar_codes: string[]` (core refinement, added with this slice).

### 5.3 `coverage_requirements`

| Field | Type | Notes |
|---|---|---|
| `unit_id`, `shift_definition_id` | ObjectId | |
| `day_pattern` | `'all' \| 'weekdays' \| 'weekends_holidays'` | |
| `match` | `{ workforce_category: Coding \| null; profession: Coding \| null; specialty: Coding \| null; min_clinical_level: Coding \| null }` | What kind of staff counts. |
| `min_count` | number | |
| `team_leader_required` | boolean | `HR-ROS-022`. |
| `period` | `DatePeriod` | Requirements change over time; a roster uses those valid on each date. |
| `status` | `'active' \| 'retired'` | |

Index: `{ tenant_id, unit_id, status }`.

### 5.4 `rosters`

| Field | Type | Notes |
|---|---|---|
| `unit_id`, `facility_id` | ObjectId | |
| `period` | `{ start: string; end: string }` | `ROSTER_PERIOD`, normally a calendar month. Unique per unit and start. |
| `status` | `'draft' \| 'submitted' \| 'approved' \| 'published' \| 'closed'` | HR spec 8.3. |
| `revision` | number | The spec's roster "version": increases on each published change. Separate from the document's `version` (concurrency). |
| `prepared_by` | `ActorRef` | Head of Unit. |
| `submitted`, `approved`, `published`, `closed` | `{ by: ActorRef; at: Date } \| null` | One per step; `approved` stays null when `ROSTER_APPROVAL_REQUIRED` is off. |
| `return_reason` | string \| null | |
| `coverage_overrides` | `{ date: string; shift_definition_id: ObjectId; requirement_id: ObjectId; reason: string; by: ActorRef; at: Date }[]` | `HR-ROS-021`; listed in the coverage report. Bounded by days × shifts of one period. |
| `validation` | `{ checked_at: Date; violations: number; coverage_gaps: number } \| null` | Summary of the last full validation, for the list screen. Details are recomputed, not stored. |

Index: `{ tenant_id, unit_id, 'period.start' }` unique; `{ tenant_id, status, 'period.start' }` (`ROSTER_PUBLISH_LEAD_DAYS` alert).

`HR-ROS-042` (keep each previous version) is met by the change history: every assignment change is a change record with the roster `revision`. No snapshot collection.

### 5.5 `roster_assignments`

One person, one shift, one date. The largest collection: about one document per clinical employee per day. Employees of every employment type can be assigned, including contracted practitioners (`mitra`, decision C5); the eligibility rules of HR spec 8.5 apply to them unchanged.

| Field | Type | Notes |
|---|---|---|
| `roster_id`, `unit_id`, `facility_id` | ObjectId | |
| `employee_id` | ObjectId | |
| `date` | string (date) | The date the shift starts (local). |
| `shift` | `{ definition_id: ObjectId; code: string; type: string; start_time: string \| null; end_time: string \| null; paid_minutes: number; is_night: boolean }` | Snapshot, so editing a definition does not rewrite the past. |
| `starts_at`, `ends_at` | Date \| null | UTC instants computed from `date`, the times and the facility time zone (DST-safe). Used for overlap, rest and on-duty queries. Null for `off`. |
| `role` | `'staff' \| 'team_leader' \| 'supervisor' \| 'dpjp_on_call'` | |
| `status` | `'planned' \| 'cancelled'` | Worked or not is attendance (HR spec 9.3). |
| `source` | `{ kind: 'roster' \| 'import' \| 'swap' \| 'change_request'; ref_id: ObjectId \| null }` | `import` with `ref_id` = the `hr_imports` run (section 5.9). |
| `change_reason` | string \| null | Required for changes after publication (HR spec 8.4.3). |
| `revision` | number | Roster revision that created or last changed it. |
| `overtime` | `{ minutes: number; consent: { at: Date; document: FileRef \| null } \| null } \| null` | `HR-ROS-013`. |
| `flag` | `{ reason: 'eligibility_lost'; failed: 'employment' \| 'str' \| 'sip' \| 'spk' \| 'leave' \| 'suspension'; at: Date; resolved_at: Date \| null } \| null` | `HR-ROS-031`: flagged, not cancelled. While unresolved, clinical modules treat the person as not on duty. |
| `is_flagged` | boolean | `true` while `flag` is set and unresolved; exists for the partial index below. |

Indexes:

| Index | Purpose |
|---|---|
| `{ tenant_id, employee_id, starts_at }` | Overlap, rest, weekly hours and night-run checks across all units (`HR-ROS-010` to `016`). |
| `{ tenant_id, roster_id, date }` | Roster screen. |
| `{ tenant_id, unit_id, status, starts_at, ends_at }` | "Who is on duty in unit U now" (HR spec 13). |
| `{ tenant_id, unit_id, is_flagged }` partial `is_flagged: true` | Unresolved flags for the Head of Unit and HR Admin (`HR-ROS-031`). |

Assignments are created in two ways (decision C4):

- **One at a time**, by the Head of Unit on the roster screen. Each is validated against HR spec 8.5 as it is entered.
- **In bulk from a CSV file** (section 5.9), and when the system pre-fills a draft from the previous period or a rotation pattern. The repository's named write method `createMany(rosterId, assignments)` inserts them in one transaction and records **one change record per assignment** with the import as reason. This satisfies `database.md` 6.1, which allows a named method that records every affected entity; generic `insertMany`/`updateMany` stay forbidden.

### 5.6 `practice_schedules`

| Field | Type | Notes |
|---|---|---|
| `employee_id` | ObjectId | Tenaga Medis (`HR-ROS-004`). |
| `unit_id`, `facility_id` | ObjectId | The polyclinic. |
| `day_of_week` | number | ISO 1 (Monday) to 7. |
| `start_time`, `end_time` | string (`HH:mm`) | |
| `quota` | number \| null | |
| `period` | `DatePeriod` | Valid from, valid until. |
| `status` | `'active' \| 'ended'` | |

Index: `{ tenant_id, unit_id, day_of_week, status }` (registration: "who practises in polyclinic C on date D"); `{ tenant_id, employee_id, status }`.

### 5.7 `practice_schedule_exceptions`

Separate from schedules so exceptions do not grow a schedule document without limit.

| Field | Type | Notes |
|---|---|---|
| `schedule_id`, `employee_id`, `unit_id` | ObjectId | |
| `date` | string (date) | |
| `kind` | `'cancelled' \| 'moved'` | |
| `moved_to` | `{ date: string; start_time: string; end_time: string } \| null` | |
| `reason` | `Coding` | leave, training, emergency, other. |
| `source` | `{ kind: 'manual' \| 'leave' \| 'training'; ref_id: ObjectId \| null }` | Leave and training create them automatically later (HR spec 8.4.4). |

Index: `{ tenant_id, schedule_id, date }` unique; `{ tenant_id, unit_id, date }`.

### 5.8 `shift_swap_requests`

| Field | Type | Notes |
|---|---|---|
| `unit_id`, `roster_id` | ObjectId | |
| `requester` | `{ employee_id: ObjectId; assignment_id: ObjectId }` | |
| `counterpart` | `{ employee_id: ObjectId; assignment_id: ObjectId \| null } \| null` | `null` when the requester gives the shift away. |
| `reason` | string | |
| `status` | `'requested' \| 'accepted_by_counterpart' \| 'approved' \| 'rejected' \| 'cancelled'` | |
| `counterpart_response` | `{ at: Date } \| null` | |
| `decision` | `{ by: ActorRef; at: Date; reason: string \| null } \| null` | Head of Unit. |
| `resulting_assignment_ids` | ObjectId[] | Created on approval (source `swap`). |

Index: `{ tenant_id, unit_id, status }`; `{ tenant_id, 'counterpart.employee_id', status }` (counterpart's inbox).

### 5.9 `hr_imports`

One document per file import, shared by roster assignments and holiday calendars (and later other HR imports). An import is checked first and applied only when the user confirms, so a bad file changes nothing.

| Field | Type | Notes |
|---|---|---|
| `kind` | `'roster_assignments' \| 'holiday_calendar'` | |
| `target` | `{ roster_id: ObjectId } \| { calendar_code: string; year: number }` | |
| `file` | `FileRef` | The uploaded CSV. `sha256` lets the service refuse the same file twice for one target. |
| `status` | `'uploaded' \| 'validated' \| 'invalid' \| 'applying' \| 'applied' \| 'failed' \| 'cancelled'` | `invalid` when any row fails; nothing is written then. |
| `counts` | `{ rows: number; valid: number; invalid: number; created: number; updated: number; skipped: number }` | |
| `errors` | `{ row: number; column: string \| null; code: string }[]` | At most `IMPORT_MAX_ERRORS` (default 500). Codes only, never cell values, because cells can hold names or employee numbers. |
| `uploaded`, `applied` | `{ by: ActorRef; at: Date } \| null` | |
| `failure` | `{ error: string; retryable: boolean } \| null` | Error class name only. |

Index: `{ tenant_id, kind, status, created_at: -1 }`; `{ tenant_id, 'file.sha256', kind }`.

Rules for the roster CSV:

- Columns: `employee_number`, `date` (`YYYY-MM-DD`), `shift_code`, `role` (optional, default `staff`). One row per assignment.
- Only into a roster in `draft` status. Changes to a published roster stay one at a time with a reason (HR spec 8.4.3).
- Validation runs every rule of HR spec 8.5 on the whole file together with the assignments already in the roster, including working-time rules across other units (`HR-ROS-016`). Coverage gaps are reported but do not block the import; they block submission (`HR-ROS-021`).
- Rows over `IMPORT_MAX_ROWS` (default 5,000) reject the file.

Rules for the holiday CSV: columns `date`, `kind`, `name_<locale>` (one column per locale, for example `name_id-ID`, `name_en`); merged as described in section 5.2.

## 6. `hr_parameters` (HR spec section 10)

Parameters change without code changes and must explain past decisions, so each value has a scope and an effective date.

| Field | Type | Notes |
|---|---|---|
| `key` | string | `LICENSE_ALERT_DAYS`, `MAX_WEEKLY_HOURS`, ... Validated against a catalog in code that gives each key its type and allowed scopes. |
| `scope` | `{ kind: 'tenant' \| 'organization' \| 'facility' \| 'unit' \| 'committee'; id: string \| null }` | `committee` for `MIN_ASSESSORS`. |
| `value` | unknown | Checked against the key's type (number, number list, boolean, per-profession map). |
| `effective_from` | string (date) | |
| `notes` | string \| null | Legal basis, for example the PKB article. |

Index: `{ tenant_id, key, 'scope.kind', 'scope.id', effective_from }` unique. Lookup takes the most specific scope with the latest `effective_from` on or before the date in question; when none exists, the code default from HR spec section 10 applies.

## 7. Sensitivity

| Collection | Class |
|---|---|
| `professional_licenses`, `cpd_*`, `privilege_catalog_items`, `clinical_appointments`, `privilege_grants`, rostering collections, `hr_parameters` | Internal (HR spec 14). Public where the spec says so: practice schedules. |
| `credential_applications` | Internal, with highly confidential notes and recommendation text. |
| `credential_assessments` | Highly confidential; reads are recorded (`HR-AUD-003`). |

New field names that carry sensitive values in logs: none beyond those in `account-and-workforce-collections.md` 8.3.

## 8. Decisions and open questions

### 8.1 Decided on 2026-11-07

| # | Decision | Applied in |
|---|---|---|
| C1 | A SIP names one hospital or clinic. At most one valid SIP per employee, profession and facility; a verified renewal supersedes the old one. | 3.2, 3.3 |
| C2 | The privilege catalog is shared by all facilities of the tenant (with an optional list of facilities that may use an item). Confirmed (C2a). | 4.2 |
| C3 | One SPK can cover units in several facilities of a group, where the tenant credentials at group level. | 4.3, 4.5, 4.6, 4.7 |
| C4 | Roster assignments can be created one at a time and in bulk from a CSV import. | 5.5, 5.9 |
| C5 | Contracted practitioners (`mitra`) are rostered through HRM. | 5.5 |
| C6 | Holiday calendars can be imported, maintained by HR, or both combined. | 5.2, 5.9 |
| C7 | In Indonesia credentialing is done by the committee of each facility, not by a group committee. Default `CREDENTIALING_SCOPE` is `facility`. | 4.3, 4.5, 4.7 |

### 8.2 Changes needed in the HR specification

These follow from the decisions and were applied to `human-resource-management.md` on 2026-11-07:

- `HR-LIC-006`: replace the overlap sentence with "verifying a renewed SIP for the same facility and profession supersedes the previous one", and add `superseded` to the licence statuses in 6.3.
- 7.2 and 7.5: an SPK is issued by the credentialing facility's Director and covers that facility's units; a practitioner in several facilities holds one SPK per facility. Tenants with `CREDENTIALING_SCOPE` `group` may issue one SPK across facilities. `HR-CRD-002` is checked for every facility an SPK covers.
- Section 10: add `CREDENTIALING_SCOPE` (`facility`).
- 8.2 and 8.4.1: roster assignments can be imported from CSV into a draft roster.
- Open question Q12: rostering answered (yes); payroll for `mitra` stays open.
- Section 10: add `IMPORT_MAX_ROWS` (5,000) and `IMPORT_MAX_ERRORS` (500).

### 8.3 Still open

None from this document. The HR specification's own open questions (section 16) still apply.
