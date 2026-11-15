# gateway_hr 4.3: SPK and granted privileges

Status: **Confirmed** (2026-11-16). Decisions SP1 to SP18 and the split in three code PRs confirmed as proposed, including SP10 (the grant `lift-suspension` route, 11 endpoints). Part of `2026-11-10-gateway-hr-plan.md` (walkthrough order 16). Endpoints: `../hr-endpoints.md` 4.3. Collections: `../human-resource-collections.md` 4.5 (`clinical_appointments`), 4.6 (`privilege_grants`) and 4.7 (credentialing scope, decisions C3 and C7). Business rules: `../../business/administrative-operational-system/human-resource-management.md` 7.3 to 7.6 (`HR-CRD-001` to `HR-CRD-011`). Models: `apps/back-end/apps/repository/model/clinical-appointment.ts` and `privilege-grant.ts` (exist, with their classifications). Rules every endpoint follows: `../../rules/back-end/workforce.md` 3 and 3f. Built references: credential applications (4.2: the recommendation this group acts on), licences (3.1: HR-CRD-002), privilege catalog (4.1), parameters (1.6: `SPK_VALIDITY_YEARS`, `TEMPORARY_PRIVILEGE_MAX_DAYS`).

The Director's decision turns a recommended application into an SPK (Surat Penugasan Klinis) with its privilege grants (the lines of the RKK), or rejects it. After that the Director can suspend, lift the suspension of, or revoke a whole SPK, or one granted privilege. This group builds the decision, the reads and these status changes. Using the grants to decide who may work where (clinical eligibility, group 6) is not part of it.

It has ten endpoints, built in three code PRs.

## 1. The endpoints

`POST .../decision` moved here from 4.2 (4.2 plan AP2).

| Part | Endpoint | Behaviour |
|---|---|---|
| A | `POST /v1/credential-applications/:id/decision` | The Director approves (creates the SPK and its grants) or rejects a `recommended` application. Body: `outcome` (`approved` or `rejected`), `reason` (needed when rejected), and for an approval `appointmentNumber`, optional `validUntil`, optional `signedDocument`, optional `version`. |
| B | `GET /v1/clinical-appointments` | Lists SPKs. Query: `status`, `employeeId`, `facilityId`, `unitId`, `expiringInDays`, `limit`, `offset`. Ordered by the end of validity, soonest first. Writes no log entry. |
| B | `GET /v1/employees/:id/clinical-appointments` | One practitioner's SPKs, newest first. |
| B | `GET /v1/clinical-appointments/:id` | One SPK with its grants (the RKK). |
| B | `GET /v1/privilege-grants` | The privilege directory. Query: `catalogItemId`, `employeeId`, `status` (default `active`), `condition`, `facilityId`, `unitId`, `flagged`, `limit`, `offset`. Ordered by privilege code, then identifier. |
| C | `POST /v1/clinical-appointments/:id/suspend` | Suspends a whole SPK. |
| C | `POST /v1/clinical-appointments/:id/lift-suspension` | Lifts a suspension by a new decision. |
| C | `POST /v1/clinical-appointments/:id/revoke` | Revokes an SPK permanently. |
| C | `POST /v1/privilege-grants/:id/suspend` | Suspends one granted privilege. |
| C | `POST /v1/privilege-grants/:id/revoke` | Revokes one granted privilege. |

Decision SP10 proposes one more route, `POST /v1/privilege-grants/:id/lift-suspension` (11 endpoints).

Permissions (new): `workforce.clinical-appointment:read` and `workforce.privilege-grant:read` (the reads) and `workforce.credential:decide` (the Director's decisions: approve, reject, suspend, lift, revoke).

## 2. Rules and decisions to confirm

| # | Rule or decision | Proposed |
|---|---|---|
| SP1 | **Who decides.** The platform has no "Director of facility X" concept: no position or role says who the Director is, and spec question Q4 (does the Director delegate?) is open. So the decision routes need the permission `workforce.credential:decide`, given by an administrator to the Director or the delegate, and the caller's `employee_id` is recorded as `issued.director_employee_id`. A caller without a linked employee gets 403 `director_employee_required`. The decider is never the applicant (403 `decider_is_applicant`). The committee's recommendation is not needed again; it is already on the application. | As stated. |
| SP2 | **Decision body.** `rejected` needs a reason of 1 to 500 characters and writes no SPK. `approved` needs `appointmentNumber`: upper case letters, digits, `/`, `.` and `-`, 1 to 64 characters, unique per tenant (409 `appointment_number_exists`). `validUntil` and `signedDocument` (a file reference, checked like licence scans) are optional. Only an application in `recommended` can be decided (422 `invalid_transition`). The application becomes `approved` or `rejected`, with its `decision` (outcome, who, when, reason, and the SPK identifier). | As stated. |
| SP3 | **Types.** 4.2 accepts only `initial` and `temporary`, so 4.3 can only issue those. `recredentialing` and `privilege_extension` need `previous_appointment_id`, the supersession of the old SPK (status `superseded`, `superseded_by_id`) and the same `valid until` for an extension (7.4.2, 7.4.3). That is a feature of its own: it changes how applications are created in 4.2 as well as how they are approved here. Proposal: leave it out of 4.3 and build it as a small follow-up group (4.4 Renewals), so 4.3 stays reviewable. | Follow-up group 4.4. |
| SP4 | **What an approval writes.** In one transaction: the SPK (`active`, `is_current: true`), one grant per privilege the committee recommended (privileges not recommended are not granted), and the application update. The SPK copies the applicant, the credentialing facility and scope, the units and facilities of the application, and `is_temporary`. Each grant copies the employee, facilities and units of the SPK, takes its condition, supervisor and restriction notes from the recommendation (never the requested ones), and starts `active`. If nothing was recommended the approval answers 422 `nothing_recommended`; the Director rejects instead. A privilege retired since the request answers 422 `privilege_retired`. | As stated. |
| SP5 | **Licences (HR-CRD-002).** On the issue date the applicant needs a valid registration (STR) and, for every facility of the SPK, a valid practice permit (SIP). "Valid" is status `valid`, issued on or before the date, and not expired on it: nothing expires licences yet, so the date is read too (4.2 only checked the status). The applicant must not have separated (422 `employee_separated`). Failing answers 422 `license_not_valid`. | As stated. |
| SP6 | **Validity (HR-CRD-004).** It starts on the issue date, which is today in the credentialing facility's time zone. The longest end is the start plus `SPK_VALIDITY_YEARS` years (read for the credentialing facility) minus one day; for a temporary SPK it is the start plus the requested days minus one day (the application already holds them within `TEMPORARY_PRIVILEGE_MAX_DAYS`). `validUntil` defaults to that longest end and may be earlier, never later or before the start (422 `invalid_validity`). | As stated. |
| SP7 | **One current SPK.** A person has at most one current (`active` or `suspended`) non-temporary SPK per credentialing facility (409 `appointment_exists`), backed by the partial unique index of the design. Temporary SPKs are not limited by that index. A second approval of the same application is refused because the application is no longer `recommended`. | As stated. |
| SP8 | **Supervised grants (HR-CRD-006).** When issuing a `supervised` grant, the supervisor named in the recommendation must hold an `active`, `full` grant of the same privilege in an `active` SPK of the credentialing facility; the grant stores `supervisor` with that grant's identifier. Otherwise 422 `supervisor_not_privileged`. This is the check 4.2 left for here. | As stated. |
| SP9 | **Suspend, lift, revoke an SPK.** The Director decides by the same permission. Body: `reason` (1 to 500 characters), `decisionNumber` (the letter, 1 to 64 characters), optional `version`. The effective date is not sent: it is today in the credentialing facility's zone (future-dated or backdated decisions would need a job or reopen eligibility history; they can be added later). `suspend` takes `active` to `suspended` and sets `suspension`; `lift-suspension` takes `suspended` to `active`, clears `suspension` (the earlier values stay in the change history) and needs a new decision number; `revoke` takes `active` or `suspended` to `revoked`, sets `revocation`, sets `is_current` to `false`, and also sets every grant of the SPK that is not revoked to `revoked`, all in one transaction. Suspending an SPK does not touch its grants: eligibility reads the SPK status (HR-CRD-001). `expired`, `superseded` and `revoked` are final (422 `invalid_transition`). | As stated. |
| SP10 | **Grants: suspend, lift, revoke.** Same body and the same effective date rule as SP9. `suspend` takes `active` to `suspended`, `revoke` takes `active` or `suspended` to `revoked` (final). The business rules (7.4.5 step 4) say lifting a suspension takes a new Director decision for individual grants too, but the endpoint list has no route for it. Proposal: add `POST /v1/privilege-grants/:id/lift-suspension` (11 endpoints in 4.3); without it a suspended grant could only be revoked. A grant of an SPK that is not `active` or `suspended` cannot be changed (422 `appointment_not_current`). | Add the route. |
| SP11 | **Supervisor loses the privilege (HR-CRD-006).** When a `full` grant stops being active (suspended or revoked directly, or through the revocation or suspension of its SPK), every `supervised` grant that points to it gets the open flag `supervisor_lost_privilege`, in the same transaction. Lifting the suspension of the supervisor's grant or SPK sets `resolved_at` on those flags. There is no manual resolve route: the committee resolves a flag by revoking the grant, or by the supervisor's privilege coming back. The alert to the chair, the practitioner and the Head of Unit needs the worker and is not sent here (AP17 and plan decision D5). | As stated. |
| SP12 | **Reads.** `expiringInDays` keeps SPKs whose end is within that many days from today (UTC) and that are `active` or `suspended`. Nothing sets `expired` yet (a worker job), so a list by status `active` can hold an SPK past its end: every consumer must read `valid_period.end` too, like the licences. The grants of `GET /clinical-appointments/:id` are all its grants, whatever their status. A malformed, missing or foreign id answers 404 `appointment_not_found` or `grant_not_found`; the nested route answers 404 `employee_not_found` for an employee of another tenant. | As stated. |
| SP13 | **Permissions.** The two read permissions are tenant-wide (no unit or own-record scoping until scoped permissions exist; an own-SPK route for the practitioner is a later `me` group). One permission, `workforce.credential:decide`, covers every decision of the Director. The committee's recommendation to suspend (7.4.5 step 1) is not modelled; the decision number identifies the document. | As stated. |
| SP14 | **Reasons in responses.** The change log masks suspension and revocation reasons (they are `confidential`, classification files exist). The read routes return the decision as stored, reason included, to holders of the read permissions, who are HR; the operational logs never carry it. | As stated. |
| SP15 | **No events, no notifications.** Issue, suspend, lift, revoke and the flag emit no event and send nothing (4.2 AP17, plan decision D5). Eligibility, the roster conflict check (8.5.4) and the alerts of 7.6 are built later and will read these records. | None now. |
| SP16 | **Expiry and renewal alerts.** Nothing sets `expired` and nothing alerts `RECREDENTIAL_LEAD_DAYS` before the end. They need the worker. | Not built. |
| SP17 | **Concurrency and races.** Updates carry an optional `version`; a stale version answers 409 `stale_version`. The unique indexes (number, one current SPK, one grant per SPK and privilege) are the final guard for two simultaneous approvals; the services read first so the usual answer is a 409 with a code, and the index error maps to the same code. | As stated. |
| SP18 | **Tenant and ids.** `tenant_id` always from `@CurrentUser()`; a foreign, missing or malformed id gives the same 404; in a body it gives 422. Nothing is deleted. | As stated. |

## 3. Repositories

- `ClinicalAppointmentRepository` (`clinical_appointments`), part A: `findByNumber(tenantId, number)`, `findCurrentRegular(tenantId, employeeId, facilityId)`, and in part B `findByFilter(tenantId, query)` and `findByEmployee(tenantId, employeeId)`. Indexes from the design: `{ tenant_id, appointment_number }` unique; `{ tenant_id, employee_id, credentialing_facility_id, is_temporary }` unique, partial on `is_current: true` and `is_temporary: false`; `{ tenant_id, unit_ids, status }`; `{ tenant_id, employee_id, status }`; `{ tenant_id, status, 'valid_period.end' }`. Updatable fields: `status`, `is_current`, `suspension`, `revocation`, `superseded_by_id` (set by 4.4). The applicant, facility, units, number, period and source application never change.
- `PrivilegeGrantRepository` (`privilege_grants`), part A: `findByAppointment(tenantId, appointmentId)` and `findActiveFullGrant(tenantId, catalogItemId, employeeId, facilityId)` (for SP8); part B: `findByFilter`; part C: `findBySupervisorGrant(tenantId, grantId)`. Indexes from the design: `{ tenant_id, employee_id, status }`, `{ tenant_id, catalog_item_id, status }`, `{ tenant_id, 'supervisor.grant_id' }`, plus a unique `{ tenant_id, appointment_id, catalog_item_id }` (one grant per privilege of an SPK). Updatable fields: `status`, `status_change`, `flag`.
- Names of reads start with `find`; writes are recorded in the change history by the repository (`database.md` 6.1). Each part adds the in-memory fakes with the same unique rules.

## 4. Code structure

```
apps/back-end/apps/
├── repository/{token.ts, interface/clinical-appointment.ts, interface/privilege-grant.ts}
├── repository/mongo/{clinical-appointment, privilege-grant}.ts, .module.ts, schema/ (+ specs)
├── workforce/credentialing/decision.service.ts        approve and reject (part A)
├── workforce/appointment/{appointment.service.ts, grant.service.ts, appointment-rules.ts} (+ specs)
├── workforce/testing/in-memory.ts                     the two fakes
├── identity/permission.ts                             workforce.clinical-appointment:read, workforce.privilege-grant:read, workforce.credential:decide
└── gateway_hr/src/appointment/                        controllers, DTOs, module, gateway tests
```

The decision route stays under `gateway_hr/src/credentialing/` (it is a route of `/credential-applications/:id`). `gateway_hr/src/testing/in-memory-workforce.ts` registers the repositories.

## 5. Tasks and pull requests

| PR | Kind | Content |
|---|---|---|
| A | Docs | This plan, the master plan row and the endpoint list (branch `docs/workforce-spk-plan`). |
| B1 | Code | Part A: the two repositories, the Director's decision (approve with SPK and grants, reject), the permission `workforce.credential:decide` (branch `feat/workforce-spk-decision`). |
| B2 | Code | Part B: the four reads and their permissions (branch `feat/workforce-spk-reads`). |
| B3 | Code | Part C: suspend, lift and revoke for SPKs and grants, with the supervisor flags (branch `feat/workforce-spk-status`). |
| C | Docs | After each code PR a small "build in progress" or "built" docs PR for the master plan row; after B3, `workforce.md`, `hr-endpoints.md` and this plan's status. |

Tests come first in each task: repository (indexes, tenant isolation, no `_id`, one change record per write, unique rules), service (every rejection above, tenant isolation, stale version, the status tables, the licence and supervisor checks, the transaction, reads write no log, writes log no values) and gateway (401, 403, 404, 409, 422, validation, list limits). Checks: `tsc`, `oxlint`, full `vitest` and `nest build gateway_hr`, run from `apps/back-end` under Node 22 (`pnpm` does not start on this machine).

## 6. Review focus

1. An SPK and its grants are created together or not at all, only from a `recommended` application, and never with more than the committee recommended.
2. The licence check (HR-CRD-002) reads dates, not only status, for every facility of the SPK.
3. A `supervised` grant always points to a supervisor's `full` active grant, and losing that grant raises the flag.
4. Status changes follow the tables of SP9 and SP10; revoking an SPK revokes its grants; every change records who, when and why.
5. Only holders of `workforce.credential:decide` decide, and never for their own application.
6. Logs carry no reasons or decision contents; the change log masks the confidential reasons.

## 7. Decisions that needed your answer

Confirmed as proposed: all of SP1 to SP18. These five changed the shape of the work most:

- **SP1** (one permission for the Director's decisions, the decider's own employee is recorded; delegation is whoever holds the permission).
- **SP3** (renewal types and supersession become a follow-up group 4.4, not part of 4.3).
- **SP9** (the effective date of a suspension or revocation is today, not sent in the body).
- **SP10** (add `lift-suspension` for grants, making it 11 endpoints).
- **SP11** (supervisor flags are set and resolved automatically; no resolve route, no alert yet).

The others are as stated.
