import { Inject, Injectable } from '@nestjs/common'
import {
  RepositoryConflictError,
  RepositoryNotFoundError,
} from '@utility/database/error'
import {
  TRANSACTION_MANAGER,
  type TransactionManager,
} from '@utility/database/transaction'
import { withChangeReason } from '@utility/history/reason'
import { AppLogger } from '@utility/logger/service'
import { isLocalDate, todayInZone } from '@utility/validation/local-date'
import { type EmployeeRepository } from '@repository/interface/employee'
import { type FacilityRepository } from '@repository/interface/facility'
import { type OrganizationUnitRepository } from '@repository/interface/organization-unit'
import { type RosterRepository } from '@repository/interface/roster'
import {
  type AssignmentQuery,
  type RosterAssignmentRepository,
} from '@repository/interface/roster-assignment'
import { type ShiftDefinitionRepository } from '@repository/interface/shift-definition'
import { type Employee } from '@repository/model/employee'
import { type OrganizationUnit } from '@repository/model/organization-unit'
import { type Roster } from '@repository/model/roster'
import {
  type AssignedShift,
  type AssignmentOvertime,
  type RosterAssignment,
  type RosterRole,
} from '@repository/model/roster-assignment'
import { type ShiftDefinition } from '@repository/model/shift-definition'
import {
  REPOSITORY_EMPLOYEE,
  REPOSITORY_FACILITY,
  REPOSITORY_ORGANIZATION_UNIT,
  REPOSITORY_ROSTER,
  REPOSITORY_ROSTER_ASSIGNMENT,
  REPOSITORY_SHIFT_DEFINITION,
} from '@repository/token'
import { cleanReason } from '../credentialing/application-support'
import { addDays } from '../credentialing/appointment-rules'
import { EligibilityService } from '../eligibility/eligibility.service'
import { observe } from '../observe'
import { ParameterService } from '../parameter/parameter.service'
import {
  ConflictError,
  InvalidRequestError,
  NotFoundError,
} from '../workforce.error'
import {
  assertAssignable,
  assertEligible,
  assertRole,
  assertShiftUsable,
  firstWorkingTimeViolation,
  toWorkingShift,
} from './assignment-checks'
import { isInPeriod, shiftInstants } from './roster-assignment-rules'
import { readWorkingTimeLimits } from './working-time-limits'

const NAME = 'RosterAssignmentService'

/**
 * How a change is made: in a published roster or not, with which reason, and whether the reason is
 * kept on the assignment.
 *
 * @property published - The roster is published, so the change raises its revision.
 * @property reason - The cleaned reason, when one is needed or was given.
 * @property keep - The reason is stored as `change_reason` (published roster or past correction).
 */
interface ChangePlan {
  published: boolean
  reason: string | undefined
  keep: boolean
}

/**
 * Data of a new assignment.
 *
 * @property employeeId - The employee.
 * @property date - The local date the shift starts.
 * @property shiftId - The shift definition.
 * @property role - Role in the shift; `staff` when missing.
 * @property overtimeConsent - The employee consents to overtime on this shift.
 * @property reason - Why, kept in the change history; required in a published roster and for a
 * date in the past.
 * @property canCorrectPast - The caller may change the past (`workforce.roster:correct-past`).
 */
export interface AddRosterAssignmentInput {
  employeeId: string
  date: string
  shiftId: string
  role?: RosterRole
  overtimeConsent?: boolean
  reason?: string
  canCorrectPast?: boolean
}

/**
 * Fields a change can replace. The employee and the date never change.
 *
 * @property shiftId - A different shift.
 * @property role - A different role.
 * @property overtimeConsent - Consent for overtime on the shift.
 * @property version - Version the caller read.
 * @property reason - Why, kept in the change history; required in a published roster and for a
 * date in the past.
 * @property canCorrectPast - The caller may change the past.
 */
export interface ChangeRosterAssignmentInput {
  shiftId?: string
  role?: RosterRole
  overtimeConsent?: boolean
  version?: number
  reason?: string
  canCorrectPast?: boolean
}

/**
 * Optional version and reason of a cancellation.
 *
 * @property version - Version the caller read.
 * @property reason - Why, kept in the change history; required in a published roster and for a
 * date in the past.
 * @property canCorrectPast - The caller may change the past.
 */
export interface CancelRosterAssignmentInput {
  version?: number
  reason?: string
  canCorrectPast?: boolean
}

/**
 * The assignments of a roster (HR plan 5.5, first code PR): list, add, change and cancel, in a
 * draft roster. It enforces the eligibility and working-time rules (`HR-ROS-001`, `002`, `010`
 * to `013`, `015`, `016`) as an assignment is entered. Nothing is deleted.
 */
@Injectable()
export class RosterAssignmentService {
  /**
   * @param assignments - Roster assignment repository.
   * @param rosters - Roster repository.
   * @param units - Organization unit repository.
   * @param facilities - Facility repository, for the time zone.
   * @param shifts - Shift definition repository.
   * @param employees - Employee repository.
   * @param eligibility - General clinical eligibility.
   * @param parameters - HR parameters (the working-time limits).
   * @param transactions - Transaction manager of the main connection.
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
    @Inject(REPOSITORY_SHIFT_DEFINITION)
    private readonly shifts: ShiftDefinitionRepository,
    @Inject(REPOSITORY_EMPLOYEE) private readonly employees: EmployeeRepository,
    @Inject(EligibilityService)
    private readonly eligibility: EligibilityService,
    @Inject(ParameterService) private readonly parameters: ParameterService,
    @Inject(TRANSACTION_MANAGER)
    private readonly transactions: TransactionManager,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /**
   * Lists the assignments of a roster, by date and then employee. Writes no log entry (a read).
   *
   * @param tenantId - Tenant of the caller.
   * @param rosterId - Roster identifier.
   * @param query - Optional filters and paging.
   * @returns The assignments.
   * @throws NotFoundError `roster_not_found`.
   */
  async list(
    tenantId: string,
    rosterId: string,
    query: AssignmentQuery,
  ): Promise<RosterAssignment[]> {
    const roster = await this.loadRoster(tenantId, rosterId)
    return this.assignments.findByRoster(tenantId, roster.id, query)
  }

  /**
   * Adds one person to one shift on one date in a draft roster (HR plan 5.5 RA5 to RA14).
   *
   * @param tenantId - Tenant of the caller.
   * @param rosterId - Roster identifier.
   * @param input - The assignment.
   * @returns The created assignment.
   * @throws NotFoundError `roster_not_found`.
   * @throws InvalidRequestError `roster_locked`, `roster_closed`, `invalid_date`,
   * `date_outside_period`, `invalid_role`, `assignment_in_past`, `unit_closed`,
   * `shift_not_found`, `shift_retired`, `shift_outside_facility`, `shift_unit_not_allowed`,
   * `employee_not_found`, `employee_not_assignable`, `not_eligible_employment`, `not_eligible_str`,
   * `not_eligible_sip`, `not_eligible_spk`, `overlap`, `rest_too_short`,
   * `overtime_consent_required`, `overtime_limit_exceeded` or `too_many_nights`.
   * @throws ConflictError `assignment_exists`.
   */
  add(
    tenantId: string,
    rosterId: string,
    input: AddRosterAssignmentInput,
  ): Promise<RosterAssignment> {
    return observe(
      this.logger,
      'assignment_add',
      `${NAME}.add`,
      async () => {
        const roster = await this.loadRoster(tenantId, rosterId)
        this.assertOpenForChanges(roster)
        if (!isLocalDate(input.date)) {
          throw new InvalidRequestError(
            'invalid_date',
            'The date must be a real day written as YYYY-MM-DD.',
          )
        }
        if (!isInPeriod(input.date, roster.period)) {
          throw new InvalidRequestError(
            'date_outside_period',
            'The date must fall in the period of the roster.',
          )
        }
        const role = input.role ?? 'staff'
        assertRole(role)
        const { unit, timeZone } = await this.context(tenantId, roster)
        const plan = this.plan(roster, input.date, timeZone, input)
        const shift = await this.checkShift(tenantId, roster, unit, input.shiftId)
        const employee = await this.loadEmployee(tenantId, input.employeeId)
        assertAssignable(employee)
        if (
          await this.assignments.findPlannedByEmployeeAndDate(
            tenantId,
            roster.id,
            employee.id,
            input.date,
          )
        ) {
          throw new ConflictError(
            'assignment_exists',
            'The employee already has a shift on this date in this roster.',
          )
        }
        await assertEligible(
          this.eligibility,
          tenantId,
          employee,
          unit,
          input.date,
        )
        const instants = shiftInstants(input.date, shift, timeZone)
        const overtime = await this.checkWorkingTime(
          tenantId,
          unit.id,
          employee.id,
          input.date,
          shift,
          instants,
          input.overtimeConsent === true,
          undefined,
        )
        return this.commit(roster, plan, (revision) =>
          this.assignments.create({
            tenant_id: tenantId,
            roster_id: roster.id,
            unit_id: roster.unit_id,
            facility_id: roster.facility_id,
            employee_id: employee.id,
            date: input.date,
            shift: this.snapshot(shift),
            starts_at: instants.startsAt,
            ends_at: instants.endsAt,
            role,
            status: 'planned',
            source: plan.published
              ? { kind: 'change_request', ref_id: null }
              : { kind: 'roster', ref_id: roster.id },
            change_reason: plan.keep ? (plan.reason ?? null) : null,
            revision,
            overtime: this.overtime(overtime, input.overtimeConsent === true),
            flag: null,
            is_flagged: false,
          }),
        )
      },
    )
  }

  /**
   * Changes the shift, the role or the overtime consent of a planned assignment in a draft roster.
   * The employee and the date never change: cancel and add instead (HR plan 5.5 RA1).
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Assignment identifier.
   * @param input - Fields to change, optional version and reason.
   * @returns The updated assignment.
   * @throws NotFoundError `assignment_not_found`.
   * @throws InvalidRequestError `empty_update`, `assignment_cancelled` and the codes of `add`
   * that apply to the fields sent.
   * @throws ConflictError `stale_version`.
   */
  change(
    tenantId: string,
    id: string,
    input: ChangeRosterAssignmentInput,
  ): Promise<RosterAssignment> {
    return observe(
      this.logger,
      'assignment_change',
      `${NAME}.change`,
      async () => {
        const current = await this.loadAssignment(tenantId, id)
        const roster = await this.loadRoster(tenantId, current.roster_id)
        this.assertOpenForChanges(roster)
        if (current.status !== 'planned') {
          throw new InvalidRequestError(
            'assignment_cancelled',
            'A cancelled assignment cannot be changed.',
          )
        }
        if (
          input.shiftId === undefined &&
          input.role === undefined &&
          input.overtimeConsent === undefined
        ) {
          throw new InvalidRequestError(
            'empty_update',
            'Send at least one field to change.',
          )
        }
        if (input.role !== undefined) {
          assertRole(input.role)
        }
        const { unit, timeZone } = await this.context(tenantId, roster)
        const plan = this.plan(roster, current.date, timeZone, input)
        this.assertVersion(current, input.version)
        const changes: Partial<RosterAssignment> = {}
        if (input.role !== undefined) {
          changes.role = input.role
        }
        const shiftChanged =
          input.shiftId !== undefined &&
          input.shiftId !== current.shift.definition_id
        if (shiftChanged || input.overtimeConsent !== undefined) {
          const shift = shiftChanged
            ? await this.checkShift(tenantId, roster, unit, input.shiftId as string)
            : this.fromSnapshot(current.shift)
          const instants = shiftInstants(current.date, shift, timeZone)
          const consent =
            input.overtimeConsent ?? Boolean(current.overtime?.consent)
          const overtime = await this.checkWorkingTime(
            tenantId,
            unit.id,
            current.employee_id,
            current.date,
            shift,
            instants,
            consent === true,
            current.id,
          )
          if (shiftChanged) {
            changes.shift = this.snapshot(shift)
            changes.starts_at = instants.startsAt
            changes.ends_at = instants.endsAt
          }
          changes.overtime = this.overtime(overtime, consent === true)
        }
        return this.commit(roster, plan, (revision) =>
          this.assignments.update(
            current.id,
            {
              ...changes,
              ...(plan.keep ? { change_reason: plan.reason } : {}),
              ...(plan.published ? { revision } : {}),
            },
            { expectedVersion: input.version ?? current.version },
          ),
        )
      },
    )
  }

  /**
   * Cancels a planned assignment in a draft or published roster. Nothing is deleted (HR plan 5.5 RA20).
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Assignment identifier.
   * @param input - Optional version and reason.
   * @returns The cancelled assignment.
   * @throws NotFoundError `assignment_not_found`.
   * @throws InvalidRequestError `roster_locked`, `roster_closed`, `assignment_in_past` or
   * `assignment_cancelled`.
   * @throws ConflictError `stale_version`.
   */
  cancel(
    tenantId: string,
    id: string,
    input: CancelRosterAssignmentInput,
  ): Promise<RosterAssignment> {
    return observe(
      this.logger,
      'assignment_cancel',
      `${NAME}.cancel`,
      async () => {
        const current = await this.loadAssignment(tenantId, id)
        const roster = await this.loadRoster(tenantId, current.roster_id)
        this.assertOpenForChanges(roster)
        if (current.status !== 'planned') {
          throw new InvalidRequestError(
            'assignment_cancelled',
            'The assignment is already cancelled.',
          )
        }
        const { timeZone } = await this.context(tenantId, roster)
        const plan = this.plan(roster, current.date, timeZone, input)
        this.assertVersion(current, input.version)
        return this.commit(roster, plan, (revision) =>
          this.assignments.update(
            current.id,
            {
              status: 'cancelled',
              ...(plan.keep ? { change_reason: plan.reason } : {}),
              ...(plan.published ? { revision } : {}),
            },
            { expectedVersion: input.version ?? current.version },
          ),
        )
      },
    )
  }

  /**
   * Refuses to change a roster that is neither a draft nor published. A roster that was submitted
   * or approved is frozen (HR plan 5.5 RA5); a closed one is final (`HR-ROS-040`).
   *
   * @param roster - The roster.
   * @throws InvalidRequestError `roster_closed` or `roster_locked`.
   */
  private assertOpenForChanges(roster: Roster): void {
    if (roster.status === 'closed') {
      throw new InvalidRequestError(
        'roster_closed',
        'A closed roster cannot be changed.',
      )
    }
    if (roster.status !== 'draft' && roster.status !== 'published') {
      throw new InvalidRequestError(
        'roster_locked',
        'A roster that was submitted or approved cannot be changed. Return it to draft first.',
      )
    }
  }

  /**
   * Decides how a change is made (HR plan 5.5 RA5, RA19, RA21). A date before today in the
   * facility's zone is refused unless the caller may correct the past. A change to a published
   * roster, or to the past, needs a reason of 1 to 500 characters; in a draft the reason is
   * optional.
   *
   * @param roster - The roster.
   * @param date - The local date of the shift.
   * @param timeZone - Zone of the facility.
   * @param input - The reason and whether the caller may correct the past.
   * @returns Whether the roster is published, the cleaned reason when one is needed or given, and
   * whether the reason is kept on the assignment (published roster or past correction).
   * @throws InvalidRequestError `assignment_in_past`, `reason_required` or `invalid_reason`.
   */
  private plan(
    roster: Roster,
    date: string,
    timeZone: string,
    input: { reason?: string; canCorrectPast?: boolean },
  ): ChangePlan {
    const past = date < todayInZone(timeZone)
    if (past && input.canCorrectPast !== true) {
      throw new InvalidRequestError(
        'assignment_in_past',
        'An assignment in the past cannot be added, changed or cancelled.',
      )
    }
    const published = roster.status === 'published'
    const reason =
      published || past || input.reason !== undefined
        ? cleanReason(input.reason ?? '')
        : undefined
    return { published, reason, keep: published || past }
  }

  /**
   * Runs a change. In a published roster the change and the roster's new `revision` are written in
   * one transaction, so a change never exists without its revision (HR plan 5.5 RA19); the roster is
   * written with the version it was read at, so two changes at once cannot both win.
   *
   * @param roster - The roster as read.
   * @param plan - Whether it is published, and the reason.
   * @param write - Writes the assignment with the revision it must carry.
   * @returns The written assignment.
   * @throws ConflictError `stale_version`.
   */
  private async commit(
    roster: Roster,
    plan: ChangePlan,
    write: (revision: number) => Promise<RosterAssignment>,
  ): Promise<RosterAssignment> {
    const run = async (): Promise<RosterAssignment> => {
      if (!plan.published) {
        return this.writeAssignment(() => write(roster.revision))
      }
      return this.transactions.run(async () => {
        const revision = roster.revision + 1
        const result = await this.writeAssignment(() => write(revision))
        try {
          await this.rosters.update(
            roster.id,
            { revision },
            { expectedVersion: roster.version },
          )
        } catch (error: unknown) {
          throw error instanceof RepositoryConflictError ||
            error instanceof RepositoryNotFoundError
            ? this.stale()
            : error
        }
        return result
      })
    }
    return plan.reason ? withChangeReason(plan.reason, run) : run()
  }

  /**
   * Loads the unit of a roster, which must still be active, and the zone of its facility.
   *
   * @param tenantId - Tenant of the caller.
   * @param roster - The roster.
   * @returns The unit and the IANA time zone.
   * @throws InvalidRequestError `unit_closed`.
   */
  private async context(
    tenantId: string,
    roster: Roster,
  ): Promise<{ unit: OrganizationUnit; timeZone: string }> {
    const unit = await this.units.findOne(roster.unit_id)
    const facility = await this.facilities.findOne(roster.facility_id)
    if (!unit || unit.tenant_id !== tenantId || !facility) {
      throw this.rosterNotFound()
    }
    if (unit.status !== 'active') {
      throw new InvalidRequestError('unit_closed', 'The unit is closed.')
    }
    return { unit, timeZone: facility.timezone }
  }

  /**
   * Checks the shift of an assignment (HR plan 5.5 RA7): active, of the roster's facility and
   * usable by the unit.
   *
   * @param tenantId - Tenant of the caller.
   * @param roster - The roster.
   * @param unit - The unit of the roster.
   * @param shiftId - The shift as sent.
   * @returns The shift definition.
   * @throws InvalidRequestError `shift_not_found`, `shift_retired`, `shift_outside_facility` or
   * `shift_unit_not_allowed`.
   */
  private async checkShift(
    tenantId: string,
    roster: Roster,
    unit: OrganizationUnit,
    shiftId: string,
  ): Promise<ShiftDefinition> {
    const shift = await this.shifts.findOne(shiftId)
    if (!shift || shift.tenant_id !== tenantId || shift.deleted_at) {
      throw new InvalidRequestError(
        'shift_not_found',
        'The shift was not found.',
      )
    }
    assertShiftUsable(shift, roster, unit)
    return shift
  }

  /**
   * Loads an employee of the tenant.
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - The employee as sent.
   * @returns The employee.
   * @throws InvalidRequestError `employee_not_found`.
   */
  private async loadEmployee(
    tenantId: string,
    employeeId: string,
  ): Promise<Employee> {
    const employee = await this.employees.findOne(employeeId)
    if (!employee || employee.tenant_id !== tenantId || employee.deleted_at) {
      throw new InvalidRequestError(
        'employee_not_found',
        'The employee was not found.',
      )
    }
    return employee
  }

  /**
   * Reads the working-time limits at the unit and checks a shift against the employee's other
   * planned shifts in every roster and unit (`HR-ROS-016`).
   *
   * @param tenantId - Tenant of the caller.
   * @param unitId - The unit of the roster.
   * @param employeeId - The employee.
   * @param date - The local date of the shift.
   * @param shift - The shift.
   * @param instants - The instants of the shift.
   * @param consent - Whether the employee consents to overtime.
   * @param ignoreId - An assignment to leave out, the one being changed.
   * @returns The overtime minutes the shift adds.
   * @throws InvalidRequestError the first working-time rule that is broken.
   */
  private async checkWorkingTime(
    tenantId: string,
    unitId: string,
    employeeId: string,
    date: string,
    shift: Pick<ShiftDefinition, 'paid_minutes' | 'is_night'>,
    instants: { startsAt: Date | null; endsAt: Date | null },
    consent: boolean,
    ignoreId: string | undefined,
  ): Promise<number> {
    const limits = await readWorkingTimeLimits(
      this.parameters,
      tenantId,
      unitId,
    )
    const others = (
      await this.assignments.findPlannedByEmployeeBetween(
        tenantId,
        employeeId,
        addDays(date, -8),
        addDays(date, 8),
      )
    )
      .filter((other) => other.id !== ignoreId)
      .map((other) => toWorkingShift(other))
    return firstWorkingTimeViolation(
      {
        date,
        startsAt: instants.startsAt,
        endsAt: instants.endsAt,
        paidMinutes: shift.paid_minutes,
        isNight: shift.is_night,
      },
      others,
      limits,
      consent,
    )
  }

  /**
   * Builds the overtime of an assignment: nothing when the shift adds none.
   *
   * @param minutes - Overtime minutes the shift adds.
   * @param consent - Whether the employee consented.
   * @returns The overtime, or `null`.
   */
  private overtime(minutes: number, consent: boolean): AssignmentOvertime | null {
    return minutes > 0 || consent
      ? {
          minutes,
          consent: consent ? { at: new Date(), document: null } : null,
        }
      : null
  }

  /**
   * Copies the fields of a shift definition an assignment keeps (HR plan 5.5 RA7).
   *
   * @param shift - The shift definition.
   * @returns The snapshot.
   */
  private snapshot(shift: ShiftDefinition): AssignedShift {
    return {
      definition_id: shift.id,
      code: shift.code,
      type: shift.type,
      start_time: shift.start_time,
      end_time: shift.end_time,
      paid_minutes: shift.paid_minutes,
      is_night: shift.is_night,
    }
  }

  /**
   * Reads a stored snapshot back as the shift fields the rules need.
   *
   * @param snapshot - The stored snapshot.
   * @returns The shift fields.
   */
  private fromSnapshot(snapshot: AssignedShift): ShiftDefinition {
    return {
      id: snapshot.definition_id,
      code: snapshot.code,
      type: snapshot.type,
      start_time: snapshot.start_time,
      end_time: snapshot.end_time,
      paid_minutes: snapshot.paid_minutes,
      is_night: snapshot.is_night,
    } as ShiftDefinition
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
      throw this.rosterNotFound()
    }
    return roster
  }

  /**
   * Loads an assignment of the caller's tenant.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Assignment identifier.
   * @returns The assignment.
   * @throws NotFoundError `assignment_not_found`.
   */
  private async loadAssignment(
    tenantId: string,
    id: string,
  ): Promise<RosterAssignment> {
    const assignment = await this.assignments.findOne(id)
    if (
      !assignment ||
      assignment.tenant_id !== tenantId ||
      assignment.deleted_at
    ) {
      throw new NotFoundError(
        'roster_assignment_not_found',
        'The assignment was not found.',
      )
    }
    return assignment
  }

  /**
   * Refuses a stale version before any write.
   *
   * @param assignment - The assignment as read.
   * @param version - Version the caller read.
   * @throws ConflictError `stale_version`.
   */
  private assertVersion(
    assignment: RosterAssignment,
    version: number | undefined,
  ): void {
    if (version !== undefined && version !== assignment.version) {
      throw this.stale()
    }
  }

  /**
   * Runs a repository write of an assignment and turns repository rejections into workforce errors.
   *
   * @param write - The repository call.
   * @returns What the call returns.
   */
  private async writeAssignment(
    write: () => Promise<RosterAssignment>,
  ): Promise<RosterAssignment> {
    try {
      return await write()
    } catch (error: unknown) {
      if (error instanceof RepositoryConflictError) {
        throw this.stale()
      }
      if (error instanceof RepositoryNotFoundError) {
        throw new NotFoundError(
          'roster_assignment_not_found',
          'The assignment was not found.',
        )
      }
      throw error
    }
  }

  /**
   * @returns The not-found error for a roster.
   */
  private rosterNotFound(): NotFoundError {
    return new NotFoundError('roster_not_found', 'The roster was not found.')
  }

  /**
   * @returns The conflict for a stale version.
   */
  private stale(): ConflictError {
    return new ConflictError(
      'stale_version',
      'The assignment was changed by someone else. Reload it and try again.',
    )
  }
}
