# gateway_hr 7: Worker expiry and eligibility jobs

Status: **Built** (PR #117 runner and licences, #118 SPKs, #119 eligibility sweep). Confirmed 2026-11-18. Decisions WJ1 to WJ15 and the three code PRs confirmed as proposed, including the five that needed an answer (WJ2, WJ4, WJ8, WJ9, WJ10). Part of `2026-11-10-gateway-hr-plan.md` (walkthrough order 26). No new endpoint: this group is scheduled work in the `worker` application. Business rules: `../../business/administrative-operational-system/human-resource-management.md` 6.4.4 (licence expiry), 7.3 and `HR-CRD-003` (SPK expiry), 8.5.4 (`HR-ROS-030` to `032`, eligibility changes after publication) and the alert tables 6.6, 7.6, 8.6 (not built here). Built references: the worker's relays (`apps/worker/src/change-relay`, `event-relay`), `EligibilityService.general`, licences (3c), SPKs and grants (3g, 3h, `supervisor-links.ts`), roster assignments (3m, the `flag` field that nothing sets yet), the event outbox (`database.md` 7.1).

Today nothing moves a record on its own. A `valid` licence past its expiry date stays `valid` and an `active` SPK past its end stays `active`; every consumer therefore reads the dates too (3c, 3g). A practitioner who loses a licence or an SPK stays on the published roster with no warning (`HR-ROS-030`). This group adds three daily jobs that make the stored state match the dates and flag the roster.

## 1. The three jobs

| Job | Does | Actor |
|---|---|---|
| J1 `license-expiry` | Sets `valid` licences whose expiry date has passed to `expired` (HR spec 6.4.4 step 1). | `license-expiry-job` |
| J2 `appointment-expiry` | Sets `active` and `suspended` SPKs whose last valid day has passed to `expired`, and raises the supervisor flags of the grants that stop being effective (`HR-CRD-006`). | `appointment-expiry-job` |
| J3 `eligibility-sweep` | Checks the planned assignments of published rosters for the coming `ROSTER_LOOKAHEAD_DAYS`. An assignment whose employee is no longer generally eligible is **flagged, not cancelled** (`HR-ROS-031`); a flagged one whose employee is eligible again is resolved. | `eligibility-sweep-job` |

Practice schedule sessions need no job: they carry `eligible` and `failed` derived on every read (5.8 PS2), so a doctor who lost a permit is shown as not eligible without any stored flag. J3 runs after J1 and J2 in each pass, so a licence expired in the pass is already seen by the sweep.

## 2. The rules

| # | Rule or decision | Proposed |
|---|---|---|
| WJ1 | **Scope.** The three jobs above, in the existing `worker` application, with no new endpoint and no new dependency. Everything else stays out (WJ15). | As stated. |
| WJ2 | **Scheduling.** A runner wakes every `HR_JOBS_INTERVAL_MS` (default one hour) and runs the three jobs in order. Each job is idempotent and selects its work by date, so a pass that finds nothing is cheap and a restart or a missed pass loses nothing: the next pass catches up. No cron library and no fixed time of day. A date-based record is therefore changed within one interval of its date passing, not at midnight sharp. | **Needs your answer:** hourly passes (as stated), or a fixed daily time? |
| WJ3 | **One runner at a time.** A tiny collection `job_leases` (one document per job name: `owner`, `expires_at`) gives the lease, like the relays' lease; an instance that does not hold it skips the job. It is not business data and is not recorded in the change history. Two workers cannot flag or expire the same record twice, and each write still carries the record's `version`, so a race fails safely (409) and is retried on the next pass. | As stated. |
| WJ4 | **Reads across tenants.** The worker serves every tenant, so each job uses **named cross-tenant reads** on the repository (`findValidExpiredBefore(date, limit)`, `findOpenEndedBefore(date, limit)`, ...), documented as "for jobs only". Every other repository read keeps filtering by `tenant_id` (`database.md` 4.5); each record found is then handled with its own `tenant_id`, and a job never mixes tenants in one transaction. | **Needs your answer:** named cross-tenant reads for jobs (as stated), or enumerate tenants first and query per tenant? |
| WJ5 | **J1 licences.** Selects `valid` licences with an expiry date before today in UTC (a licence has no facility zone, 3c). Each is set to `expired` with `status_effective_date` the day after the expiry date, in its own transaction, through the repository so the change history records it (reason `license_expired`, actor `license-expiry-job`). `is_live` stays true (only a rejected record frees its document number). A superseded, revoked, rejected or pending licence is never touched. Eligibility keeps reading the dates, so nothing changes for it. | As stated. |
| WJ6 | **J2 SPKs.** Selects `active` and `suspended` SPKs whose `valid_period.end` is before today **in the credentialing facility's zone** (UTC when it cannot be read). Each is set to `expired` with `is_current` false in one transaction with the supervisor flags of its `full` grants (the same `supervisor-links.ts` function as a suspension, 3g). Its grants are left as they are: eligibility reads the SPK status (`HR-CRD-001`, `HR-CRD-003`). An `expired` SPK is final. A suspended SPK past its end also expires, which ends the wait for a Director's lift. | As stated. |
| WJ7 | **J3 window.** The sweep reads the `planned` assignments of `published` rosters dated from today to today plus `ROSTER_LOOKAHEAD_DAYS` (default 14), read at the assignment's unit; the employee's eligibility on that date is checked with `EligibilityService.general` (conditions 1 to 4), once per employee, unit and date. Only clinical employees in clinical units are checked (`HR-ROS-002`). Assignments of `closed` rosters and past dates are never touched. The lookahead is the one parameter this job reads. | As stated. |
| WJ8 | **J3 flags.** A failing assignment gets `flag = { reason: 'eligibility_lost', failed, at, resolved_at: null }` and `is_flagged` true, written with its own `version` and recorded in the change history (reason `eligibility_lost`, actor `eligibility-sweep-job`). `failed` is the first failing condition (`employment`, `str`, `sip` or `spk`). A flagged assignment whose employee is eligible again gets `resolved_at` and `is_flagged` false. Flagging does **not** raise the roster's `revision` (nobody changed the plan) and never cancels. The on-duty read already leaves flagged assignments out (3m), so clinical modules treat the person as not on duty (`HR-ROS-031`). | **Needs your answer:** resolve automatically when the employee is eligible again (as stated), or leave every flag open for HR to resolve by hand (a route not built)? |
| WJ9 | **Alerts.** There is no notification module. The jobs append **events** to the event outbox in the same transaction as the change: `workforce.license.expired`, `workforce.appointment.expired` and `workforce.assignment.flagged` (and `.resolved`), with identifiers, codes and dates only (`database.md` 7.1). A notification consumer can subscribe later without touching the jobs. The threshold alerts before an expiry (`LICENSE_ALERT_DAYS`, `RECREDENTIAL_LEAD_DAYS`) and the SKP shortfall of `HR-LIC-010` are **not** built here: they need a record of which threshold was already sent, which belongs to the notification plan. The identity consumer already ignores event types it does not know. | **Needs your answer:** events for the state changes only (as stated), or also the threshold alerts now? |
| WJ10 | **Batches and failures.** Each job reads at most `HR_JOBS_BATCH_SIZE` records per pass (default 200, 1 to 1000) and handles each in its own transaction, so one failing record does not stop the others; it is counted, logged by error class, and retried on the next pass. A full batch makes the runner run the job again at once until a batch is not full. Unlike the relays, a failing record does **not** block the ones behind it, because jobs have no order to keep. | **Needs your answer:** continue past a failing record (as stated), or stop the pass at the first failure like the relays? |
| WJ11 | **Request context.** Each record is handled inside `runWithRequestContext` with a fresh `correlation_id` and the job's system actor, so the change record and the event carry them (`logging.md` 8, 13.2). The jobs write no `updated_by` field (`database.md` 4.5). | As stated. |
| WJ12 | **Logging.** One operational entry per job pass, only when it found work or failed: `event: 'hr_job'`, `operation` (`license-expiry`, ...), `outcome`, `count`, `failed`, `durationMs`, and `error` and `retryable` on failure. Never an employee, licence, date or number. A lease not held writes a `debug` entry. A job that falls behind (the oldest due record is older than two intervals) warns with `event: 'hr_job_lag'`. | As stated. |
| WJ13 | **Configuration.** The optional context `jobs.env` (`stack.md` 3.6), read through `JobsConfig`: `HR_JOBS_ENABLED` (true), `HR_JOBS_INTERVAL_MS` (3600000, at least 60000), `HR_JOBS_BATCH_SIZE` (200), `HR_JOBS_LEASE_SECONDS` (300, at least twice the longest expected pass). Only the worker loads it. `HR_JOBS_ENABLED=false` turns the runner off on an instance. | As stated. |
| WJ14 | **Module boundary.** The jobs live in `apps/workforce/jobs/` as `WorkforceJobsModule`, which imports only the repository modules it reads and writes (licences, SPKs, grants, roster assignments, rosters, employees, units, facilities, parameters, the lease), like `IdentityEventsModule`, so the worker needs neither the JWT secret nor the encryption keys. The runner (`apps/worker/src/hr-jobs/`) owns only timing and the lease. | As stated. |
| WJ15 | **Not built here.** The threshold alerts and every notification, the SKP shortfall alert, activating `planned` position assignments and ending them at separation, the expiry of mandatory training, a route to resolve a flag by hand, the practice-schedule flag (derived on read), a job run history or a manual trigger, and licence expiry in a facility's zone. | As stated. |

## 3. Repository and code

No new endpoint, model or classification; the models already hold `expired`, `flag` and `is_flagged`.

- **Repositories.** New named cross-tenant reads: `ProfessionalLicenseRepository.findValidExpiredBefore(date, limit)`; `ClinicalAppointmentRepository.findCurrentEndedBefore(date, limit)` (the facility zone is applied by the job, so the read takes the latest date any zone could have reached and the job rechecks); `RosterAssignmentRepository.findPlannedPublishedBetween(from, to, limit, afterId)` and a write path for the flag (the existing `update` with the changed fields, or a small named method if a partial update is not possible). New: `JobLeaseRepository` (token, interface, schema, Mongo implementation, in-memory fake), with `acquire(job, owner, leaseMs)`. Indexes: licences `{ status, expiry_date }`, SPKs `{ status, 'valid_period.end' }`, assignments `{ status, date }` (a partial index on `is_flagged` already exists); each is added to the design documents.
- **Events.** `workforce.license.expired`, `workforce.appointment.expired`, `workforce.assignment.flagged` and `.resolved` and their payload types in `workforce-event.ts` (`database.md` 7.1); an emit inside each writing transaction.
- **Services.** `LicenseExpiryJob`, `AppointmentExpiryJob`, `EligibilitySweepJob` in `apps/workforce/jobs/`, each with a `run(now, batch)` that returns `{ count, failed, more }`; they reuse `supervisor-links.ts`, `EligibilityService.general` and `ParameterService.resolve`.
- **Worker.** `HrJobsRunner` in `apps/worker/src/hr-jobs/` (timer, lease, order of the jobs, the logging of WJ12) and its module; `JobsConfig` in `apps/configuration/jobs.ts`, concatenated into `ConfigSchema`; `environment/<env>/jobs.env`; `WorkerModule` registers them.

```
apps/back-end/apps/
├── repository/{token.ts,interface,mongo,mongo/schema}/job-lease*.ts     (+ specs, module)
├── repository/{interface,mongo}/{professional-license,clinical-appointment,roster-assignment}  (named reads)
├── repository/model/workforce-event.ts                      the four events
├── workforce/jobs/{license-expiry,appointment-expiry,eligibility-sweep}.job.ts   (+ specs, module)
├── worker/src/hr-jobs/                                      runner and module
└── configuration/jobs.ts, environment/<env>/jobs.env
```

## 4. Tasks and pull requests

| PR | Kind | Content |
|---|---|---|
| A | Docs | This plan, the master plan row (branch `docs/worker-hr-expiry-jobs-plan`). |
| B1 | Code | The runner, `JobsConfig`, the lease, `LicenseExpiryJob` with its cross-tenant read, the event, and the tests. |
| B2 | Code | `AppointmentExpiryJob` with the supervisor flags, its read and event, and the tests. |
| B3 | Code | `EligibilitySweepJob`, the assignment reads and flag write, the two events, and the tests. |
| C | Docs | After each code PR as needed, then the "built" docs PR (`workforce.md`, `authentication.md` if the worker's section changes, `database.md` indexes, the design documents, the plan status, the master plan counts). |

Tests come first: each job on the date edges (expiry date today and yesterday, a suspended and an already expired SPK, a licence in each other status), the facility zone of an SPK, idempotence (a second pass changes nothing and writes no second event or change record), tenant isolation (each record keeps its own `tenant_id`), a stale version skipped and retried, one failing record not stopping the others, a full batch running again, the lease (a second instance skips, an expired lease is taken), the sweep (a lost licence, a lost SPK, a suspended employee, a flag resolved when eligible again, a non-clinical unit ignored, a closed roster and a past date untouched, the on-duty read leaving the flagged person out), the events (written once, with the correlation id, no personal values), the logs (one summary, no values) and the configuration schema. Checks: `tsc` for all three applications, `oxlint`, the full `vitest` and `nest build` for `worker` and `gateway_hr`, run from `apps/back-end` under Node 22 (`pnpm` does not start on this machine).

## 5. Review focus

1. A record is expired or flagged because of its date and its own tenant's data, never because of another tenant's.
2. The jobs are idempotent and race-safe: no double change record, event or flag, whatever the number of workers.
3. A flag never cancels and never changes the roster's plan; resolving is explicit about the rule it follows (WJ8).
4. Dates use the right zone: UTC for licences, the credentialing facility's for SPKs, the unit's for assignments.
5. Logs and events carry identifiers, counts and codes only.

## 6. Decisions that needed your answer

Confirmed as proposed. These five changed the shape of the work most:

- **WJ2:** passes every hour, or a fixed daily time.
- **WJ4:** named cross-tenant reads for jobs, or list the tenants first and query per tenant.
- **WJ8:** a flag resolves automatically when the employee is eligible again, or stays open for HR.
- **WJ9:** events for the state changes only, or the threshold alerts now.
- **WJ10:** a failing record is skipped and retried, or it stops the pass like the relays.

The others are as stated. Open, not decided here: how notifications are delivered (the next plan), and Q1 (an STR with a printed expiry date: `HR-LIC-004`), which decides whether J1 touches STRs issued before `REG-UU17`.

## 7. Build notes

Built as planned (WJ1 to WJ15) in three code PRs. Differences and details worth knowing:

- **No cross-tenant assignment read.** The plan listed `findPlannedPublishedBetween` on the assignments. The sweep instead reads published rosters across tenants (`RosterRepository.findPublishedEndingOnOrAfter`, paged by identifier) and each roster's assignments through the existing tenant-scoped `findByRoster`, so only three cross-tenant reads exist: licences, SPKs and rosters. Indexes: `{ status, expiry_date }`, `{ status, 'valid_period.end' }` and `{ status, 'period.end' }`.
- **The lease is a port, not a repository.** `JobLease` (`@utility/jobs/lease`) with the Mongo collection `job_leases` is provided by the connection module like the outboxes; the plan described a repository with a model.
- **SPK zone.** The SPK read takes every SPK ending on or before today in UTC and the job rechecks each against today in its credentialing facility's zone, because no single date works for all zones. Not-yet-due SPKs sort last and are skipped; a very large number ending on one date could fill a batch with them.
- **Sweep window and paging.** Rosters that ended yesterday in UTC are still read, because a zone behind UTC can still have today. A pass stops after `HR_JOBS_BATCH_SIZE` changes and says `more`; the next pass restarts from the first roster, and the assignments already changed no longer change, so it always moves on.
- **Lag.** The plan's `hr_job_lag` ("the oldest due record is older than two intervals") is implemented as "a job still fills whole batches after 20 immediate re-runs", because the jobs select by date and a per-record age would not mean much at date granularity. A steady `failed` count is the signal for records that keep failing.
- **Event names.** `workforce.license.expired`, `workforce.appointment.expired`, `workforce.assignment.flagged` and `workforce.assignment.flag_resolved` (the plan wrote `.resolved`). A flagged assignment's resolve is automatic only when the employee is eligible again (WJ8); there is still no route to resolve a flag by hand.
- **Failure handling.** A failing record is counted and skipped (WJ10); the runner logs one `hr_job` summary with the last error class and the retry flag. A job that throws is logged as an error and the next job still runs.
- `WorkforceJobsModule` provides `EligibilityService`, `ParameterService` and `CodeConceptService` itself and imports the repository modules (licences, SPKs, grants, facilities, employees, units, parameters, organizations, code concepts, rosters, assignments), so the worker still needs no JWT secret or encryption key.
- **Tests.** Each job against in-memory repositories (date edges, zones, tenants, idempotence, batches, stale version, failures, events without values), the runner with fake jobs, the leases (in-memory and Mongo with a mocked model), the config schema, and the three repository reads with a mocked model. **Not tested:** a real replica set, the Nest provider wiring of `WorkforceJobsModule` and a worker started against a real MongoDB.
