import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { type RosterAssignment } from '@repository/model/roster-assignment'
import { type AuthenticatedUser } from '@identity/authenticated-user'
import { CurrentUser, RequirePermissions } from '@identity/guard/decorators'
import { PERMISSIONS } from '@identity/permission'
import { RosterAssignmentService } from '@workforce/rostering/roster-assignment.service'
import {
  AddAssignmentDto,
  CancelAssignmentDto,
  ChangeAssignmentDto,
  ListAssignmentsDto,
} from './roster-assignment.dto'

/**
 * The roster assignments of the signed-in user's tenant.
 */
@Controller({ version: '1' })
export class RosterAssignmentController {
  /**
   * @param assignments - Assignment service.
   */
  constructor(private readonly assignments: RosterAssignmentService) {}

  /**
   * Handles `GET /v1/rosters/:id/assignments`: lists the assignments of a roster.
   *
   * @param user - Signed-in user.
   * @param id - Roster identifier.
   * @param query - Optional filters and paging.
   * @returns The assignments.
   */
  @Get('rosters/:id/assignments')
  @RequirePermissions(PERMISSIONS.WORKFORCE_ROSTER_ASSIGNMENT_READ)
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query() query: ListAssignmentsDto,
  ): Promise<RosterAssignment[]> {
    return this.assignments.list(user.tenant_id, id, {
      date: query.date,
      from: query.from,
      to: query.to,
      employeeId: query.employeeId,
      status: query.status,
      limit: query.limit,
      offset: query.offset,
    })
  }

  /**
   * Handles `POST /v1/rosters/:id/assignments`: adds one person to one shift on one date.
   *
   * @param user - Signed-in user.
   * @param id - Roster identifier.
   * @param body - The assignment.
   * @returns The created assignment.
   */
  @Post('rosters/:id/assignments')
  @RequirePermissions(PERMISSIONS.WORKFORCE_ROSTER_ASSIGNMENT_WRITE)
  add(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: AddAssignmentDto,
  ): Promise<RosterAssignment> {
    return this.assignments.add(user.tenant_id, id, {
      employeeId: body.employeeId,
      date: body.date,
      shiftId: body.shiftId,
      role: body.role,
      overtimeConsent: body.overtimeConsent,
      reason: body.reason,
    })
  }

  /**
   * Handles `PATCH /v1/roster-assignments/:id`: changes the shift, role or overtime consent.
   *
   * @param user - Signed-in user.
   * @param id - Assignment identifier.
   * @param body - Fields to change.
   * @returns The updated assignment.
   */
  @Patch('roster-assignments/:id')
  @RequirePermissions(PERMISSIONS.WORKFORCE_ROSTER_ASSIGNMENT_WRITE)
  change(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: ChangeAssignmentDto,
  ): Promise<RosterAssignment> {
    return this.assignments.change(user.tenant_id, id, {
      shiftId: body.shiftId,
      role: body.role,
      overtimeConsent: body.overtimeConsent,
      version: body.version,
      reason: body.reason,
    })
  }

  /**
   * Handles `POST /v1/roster-assignments/:id/cancel`: cancels an assignment.
   *
   * @param user - Signed-in user.
   * @param id - Assignment identifier.
   * @param body - Optional version and reason.
   * @returns The cancelled assignment.
   */
  @Post('roster-assignments/:id/cancel')
  @RequirePermissions(PERMISSIONS.WORKFORCE_ROSTER_ASSIGNMENT_WRITE)
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: CancelAssignmentDto,
  ): Promise<RosterAssignment> {
    return this.assignments.cancel(user.tenant_id, id, body)
  }
}
