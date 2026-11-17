import { randomUUID } from 'node:crypto'
import { Inject, Injectable } from '@nestjs/common'
import { RepositoryError } from '@utility/database/error'
import {
  TRANSACTION_MANAGER,
  type TransactionManager,
} from '@utility/database/transaction'
import { EVENT_OUTBOX, type EventOutbox, newEvent } from '@utility/events/event'
import { systemActor } from '@utility/history/actor'
import { withChangeReason } from '@utility/history/reason'
import { runWithRequestContext } from '@utility/logger/context'
import { todayInZone, todayUtc } from '@utility/validation/local-date'
import { type EmployeeRepository } from '@repository/interface/employee'
import { type FacilityRepository } from '@repository/interface/facility'
import { type OrganizationUnitRepository } from '@repository/interface/organization-unit'
import { type RosterAssignmentRepository } from '@repository/interface/roster-assignment'
import { type RosterRepository } from '@repository/interface/roster'
import { type Employee } from '@repository/model/employee'
import { type OrganizationUnit } from '@repository/model/organization-unit'
import { type Roster } from '@repository/model/roster'
import { type RosterAssignment } from '@repository/model/roster-assignment'
import {
  WORKFORCE_EVENTS,
  type AssignmentFlagPayload,
} from '@repository/model/workforce-event'
import {
  REPOSITORY_EMPLOYEE,
  REPOSITORY_FACILITY,
  REPOSITORY_ORGANIZATION_UNIT,
  REPOSITORY_ROSTER,
  REPOSITORY_ROSTER_ASSIGNMENT,
} from '@repository/token'
import { addDays } from '../credentialing/appointment-rules'
import {
  EligibilityService,
  type EligibilityFailure,
} from '../eligibility/eligibility.service'
import { ParameterService } from '../parameter/parameter.service'
import { type HrJob, type JobPassResult } from './job'

/**
 * System actor of the job, as written in the change history.
 */
const ACTOR = 'eligibility-sweep-job'

/**
 * Rosters read per page, and assignments read per page of a roster.
 */
const PAGE_SIZE = 100

/**
 * Lookahead used when the parameter cannot be read (the catalog default of `ROSTER_LOOKAHEAD_DAYS`).
 */
const DEFAULT_LOOKAHEAD_DAYS = 14

/**
 * What one unit of the sweep needs: the unit, its zone and its lookahead.
 */
interface UnitScope {
  unit: OrganizationUnit
  today: string
  to: string
}

/**
 * Checks the planned assignments of published rosters for the coming `ROSTER_LOOKAHEAD_DAYS` and
 * flags, not cancels, the ones whose employee is no longer generally clinically eligible
 * (`HR-ROS-030`, `031`, `032`, plan 7 WJ7 and WJ8). An open flag is resolved when the employee is
 * eligible again. Only clinical employees in clinical units are checked (`HR-ROS-002`); closed
 * rosters, past dates and closed units are never touched. The sweep does not raise the roster's
 * revision, because nobody changed the plan. The on-duty read already leaves flagged assignments
 * out. Each change is its own transaction with its event and its own tenant.
 */
@Injectable()
export class EligibilitySweepJob implements HrJob {
  readonly name = 'eligibility-sweep'

  /**
   * @param rosters - Roster repository.
   * @param assignments - Roster assignment repository.
   * @param employees - Employee repository.
   * @param units - Organization unit repository.
   * @param facilities - Facility repository, for the time zone.
   * @param eligibility - The eligibility rule.
   * @param parameters - HR parameters, for the lookahead.
   * @param transactions - Transaction manager of the main connection.
   * @param events - Event outbox of the main connection.
   */
  constructor(
    @Inject(REPOSITORY_ROSTER) private readonly rosters: RosterRepository,
    @Inject(REPOSITORY_ROSTER_ASSIGNMENT)
    private readonly assignments: RosterAssignmentRepository,
    @Inject(REPOSITORY_EMPLOYEE) private readonly employees: EmployeeRepository,
    @Inject(REPOSITORY_ORGANIZATION_UNIT)
    private readonly units: OrganizationUnitRepository,
    @Inject(REPOSITORY_FACILITY)
    private readonly facilities: FacilityRepository,
    @Inject(EligibilityService)
    private readonly eligibility: EligibilityService,
    @Inject(ParameterService) private readonly parameters: ParameterService,
    @Inject(TRANSACTION_MANAGER)
    private readonly transactions: TransactionManager,
    @Inject(EVENT_OUTBOX) private readonly events: EventOutbox,
  ) {}

  /**
   * Sweeps the published rosters, at most `batchSize` changes. When the limit is reached it says
   * more may be due; the next pass starts again from the first roster, and what it already
   * changed is no longer a change, so it always moves on.
   *
   * @param now - The current time.
   * @param batchSize - Most flags set or resolved in this pass.
   * @returns What the pass did, `count` being flags set plus flags resolved.
   */
  async run(now: Date, batchSize: number): Promise<JobPassResult> {
    const result: JobPassResult = { count: 0, failed: 0, more: false }
    const memo = new Memo()
    // A roster that ended yesterday UTC can still have today's shifts in a zone behind UTC.
    const since = addDays(todayUtc(now), -1)
    let afterId: string | undefined
    for (;;) {
      const page = await this.rosters.findPublishedEndingOnOrAfter(
        since,
        PAGE_SIZE,
        afterId,
      )
      for (const roster of page) {
        await this.sweepRoster(roster, now, batchSize, result, memo)
        if (result.count >= batchSize) {
          result.more = true
          return result
        }
      }
      if (page.length < PAGE_SIZE) {
        return result
      }
      afterId = page[page.length - 1]?.id
    }
  }

  /**
   * Sweeps one roster. A failure in the roster's own set-up is counted once and the roster is
   * skipped until the next pass.
   *
   * @param roster - A published roster.
   * @param now - The current time.
   * @param batchSize - Most changes in the pass.
   * @param result - The pass result, updated.
   * @param memo - What was already read in this pass.
   */
  private async sweepRoster(
    roster: Roster,
    now: Date,
    batchSize: number,
    result: JobPassResult,
    memo: Memo,
  ): Promise<void> {
    try {
      const scope = await this.scopeOf(roster, now, memo)
      if (scope === null) {
        return
      }
      for (let offset = 0; ; offset += PAGE_SIZE) {
        const page = await this.assignments.findByRoster(
          roster.tenant_id,
          roster.id,
          {
            status: 'planned',
            from: scope.today,
            to: scope.to,
            limit: PAGE_SIZE,
            offset,
          },
        )
        for (const assignment of page) {
          await this.sweepAssignment(roster, scope, assignment, now, result, memo)
          if (result.count >= batchSize) {
            return
          }
        }
        if (page.length < PAGE_SIZE) {
          return
        }
      }
    } catch (error: unknown) {
      this.recordFailure(result, error)
    }
  }

  /**
   * Checks one assignment and flags or resolves it. A failure is counted and the sweep goes on.
   *
   * @param roster - The roster.
   * @param scope - The roster's unit, today and the end of the window.
   * @param assignment - A planned assignment in the window.
   * @param now - The current time.
   * @param result - The pass result, updated.
   * @param memo - What was already read in this pass.
   */
  private async sweepAssignment(
    roster: Roster,
    scope: UnitScope,
    assignment: RosterAssignment,
    now: Date,
    result: JobPassResult,
    memo: Memo,
  ): Promise<void> {
    try {
      const employee = await this.employeeOf(roster.tenant_id, assignment, memo)
      if (employee === null || !employee.is_clinical) {
        return
      }
      const verdict = await this.verdictOf(
        roster.tenant_id,
        employee,
        scope.unit,
        assignment.date,
        memo,
      )
      const open = assignment.flag !== null && assignment.flag.resolved_at === null
      if (verdict !== null && !open) {
        await this.flag(roster, assignment, verdict, now)
        result.count += 1
      } else if (verdict === null && open) {
        await this.resolve(roster, assignment, now)
        result.count += 1
      }
    } catch (error: unknown) {
      this.recordFailure(result, error)
    }
  }

  /**
   * Reads the unit, its zone and its lookahead once per unit in a pass. A roster of a closed,
   * missing, foreign or non-clinical unit has nothing to check.
   *
   * @param roster - The roster.
   * @param now - The current time.
   * @param memo - What was already read in this pass.
   * @returns The scope, or `null` when the roster is not swept.
   */
  private async scopeOf(
    roster: Roster,
    now: Date,
    memo: Memo,
  ): Promise<UnitScope | null> {
    const cached = memo.scopes.get(roster.unit_id)
    if (cached !== undefined) {
      return cached
    }
    const unit = await this.units.findOne(roster.unit_id)
    let scope: UnitScope | null = null
    if (
      unit &&
      unit.tenant_id === roster.tenant_id &&
      !unit.deleted_at &&
      unit.status === 'active' &&
      unit.is_clinical
    ) {
      const facility = await this.facilities.findOne(unit.facility_id)
      const today = todayInZone(facility?.timezone ?? 'UTC', now)
      scope = { unit, today, to: addDays(today, await this.lookahead(unit)) }
    }
    memo.scopes.set(roster.unit_id, scope)
    return scope
  }

  /**
   * Reads `ROSTER_LOOKAHEAD_DAYS` at the unit.
   *
   * @param unit - The unit.
   * @returns The number of days; the catalog default when the value is not a whole number.
   */
  private async lookahead(unit: OrganizationUnit): Promise<number> {
    const { value } = await this.parameters.resolve(unit.tenant_id, {
      key: 'ROSTER_LOOKAHEAD_DAYS',
      unitId: unit.id,
    })
    return typeof value === 'number' && Number.isInteger(value) && value > 0
      ? value
      : DEFAULT_LOOKAHEAD_DAYS
  }

  /**
   * Loads the employee of an assignment once per employee in a pass.
   *
   * @param tenantId - Tenant of the roster.
   * @param assignment - The assignment.
   * @param memo - What was already read in this pass.
   * @returns The employee, or `null` when missing, foreign or deleted.
   */
  private async employeeOf(
    tenantId: string,
    assignment: RosterAssignment,
    memo: Memo,
  ): Promise<Employee | null> {
    const key = assignment.employee_id
    if (memo.employees.has(key)) {
      return memo.employees.get(key) ?? null
    }
    const employee = await this.employees.findOne(key)
    const usable =
      employee && employee.tenant_id === tenantId && !employee.deleted_at
        ? employee
        : null
    memo.employees.set(key, usable)
    return usable
  }

  /**
   * Checks general eligibility once per employee, unit and date in a pass.
   *
   * @param tenantId - Tenant of the roster.
   * @param employee - The employee.
   * @param unit - The unit.
   * @param date - The date of the shift.
   * @param memo - What was already read in this pass.
   * @returns The failing condition, or `null` when the employee is eligible.
   */
  private async verdictOf(
    tenantId: string,
    employee: Employee,
    unit: OrganizationUnit,
    date: string,
    memo: Memo,
  ): Promise<EligibilityFailure | null> {
    const key = `${employee.id}|${unit.id}|${date}`
    if (memo.verdicts.has(key)) {
      return memo.verdicts.get(key) ?? null
    }
    const answer = await this.eligibility.general(tenantId, employee, unit, date)
    const verdict = answer.eligible ? null : answer.failed
    memo.verdicts.set(key, verdict)
    return verdict
  }

  /**
   * Flags an assignment and announces it, in one transaction. The write carries the version that
   * was read, so an assignment changed meanwhile fails and is retried on the next pass.
   *
   * @param roster - The roster.
   * @param assignment - The assignment.
   * @param failed - The failing condition.
   * @param now - The time of the pass.
   */
  private flag(
    roster: Roster,
    assignment: RosterAssignment,
    failed: EligibilityFailure,
    now: Date,
  ): Promise<void> {
    return this.write(
      'eligibility_lost',
      roster,
      assignment,
      {
        flag: { reason: 'eligibility_lost', failed, at: now, resolved_at: null },
        is_flagged: true,
      },
      WORKFORCE_EVENTS.ASSIGNMENT_FLAGGED,
      failed,
    )
  }

  /**
   * Resolves the open flag of an assignment whose employee is eligible again, and announces it.
   *
   * @param roster - The roster.
   * @param assignment - The flagged assignment.
   * @param now - The time of the pass.
   */
  private resolve(
    roster: Roster,
    assignment: RosterAssignment,
    now: Date,
  ): Promise<void> {
    return this.write(
      'eligibility_restored',
      roster,
      assignment,
      {
        flag: assignment.flag ? { ...assignment.flag, resolved_at: now } : null,
        is_flagged: false,
      },
      WORKFORCE_EVENTS.ASSIGNMENT_FLAG_RESOLVED,
    )
  }

  /**
   * Writes a flag change and its event in one transaction, in a fresh request context with the
   * job's system actor and the reason in the change history.
   *
   * @param reason - Reason kept with the change.
   * @param roster - The roster.
   * @param assignment - The assignment as read.
   * @param changes - The flag fields to write.
   * @param eventType - The event to announce.
   * @param failed - The failing condition, when flagging.
   */
  private async write(
    reason: string,
    roster: Roster,
    assignment: RosterAssignment,
    changes: { flag: RosterAssignment['flag']; is_flagged: boolean },
    eventType: string,
    failed?: EligibilityFailure,
  ): Promise<void> {
    await runWithRequestContext(
      { correlationId: randomUUID(), actor: systemActor(ACTOR) },
      () =>
        withChangeReason(reason, () =>
          this.transactions.run(async () => {
            const updated = await this.assignments.update(assignment.id, changes, {
              expectedVersion: assignment.version,
            })
            await this.events.append(
              newEvent({
                tenantId: roster.tenant_id,
                type: eventType,
                aggregate: {
                  type: 'roster_assignment',
                  id: updated.id,
                  version: updated.version,
                },
                payload: {
                  assignment_id: updated.id,
                  roster_id: roster.id,
                  unit_id: roster.unit_id,
                  employee_id: updated.employee_id,
                  date: updated.date,
                  ...(failed === undefined ? {} : { failed }),
                } satisfies AssignmentFlagPayload as unknown as Record<
                  string,
                  unknown
                >,
              }),
            )
          }),
        ),
    )
  }

  /**
   * Counts a failure with its error class and retry flag, never a message.
   *
   * @param result - The pass result, updated.
   * @param error - The error.
   */
  private recordFailure(result: JobPassResult, error: unknown): void {
    result.failed += 1
    result.error = error instanceof Error ? error.name : 'UnknownError'
    result.retryable = error instanceof RepositoryError ? error.retryable : true
  }
}

/**
 * What one pass already read, so a unit, an employee or an eligibility question is asked once.
 */
class Memo {
  readonly scopes = new Map<string, UnitScope | null>()
  readonly employees = new Map<string, Employee | null>()
  readonly verdicts = new Map<string, EligibilityFailure | null>()
}
