# gateway_hr 6: Clinical eligibility

Status: **Proposed** (2026-11-17). Decisions CE1 to CE13 wait for your confirmation; the four that need an answer are CE2, CE3, CE5 and CE7. Part of `2026-11-10-gateway-hr-plan.md` (walkthrough order 25). Endpoint: `../hr-endpoints.md` section 6. Business rules: `../../business/administrative-operational-system/human-resource-management.md` section 5.5 (`HR-ELG-001`, `HR-ELG-002`), `HR-LIC-001`, `HR-CRD-001`, `HR-CRD-003`, `HR-CRD-006`, and the clinical-module question of section 13 and `HR-INT-001`/`002`. Built references: `EligibilityService.general` (`apps/workforce/eligibility/`, conditions 1 to 4, used by rostering and practice schedules), SPKs and grants (3g, 3h), licences (3c).

Clinical eligibility is **derived**, never stored: a clinical employee may perform a privilege in a unit on a date when (1) the employment status is `probation` or `active`, (2) the STR of their profession is valid, (3) a SIP at the unit's facility is valid, (4) an active SPK covers the unit and (5) the privilege is granted in an active grant of that SPK. Groups 1 to 5 already use conditions 1 to 4 inside rostering. This group exposes the whole rule as one read for clinical modules, HR and committees, and adds condition 5.

## 1. The endpoint

| Endpoint | Behaviour |
|---|---|
| `GET /v1/employees/:id/eligibility` | Query `unitId` (required), `date` (`YYYY-MM-DD`, default today in the unit's facility zone), `privilegeId` (optional catalog item). Answers whether the employee is eligible and, if not, which condition failed. |

One new permission, `workforce.eligibility:read`, tenant-wide. The service account of the clinical modules holds it. There is no own-record route (CE12).

## 2. The rules

| # | Rule or decision | Proposed |
|---|---|---|
| CE1 | **Scope.** The one endpoint of `hr-endpoints.md`, nothing else. A read: no log entry, no change record, no events. | As stated. |
| CE2 | **Inputs.** `unitId` is required because conditions 3 and 4 depend on the unit. `date` defaults to today in the facility's zone (`todayInZone`); any real date is answered, a past one too (a history question) and a future one (a planning question). `privilegeId` is the catalog item id, as in the other HR routes; without it conditions 1 to 4 are checked (general eligibility) and the answer says `privilege: null`. A clinical module that only knows the catalog code can read it from the privilege catalog first. | **Needs your answer:** `privilegeId` (as stated) or the catalog `code`? |
| CE3 | **The answer.** `{ employeeId, unitId, date, eligible, failed, checks, privilege }`. `failed` is the **first** failing condition in the order `employment`, `str`, `sip`, `spk`, `privilege` (`HR-ELG-002`), or `null`. `checks` lists **every** condition evaluated with `met` true or false, so a user sees all causes in one call, not one per fix. Conditions after a failed one are still evaluated, except that `privilege` is `met: false` when the SPK condition failed. `privilege` is `null` without `privilegeId`, otherwise `{ catalogItemId, code, condition, supervisorEmployeeId, flagged }` of the grant that satisfied condition 5 (`condition` is `full`, `supervised` or `restricted`), or `null` when none did. No names, numbers or notes are returned. | **Needs your answer:** all five checks listed (as stated) or only the first failure? |
| CE4 | **Condition 5.** The privilege is granted when the employee has a grant of that catalog item with status `active`, in an SPK that is `active`, whose validity covers the date and whose units include the unit (grant `unit_ids`). A `suspended`, `revoked` or `superseded` grant, or a grant of a suspended SPK, does not count (`HR-CRD-001`). A grant of a retired privilege still counts: retiring only stops new requests (3e). The check uses the grant's own `unit_ids`, which are copied from the SPK. | As stated. |
| CE5 | **A flagged supervised grant.** A `supervised` grant whose supervisor lost the privilege (`HR-CRD-006`, open flag `supervisor_lost_privilege`) is still an active grant, so the employee is eligible, but the answer carries `flagged: true` and the supervisor's employee id so the module can decide. The business rule says the committee must act on a flag; it does not say the practitioner is blocked, and nothing in 3g/3h does so. | **Needs your answer:** eligible with `flagged: true` (as stated), or treat an open flag as not eligible? |
| CE6 | **Who is checked.** The employee must exist in the tenant (404 `employee_not_found` for a missing, malformed or foreign id). A non-clinical employee has no clinical eligibility: 422 `not_clinical_employee`, decided with the same test rostering uses (confirmed in B1 from `assertAssignable`). The unit must exist in the tenant (422 `unit_not_found`); a **closed** unit is answered, because a history question about it is legitimate (rostering refuses to assign into it, this read does not). A missing privilege (`privilegeId` unknown, foreign or malformed) answers 422 `privilege_not_found`; a retired one is answered (CE4). | As stated. |
| CE7 | **Date and the employment status.** Licences, SPKs and grants are read **on the date**, so a licence expiring before it, or an SPK that has not started, fails. The employment status is the **current** one: the employee model keeps no status history, so a date in the past or the future reads the present status. The answer says so by stating `employmentAsOf: 'current'` and the HR document and the 3p-style rule note record it. A separated employee fails `employment` for every date. | **Needs your answer:** accept the limit (as stated), or hold the route until a status history exists? |
| CE8 | **No caching (`HR-ELG-001`).** Every call reads the records; the response carries `Cache-Control: no-store`. Nothing is stored. | As stated. |
| CE9 | **One rule, one implementation.** `EligibilityService.general` keeps its signature and result for rostering and practice schedules. A new `EligibilityService.full(tenantId, employee, unit, date, privilege?)` evaluates all conditions without stopping and returns the list; `general` is rewritten on top of it so there is one place for the rule. The existing eligibility specs keep passing unchanged. | As stated. |
| CE10 | **Tenant and ids.** `tenant_id` from `@CurrentUser()`; the employee, unit and privilege come from the path and the query, never from the token. A foreign record answers as a missing one. | As stated. |
| CE11 | **Unavailable means not eligible (`HR-INT-002`).** The consumer's side of the rule is not code here. This service answers or fails with a 5xx; it never answers `eligible: true` when a repository fails (the error propagates). Emergency care when HRM is down is open question Q10 and not decided here. | As stated. |
| CE12 | **Not built here.** An own-record route for the practitioner, a list of eligible practitioners in a unit or for a privilege (needs a different read model), bulk checks of many employees, leave and training as a condition (`HR-ROS-030`, the leave module), the flag and notification when eligibility changes (`HR-ROS-030`/`031`, the worker group), and events. | As stated. |
| CE13 | **Scoped permissions.** `workforce.eligibility:read` is tenant-wide: any holder can check any employee until scoped permissions exist. The answer holds no personal data beyond ids, codes and dates. | As stated. |

## 3. Code

No new collection, repository or model: it reads the employee, unit, licence, SPK and grant repositories that exist. Reads are named `find*` already.

- `EligibilityService.full` and the `EligibilityCheck` type in `apps/workforce/eligibility/eligibility.service.ts` (CE9), with the grant lookup through `PrivilegeGrantRepository` (a named read by employee, catalog item and status if the existing ones do not serve; to be checked in B1) and `appointment-rules.ts` for the validity on a date.
- `EligibilityQueryService` (`apps/workforce/eligibility/eligibility-query.service.ts`): loads the employee, unit and privilege, applies CE6, and calls `full`. Rules in `eligibility-rules.ts` if any pure function is needed.
- `WORKFORCE_ELIGIBILITY_READ` in `identity/permission.ts`.
- `gateway_hr/src/eligibility/`: controller, query DTO, module, and the gateway test.

```
apps/back-end/apps/
├── workforce/eligibility/{eligibility.service.ts, eligibility-query.service.ts}   (+ specs)
├── identity/permission.ts                                  workforce.eligibility:read
└── gateway_hr/src/eligibility/                             the one route
```

## 4. Tasks and pull requests

| PR | Kind | Content |
|---|---|---|
| A | Docs | This plan, the master plan row and the endpoint note (branch `docs/workforce-hr-clinical-eligibility-plan`). |
| B | Code | `EligibilityService.full`, the query service, the permission, the route and the tests. One PR: no new repository, so it stays small. |
| C | Docs | The "built" docs PR (`workforce.md` section 3q and the permission row, `hr-endpoints.md`, this plan's status and build notes, the master plan counts). |

Tests come first: each condition failing alone, all five failing together (`checks`), the order of `failed`, conditions 1 to 4 on the date (a licence that expires the day before and the day after, an SPK that has not started or has ended, a suspended SPK, a unit not covered, a SIP of another facility), condition 5 (an active grant, a suspended, revoked and superseded grant, a grant of another privilege, a grant that does not cover the unit, a retired privilege, a supervised grant with an open flag), a non-clinical employee, a closed unit, an unknown, foreign and malformed id for each of employee, unit and privilege, the default date in the facility's zone, a repository failure never answering eligible, `Cache-Control: no-store`, the existing `general` callers unchanged, reads write only the access log, and the gateway (401, 403, 404, 422, 400, a full happy path over HTTP). Checks: `tsc`, `oxlint`, the full `vitest` and `nest build gateway_hr`, run from `apps/back-end` under Node 22 (`pnpm` does not start on this machine).

## 5. Review focus

1. The rule is evaluated in one place, so rostering, practice schedules and the clinical modules cannot disagree.
2. A practitioner is never reported eligible when any condition fails, and the answer names every failing condition.
3. Dates are read in the unit's zone and the records are read on the date, never cached.
4. No personal data in the answer or in any log entry.

## 6. Decisions that need your answer

- **CE2:** the privilege is selected by `privilegeId` (catalog item id) or by catalog `code`.
- **CE3:** the answer lists all five checks, plus `failed` as the first one; or only the first failure.
- **CE5:** a supervised grant with an open supervisor flag stays eligible and is marked `flagged`; or it blocks.
- **CE7:** the employment status is the current one for any date (the model keeps no history); or the route waits for a history.

The others are as stated. Open, not decided here: who may check whom once scoped permissions exist, and Q10 (emergency care when HRM is unavailable).
