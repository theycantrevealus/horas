import { Inject, Injectable } from '@nestjs/common'
import { type PositionAssignmentRepository } from '@repository/interface/position-assignment'
import { type PositionRepository } from '@repository/interface/position'
import { type LeaveFirstDecider } from '@repository/model/leave-request'
import { type OrganizationUnit } from '@repository/model/organization-unit'
import {
  REPOSITORY_POSITION,
  REPOSITORY_POSITION_ASSIGNMENT,
} from '@repository/token'

/**
 * The person who decides a step, as found now.
 *
 * @property kind - What the decider is.
 * @property employeeId - The Head, or `null` for HR Manager.
 */
export interface ResolvedDecider {
  kind: LeaveFirstDecider['kind']
  employeeId: string | null
}

/**
 * Chooses and finds the person who decides the first step of a leave request (HR spec 9.4.4.2,
 * HR plan 8.3 LR6). The Head of a unit is the holder of its head position: the employee with an
 * `active` assignment to it. Nobody decides their own leave. Writes no log entry (a read).
 */
@Injectable()
export class LeaveDeciderService {
  /**
   * @param positions - Position repository, for the head position of a unit.
   * @param assignments - Position assignment repository, for the holder of a position.
   */
  constructor(
    @Inject(REPOSITORY_POSITION) private readonly positions: PositionRepository,
    @Inject(REPOSITORY_POSITION_ASSIGNMENT)
    private readonly assignments: PositionAssignmentRepository,
  ) {}

  /**
   * Chooses who decides the first step when a request is made: the Head of the requester's unit; or,
   * when the requester is that Head or the unit has none, the Head of the parent unit; or, failing
   * that or without a unit, HR Manager. The Head is not stored: it is found again when the step is
   * decided, so a newly appointed Head can decide.
   *
   * @param tenantId - Tenant of the caller.
   * @param requesterId - The requester's employee identifier.
   * @param unit - Unit of the requester's open primary assignment, or `null`.
   * @returns The kind of decider and the unit whose Head decides.
   */
  async chooseFirst(
    tenantId: string,
    requesterId: string,
    unit: OrganizationUnit | null,
  ): Promise<LeaveFirstDecider> {
    const hr: LeaveFirstDecider = {
      kind: 'hr_manager',
      unit_id: null,
      employee_id: null,
    }
    if (!unit) {
      return hr
    }
    const own = await this.headOf(tenantId, unit.id)
    if (own !== null && own !== requesterId) {
      return { kind: 'unit_head', unit_id: unit.id, employee_id: null }
    }
    if (unit.parent_id) {
      const parent = await this.headOf(tenantId, unit.parent_id)
      if (parent !== null && parent !== requesterId) {
        return {
          kind: 'parent_head',
          unit_id: unit.parent_id,
          employee_id: null,
        }
      }
    }
    return hr
  }

  /**
   * Finds who decides the first step now: the current Head of the stored unit, or HR Manager when
   * the decider is HR Manager or the unit has no Head any more.
   *
   * @param tenantId - Tenant of the caller.
   * @param decider - The first decider stored with the request.
   * @returns The kind of decider and the Head, if any.
   */
  async resolve(
    tenantId: string,
    decider: LeaveFirstDecider,
  ): Promise<ResolvedDecider> {
    if (decider.kind !== 'hr_manager' && decider.unit_id) {
      const head = await this.headOf(tenantId, decider.unit_id)
      if (head !== null) {
        return { kind: decider.kind, employeeId: head }
      }
    }
    return { kind: 'hr_manager', employeeId: null }
  }

  /**
   * Lists the units whose Head an employee is.
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - The employee.
   * @returns The unit identifiers, possibly none.
   */
  async headedUnits(tenantId: string, employeeId: string): Promise<string[]> {
    const open = await this.assignments.findOpenByEmployee(tenantId, employeeId)
    return [
      ...new Set(
        open
          .filter(
            (assignment) =>
              assignment.is_head_of_unit && assignment.status === 'active',
          )
          .map((assignment) => assignment.unit_id),
      ),
    ]
  }

  /**
   * Finds the Head of a unit: the employee with an active assignment to its head position.
   *
   * @param tenantId - Tenant of the caller.
   * @param unitId - The unit.
   * @returns The employee identifier, or `null` when the unit has no Head.
   */
  private async headOf(
    tenantId: string,
    unitId: string,
  ): Promise<string | null> {
    const position = await this.positions.findActiveHead(tenantId, unitId)
    if (!position) {
      return null
    }
    const open = await this.assignments.findOpenByPosition(
      tenantId,
      position.id,
    )
    return open.find((assignment) => assignment.status === 'active')?.employee_id ?? null
  }
}
