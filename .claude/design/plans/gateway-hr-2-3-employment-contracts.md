# gateway_hr 2.3: Employment contracts

Status: **In discussion** (2026-11-13). Part of `2026-11-10-gateway-hr-plan.md` (walkthrough order 9). Endpoints: `../hr-endpoints.md` 2.3. Collection: `../account-and-workforce-collections.md` 4.3 and 10, HR specification 5.1, 5.4 and 9.2. Model: `apps/back-end/apps/repository/model/employment-contract.ts` (exists). Rules every endpoint follows: `../../rules/back-end/workforce.md` 3. Built references: groups 1.1 to 2.2, especially employees (2.1), for the status rules this group completes.

A contract says who employs a person, under which type of employment, from when to when, and at what fraction of full time. A person can have several contracts over time (a fixed-term contract renewed, converted to permanent, a return after leaving). The employee record keeps a summary of the active contract (`current_employment`), and this group keeps that summary in step with the contracts in one transaction. It also finishes a rule that group 2.1 had to postpone: an employee cannot leave `onboarding` without an active contract (E17).

## 1. The seven endpoints

| Endpoint | Behaviour |
|---|---|
| `GET /v1/employees/:id/contracts` | Lists the employee's contracts, newest start first, whatever their status. Not paged (a person has a handful). Writes no log entry. |
| `POST /v1/contracts` | Creates a `draft` contract. Body: `employeeId`, `organizationId`, `contractNumber`, `employmentType`, `period` (`start`, `end`), `probationEndDate` (optional), `fte` (optional, default 1), `workingTimeScheme` (optional), `previousContractId` (optional, for a renewal). |
| `GET /v1/contracts/:id` | Returns one contract. A missing, malformed or other-tenant id answers 404 `contract_not_found`. |
| `PATCH /v1/contracts/:id` | Corrects a **draft**: `employmentType`, `period`, `probationEndDate`, `fte`, `workingTimeScheme`, `previousContractId`. Optional `version` and `reason`. Not in the original endpoint list: see T14. |
| `POST /v1/contracts/:id/activate` | Makes a draft the employee's active contract. Optional `version` and `reason`. |
| `POST /v1/contracts/:id/end` | Ends an active contract that reached its end date. Optional `version` and `reason`. |
| `POST /v1/contracts/:id/terminate` | Ends an active contract early. Body: `date`, `reason` (a code), `notes` (optional), optional `version`. |

Permissions (new): `workforce.contract:read` for the two reads, `workforce.contract:write` for create, correct, activate and end, `workforce.contract:terminate` for terminating. Terminating is separate because it is the contract-side half of a dismissal and HR may want only the HR Manager to do it.

## 2. Rules and decisions to confirm

| # | Rule or decision | Proposed |
|---|---|---|
| T1 | **Employee and employer.** The employee must exist in the tenant and must not be `separated`; the organization must exist in the tenant, be `active` and not soft-deleted. A missing, deleted and foreign record give one answer each (422 `employee_not_found`, `organization_not_found`; `organization_inactive`). Both are fixed after creation: a contract of another employer is a new contract. | As stated. |
| T2 | **Contract number.** Given by HR, upper case, 1 to 40 characters of letters, digits, dots, hyphens, underscores and slashes. Unique per organization (design 4.3), fixed after creation: 409 `contract_exists`. | As stated. |
| T3 | **Employment type.** A `Coding` of an `employment-type` system, active (`assertActive`). The concept's properties decide the rest: `requires_end_date` (T4) and `allows_probation` (T5). | As stated. |
| T4 | **Period.** `start` is a local date. `end` is required when the type requires an end date (`pkwt`, `intern`) and optional otherwise (`pkwtt`, `mitra`); `end` is not before `start`. Dates between 1950-01-01 and ten years ahead. | As stated. |
| T5 | **Probation.** `probationEndDate` is allowed only when the type allows probation (`pkwtt` only, `REG-PP35`) and must lie inside the period: not before the start and not after the end. | As stated. |
| T6 | **Full-time equivalent.** A number above 0 and up to 1, two decimals (`0.5` is half time), default 1. | As stated. |
| T7 | **Working time scheme.** Optional, a `Coding` of a `working-time-scheme` system, active; rostering reads it later to pick its working-time parameters. The Indonesian bundle ships none, so a hospital adds its schemes first. | As stated. |
| T8 | **The signed document** is not accepted yet (it needs the file service). The field stays `null`. | Later. |
| T9 | **Lifecycle.** `draft`, then `active`, then `ended` (reached its end date), `terminated` (stopped early) or `superseded` (replaced by a renewal, T11). There is no way back: a mistake in an active contract is corrected by terminating it and creating a new one. A draft cannot be ended or terminated; it is corrected (T14) and, if it is no longer wanted, simply left as a draft, because nothing is deleted. | As stated. |
| T10 | **One active contract per employee.** The employee's `current_employment` is a single summary, so activating a second contract while another is active answers 409 `active_contract_exists`, unless the new one renews the active one (T11). A partial unique index on `tenant_id` and `employee_id` where the status is `active` backs the check. Parallel contracts with two employers of one group are therefore **not supported yet**; the design allows them, but they need a decision about which contract the summary shows. Say if you need them in this group. | One at a time. |
| T11 | **Renewal.** `previousContractId` names a contract of the same employee that is `active` or `ended`, and no other contract already renews it (409 `contract_already_renewed`). The new contract must start after the previous one started. Activating a renewal of an `active` contract makes the old one `superseded` in the same transaction, then the new one `active`, and the employee's summary points to the new one. Renewing an `ended` contract (a gap between them) only links them. Converting a fixed-term contract to a permanent one is a renewal with another type. | As stated. |
| T12 | **Activation.** Only a draft; the employee must not be `separated`; the period must have started (`start` not later than tomorrow in UTC, the same slack as status changes, because a contract has no facility and so no time zone). A contract that starts in the future is activated on its start date. No job does it automatically yet (the worker is not built). The employee's `current_employment` becomes `{ contract_id, organization_id, employment_type, start_date }` in the same transaction, with its own change record. | As stated. |
| T13 | **End and terminate.** `end` needs an active contract with an end date that is not later than tomorrow (UTC): the contract has run its course. `terminate` takes a `date` (the last day, from the contract's start to tomorrow), a `reason` (a `termination-reason` code, active) and optional `notes` (up to 500 characters); the contract's own end date is not rewritten, the termination holds the date. Both clear the employee's `current_employment` when it points to this contract, in the same transaction. **Ending or terminating a contract does not change the employee's status**: separating a person is its own decision (`POST /employees/:id/status`). An active employee with no active contract is a state the system allows and will show in a report later. | No automatic separation. |
| T14 | **Correcting a draft.** Most mistakes happen when a draft is typed, and there is no delete, so `PATCH /contracts/:id` is added for drafts only: a contract that is no longer a draft answers 422 `contract_not_draft`. The employee, employer and number do not change. The endpoint list gains this row with this plan. | Added. |
| T15 | **Employee status rules finished here (completes E17).** Leaving `onboarding` (to `probation` or `active`) needs an active contract: 422 `contract_required`, read from the employee's `current_employment`. Moving to `probation` also needs a contract type that allows probation: 422 `probation_not_allowed`. The licence checks (STR and SIP) still wait for the licence group. These checks apply to changes made after this group is released; employees already in another status are not re-checked. | As stated. |
| T16 | **Employee summary writes.** `EmployeeRepository` gets one more updatable field, `current_employment`, so the contract service can keep the summary in step. `PATCH /employees/:id` still cannot send it. The contract and the employee are written in one `TransactionManager.run`, so both commit or neither does. | As stated. |
| T17 | **No overlap check between past contracts.** The system enforces one active contract at a time and the renewal chain, not that the dates of ended contracts do not overlap. | As stated. |
| T18 | **Reads.** The list of an employee's contracts answers an empty list for an employee of another tenant or a missing one, like the lists of earlier groups; a malformed employee id answers 400. | As stated. |
| T19 | **Writes** go through `observe` with the events `contract_create`, `contract_update`, `contract_activate`, `contract_end` and `contract_terminate`, log no values, and record the change history of the contract and of the employee summary. | As stated. |
| T20 | **Sequence: HR events to identity next.** Group 2.1's gap (a separated or suspended employee's account is not disabled) is still open. The plan proposes building the HR events (outbox, relay, identity consumer) as its own group right after this one, before 2.4. The contract events of this group (activated, ended, terminated) will be among the events it publishes. Say if you want it earlier or later. | Right after 2.3. |

## 3. Code structure

```
apps/back-end/apps/
├── repository/
│   ├── token.ts                          + REPOSITORY_EMPLOYMENT_CONTRACT
│   ├── interface/employment-contract.ts  findByNumber(tenantId, organizationId, number)
│   │                                     findByEmployee(tenantId, employeeId)         (newest start first)
│   │                                     findActiveByEmployee(tenantId, employeeId)
│   │                                     findRenewal(tenantId, previousContractId)
│   └── mongo/
│       ├── schema/employment-contract.ts collection `employment_contracts`; unique {tenant_id, organization_id, contract_number};
│       │                                 index {tenant_id, employee_id, status};
│       │                                 partial unique {tenant_id, employee_id} where status 'active'
│       ├── employment-contract.ts        updatable: employment_type, period, probation_end_date, fte, working_time_scheme,
│       │                                 previous_contract_id, status, termination
│       ├── employment-contract.module.ts
│       ├── employment-contract.spec.ts
│       └── employee.ts                   + current_employment is updatable
├── workforce/
│   ├── workforce.module.ts               + EmploymentContractRepositoryModule, ContractService
│   ├── contract/
│   │   ├── contract.service.ts           list, get, create, update, activate, end, terminate
│   │   ├── contract-rules.ts             period, probation, fte and number checks (T2 to T6)
│   │   └── *.spec.ts
│   ├── employee/employee.service.ts      + the T15 checks in changeStatus
│   └── testing/in-memory.ts              + InMemoryEmploymentContracts
├── identity/permission.ts                + workforce.contract:read, :write, :terminate
└── gateway_hr/src/
    ├── contract/                         module, controllers, DTOs, gateway test
    └── testing/in-memory-workforce.ts    + contracts
```

`ContractService` runs `activate`, `end` and `terminate` in `TRANSACTION_MANAGER.run` so the contract, the superseded contract and the employee summary change together; the in-memory repositories have no rollback, so tests check the order of writes and the failure cases before any write. The routes sit in two controllers (`employees/:id/contracts` and `contracts`) of one module.

## 4. Tasks

Tests come first in each task.

1. **Contract rules.** `contract-rules.ts`. *Tests:* number format and case; period with and without an end date for each combination of the type properties; probation inside and outside the period and for a type that does not allow it; fte limits and decimals; date limits.
2. **Repository.** Token, interface, schema, Mongo implementation, module; `current_employment` updatable on the employee repository. *Tests (fake model):* create records one change entry; a duplicate number and a second active contract are conflicts; `findByEmployee` is newest first; `findActiveByEmployee`, `findRenewal`; update touches only the editable fields (employee, employer and number ignored); the employee repository now updates `current_employment` and still ignores the other summary.
3. **Contract service and the employee rules.** *Tests (in-memory):* every rule T1 to T19; each status transition and each refusal; renewal of an active and of an ended contract, the old one becoming `superseded`; one active at a time; the employee summary set on activation, replaced on renewal and cleared on end and terminate (and left alone when it points to another contract); `end` and `terminate` date limits; draft-only correction; tenant isolation; stale version; reads write no log; writes log no values; the status rules of T15 on the employee service (leaving onboarding without a contract, `probation` for a type that does not allow it, and the allowed cases).
4. **Endpoints.** Controllers, DTOs, module, permissions, wiring. *Gateway tests:* 401 and 403 for each of the three permissions; create, read, list, correct, activate, end, terminate; 404 for malformed, missing and foreign ids; 409 for a duplicate number, a second active contract, a second renewal and a stale version; 422 for the rules the DTO cannot see; validation (400); the employee status endpoint refusing `onboarding` to `probation` without a contract and accepting it after activation; reads write only the access log; writes log no values.
5. **Checks.** `tsc` for all apps and specs, `oxlint`, full `vitest`, `nest build gateway_hr`.

## 5. Pull requests

| PR | Kind | Content |
|---|---|---|
| A | Docs | Group 2.2 status updates, the `stack.md` encryption context, and this plan (branch `docs/workforce-private-profile`). |
| B | Code | Group 2.3 (branch `feat/gateway-hr-contracts`, cut from `main`). |
| C | Docs | After B merges: permission table and status updates. |

## 6. Review focus

1. Two requests activate two contracts of one employee at once: one succeeds, the other gets 409, and the employee summary names the winner.
2. Activating a renewal supersedes the old contract and updates the summary in one transaction; if the new contract fails to activate, the old one stays active and the summary is unchanged.
3. Ending or terminating a contract clears the summary only when it points to that contract, and never changes the employee's status.
4. `PATCH` changes drafts only, and never the employee, employer or number.
5. A fixed-term type without an end date, probation for a type that does not allow it, and an end before the start are all refused.
6. An employee cannot leave onboarding without an active contract, and cannot enter probation on a type that does not allow it.
7. No log entry holds a contract number, a date or a name.
