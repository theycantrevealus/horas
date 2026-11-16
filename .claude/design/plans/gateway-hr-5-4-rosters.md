# gateway_hr 5.4: Rosters

Status: **Proposed** (2026-11-16). Decisions RS1 to RS17 are proposals for you to confirm or change (section 7). Part of `2026-11-10-gateway-hr-plan.md` (walkthrough order 20). Endpoints: `../hr-endpoints.md` 5.4. Collection: `../human-resource-collections.md` 5.4 (`rosters`). Business rules: `../../business/administrative-operational-system/human-resource-management.md` 8.2 (Roster), 8.3 (Roster status), 8.4.1 (Prepare and publish), 8.5.5 (`HR-ROS-040` to `HR-ROS-042`), the role matrix rows "Roster drafting" and "Roster approval", and the parameters `ROSTER_PERIOD`, `ROSTER_PUBLISH_LEAD_DAYS` and `ROSTER_APPROVAL_REQUIRED`. Model: `apps/back-end/apps/repository/model/roster.ts` (exists, with its classification). Rules every endpoint follows: `../../rules/back-end/workforce.md` 3. Built references: credential applications (4.2: a status flow with a reason on return, stamps for who and when), SPK decisions (4.3: transitions in one transaction, dated in the facility's zone), shift definitions and coverage requirements (5.1, 5.3: the shift and the unit a roster works with), HR parameters (1.6: `resolve` at a place).

A roster is the plan of one unit for one period, normally a calendar month. The Head of Unit prepares it as a draft, submits it, an approver approves or returns it, and it is published to staff and to the other modules. After the period it is closed. This group builds the roster record and its lifecycle. The assignments inside it (one person, one shift, one date) are group 5.5, so every roster of this group is empty.

## 1. A split that needs your answer

The endpoint list of `hr-endpoints.md` puts ten endpoints in 5.4, but two of them cannot work without assignments: `POST /rosters/:id/validate` ("check all rules and coverage") and `POST /rosters/:id/coverage-overrides` ("accept a coverage gap") have nothing to check or accept while there are no assignments. The pre-fill from the previous period in `POST /rosters` and the assignments in `GET /rosters/:id` have the same problem.

I propose to build in 5.4 the **eight lifecycle endpoints** and to move `validate` and `coverage-overrides` (and the pre-fill and the assignment list) to 5.5, which owns the assignments and the rules of 8.5. Group 5.5 then adds the validation to `submit` and `publish` in the same PR as the assignments, so no roster ever holds assignments that were not checked. Counts in the master plan become 8 (5.4) and 9 (5.5). Until 5.5 is built, an empty roster can be submitted and published; nothing is deployed, and the gate arrives with the assignments (RS1).

## 2. The eight endpoints

| Endpoint | Behaviour |
|---|---|
| `GET /v1/rosters` | Lists rosters. Query: `unitId`, `facilityId`, `status`, `from` and `to` (rosters whose period overlaps that range), `limit`, `offset`. Ordered by period start, latest first, then unit. Writes no log entry. |
| `POST /v1/rosters` | Creates an empty draft for a unit and a period. Body: `unitId`, `period` (`start`, `end`), optional `reason`. |
| `GET /v1/rosters/:id` | Views one roster. (The assignments are added to the answer by 5.5.) Writes no log entry. |
| `POST /v1/rosters/:id/submit` | Sends a draft for approval. Optional `version`, `reason`. |
| `POST /v1/rosters/:id/approve` | Approves a submitted roster. Optional `version`, `reason`. |
| `POST /v1/rosters/:id/return` | Returns a submitted or approved roster to draft. Needs a `reason`. Optional `version`. |
| `POST /v1/rosters/:id/publish` | Publishes an approved roster, or a draft when approval is not required. Optional `version`, `reason`. |
| `POST /v1/rosters/:id/close` | Closes a published roster after its period. Optional `version`, `reason`. |

Permissions (new): `workforce.roster:read` (list and view), `workforce.roster:write` (create, submit, publish, close) and `workforce.roster:approve` (approve, return).

## 3. Rules and decisions to confirm

| # | Rule or decision | Proposed |
|---|---|---|
| RS1 | **Scope of this group.** The eight endpoints above; `validate`, `coverage-overrides`, the pre-fill, the assignment list in `GET /:id` and the validation gate on `submit` and `publish` move to 5.5 (section 1). | **Needs your answer.** |
| RS2 | **Unit.** A roster belongs to one unit, which must exist in the tenant and be `active` (422 `unit_not_found`, `unit_closed`; a foreign, missing and deleted unit give one answer). Its facility is copied onto the roster and the facility's time zone is read through the unit. The unit and the period never change. Any unit may have a roster, clinical or not. | As stated. |
| RS3 | **Period.** `period.start` and `period.end` are local dates and must match `ROSTER_PERIOD` for the unit's facility, read with the parameter service at the facility (422 `invalid_period`): `month` is the first to the last day of one calendar month, `week` is Monday to Sunday and `two_weeks` is a Monday to the Sunday after the next. A period may start in the past (to enter one that is already running) or in the future. Nothing is converted (`database.md` 4.4). | As stated. |
| RS4 | **One roster per unit and period.** A unit has at most one roster for a start date (409 `roster_exists`, backed by the unique index `{ tenant_id, unit_id, period.start }` of the collection design), and the periods of one unit's rosters may not overlap (409 `roster_overlaps`, checked by reading then writing, so two simultaneous requests can both pass). | As stated. |
| RS5 | **Status flow** (8.3). `draft` goes to `submitted` and `approved`, then `published`, then `closed`. `submitted` and `approved` can be returned to `draft`. Any other move answers 422 `invalid_transition`. Every step stamps who and when (`submitted`, `approved`, `published`, `closed` as `{ by, at }`); `prepared_by` is the account that created the draft. A return clears the `submitted` and `approved` stamps and stores `return_reason`; creating a new submission clears `return_reason`. Nothing is deleted. | As stated. |
| RS6 | **Approval is a setting.** `ROSTER_APPROVAL_REQUIRED` is read at the roster's unit (it can be set per organization, facility or unit). **On** (the default): `submit` takes a draft to `submitted`, `approve` takes it to `approved`, and `publish` needs `approved`. **Off**: `publish` takes a draft directly, and `submit` and `approve` answer 422 `approval_not_required`. The setting is read when a roster is submitted and when it is published, so a roster that is already `submitted` or `approved` when the setting is turned off can still be approved and published; only a new `submit` is refused. | As stated. |
| RS7 | **Separation of duties.** The approver cannot be the person who prepared the roster (403 `approver_is_preparer`), as for licences and SPK decisions. A roster prepared by a system actor is not blocked. | As stated. |
| RS8 | **Return.** `return` needs a reason of 1 to 500 characters (422 `reason_required`, `invalid_reason`) and takes `submitted` or `approved` back to `draft` (HR spec 8.3). A `published` roster is not returned; changes after publication are made assignment by assignment (5.5, HR spec 8.4.3). | As stated. |
| RS9 | **Revision.** The roster's `revision` (the spec's roster version, separate from the document `version`) starts at 0 and becomes 1 when the roster is first published. 5.5 increases it on every change after publication. | As stated. |
| RS10 | **Close.** `close` takes a `published` roster to `closed` and only after its period ended: its last day is before today in the facility's zone (422 `period_not_ended`). The reconciliation of attendance (HR spec 9.3) is not built, so nothing is checked about it. A closed roster is final (`HR-ROS-040`). | As stated. |
| RS11 | **Lead days.** `ROSTER_PUBLISH_LEAD_DAYS` is not enforced: a draft can be created and published at any time. It only drives the alert "roster not published in time" (HR spec 8.6), which needs the worker and is not built. | As stated. |
| RS12 | **Reads.** The list is tenant-wide and filters by `unitId`, `facilityId`, `status` and the range `from` to `to` (a roster is in when its period overlaps the range). A malformed id answers an empty list; `limit` is 1 to 100 and the default applies when it is missing. `GET /:id` answers 404 for a missing, malformed or foreign id. | As stated. |
| RS13 | **Permissions.** Read, write and approve are tenant-wide until scoped permissions exist, so a holder of `workforce.roster:write` can change any unit's roster (a Head of Unit limited to their own unit comes later). The business matrix gives the Head of Unit drafting, submitting and publishing, the HR Manager approval, and HR Admin view; roles are given the permissions as the administrator decides. | As stated. |
| RS14 | **Changes and logs.** The repository records every write in the change history; an optional `reason` goes with it (required on return, RS8). Each write logs one entry (`roster_create`, `roster_submit`, `roster_approve`, `roster_return`, `roster_publish`, `roster_close`) with the error class and the workforce `code` on failure and never a date or a reason. Reads write no log entry. | As stated. |
| RS15 | **Concurrency.** Every transition reads the roster and writes it with the version it read, so two requests that move the same roster at once cannot both succeed (409 `stale_version`). An optional `version` in the body is checked first. | As stated. |
| RS16 | **No events and no notifications.** "Publish to staff and other modules" (HR spec 8.4.1) is only the status: staff read the roster through 5.5 and the clinical modules read the on-duty query (5.5). No `workforce.roster.published` event is written and nobody is notified; that arrives with the notification service and the worker (master plan D5). | As stated. |
| RS17 | **Tenant, ids and no delete.** `tenant_id` always from `@CurrentUser()`; a foreign, missing or malformed id gives the same 404 (`roster_not_found`); in a body it gives 422. A draft roster cannot be deleted, only left unused. | As stated. |

## 4. Repository

`RosterRepository` (`rosters`): `findByFilter(tenantId, query)` for the list (`unitId`, `facilityId`, `status`, `from`, `to`, `limit`, `offset`; ordered by period start descending, then unit), `findByUnitAndStart(tenantId, unitId, start)` and `findOverlapping(tenantId, unitId, start, end)` for RS4, plus the base methods. Indexes: `{ tenant_id, unit_id, 'period.start' }` unique and `{ tenant_id, status, 'period.start' }` (collection design). Updatable fields: `status`, `revision`, `submitted`, `approved`, `published`, `closed`, `return_reason`. The unit, the facility, the period and `prepared_by` never change. The fields `coverage_overrides` and `validation` exist in the model and stay empty until 5.5. The in-memory fake applies the same unique rule.

## 5. Code structure

```
apps/back-end/apps/
├── repository/{token.ts, interface/roster.ts}
├── repository/mongo/{roster.ts, roster.module.ts, schema/roster.ts} (+ spec)
├── workforce/rostering/{roster.service.ts, roster-rules.ts} (+ specs)   lifecycle, period and transition rules
├── workforce/testing/in-memory.ts                                        the fake
├── identity/permission.ts                                                workforce.roster:read, :write, :approve
└── gateway_hr/src/roster/                                                controller, DTOs, module, gateway test
```

`gateway_hr/src/testing/in-memory-workforce.ts` registers the repository.

## 6. Tasks and pull requests

| PR | Kind | Content |
|---|---|---|
| A | Docs | This plan, the master plan row and the endpoint note (branch `docs/workforce-rosters-plan`). |
| B | Code | The repository, the service, the permissions, the controller and the tests (branch `feat/workforce-rosters`). One PR: eight endpoints and one repository, like 4.1 and 5.1. |
| C | Docs | After the code PR: a small "build in progress" docs PR, then the "built" docs PR (`workforce.md`, `hr-endpoints.md` with the moved endpoints, this plan's status and the master plan counts). |

Tests come first: repository (indexes, tenant isolation, no `_id`, one change record per write, the unit and the period never change, unique start), service (every transition and every refused transition, both settings of `ROSTER_APPROVAL_REQUIRED`, the period rules of the three `ROSTER_PERIOD` values, the overlap rule, separation of duties, close only after the period in the facility's zone, tenant isolation, stale version, reads write no log, writes log no values or reasons) and gateway (401, 403, 404, 409, 422, validation, list limits). Checks: `tsc`, `oxlint`, full `vitest` and `nest build gateway_hr`, run from `apps/back-end` under Node 22 (`pnpm` does not start on this machine).

## 7. Review focus

1. A roster's unit and period never change, and a unit never has two overlapping rosters.
2. Only the allowed status moves exist, and both settings of `ROSTER_APPROVAL_REQUIRED` behave as RS6 says.
3. The approver is never the preparer; a return always carries a reason.
4. A roster can be closed only after its last day in the facility's time zone.
5. Logs carry no dates or reasons, and responses carry no `_id`.

## 8. Decisions that need your answer

All of RS1 to RS17 are proposals. These four change the shape of the work most, so I would like an explicit answer:

- **RS1** (the split: eight lifecycle endpoints here; `validate`, `coverage-overrides`, the pre-fill and the assignment list move to 5.5 together with the validation gate on `submit` and `publish`).
- **RS6** (approval is the setting `ROSTER_APPROVAL_REQUIRED`, read at the unit: with it on a roster goes draft, submitted, approved, published; with it off a draft is published directly).
- **RS3** (the period must match `ROSTER_PERIOD`: a calendar month, or a Monday to Sunday week, or two weeks).
- **RS7** (the approver cannot be the preparer).

Also open, not decided here: how rotation patterns and the pre-fill work (5.5), and which role may approve for a unit (the HR Manager or the head of the parent unit, "per configuration" in the business spec: today it is whoever the administrator gave `workforce.roster:approve`). The others are proposed as stated.
