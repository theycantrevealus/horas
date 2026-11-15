# gateway_hr 4.2: Credential applications

Status: **Confirmed** (2026-11-15). Decisions AP1 to AP19 and the three-PR split confirmed as proposed. Part of `2026-11-10-gateway-hr-plan.md` (walkthrough order 15). Endpoints: `../hr-endpoints.md` 4.2. Collections: `../human-resource-collections.md` 4.3 (`credential_applications`), 4.4 (`credential_assessments`) and 4.7 (credentialing scope, decisions C3 and C7). Business rules: `../../business/administrative-operational-system/human-resource-management.md` 7.3 to 7.6 (`HR-CRD-001` to `HR-CRD-011`). Models: `apps/back-end/apps/repository/model/credential-application.ts` and `credential-assessment.ts` (exist, with their classifications). Rules every endpoint follows: `../../rules/back-end/workforce.md` 3. Built references: privilege catalog (4.1), committee memberships (2.5: who sits on which committee), licences (3.1), parameters (1.6: `CREDENTIALING_SCOPE`, `MIN_ASSESSORS`, `TEMPORARY_PRIVILEGE_MAX_DAYS`).

A credential application is a practitioner's request for clinical privileges. It moves through a committee process: preparation, submission, a completeness check, peer assessment by mitra bestari, and a recommendation signed by the committee. Approval by the Director creates the SPK and its privilege grants; that belongs to group 4.3. This group builds the process up to the committee's recommendation.

This is the largest group of the series, so it is built in three code PRs.

## 1. The endpoints

Thirteen of the fourteen listed endpoints. `POST .../decision` moves to 4.3 (AP2).

| Part | Endpoint | Behaviour |
|---|---|---|
| A | `GET /v1/credential-applications` | The committee work queue. Query: `status`, `committee` (a code), `facilityId`, `employeeId`, `olderThanDays` (in the current status), `limit`, `offset`. Ordered by `status_since`, oldest first. Writes no log entry. |
| A | `POST /v1/credential-applications` | Starts a `draft`. Body: `employeeId`, `credentialingFacilityId`, `type` (`initial` or `temporary`, AP3), `requestedPrivileges`, `requestedUnitIds`, `documents`, `temporary` (type `temporary` only), optional `reason`. |
| A | `GET /v1/credential-applications/:id` | Returns one application. |
| A | `PATCH /v1/credential-applications/:id` | Edits a `draft` or `returned` application: privileges, units, documents. A `returned` one goes back to `draft`. Optional `version`, `reason`. |
| A | `POST /v1/credential-applications/:id/submit` | Sends a `draft` to the committee (`submitted`). |
| A | `POST /v1/credential-applications/:id/withdraw` | Withdraws before assessment. Body: `reason`. |
| B | `POST /v1/credential-applications/:id/start-review` | Committee starts checking completeness (`under_review`). |
| B | `POST /v1/credential-applications/:id/return` | Committee sends it back to `draft` for missing documents. Body: `reason`. |
| B | `POST /v1/credential-applications/:id/assessors` | Committee appoints assessors. Body: `assessorEmployeeIds`. |
| B | `POST /v1/credential-applications/:id/conflict-declaration` | The assessor declares a conflict of interest, or none. |
| C | `POST /v1/credential-applications/:id/assessments` | The assessor records their assessment of every requested privilege. |
| C | `GET /v1/credential-applications/:id/assessments` | The committee reads the assessments; the read is recorded as an access (`HR-AUD-003`). |
| C | `POST /v1/credential-applications/:id/recommendation` | The committee chair signs the recommendation to the Director (`recommended`). |

Permissions (new): `workforce.credential-application:read` (queue and read), `workforce.credential-application:write` (create, edit, submit, withdraw) and `workforce.credential:review` (the committee routes). The routes of the assessor are personal and need sign-in only (AP7).

## 2. Rules and decisions to confirm

| # | Rule or decision | Proposed |
|---|---|---|
| AP1 | **HR acts for the applicant; applicant self-service comes later.** The spec says "HR Admin or the applicant creates". The platform has no "this permission, or the person themself" check (`authentication.md` 2), and adding one touches identity, which needs your decision. So in 4.2 create, edit, submit and withdraw need `workforce.credential-application:write`, held by HR. An applicant portal (`me` routes) is a later group. Assessors are the exception: their two routes are personal (AP7). | HR only for now. |
| AP2 | **`POST .../decision` moves to 4.3.** Approving creates the SPK and its privilege grants, whose repositories and rules (one current SPK per facility, valid licences on the issue date, supervised grants) belong to 4.3. So 4.2 ends at `recommended`, and 4.3 gets the Director's decision (approve or reject, and the terminal states `approved` and `rejected`). The endpoint list moves that row and the counts change: 4.2 has 13 endpoints, 4.3 has 10. | Move it. |
| AP3 | **Types.** Only `initial` and `temporary` are accepted now. `recredentialing` and `privilege_extension` need the SPK being renewed (`previous_appointment_id`), which exists after 4.3; until then they answer 422 `type_not_supported`. A `temporary` application carries `temporary` (`requested_days` up to `TEMPORARY_PRIVILEGE_MAX_DAYS`, `urgency` a code) and skips assessment (AP12). | As stated. |
| AP4 | **Applicant and facility.** The employee must exist in the tenant, not be `separated`, be clinical (`is_clinical`) and have a profession (422 `employee_not_clinical`). The credentialing facility must be an active facility of the tenant. The committee is read from the employee's workforce category (`credentialing_committee` property) and copied (422 `committee_not_configured` when the category has none). `credentialing_scope` is read from `CREDENTIALING_SCOPE` when the application is created and copied (4.7). | As stated. |
| AP5 | **Units.** Each requested unit must be an active unit of the tenant. Under scope `facility` every unit must belong to the credentialing facility (422 `unit_outside_facility`); under `group` any unit of the tenant is allowed (decision C3). `requested_facility_ids` is derived from the units, never sent. | As stated. |
| AP6 | **Requested privileges (HR-CRD-007).** At least one and at most 50 catalog items, no duplicates. Each item must be `active`, list the applicant's profession, list the applicant's primary specialty when it has specialties, and be open to the credentialing facility. The requested condition is `full`, `supervised` or `restricted`; `supervised` names a proposed supervisor (an employee of the tenant who is not the applicant). Checking that the supervisor's own grant is `full` waits for 4.3. **Career level:** an item with `min_clinical_level` needs the applicant's level to be at least that level, which needs an order of levels. The proposal is that each `clinical-level` concept carries a numeric `rank` property; an item with a level, an applicant without a level or a concept without a rank is refused (422 `level_not_met`). The ranks are added to the `id` bundle. | As stated, with the rank. |
| AP7 | **Who may do what.** The committee routes (start-review, return, appoint assessors, read assessments) need `workforce.credential:review` **and** an active membership of the applicant's committee at the credentialing facility (any role). The recommendation needs the chair. The assessor routes need no permission: the caller must be one of the appointed assessors of that application (the account's `employee_id`). This uses the committee memberships of 2.5 in place of scoped permissions, which do not exist. Everyone else answers 403 `not_committee_member` or `not_an_assessor`. | As stated. |
| AP8 | **Documents.** Each is a type (a `Coding` of an `evidence-type` system) and a file reference (same checks as licence scans), and may link to a licence of the applicant (`license_id`, any status). At most 30 documents. Submitting needs every mandatory evidence type of every requested privilege to be present (422 `evidence_missing`, the codes are named in the error). | As stated. |
| AP9 | **Status flow (7.3).** `draft` to `submitted` (submit), `submitted` to `under_review` (start-review), `under_review` or `assessed` to `returned` (return; a `returned` application is edited and goes back to `draft`), `under_review` to `assessed` (automatic, AP11), `assessed` to `recommended` (recommendation), and `draft`, `submitted`, `under_review` or `returned` to `withdrawn` (withdraw, only while no assessment was recorded). `approved` and `rejected` arrive with 4.3. Each change sets `status_since`. Any other move is 422 `invalid_transition`. | As stated. |
| AP10 | **Assessors (HR-CRD-005).** The committee appoints employees of the tenant who are not separated, are not the applicant, and hold an active membership with the role `mitra_bestari` in the applicant's committee at the credentialing facility (422 `assessor_not_eligible`). An application needs at least `MIN_ASSESSORS` (a parameter of the committee) assessors without a declared conflict before it can be assessed. Appointing is additive; an assessor who declares a conflict stops counting and the committee appoints another. A relative of the applicant cannot be checked (no relationship data), so it relies on the declaration. | As stated. |
| AP11 | **Conflict declaration and assessment.** Each assessor declares once, before assessing: `hasConflict` and, when true, a `relationship` (a code of a new `conflict-relationship` system). A declaration is final. An assessor with a conflict cannot assess (403 `conflict_declared`). An assessment covers every requested privilege in one request: the methods (codes of a new `assessment-method` system), the outcome, the recommended condition (needed when recommended, empty otherwise) and a reason of 1 to 2000 characters. One assessment per assessor and privilege (unique index). When every assessor without a conflict has assessed, at least `MIN_ASSESSORS` of them, the application becomes `assessed` in the same transaction. | As stated. |
| AP12 | **Recommendation (HR-CRD-008).** Signed by the committee chair, from `assessed`, or from `under_review` for a `temporary` application (no assessment, 7.4.4). It covers every requested privilege: `recommended` with a condition, or `not_recommended`. The condition must not be more permissive than requested: `full` is more permissive than `supervised` and `restricted`; swapping those two is allowed. `supervised` names a supervisor, `restricted` needs notes. A `summary` of 1 to 2000 characters. If every privilege is `not_recommended`, the application is still `recommended`; the Director rejects it in 4.3. | As stated. |
| AP13 | **Confidentiality (HR spec 14).** Assessments and the recommendation summary are `highly_confidential`. `GET .../assessments` needs the committee permission and membership and records an access in the change log through `ChangeRecorder.recordAccess` after the read succeeded (`logging.md` 13.2: the first service to use it). The assessor's own assessment is not readable by other assessors. `GET .../:id` hides `recommendation.summary` and the assessors' declarations from callers who are not committee members; HR with the read permission sees the application without them. | As stated. |
| AP14 | **Queue and age.** The list is for the committee work queue: any holder of `workforce.credential-application:read` sees every application of the tenant (tenant-wide read until scoped permissions exist). `olderThanDays` compares `status_since` with now. SLA alerts (`CREDENTIAL_SLA_DAYS`) are not sent here. | As stated. |
| AP15 | **Codes.** Three new code systems in the `id` bundle, with starter values to confirm with HR: `id.assessment-method` (`document_review`, `interview`, `observation`, `logbook`), `id.conflict-relationship` (`relative`, `supervisor`, `business_interest`, `other`) and `id.temporary-urgency` (`disaster`, `absence`, `visiting_specialist`). The level ranks of AP6 are added to the clinical levels of the `id` bundle. | As stated. |
| AP16 | **Reasons.** `return` and `withdraw` need a reason of 1 to 500 characters; it is stored as `return_reason` or `withdrawal_reason` (the last one only) and also goes to the change history. Every status change carries its reason in the change history (`HR-CRD-010`). Nothing is deleted. | As stated. |
| AP17 | **No events, no notifications.** The status changes emit nothing and send nothing; alerts and notifications need the worker (HR plan D5). | None now. |
| AP18 | **Edits.** `PATCH` replaces the lists that are sent and keeps the rest, and rechecks the whole application (AP5, AP6, AP8). The applicant, the facility, the committee, the scope and the type are fixed. | As stated. |
| AP19 | **Tenant and ids.** `tenant_id` always from `@CurrentUser()`; a foreign, missing or malformed id gives the same 404 (`application_not_found`); in a body it gives 422. | As stated. |

## 3. Repositories

- `CredentialApplicationRepository` (`credential_applications`), part A: `findByFilter(tenantId, query)` for the queue, plus the base methods. Indexes from the design: `{ tenant_id, employee_id, status }` and `{ tenant_id, committee.code, status, status_since }`. Updatable fields: everything the process changes (status, `status_since`, lists, assessors, recommendation, return and withdrawal reasons), not the applicant, facility, committee, scope or type.
- `CredentialAssessmentRepository` (`credential_assessments`), part C: `findByApplication(tenantId, applicationId)` and `findByAssessor`, with the unique index `{ tenant_id, application_id, assessor_employee_id, catalog_item_id }`. Writes record changes; the read of the list records an access.
- Each part adds the in-memory fakes with the same unique rules.

## 4. Code structure

```
apps/back-end/apps/
├── repository/{token.ts, interface/credential-application.ts, interface/credential-assessment.ts}
├── repository/mongo/{credential-application, credential-assessment}.ts, .module.ts, schema/ (+ specs)
├── workforce/credentialing/{application.service.ts, review.service.ts, assessment.service.ts, application-rules.ts} (+ specs)
├── workforce/concept/bundle-id.ts        three code systems and the level ranks (AP15)
├── workforce/testing/in-memory.ts        the two fakes
├── identity/permission.ts                workforce.credential-application:read, :write, workforce.credential:review
└── gateway_hr/src/credentialing/         controllers, DTOs, module, gateway tests
```

`gateway_hr/src/testing/in-memory-workforce.ts` registers the repositories.

## 5. Tasks and pull requests

| PR | Kind | Content |
|---|---|---|
| A | Docs | This plan, the master plan row and the moved `decision` row in `hr-endpoints.md` (branch `docs/workforce-applications-plan`). |
| B1 | Code | Part A: the `credential_applications` repository, the level ranks, create, read, queue, edit, submit and withdraw (branch `feat/workforce-applications`). |
| B2 | Code | Part B: start-review, return, appoint assessors and the conflict declaration, with the committee membership checks (branch `feat/workforce-application-review`). |
| B3 | Code | Part C: the `credential_assessments` repository, the assessments, the access record on reads and the recommendation (branch `feat/workforce-application-assessment`). |
| C | Docs | After each code PR: a small "build in progress" or "built" docs PR for the master plan row; after B3, `workforce.md`, `hr-endpoints.md` (including the moved `decision` row) and this plan's status. |

Tests come first in each task: repository (indexes, tenant isolation, no `_id`, one change record per write), service (every rejection above, tenant isolation, stale version, the status table, the committee and assessor checks, reads write no log, writes log no values) and gateway (401, 403, 404, 409, 422, validation, list limits). Checks: `tsc`, `oxlint`, full `vitest` and `nest build gateway_hr`, run from `apps/back-end` under Node 22 (`pnpm` does not start on this machine).

## 6. Review focus

1. A status never moves outside the table of AP9, and each move records its reason.
2. Only members of the applicant's committee run the committee routes, only the chair recommends, and only an appointed assessor without a conflict assesses.
3. An assessor is never the applicant, never a person without the `mitra_bestari` role, and each assessment covers every requested privilege.
4. The recommendation never grants more than was requested.
5. Assessments are never readable without leaving an access record.
6. Logs and responses carry no assessment text, summaries or reasons for people who may not see them.

## 7. Decisions that need your answer

Confirmed as proposed: AP1 (HR acts for the applicant; applicant self-service later), AP2 (the Director's decision moves to 4.3), AP3 (only `initial` and `temporary` now), AP6 (level ranks as a concept property), AP7 (committee membership in place of scoped permissions; only the chair recommends), AP10 (assessors need the `mitra_bestari` membership), AP13 (assessments are read through an access record, first use of `recordAccess`) and AP15 (three new code systems). Also the split into three code PRs. The others are proposed as stated.
