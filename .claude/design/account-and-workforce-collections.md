# Account and Workforce Collection Design

Status: **Approved** (2026-11-06). Refinements to section 4 and the detailed licence, credentialing and rostering collections: `human-resource-collections.md` (approved 2026-11-07). Change history of these collections: `data-change-history.md`. Business source: `../business/administrative-operational-system/human-resource-management.md` (rules `HR-*`). Technical rules: `../rules/back-end/database.md`, `../rules/back-end/logging.md`, `../rules/back-end/stack.md`.

## 1. Decisions in one page

1. **Two bounded contexts, two owners.** The *workforce* context (HRM) owns the person as an employee. The *identity* context owns the login. They share no collection and never write each other's data (HR doc 2.2).
2. **The link points from account to employee.** `accounts.employee_id` is nullable. An employee without an account is normal; an account without an employee is allowed only for `external` and `service` accounts, which need a sponsor and an expiry.
3. **HRM drives, identity decides.** HRM publishes events (status changed, separated, assignment started or ended). Identity reacts by placing or lifting *holds* and deriving role bindings. HRM never enables an account; enabling is always an explicit identity decision (account request, section 6.10).
4. **Clinical eligibility is never stored in identity.** Clinical modules ask HRM at action time (`HR-ELG-001`, `HR-INT-001`). A login proves who you are, not what you may do clinically.
5. **No country-specific field names.** NIK, NPWP, BPJS, STR, SIP, PKWT and gelar become *values* of generic structures (identifiers, codings, name parts). Indonesia is the first jurisdiction configuration, not the schema.
6. **Multi-tenant, multi-facility, multi-timezone from day one.** Every document carries `tenant_id`. Instants are stored as real UTC; calendar dates as `YYYY-MM-DD` strings interpreted in the facility time zone.
7. **Data is split by sensitivity class** (HR doc section 14), so access control, field encryption and erasure work per collection rather than per field.
8. **Cross-context changes go through a transactional outbox**, even while both contexts share one MongoDB connection, so splitting the databases later changes no business code.

```
┌──────────────── platform ────────────────┐
│ tenants · organizations · facilities     │
│ code_concepts · outbox · change log (*)  │
└──────────────────────────────────────────┘
        ▲ referenced by both, owned by neither context
┌──────── workforce (HRM) ────────┐   events    ┌──────────── identity ────────────┐
│ employees                       │ ──────────▶ │ accounts ── employee_id (0..1)   │
│ employee_private_profiles       │             │ account_credentials              │
│ employment_contracts            │  query API  │ account_mfa_factors              │
│ organization_units · positions  │ ◀────────── │ account_federated_identities     │
│ position_assignments            │ (eligibility│ identity_providers               │
│ committee_memberships           │  & profile) │ account_sessions                 │
│ licenses · spk · rosters … (§9) │             │ roles · account_role_bindings    │
└─────────────────────────────────┘             │ role_derivation_rules            │
                                                │ account_requests                 │
                                                │ security_events                  │
                                                └──────────────────────────────────┘
```

(*) Change history is written by the logger, not stored in collections: see `data-change-history.md`.

## 2. Shared conventions

### 2.1 Fields on every document

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | Exposed as `id: string` in models (`database.md` 4.1). |
| `tenant_id` | ObjectId | First key of every compound index. A tenant is one customer: a single hospital or a hospital group. |
| `schema_version` | int | Shape version of the document, for lazy migrations. |
| `version` | int | Optimistic concurrency (Mongoose `optimisticConcurrency: true`). Two HR Admins editing the same employee must not overwrite each other. |
| `created_at`, `updated_at` | Date (UTC) | Set by the repository. |
| `created_by` | `ActorRef` | Snapshot of who created it. There is **no `updated_by`**: who changed what, when and why is recorded in the change log (`data-change-history.md`). |
| `deleted_at` | Date \| null | Soft delete, only where section says so. Licensing and credentialing records are never deleted (`HR-LIC-008`, `HR-CRD-010`, `HR-AUD-002`). |

### 2.2 Reusable embedded types

These become engine-neutral types in `apps/repository/model/common/` and raw schemas in `apps/repository/mongo/schema/common/`.

```ts
/** Reference to a code in a code system, e.g. { system: 'id.workforce-category', code: 'tenaga_medis' }. */
interface Coding { system: string; code: string; display?: string }

/** Who performed an action. A snapshot: it stays readable after the account is renamed or closed. */
interface ActorRef { account_id: string | null; display_name: string; kind: 'account' | 'system' | 'service'; on_behalf_of_account_id?: string }

/** Half-open validity range of local calendar dates (`YYYY-MM-DD`); `end` null means open-ended. */
interface DatePeriod { start: string; end: string | null }

/** Person name that works for any culture. Indonesian gelar go to prefix/suffix. */
interface HumanName {
  use: 'official' | 'usual' | 'maiden' | 'alias'
  text: string                 // full name as printed, e.g. "dr. Siti Rahma, Sp.PD"
  family?: string              // optional: many Indonesians have a single name
  given: string[]
  prefix: string[]             // "dr.", "Prof.", "Ns."
  suffix: string[]             // "Sp.PD", "S.Kep", "MD", "FRCP"
  script?: string              // ISO 15924, e.g. "Latn", "Arab", "Hans", for native-script variants
}

/** Official identifier. The plain value is encrypted; lookup uses a keyed hash. */
interface PersonIdentifier {
  type: Coding                 // national_id | passport | tax_id | social_insurance | work_permit | ...
  system: string               // 'id.nik', 'id.npwp', 'id.bpjs-kesehatan', 'sg.nric', 'us.ssn', 'passport'
  issuing_country: string      // ISO 3166-1 alpha-2
  value_encrypted: Binary      // field-level encrypted (section 8.2)
  value_hash: string           // HMAC-SHA256(normalized value, tenant key): uniqueness and lookup
  value_masked: string         // "************1234" for display without decryption
  period?: DatePeriod
  verified_at?: Date
}

/** Phone, email or other channel. Phones in E.164, emails lower-cased. */
interface ContactPoint { system: 'phone' | 'email' | 'other'; value: string; use: 'work' | 'home' | 'mobile'; is_primary: boolean; verified_at?: Date }

/** International address. Country-specific levels (kelurahan, kecamatan, county, prefecture) go in admin_levels. */
interface Address {
  use: 'home' | 'work' | 'temp' | 'mailing'
  lines: string[]              // street, RT/RW, building
  admin_levels: { level: number; code?: string; name: string }[]  // e.g. Kemendagri codes for desa/kecamatan/kabupaten
  city?: string
  subdivision?: string         // ISO 3166-2, e.g. "ID-JK"
  postal_code?: string
  country: string              // ISO 3166-1 alpha-2
}

/** Reference to an uploaded file kept by the file/document service. */
interface FileRef { file_id: string; content_type: string; sha256: string }
```

### 2.3 Time

- **Instants** (`created_at`, `last_login_at`, `published_at`) are stored as real UTC `Date` values.
- **Calendar dates** (birth date, join date, contract start, separation date, roster date) are stored as `YYYY-MM-DD` strings, because "the separation date" means a local day, not an instant. They are interpreted in the **facility's** time zone (`facilities.timezone`).
- Indonesia alone has three time zones (WIB, WITA, WIT), so even a domestic hospital group cannot use one fixed zone.

> **Rule updated (D1 decided).** `database.md` 4.4 now requires real UTC instants. The current code still uses `TimeManagement.getTimezone('Asia/Jakarta')`, which stores every instant 7 hours ahead; switching the code to `new Date()` and migrating existing data by −7 h is pending.

### 2.4 Codes and terminology

Business codes that differ per country or hospital (workforce category, profession, specialty, employment type, license type, unit type, separation reason) are `Coding` values validated against `code_concepts` (section 3.4). The code system name carries the jurisdiction (`id.profession`, `gb.profession`). Each concept can map to a universal code (for example ISCO-08 for professions), so cross-country reports work.

Fixed technical states (account status, assignment status) stay as TypeScript literal unions, because code depends on them.

## 3. Platform collections

Owned by the platform; read by every context.

### 3.1 `tenants`

| Field | Type | Notes |
|---|---|---|
| `code` | string | Unique. |
| `name` | string | |
| `data_region` | string | Where the tenant's data must reside (`REG-PDP`, GDPR, etc.). Drives deployment, not queries. |
| `default_locale` | string | BCP 47, e.g. `id-ID`, `en-SG`. |
| `status` | `active \| suspended \| closed` | |

### 3.2 `organizations` — legal entities (employers)

| Field | Type | Notes |
|---|---|---|
| `tenant_id`, `code` | | Unique per tenant. |
| `legal_name`, `country` | string | ISO 3166-1. The country selects the jurisdiction configuration (labour rules, code systems). |
| `identifiers` | `{ system, value }[]` | Company registration and tax numbers (NIB, NPWP badan, EIN, UEN). Not personal data. |
| `currency` | string | ISO 4217, for payroll. |
| `status` | `active \| inactive` | |

### 3.3 `facilities` — hospital sites

| Field | Type | Notes |
|---|---|---|
| `tenant_id`, `organization_id`, `code` | | `code` unique per tenant. |
| `name`, `address` | | |
| `timezone` | string | IANA, e.g. `Asia/Jakarta`, `Asia/Makassar`, `Europe/London`. Required. |
| `external_ids` | `{ system, value }[]` | Facility codes for regulators: Kemenkes facility code, SATUSEHAT organization id, NHS ODS code. |
| `status` | `active \| inactive` | |

`HR-LIC-006` ("SIP for this hospital") becomes "license whose `practice_facility_id` is this facility".

### 3.4 `code_concepts`

| Field | Type | Notes |
|---|---|---|
| `tenant_id` | ObjectId \| null | `null` for platform-wide concepts, set for hospital-specific ones. |
| `system`, `code` | string | Unique per `(tenant_id, system, code)`. |
| `display` | `{ locale: string; text: string }[]` | Translations. |
| `properties` | `Record<string, unknown>` | Concept-specific attributes, e.g. `{ is_clinical: true, credentialing_committee: 'komite_medik' }` for a workforce category. |
| `mappings` | `Coding[]` | Equivalent universal codes (ISCO-08, SNOMED CT occupation, FHIR). |
| `period`, `status` | | Retired codes stay valid on old records. |

The existing `lovs` collection stays for UI dropdowns. `code_concepts` is for codes the business rules depend on.

## 4. Workforce collections (HRM)

### 4.1 `employees` — public and internal data (HR doc 5.1)

One document per person per tenant, even when the person has several contracts or works in several facilities of the group.

| Field | Type | Class | Notes |
|---|---|---|---|
| `employee_number` | string | Internal | Unique per tenant, **including soft-deleted documents**, so it is never reused. |
| `name` | `HumanName` | Public | Official name as on identity document and diploma. |
| `other_names` | `HumanName[]` | Public | Native script, usual name. |
| `display_name` | string | Public | Computed from `name` by the service. |
| `administrative_gender` | `Coding` | Internal | FHIR `male \| female \| other \| unknown`. |
| `workforce_category` | `Coding` | Public | `id.workforce-category\|tenaga_medis`, ... (HR doc 5.2). |
| `is_clinical` | boolean | Public | Copied from the category concept when set; queried by rostering and reports. |
| `profession` | `Coding \| null` | Public | Required when `is_clinical`. |
| `specialties` | `{ coding: Coding; is_primary: boolean }[]` | Public | Supports subspecialty and multiple board certifications. |
| `clinical_level` | `Coding \| null` | Internal | Nursing career level (PK I–V) or equivalent. |
| `employment_status` | `'onboarding' \| 'probation' \| 'active' \| 'suspended' \| 'separated'` | Internal | HR doc 5.4. Changed only by the workforce service, together with its change record and an outbox event, in one transaction. |
| `employment_status_since` | string (date) | Internal | |
| `current_employment` | `{ contract_id, organization_id, employment_type: Coding, start_date }` | Internal | Denormalized summary of the active contract (4.3), maintained in the same transaction. |
| `primary_assignment` | `{ assignment_id, facility_id, unit_id, position_id }` | Public | Denormalized from 4.6. |
| `original_hire_date`, `separation_date` | string (date) | Internal | `original_hire_date` survives rehire. |
| `practitioner_ids` | `{ system, value }[]` | Internal | Public-registry practitioner numbers: SATUSEHAT IHS number, NPI, GMC number. Not secret, so not encrypted. |
| `work_contacts` | `ContactPoint[]` | Internal | Work email and phone only. Personal contacts are in 4.2. |
| `photo` | `FileRef \| null` | Public | |
| `preferred_language` | string | Internal | BCP 47. |

`employees` has no password, no username and no account id.

### 4.2 `employee_private_profiles` — confidential data

1:1 with `employees` (`employee_id` unique). Read only by HR, Payroll Officer and the employee (HR doc 14). Kept separate so a query on `employees` can never leak it, so the whole collection can use field-level encryption, and so erasure after retention (`HR-SEC-003`) is one delete.

| Field | Type | Notes |
|---|---|---|
| `employee_id` | ObjectId | Unique. |
| `birth_date` | string (date), encrypted | |
| `birth_place` | string | |
| `nationalities` | string[] | ISO 3166-1. |
| `identifiers` | `PersonIdentifier[]` | NIK, passport, KITAS/work permit, tax id (NPWP), social insurance (BPJS Kesehatan, BPJS Ketenagakerjaan, CPF, NI number). Unique index on `(tenant_id, identifiers.system, identifiers.value_hash)`. |
| `personal_contacts` | `ContactPoint[]` | |
| `addresses` | `Address[]` | |
| `marital_status` | `Coding \| null` | Needed for tax status in some countries (Indonesian PTKP). |
| `religion` | `Coding \| null` | Optional; enabled per jurisdiction. Special-category data under GDPR, so off by default outside Indonesia. |
| `family_members` | `{ relationship: Coding; name: HumanName; birth_date?: string; identifiers: PersonIdentifier[]; is_dependent: boolean }[]` | Dependents for insurance and tax. |
| `emergency_contacts` | `{ name: string; relationship: Coding; contacts: ContactPoint[] }[]` | |
| `bank_accounts` | `{ bank: Coding; account_name: string; account_number_encrypted: Binary; account_number_masked: string; iban?: Binary; swift_bic?: string; currency: string; is_primary: boolean }[]` | |
| `tax_profile` | `{ country: string; status: Coding; effective_date: string }[]` | e.g. PTKP `K/1`. History, newest last. |

Health records, vaccinations and occupational incidents are **highly confidential** and live in the occupational-health collections (HR doc 9.8), not here.

### 4.3 `employment_contracts`

A person can have several contracts over time (PKWT renewals, conversion to PKWTT, rehire) or in parallel with different employers of the group.

| Field | Type | Notes |
|---|---|---|
| `employee_id`, `organization_id` | ObjectId | Employer. |
| `contract_number` | string | Unique per organization. |
| `employment_type` | `Coding` | `id.employment-type\|pkwtt`, `pkwt`, `mitra`, `intern`; mapped to universal `permanent`, `fixed_term`, `contractor`, `trainee`. |
| `period` | `DatePeriod` | `end` required for fixed-term types (validated through the concept's properties). |
| `probation_end_date` | string \| null | Only where the jurisdiction allows probation for the type (`REG-PP35`: PKWTT only). |
| `fte` | number | 1.0 = full time. |
| `working_time_scheme` | `Coding` | Selects the working-time parameter set used by rostering (HR doc 8.5.2). |
| `status` | `'draft' \| 'active' \| 'ended' \| 'terminated' \| 'superseded'` | |
| `previous_contract_id` | ObjectId \| null | Renewal chain. |
| `termination` | `{ date: string; reason: Coding; notes?: string } \| null` | |
| `document` | `FileRef \| null` | Signed contract. |

### 4.4 `organization_units` (HR doc 5.3, 9.2)

| Field | Type | Notes |
|---|---|---|
| `organization_id`, `facility_id` | ObjectId | |
| `code` | string | Unique per facility. |
| `name` | `{ locale, text }[]` | |
| `type` | `Coding` | directorate, department, installation, ward, polyclinic, ... |
| `parent_id` | ObjectId \| null | |
| `ancestor_ids` | ObjectId[] | Materialized path, so "all units under directorate X" is one indexed query. Rewritten on move. |
| `is_clinical` | boolean | |
| `external_ids` | `{ system, value }[]` | e.g. SATUSEHAT Location id. |
| `period`, `status` | | Units are closed, not deleted; history refers to them. |

The Head of Unit is not stored here. It is the active assignment of the unit's head position (4.5, 4.6), so the history of heads is the assignment history.

### 4.5 `positions`

| Field | Type | Notes |
|---|---|---|
| `unit_id` | ObjectId | |
| `code`, `title` | string, `{ locale, text }[]` | |
| `kind` | `'structural' \| 'functional'` | |
| `is_head_of_unit` | boolean | At most one active per unit (partial unique index). |
| `allowed_professions` | `Coding[]` | Empty for non-clinical positions. |
| `grade` | `Coding \| null` | |
| `budgeted_headcount` | number | |
| `job_description` | `FileRef \| null` | |
| `period`, `status` | | |

### 4.6 `position_assignments` — who holds which position, and history (HR doc 9.2)

| Field | Type | Notes |
|---|---|---|
| `employee_id`, `contract_id`, `position_id` | ObjectId | |
| `unit_id`, `facility_id` | ObjectId | Denormalized from the position for scoped queries. |
| `is_primary` | boolean | One active primary per employee (partial unique index). |
| `is_head_of_unit` | boolean | Copied from the position; one active head per unit (partial unique index on `unit_id` where `is_head_of_unit` and `status: 'active'`). |
| `kind` | `Coding` | hire, transfer, promotion, acting (Plt.), secondment. |
| `period` | `DatePeriod` | |
| `fte` | number | |
| `status` | `'planned' \| 'active' \| 'ended'` | A daily job activates and ends assignments by facility-local date. |
| `decision_ref` | `{ number: string; document?: FileRef } \| null` | SK number. |

### 4.7 `committee_memberships`

Committee roles (Komite Medik, its subcommittees, Mitra Bestari) are not positions in the organization chart, but identity needs them to derive roles.

| Field | Type | Notes |
|---|---|---|
| `employee_id` | ObjectId | |
| `committee` | `Coding` | `id.committee\|komite_medik`, `komite_keperawatan`, ...; for other countries `credentials_committee`, `medical_executive_committee`. |
| `role` | `Coding` | chair, secretary, member, mitra_bestari. |
| `facility_id` | ObjectId | |
| `period`, `decision_ref`, `status` | | |

## 5. Identity collections

### 5.1 `accounts`

| Field | Type | Notes |
|---|---|---|
| `account_type` | `'workforce' \| 'external' \| 'service'` | `workforce`: linked to an employee (including `mitra` and `intern`). `external`: vendor engineer, surveyor, auditor, visiting student not in HRM. `service`: machine client, never logs in interactively. |
| `employee_id` | ObjectId \| null | Required for `workforce`, forbidden for the other types. Partial unique index: one non-closed account per employee. |
| `sponsor_account_id` | ObjectId \| null | Required for `external`: the workforce account responsible for it. |
| `username` | string | Display form. |
| `login_identifiers` | `{ type: 'username' \| 'email' \| 'phone'; value: string; normalized: string; is_primary: boolean; verified_at: Date \| null }[]` | Staff without a work email can log in by username or phone. Unique multikey index on `(tenant_id, login_identifiers.type, login_identifiers.normalized)`. `normalized`: NFKC + lower-case for username/email, E.164 for phone. |
| `profile` | `{ display_name: string; given_name?: string; family_name?: string; avatar?: FileRef }` | For `workforce` accounts it is a **cached copy of the public-class name only**, refreshed from HRM on `employee.profile_changed`. Never NIK, birth date or address. |
| `profile_source` | `'hr' \| 'local'` | `hr` for workforce: users cannot edit the name locally. |
| `preferences` | `{ locale: string; timezone: string \| null; default_facility_id: ObjectId \| null }` | `timezone` null means "use the facility's". |
| `status` | `'pending_activation' \| 'active' \| 'locked' \| 'suspended' \| 'disabled' \| 'closed'` | See 6.1. |
| `status_changed_at` | Date | |
| `is_open` | boolean | `false` only when `status` is `closed`. Exists for the partial unique index on `employee_id` (section 11). |
| `holds` | `AccountHold[]` | See 6.2. `status` is `suspended` or `disabled` while any hold of that kind exists. |
| `validity` | `{ not_before: Date \| null; expires_at: Date \| null }` | `not_before` for accounts prepared before the join date; `expires_at` mandatory for `external`, at most `EXTERNAL_ACCOUNT_MAX_DAYS`. |
| `mfa_required` | boolean | Set by policy (roles with privileged permissions, remote access). |
| `authz_version` | int | Incremented whenever role bindings, holds or status change. Access tokens carry it; a mismatch forces re-evaluation, so revocation takes effect without waiting for token expiry. |
| `last_login_at` | Date \| null | Updated at most once per hour to limit writes; exact history is in `security_events`. |
| `request_id` | ObjectId \| null | The approved `account_requests` entry that created it. |
| `closed` | `{ at: Date; reason: Coding; pseudonymized_at: Date \| null } \| null` | After retention, profile and identifiers are replaced by placeholders; `_id` stays so audit references remain valid. |

```ts
interface AccountHold {
  kind: 'suspend' | 'disable'
  reason: 'employment_suspended' | 'employment_ended' | 'contract_expired' | 'sponsor_ended'
        | 'external_expired' | 'inactivity' | 'security' | 'administrative'
  source: 'workforce' | 'identity' | 'security'
  source_ref: string | null        // event id or decision id that placed it
  placed_by: ActorRef
  placed_at: Date
  notes?: string
}
```

### 5.2 `account_credentials`

Separate from `accounts`, so loading an account for display or authorization never loads secrets, and only the authentication service's repository can read it.

| Field | Type | Notes |
|---|---|---|
| `account_id` | ObjectId | Unique. |
| `password_hash` | string | PHC string, Argon2id (parameters embedded, so they can be raised over time and rehashed on next login). |
| `password_history` | string[] | Last `PASSWORD_HISTORY_COUNT` hashes. |
| `password_changed_at` | Date | |
| `must_change` | boolean | After admin reset or first login. |
| `failed_attempts`, `last_failed_at`, `locked_until` | int, Date, Date | Lockout counters live here, not on `accounts`, to avoid write contention. |

Accounts that only use SSO have no document here.

### 5.3 `account_mfa_factors`

| Field | Type | Notes |
|---|---|---|
| `account_id` | ObjectId | |
| `type` | `'totp' \| 'webauthn' \| 'recovery_codes' \| 'sms' \| 'email'` | `sms`/`email` allowed only where policy permits (weak factors). |
| `label` | string | "Pixel 8", "YubiKey ward 3". |
| `totp_secret_encrypted` | Binary | TOTP only. |
| `webauthn` | `{ credential_id: string; public_key: Binary; sign_count: number; aaguid: string; transports: string[] }` | Unique index on `webauthn.credential_id`. Passkeys suit shared clinical workstations. |
| `recovery_code_hashes` | string[] | Each used once. |
| `status`, `last_used_at` | | |

### 5.4 `identity_providers` — SSO per tenant

International hospitals often require their own IdP (Entra ID, Okta, Google Workspace, national health-worker SSO).

| Field | Type | Notes |
|---|---|---|
| `code`, `protocol` | string, `'oidc' \| 'saml'` | |
| `issuer`, `client_id`, `metadata_url` | string | |
| `client_secret_ref` | string | Reference into the secret manager, never the secret. |
| `allowed_email_domains` | string[] | |
| `claim_mapping` | `{ subject: string; email?: string; employee_number?: string }` | |
| `jit_provisioning` | boolean | Default **false**: a valid IdP login does not create an account, because not every employee gets one. When true, it only matches an account already approved (section 6.10). |
| `status` | | |

### 5.5 `account_federated_identities`

| Field | Type | Notes |
|---|---|---|
| `account_id`, `provider_id` | ObjectId | |
| `subject` | string | IdP's stable subject. Unique on `(provider_id, subject)`. Never match on email alone. |
| `linked_at`, `linked_by`, `last_used_at` | | |

### 5.6 `account_sessions`

| Field | Type | Notes |
|---|---|---|
| `account_id` | ObjectId | |
| `refresh_token_hash` | string | SHA-256 of the token. Unique. |
| `family_id` | string | Rotation family: reuse of an old token revokes the whole family. |
| `client` | `{ app: string; device_label?: string; user_agent_hash: string }` | |
| `facility_id` | ObjectId \| null | Facility the session works in, for scoped roles. |
| `authenticated_with` | `{ method: 'password' \| 'sso' \| 'webauthn'; mfa: boolean; at: Date }` | Step-up decisions. |
| `created_at`, `last_seen_at`, `expires_at` | Date | TTL index on `expires_at`. |
| `revoked_at`, `revoke_reason` | Date, string | Set on logout, hold placed, password change. |

### 5.7 `roles`

| Field | Type | Notes |
|---|---|---|
| `code` | string | Unique per tenant, e.g. `hr_admin`, `head_of_unit`, `committee_member`. |
| `name`, `description` | `{ locale, text }[]` | |
| `permissions` | string[] | From the permission catalog defined in code (`hr.license:verify`, `hr.roster:approve`). Unknown permissions are rejected on write. |
| `allowed_scopes` | `('tenant' \| 'organization' \| 'facility' \| 'unit')[]` | |
| `assignable_by` | string[] | Role codes allowed to grant it manually. |
| `is_system` | boolean | Seeded; cannot be deleted. |
| `status` | | |

### 5.8 `account_role_bindings`

| Field | Type | Notes |
|---|---|---|
| `account_id`, `role_id` | ObjectId | |
| `scope` | `{ kind: 'tenant' \| 'organization' \| 'facility' \| 'unit'; organization_id?: ObjectId; facility_id?: ObjectId; unit_id?: ObjectId; include_descendants: boolean }` | `include_descendants` uses `organization_units.ancestor_ids`. |
| `source` | `'manual' \| 'derived'` | `derived` bindings are created and ended only by the derivation job (6.5). Users cannot edit them. |
| `source_ref` | `{ type: 'position_assignment' \| 'committee_membership'; id: ObjectId; rule_id: ObjectId } \| null` | |
| `period` | `{ start: Date; end: Date \| null }` | Time-boxed grants (acting head, temporary access). |
| `granted_by`, `approved_by` | `ActorRef` | Two-person rule for privileged roles. |
| `reason` | string | Required for `manual`. |
| `status` | `'active' \| 'ended' \| 'revoked'` | |

### 5.9 `role_derivation_rules`

Answers HR doc 13 "with which unit roles?" as configuration instead of code.

| Field | Type | Notes |
|---|---|---|
| `match` | `{ source: 'position_assignment' \| 'committee_membership'; position_ids?: ObjectId[]; is_head_of_unit?: boolean; unit_types?: Coding[]; professions?: Coding[]; committees?: Coding[]; committee_roles?: Coding[] }` | All set conditions must match. |
| `role_id` | ObjectId | |
| `scope_from` | `'assignment_unit' \| 'assignment_facility' \| 'organization' \| 'tenant'` | |
| `include_descendants` | boolean | |
| `status` | | |

Example: `{ is_head_of_unit: true } → head_of_unit, scope assignment_unit`; `{ committees: [komite_medik], committee_roles: [chair] } → committee_chair, scope assignment_facility`.

### 5.10 `account_requests`

Records *why* an account exists. Accreditation (`REG-KARS`) and access reviews need it.

| Field | Type | Notes |
|---|---|---|
| `account_type` | | |
| `requested_for` | `{ employee_id: ObjectId } \| { external: { name: string; email: string; company: string } }` | |
| `requested_roles` | `{ role_id, scope }[]` | Manual roles requested in addition to derived ones. |
| `justification` | string | |
| `requested_by`, `decided_by` | `ActorRef` | Requester cannot approve their own request. |
| `status` | `'requested' \| 'approved' \| 'rejected' \| 'provisioned' \| 'cancelled'` | |
| `account_id` | ObjectId \| null | Set when provisioned. |

### 5.11 `security_events`

Authentication log, separate from the business audit trail because of volume and retention.

| Field | Type | Notes |
|---|---|---|
| `account_id` | ObjectId \| null | Null for unknown-username attempts. |
| `type` | string | `login_succeeded`, `login_failed`, `mfa_failed`, `account_locked`, `password_changed`, `session_revoked`, `token_reuse_detected`, ... |
| `occurred_at` | Date | TTL index; retention `SECURITY_EVENT_RETENTION_DAYS`. |
| `ip`, `user_agent_hash`, `correlation_id` | | IP is personal data in many jurisdictions; covered by the TTL. |
| `outcome`, `reason_code` | | Never the attempted password or username text for failures. |

## 6. Account–employee lifecycle

### 6.1 Account status

```
pending_activation ──activate──▶ active ◀──unlock / lockout ends──▶ locked
                                   │  ▲
                     suspend hold  ▼  │ last suspend hold lifted
                                suspended
any state ──disable hold──▶ disabled ──retention ends──▶ closed (pseudonymized)
```

- `locked` is automatic and temporary (failed logins).
- `suspended` and `disabled` are derived from `holds`: `disabled` if any `disable` hold, else `suspended` if any `suspend` hold.
- Leaving `disabled` requires an approved `account_requests` entry (rehire, reactivation), never an HR event alone.

### 6.2 Why holds instead of one status

An HR suspension and a security suspension are independent. With a single status field, HR lifting its suspension would silently re-enable an account security had locked. With holds, each source lifts only its own hold, and the account is usable only when none remain.

### 6.3 HR event → identity reaction

The reaction per event is a tenant policy (`account_lifecycle_policy` in identity configuration). Defaults:

| HR event | Default identity reaction |
|---|---|
| `employee.status_changed` → `probation` / `active` | Lift `employment_suspended` holds. If `pending_activation` and `not_before` passed, allow activation. |
| `employee.status_changed` → `suspended` | Place `suspend` hold `employment_suspended`; revoke sessions. Policy option: instead end all bindings except `self_service`, so the employee can still read payslips. |
| `employee.separated` (effective date D) | At end of D in the facility time zone: place `disable` hold `employment_ended`, revoke sessions, end derived bindings (HR doc 9.10). Sponsored external accounts get `sponsor_ended` holds and the sponsor's manager is notified. |
| `contract.ended` with no other active contract | Same as separated, unless an `employee.status_changed` follows within the grace period. |
| `position_assignment.started` / `ended` | Re-run role derivation for the account (6.5). |
| `committee_membership.started` / `ended` | Re-run role derivation. |
| `employee.profile_changed` (fields: name, photo) | Refresh `accounts.profile` by querying HRM for the public view. |
| `employee.created` | **Nothing.** No account is created automatically. |

License expiry, SPK suspension and roster flags cause **no** account change: the person may still need the system (self-service, non-clinical work). Clinical modules refuse the clinical action through the eligibility check instead (`HR-INT-001`).

### 6.4 Events and outbox

Every HRM write that other contexts care about inserts an `outbox_events` document in the same transaction (a repository call, so it is allowed inside `TransactionManager.run`, `database.md` 7). A publisher sends them after commit.

```ts
interface OutboxEvent {
  tenant_id: string
  event_id: string                 // UUID, consumers dedupe on it
  event_type: string               // 'workforce.employee.separated'
  aggregate: { type: string; id: string; version: number }
  payload: Record<string, unknown> // ids, codes and dates only. Never names, NIK or contact data.
  correlation_id: string           // from the request context (logging.md 8)
  occurred_at: Date
  published_at: Date | null
  attempts: number
  next_attempt_at: Date | null
}
```

Identity records handled events in `processed_events` (`consumer + event_id` unique, TTL 30 days) so redelivery is harmless. Consumers start a request context with the event's `correlation_id` (`logging.md` 8).

### 6.5 Role derivation

For one account: read the employee's active `position_assignments` and `committee_memberships` from HRM, evaluate `role_derivation_rules`, then in one transaction create missing `derived` bindings, end the ones whose source is gone, and increment `authz_version`. The function is idempotent, so events, the nightly reconciliation and a manual "resync" button all call the same code.

### 6.6 Reconciliation

Events can be lost or applied late. A nightly job, per tenant:

1. Lists workforce accounts whose employee is `separated` or `suspended` without the matching hold, and fixes them.
2. Lists workforce accounts whose employee no longer exists or whose link is broken.
3. Re-runs role derivation for accounts whose employee's assignments changed since the last run.
4. Places `external_expired` holds on external accounts past `validity.expires_at`, and `inactivity` holds after `INACTIVITY_DISABLE_DAYS` without login.
5. Logs one summary entry (counts, duration, failures), not one per account (`logging.md` 1).

### 6.7 Linking and unlinking

- Link: only at provisioning, from an approved `account_requests` entry of type `workforce`. The service checks the employee exists, is not `separated`, and has no other non-closed account.
- Re-link to a different employee: not allowed. Close the account and provision a new one, so the audit trail of the old identity stays clean.
- Rehire: the employee record is reused (HR keeps the person); the old account is re-enabled through a new request, keeping one identity per person.
- An employee who becomes `mitra` after retirement keeps the same employee record and account; only the contract and assignments change.

### 6.8 Self-service

Self-service in HRM authorizes by `account.employee_id == record.employee_id`. Therefore `employee_id` on the account must come only from the server-side link, never from a request parameter.

### 6.9 What other modules read

| Question | Answered by |
|---|---|
| Who is this user? | Access token: `account_id`, `employee_id`, `authz_version`. |
| What may this user do in facility F, unit U? | Identity: bindings for the account, scoped. |
| Is the user clinically eligible for privilege Z in unit U now? | HRM eligibility API, by `employee_id`, at action time. |
| What is the user's name to print? | `accounts.profile.display_name` (cached public name), or HRM for official name with titles. |

### 6.10 Provisioning flow

1. HR Admin, a Head of Unit or IT creates an `account_requests` entry (for an employee, or an external person with a sponsor).
2. An identity administrator (not the requester) approves.
3. Identity creates the account (`pending_activation`, `not_before` = join date for new hires), the requested manual bindings, and runs role derivation.
4. Activation link or SSO link. On first login: set password or link IdP subject, enrol MFA if `mfa_required`.

## 7. Cross-cutting collections

### 7.1 Change history (`HR-AUD-001` to `003`)

Not a collection. Every write to the collections in this document produces a change record (who, when, before and after per field, reason), written by the logger's change-log channel through `change_outbox`. Reads of highly confidential records are recorded the same way. See `data-change-history.md`.

### 7.2 `outbox_events`, `processed_events`

See 6.4. `outbox_events` has a TTL on `published_at` (for example 7 days).

## 8. Security and privacy

### 8.1 Sensitivity by collection

| Collection | Class | Readers |
|---|---|---|
| `employees` | Public / internal (per field) | All staff (public fields), HR, Head of Unit (unit) |
| `employee_private_profiles` | Confidential | HR, Payroll Officer, the employee |
| occupational health, discipline, credentialing assessments | Highly confidential | Named roles, read-audited |
| `accounts` | Internal | Identity admins, the account owner |
| `account_credentials`, `account_mfa_factors`, `account_sessions` | Secret | Authentication service only; never returned by any API |

### 8.2 Encryption

- Encrypt `employee_private_profiles` identifier values, birth date and bank numbers, plus `account_mfa_factors.totp_secret_encrypted`, with MongoDB client-side field-level encryption or Queryable Encryption. Keys come from a KMS, configured through a new `encryption.env` context (`stack.md` 3.6).
- `value_hash` uses a per-tenant HMAC key, so equal NIKs in two tenants produce different hashes.
- Encryption and hashing live in the Mongo repository implementation; models carry plain values only in memory (or masked values, depending on the method).

### 8.3 Redaction keys to add

`sanitize` matches exact normalized names, so `password_hash` is **not** covered by `password`. Add to `DEFAULT_REDACT_KEYS` in the same change that introduces the fields (`logging.md` 7, `HR-SEC-002`):

`passwordhash`, `passwordhistory`, `refreshtokenhash`, `totpsecret`, `totpsecretencrypted`, `recoverycodehashes`, `publickey`, `clientsecretref`, `identifiers`, `valueencrypted`, `valuehash`, `birthdate`, `dateofbirth`, `npwp`, `taxid`, `passport`, `ssn`, `nric`, `bankaccounts`, `accountnumber`, `iban`, `familymembers`, `addresses`, `personalcontacts`.

### 8.4 Erasure

After the retention period (`HR-SEC-003`, open question Q11): delete `employee_private_profiles`, pseudonymize `employees` name fields and `accounts.profile` and `login_identifiers`, delete credentials, factors, federated identities and sessions. Keep `_id`s so audit and clinical records still resolve to "former employee #…".

## 9. Other HRM collections (priority sub-processes)

These reference `employee_id`, never `account_id`. Detailed design follows when each sub-process is implemented.

| Collection | Key international adjustments |
|---|---|
| `professional_licenses` | `license_type: Coding` (`id.str`, `id.sip`, `us.state_license`, `us.dea`, `gb.gmc_registration`); `jurisdiction` (country + subdivision, e.g. US state); `practice_facility_id` replaces "is this hospital"; `issuing_authority: Coding`; `verification: { verifier: ActorRef; at; method: Coding; outcome; notes }`. |
| `cpd_records` | Generic name for SKP / CME / CPD; `credit_system: Coding`. |
| `privilege_catalog_items` | `committee: Coding`; `clinical_level` optional. |
| `credential_applications`, `credential_assessments` | Assessments in their own collection (highly confidential, read-audited). |
| `clinical_appointments` (SPK) and `privilege_grants` | `facility_id` and `unit_ids`; grants in their own collection for "who holds privilege Z" queries. |
| `shift_definitions`, `coverage_requirements` | Times as local `HH:mm` plus the facility time zone; DST-safe duration computed at assignment time. |
| `rosters`, `roster_assignments` | `date` as local `YYYY-MM-DD`; `starts_at`/`ends_at` stored as UTC instants for overlap and rest checks (`HR-ROS-010`, `011`). |
| `practice_schedules`, `shift_swap_requests` | |
| `hr_parameters` | Section 10 parameters, scoped by tenant, organization or facility, with `effective_from`, so a change applies from a date and history explains past decisions. |

## 10. Indonesia-specific concept → generic structure

| Indonesian concept | Generic structure | Elsewhere |
|---|---|---|
| NIK | `identifiers[system=id.nik, type=national_id]` | NRIC, SSN, NI number |
| NPWP | `identifiers[system=id.npwp, type=tax_id]` | TIN, UTR |
| BPJS Kesehatan / Ketenagakerjaan | `identifiers[type=social_insurance]` | CPF, NI, Social Security |
| Gelar (dr., Sp.PD, S.Kep) | `HumanName.prefix` / `suffix` | MD, FRCP, RN |
| Tenaga medis / keperawatan / kesehatan lain / non klinis | `workforce_category` in `id.workforce-category` + ISCO-08 mapping | Country code system |
| PKWT / PKWTT / mitra | `employment_type` in `id.employment-type` → `fixed_term` / `permanent` / `contractor` | |
| STR / SIP / SKP | `license_type` / `cpd_records` | Registration, state license, CME |
| SPK / RKK | `clinical_appointments` / `privilege_grants` | Clinical privileges / delineation of privileges |
| Komite Medik / Keperawatan | `committee: Coding` | Credentials committee, MEC |
| SATUSEHAT IHS number | `practitioner_ids[system=id.satusehat-ihs]` | NPI, GMC number |
| Kelurahan / kecamatan / kabupaten | `Address.admin_levels` | County, prefecture |
| PTKP | `tax_profile.status` | Filing status |
| WIB / WITA / WIT | `facilities.timezone` | Any IANA zone |
| Rupiah | `organizations.currency` | ISO 4217 |

## 11. Index summary

All indexes start with `tenant_id`. "Partial" uses `partialFilterExpression`.

| Collection | Index | Purpose |
|---|---|---|
| `employees` | `{ tenant_id, employee_number }` unique (no partial: includes soft-deleted) | Never reused |
| | `{ tenant_id, employment_status, is_clinical }` | Eligibility exception reports |
| | `{ tenant_id, 'primary_assignment.unit_id', employment_status }` | Unit lists |
| | `{ tenant_id, 'practitioner_ids.system', 'practitioner_ids.value' }` unique, partial | SATUSEHAT / NPI lookup |
| `employee_private_profiles` | `{ tenant_id, employee_id }` unique | |
| | `{ tenant_id, 'identifiers.system', 'identifiers.value_hash' }` unique | Duplicate NIK detection |
| `employment_contracts` | `{ tenant_id, employee_id, status }`; `{ tenant_id, organization_id, contract_number }` unique | |
| `organization_units` | `{ tenant_id, facility_id, code }` unique; `{ tenant_id, ancestor_ids }` | Subtree |
| `positions` | `{ tenant_id, unit_id, is_head_of_unit }` unique, partial `is_head_of_unit: true, status: 'active'` | One head position |
| `position_assignments` | `{ tenant_id, employee_id, is_primary }` unique, partial `is_primary: true, status: 'active'` | One primary |
| | `{ tenant_id, unit_id, is_head_of_unit }` unique, partial `is_head_of_unit: true, status: 'active'` | One head (HR doc 9.2) |
| | `{ tenant_id, unit_id, status, 'period.start' }` | |
| `accounts` | `{ tenant_id, employee_id }` unique, partial `{ employee_id: { $type: 'objectId' }, is_open: true }` | One open account per employee (partial filters do not support `$ne`, hence `is_open`) |
| | `{ tenant_id, 'login_identifiers.type', 'login_identifiers.normalized' }` unique | Login |
| | `{ tenant_id, status, 'validity.expires_at' }` | Expiry job |
| `account_credentials` | `{ account_id }` unique | |
| `account_mfa_factors` | `{ account_id, status }`; `{ 'webauthn.credential_id' }` unique, partial | |
| `account_federated_identities` | `{ provider_id, subject }` unique; `{ account_id }` | |
| `account_sessions` | `{ refresh_token_hash }` unique; `{ account_id, revoked_at }`; `{ expires_at }` TTL 0 | |
| `account_role_bindings` | `{ tenant_id, account_id, status }`; `{ tenant_id, 'source_ref.id' }` | Auth, derivation |
| `security_events` | `{ tenant_id, account_id, occurred_at: -1 }`; `{ occurred_at }` TTL | |
| `outbox_events` | `{ published_at, next_attempt_at }`; `{ published_at }` TTL | |

## 12. Mapping to the repository rules

- Tokens (`apps/repository/token.ts`): `REPOSITORY_EMPLOYEE`, `REPOSITORY_EMPLOYEE_PRIVATE_PROFILE`, `REPOSITORY_EMPLOYMENT_CONTRACT`, `REPOSITORY_ORGANIZATION_UNIT`, `REPOSITORY_POSITION`, `REPOSITORY_POSITION_ASSIGNMENT`, `REPOSITORY_COMMITTEE_MEMBERSHIP`, `REPOSITORY_ACCOUNT`, `REPOSITORY_ACCOUNT_CREDENTIAL`, `REPOSITORY_ACCOUNT_MFA_FACTOR`, `REPOSITORY_ACCOUNT_FEDERATED_IDENTITY`, `REPOSITORY_IDENTITY_PROVIDER`, `REPOSITORY_ACCOUNT_SESSION`, `REPOSITORY_ROLE`, `REPOSITORY_ACCOUNT_ROLE_BINDING`, `REPOSITORY_ROLE_DERIVATION_RULE`, `REPOSITORY_ACCOUNT_REQUEST`, `REPOSITORY_SECURITY_EVENT`, `REPOSITORY_OUTBOX_EVENT`.
- Named query methods instead of `where` objects, for example `AccountRepository.findByLoginIdentifier(tenantId, type, normalized)`, `findByEmployeeId(tenantId, employeeId)`, `AccountRepository.placeHold(id, hold)`, `liftHolds(id, source, reason)`; `EmployeePrivateProfileRepository.findByIdentifier(tenantId, system, value)` (hashes inside the implementation); `PositionAssignmentRepository.findActiveByEmployee(...)`.
- The `outbox_events` repository exposes `append` and `markPublished`, not general `update`/`delete`.
- Schemas named `<Name>Entity` with pinned collections (`@Schema({ collection: 'accounts' })`).
- Feature modules: `workforce` and `identity`, each importing only its own repository modules. Identity reads HRM through a workforce *query service port* (`WORKFORCE_DIRECTORY` token), not through HRM repositories, so the two can become separate services.

### 12.1 Existing code to replace

> **Done (2026-11-07):** `AccountEntity`, the `Account` model and repository replace the old files, and `ActorRef` replaces `IAccount`/`RawAccount`. The `getTimezone` defaults in `schema/lov.ts` and `mongo/lov.ts` remain until the D1 migration. Authentication, credentials, sessions, security events, roles and role bindings are implemented as described in `../rules/back-end/authentication.md`.

- `apps/repository/mongo/schema/account.ts`: no pinned collection, no `SchemaFactory`, `status` as free string, `birthdate` and `phone` (personal data that belongs to HRM), and named `Account` like the future model. Replace with `AccountEntity` per 5.1.
- `apps/repository/interface/account.ts` (`IAccount`) is an embedded actor summary, not a repository interface (`database.md` 4.2). Replace with `ActorRef` in `model/common/`, and `RawAccount` (`user_id`, `user_name`, ...) with a raw `ActorRef` schema.
- `TimeManagement.getTimezone` defaults in `schema/lov.ts`, `schema/account.ts` and `mongo/lov.ts` (section 2.3, `database.md` 4.4).

## 13. Open design questions

| # | Question | Affects |
|---|---|---|
| D1 | ~~Store real UTC instead of Jakarta wall-clock time?~~ Decided 2026-11-06: yes, `database.md` 4.4. Code switch and data migration pending. | 2.3, all collections |
| D2 | Is a tenant a single hospital or a hospital group? (Design supports groups; confirm the first customer.) | 3, 4.1 |
| D3 | Must suspended employees keep self-service access (payslips, leave)? | 6.3 default |
| D4 | Which roles require MFA, and is SSO mandatory for some tenants? | 5.1 `mfa_required`, 5.4 |
| D5 | Encryption: MongoDB Queryable Encryption (needs Enterprise/Atlas) or application-level encryption with the community server? | 8.2 |
| D6 | Separation timing: end of the separation date, or immediately when HR records it for dismissals? | 6.3 |
| D7 | Retention for `security_events` and pseudonymization timing, per jurisdiction. | 5.11, 8.4, HR Q11 |
| D8 | Are patients' portal logins in scope? If yes, they get a separate identity realm, not `account_type: 'patient'` in this collection. | 5.1 |
