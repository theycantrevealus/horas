# gateway_hr 2.5: Committee memberships

Status: **Built** (2026-11-13, PR #35 merged). Decisions M1 to M15 confirmed as proposed, with the addition in section 9. Part of `2026-11-10-gateway-hr-plan.md` (walkthrough order 11). Endpoints: `../hr-endpoints.md` 2.5. Collection: `../account-and-workforce-collections.md` 4.7 and 10, `../human-resource-collections.md` 4.1 and section 2. Model: `apps/back-end/apps/repository/model/committee-membership.ts` (exists, with its classification). Rules every endpoint follows: `../../rules/back-end/workforce.md` 3. Built references: assignments (2.4, `gateway-hr-2-4-position-assignments.md`) for dates in the facility's zone, and facilities (1.2).

A committee membership says who sits on a facility's committee (Komite Medik, Komite Keperawatan, ...) and in which role: chair, secretary, member or mitra bestari. Committees are not positions in the organization chart. Identity will read memberships later to derive roles, and credentialing (group 4) will read them to find who may review an application. This group only records them.

## 1. The three endpoints

| Endpoint | Behaviour |
|---|---|
| `GET /v1/committee-memberships` | Lists the members of a facility's committees. Query: `facilityId` (required), optional `committee` (a code of the committee system), `role` (a code), `status` (`active`, `ended`), `limit`, `offset`. Ordered by committee code, then start date, then id. Writes no log entry. |
| `POST /v1/committee-memberships` | Appoints an employee. Body: `employeeId`, `facilityId`, `committee`, `role` (both a `Coding`), `period` (`start`, `end` optional), `decisionNumber` (optional), optional `reason`. |
| `POST /v1/committee-memberships/:id/end` | Ends a membership on a date. Body: `date`, optional `version`, `reason`. |

No `GET /committee-memberships/:id` and no `PATCH`: see M10. Permissions (new): `workforce.committee-membership:read` for the list and `workforce.committee-membership:write` for appoint and end.

## 2. Rules and decisions to confirm

| # | Rule or decision | Proposed |
|---|---|---|
| M1 | **Employee and facility.** The employee must exist in the tenant and not be `separated`; the facility must exist in the tenant, be `active` and not soft-deleted. A missing, deleted and foreign record give one answer each (422 `employee_not_found`, `employee_separated`, `facility_not_found`, `facility_inactive`). Both are fixed after creation. The employee needs no assignment in that facility: a committee may include people who work elsewhere in the group. | As stated. |
| M2 | **Committee and role.** `committee` is a `Coding` of a `committee` system (`id.committee`), `role` a `Coding` of a `committee-role` system (`id.committee-role`), both active (`assertActive`). The code lists are not copied into the code. | As stated. |
| M3 | **Period.** `start` is a local date and `end` is optional, not before `start`; dates between 1950-01-01 and ten years ahead. The date of "today" is read in the facility's time zone (`todayInZone`), as in 2.4 A4. | As stated. |
| M4 | **No future appointments.** The model has only `active` and `ended`, so a membership cannot wait for its start date. `start` must not be later than tomorrow in the facility's zone (the same slack as ending). A future appointment is created on its start date. | As stated. Say if you need `planned`. |
| M5 | **One role per person per committee.** An employee has at most one active membership in a committee of a facility (partial unique index on `tenant_id`, `employee_id`, `facility_id`, `committee.code` where `status` is `active`; 409 `membership_exists`). A change of role is two steps, end then appoint, like a transfer in 2.4 A8. | As stated. |
| M6 | **One chair and one secretary.** A committee of a facility has at most one active chair and at most one active secretary (two partial indexes on the role code; 409 `chair_exists`, `secretary_exists`). Members and mitra bestari are not limited here. | As stated. |
| M7 | **Mitra bestari from outside.** A peer assessor from another hospital has no employee record today. This group accepts employees only. An external assessor is first registered as an employee (type `mitra`, `employment-type`), as the contract rules already allow. Whether credentialing needs a lighter external-person record is decided in group 4.2. | Employees only. |
| M8 | **Ending.** Only an active membership. `date` is the last day: not before the start, not later than tomorrow in the facility's zone. Status becomes `ended` and `period.end` is set. Optional `version` (409 `stale_version`) and `reason`. | As stated. |
| M9 | **Separation and status do not end memberships yet.** A separated or suspended employee keeps an active membership until someone ends it, as with assignments (2.4 A16). Ending them from the HR events comes with the group that consumes events for roles. Until then an HR admin ends them by hand. | Later. |
| M10 | **No edit, no delete.** A wrong appointment is ended on its start date and a new one created, so the history is complete. There is no `GET` of one membership: the list carries every field. | As stated. |
| M11 | **Decision reference.** `decisionNumber` (SK number, 1 to 80 characters) is stored as `decision_ref.number` with no document yet (needs the file service, as 2.3 T8 and 2.4 A18). | As stated. |
| M12 | **Events.** None is emitted. The design lists `committee_membership.started` and `ended` for role derivation (`account-and-workforce-collections.md` 6), but no consumer exists, so an event would be published to nobody (as 2.4 A19). They arrive with role derivation. | None now. |
| M13 | **List rules.** `facilityId` is required and must be a facility of the tenant (404 `facility_not_found`). Defaults to every status. `limit` 1 to 100 (default 10), `offset` 0 or more. A committee or role that is not a known code gives an empty list, not an error. Reads write no log entry. | As stated. |
| M14 | **Order of the walkthrough.** The collection design says `committee_memberships` is "implemented with credentialing, not with the core" (`human-resource-collections.md` section 2). You decided to keep 2.5 before licences. Building it here means credentialing (4.x) reuses the repository and service. Nothing in this group depends on credentialing. The design line is corrected in the docs PR after this group. | Build now. |
| M15 | **Not built here.** Reading memberships from identity (role derivation), the committee work queue and notifications (group 4), and external assessors (M7). | Later. |

## 3. Repository

A new `CommitteeMembershipRepository` (token, interface, schema with a pinned collection `committee_memberships`, Mongo implementation on `MongoRepositoryBase`, module; classification exists):

- Reads (named `find*`): `findByFacility(tenantId, facilityId, query)`, `findActiveForEmployee(tenantId, employeeId, facilityId, committeeCode)`, `findActiveByRole(tenantId, facilityId, committeeCode, roleCode)`.
- Writes through the base class (`create`, `update`), each recorded. No `delete`. Updatable fields: `status` and `period`.
- Indexes, all starting with `tenant_id`: the three partial unique indexes of M5 and M6 (equality filters only, so `status: 'active'` works without an `is_open` field), and `{ tenant_id, facility_id, committee.code, status }` for the list.

## 4. Code structure

```
apps/back-end/apps/
├── repository/{token.ts, interface/committee-membership.ts}
├── repository/mongo/{committee-membership.ts, .module.ts, schema/committee-membership.ts} (+ spec)
├── workforce/committee/{committee-membership.service.ts, committee-rules.ts} (+ spec)
├── workforce/testing/in-memory.ts        in-memory repository with the same unique rules
├── identity/permission.ts                workforce.committee-membership:read and :write
└── gateway_hr/src/committee-membership/  controller, DTOs, module, gateway test
```

`gateway_hr/src/testing/in-memory-workforce.ts` registers the new repository.

## 5. Tasks

Tests come first in each task.

1. **Repository.** Token, interface, schema and indexes, Mongo implementation, in-memory repository. *Tests:* unique rules only while active; tenant isolation; no `_id` or `__v`; one change record per write; malformed ids give an empty list or `null`.
2. **Service.** `CommitteeMembershipService` list, appoint, end, with `observe`. *Tests:* every rejection of M1 to M8; tenant isolation; stale version; two zones for "today"; a refused write changes nothing; reads write no log; writes log no values.
3. **Controller and gateway.** DTOs, controller, module, permissions. *Tests (`createHrGateway`):* 401, 403, happy paths, 404, 409, validation, list limits, reads write only the access log, writes log no values.
4. **Checks.** `tsc` for all apps and specs, `oxlint`, full `vitest`, `nest build` for `gateway_hr`. On this machine `pnpm` does not start (corepack), so run them from `apps/back-end` under Node 22.

## 6. Pull requests

| PR | Kind | Content |
|---|---|---|
| A | Docs | This plan (branch `docs/workforce-committees-plan`). |
| B | Code | Repository, service, gateway (branch `feat/workforce-committees`). One PR; the diff is expected to be smaller than 2.4. |
| C | Docs | After B merges: `workforce.md` (permissions, rules), `hr-endpoints.md`, the master plan walkthrough, this plan's status, and the corrected line in `human-resource-collections.md` (M14). |

## 7. Review focus

1. A member has one role per committee, and a committee has one chair and one secretary at a time.
2. Dates are read in the facility's time zone; nothing uses the server's zone.
3. A foreign, missing or malformed id gives the same answer; the tenant never comes from the body or query.
4. Nothing is edited or deleted; the history stays complete.

## 8. Decisions that need your answer

Confirmed as proposed: M4 (no future appointments), M5 (one role per person per committee), M6 (one chair and one secretary), M7 (employees only, no external assessors) and M9 (separation does not end memberships yet). The others are proposed as stated.

## 9. As built (PR #35)

- **End date in the past.** An appointment's `end`, when given, may not be before today in the facility's zone (422 `invalid_period`), so no membership is created already over. Not in the plan above (M3).
- **Conflicts.** `membership_exists`, `chair_exists` and `secretary_exists` are decided by checks before the write; when two requests race, the unique index decides and the service repeats the checks to name the conflict.
- **Reuse.** The decision-number check and `addDays` come from `workforce/assignment/assignment-rules.ts`; move them to a shared place when a third area needs them.
- **Known gaps.** Separating an employee does not end their memberships (M9), no event is emitted (M12), and the Mongo indexes were tested only through the in-memory fake, not against a replica set.
