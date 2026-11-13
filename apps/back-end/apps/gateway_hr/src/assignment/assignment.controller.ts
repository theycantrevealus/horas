import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { type PositionAssignment } from '@repository/model/position-assignment'
import { type AuthenticatedUser } from '@identity/authenticated-user'
import { CurrentUser, RequirePermissions } from '@identity/guard/decorators'
import { PERMISSIONS } from '@identity/permission'
import { AssignmentService } from '@workforce/assignment/assignment.service'
import {
  CreateAssignmentDto,
  EndAssignmentDto,
  ListUnitAssignmentsDto,
} from './assignment.dto'

/**
 * Position assignments of the signed-in user's tenant.
 */
@Controller({ path: 'assignments', version: '1' })
export class AssignmentController {
  /**
   * @param assignments - Assignment service.
   */
  constructor(private readonly assignments: AssignmentService) {}

  /**
   * Handles `POST /v1/assignments`: assigns an employee to a position.
   *
   * @param user - Signed-in user.
   * @param body - The assignment.
   * @returns The created assignment.
   */
  @Post()
  @RequirePermissions(PERMISSIONS.WORKFORCE_ASSIGNMENT_WRITE)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateAssignmentDto,
  ): Promise<PositionAssignment> {
    return this.assignments.create(user.tenant_id, {
      employeeId: body.employeeId,
      positionId: body.positionId,
      contractId: body.contractId,
      kind: body.kind,
      period: { start: body.period.start, end: body.period.end ?? null },
      fte: body.fte,
      isPrimary: body.isPrimary,
      decisionNumber: body.decisionNumber,
      reason: body.reason,
    })
  }

  /**
   * Handles `POST /v1/assignments/:id/end`: ends an assignment on a date.
   *
   * @param user - Signed-in user.
   * @param id - Assignment identifier.
   * @param body - Last day, optional version and reason.
   * @returns The ended assignment.
   */
  @Post(':id/end')
  @RequirePermissions(PERMISSIONS.WORKFORCE_ASSIGNMENT_WRITE)
  end(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: EndAssignmentDto,
  ): Promise<PositionAssignment> {
    return this.assignments.end(user.tenant_id, id, body)
  }
}

/**
 * The assignments of one employee.
 */
@Controller({ path: 'employees', version: '1' })
export class EmployeeAssignmentsController {
  /**
   * @param assignments - Assignment service.
   */
  constructor(private readonly assignments: AssignmentService) {}

  /**
   * Handles `GET /v1/employees/:id/assignments`: lists the employee's assignments.
   *
   * @param user - Signed-in user.
   * @param id - Employee identifier.
   * @returns The assignments, newest start first.
   */
  @Get(':id/assignments')
  @RequirePermissions(PERMISSIONS.WORKFORCE_ASSIGNMENT_READ)
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<PositionAssignment[]> {
    return this.assignments.listByEmployee(user.tenant_id, id)
  }
}

/**
 * The assignments of one unit.
 */
@Controller({ path: 'units', version: '1' })
export class UnitAssignmentsController {
  /**
   * @param assignments - Assignment service.
   */
  constructor(private readonly assignments: AssignmentService) {}

  /**
   * Handles `GET /v1/units/:id/assignments`: lists who works in a unit.
   *
   * @param user - Signed-in user.
   * @param id - Unit identifier.
   * @param query - Optional status filter and paging.
   * @returns The assignments of the unit, not of the units below it.
   */
  @Get(':id/assignments')
  @RequirePermissions(PERMISSIONS.WORKFORCE_ASSIGNMENT_READ)
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query() query: ListUnitAssignmentsDto,
  ): Promise<PositionAssignment[]> {
    return this.assignments.listByUnit(user.tenant_id, id, query)
  }
}
