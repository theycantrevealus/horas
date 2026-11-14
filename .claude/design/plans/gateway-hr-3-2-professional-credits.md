# gateway_hr 3.2: Professional credits

Status: **Built** (2026-11-14, PR #42 and #43 merged). Decisions CR1 to CR15 and the two-PR split confirmed as proposed, with the additions in section 8. Part of `2026-11-10-gateway-hr-plan.md` (walkthrough order 13). Endpoints: `../hr-endpoints.md` 3.2. Collections: `../human-resource-collections.md` 3.4 (`cpd_records`) and 3.5 (`cpd_summaries`). Business rules: `../../business/administrative-operational-system/human-resource-management.md` (SKP record, `HR-LIC-010`, parameter `SKP_REQUIRED_POINTS`). Models: `apps/back-end/apps/repository/model/cpd-record.ts` and `cpd-summary.ts` (exist, with their classifications). Rules every endpoint follows: `../../rules/back-end/workforce.md` 3. Built references: licences (3.1: file references, self-service `me` route, one-account-submits-another-reviews rule), employees (2.1), code concepts (1.3).

Professional credits are the continuing-education points a clinical employee earns: SKP in Indonesia, CME or CPD elsewhere. Renewing a SIP needs enough of them. HR (or the employee) records the activities, someone reviews them, and where a national platform is the source of truth HR keeps only its latest total. This group records and reviews credits and keeps the totals. It does not send the shortfall alert of `HR-LIC-010`; that needs the worker and notifications.

## 1. The six endpoints

| Endpoint | Behaviour |
|---|---|
| `GET /v1/employees/:id/cpd-records` | Lists the employee's credit records, newest activity date first. Query: optional `creditSystem` (a code), `status`, `limit`, `offset`. Writes no log entry. 404 `employee_not_found`. |
| `POST /v1/cpd-records` | HR records earned credits for an employee. Body: `employeeId`, `creditSystem` (`Coding`), `activity` (`title`, `category` as a `Coding`, optional `provider`), `activityDate`, `points`, optional `evidence` (file reference), optional `reason`. Created `accepted`. |
| `POST /v1/employees/me/cpd-records` | Self-service: the same body without `employeeId`; the employee is the one linked to the signed-in account. Needs sign-in only. Created `submitted`, evidence required. |
| `POST /v1/cpd-records/:id/review` | Accepts or rejects a record. Body: `outcome` (`accept` or `reject`), `reason` (required for a rejection), optional `version`. |
| `GET /v1/employees/:id/cpd-summaries` | Lists the employee's stored credit totals, one per credit system, each with `accepted_points`: the sum of the employee's accepted records inside the total's cycle, so HR can compare it with the platform's number. Writes no log entry. |
| `PUT /v1/employees/:id/cpd-summaries/:system` | Records the total read from a national platform. Body: `creditSystem` (`Coding`), `cycle` (`start`, `end`), `totalPoints`, optional `checkedAt`. Creates the summary or replaces it. |

Permissions (new): `workforce.cpd:read` (the two lists), `workforce.cpd:write` (record credits and set a total), `workforce.cpd:review` (review). The self-service route needs sign-in only.

## 2. Rules and decisions to confirm

| # | Rule or decision | Proposed |
|---|---|---|
| CR1 | **Employee.** Must exist in the tenant and not be `separated` (422 `employee_not_found`, `employee_separated`). The employee and the credit system are fixed after creation. | As stated. |
| CR2 | **Credit system and category.** `creditSystem` is a `Coding` of a `credit-system` code system (`id.credit-system`, code `skp`) and `activity.category` a `Coding` of a `cpd-category` system (`id.cpd-category`: `learning`, `service`, `community_service`, `publication`, `development`, the SKP groups). Both active (`assertActive`). Neither list is copied into the code. | As stated. |
| CR3 | **Two new code systems in the `id` bundle** (as 3.1 added two): `id.credit-system` (`skp`) and `id.cpd-category`. Other countries add their own (`us.credit-system`, ...). The starter values are to be confirmed with HR before go-live. | As stated. |
| CR4 | **Activity.** `title` 1 to 200 characters, `provider` up to 200 or none. `activityDate` is a local date from 1950-01-01 to tomorrow (UTC, as in contracts): credits are not earned in the future. | As stated. |
| CR5 | **Points.** Above 0, at most 500 per record, at most two decimals (`12.5` is fine). The limit of 500 is a guess to catch typing mistakes, not a rule of the regulation (verify). | As stated. |
| CR6 | **Evidence.** A file reference only, as for licence scans (`file_id`, content type PDF, JPEG or PNG, SHA-256; the file is not checked). Optional when HR records credits, required for self-service (422 `evidence_required`). The validation is reused from the licence rules. | As stated. |
| CR7 | **Status on creation.** HR entry is `accepted` at once: HR is the reviewer. Self-service is `submitted`. `source` is `manual` for both; `training_record` and `external_platform` arrive with the training and import groups. | As stated. |
| CR8 | **Review.** `submitted` becomes `accepted` or `rejected`, and `accepted` may later become `rejected` (a wrong HR entry has no other way out, because nothing is edited or deleted). `rejected` is final. The reviewer must not be the holder of the record (403 `reviewer_is_holder`, compared through the account's `employee_id`). A rejection needs a `reason` (1 to 500 characters, 422 `reason_required`); the reason, the reviewer and the time are in the change history, because the model has no review fields and `database.md` 4.5 forbids `updated_by`. | As stated. |
| CR9 | **The credit system in the summary path.** The endpoint list has `PUT .../cpd-summaries/:system`. The credit system is a `Coding` (system and code), so the body carries `creditSystem` and the service requires the path `:system` to equal its code (422 `credit_system_mismatch`). The alternative is to drop the path parameter and use `PUT /employees/:id/cpd-summaries`; this changes the endpoint list. | Keep the path, check it. |
| CR10 | **Summary fields.** `profession` is copied from the employee (422 `profession_required` when the employee has none), not sent. `cycle` is a closed period (start and end both required, end not before start), usually the SIP's validity. `totalPoints` is at least 0, at most two decimals. `checkedAt` defaults to now and may not be in the future. `source` is `external_platform` for this route. The summary is unique per tenant, employee and credit system; a second `PUT` replaces the first. | As stated. |
| CR11 | **`accepted_points` in the list.** The list returns each summary plus the sum of accepted records of that credit system whose `activityDate` lies in the cycle. It is computed on read and not stored. No total is computed for a credit system that has records but no stored summary. A stored `computed` source is not written by this group. | As stated. |
| CR12 | **Parameters and alerts.** `SKP_REQUIRED_POINTS` exists in the catalog (no default yet). This group does not read it and sends no alert: the shortfall message (`HR-LIC-010`) belongs to the worker and notifications. | Later. |
| CR13 | **No edit, no delete.** A wrong record is rejected (CR8). There is no `PATCH`. A summary is replaced by a new `PUT`, and the old values stay in the change history. | As stated. |
| CR14 | **Events.** None. | None now. |
| CR15 | **Tenant and ids.** `tenant_id` always from `@CurrentUser()`; a foreign, missing or malformed id gives the same 404 (`cpd_record_not_found`, `employee_not_found`); in a body it gives 422. | As stated. |

## 3. Repositories

Two new repositories, each with a token, an interface, a pinned collection, a Mongo implementation on `MongoRepositoryBase`, a module and an in-memory fake with the same unique rules:

- `CpdRecordRepository` (`cpd_records`): `findByEmployee(tenantId, employeeId, query)` and `findAcceptedInCycle(tenantId, employeeId, creditSystem, from, to)`, both `find*`. Updatable fields: `status`. Index `{ tenant_id, employee_id, credit_system.code, activity_date }`.
- `CpdSummaryRepository` (`cpd_summaries`): `findByEmployee` and `findByEmployeeAndSystem`. Updatable fields: `profession`, `cycle`, `total_points`, `checked_at`. Unique index `{ tenant_id, employee_id, credit_system.system, credit_system.code }`.

## 4. Code structure

```
apps/back-end/apps/
├── repository/{token.ts, interface/cpd-record.ts, interface/cpd-summary.ts}
├── repository/mongo/{cpd-record, cpd-summary}.ts, .module.ts, schema/ (+ specs)
├── workforce/credit/{cpd.service.ts, cpd-rules.ts} (+ spec)
├── workforce/concept/bundle-id.ts        id.credit-system, id.cpd-category (CR3)
├── workforce/testing/in-memory.ts        the two fakes
├── identity/permission.ts                workforce.cpd:read, :write, :review
└── gateway_hr/src/credit/                controllers, DTOs, module, gateway test
```

`gateway_hr/src/testing/in-memory-workforce.ts` registers the repositories.

## 5. Tasks and pull requests

| PR | Kind | Content |
|---|---|---|
| A | Docs | This plan (branch `docs/workforce-credits-plan`). |
| B1 | Code | Records: `cpd_records` repository, the two code systems, `POST /cpd-records`, `POST /employees/me/cpd-records`, `GET /employees/:id/cpd-records`, `POST /cpd-records/:id/review` (branch `feat/workforce-credits`). |
| B2 | Code | Summaries: `cpd_summaries` repository, `GET` and `PUT /employees/:id/cpd-summaries` (branch `feat/workforce-credit-summaries`). |
| C | Docs | After B2 merges: `workforce.md`, `hr-endpoints.md`, the master plan walkthrough and this plan's status. |

Tests come first in each task: repository (unique rules, tenant isolation, no `_id`, one change record per write), service (every rejection above, tenant isolation, stale version, the reviewer rule, reads write no log, writes log no values) and gateway (401, 403, 404, 409, validation, list limits). Checks: `tsc`, `oxlint`, full `vitest` and `nest build gateway_hr`, run from `apps/back-end` under Node 22 (`pnpm` does not start on this machine).

## 6. Review focus

1. Only a different employee than the holder reviews a record, and a rejection always carries a reason in the change history.
2. Nothing is edited or deleted; a wrong accepted record is rejected, a wrong total is replaced.
3. `accepted_points` counts only accepted records of the right credit system inside the cycle.
4. The self-service route reads the employee from the account, never from the body.
5. Logs carry no titles, providers, points, file ids or reasons.

## 7. Decisions that need your answer

Confirmed as proposed: CR2 and CR3 (two new code systems, starter values), CR5 (500 points per record is a guess), CR6 (evidence required only for self-service), CR8 (an accepted record can later be rejected; the reviewer must not be the holder), CR9 (keep the `:system` path and check it against the body) and CR11 (`accepted_points` on read, no computed totals), and the split into two code PRs. The others are proposed as stated.

## 8. As built (PR #42 and #43)

- **PR split.** B1 (#42): the `cpd_records` repository, the two code systems, recording, self-service, the list and the review. B2 (#43): the `cpd_summaries` repository and the two total endpoints. B2 adds `findAcceptedInCycle` to the record repository.
- **Limits.** A record carries at most 500 points and a stored total at most 10000 (`cpd-rules.ts`). Both are guesses to catch typing mistakes, not rules of the regulation: verify them. A total has at most two decimals and may be 0.
- **Review.** A submitted record is accepted or rejected, an accepted one may later be rejected, a rejected one is final (422 `invalid_transition`). The reviewer is compared with the holder through the account's `employee_id`; an account with no employee can review. A rejection needs a reason of 1 to 500 characters, kept in the change history through `withChangeReason`. The note of an acceptance is optional and goes the same way.
- **Self-service.** The route reads the employee from the account and needs evidence (422 `evidence_required`). An employee who has separated cannot submit or be recorded for.
- **Evidence.** The same file-reference check as licence scans (`isValidDocumentRef`, imported from the licence rules).
- **Totals.** `PUT` returns 200 and the stored total with `accepted_points`. A race on the unique index is settled by replacing the winner's values. The read time (`checkedAt`) cannot be in the future and defaults to now. `source` is always `external_platform` here; `computed` is never written.
- **Code systems.** `id.credit-system` (`skp`) and `id.cpd-category` (`learning`, `service`, `community_service`, `publication`, `development`) are starter values to confirm with HR before go-live.
- **Known gaps.** The SIP-renewal shortfall alert (CR12) is not built and `SKP_REQUIRED_POINTS` is still unused. Credits have no effect on licences. The Mongo indexes were tested only through the in-memory fakes, not against a replica set.
