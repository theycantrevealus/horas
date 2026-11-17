# gateway_hr 5.7: Shift swaps

Status: **Proposed** (2026-11-18), waiting for your answers on the decisions marked "Needs your answer". Part of `2026-11-10-gateway-hr-plan.md` (walkthrough order 23). Endpoints: `../hr-endpoints.md` 5.7. Collection: `../human-resource-collections.md` 5.8 (`shift_swap_requests`). Business rules: `../../business/administrative-operational-system/human-resource-management.md` 8.4.2 (the workflow), 8.5 (every rule applies to the assignments a swap creates), the permission matrix in section 4 ("Shift swap request": Employee creates their own, Head of Unit approves for the unit) and the alert table (section 8.6, not built). Model and classification: `apps/back-end/apps/repository/model/shift-swap-request*.ts` (exist; no token, interface, schema or repository yet). Built references: roster assignments (5.5: `RosterAssignmentService`, the shared `assignment-checks.ts`, `commit` of a change to a published roster with the roster revision), rosters (5.4), the self-service routes of 5.5 (`GET /employees/me/roster`) and the import apply of 5.6 (check again at apply, one transaction).

A swap request lets an employee ask to trade a shift of a published roster with a colleague, or to hand it over. The colleague accepts, the system checks that both resulting schedules still follow every rule of HR spec 8.5, and the Head of Unit approves or rejects. On approval the original assignments are cancelled, new ones are created with the source `swap`, and the roster's revision goes up in the same transaction.

## 1. A change to the endpoint list that needs your answer

`hr-endpoints.md` lists six endpoints. The list has to say "mine, or my unit's for a Head of Unit", but a unit-level limit needs scoped permissions, which do not exist (`authentication.md` 6). I propose the pattern of 5.5 (`GET /employees/me/roster`): **two reads**, so seven endpoints (SW1).

| Endpoint | Behaviour |
|---|---|
| `GET /v1/shift-swaps` | Lists swap requests of the tenant for the people who manage them. Query `unitId`, `rosterId`, `status`, `employeeId` (as requester or counterpart), `limit`, `offset`. Needs `workforce.shift-swap:read`. |
| `GET /v1/employees/me/shift-swaps` | New. The signed-in employee's own requests, as requester or counterpart (the counterpart's inbox). Query `status`, `limit`, `offset`. Sign-in only; needs a linked employee (403 `employee_required`). |
| `POST /v1/shift-swaps` | The signed-in employee asks to swap or hand over one of their shifts. Body: `assignmentId`, `counterpartEmployeeId`, optional `counterpartAssignmentId`, `reason`. Sign-in only, linked employee. |
| `POST /v1/shift-swaps/:id/accept` | The named counterpart accepts. Optional `version`. Sign-in only; only the counterpart (403 `not_the_counterpart`). |
| `POST /v1/shift-swaps/:id/approve` | The Head of Unit approves; the assignments change. Optional `version`, `reason`. Needs `workforce.shift-swap:decide`. |
| `POST /v1/shift-swaps/:id/reject` | Rejects with a reason. Optional `version`. Needs `workforce.shift-swap:decide`. |
| `POST /v1/shift-swaps/:id/cancel` | The requester withdraws it. Optional `version`. Sign-in only; only the requester (403 `not_the_requester`). |

There is no `GET /shift-swaps/:id`: the two lists carry the whole record (SW2). Permissions (new): `workforce.shift-swap:read`, `workforce.shift-swap:decide`. Create, accept, cancel and the own list need only a sign-in and a linked employee, because the rule is "your own request" (the same way as `POST /employees/me/licenses`).

## 2. The workflow

```
requested ──accept (counterpart)──▶ accepted_by_counterpart ──approve (Head)──▶ approved
    │                                       │
    ├──cancel (requester)──▶ cancelled ◀──cancel
    └──reject (Head)──▶ rejected ◀──reject (Head)
```

| Move | Who | From |
|---|---|---|
| `accept` | The counterpart | `requested` |
| `approve` | `workforce.shift-swap:decide`, not a party | `accepted_by_counterpart` |
| `reject` | `workforce.shift-swap:decide`, not a party | `requested` or `accepted_by_counterpart` |
| `cancel` | The requester | `requested` or `accepted_by_counterpart` |

Any other move answers 422 `invalid_transition`. `approved`, `rejected` and `cancelled` are final. Every move is written with the version it was read at (409 `stale_version`; an optional `version` in the body is checked first).

## 3. Rules and decisions to confirm

| # | Rule or decision | Proposed |
|---|---|---|
| SW1 | **Scope.** Seven endpoints: the six of `hr-endpoints.md` plus `GET /employees/me/shift-swaps`, because the unit limit of "my unit's" needs scoped permissions (section 1). | **Needs your answer.** |
| SW2 | **No single read.** The lists carry the whole record (it is small). A detail route can be added when a screen needs it. | As stated. |
| SW3 | **Every request names a counterpart.** `counterpartEmployeeId` is required. `counterpartAssignmentId` is optional: with it the two trade shifts, without it the requester **hands the shift over** and the counterpart takes it without giving one. A hand-over to "whoever volunteers" (no counterpart named, which the model allows) is not built. | **Needs your answer.** |
| SW4 | **Published rosters only.** The roster of the requester's assignment must be `published` (422 `roster_not_published`). In a draft the Head of Unit changes assignments directly (5.5); a submitted or approved roster is frozen; a closed one is final (`HR-ROS-040`). Both assignments must be in the same roster (422 `different_roster`); a swap across rosters or units is not built. | As stated. |
| SW5 | **What can be swapped.** Each assignment is `planned`, not flagged, and its date is **today or later** in the facility's zone (`HR-ROS-041`; the past is never swapped, even by a permission). The requester's assignment must be the requester's own (422 `assignment_not_yours`) and the counterpart's the counterpart's (422 `counterpart_assignment_mismatch`). The counterpart is another employee of the tenant (422 `counterpart_not_found`, `counterpart_is_requester`). A missing, foreign or malformed assignment answers 404 `roster_assignment_not_found`. | As stated. |
| SW6 | **One open request per assignment.** An assignment in a request that is `requested` or `accepted_by_counterpart` cannot be in another (409 `swap_exists`), for either side. The check reads then writes, so two simultaneous requests can both pass; approve checks again (SW9). | As stated. |
| SW7 | **The result.** A **trade**: the requester takes the counterpart's date, shift and role; the counterpart takes the requester's. A **hand-over**: the counterpart takes the requester's date, shift and role, and the requester's assignment is cancelled. Roles go with the shift (a team leader's slot stays a team leader's). | **Needs your answer.** |
| SW8 | **The rules of 8.5 apply to the result.** The resulting assignments are checked as if added by hand (5.5, from the shared `assignment-checks.ts`): status `probation` or `active`, general clinical eligibility for the unit on the date, one planned assignment per employee, roster and date, no overlap, minimum rest, weekly hours, night runs, with the assignments being replaced taken out of the schedule. **Overtime is not accepted:** a result that would add overtime is refused (422 `overtime_consent_required`), because the consent of 5.5 belongs to the person and a swap has no place to hold it; the Head of Unit can still make that change by hand with the consent. | **Needs your answer.** |
| SW9 | **When it is checked.** At **create** (so the requester finds out at once), at **accept** (the counterpart's schedule may have changed) and again at **approve** (anything may have changed), always against the schedule as it is then. A check that fails at create or accept refuses the move (422, the code of the rule); a failure at approve refuses the approval and leaves the request `accepted_by_counterpart` for the Head to reject. | As stated. |
| SW10 | **Approve is one transaction.** It cancels the original assignments, creates the new ones (source `{ kind: 'swap', ref_id: <request id> }`, status `planned`, the roster's new revision, `change_reason` `shift_swap`, a snapshot of the shift and its UTC instants), raises the roster's `revision` by one (the roster is written with the version it was read at, 409 `stale_version`), and marks the request `approved` with the decision and `resulting_assignment_ids`. Either all of it or none. The new assignments are created one by one inside the transaction (`createMany` is for imports and records another reason). | As stated. |
| SW11 | **Separation of duties.** The one who decides is never the requester or the counterpart (403 `decider_is_party`). A decider without a linked employee is allowed to decide (the account is the Head of Unit's), but is recorded by account. | As stated. |
| SW12 | **Reject** needs a reason of 1 to 500 characters (422 `reason_required`, `invalid_reason`), kept in `decision.reason`; approve takes an optional reason, kept the same way. Cancel takes none. | As stated. |
| SW13 | **No counterpart decline.** The model has no `declined` status, so the counterpart who does not want the swap does nothing and the requester cancels, or the Head rejects. A decline route needs a new status and is not built. | **Needs your answer.** |
| SW14 | **Time limits.** Nothing expires a request whose shift date has passed: `approve` refuses it (422 `assignment_in_past`) and the Head rejects or the requester cancels. An expiry job comes with the worker group. | As stated. |
| SW15 | **Tenant and ids.** `tenant_id` always from `@CurrentUser()`; `employee_id` of the caller from the token, never from the body. A foreign, missing or malformed request id answers 404 `swap_not_found`; a unit or roster of another tenant counts as missing. Nothing is deleted. | As stated. |
| SW16 | **Lists.** Both lists accept `limit` (1 to 100) and `offset` and reject other values, ordered by latest first. `GET /shift-swaps` filters `unitId`, `rosterId`, `status`, `employeeId`; the own list filters `status`. Reads write no log entry. | As stated. |
| SW17 | **Changes and logs.** The request and every assignment it touches are recorded by their repositories (`database.md` 6.1). Each write route writes one operational entry (`swap_create`, `swap_accept`, `swap_approve`, `swap_reject`, `swap_cancel`) with the error class and `code` on failure, never an employee, a date, a shift or a reason. The reasons are `confidential` in the change log (the classification exists). | As stated. |
| SW18 | **Not built here.** The alerts of 8.6 (counterpart, Head of Unit and both employees), events, an open hand-over, a swap across rosters or units, a counterpart decline, an expiry job, a detail route, overtime consent in a swap, and the own-unit limit for a Head of Unit (scoped permissions). | As stated. |
| SW19 | **Collection design.** The model's `counterpart_accepted_at` is what is built; `human-resource-collections.md` 5.8 says `counterpart_response: { at }` and is corrected in the "built" docs PR. | As stated. |

## 4. Repository and code

A new repository is needed (the model exists). Its design follows `database.md` and the collection design, with one difference to settle: the model calls the counterpart's answer `counterpart_accepted_at` where the collection design says `counterpart_response: { at }`; the model is what is built and the collection design is corrected in the docs PR (SW19).

- Token `REPOSITORY_SHIFT_SWAP_REQUEST`, interface `ShiftSwapRequestRepository` with named reads `findByFilter(tenantId, { unitId, rosterId, status, employeeId, limit, offset })`, `findOpenByAssignments(tenantId, assignmentIds)` (SW6, SW9), a schema `ShiftSwapRequestEntity` with the collection pinned, the indexes of the design (`{ tenant_id, unit_id, status }`, `{ tenant_id, counterpart.employee_id, status }`) plus `{ tenant_id, requester.employee_id, status }` for the own list, the Mongo implementation, module, spec, and the in-memory fake registered in `gateway_hr/src/testing/in-memory-workforce.ts`.
- `SwapService` in `workforce/rostering/swap.service.ts` (create, accept, approve, reject, cancel, lists), with `swap-rules.ts` (the moves, the reason) and the schedule check reusing `assignment-checks.ts`. The change to the published roster (cancel, create, `revision`) reuses the pattern of `RosterAssignmentService.commit`, extracted if it is needed by both.
- Permissions `WORKFORCE_SHIFT_SWAP_READ` and `WORKFORCE_SHIFT_SWAP_DECIDE` in `identity/permission.ts`.
- `gateway_hr/src/shift-swap/`: controller, DTOs, module, gateway test.

```
apps/back-end/apps/
├── repository/{token.ts,interface,mongo,mongo/schema}/shift-swap-request*.ts   (+ spec, module)
├── workforce/rostering/{swap.service.ts, swap-rules.ts}                          (+ specs)
├── workforce/testing/in-memory.ts                                                 InMemoryShiftSwapRequests
├── identity/permission.ts                                                         workforce.shift-swap:read, :decide
└── gateway_hr/src/shift-swap/                                                     the seven routes
```

## 5. Tasks and pull requests

| PR | Kind | Content |
|---|---|---|
| A | Docs | This plan, the master plan row and the endpoint note (branch `docs/workforce-hr-shift-swaps-plan`). |
| B1 | Code | The repository, the permissions, the schedule check, **create**, **accept**, **cancel**, the two lists, with the tests. |
| B2 | Code | **Approve** (one transaction, the roster revision) and **reject**, with the tests. |
| C | Docs | After each code PR as needed: a short "in progress" row update, then the "built" docs PR (`workforce.md` 3o, `hr-endpoints.md`, this plan's status, the master plan counts, and the collection design correction of SW19). |

Tests come first: the rules of SW4 to SW8 case by case (including a trade, a hand-over, a result with overlap, rest, overtime, a night run and an ineligible counterpart), the moves of section 2 for every account, one open request per assignment, tenant isolation, stale version, the approve transaction (assignments cancelled and created together, one revision, `resulting_assignment_ids`), a request that stopped being valid between accept and approve, reads write no log entry, writes log no values, and the gateway (401, 403, 404, 409, 422, 400, a full create, accept and approve over HTTP). Checks: `tsc`, `oxlint`, full `vitest` and `nest build gateway_hr`, run from `apps/back-end` under Node 22 (`pnpm` does not start on this machine).

## 6. Review focus

1. A swap never produces a schedule that breaks 8.5: the result is checked at create, accept and approve.
2. Approve is atomic: the cancellations, the new assignments, the roster revision and the request move together.
3. Only the right person makes each move, and a decider is never a party.
4. Logs carry the error class and code only: no employees, dates, shifts or reasons.
5. Every new assignment has the source `swap` with the request id and one change record.

## 7. Decisions that need your answer

- **SW1** (seven endpoints: a second read, `GET /employees/me/shift-swaps`, instead of a "my unit's" filter that needs scoped permissions).
- **SW3** (every request names a counterpart; a hand-over to whoever volunteers is not built).
- **SW7** (the result of a trade and of a hand-over: shift, date and role move with the assignment).
- **SW8** (a swap that would add overtime is refused, since the consent of 5.5 has no place in a swap).
- **SW13** (no counterpart decline: the requester cancels or the Head rejects).

The others are as stated. Open, not decided here: whether a Head of Unit may decide only for their own unit (needs scoped permissions).
