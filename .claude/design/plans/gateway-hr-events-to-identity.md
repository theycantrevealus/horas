# HR events to identity

Status: **In discussion** (2026-11-13). Not an endpoint group: it sits between `2.3 Employment contracts` and `2.4 Position assignments` in `2026-11-10-gateway-hr-plan.md` (row 9a). Design: `../account-and-workforce-collections.md` 6.1 to 6.4 and 6.6, `../data-change-history.md`, `../../rules/back-end/database.md` 7.1. Existing pattern to follow: the change outbox and its relay (`logging.md` 13, `apps/worker/src/change-relay/`).

**This plan changes how accounts are disabled, so under `git-workflow.md` 5 it needs your explicit decision before any code.** It touches the identity module (holds and sessions) and adds a second outbox, a second relay and a new consumer.

## 1. The problem

Since group 2.1, an employee's status can change to `suspended` or `separated`, and since 2.3 a contract can end. Nothing tells the identity module. A person who has left the hospital keeps a working account until an administrator happens to place a hold on it by hand (known gap E18). The design already says what should happen (6.3): HRM writes an event in the same transaction as the change, a relay publishes it after commit, and identity reacts by placing or lifting holds and ending sessions. This group builds that path, small, and only for the reactions that are decided and safe.

## 2. What gets built

```
workforce write ──▶ TransactionManager.run
                     1. write the data (employee status, contract)
                     2. EventOutbox.append(event)         ← new, same transaction
                    commit (or both roll back)
worker: EventRelayService ──▶ outbox_events (pending, in order)
                          ──▶ every registered EventConsumer
                          ──▶ mark published
identity: WorkforceEventConsumer (one consumer)
          ──▶ transaction: apply the reaction + record processed_events
              (place or lift an account hold, end sessions)
```

| Part | What it is |
|---|---|
| **Event outbox** | A collection `outbox_events` and a port `EventOutbox` (`apps/utility/events/`), written through the connection like the change outbox. Documents follow design 6.4. Not business data: it is not recorded in the change history. |
| **Emitters** | `EmployeeService.changeStatus` and `ContractService` activate, end and terminate append an event inside the transaction that already writes their data. |
| **Relay** | `EventRelayService` in the worker: lease, ordered batches, retry with backoff, lag warning, one operational summary per pass. A copy of the change relay's behaviour with its own lease. |
| **Consumer** | `WorkforceEventConsumer` in `apps/identity/events/`, in its own small module that imports only the account and session repositories (the worker needs no JWT secret). |
| **Dedupe** | `processed_events` (`consumer`, `event_id` unique, TTL 30 days), written in the same transaction as the reaction, so a redelivered event does nothing the second time. |

No HTTP endpoint is added. Operators see the relay through the operational log (`event_relay`, `event_relay_lag`).

## 3. Decisions to confirm

| # | Rule or decision | Proposed |
|---|---|---|
| H1 | **Same database, in-process delivery.** The relay and the consumer run in the worker process and call the consumer directly. The event envelope is the one a message broker would carry, so moving delivery to Kafka later changes the relay only, not the emitters or the consumer. | As stated. |
| H2 | **Event contract.** Events are named `workforce.<aggregate>.<what>`. The payload holds identifiers, codes and dates only, never names, numbers, contacts or the HR reason. The payload types live in `apps/repository/model/workforce-event.ts`, which both contexts may import, so identity never imports a workforce service (`workforce.md` 1). | As stated. |
| H3 | **Events emitted now.** `workforce.employee.status_changed` for every status change (`employee_id`, `from_status`, `to_status`, `effective_date`), and `workforce.contract.activated`, `.ended` and `.terminated` (`contract_id`, `employee_id`, `organization_id`). The design's separate `employee.separated` event is not needed: `status_changed` with `to_status: separated` carries it. Registering an employee emits nothing (design: no account is created automatically). Assignment and committee events wait for their groups. | As stated. |
| H4 | **Order and delivery.** Events leave in the order they were written (outbox order), one relay holds the lease, delivery is at least once, and an event is marked published only after every consumer handled it. A failing event stops the pass and is retried with backoff (like the change relay), so no later event of the same employee overtakes it. The cost: one event that can never succeed blocks the ones behind it until an operator fixes the cause. The lag warning (`EVENT_RELAY_MAX_LAG_SECONDS`) says so. A blocked queue is deliberate: for account holds, "later but in order" is safer than "skipped". | Strict order, stop on failure. |
| H5 | **Reactions to `status_changed`** (design 6.3, defaults). To `suspended`: place a `suspend` hold with the reason `employment_suspended`, source `workforce`, `source_ref` the event id, and end every session. To `probation` or `active`: lift the holds of source `workforce` with the reason `employment_suspended`, and nothing else (a security hold, an administrator's hold and an `employment_ended` hold stay). To `separated`: place a `disable` hold with the reason `employment_ended` and end every session. An account is the one linked to the employee (`employee_id`). An employee without an account, and an already closed account, are ignored. The hold is placed by the system actor `workforce-events`. Each change bumps the account's `authz_version`, so tokens already issued stop working at the next request (`authentication.md` 3). | As stated. |
| H6 | **When a separation takes effect.** The design says "at the end of the effective date in the facility's time zone". An employee has no facility or time zone until assignments exist (2.4), and nothing yet can run a task at a future instant. So the hold is placed **as soon as the event is handled**, even when the effective date is today or tomorrow (the latest date 2.1 allows): the person loses access up to a day earlier than the design says, never later. This is the safe side. When assignments exist, the date can be read in the facility's zone and a scheduled end can replace this. | Apply at once. |
| H7 | **Contract events are published but ignored by identity for now.** The design reacts to `contract.ended` with no other active contract like a separation, unless a status change follows within a grace period. Group 2.3 decided that ending a contract does not change the employee's status, and a fixed-term contract often ends a day before its renewal is activated. Reacting would lock people out by accident, and the grace period needs a scheduler. The consumer therefore marks contract events handled and does nothing. The reason `contract_expired` is kept for a later decision with the tenant policy. | Publish, do not react. |
| H8 | **Rehire and reactivation.** An `employment_ended` hold is never lifted by an event (design 6.1). Separated is final in 2.1, so no event can ask for it. Re-enabling needs the approved account request, which is not built. | As stated. |
| H9 | **Dedupe and atomicity.** The consumer writes the hold, the session revocation and the `processed_events` record in one transaction. A redelivery finds its `event_id` and does nothing. `processed_events` entries expire after 30 days (design 6.4); an event is never redelivered after it was marked published, so 30 days outlives any retry. | As stated. |
| H10 | **Request context.** The relay starts a request context per event with the event's `correlation_id` and the system actor, so the hold's change record, the security audit entry and the operational log line share the correlation id of the original HR request (`logging.md` 8). | As stated. |
| H11 | **Configuration** is a new optional context `events.env` with defaults: `EVENT_RELAY_INTERVAL_MS` (1000), `EVENT_RELAY_BATCH_SIZE` (100), `EVENT_RELAY_MAX_LAG_SECONDS` (300), `EVENT_OUTBOX_KEEP_DAYS` (7, published events expire by a TTL index). The worker loads it; the gateways do not need it. | As stated. |
| H12 | **Security record.** Each hold placed or lifted by an event also writes a `security_events` entry (`account_hold_placed` or `account_hold_lifted` with the reason code and the event id, no values), next to the change record the account repository already writes. | As stated. |
| H13 | **Not built here:** the tenant policy `account_lifecycle_policy` (the defaults of H5 are fixed in code), the nightly reconciliation of design 6.6 (it needs a read port from identity to workforce and a scheduler), role derivation and assignment events, profile-changed events, events for employees whose status changed before this release (no production data exists yet; if any does, an operator places the holds by hand once), and a way to re-queue or skip a blocked event (an operator edits the outbox by hand until a tool exists). | Later. |
| H14 | **Operations.** From this release, **a worker that is down means holds are not applied**. The relay's lag warning fires after `EVENT_RELAY_MAX_LAG_SECONDS`, and the deployment must alert on it and keep at least one worker running. This is the new operational duty this group creates, and the PR will state it. | Stated in the PR. |
| H15 | **Pull requests.** Two code PRs, each small enough to review, and a docs PR after: **B1** the event outbox, the emitters in the workforce services and the relay (events are published and logged, no consumer yet), **B2** the identity consumer, `processed_events` and the hold reactions. The gap is closed only when B2 merges. | Two code PRs. |

## 4. Code structure

```
apps/back-end/apps/
├── configuration/events.ts                 EventsSchema, EventsConfig (`events` namespace), optional file
├── utility/
│   ├── events/
│   │   ├── event.ts                        OutboxEvent, newEvent(), EVENT_OUTBOX token, EventOutbox port, EventConsumer port, EVENT_CONSUMERS token
│   │   └── *.spec.ts
│   └── database/mongo.event-outbox.ts      Mongo EventOutbox; collections `outbox_events` and `event_relay_state`
├── repository/model/workforce-event.ts     the events and payloads of H3
├── workforce/
│   ├── employee/employee.service.ts        changeStatus: write and append in one transaction
│   └── contract/contract.service.ts        activate, end, terminate append inside their transaction
├── worker/src/event-relay/                 EventRelayService, EventRelayModule (+ spec)        [B1]
├── identity/events/                        WorkforceEventConsumer, IdentityEventsModule        [B2]
│   └── (processed_events repository: token, interface, schema, Mongo, in-memory)               [B2]
└── identity/account/account.service.ts     system hold and lift for the consumer (new methods, same status rules)  [B2]
```

`MongoMainConnectionModule` provides `EVENT_OUTBOX` next to `CHANGE_OUTBOX`, and `database.md` 2 gains one line for it. The in-memory gateway harness provides a fake `EVENT_OUTBOX` that keeps the events in an array, so gateway tests can assert them.

## 5. Tasks

Tests come first in each task.

**B1: outbox, emitters and relay**
1. **Event port and outbox.** `event.ts`, `mongo.event-outbox.ts`, config. *Tests:* `newEvent` takes the correlation id and time from the request context and gives unique ids; the fake outbox keeps order; the Mongo outbox maps documents without storage fields and refuses payload values that are not plain data (fake model).
2. **Emitters.** *Tests (in-memory, with a transaction spy):* every status change writes exactly one `status_changed` event in the same `run` as the data; a refused change (invalid transition, stale version) writes no event; contract activate, end and terminate write one event each, and a failing activation writes none; payloads hold only identifiers, codes and dates; the event carries the request's correlation id.
3. **Relay.** *Tests (fake outbox and consumers):* order, lease held by one instance, a failing consumer stops the pass and counts an attempt, backoff, lag warning, one summary entry per pass and none per event, an event is marked published only after all consumers handled it, events of a tenant never reach a consumer as another tenant's.

**B2: identity reaction**
4. **Consumer and repository.** `processed_events`, `WorkforceEventConsumer`, the account service's system hold methods. *Tests (in-memory identity):* each row of H5 (suspend and its sessions, lift only the workforce hold, separate and disable, security and administrator holds untouched); no account and closed account ignored; contract events ignored and recorded; a redelivered event does nothing; hold, revocation and the processed record share one transaction; the access token of a suspended account fails at its next request (`token_stale`); a hold placed by an event cannot be lifted through `liftHolds` of the administrator API (source differs), and an `employment_ended` hold needs the account request.
5. **End to end.** One spec wires the workforce service, the outbox, the relay and the consumer with in-memory repositories: changing a status to `separated` disables the linked account and ends its sessions; `active` after `suspended` lifts only the HR hold.
6. **Checks.** `tsc` for all apps and specs, `oxlint`, full `vitest`, `nest build` for the worker and `gateway_hr`.

## 6. Pull requests

| PR | Kind | Content |
|---|---|---|
| A | Docs | Group 2.3 status updates and this plan (branch `docs/workforce-contracts`). |
| B1 | Code | Event outbox, emitters, relay (branch `feat/worker-event-relay`). |
| B2 | Code | Identity consumer, `processed_events`, hold reactions (branch `feat/identity-workforce-events`). |
| C | Docs | After B2 merges: `authentication.md` (the account holds from HR events, what is still manual), `database.md` (event outbox), `workforce.md` (events, "not built yet"), `logging.md` (the relay's log events), and status updates. |

## 7. Review focus

1. A status change and its event commit together or not at all: no event for a refused change, no change without its event.
2. An event carries no name, number, contact, reason text or note.
3. A `suspended` employee's account stops working at its next request and gets its access back only from `active` or `probation`, and only the hold the event placed is lifted.
4. A `separated` employee's account is disabled and nothing an event does can re-enable it.
5. Redelivering an event changes nothing, and two relays never publish at the same time.
6. A blocked event is visible (lag warning, operational log) and does not silently drop later events.
7. The worker needs no JWT secret or encryption key to run the consumer.
