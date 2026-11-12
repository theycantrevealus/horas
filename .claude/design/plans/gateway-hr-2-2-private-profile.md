# gateway_hr 2.2: Private profile

Status: **In discussion** (2026-11-13). Part of `2026-11-10-gateway-hr-plan.md` (walkthrough order 8). Endpoints: `../hr-endpoints.md` 2.2. Collection: `../account-and-workforce-collections.md` 4.2, 8.1 to 8.3 and 5 (person identifier), HR specification 14. Model: `apps/back-end/apps/repository/model/employee-private-profile.ts` (exists). Rules every endpoint follows: `../../rules/back-end/workforce.md` 3 and `../../rules/back-end/database.md` 4.6. Built references: groups 1.1 to 2.1.

The private profile is the confidential part of an employee: date of birth, national and tax identifiers, bank accounts, home address, family and emergency contacts. It lives in its own collection (one document per employee) so a query on `employees` can never leak it, access is granted separately, and erasure after the retention period is one delete. This is the first group that stores secrets, so it also builds the field encryption the design asks for (`account-and-workforce-collections.md` 8.2) and the `encryption.env` configuration context. The master key comes from the environment, as decided earlier (open question D5).

## 1. The six endpoints

| Endpoint | Behaviour |
|---|---|
| `GET /v1/employees/:id/private-profile` | Returns the profile: date of birth (decrypted), place of birth, nationalities, personal contacts, addresses, marital status, religion, family, emergency contacts, tax history, and identifiers and bank accounts **masked** (`************1234`). 404 `private_profile_not_found` when the employee has none yet. Writes no log entry. |
| `PUT /v1/employees/:id/private-profile` | Creates or replaces the profile fields listed in S5 (not the identifiers or bank accounts). Optional `version` and `reason`. |
| `PUT /v1/employees/:id/private-profile/identifiers` | Replaces the identifier list (national id, passport, tax id, social insurance, work permit). Plain values go in; the server encrypts, hashes and masks them. |
| `PUT /v1/employees/:id/private-profile/bank-accounts` | Replaces the salary bank accounts. |
| `GET /v1/employees/:id/private-profile/identifiers/:system` | Reveals one identifier in full (for example `id.nik`). Recorded as an access in the change log. |
| `GET /v1/employees/me/private-profile` | The signed-in user's own profile, masked. Needs sign-in only. |

Every response of these routes carries `Cache-Control: no-store`. `/me/private-profile` is a static path and wins over `/:id/private-profile` in the router, so `me` is never read as an identifier.

Permissions (new): `workforce.private-profile:read` for the first read (HR and Payroll Officer), `workforce.private-profile:write` for the three `PUT` routes, `workforce.private-profile:reveal` for revealing a full identifier. The three are separate on purpose: reading masked data, changing it and seeing a national id in full are different powers. The employee has no write route: HR-SEC-004 says corrections of verified records go through HR Admin.

## 2. Rules and decisions to confirm

| # | Rule or decision | Proposed |
|---|---|---|
| S1 | **Encryption method.** Application-level AES-256-GCM, inside the repository implementation (`database.md` 4.6: encryption and hashing never leave it). A generic `FieldCipher` port in `apps/utility/encryption/` (`encrypt`, `decrypt`, `hash`, with an `FIELD_CIPHER` token) and an AES-GCM implementation that uses Node's `crypto`, no new dependency. Each tenant gets its own data key and its own hash key, both derived with HKDF from the master secrets, so one tenant's key tells nothing about another's and no key is stored. A ciphertext is `v1:<iv>:<tag>:<data>` (base64url), where `v1` names the key version, so rotation can be added later without a format change. The tenant and the field name are bound into the encryption as authenticated data, so a value copied to another tenant or field fails to decrypt. | As stated. |
| S2 | **Keys and configuration.** A new configuration context `encryption.env` (`stack.md` 3.6) with `ENCRYPTION_MASTER_KEY` and `ENCRYPTION_HASH_KEY`: two independent 32-byte secrets, base64. The Joi schema checks they decode to 32 bytes, and the application refuses to start without them. They are separate because the hash key must never change (hashes are compared), while the master key is the one a rotation would replace. Env files are gitignored: local development generates its own (`openssl rand -base64 32`), and preproduction and production get theirs from the deployment's secret store. Nothing real is committed. On start, the cipher encrypts and decrypts a test value, so a wrong or damaged key fails at start, not on the first employee. Alternative to confirm: a KMS instead of env keys. The port makes that a later swap. | Env keys, as decided for D5. |
| S3 | **What is encrypted.** The date of birth, the identifier values and the bank account numbers (design 8.2). Addresses, family, contacts and the rest are confidential and protected by the separate collection and by permissions, but stored readable, so HR can search and the database can index them. | As the design says. |
| S4 | **Masking and hashing.** A masked value keeps the last four characters and replaces every other character with `*`, same length; values of four characters or fewer are fully masked. `value_hash` is the hex HMAC-SHA256 of the normalized value under the tenant's hash key, so equal national ids of two tenants differ, and the same id in one tenant always gives the same hash. | As stated. |
| S5 | **`PUT /private-profile` replaces** these fields, and an omitted field is cleared: `birthDate`, `birthPlace`, `nationalities`, `personalContacts`, `addresses`, `maritalStatus`, `religion`, `familyMembers`, `emergencyContacts`, `taxProfile`. It never touches identifiers or bank accounts, which have their own routes, so a form that only edits an address cannot wipe a bank account. The first call creates the profile. | As stated. |
| S6 | **Birth date and place.** `birthDate` is a local date from 1900-01-01 to today (UTC); `birthPlace` up to 100 characters. | As stated. |
| S7 | **Nationalities:** up to 5 ISO 3166-1 alpha-2 codes, real and not repeated. | As stated. |
| S8 | **Personal contacts:** up to 10 phones (E.164) and emails (lower-cased), use `home` or `mobile`, at most one primary per kind, no repeats. This generalizes the work-contact check of 2.1 into one shared helper that takes the allowed uses. | Shared helper. |
| S9 | **Addresses:** up to 5, each with the shared address check of the facility (real ISO country and subdivision, at most 5 lines and 6 administrative levels). | As stated. |
| S10 | **Coded fields.** `maritalStatus` (a `marital-status` system), `religion` (a `religion` system), family `relationship` and emergency `relationship` (a `family-relationship` system) and the tax `status` (a `tax-status` system) are `Coding`s checked with `assertActive`. The Indonesian bundle ships none of these systems, so a hospital adds the codes it needs first (PTKP codes, relationships). `religion` is therefore off until a tenant defines a religion system: the code concepts are the per-jurisdiction switch the design asks for, with no extra flag. | As stated. |
| S11 | **Family and emergency contacts.** Up to 20 family members, each with a relationship, a name (the same name check as an employee, `official` use), an optional birth date not in the future and a dependent flag. Up to 5 emergency contacts, each with a name up to 200 characters, a relationship and 1 to 5 contacts. | As stated. |
| S12 | **Tax history:** entries with an ISO country, a tax status and an effective date, ordered oldest first, one per date, at most 20. The whole list is replaced by `PUT`, so HR can correct history. | As stated. |
| S13 | **Identifiers.** Each entry: `type` (an `identifier-type` code, active), `system` (for example `id.nik`, `id.npwp`, `passport`), `issuingCountry` (ISO), `value` (plain), `period` (optional, for passports and permits). At most 10, **one per system**, so "reveal `id.nik`" is unambiguous. Values are normalized (spaces, dots and hyphens removed, upper case) and checked: `id.nik` is 16 digits, `id.npwp` 15 or 16 digits, `id.bpjs-kesehatan` 13 digits, `id.bpjs-ketenagakerjaan` 11 digits, and any other system 4 to 40 letters or digits. The format list lives in code next to the checks and is easy to extend. `verified_at` is not accepted yet: the document verification flow is a later group. | As stated. |
| S14 | **No identifier twice in a tenant.** A system and value that another employee of the tenant already holds answers 409 `identifier_taken`, found through the hash, backed by the unique index on `tenant_id`, `identifiers.system` and `identifiers.value_hash`. The answer never says who holds it. | As stated. |
| S15 | **Bank accounts.** Up to 5. Each: `bank` (a `bank` code, active), `accountName` (1 to 200 characters), `accountNumber` (an account number or IBAN, letters and digits, 5 to 34 characters after removing spaces, upper case), `swiftBic` (optional, 8 or 11 characters), `currency` (ISO 4217) and `isPrimary`. When the list is not empty, exactly one is primary. Only the masked number is returned. The number is stored encrypted and never logged. | As stated. |
| S16 | **Reveal.** `GET .../identifiers/:system` needs `reveal`, answers `{ system, value }` with `Cache-Control: no-store`, and writes one access record in the change log (`recordAccess`, the one deliberate exception to "reads are not logged", `logging.md` 4.3) after the read succeeded, naming the entity and the operation but not the value. An unknown system answers 404 `identifier_not_found`. There is no reveal for the bank account number: payroll will receive it through its own export when payroll is designed. | Identifiers only. |
| S17 | **Who may write and when.** The employee must exist in the tenant (404 `employee_not_found` otherwise, the same answer for malformed, missing and foreign ids). Writes are allowed in every employment status, including `separated`: final pay, tax certificates and corrections happen after separation. The employee cannot write their own profile (see the permissions above). | Writes in every status. |
| S18 | **Concurrency and creation.** The profile has a `version`; the `PUT` bodies accept it (409 `stale_version`). Two first `PUT`s at once: one creates, the other answers 409 `stale_version`, backed by the unique index on `tenant_id` and `employee_id`. | As stated. |
| S19 | **Change history and logs.** Each write is recorded in one transaction with the data, with masked identifiers and bank accounts in the change record and `changed` for the date of birth and every other confidential field (`data-change-history.md`). The redaction keys of the design (8.3) are already in `DEFAULT_REDACT_KEYS`; tests assert that no plain identifier, number or birth date appears in any log entry or change record. A failure to decrypt (wrong key, damaged value) answers 500 with no value in the message and writes an error entry with the error class only. | As stated. |
| S20 | **Not built here:** key rotation (the format carries the key version for it), the erasure job after the retention period (`HR-SEC-003`, question Q11), the verification flow of identifier documents, identifiers of family members, and payroll exports. | Later. |
| S21 | **HR events to the identity module.** Group 2.1 left a security gap: separating or suspending an employee does not disable their account (E18). Adding a confidential profile does not change that, but it raises the stakes. The plan keeps events after contracts (2.3), as agreed. If you would rather close the gap first, the events group can go before 2.2's code; say so now. | Keep after 2.3. |

## 3. Code structure

```
apps/back-end/apps/
├── configuration/
│   ├── encryption.ts                      EncryptionSchema (Joi) and EncryptionConfig (`encryption` namespace)
│   └── index.ts                           + EncryptionSchema in ConfigSchema
├── utility/encryption/
│   ├── field-cipher.ts                    FieldCipher port, FIELD_CIPHER token, `mask()`
│   ├── aes-gcm-field-cipher.ts            AES-256-GCM, HKDF per tenant, HMAC-SHA256, start-up self-test
│   ├── module.ts                          EncryptionModule (exports FIELD_CIPHER)
│   └── *.spec.ts
├── repository/
│   ├── token.ts                           + REPOSITORY_EMPLOYEE_PRIVATE_PROFILE
│   ├── interface/employee-private-profile.ts
│   │                                      findByEmployee(tenantId, employeeId)
│   │                                      findIdentifierValue(tenantId, employeeId, system)
│   │                                      findEmployeeIdByIdentifier(tenantId, system, plainValue)
│   │                                      saveProfile(tenantId, employeeId, fields, options)         (write)
│   │                                      replaceIdentifiers(tenantId, employeeId, inputs, options)   (write)
│   │                                      replaceBankAccounts(tenantId, employeeId, inputs, options)  (write)
│   └── mongo/
│       ├── schema/employee-private-profile.ts   collection `employee_private_profiles`; unique {tenant_id, employee_id};
│       │                                        unique partial {tenant_id, identifiers.system, identifiers.value_hash}
│       ├── employee-private-profile.ts          writes encrypt, hash and mask here and nowhere else
│       ├── employee-private-profile.module.ts
│       └── employee-private-profile.spec.ts
├── workforce/
│   ├── workforce.module.ts                + repository module, PrivateProfileService
│   ├── private-profile/
│   │   ├── private-profile.service.ts     get, getOwn, save, replaceIdentifiers, replaceBankAccounts, revealIdentifier
│   │   ├── identifier-formats.ts          normalization and format of each identifier system (S13)
│   │   ├── bank-accounts.ts               checks of S15
│   │   └── *.spec.ts
│   ├── employee/contacts.ts               generalized: normalizeContacts(inputs, allowedUses); the work check calls it
│   └── testing/in-memory.ts               + InMemoryEmployeePrivateProfiles (uses a test FieldCipher)
├── identity/permission.ts                 + workforce.private-profile:read, :write, :reveal
└── gateway_hr/src/
    ├── private-profile/                   module, controller, DTOs, gateway test
    └── testing/in-memory-workforce.ts     + private profiles
environment/<env>/encryption.env           local keys, never committed
```

`GatewayHrModule` loads `encryption.env` and imports `EncryptionModule`. The in-memory repository uses a real `AesGcmFieldCipher` with a fixed test key, so tests exercise the actual encryption, hashing and masking. `gateway_back_office` and `worker` do not use `WorkforceModule`, so they do not need the new variables.

## 4. Tasks

Tests come first in each task.

1. **Cipher and configuration.** `encryption.ts`, `FieldCipher`, `AesGcmFieldCipher`, `mask`. *Tests:* a value round-trips; two encryptions of the same value differ; a ciphertext from another tenant, another field or with one changed character fails; the hash is stable per tenant and different across tenants; masking of short and long values; a key of the wrong length or invalid base64 is rejected by the schema; the self-test fails with a wrong key.
2. **Repository.** Token, interface, schema, Mongo implementation, module. *Tests (fake model):* the stored document holds ciphertext, hash and masked value and never the plain birth date, identifier or account number; reads decrypt the birth date and keep identifiers and accounts masked; `findIdentifierValue` decrypts one value; `findEmployeeIdByIdentifier` queries by hash; each write records one change entry whose values contain only masked forms; a duplicate identifier or a second profile is a conflict; a damaged ciphertext rejects with `RepositoryError` and no value in the message.
3. **Shared checks and service.** Identifier formats, bank accounts, generalized contacts. *Tests (in-memory):* every rule S5 to S19; each identifier system's format; `identifier_taken` across employees and not within the same employee; replace-all semantics and that `PUT /private-profile` never touches identifiers or bank accounts; writes after separation; tenant isolation; reveal writes one access record and no log entry with the value; reads write no log entry.
4. **Endpoints.** Controllers, DTOs, module, permissions, wiring, `encryption.env`. *Gateway tests:* 401 and 403 for each of the three permissions (including reveal without `reveal` and write without `write`); create, read, replace, reveal, `/me`; 404 for malformed, missing and foreign employees and for a missing profile or identifier; 409 for duplicates and stale versions; validation (400 and 422); `Cache-Control: no-store`; no plain identifier, number or birth date in any log entry, in the masked responses or in the change records; the reveal answer carries the full value.
5. **Checks.** `tsc` for all apps and specs, `oxlint`, full `vitest`, `nest build gateway_hr`.

## 5. Pull requests

| PR | Kind | Content |
|---|---|---|
| A | Docs | Group 2.1 status updates and this plan (branch `docs/workforce-employees`). |
| B | Code | Group 2.2 (branch `feat/gateway-hr-private-profile`, cut from `main`). A reviewer should read the cipher first. If the diff is too large it splits in two: the cipher and its configuration first, the profile second. |
| C | Docs | After B merges: permission table, the encryption rules in `database.md` and `workforce.md`, and status updates. |

## 6. Review focus

1. The database never contains a plain date of birth, identifier or bank account number, and no log entry or change record does either. A test reads the stored document and the outbox and searches them for the plain values.
2. Decryption fails for another tenant's ciphertext, another field's ciphertext and a changed ciphertext.
3. Two employees of one tenant cannot hold the same identifier, two tenants can, and the hashes differ.
4. `PUT /private-profile` cannot clear identifiers or bank accounts, and the identifier and bank routes cannot touch the other fields.
5. Revealing an identifier needs its own permission, writes exactly one access record, and answers `no-store`.
6. The application does not start with a missing, short or malformed key.
7. A user with only `read` sees masked values and cannot reveal or write; the employee sees their own masked profile and nobody else's.
