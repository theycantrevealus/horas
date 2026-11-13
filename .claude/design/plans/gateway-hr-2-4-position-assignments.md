# gateway_hr 2.4: Position assignments

Status: **Built** (2026-11-13, PR #31 merged). Decisions A1 to A21 confirmed as proposed, with the three differences in section 9. Part of `2026-11-10-gateway-hr-plan.md` (walkthrough order 10). Endpoints: `../hr-endpoints.md` 2.4. Collection: `../account-and-workforce-collections.md` 4.6 and 10, `../human-resource-collections.md` section 2 (`is_open`), HR specification 9.2. Model: `apps/back-end/apps/repository/model/position-assignment.ts` (exists, with its classification). Rules every endpoint follows: `../../rules/back-end/workforce.md` 3. Built references: positions (1.5), employees (2.1), contracts (2.3), events (`gateway-hr-events-to-identity.md`).

An assignment says which position a person holds, in which unit and facility, from when to when, and at what fraction of full time. It is the history of hires, transfers, promotions, acting appointments and secondments. It also finishes two things earlier groups left open: the employee's `primary_assignment` summary (always `null` so far) and the facility's time zone for local dates, which the HR events plan (H6) postponed until assignments exist.

## 1. The four endpoints

| Endpoint | Behaviour |
|---|---|
| `GET /v1/employees/:id/assignments` | Lists the employee's assignments, newest start first, whatever their status. Not paged. Writes no log entry. |
| `GET /v1/units/:id/assignments` | Lists the assignments of one unit. Optional `status` (`planned`, `active`, `ended`), `limit` and `offset`; ordered by start date, then id. Does not include the units below it (see A12). Writes no log entry. |
| `POST /v1/assignments` | Creates an assignment. Body: `employeeId`, `positionId`, `contractId`, `kind`, `period` (`start`, `end` optional), `fte` (optional, default 1), `isPrimary` (optional), `decisionNumber` (optional), optional `reason`. |
| `POST /v1/assignments/:id/end` | Ends an assignment on a date. Body: `date`, optional `version`, `reason`. |

No `GET /assignments/:id` and no `PATCH`: see A13 and A14. Permissions (new): `workforce.assignment:read` for the two reads, `workforce.assignment:write` for create and end.

## 2. Rules and decisions to confirm

| # | Rule or decision | Proposed |
|---|---|---|
| A1 | **Employee, position and contract.** The employee must exist in the tenant and not be `separated`; the position must exist, be `active` and not soft-deleted; the contract must exist, belong to that employee, and be `active`. Each missing, foreign or inactive record gives its own 422 (`employee_not_found`, `position_not_found`, `position_closed`, `contract_not_found`, `contract_not_active`). `unit_id`, `facility_id` and `is_head_of_unit` are copied from the position at creation and never change. | As stated. |
| A2 | **Kind.** A `Coding` of `id.assignment-kind` (`hire`, `transfer`, `promotion`, `acting`, `secondment`), active (`assertActive`). | As stated. |
| A3 | **Period.** `start` is a local date, `end` optional (open-ended), not before `start`, between 1950-01-01 and ten years ahead. An `acting` or `secondment` assignment must have an `end` (it is temporary by nature); the others may be open. The period must lie inside the contract's period (a contract with an end date bounds it). | As stated. |
| A4 | **Local dates use the facility's time zone.** "Today" for an assignment is today in the position's facility zone (`todayInZone`, `database.md` 4.4), not UTC. This is the first group that can do it right; contracts (T12) and status changes keep their UTC slack because they have no facility. | As stated. |
| A5 | **Status.** Created `planned` when `start` is after today in the facility zone, otherwise `active`. `ended` once ended (A9). `is_open` is true while `planned` or `active`. There is no job yet to turn `planned` into `active` on its start date (the worker is not built): a planned assignment stays `planned` until that job exists. See A15. | Created planned or active; no activation job yet. |
| A6 | **FTE.** A number above 0 and up to 1, two decimals, default 1. The sum of `fte` over an employee's open assignments that overlap in time must not exceed the contract's `fte`: 409 `fte_exceeded`. | As stated. |
| A7 | **One primary per employee.** An employee has at most one open primary assignment (partial unique index on `tenant_id`, `employee_id` where `is_primary` and `is_open`; the check gives 409 `primary_exists`). The first assignment of an employee is primary by default; a later one is not unless `isPrimary` is true. Two overlapping non-primary assignments (a second unit, an acting role) are allowed. A transfer or promotion is made by ending the old assignment and creating the new one with `isPrimary: true` (A8). | As stated. |
| A8 | **Transfer, promotion and acting are two steps, not one endpoint.** `POST /assignments/:id/end` then `POST /assignments`, each its own request, because the endpoint list has one create and one end. The service offers **no combined call**. Between the two calls an employee may have no primary assignment; that is a state HR can see in the unit lists. If you want an atomic transfer, say so: it would be `POST /assignments/:id/transfer`, a fifth endpoint. | Two steps. |
| A9 | **Ending.** Only an open assignment. `date` is the last day: not before `start`, not later than today in the facility zone plus one day. A `planned` assignment can be ended before it starts only by ending it on its own start date or later, so a mistaken planned assignment is ended on its start day and never becomes active. Status becomes `ended`, `is_open` false, `period.end` is set to `date` (overwriting an earlier planned end). When the assignment is the employee's primary, the summary is cleared (A10). | As stated. |
| A10 | **Employee summary.** The employee's `primary_assignment` (`assignment_id`, `facility_id`, `unit_id`, `position_id`) is set when a primary assignment becomes `active` and cleared when it ends, in the same `TransactionManager.run`, with its own change record (same pattern as T16). `EmployeeRepository` gets one more updatable field, `primary_assignment`; `PATCH /employees/:id` still cannot send it. A planned primary does not set it. | As stated. |
| A11 | **One head per unit.** A position flagged `is_head_of_unit` can have only one open assignment at a time (partial unique index on `tenant_id`, `unit_id` where `is_head_of_unit` and `is_open`; 409 `head_exists`). | As stated. |
| A12 | **Headcount.** The open assignments of a position must not exceed its `budgeted_headcount`: 409 `headcount_exceeded`. Counted on overlapping open assignments, `acting` ones included, so an acting appointment to a full position needs the holder to end first. **Question:** should acting count? The design is silent. Proposed: it does not (an acting person covers a post someone else holds), so only non-acting assignments count against headcount. | Acting does not count. |
| A13 | **Reads.** The unit list shows only assignments whose `unit_id` is that unit. A tree view ("everyone under this directorate") needs `ancestor_ids` and is left for a report later. No single-assignment read: the two lists carry every field. | Lists only. |
| A14 | **No edit and no delete.** A wrong assignment is ended on its start date and a new one created, so the history stays complete. A correction endpoint can come with the roster group if needed. | As stated. |
| A15 | **Activation of planned assignments.** Options: (a) none now; the assignment stays `planned` until the worker has a daily job (documented gap, like contracts T12), (b) a `POST /assignments/:id/activate` endpoint like `POST /contracts/:id/activate`, (c) activate lazily when the employee or unit is read. Proposed: (a), with the status computed from dates by the future job, and the summary (A10) set when it activates. | (a) |
| A16 | **Reaction to other changes (not in this group).** Separating an employee does **not** end their assignments yet (the HR events plan ignores assignments); ending a position's unit does not either. Both need a decision: end all open assignments on the separation date in the same transaction, or consume the `status_changed` event inside workforce. Proposed: consume the event in a later group and keep assignments untouched here. Until then, an HR admin ends them by hand. | Later. |
| A17 | **Positions and units.** Closing a position or a unit while it has an open assignment should be refused. Built for positions only (409 `position_in_use`): a unit cannot close while it has active positions, and a position cannot close with open assignments, so a unit check would never fire (section 9). It changes two existing endpoints. | Add the checks. |
| A18 | **Decision reference.** `decisionNumber` (SK number, up to 80 characters) is stored as `decision_ref.number` with no document yet (needs the file service, as T8). | As stated. |
| A19 | **Events.** No event is emitted. The role-derivation and eligibility consumers that need `assignment.created` and `.ended` are not built (events plan H13), so adding the events now would publish to no consumer. They come with the group that reads them. | None now. |
| A20 | **Parents and tenant.** All foreign ids follow `workforce.md` 3: a missing, malformed or other-tenant id in a path answers 404 (`employee_not_found`, `unit_not_found`, `assignment_not_found`); in a body it answers 422. | As stated. |

## 3. Repository

A new `PositionAssignmentRepository` (token, interface, Mongo implementation on `MongoRepositoryBase`, schema, module):

- `findByEmployee(tenantId, employeeId)`, `findByUnit(tenantId, unitId, options)`, `findOpenByEmployee(tenantId, employeeId)` and `countOpenByPosition(tenantId, positionId, from, to)` (reads).
- `create` and `update` (writes) go through the base class and record changes. No `delete`.
- Unique partial indexes: one open primary per employee (A7), one open head per unit (A11); `{ tenant_id, unit_id, status, 'period.start' }` for the unit list. All start with `tenant_id`.
- Fields not updatable: everything except `status`, `is_open`, `period` and `version`.

The overlap checks of A6 and A12 are read inside the same `run` as the write. They are not backed by an index (an index cannot express a sum), so two simultaneous creates can both pass. The employee's `version` (bumped by the summary write only for primary) and the position's `version` are not touched, so this race stays open. **Decision A21:** accept it for now (HR is low-volume and the next unique-index check catches primary and head), or lock by writing the position's `version` in the same transaction. Proposed: accept, and say so in the PR.

## 4. Code structure

```
apps/back-end/apps/
├── repository/
│   ├── token.ts                          REPOSITORY_POSITION_ASSIGNMENT
│   ├── interface/position-assignment.ts
│   └── mongo/position-assignment.{ts,module.ts}, schema/position-assignment.ts (+ spec)
├── workforce/assignment/
│   ├── assignment.service.ts             list, create, end (+ spec)
│   └── assignment-rules.ts               period, fte, headcount, primary and head checks
├── workforce/structure/                  position and unit close: refuse while in use (A17)
├── workforce/testing/in-memory.ts        in-memory repository
├── identity/permission.ts                workforce.assignment:read and :write
└── gateway_hr/src/assignment/            controller, DTOs, module, gateway test
```

`gateway_hr/src/testing/in-memory-workforce.ts` registers the new repository.

## 5. Tasks

Tests come first in each task.

1. **Repository.** Token, interface, schema with indexes, Mongo implementation, in-memory repository. *Tests:* unique primary and unique head only while open; tenant isolation; no `_id` or `__v` in results; one change record per write.
2. **Service.** `AssignmentService` list, create, end, with `observe`. *Tests:* every rejection of A1 to A12; the primary summary set and cleared with its own change record in one transaction; a refused write changes nothing; stale version; tenant isolation; reads write no log entry; writes log no values; today in the facility zone (two zones).
3. **Closing checks.** Position and unit close refuse while an assignment is open (A17). *Tests:* both services, extending their specs.
4. **Controller and gateway.** DTOs, controller, module, permissions. *Tests (`createHrGateway`):* 401, 403, happy paths, 404 for malformed, missing and foreign ids, 409 cases, validation, list limits, reads write only the access log, writes log no values.
5. **Checks.** `tsc` for all apps and specs, `oxlint`, full `vitest`, `nest build` for `gateway_hr`.

## 6. Pull requests

| PR | Kind | Content |
|---|---|---|
| A | Docs | This plan (branch `docs/workforce-assignments-plan`). |
| B | Code | Repository, service, closing checks, gateway (branch `feat/workforce-assignments`). If the diff passes about 400 lines of non-test code, split the closing checks (task 3) into their own PR. |
| C | Docs | After B merges: `workforce.md` (permissions, rules), `hr-endpoints.md` and the plan status. |

## 7. Review focus

1. An employee never has two open primary assignments, and a head position never has two holders.
2. The employee's `primary_assignment` always matches the open primary assignment, and both commit together.
3. Local dates are read in the facility's time zone; nothing uses the server's zone.
4. Headcount and FTE checks count only overlapping open assignments, and acting is handled as decided in A12.
5. Closing a position or unit that someone still holds is refused.
6. No assignment is deleted or edited; history is complete.

## 8. Decisions that need your answer

A5 and A15 (planned activation), A8 (two steps or an atomic transfer), A12 (does acting count against headcount), A16 (separation does not end assignments yet), A17 (the two closing checks change existing endpoints) and A21 (the overlap race). The others are proposed as stated.

## 9. As built (PR #31)

- **A17.** Only `PositionService.close` got the check (409 `position_in_use`). `UnitService.close` is unchanged.
- **Facility of a position.** Positions have no `facility_id`; the service reads it from the position's unit (`unit.facility_id`).
- **Employee summary.** `primary_assignment` was added to the updatable fields of `EmployeeRepository`, so the assignment service can keep it in step. `PATCH /employees/:id` still cannot send it.
- **Known gap (A21).** The FTE and headcount checks read then write. Two simultaneous creates can both pass; the primary and head indexes still hold.
- **Still open.** Planned assignments are not activated until the worker has a daily job (A15). Separating an employee does not end their assignments (A16).
