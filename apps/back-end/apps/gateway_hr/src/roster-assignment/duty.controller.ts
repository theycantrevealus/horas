import { Controller, Get, Param, Query } from '@nestjs/common'
import { type RosterAssignment } from '@repository/model/roster-assignment'
import { type AuthenticatedUser } from '@identity/authenticated-user'
import { CurrentUser, RequirePermissions } from '@identity/guard/decorators'
import { PERMISSIONS } from '@identity/permission'
import { DutyService } from '@workforce/rostering/duty.service'
import { MyRosterDto, OnDutyDto } from './duty.dto'

/**
 * The two reads of published rosters: who is on duty in a unit, and my own shifts.
 */
@Controller({ version: '1' })
export class DutyController {
  /**
   * @param duty - Duty service.
   */
  constructor(private readonly duty: DutyService) {}

  /**
   * Handles `GET /v1/units/:id/on-duty`: who is on duty in a unit at a moment.
   *
   * @param user - Signed-in user.
   * @param id - Unit identifier.
   * @param query - The moment; now when missing.
   * @returns The assignments on duty, with their role.
   */
  @Get('units/:id/on-duty')
  @RequirePermissions(PERMISSIONS.WORKFORCE_ROSTER_ASSIGNMENT_READ)
  onDuty(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query() query: OnDutyDto,
  ): Promise<RosterAssignment[]> {
    return this.duty.onDuty(
      user.tenant_id,
      id,
      query.at ? new Date(query.at) : undefined,
    )
  }

  /**
   * Handles `GET /v1/employees/me/roster`: the signed-in employee's own shifts. It needs a
   * sign-in and a linked employee, and no permission.
   *
   * @param user - Signed-in user.
   * @param query - First and last day.
   * @returns The employee's own planned assignments of published rosters.
   */
  @Get('employees/me/roster')
  myRoster(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: MyRosterDto,
  ): Promise<RosterAssignment[]> {
    return this.duty.myRoster(
      user.tenant_id,
      user.employee_id,
      query.from,
      query.to,
    )
  }
}
