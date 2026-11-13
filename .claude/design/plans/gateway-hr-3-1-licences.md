# gateway_hr 3.1: Licences

Status: **Confirmed** (2026-11-13). Decisions L1 to L20 and the two-PR split confirmed as proposed. Part of `2026-11-10-gateway-hr-plan.md` (walkthrough order 12). Endpoints: `../hr-endpoints.md` 3.1. Collection: `../human-resource-collections.md` 3.1 to 3.3 and section 8 (decision C1). Business rules: `../../business/administrative-operational-system/human-resource-management.md` section 6 (`HR-LIC-001` to `HR-LIC-010`). Model: `apps/back-end/apps/repository/model/professional-license.ts` (exists, with its classification). Rules every endpoint follows: `../../rules/back-end/workforce.md` 3. Built references: employees (2.1, `me` routes), contracts (2.3, UTC dates and the verifier-versus-submitter style of rule), assignments (2.4, one-open-record indexes), code concepts (1.3, `id.license-type` already ships `str` and `sip`).

A licence is a legal document that lets a clinical employee practise: the STR (registration) and the SIP (practice permit, one per hospital or clinic). HR registers it, a different HR Admin verifies it against the original and the registry, and from then on it counts towards clinical eligibility (group 6). This group records and verifies licences. It does not decide eligibility, and nothing expires them yet.

## 1. The seven endpoints

| Endpoint | Behaviour |
|---|---|
| `GET /v1/licenses` | Lists licences of the tenant. Query: optional `status`, `licenseType` (a code), `facilityId` (the practice location), `expiringWithinDays` (1 to 3650: only `valid` licences whose expiry date falls from today to that many days ahead), `limit`, `offset`. Ordered by expiry date then id when `expiringWithinDays` is given, otherwise by id. Writes no log entry. |
| `GET /v1/employees/:id/licenses` | Lists one employee's licences, newest issue date first, whatever their status. Not paged. 404 `employee_not_found`. Writes no log entry. |
| `POST /v1/licenses` | HR registers a licence for an employee. Body: `employeeId`, `licenseType` (`Coding`), `profession` (`Coding`), `specialty` (optional `Coding`), `documentNumber`, `issuingAuthority` (`name`, optional `code`), `jurisdiction` (`country`, optional `subdivision`), `practiceLocation` (`facilityId` or `name`), `issueDate`, `expiryDate`, `document` (file reference), `replacesLicenseId` (optional), optional `reason`. Status `pending_verification`. |
| `POST /v1/employees/me/licenses` | Self-service: the same body without `employeeId`; the employee is the one linked to the signed-in account. Needs sign-in only. Submission `self_service`. |
| `GET /v1/licenses/:id` | Returns one licence with its verification. 404 `license_not_found`. |
| `POST /v1/licenses/:id/verify` | Records verification. Body: `outcome` (`match` or `mismatch`), `method` (`Coding`), optional `notes`, and for a mismatch `reason` (`Coding`). A match makes the licence `valid` (and supersedes the old SIP of a renewal); a mismatch rejects it. Optional `version`. |
| `POST /v1/licenses/:id/revoke` | Records a revocation by the issuing authority. Body: `effectiveDate`, `reason` (`Coding`), optional `notes`, `version`. |

Permissions (new): `workforce.license:read` (the three reads), `workforce.license:write` (register), `workforce.license:verify` (verify and revoke: HR Admin only, `HR-LIC-002`). The self-service route needs sign-in only, like the other `me` routes.

## 2. Rules and decisions to confirm

| # | Rule or decision | Proposed |
|---|---|---|
| L1 | **Employee.** Must exist in the tenant and not be `separated` (422 `employee_not_found`, `employee_separated`). A licence does not need the employee to be `is_clinical`: HR may record a licence before the workforce category is set. The employee and the licence type are fixed after registration. | As stated. |
| L2 | **Licence type and profession.** `licenseType` is a `Coding` of a `license-type` system and `profession` a `Coding` of a `profession` system, both active (`assertActive`). The type's properties decide the rest: `requires_expiry_date` (L5), `location_specific` (L6), `eligibility_role` (copied onto the licence, so later concept edits do not change history). When the type's `professions` list is not empty, the profession must be in it (422 `profession_not_allowed`). | As stated. |
| L3 | **Document number.** Trimmed, 1 to 64 characters. The service keeps the number as printed and a normalized form (upper case, no spaces, dots or hyphens) for uniqueness. One live record per tenant, type and normalized number (409 `license_exists`); a rejected record does not block its correction (`is_live` false). | As stated. |
| L4 | **The scan is a file reference only (HR plan D3).** There is no file service, so the body carries `document` as `file_id` (1 to 128 characters), `content_type` (`application/pdf`, `image/jpeg` or `image/png`) and `sha256` (64 hex characters). The service stores it and does not check that the file exists. The model needs a document, so it is required. | As stated. |
| L5 | **Dates.** `issueDate` and `expiryDate` are local dates between 1950-01-01 and ten years ahead; an expiry date is not before the issue date. A type that requires an expiry date (SIP) needs one (422 `expiry_required`); a type that does not (STR) may have one or leave it `null` (lifetime, `HR-LIC-004`; open question Q1 about old STRs stays with HR). A future issue date is allowed, because a renewal may be registered ahead (L12). "Today" is read in UTC, as in contracts (T12): a licence has no facility zone. | As stated. |
| L6 | **Practice location.** Required when the type is `location_specific` (422 `practice_location_required`) and refused otherwise. It names either a facility of this tenant (`facilityId`, active and not deleted: 422 `facility_not_found`, `facility_inactive`) or another place by `name` (1 to 200 characters); exactly one of the two. A postal address for another place is not accepted yet. | As stated. |
| L7 | **Authority and jurisdiction.** `issuingAuthority.name` 1 to 200 characters, optional `code` (a `Coding`, active when given). `jurisdiction.country` is an ISO 3166-1 alpha-2 code, `subdivision` an optional ISO 3166-2 code. | As stated. |
| L8 | **Submission.** HR registration stores `submission.via: 'hr'`; the self-service route `self_service`. `submission.by` is the signed-in actor either way. Self-service reads the employee from the account (`user.employee_id`), never from the body; an account with no employee answers 404 `employee_not_found`. | As stated. |
| L9 | **Verification (HR-LIC-002, 003).** Only a `pending_verification` licence (422 `license_not_pending`). The verifier must not be the submitter (403 `verifier_is_submitter`). A match needs the licence's profession to equal the employee's (422 `profession_mismatch`) and its specialty to be `null` or equal the employee's primary specialty (422 `specialty_mismatch`); an employee with no profession cannot have a licence verified. A match on an already expired licence is refused (422 `license_expired`) and so is one whose issue date is later than today (422 `issue_date_in_future`, design 3.3 step 3). A match sets `valid`, `status_effective_date` to today (UTC) and stores the verification. | As stated. |
| L10 | **Mismatch.** Sets `rejected`, `is_live` false, `status_effective_date` today, and stores the verification and the rejection (`reason` required: 422 `reason_required`). The licence stays for the history; HR registers a corrected one (`HR-LIC-008`). | As stated. |
| L11 | **Two new code systems in the `id` bundle.** `id.license-verification-method` (`manual_registry_check`, `document_review`) for the verification method and `id.license-status-reason` for rejection and revocation reasons (`document_mismatch`, `registry_mismatch`, `wrong_profession`, `revoked_by_authority`, `suspended_by_authority`, `other`). Codes for other countries come from their own bundles. The lists are starter values to be confirmed with HR before go-live, like the profession list (1.3 C11). | As stated. |
| L12 | **One valid SIP per facility and renewals (HR-LIC-006, decision C1).** At most one `valid` practice permit per employee, profession and facility of this tenant (partial unique index; 409 `valid_license_exists` at verification). A renewal names the licence it replaces (`replacesLicenseId`: same employee, type, profession and facility, status `valid`; 422 `replaced_license_invalid`). Verifying the renewal makes the old licence `superseded` (`superseded.by_license_id`, effective date the renewal's issue date) and the new one `valid`, in one transaction. | As stated. |
| L13 | **Revocation.** Only a `valid` licence (422 `license_not_valid`). `effectiveDate` is a local date not before the issue date and not later than tomorrow (UTC). Sets `revoked`, `status_effective_date` and `revocation`. Needs `workforce.license:verify`. | As stated. |
| L14 | **No edit, no delete.** A wrong licence is rejected and registered again. There is no `PATCH` and no endpoint to reject a pending licence without verifying it; the mismatch does it. | As stated. |
| L15 | **Expiry is not applied by this group.** A `valid` licence past its expiry date stays `valid` until the daily job exists (HR plan D5: the worker's job is not built). The expiry report lists by date, and clinical eligibility (group 6) must read the date as well as the status. The PR states this gap. | Later. |
| L16 | **Practice locations limit (HR-LIC-007).** The spec says to warn when a Tenaga Medis would exceed `MAX_PRACTICE_LOCATIONS_MEDIS`. The response is the licence model and has no place for a warning, so this group does not check it. It arrives with eligibility and the notifications. | Not built here. |
| L17 | **Leaving `onboarding` (HR-LIC-009, E17).** The rule "a clinical employee cannot leave `onboarding` until STR and SIP are `valid`" needs the clinical eligibility computation and an override for the HR Manager. It is **not** added to `changeStatus` in this group. | Later (group 6). |
| L18 | **Events and notifications.** None. Licence events, expiry alerts and the shortfall message of `HR-LIC-010` need the worker and the CPD group. | None now. |
| L19 | **Confidential notes.** `verification.notes` and the notes of a rejection or revocation are `confidential` in the classification. Today one permission reads whole licences, so a holder of `workforce.license:read` sees the notes. A narrower read comes with scoped permissions (`workforce.md` 7). | As stated. |
| L20 | **Tenant and ids.** `tenant_id` always from `@CurrentUser()`. A foreign, missing and malformed id gives the same 404 (`license_not_found`, `employee_not_found`); in a body it gives 422. | As stated. |

## 3. Repository

A new `ProfessionalLicenseRepository` (token, interface, schema with a pinned collection `professional_licenses`, Mongo implementation, module; model and classification exist):

- Reads (named `find*`): `findByEmployee`, `findAll` with the filters of the list (`findByFilter`), `findLiveByNumber(tenantId, type, normalizedNumber)`, `findValidPermit(tenantId, employeeId, profession, facilityId)`.
- Writes through the base class (`create`, `update`), each recorded. No `delete`. Updatable fields: `status`, `status_effective_date`, `is_live`, `verification`, `rejection`, `revocation`, `superseded`.
- Indexes, all starting with `tenant_id`: the unique live number per type (design 3.2), the unique valid permit per employee, profession and facility, `{ employee, eligibility_role, status }`, `{ status, expiry_date }` and `{ practice_location.facility_id, status }`.

## 4. Code structure

```
apps/back-end/apps/
├── repository/{token.ts, interface/professional-license.ts}
├── repository/mongo/{professional-license.ts, .module.ts, schema/professional-license.ts} (+ spec)
├── workforce/license/{license.service.ts, license-rules.ts} (+ spec)
├── workforce/concept/bundles.ts          the two new code systems (L11)
├── workforce/testing/in-memory.ts        in-memory repository with the same unique rules
├── identity/permission.ts                workforce.license:read, :write, :verify
└── gateway_hr/src/license/               controllers, DTOs, module, gateway test
```

`gateway_hr/src/testing/in-memory-workforce.ts` registers the new repository.

## 5. Tasks and pull requests

The group is larger than earlier ones, so it is built as two code PRs.

| PR | Kind | Content |
|---|---|---|
| A | Docs | This plan (branch `docs/workforce-licences-plan`). |
| B1 | Code | Repository, the two code systems, registration (HR and self-service) and the three reads: `POST /licenses`, `POST /employees/me/licenses`, `GET /licenses`, `GET /employees/:id/licenses`, `GET /licenses/:id`. Licences stay `pending_verification` (branch `feat/workforce-licences`). |
| B2 | Code | Verification, rejection, renewal (supersede) and revocation: `POST /licenses/:id/verify` and `/revoke`, the valid-permit index check and the `workforce.license:verify` permission (branch `feat/workforce-license-verification`). |
| C | Docs | After B2 merges: `workforce.md`, `hr-endpoints.md`, the master plan walkthrough and this plan's status. |

Tests come first in each task: repository (unique rules only while live or valid, tenant isolation, no `_id`), service (every rejection above, tenant isolation, stale version, the verifier rule, supersede in one transaction, reads write no log, writes log no values) and gateway (401, 403, 404, 409, validation, list limits). Checks: `tsc`, `oxlint`, full `vitest` and `nest build gateway_hr`, run from `apps/back-end` under Node 22 (`pnpm` does not start on this machine).

## 6. Review focus

1. The verifier is never the submitter, and only a match on a pending, unexpired licence of the right profession makes it valid.
2. At most one valid practice permit per employee, profession and facility; a renewal supersedes the old one in the same transaction, and nothing leaves the employee without a valid SIP in between.
3. No licence is edited or deleted; a corrected licence is a new record.
4. The tenant never comes from the body; the self-service route reads only the signed-in employee's own licences.
5. Logs carry no document number, notes or dates.

## 7. Decisions that need your answer

Confirmed as proposed: L4 (file reference only), L8 (self-service for any signed-in employee), L11 (two new code systems), L15 (no expiry job, so `valid` can be past its date), L16 and L17 (practice-location limit and the `onboarding` rule are not built here), and the split into two code PRs. The others are proposed as stated.
