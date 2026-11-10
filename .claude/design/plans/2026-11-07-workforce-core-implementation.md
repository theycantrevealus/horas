# Workforce Core (HRM Slice 1) Implementation Plan
> **Superseded** on 2026-11-10 by `2026-11-10-gateway-hr-plan.md`. Kept for reference only; do not execute.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the core of the Human Resource Management module in the back end: organizations, facilities, code concepts, employees with private profiles, contracts, organization units, positions and position assignments, served by `gateway_back_office`.

**Architecture:** A new transport-neutral bounded context `apps/back-end/apps/workforce` (alias `@workforce/*`), built like `identity`: models, interfaces, schemas, classifications and Mongo repositories in `apps/repository`, services in the context, HTTP controllers and DTOs in `gateway_back_office/src/workforce/`. Confidential identifiers are encrypted by a new `FieldCipher` (AES-256-GCM, per-tenant keys derived from one master key in `encryption.env`) inside the private-profile repository. Every write is change-recorded by the existing `MongoRepositoryBase`.

**Tech Stack:** NestJS 12 on Fastify, Mongoose (replica set), Joi config, class-validator DTOs, Vitest, oxlint.

**Spec:** `.claude/design/account-and-workforce-collections.md` (sections 2 to 6, 8, 10 to 12; approved 2026-11-06), `.claude/business/administrative-operational-system/human-resource-management.md` (sections 4.1, 5, 9.2, 14, 15), `.claude/design/data-change-history.md`.

## Global Constraints

- No semicolons; strict TypeScript; no `any`; `unknown` when the type is unknown (`.claude/rules/typescript.md`).
- Every function, method, class, interface and exported constant has a JSDoc with `@param` and `@returns` where they apply (`.claude/rules/jsdoc.md`).
- Repository methods that only read are named `find*`; everything else is a write and is change-recorded (`database.md` 4.2, 6.1). Reads write no log entry (`logging.md` 4.3).
- Every model has a `<name>.classification.ts`; `apps/repository/model/classification.spec.ts` must stay green.
- Every stored record has `tenant_id`, `schema_version`, `version`, `created_by` (`ActorRef`) and no `updated_by` (`database.md` 4.5). Every compound index starts with `tenant_id`.
- Instants are real UTC `Date`; calendar dates are `YYYY-MM-DD` strings (`database.md` 4.4).
- Services receive `tenant_id` from `@CurrentUser()`; a record of another tenant is answered as not found. `employee_id` and tenant never come from a request body.
- Business errors are `WorkforceError` subclasses (kinds `not_found`, `conflict`, `invalid`, `forbidden`); repositories reject only with `RepositoryError` classes.
- Never log or return plain identifiers, bank numbers or tax numbers; add new sensitive field names to `DEFAULT_REDACT_KEYS` in the same change (`HR-SEC-002`).
- Commit only when the developer asks, with signed Conventional Commits whose scope is `workforce` (added in Task 1). Stage files by name.
- Do not touch identity behaviour. The only identity files changed are `permission.ts` (new catalog entries), `testing/in-memory.ts` (import of the extracted base class) and `tsconfig`/`vitest` aliases.

## Review Focus

1. Two HR Admins edit the same employee at once: the second update with a stale `version` gets 409, not a silent overwrite.
2. A malformed or foreign-tenant id on any route answers 404, never 500, and never reveals that the record exists in another tenant.
3. The same national id registered for two employees of one tenant answers 409 without echoing the value; the same value in two tenants is allowed.
4. A separated employee cannot be changed, assigned or re-activated; their open contracts and assignments end on the separation date in the same transaction.
5. Two primary assignments for one employee, or two heads for one unit, cannot exist even under concurrent requests (unique partial indexes decide, the service maps the conflict).
6. Plain identifier, bank and tax values never appear in a response (except the dedicated reveal route), a log entry or a change record.
7. Calendar dates such as `2026-02-30`, periods whose end is before their start, and a unit that is its own ancestor are rejected as invalid.
8. An inactive or soft-deleted unit, position or concept cannot be referenced by new records; existing records keep working.

---

## File Structure

| Path | Responsibility |
|---|---|
| `apps/configuration/encryption.ts` | `EncryptionSchema`, `EncryptionConfig` (`encryption` namespace). |
| `apps/utility/crypto/field-cipher.ts` | `FieldCipher` port, `FIELD_CIPHER` token, `EncryptedValue`, `normalizeIdentifier`, `maskValue`. |
| `apps/utility/crypto/env-field-cipher.ts` | `EnvFieldCipher` (HKDF-derived per-tenant keys). |
| `apps/utility/crypto/module.ts` | `FieldCipherModule`. |
| `apps/utility/validation/local-date.ts` | `isLocalDate`, `IsLocalDate` decorator, `compareLocalDates`. |
| `apps/utility/testing/in-memory-repository.ts` | `InMemoryRepository` extracted from `identity/testing/in-memory.ts`. |
| `apps/repository/model/common/{human-name,contact-point,address,person-identifier,date-period}.ts` | Embedded model types (design 2.2). |
| `apps/repository/mongo/schema/common/*.ts` | Matching Mongoose sub-schemas. |
| `apps/repository/model/{organization,facility,code-concept,employee,employee-private-profile,employment-contract,organization-unit,position,position-assignment}.ts` (+ `.classification.ts`) | Models and field classifications. |
| `apps/repository/interface/<same names>.ts` | Repository interfaces with named queries. |
| `apps/repository/mongo/schema/<same names>.ts`, `mongo/<same names>.ts`, `mongo/<same names>.module.ts` | Storage shapes, implementations, `forFeature` modules. |
| `apps/repository/token.ts` | Nine new `REPOSITORY_*` tokens. |
| `apps/workforce/` | `workforce.module.ts`, `workforce.error.ts`, `workforce.filter.ts`, `observe.ts`, `employee/`, `structure/`, `contract/`, `assignment/`, `concept/`, `seed/`, `testing/`. |
| `apps/gateway_back_office/src/workforce/` | Controllers, DTOs, `workforce-management.module.ts`, `workforce-management.spec.ts`. |
| `apps/identity/permission.ts` | New workforce permissions. |
| `.claude/rules/back-end/workforce.md` | Rules for the new context (Task 11). |

---

### Task 1: Context scaffolding, alias and commit scope

**Files:**
- Modify: `apps/back-end/tsconfig.json` (paths), `apps/back-end/vitest.config.ts` (alias, comment), `commitlint.config.mjs` (scope), `.claude/rules/git-workflow.md` (scope table, section 2.2)
- Create: `apps/back-end/apps/workforce/workforce.error.ts`, `workforce.filter.ts`, `observe.ts`, `workforce.error.spec.ts`

**Interfaces:**
- Produces: `WorkforceError(kind, code, message)` with subclasses `NotFoundError`, `ConflictError`, `InvalidRequestError`, `ForbiddenError` (same shape as `IdentityError`, `kind` values `'not_found' | 'conflict' | 'invalid' | 'forbidden'`); `WorkforceExceptionFilter` (`@Catch(WorkforceError)`, status 404/409/422/403, logs `event: 'workforce_rejection'` except 404 on GET/HEAD); `observe<T>(logger: AppLogger, event: string, operation: string, work: () => Promise<T>, successLevel?: 'log' | 'debug'): Promise<T>`.

- [ ] **Step 1: Write the failing test** `workforce.error.spec.ts`: each subclass has the right `kind`, `name`; `WorkforceExceptionFilter` maps kinds to 404/409/422/403 and writes no log for a 404 on `GET` (mirror `identity.filter.spec.ts`).
- [ ] **Step 2: Run** `pnpm --filter @horas/back-end test -- apps/workforce` → FAIL (modules missing).
- [ ] **Step 3: Implement** the three files by mirroring `identity.error.ts`, `identity.filter.ts`, `observe.ts` (copy, rename; do not make identity depend on workforce or the reverse). Add `"@workforce/*": ["./apps/workforce/*"]` to tsconfig `paths`, `'@workforce': path('./apps/workforce')` to the vitest alias (update its comment), the scope `workforce` to `commitlint.config.mjs` and to the scope table in `git-workflow.md`.
- [ ] **Step 4: Run** the same command → PASS; `pnpm --filter @horas/back-end type-check` → no errors.

### Task 2: Field encryption

**Files:**
- Create: `apps/configuration/encryption.ts`, `apps/utility/crypto/{field-cipher,env-field-cipher,module}.ts`, `apps/utility/crypto/field-cipher.spec.ts`, `apps/back-end/environment/development/encryption.env`
- Modify: `apps/configuration/index.ts` (concat `EncryptionSchema`), `apps/utility/logger/format.ts` (`DEFAULT_REDACT_KEYS`: `masterkey`, `encryptionmasterkey`, `valueencrypted`, `valuehash`, `ciphertext`, `accountnumberencrypted`, `birthdateencrypted`, `taxid`, `npwp`, `passport`, `iban`)

**Interfaces:**
- Produces:
  - `interface EncryptedValue { key_ref: string; ciphertext: string }`
  - `interface FieldCipher { encrypt(tenantId: string, plain: string): EncryptedValue; decrypt(tenantId: string, value: EncryptedValue): string; hash(tenantId: string, normalized: string): string }`
  - `const FIELD_CIPHER: unique symbol`; `normalizeIdentifier(value: string): string` (trim, remove spaces, hyphens and dots, upper-case); `maskValue(value: string): string` (all `*` except the last 4 characters; all `*` when 4 or fewer).
  - `EncryptionConfig` → `{ masterKey: string }`; env `ENCRYPTION_MASTER_KEY`: base64 of exactly 32 bytes, required, no default.

- [ ] **Step 1: Write failing tests** in `field-cipher.spec.ts`: round trip; `key_ref` is `env-v1`; two encryptions of the same value differ (random IV); decrypt with another tenant id throws; a flipped ciphertext byte throws; unknown `key_ref` throws; `hash` is stable for one tenant, differs between tenants and is 64 hex characters; `normalizeIdentifier(' 3171-0123.4567 89 ')` equals `317101234567 89` without spaces (assert the exact string); `maskValue('1234567890')` equals `******7890`, `maskValue('123')` equals `***`; `EncryptionSchema` rejects a key that is not 32 bytes of base64.
- [ ] **Step 2: Run** `pnpm --filter @horas/back-end test -- apps/utility/crypto` → FAIL.
- [ ] **Step 3: Implement** `EnvFieldCipher` with `node:crypto`: per-tenant keys by `hkdfSync('sha256', master, tenantId, 'horas:enc:v1', 32)` and `'horas:hash:v1'` for HMAC; ciphertext is base64 of `iv(12) | tag(16) | data`; the tenant id is the AES-GCM additional authenticated data. `EncryptionConfig` is `registerAs('encryption', ...)`. `FieldCipherModule` provides `FIELD_CIPHER` with `useClass: EnvFieldCipher` and imports no global state. `development/encryption.env` holds a development-only key (state this in a comment line); `preproduction`/`production` get no file, like `auth.env`.
- [ ] **Step 4: Run** the tests → PASS; run `pnpm --filter @horas/back-end test -- apps/utility/logger` → still PASS.

### Task 3: Shared embedded types, local dates and generic in-memory repository

**Files:**
- Create: `apps/repository/model/common/{human-name,contact-point,address,person-identifier,date-period,bank-account}.ts`, matching `apps/repository/mongo/schema/common/*.ts`, `apps/utility/validation/local-date.ts` (+ spec), `apps/utility/testing/in-memory-repository.ts`
- Modify: `apps/identity/testing/in-memory.ts` (import `InMemoryRepository` from the new file; no behaviour change)

**Interfaces:**
- Produces (model types, exactly as design 2.2 except where noted): `HumanName`, `ContactPoint`, `Address`, `DatePeriod { start: string; end: string | null }`; `PersonIdentifier { type: Coding; system: string; issuing_country: string; value_masked: string; value_hash: string; period?: DatePeriod; verified_at?: Date }` (stored view); `PersonIdentifierInput { type: Coding; system: string; issuing_country: string; value: string; period?: DatePeriod }`; `BankAccount { bank: Coding; account_name: string; account_number_masked: string; currency: string; is_primary: boolean }`; `BankAccountInput` (same with `account_number: string`).
- Produces: `isLocalDate(value: unknown): value is string` (strict `YYYY-MM-DD`, real calendar day), `@IsLocalDate()` decorator, `compareLocalDates(a: string, b: string): number`, `isValidPeriod(period: DatePeriod): boolean` (end null or not before start).
- Produces: `class InMemoryRepository<M extends StoredModel>` moved unchanged (same constructor and members).

- [ ] **Step 1: Write failing tests** `local-date.spec.ts`: accepts `2026-02-28`, `2028-02-29`; rejects `2026-02-30`, `2026-13-01`, `26-01-01`, `2026-1-1`, `''`, a `Date` object; `isValidPeriod({start:'2026-05-01',end:'2026-04-30'})` is false, `end: null` is true.
- [ ] **Step 2: Run** `pnpm --filter @horas/back-end test -- apps/utility/validation` → FAIL.
- [ ] **Step 3: Implement** the validators and the model/schema files (sub-schemas use `{ _id: false }` like `CodingSchema`); move `InMemoryRepository` and fix identity's import.
- [ ] **Step 4: Run** `pnpm --filter @horas/back-end test` (whole back end) → PASS, proving the extraction changed nothing.

### Task 4: Organizations, facilities and code concepts (repositories)

**Files:**
- Create: models `organization.ts`, `facility.ts`, `code-concept.ts` (+ classifications), interfaces, schemas, Mongo repositories, `*.module.ts`; extend `token.ts` (`REPOSITORY_ORGANIZATION`, `REPOSITORY_FACILITY`, `REPOSITORY_CODE_CONCEPT`); `apps/repository/mongo/workforce-reference.spec.ts`

**Interfaces:**
- Produces models per design 3.2 to 3.4: `Organization { code, legal_name, country, identifiers: {system,value}[], currency, status: 'active'|'inactive' }`; `Facility { organization_id, code, name, address: Address | null, timezone, external_ids: {system,value}[], status }`; `CodeConcept { tenant_id: string | null, system, code, display: LocalizedText[], properties: Record<string, unknown>, mappings: Coding[], period: DatePeriod | null, status: 'active'|'retired' }` (schema comment: `tenant_id` null means platform-wide).
- Produces: `OrganizationRepository.findByCode(tenantId, code)`; `FacilityRepository.findByCode(tenantId, code)`; `CodeConceptRepository.findByCode(tenantId: string, system: string, code: string): Promise<CodeConcept | null>` (a tenant concept wins over a platform one) and `findBySystem(tenantId, system): Promise<CodeConcept[]>` (tenant and platform, active first).
- Indexes: organizations `{tenant_id,code}` unique; facilities `{tenant_id,code}` unique; code concepts `{tenant_id,system,code}` unique (null tenant allowed).
- Classification: organizations and facilities `internal`; code concepts `public`.

- [ ] **Step 1: Write failing tests** (`workforce-reference.spec.ts`, fake model token like `lov.spec.ts`): `create` records one change entry per repository; `findByCode` returns tenant concept before platform concept; duplicate code is mapped to `RepositoryConflictError`.
- [ ] **Step 2: Run** `pnpm --filter @horas/back-end test -- apps/repository/mongo/workforce-reference` → FAIL.
- [ ] **Step 3: Implement** by following `role.ts`/`role.module.ts` exactly (extend `MongoRepositoryBase`, explicit mapper, `ChangeHistoryModule` in each `forFeature`); `allowDelete: false`, `allowSoftDelete: true`, `updatableFields` limited to non-key fields.
- [ ] **Step 4: Run** the spec plus `classification.spec.ts` → PASS.

### Task 5: Employee and private-profile repositories

**Files:**
- Create: models `employee.ts`, `employee-private-profile.ts` (+ classifications), interfaces, schemas, repositories, modules; tokens `REPOSITORY_EMPLOYEE`, `REPOSITORY_EMPLOYEE_PRIVATE_PROFILE`; `apps/repository/mongo/employee.spec.ts`, `employee-private-profile.spec.ts`

**Interfaces:**
- `Employee` per design 4.1 (`employee_number`, `name: HumanName`, `other_names`, `display_name`, `administrative_gender: Coding | null`, `workforce_category: Coding`, `is_clinical`, `profession: Coding | null`, `specialties`, `clinical_level`, `employment_status`, `employment_status_since`, `current_employment`, `primary_assignment`, `original_hire_date`, `separation_date`, `practitioner_ids`, `work_contacts`, `photo`, `preferred_language`) with `EmploymentStatus = 'onboarding'|'probation'|'active'|'suspended'|'separated'`. Classification: default `internal`; `name`, `display_name`, `workforce_category`, `is_clinical`, `profession`, `specialties`, `primary_assignment`, `photo` are `public`.
- `EmployeePrivateProfile` per design 4.2 (`employee_id`, `birth_date: string | null`, `birth_place`, `nationalities`, `identifiers: PersonIdentifier[]`, `personal_contacts`, `addresses`, `marital_status`, `religion`, `family_members` (without identifiers in slice 1), `emergency_contacts`, `bank_accounts: BankAccount[]`, `tax_profile`). Classification: default `confidential`; `identifiers`, `bank_accounts`, `birth_date` are `confidential`; the repository masks nothing extra because identifiers hold only masked values.
- `EmployeeRepository`: `findByEmployeeNumber(tenantId, employeeNumber)`, `findByPractitionerId(tenantId, system, value)`, `changeStatus(id, change: EmployeeStatusChange, options?: UpdateOptions): Promise<Employee>` where `EmployeeStatusChange { status: EmploymentStatus; since: string; separation_date?: string }` (a write; sets status fields and bumps `version`).
- `EmployeePrivateProfileRepository`: `findByEmployeeId(tenantId, employeeId)`, `findByIdentifier(tenantId, system, value): Promise<EmployeePrivateProfile | null>` (normalizes and hashes inside), `findIdentifierValue(tenantId, employeeId, system): Promise<string | null>` (decrypts; the only reveal path), `replaceIdentifiers(id, inputs: PersonIdentifierInput[]): Promise<EmployeePrivateProfile>`, `replaceBankAccounts(id, inputs: BankAccountInput[]): Promise<EmployeePrivateProfile>`. The repository injects `FIELD_CIPHER`; `birth_date` is stored encrypted and decrypted by the mapper; `pickChanges` is overridden to encrypt `birth_date`.
- Indexes: employees `{tenant_id,employee_number}` unique (no partial filter), `{tenant_id,employment_status,is_clinical}`, `{tenant_id,'practitioner_ids.system','practitioner_ids.value'}` unique partial on `practitioner_ids.system` existing; profiles `{tenant_id,employee_id}` unique and `{tenant_id,'identifiers.system','identifiers.value_hash'}` unique partial on `identifiers.value_hash` being a string.

- [ ] **Step 1: Write failing tests**: employee `create` then `findByEmployeeNumber`; duplicate number rejects `RepositoryConflictError`; `changeStatus` bumps `version` and records one change entry listing `employment_status`; profile `replaceIdentifiers` stores only masked and hashed values (assert the raw stored document has no plain value and the change record holds `{masked:'changed'}` or the masked string for `identifiers`); same identifier on a second employee of one tenant rejects `RepositoryConflictError`, on another tenant succeeds; `findByIdentifier` finds by differently formatted value (`3171-0123…` vs `3171 0123…`); `findIdentifierValue` returns the plain value; tampered ciphertext rejects `RepositoryError`.
- [ ] **Step 2: Run** the two specs → FAIL.
- [ ] **Step 3: Implement** following `account.ts` for repository shape. Employee `updatableFields` exclude `employee_number`, `employment_status`, `separation_date` (changed only by `changeStatus`).
- [ ] **Step 4: Run** the two specs and `classification.spec.ts` → PASS.

### Task 6: Contract, unit, position and assignment repositories

**Files:**
- Create: models `employment-contract.ts`, `organization-unit.ts`, `position.ts`, `position-assignment.ts` (+ classifications), interfaces, schemas, repositories, modules; tokens `REPOSITORY_EMPLOYMENT_CONTRACT`, `REPOSITORY_ORGANIZATION_UNIT`, `REPOSITORY_POSITION`, `REPOSITORY_POSITION_ASSIGNMENT`; `apps/repository/mongo/workforce-structure.spec.ts`

**Interfaces:**
- Models per design 4.3 to 4.6. `EmploymentContract.status`: `'draft'|'active'|'ended'|'terminated'|'superseded'`; `OrganizationUnit { organization_id, facility_id, code, name: LocalizedText[], type: Coding, parent_id: string | null, ancestor_ids: string[], is_clinical, external_ids, period: DatePeriod | null, status: 'active'|'closed' }`; `Position { unit_id, code, title: LocalizedText[], kind: 'structural'|'functional', is_head_of_unit, allowed_professions: Coding[], grade: Coding | null, budgeted_headcount, period, status: 'active'|'closed' }`; `PositionAssignment { employee_id, contract_id, position_id, unit_id, facility_id, is_primary, is_head_of_unit, kind: Coding, period: DatePeriod, fte, status: 'planned'|'active'|'ended', decision_ref: {number, document?} | null }`. Classification: all `internal`, unit/position names `public`.
- Named queries (all `find*`): `ContractRepository.findByEmployee(tenantId, employeeId)`, `findActiveByEmployee(...)`, `findByNumber(tenantId, organizationId, contractNumber)`; `OrganizationUnitRepository.findByCode(tenantId, facilityId, code)`, `findDescendants(tenantId, unitId)` (uses `ancestor_ids`), `findChildren(tenantId, unitId)`; `PositionRepository.findByCode(tenantId, unitId, code)`, `findByUnit(tenantId, unitId)`; `PositionAssignmentRepository.findActiveByEmployee`, `findByUnit(tenantId, unitId, status?)`, `findActiveHead(tenantId, unitId)`.
- Writes: `PositionAssignmentRepository.endAssignment(id, endDate: string): Promise<PositionAssignment>` and `OrganizationUnitRepository.moveSubtree(id, newParentId: string | null, newAncestors: string[]): Promise<OrganizationUnit>` (rewrites `ancestor_ids` of the unit and its descendants one by one inside one `run`; no bulk write).
- Indexes: design section 11 for contracts (`{tenant_id,organization_id,contract_number}` unique), units (`{tenant_id,facility_id,code}` unique, `{tenant_id,ancestor_ids}`), positions (`{tenant_id,unit_id,code}` unique; one active head position per unit: unique partial `{tenant_id,unit_id,is_head_of_unit}` where `is_head_of_unit: true, status: 'active'`), assignments (one active primary per employee and one active head per unit: unique partial indexes where `status` in `['planned','active']`... use `$in` is not allowed in partial filters, so store `is_open: boolean` on assignments, true while planned or active, and filter on `is_open: true`).

- [ ] **Step 1: Write failing tests**: duplicate contract number conflicts; `findDescendants` returns only the subtree; second open primary assignment for one employee rejects `RepositoryConflictError`; second open head assignment for one unit rejects the same; `endAssignment` sets `status: 'ended'`, `is_open: false` and `period.end`, one change entry; `moveSubtree` rewrites descendants' `ancestor_ids`.
- [ ] **Step 2: Run** the spec → FAIL.
- [ ] **Step 3: Implement** as in Task 4; `ancestor_ids` and `is_open` are repository-maintained (not in `updatableFields`).
- [ ] **Step 4: Run** the spec and `classification.spec.ts` → PASS.

### Task 7: Permissions and code-concept service

**Files:**
- Modify: `apps/identity/permission.ts`
- Create: `apps/workforce/concept/{concept.service,concept.service.spec}.ts`, `apps/workforce/seed/indonesia-concepts.ts`, `apps/workforce/testing/in-memory.ts`

**Interfaces:**
- Produces permissions: `WORKFORCE_EMPLOYEE_READ 'workforce.employee:read'`, `_WRITE 'workforce.employee:write'`, `_STATUS 'workforce.employee:change-status'`, `WORKFORCE_PROFILE_READ 'workforce.private-profile:read'`, `_WRITE`, `WORKFORCE_IDENTIFIER_REVEAL 'workforce.private-profile:reveal'`, `WORKFORCE_CONTRACT_READ/_WRITE`, `WORKFORCE_STRUCTURE_READ/_WRITE`, `WORKFORCE_ASSIGNMENT_READ/_WRITE`, `WORKFORCE_CONCEPT_READ/_MANAGE`.
- Produces `CodeConceptService`: `assertActive(tenantId: string, coding: Coding): Promise<CodeConcept>` (throws `InvalidRequestError('unknown_code', …)` when missing or retired), `list(tenantId, system?): Promise<CodeConcept[]>`, `import(tenantId, concepts: CodeConceptInput[]): Promise<{ created: number; skipped: number }>` (idempotent on `(system, code)`).
- Produces `INDONESIA_CONCEPTS: CodeConceptInput[]`: systems `id.workforce-category` (`tenaga_medis`, `tenaga_keperawatan`, `tenaga_kesehatan_lain`, `non_klinis`, each with `properties.is_clinical` and `properties.credentialing_committee`), `id.employment-type` (`pkwtt` permanent with `allows_probation: true`, `pkwt` fixed term, `mitra` contractor, `intern` trainee, each mapped to the universal `employment-type` code), `id.unit-type`, `id.assignment-kind` (hire, transfer, promotion, acting, secondment), `id.committee-role`; professions are left to tenants.
- Produces `workforce/testing/in-memory.ts`: in-memory implementations of all nine repository interfaces built on `InMemoryRepository`, with the named queries and the same uniqueness rules as the Mongo indexes (throw `RepositoryConflictError`).

- [ ] **Step 1: Write failing tests**: `assertActive` accepts a platform concept and a tenant concept, rejects a retired one and an unknown one; `import` twice creates once; every `INDONESIA_CONCEPTS` entry has a non-empty `display` for `id-ID` and `en`; every permission string is in the catalog and `isPermission` accepts it.
- [ ] **Step 2: Run** `pnpm --filter @horas/back-end test -- apps/workforce/concept apps/identity` → FAIL.
- [ ] **Step 3: Implement.** Services are `@Injectable()`, inject repositories by token and `AppLogger`, write through `observe`.
- [ ] **Step 4: Run** the same command → PASS.

### Task 8: Structure services (organizations, facilities, units, positions)

**Files:**
- Create: `apps/workforce/structure/{structure.service,unit.service,position.service}.ts` and specs

**Interfaces:**
- `OrganizationService`/`FacilityService` (in `structure.service.ts`): `create(tenantId, input)`, `update(tenantId, id, input, expectedVersion?)`, `get`, `list`. Facility `timezone` must pass the same check as `IsTimeZone`; facility's `organization_id` must exist in the tenant.
- `UnitService`: `create(tenantId, input: { facilityId, code, name, type: Coding, parentId?: string, isClinical, period? })` (asserts type concept; parent must be in the same facility; `ancestor_ids` = parent's ancestors + parent id), `update` (name, type, flags, period), `move(tenantId, id, newParentId | null)` (rejects when the new parent is the unit or one of its descendants: `InvalidRequestError('unit_cycle')`), `close(tenantId, id, endDate)` (rejects while open assignments or active child units exist: `ConflictError('unit_in_use')`), `get`, `list`, `tree(tenantId, rootId?)`.
- `PositionService`: `create(tenantId, input)` (unit must be active; `allowed_professions` asserted as concepts; at most one active head position per unit, mapped from the repository conflict to `ConflictError('head_position_exists')`), `update`, `close` (rejects with open assignments), `get`, `listByUnit`.

- [ ] **Step 1: Write failing tests** with the in-memory repositories: unit with parent in another facility is invalid; move of a unit under its own descendant is invalid; closing a unit with an open assignment conflicts; second head position conflicts; a closed unit cannot receive a new position; stale `expectedVersion` yields `ConflictError('stale_version')`; other-tenant ids are `NotFoundError`.
- [ ] **Step 2: Run** `pnpm --filter @horas/back-end test -- apps/workforce/structure` → FAIL.
- [ ] **Step 3: Implement.** Map `RepositoryConflictError` from uniqueness to `ConflictError` with a specific code; map `RepositoryNotFoundError` to `NotFoundError`; each write goes through `observe` and, where the design requires a reason, `withChangeReason`.
- [ ] **Step 4: Run** → PASS.

### Task 9: Employee, contract and assignment services

**Files:**
- Create: `apps/workforce/employee/{employee.service,employment-status,private-profile.service}.ts`, `apps/workforce/contract/contract.service.ts`, `apps/workforce/assignment/assignment.service.ts` and specs

**Interfaces:**
- `employment-status.ts`: `TRANSITIONS: Readonly<Record<EmploymentStatus, readonly EmploymentStatus[]>>` — `onboarding → probation, active`; `probation → active, suspended, separated`; `active → suspended, separated`; `suspended → active, separated`; `separated → none` (design 5.4, `HR-ROS-001`); `canTransition(from, to): boolean`; `isSchedulable(status): boolean` (probation or active); `evaluateEmployment(employee): { eligible: boolean; failed: 'employment' | null }` (`HR-ELG-001/002`, employment condition only).
- `EmployeeService`: `create(tenantId, input)` (asserts concepts; `is_clinical` taken from the category concept, never from the request; clinical requires `profession`; `employee_number` unique; `original_hire_date` valid local date; starts as `onboarding`), `update` (public/internal fields only, `expectedVersion`), `get`, `list` (filters: status, category, clinical, unit, search by name or number), `changeStatus(tenantId, id, { to, reason, effectiveDate, separationDate? })`: validates the transition, requires `reason` for `suspended` and `separated`, requires `separationDate` for `separated`, and in one `TransactionManager.run` updates the employee, ends open contracts (`ended`, `period.end = separationDate`) and open assignments (`endAssignment`), clears `current_employment`/`primary_assignment`; all under `withChangeReason(reason)`. Probation is allowed only when the current contract's type concept has `allows_probation`; `HR-LIC-009` (licence check before leaving onboarding for clinical positions) is **not enforced in this slice** and is marked `it.todo('HR-LIC-009 …')` in the spec.
- `PrivateProfileService`: `get(tenantId, employeeId)`, `upsert(tenantId, employeeId, input)` (creates the profile on first call; sets fields), `replaceIdentifiers`, `replaceBankAccounts` (duplicates inside one request rejected; a conflict from the hash index becomes `ConflictError('identifier_in_use')` with no value in the message), `revealIdentifier(tenantId, employeeId, system)` (returns `{ value }`, always followed by a change-log access record through `ChangeRecorder.recordAccess`, `HR-AUD-003` style).
- `ContractService`: `create` (employee not separated; organization exists; fixed-term types require `period.end`, asserted from the concept property `requires_end_date`; probation end only where allowed; at most one `active` contract per employee and organization overlapping in time), `activate`, `end(tenantId, id, endDate, reason)`, `get`, `listByEmployee`; keeps `employee.current_employment` in sync in the same transaction.
- `AssignmentService`: `create` (employee schedulable or onboarding but not separated or suspended; position active and its unit active; `allowed_professions` respected for clinical employees; contract belongs to the employee and is active; `facility_id`/`unit_id` copied from the position; `is_head_of_unit` copied from the position; conflicts from the partial unique indexes become `ConflictError('primary_assignment_exists' | 'head_assignment_exists')`), `end(tenantId, id, endDate)`, `get`, `listByEmployee`, `listByUnit`; keeps `employee.primary_assignment` in sync.

- [ ] **Step 1: Write failing tests** (in-memory repositories, fake `TransactionManager`): every allowed and every forbidden transition of the table; `separated` without date or reason is invalid; separating ends open contracts and assignments and clears the denormalized fields; a separated employee rejects `update`, new contracts and new assignments; `is_clinical` in the request body is ignored; clinical employee without profession is invalid; a second primary assignment and a second head conflict; probation on a `pkwt` contract is invalid; a plain identifier never appears in the profile returned by `get` (`value_masked` only); `revealIdentifier` records an access entry; the same identifier on another employee conflicts with `identifier_in_use`; `evaluateEmployment` returns `failed: 'employment'` for `onboarding`, `suspended` and `separated` and eligible for `probation` and `active`.
- [ ] **Step 2: Run** `pnpm --filter @horas/back-end test -- apps/workforce` → FAIL.
- [ ] **Step 3: Implement.** Wrap multi-record writes in `TransactionManager.run`; log after `run` resolves (`logging.md` 4.3); log identifiers and counts only.
- [ ] **Step 4: Run** → PASS.

### Task 10: HTTP API, module wiring and gateway test

**Files:**
- Create: `apps/workforce/workforce.module.ts`; `apps/gateway_back_office/src/workforce/{workforce-management.module,employee.controller,private-profile.controller,contract.controller,structure.controller,assignment.controller,concept.controller,workforce.dto}.ts`; `workforce-management.spec.ts`
- Modify: `apps/gateway_back_office/src/gateway.back.office.module.ts` (import `EncryptionConfig` in `load`, `${environmentIdentifier}/encryption.env` in `envFilePath`, `FieldCipherModule` is imported by the repository modules that need it, `WorkforceManagementModule`, `{ provide: APP_FILTER, useClass: WorkforceExceptionFilter }`, repository modules are imported by `WorkforceModule`)

**Interfaces:**
- Routes (all `version: '1'`, all guarded by `@RequirePermissions`, tenant from `@CurrentUser()`): `GET/POST employees`, `GET/PATCH employees/:id`, `POST employees/:id/status`, `GET/PUT employees/:id/private-profile`, `PUT employees/:id/private-profile/identifiers`, `PUT employees/:id/private-profile/bank-accounts`, `GET employees/:id/private-profile/identifiers/:system` (reveal), `GET/POST contracts`, `GET contracts/:id`, `POST contracts/:id/activate|end`, `GET/POST organizations`, `GET/PATCH organizations/:id`, same for `facilities`, `GET/POST units`, `GET/PATCH units/:id`, `POST units/:id/move|close`, `GET units/tree`, `GET/POST positions`, `GET/PATCH positions/:id`, `POST positions/:id/close`, `GET/POST assignments`, `GET assignments/:id`, `POST assignments/:id/end`, `GET code-concepts`, `POST code-concepts/import`. Permissions follow Task 7 (read routes `*_READ`, writes `*_WRITE`, status `WORKFORCE_EMPLOYEE_STATUS`, reveal `WORKFORCE_IDENTIFIER_REVEAL`, concept import `WORKFORCE_CONCEPT_MANAGE`).
- DTOs validate with class-validator: ids `@IsMongoId`, dates `@IsLocalDate`, time zones `@IsTimeZone`, codings `{ system, code }` with length limits, `limit` 1 to 100 and `offset` ≥ 0 on lists, `version` optional integer on `PATCH`/`PUT`; unknown properties are rejected by the existing validation pipe settings. Responses are the models; the private-profile reveal route sends `Cache-Control: no-store`.

- [ ] **Step 1: Write the failing gateway test** `workforce-management.spec.ts` using the pattern of `account-management.spec.ts` (fake connection module, in-memory repositories, a signed-in admin holding every workforce permission): create organization, facility, concepts (import), unit, position, employee, contract, assignment, then assert: 401 without a token; 403 without the permission; `GET employees/<foreign tenant id>` → 404; malformed id → 404; stale `version` on `PATCH` → 409; private-profile `GET` shows `value_masked` and never the plain value, the response body contains no plain value; reveal returns it with `no-store`; duplicate identifier → 409 with no value in the body; `POST employees/:id/status` to `separated` ends the assignment (visible through `GET assignments`); a read request writes no log entry other than the access log (spy on all levels, like the read-only test in `account-management.spec.ts`).
- [ ] **Step 2: Run** `pnpm --filter @horas/back-end test -- apps/gateway_back_office/src/workforce` → FAIL.
- [ ] **Step 3: Implement** controllers (thin: parse DTO, call service) and wire modules; add `encryption.env` handling in `ConfigModule.forRoot`.
- [ ] **Step 4: Run** the test → PASS, then `pnpm --filter @horas/back-end test`, `pnpm lint`, `pnpm type-check` from the repository root → all green. Start the gateway once against the development environment (`pnpm dev:gateway`) and confirm it boots (config validation accepts `encryption.env`); report if MongoDB is unavailable instead of claiming it ran.

### Task 11: Documentation

**Files:**
- Create: `.claude/rules/back-end/workforce.md` (layout, permissions, how to add an employee-linked collection, encryption rules, what is deferred)
- Modify: `.claude/design/account-and-workforce-collections.md` (status line: slice 1 implemented, list deviations: committee memberships and outbox events deferred, `family_members` without identifiers, `is_open` on assignments, tenant-less `code_concepts`), `.claude/business/administrative-operational-system/human-resource-management.md` (implementation notes under 5.4 and 9.2), `.claude/rules/back-end/authentication.md` (section 5: employee existence is still not checked), `CLAUDE.md` (pointer to `workforce.md`)

- [ ] **Step 1:** Write the documents from the final code (route list, permission list, deferred list). The deferred list must say: HR events to identity, committee memberships, licences (HR-LIC-009 not enforced), scoped permissions, full clinical eligibility.
- [ ] **Step 2:** Re-read each changed document against the code; fix any statement the code does not support.
- [ ] **Step 3:** Run `pnpm lint` and `pnpm type-check`; report results. Ask the developer whether to commit; propose one commit per task using scope `workforce` (Task 1 `chore(repo)`, Task 2 `feat(config)`, Task 3 `refactor(utility)`).

---

## Self-Review

- **Spec coverage:** design sections 2 (conventions) → Tasks 2, 3; 3 (platform collections) → 4; 4.1 to 4.6 → 5, 6, 8, 9; 8 (encryption, redaction) → 2, 5; 11 (indexes) → 4 to 6; 12 (tokens, named queries) → 4 to 6; HR 5.4 → 9; HR 9.2 → 8, 9; HR 14/15 → classifications, change recording, reveal access record. Not covered on purpose: committee memberships, HR events/outbox, `WORKFORCE_DIRECTORY`, scoped permissions, licences, credentialing, rostering.
- **Type consistency:** `PersonIdentifier` (stored) vs `PersonIdentifierInput` (write) are defined in Task 3 and used in Tasks 5 and 9; `EmployeeStatusChange` (Task 5) is what `changeStatus` in Task 9 passes; `FieldCipher` (Task 2) is injected in Task 5 only; `is_open` is defined in Task 6 and only the repository sets it.
- **Proportion:** the plan lists decisions, signatures and assertions; bodies are left to the implementer.
