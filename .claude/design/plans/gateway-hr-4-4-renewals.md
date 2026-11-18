# gateway_hr 4.4: Renewals (re-credentialing and privilege extension)

Status: **Built** (2026-11-16, PR #68 and #70 merged). Decisions RN1 to RN16 and the split in two code PRs confirmed as proposed, with the notes in section 8. Follow-up of `gateway-hr-4-2-credential-applications.md` (AP3) and `gateway-hr-4-3-spk-and-granted-privileges.md` (SP3); part of `2026-11-10-gateway-hr-plan.md` (walkthrough order 16a). Collections: `../human-resource-collections.md` 4.3 (`previous_appointment_id`), 4.5 (`superseded_by_id`, status `superseded`) and 4.6 (`privilege_grants`). Business rules: `../../business/administrative-operational-system/human-resource-management.md` 7.4.2 (re-credentialing), 7.4.3 (privilege extension) and 7.3 (SPK status `superseded`). Rules every endpoint follows: `../../rules/back-end/workforce.md` 3, 3f and 3g.

Until now a practitioner holds one SPK from an `initial` application. 4.2 refuses the types `recredentialing` and `privilege_extension` (422 `type_not_supported`), and 4.3 refuses a second current regular SPK at a facility (409 `appointment_exists`). So a practitioner who gains a new competence, or whose SPK nears its end, cannot be served. This group closes that: it accepts the two types and, on approval, issues the new SPK, ends the old one as `superseded`, and carries the privileges over.

It adds **no new routes**. It changes two: `POST /v1/credential-applications` (accepts the two types and `previousAppointmentId`) and `POST /v1/credential-applications/:id/decision` (approval supersedes the old SPK). It is built in two code PRs.

## 1. What changes

| Part | Route | Change |
|---|---|---|
| A | `POST /v1/credential-applications` | Accepts `type` `recredentialing` and `privilege_extension`, with `previousAppointmentId`. `PATCH` rechecks the same rules. The responses carry `previous_appointment_id`. |
| B | `POST /v1/credential-applications/:id/decision` | Approving a renewal issues the new SPK, supersedes the old SPK and its grants, and carries privileges over, in one transaction. Rejecting works as before. |

Permissions: none new (`workforce.credential-application:write` and `workforce.credential:decide`).

## 2. Rules and decisions to confirm

| # | Rule or decision | Proposed |
|---|---|---|
| RN1 | **Scope.** No new routes. Part A (applications) and part B (approval and supersession) are two code PRs. Between them nothing breaks: approving a renewal before part B answers 409 `appointment_exists`, as today. The renewal alerts (`RECREDENTIAL_LEAD_DAYS`), the performance evaluation (OPPE) and incident input of 7.4.2 and the job that expires SPKs need the worker and other groups and are not built here. | As stated. |
| RN2 | **Creating a renewal.** `previousAppointmentId` is required for `recredentialing` and `privilege_extension` (422 `previous_appointment_required`) and refused for `initial` and `temporary` (422 `previous_appointment_not_allowed`). The SPK must be an SPK of the applicant, at the application's credentialing facility, regular (not temporary) and `active` (422 `previous_appointment_not_found`, `previous_appointment_mismatch`, `previous_appointment_not_regular`, `previous_appointment_not_active`). A suspended SPK cannot be renewed: the Director lifts the suspension first. There is at most one open renewal application per SPK (409 `renewal_exists`; "open" means not `approved`, `rejected` or `withdrawn`). A foreign or malformed identifier gives 422 `previous_appointment_not_found`, so nothing leaks across tenants. | As stated. |
| RN3 | **Privilege extension content.** The application asks for the additional privileges only (7.4.3). Each must not already be held: an `active` or `suspended` grant of the same privilege in the old SPK answers 422 `privilege_already_granted`. The requested units are added to the units the old SPK covers (the new SPK covers the union). The rest of the content rules of 4.2 (AP5 to AP8) apply unchanged. | As stated. |
| RN4 | **Re-credentialing content.** The application asks for everything the practitioner should keep (7.4.2). A privilege of the old SPK that is not re-requested, or not recommended, ends with the old SPK and is not granted again. Requesting a privilege the practitioner already holds is allowed. | As stated. |
| RN5 | **Edit and process.** `previous_appointment_id` and the type are fixed (AP18). Editing rechecks RN2 and RN3 against the current state. Assessment, the committee and the recommendation work as for an `initial` application; nothing in 4.2 changes there. The committee considers the OPPE of 7.4.2 outside the system until group 9. | As stated. |
| RN6 | **Approval prerequisites.** On top of SP1 to SP8: the old SPK must still be `active` (422 `previous_appointment_not_active`), and still belong to the applicant at that facility. A privilege extension is refused when the old SPK's last valid day is before the issue date (422 `appointment_lapsed`, because the new SPK keeps that end); a re-credentialing may be approved after the old end, the old SPK being superseded then. | As stated. |
| RN7 | **The new SPK.** A new letter number (SP2). Regular, `active`, current. A re-credentialing is valid from the issue date for at most `SPK_VALIDITY_YEARS` years (SP6; `validUntil` may be earlier). A privilege extension has the same last valid day as the old SPK (7.4.3) and refuses `validUntil` (422 `valid_until_not_allowed`). Its facilities are derived from its units, and the licences are checked for every facility of the new SPK (HR-CRD-002). | As stated. |
| RN8 | **Grants of the new SPK.** A re-credentialing has one grant per recommended privilege. A privilege extension has the old SPK's `active` and `suspended` grants carried over, plus one grant per recommended additional privilege. A carried grant is a new record with the same privilege, condition, supervisor and restriction notes, and, if it was suspended, the same status and decision (a Director's suspension is not lifted by a renewal). Revoked grants stay with the old SPK. | As stated. |
| RN9 | **The old records.** The old SPK becomes `superseded`, not current, with `superseded_by_id`. Its grants that are not revoked become **`superseded`**, a new final grant status (model, storage enum and filters), so the privilege directory, which lists active grants by default, never shows a practitioner's privilege twice. `status=superseded` and `status=all` show them. | New grant status. |
| RN10 | **Order in the transaction.** Mark the old SPK not current first (this frees the one-current-SPK index), create the new SPK and its grants, supersede the old grants, re-point the supervisor links (RN11), then update the application, all in one transaction. A second approval of the same application is refused because it is no longer `recommended`; two renewals racing for one SPK are caught by the index and by RN6. | As stated. |
| RN11 | **Supervision links (HR-CRD-006).** Supervised grants of other practitioners that name one of the old SPK's `full` grants as their supervisor's grant are re-pointed to the new `full` grant of the same privilege. If the new SPK has none (a re-credentialing that dropped the privilege or lowered it), they get the open flag `supervisor_lost_privilege`, as in 4.3 SP11. Carried supervised grants keep their own supervisor link. For this the field `supervisor` of a grant becomes updatable, for this use only. | As stated. |
| RN12 | **Supervisors of new grants.** A new `supervised` grant needs its supervisor's `active` `full` grant (SP8), unchanged. | As stated. |
| RN13 | **Flags and decisions already on the old SPK.** A suspension of the old SPK is not possible at approval (RN6). Open flags on carried supervised grants stay as they are. The status decisions of 4.3 (suspend, lift, revoke) refuse `superseded` SPKs and grants (422 `invalid_transition`); the supervisor flag logic ignores `superseded` grants as it does `revoked` ones. | As stated. |
| RN14 | **Responses and logs.** The decision response keeps its shape (`application`, `appointment`, `grants`); `appointment` is the new SPK. The old SPK is read through `GET /v1/clinical-appointments/:id` (status `superseded`, `superseded_by_id`) or the practitioner's list. The log entries are the existing `application_create`, `application_update` and `application_decide`, with no new values. No events or notifications (4.2 AP17, 4.3 SP15). | As stated. |
| RN15 | **Repositories.** `CredentialApplicationRepository.findOpenRenewal(tenantId, previousAppointmentId)` with the index `{ tenant_id, previous_appointment_id }`; `PrivilegeGrant.status` gains `superseded`; `supervisor` joins the updatable fields of grants. `ClinicalAppointment` already has `superseded` and `superseded_by_id`. | As stated. |
| RN16 | **Tenant and ids.** `tenant_id` always from `@CurrentUser()`; a foreign, missing or malformed id gives the same answer; nothing is deleted. | As stated. |

## 3. Code structure

```
apps/back-end/apps/
├── repository/{interface/credential-application.ts, mongo/credential-application.ts, mongo/schema/credential-application.ts}   findOpenRenewal, index (part A)
├── repository/{model/privilege-grant.ts, mongo/schema/privilege-grant.ts, mongo/privilege-grant.ts}                            status superseded, updatable supervisor (part B)
├── workforce/credentialing/{application.service.ts, application-rules.ts}      the two types and the checks of RN2 to RN5 (part A)
├── workforce/credentialing/decision.service.ts                                 approval with supersession, RN6 to RN13 (part B)
├── workforce/appointment/status.service.ts                                     superseded is final (part B)
├── workforce/testing/in-memory.ts                                              the same rules in the fakes
└── gateway_hr/src/credentialing/                                               DTO field previousAppointmentId, status filter value (parts A and B)
```

## 4. Tasks and pull requests

| PR | Kind | Content |
|---|---|---|
| A | Docs | This plan, the master plan row and the endpoint note (branch `docs/workforce-renewals-plan`). |
| B1 | Code | Part A: the two types, `previousAppointmentId`, the checks of RN2 to RN5, `findOpenRenewal` (branch `feat/workforce-renewal-applications`). |
| B2 | Code | Part B: approval with supersession, the `superseded` grant status, supervisor re-pointing, the status service change (branch `feat/workforce-renewal-approval`). |
| C | Docs | After each code PR a small "build in progress" or "built" docs PR for the master plan row; after B2, `workforce.md`, `hr-endpoints.md` and this plan's status. |

Tests come first in each task: repository (indexes, tenant isolation, no `_id`), service (every rejection above, tenant isolation, stale version, one transaction's results, reads write no log, writes log no values) and gateway (401, 403, 404, 409, 422, validation). Checks: `tsc`, `oxlint`, full `vitest` and `nest build gateway_hr`, run from `apps/back-end` under Node 22 (`pnpm` does not start on this machine).

## 5. Review focus

1. A renewal always names the applicant's own active regular SPK at that facility, and only one renewal is open per SPK.
2. Approval ends the old SPK and grants and issues the new ones together or not at all; a practitioner never holds a privilege twice in the directory.
3. A privilege extension never lifts a Director's suspension and never lengthens the SPK's validity.
4. Supervised grants keep a supervisor whose grant is `full` and active, or get the open flag.
5. Logs and responses carry no new reasons, numbers or letters.

## 6. Not built

Alerts `RECREDENTIAL_LEAD_DAYS` before an SPK ends, the OPPE, incident and complaint input of 7.4.2, the job that sets `expired`, notifications, and renewal of a temporary SPK (a temporary SPK is not renewed; a new application is made).

## 7. Decisions that needed your answer

Confirmed as proposed: all of RN1 to RN16. These four changed the shape of the work most:

- **RN2** (one open renewal per SPK; a suspended SPK cannot be renewed until the Director lifts the suspension).
- **RN8 and RN9** (an extension carries the old grants over as new records and the old grants get a new final status `superseded`, so the directory shows each privilege once).
- **RN7** (an extension keeps the old SPK's last valid day and refuses `validUntil`).
- **RN11** (supervised grants of others are re-pointed to the new full grant, or flagged when there is none).

The others are as stated.

## 8. Notes from the build

What the code does where the plan left room, or where it differs:

- **Part 1 (PR #68).** The shape checks (`previous_appointment_required`, `previous_appointment_not_allowed`) run before the applicant is loaded; the SPK checks and the held-privilege check run after the content checks. `previous_appointment_not_regular` answers at creation, while at approval a temporary or non-active old SPK answers `previous_appointment_not_active`. The open-renewal check ignores the application being edited. A foreign, missing or malformed SPK identifier gives 422 `previous_appointment_not_found`, and a malformed one in the request body gives 400.
- **Part 2 (PR #70).** The old SPK is updated twice in the transaction: first to `superseded` and not current (with the version check, so a stale SPK answers 409 `previous_appointment_changed`), then `superseded_by_id` once the new SPK exists, because the identifier is not known earlier. A carried grant copies the old record's condition, supervisor, notes, status, decision and flag. A recommended privilege that an extension already holds answers 422 `privilege_already_granted` again at approval, in case the SPK changed since creation. The supervisor re-pointing and the supervisor flag helpers live in `workforce/appointment/supervisor-links.ts` and are shared with the status service; a superseded or revoked supervised grant is never re-pointed or flagged. `supervisor` is the only extra updatable field of a grant.
- **Directory.** `GET /v1/privilege-grants` accepts `status=superseded`; the default stays `active`.
- **Not built.** The alerts `RECREDENTIAL_LEAD_DAYS`, the OPPE and incident input of 7.4.2, the expiry job, notifications and renewal of a temporary SPK.
