import { Inject, Injectable } from '@nestjs/common'
import {
  RepositoryConflictError,
  RepositoryNotFoundError,
} from '@utility/database/error'
import { type ActorRef } from '@utility/history/actor'
import { withChangeReason } from '@utility/history/reason'
import { getRequestContext } from '@utility/logger/context'
import { AppLogger } from '@utility/logger/service'
import { type CoverageRequirementRepository } from '@repository/interface/coverage-requirement'
import { type EmployeeRepository } from '@repository/interface/employee'
import { type FacilityRepository } from '@repository/interface/facility'
import { type HolidayCalendarRepository } from '@repository/interface/holiday-calendar'
import { type OrganizationUnitRepository } from '@repository/interface/organization-unit'
import { type RosterRepository } from '@repository/interface/roster'
import { type RosterAssignmentRepository } from '@repository/interface/roster-assignment'
import { type Coding } from '@repository/model/common/coding'
import { type Employee } from '@repository/model/employee'
import { type OrganizationUnit } from '@repository/model/organization-unit'
import { type Roster, type RosterValidation } from '@repository/model/roster'
import { type RosterAssignment } from '@repository/model/roster-assignment'
import {
  REPOSITORY_COVERAGE_REQUIREMENT,
  REPOSITORY_EMPLOYEE,
  REPOSITORY_FACILITY,
  REPOSITORY_HOLIDAY_CALENDAR,
  REPOSITORY_ORGANIZATION_UNIT,
  REPOSITORY_ROSTER,
  REPOSITORY_ROSTER_ASSIGNMENT,
} from '@repository/token'
import { CodeConceptService } from '../concept/code-concept.service'
import { cleanReason } from '../credentialing/application-support'
import { levelRank } from '../credentialing/application-rules'
import { addDays } from '../credentialing/appointment-rules'
import { EligibilityService } from '../eligibility/eligibility.service'
import { observe } from '../observe'
import { ParameterService } from '../parameter/parameter.service'
import {
  ConflictError,
  ForbiddenError,
  InvalidRequestError,
  NotFoundError,
} from '../workforce.error'
import {
  daysOf,
  findCoverageGaps,
  type CoverageGap,
  type RankLookup,
} from './coverage-check'
import { findMissingRestDays } from './rest-days'
import { checkWorkingTime, type WorkingShift } from './working-time'
import { readWorkingTimeLimits } from './working-time-limits'

const NAME = 'RosterValidationService'

/**
 * Most assignments of one roster the validation reads.
 */
const MAX_ASSIGNMENTS = 20_000

/**
 * The business rule a violation belongs to.
 */
const RULES: Record<string, string> = {
  employee_not_assignable: 'HR-ROS-001',
  not_eligible_employment: 'HR-ROS-002',
  not_eligible_str: 'HR-ROS-002',
  not_eligible_sip: 'HR-ROS-002',
  not_eligible_spk: 'HR-ROS-002',
  overlap: 'HR-ROS-010',
  rest_too_short: 'HR-ROS-011',
  overtime_consent_required: 'HR-ROS-013',
  overtime_limit_exceeded: 'HR-ROS-013',
  no_rest_day: 'HR-ROS-014',
  too_many_nights: 'HR-ROS-015',
}

/**
 * One rule a roster breaks. It names the rule, an employee and a day, never a name.
 *
 * @property rule - The business rule, for example `HR-ROS-011`.
 * @property code - What is wrong.
 * @property employeeId - The employee.
 * @property date - The day the shift starts, or the last day of the 7 days without rest.
 * @property assignmentId - The assignment, or `null` for a missing rest day.
 */
export interface RosterViolation {
  rule: string
  code: string
  employeeId: string
  date: string
  assignmentId: string | null
}

/**
 * A coverage gap, and whether an override accepted it.
 */
export interface RosterCoverageGap extends CoverageGap {
  overridden: boolean
}

/**
 * Counts of a validation.
 *
 * @property violations - Rule violations.
 * @property coverageGaps - Gaps that no override accepted.
 * @property overridden - Gaps an override accepted.
 */
export interface ValidationSummary {
  violations: number
  coverageGaps: number
  overridden: number
}

/**
 * What validating a roster found.
 *
 * @property violations - Every rule violation.
 * @property coverageGaps - Every coverage gap, accepted or not.
 * @property summary - The counts.
 */
export interface ValidationReport {
  violations: RosterViolation[]
  coverageGaps: RosterCoverageGap[]
  summary: ValidationSummary
}

/**
 * The answer of `validate`: the report and when it ran.
 *
 * @property checkedAt - When the validation ran.
 */
export interface ValidationAnswer extends ValidationReport {
  checkedAt: Date
}

/**
 * Data of a coverage override.
 *
 * @property date - The day of the gap.
 * @property shiftId - The shift of the gap.
 * @property requirementId - The requirement that is not met.
 * @property reason - Why the gap is accepted.
 * @property version - Version of the roster the caller read.
 */
export interface CoverageOverrideInput {
  date: string
  shiftId: string
  requirementId: string
  reason: string
  version?: number
}

/**
 * Validation of a roster (HR plan 5.5 RA15 to RA18): every rule of HR spec 8.5 on the whole
 * roster, the coverage count, the overrides, and the gate that `submit` and `publish` use. It
 * reports; only the gate refuses.
 */
@Injectable()
export class RosterValidationService {
  /**
   * @param assignments - Roster assignment repository.
   * @param rosters - Roster repository.
   * @param units - Organization unit repository.
   * @param facilities - Facility repository, for the holiday calendars.
   * @param employees - Employee repository.
   * @param requirements - Coverage requirement repository.
   * @param calendars - Holiday calendar repository.
   * @param concepts - Code concepts, for the ranks of clinical levels.
   * @param eligibility - General clinical eligibility.
   * @param parameters - HR parameters (the working-time limits).
   * @param logger - Logger of this service.
   */
  constructor(
    @Inject(REPOSITORY_ROSTER_ASSIGNMENT)
    private readonly assignments: RosterAssignmentRepository,
    @Inject(REPOSITORY_ROSTER) private readonly rosters: RosterRepository,
    @Inject(REPOSITORY_ORGANIZATION_UNIT)
    private readonly units: OrganizationUnitRepository,
    @Inject(REPOSITORY_FACILITY)
    private readonly facilities: FacilityRepository,
    @Inject(REPOSITORY_EMPLOYEE) private readonly employees: EmployeeRepository,
    @Inject(REPOSITORY_COVERAGE_REQUIREMENT)
    private readonly requirements: CoverageRequirementRepository,
    @Inject(REPOSITORY_HOLIDAY_CALENDAR)
    private readonly calendars: HolidayCalendarRepository,
    @Inject(CodeConceptService) private readonly concepts: CodeConceptService,
    @Inject(EligibilityService)
    private readonly eligibility: EligibilityService,
    @Inject(ParameterService) private readonly parameters: ParameterService,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /**
   * Runs every rule on a roster and stores the summary on it (HR plan 5.5 RA16). The answer lists
   * the violations and the coverage gaps; nothing is refused.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Roster identifier.
   * @returns The report and when it ran.
   * @throws NotFoundError `roster_not_found`.
   * @throws ConflictError `stale_version`.
   */
  validate(tenantId: string, id: string): Promise<ValidationAnswer> {
    return observe(
      this.logger,
      'roster_validate',
      `${NAME}.validate`,
      async () => {
        const roster = await this.loadRoster(tenantId, id)
        const report = await this.report(tenantId, roster)
        const checkedAt = new Date()
        await this.store(roster, {
          validation: this.toValidation(report, checkedAt),
        })
        return { ...report, checkedAt }
      },
      'log',
      (answer) => ({ ...answer.summary }),
    )
  }

  /**
   * Accepts a coverage gap with a reason (`HR-ROS-021`, HR plan 5.5 RA17). Possible while the
   * roster is a draft, submitted or approved.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Roster identifier.
   * @param input - The gap and the reason.
   * @returns The roster with the override.
   * @throws NotFoundError `roster_not_found`.
   * @throws InvalidRequestError `override_not_allowed`, `reason_required`, `invalid_reason` or
   * `no_such_gap`.
   * @throws ConflictError `override_exists` or `stale_version`.
   * @throws ForbiddenError `actor_required`.
   */
  addOverride(
    tenantId: string,
    id: string,
    input: CoverageOverrideInput,
  ): Promise<Roster> {
    return observe(
      this.logger,
      'coverage_override',
      `${NAME}.addOverride`,
      async () => {
        const roster = await this.loadRoster(tenantId, id)
        if (
          roster.status !== 'draft' &&
          roster.status !== 'submitted' &&
          roster.status !== 'approved'
        ) {
          throw new InvalidRequestError(
            'override_not_allowed',
            'A gap can be accepted only while the roster is a draft, submitted or approved.',
          )
        }
        const reason = cleanReason(input.reason)
        if (input.version !== undefined && input.version !== roster.version) {
          throw this.stale()
        }
        const actor = this.actor()
        const report = await this.report(tenantId, roster)
        const gap = report.coverageGaps.find(
          (item) =>
            item.date === input.date &&
            item.shiftId === input.shiftId &&
            item.requirementId === input.requirementId,
        )
        if (!gap) {
          throw new InvalidRequestError(
            'no_such_gap',
            'There is no coverage gap for that day, shift and requirement.',
          )
        }
        if (gap.overridden) {
          throw new ConflictError(
            'override_exists',
            'This gap was already accepted.',
          )
        }
        const overrides = [
          ...roster.coverage_overrides,
          {
            date: input.date,
            shift_definition_id: input.shiftId,
            requirement_id: input.requirementId,
            reason,
            by: actor,
            at: new Date(),
          },
        ]
        return this.store(
          roster,
          { coverage_overrides: overrides },
          reason,
        )
      },
    )
  }

  /**
   * The gate of `submit` and `publish` (`HR-ROS-021`, HR plan 5.5 RA17): any violation blocks the
   * roster, and so does a coverage gap that no override accepted.
   *
   * @param tenantId - Tenant of the caller.
   * @param roster - The roster being submitted or published.
   * @returns The validation summary to store on the roster.
   * @throws InvalidRequestError `roster_invalid` or `coverage_gaps`.
   */
  async gate(tenantId: string, roster: Roster): Promise<RosterValidation> {
    const report = await this.report(tenantId, roster)
    if (report.summary.violations > 0) {
      throw new InvalidRequestError(
        'roster_invalid',
        'The roster breaks rules: run validate to see which, and fix them first.',
      )
    }
    if (report.summary.coverageGaps > 0) {
      throw new InvalidRequestError(
        'coverage_gaps',
        'The roster does not meet every coverage requirement. Fill the gaps or accept them with a reason.',
      )
    }
    return this.toValidation(report, new Date())
  }

  /**
   * Runs every rule on a roster without writing anything. Assignments that are not stored yet can
   * be passed in `extra`: they are checked as if they were part of the roster, which is how an
   * import previews the coverage and the rest days its file would leave (HR plan 5.6 IM6).
   *
   * @param tenantId - Tenant of the caller.
   * @param roster - The roster.
   * @param extra - Planned assignments of the roster that are not stored yet.
   * @returns The violations, the coverage gaps and the counts.
   * @throws NotFoundError `roster_not_found`.
   */
  async report(
    tenantId: string,
    roster: Roster,
    extra: RosterAssignment[] = [],
  ): Promise<ValidationReport> {
    const unit = await this.units.findOne(roster.unit_id)
    const facility = await this.facilities.findOne(roster.facility_id)
    if (!unit || unit.tenant_id !== tenantId || !facility) {
      throw this.notFound()
    }
    const planned = [
      ...(await this.assignments.findByRoster(tenantId, roster.id, {
        status: 'planned',
        limit: MAX_ASSIGNMENTS,
      })),
      ...extra,
    ]
    const employees = new Map<string, Employee>()
    for (const employeeId of new Set(planned.map((item) => item.employee_id))) {
      const employee = await this.employees.findOne(employeeId)
      if (employee && employee.tenant_id === tenantId && !employee.deleted_at) {
        employees.set(employee.id, employee)
      }
    }
    const limits = await readWorkingTimeLimits(
      this.parameters,
      tenantId,
      unit.id,
    )
    const violations: RosterViolation[] = []
    for (const [employeeId, own] of this.byEmployee(planned)) {
      const employee = employees.get(employeeId)
      for (const assignment of own) {
        const code = await this.employmentViolation(
          tenantId,
          employee,
          unit,
          assignment.date,
        )
        if (code) {
          violations.push(this.violation(code, assignment))
        }
      }
      const all = [
        ...(await this.assignments.findPlannedByEmployeeBetween(
          tenantId,
          employeeId,
          addDays(own[0]?.date ?? roster.period.start, -8),
          addDays(own.at(-1)?.date ?? roster.period.end, 8),
        )),
        ...extra.filter((item) => item.employee_id === employeeId),
      ].sort((left, right) => this.order(left, right))
      for (const assignment of own) {
        const position = all.findIndex((item) => item.id === assignment.id)
        const earlier = all.slice(0, position < 0 ? 0 : position)
        const result = checkWorkingTime(
          this.toWorkingShift(assignment),
          earlier.map((item) => this.toWorkingShift(item)),
          limits,
          Boolean(assignment.overtime?.consent),
        )
        for (const code of result.violations) {
          violations.push(this.violation(code, assignment))
        }
      }
      const workDates = new Set(
        all.filter((item) => item.shift.type !== 'off').map((item) => item.date),
      )
      for (const date of findMissingRestDays(workDates, roster.period)) {
        violations.push({
          rule: RULES.no_rest_day as string,
          code: 'no_rest_day',
          employeeId,
          date,
          assignmentId: null,
        })
      }
    }
    violations.sort(
      (left, right) =>
        left.date.localeCompare(right.date) ||
        left.employeeId.localeCompare(right.employeeId) ||
        left.code.localeCompare(right.code),
    )
    const gaps =
      unit.status === 'active'
        ? await this.coverageGaps(tenantId, roster, facility, planned, employees)
        : []
    const coverageGaps = gaps.map((gap) => ({
      ...gap,
      overridden: roster.coverage_overrides.some(
        (item) =>
          item.date === gap.date &&
          item.shift_definition_id === gap.shiftId &&
          item.requirement_id === gap.requirementId,
      ),
    }))
    const overridden = coverageGaps.filter((gap) => gap.overridden).length
    return {
      violations,
      coverageGaps,
      summary: {
        violations: violations.length,
        coverageGaps: coverageGaps.length - overridden,
        overridden,
      },
    }
  }

  /**
   * Finds the coverage gaps of a roster: the active requirements of its unit against the planned
   * assignments (HR plan 5.5 RA18).
   *
   * @param tenantId - Tenant of the caller.
   * @param roster - The roster.
   * @param facility - Facility of the roster, for its holiday calendars.
   * @param planned - The planned assignments of the roster.
   * @param employees - Their employees.
   * @returns The gaps.
   */
  private async coverageGaps(
    tenantId: string,
    roster: Roster,
    facility: { holiday_calendar_codes: string[] },
    planned: RosterAssignment[],
    employees: Map<string, Employee>,
  ): Promise<CoverageGap[]> {
    const requirements = await this.requirements.findByFilter(tenantId, {
      unitId: roster.unit_id,
      status: 'active',
      limit: 5000,
    })
    if (requirements.length === 0) {
      return []
    }
    const years = new Set([
      Number(roster.period.start.slice(0, 4)),
      Number(roster.period.end.slice(0, 4)),
    ])
    const holidays = new Set<string>()
    for (const code of facility.holiday_calendar_codes) {
      for (const year of years) {
        const calendar = await this.calendars.findByCodeAndYear(
          tenantId,
          code,
          year,
        )
        for (const holiday of calendar?.holidays ?? []) {
          if (holiday.status === 'active') {
            holidays.add(holiday.date)
          }
        }
      }
    }
    const codings: Coding[] = [
      ...requirements.flatMap((item) =>
        item.match.min_clinical_level ? [item.match.min_clinical_level] : [],
      ),
      ...[...employees.values()].flatMap((item) =>
        item.clinical_level ? [item.clinical_level] : [],
      ),
    ]
    const ranks = new Map<string, number | null>()
    for (const coding of codings) {
      const key = `${coding.system}|${coding.code}`
      if (!ranks.has(key)) {
        const concept = await this.concepts.resolve(
          tenantId,
          coding.system,
          coding.code,
        )
        ranks.set(key, levelRank(concept?.properties))
      }
    }
    const rank: RankLookup = (coding) =>
      ranks.get(`${coding.system}|${coding.code}`) ?? null
    return findCoverageGaps({
      dates: daysOf(roster.period),
      requirements,
      assignments: planned,
      employees,
      holidays,
      rank,
    })
  }

  /**
   * Checks the status and the eligibility of an employee on a day (`HR-ROS-001`, `002`).
   *
   * @param tenantId - Tenant of the caller.
   * @param employee - The employee, or `undefined` when it cannot be read.
   * @param unit - The unit of the roster.
   * @param date - The day.
   * @returns The code of the violation, or `null`.
   */
  private async employmentViolation(
    tenantId: string,
    employee: Employee | undefined,
    unit: OrganizationUnit,
    date: string,
  ): Promise<string | null> {
    if (
      !employee ||
      (employee.employment_status !== 'probation' &&
        employee.employment_status !== 'active')
    ) {
      return 'employee_not_assignable'
    }
    if (employee.is_clinical && unit.is_clinical) {
      const result = await this.eligibility.general(
        tenantId,
        employee,
        unit,
        date,
      )
      if (!result.eligible) {
        return `not_eligible_${result.failed}`
      }
    }
    return null
  }

  /**
   * @param code - What is wrong.
   * @param assignment - The assignment.
   * @returns The violation of the assignment.
   */
  private violation(code: string, assignment: RosterAssignment): RosterViolation {
    return {
      rule: RULES[code] ?? 'HR-ROS-010',
      code,
      employeeId: assignment.employee_id,
      date: assignment.date,
      assignmentId: assignment.id,
    }
  }

  /**
   * Groups assignments by employee, each group in order.
   *
   * @param planned - The assignments.
   * @returns The groups.
   */
  private byEmployee(
    planned: RosterAssignment[],
  ): Map<string, RosterAssignment[]> {
    const groups = new Map<string, RosterAssignment[]>()
    for (const assignment of [...planned].sort((a, b) => this.order(a, b))) {
      const group = groups.get(assignment.employee_id) ?? []
      group.push(assignment)
      groups.set(assignment.employee_id, group)
    }
    return groups
  }

  /**
   * Orders assignments by date, then start, then identifier, so each is checked against the ones
   * that came before it, as if entered in that order.
   *
   * @param left - One assignment.
   * @param right - Another assignment.
   * @returns A negative number when `left` comes first.
   */
  private order(left: RosterAssignment, right: RosterAssignment): number {
    return (
      left.date.localeCompare(right.date) ||
      (left.starts_at?.getTime() ?? 0) - (right.starts_at?.getTime() ?? 0) ||
      left.id.localeCompare(right.id)
    )
  }

  /**
   * @param assignment - The assignment.
   * @returns The shift as the working-time rules see it.
   */
  private toWorkingShift(assignment: RosterAssignment): WorkingShift {
    return {
      date: assignment.date,
      startsAt: assignment.starts_at,
      endsAt: assignment.ends_at,
      paidMinutes: assignment.shift.paid_minutes,
      isNight: assignment.shift.is_night,
    }
  }

  /**
   * @param report - The report.
   * @param checkedAt - When it ran.
   * @returns The summary stored on the roster.
   */
  private toValidation(report: ValidationReport, checkedAt: Date): RosterValidation {
    return {
      checked_at: checkedAt,
      violations: report.summary.violations,
      coverage_gaps: report.summary.coverageGaps,
    }
  }

  /**
   * Writes fields of a roster with the version it was read at, with the reason when given.
   *
   * @param roster - The roster as read.
   * @param changes - Fields to write.
   * @param reason - Optional reason for the change history.
   * @returns The updated roster.
   * @throws ConflictError `stale_version`.
   */
  private async store(
    roster: Roster,
    changes: Partial<Roster>,
    reason?: string,
  ): Promise<Roster> {
    const write = (): Promise<Roster> =>
      this.rosters.update(roster.id, changes, { expectedVersion: roster.version })
    try {
      return await (reason ? withChangeReason(reason, write) : write())
    } catch (error: unknown) {
      if (error instanceof RepositoryConflictError) {
        throw this.stale()
      }
      if (error instanceof RepositoryNotFoundError) {
        throw this.notFound()
      }
      throw error
    }
  }

  /**
   * @returns The signed-in actor.
   * @throws ForbiddenError `actor_required`.
   */
  private actor(): ActorRef {
    const actor = getRequestContext()?.actor
    if (!actor) {
      throw new ForbiddenError(
        'actor_required',
        'A signed-in actor is required.',
      )
    }
    return actor
  }

  /**
   * Loads a roster of the caller's tenant.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Roster identifier.
   * @returns The roster.
   * @throws NotFoundError `roster_not_found`.
   */
  private async loadRoster(tenantId: string, id: string): Promise<Roster> {
    const roster = await this.rosters.findOne(id)
    if (!roster || roster.tenant_id !== tenantId || roster.deleted_at) {
      throw this.notFound()
    }
    return roster
  }

  /**
   * @returns The not-found error for a roster.
   */
  private notFound(): NotFoundError {
    return new NotFoundError('roster_not_found', 'The roster was not found.')
  }

  /**
   * @returns The conflict for a stale version.
   */
  private stale(): ConflictError {
    return new ConflictError(
      'stale_version',
      'The roster was changed by someone else. Reload it and try again.',
    )
  }
}
