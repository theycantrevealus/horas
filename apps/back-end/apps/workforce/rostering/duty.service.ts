import { Inject, Injectable } from '@nestjs/common'
import { isLocalDate } from '@utility/validation/local-date'
import { type OrganizationUnitRepository } from '@repository/interface/organization-unit'
import { type RosterRepository } from '@repository/interface/roster'
import { type RosterAssignmentRepository } from '@repository/interface/roster-assignment'
import { type RosterAssignment } from '@repository/model/roster-assignment'
import {
  REPOSITORY_ORGANIZATION_UNIT,
  REPOSITORY_ROSTER,
  REPOSITORY_ROSTER_ASSIGNMENT,
} from '@repository/token'
import { addDays } from '../credentialing/appointment-rules'
import {
  ForbiddenError,
  InvalidRequestError,
  NotFoundError,
} from '../workforce.error'

/**
 * Longest range `GET /employees/me/roster` answers, in days (HR plan 5.5 RA23).
 */
export const MAX_MY_ROSTER_DAYS = 62

/**
 * Who is on duty, and what an employee's own shifts are: the two reads of the published rosters
 * (HR plan 5.5 RA22, RA23). They write no log entry.
 */
@Injectable()
export class DutyService {
  /**
   * @param assignments - Roster assignment repository.
   * @param rosters - Roster repository, to tell which rosters are published.
   * @param units - Organization unit repository.
   */
  constructor(
    @Inject(REPOSITORY_ROSTER_ASSIGNMENT)
    private readonly assignments: RosterAssignmentRepository,
    @Inject(REPOSITORY_ROSTER) private readonly rosters: RosterRepository,
    @Inject(REPOSITORY_ORGANIZATION_UNIT)
    private readonly units: OrganizationUnitRepository,
  ) {}

  /**
   * Answers the planned assignments of a unit that are on duty at a moment, from published rosters
   * only. An assignment with an unresolved flag is not on duty (`HR-ROS-031`).
   *
   * @param tenantId - Tenant of the caller.
   * @param unitId - The unit.
   * @param at - The moment; now when missing.
   * @returns The assignments on duty, with their role.
   * @throws NotFoundError `unit_not_found`.
   */
  async onDuty(
    tenantId: string,
    unitId: string,
    at: Date = new Date(),
  ): Promise<RosterAssignment[]> {
    const unit = await this.units.findOne(unitId)
    if (!unit || unit.tenant_id !== tenantId || unit.deleted_at) {
      throw new NotFoundError('unit_not_found', 'The unit was not found.')
    }
    const found = await this.assignments.findOnDuty(tenantId, unit.id, at)
    return this.inPublishedRosters(tenantId, found)
  }

  /**
   * Answers the signed-in employee's own planned shifts between two dates, from published rosters.
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - The employee linked to the caller's account, or `null`.
   * @param from - First day.
   * @param to - Last day.
   * @returns The assignments, by date and start.
   * @throws ForbiddenError `employee_required`.
   * @throws InvalidRequestError `invalid_range`.
   */
  async myRoster(
    tenantId: string,
    employeeId: string | null,
    from: string,
    to: string,
  ): Promise<RosterAssignment[]> {
    if (employeeId === null) {
      throw new ForbiddenError(
        'employee_required',
        'Your account is not linked to an employee.',
      )
    }
    if (
      !isLocalDate(from) ||
      !isLocalDate(to) ||
      from > to ||
      to > addDays(from, MAX_MY_ROSTER_DAYS - 1)
    ) {
      throw new InvalidRequestError(
        'invalid_range',
        `The range must run from a day to a later day, at most ${MAX_MY_ROSTER_DAYS} days.`,
      )
    }
    const found = await this.assignments.findPlannedByEmployeeBetween(
      tenantId,
      employeeId,
      from,
      to,
    )
    return (await this.inPublishedRosters(tenantId, found)).sort(
      (left, right) =>
        left.date.localeCompare(right.date) ||
        (left.starts_at?.getTime() ?? 0) - (right.starts_at?.getTime() ?? 0) ||
        left.id.localeCompare(right.id),
    )
  }

  /**
   * Keeps the assignments of rosters that were published (and those that closed after).
   *
   * @param tenantId - Tenant of the caller.
   * @param found - The assignments.
   * @returns The assignments of published or closed rosters.
   */
  private async inPublishedRosters(
    tenantId: string,
    found: RosterAssignment[],
  ): Promise<RosterAssignment[]> {
    const visible = new Set<string>()
    for (const rosterId of new Set(found.map((item) => item.roster_id))) {
      const roster = await this.rosters.findOne(rosterId)
      if (
        roster &&
        roster.tenant_id === tenantId &&
        (roster.status === 'published' || roster.status === 'closed')
      ) {
        visible.add(rosterId)
      }
    }
    return found.filter((item) => visible.has(item.roster_id))
  }
}
