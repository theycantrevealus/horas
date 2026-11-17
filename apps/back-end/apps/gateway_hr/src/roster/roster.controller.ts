import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { type Roster } from '@repository/model/roster'
import { type AuthenticatedUser } from '@identity/authenticated-user'
import { CurrentUser, RequirePermissions } from '@identity/guard/decorators'
import { PERMISSIONS } from '@identity/permission'
import {
  RosterValidationService,
  type ValidationAnswer,
} from '@workforce/rostering/roster-validation.service'
import { RosterService } from '@workforce/rostering/roster.service'
import {
  CoverageOverrideDto,
  CreateRosterDto,
  ListRostersDto,
  ReturnRosterDto,
  RosterMoveDto,
} from './roster.dto'

/**
 * The rosters of the signed-in user's tenant.
 */
@Controller({ path: 'rosters', version: '1' })
export class RosterController {
  /**
   * @param rosters - Roster service.
   * @param validation - Validation service.
   */
  constructor(
    private readonly rosters: RosterService,
    private readonly validation: RosterValidationService,
  ) {}

  /**
   * Handles `GET /v1/rosters`: lists rosters, latest period first.
   *
   * @param user - Signed-in user.
   * @param query - Optional filters and paging.
   * @returns The rosters.
   */
  @Get()
  @RequirePermissions(PERMISSIONS.WORKFORCE_ROSTER_READ)
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListRostersDto,
  ): Promise<Roster[]> {
    return this.rosters.list(user.tenant_id, {
      unitId: query.unitId,
      facilityId: query.facilityId,
      status: query.status,
      from: query.from,
      to: query.to,
      limit: query.limit,
      offset: query.offset,
    })
  }

  /**
   * Handles `GET /v1/rosters/:id`: views one roster.
   *
   * @param user - Signed-in user.
   * @param id - Roster identifier.
   * @returns The roster.
   */
  @Get(':id')
  @RequirePermissions(PERMISSIONS.WORKFORCE_ROSTER_READ)
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<Roster> {
    return this.rosters.get(user.tenant_id, id)
  }

  /**
   * Handles `POST /v1/rosters`: creates an empty draft.
   *
   * @param user - Signed-in user.
   * @param body - The roster.
   * @returns The created roster.
   */
  @Post()
  @RequirePermissions(PERMISSIONS.WORKFORCE_ROSTER_WRITE)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateRosterDto,
  ): Promise<Roster> {
    return this.rosters.create(user.tenant_id, {
      unitId: body.unitId,
      period: body.period,
      reason: body.reason,
    })
  }

  /**
   * Handles `POST /v1/rosters/:id/submit`: sends a draft for approval.
   *
   * @param user - Signed-in user.
   * @param id - Roster identifier.
   * @param body - Optional version and reason.
   * @returns The submitted roster.
   */
  @Post(':id/submit')
  @RequirePermissions(PERMISSIONS.WORKFORCE_ROSTER_WRITE)
  submit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: RosterMoveDto,
  ): Promise<Roster> {
    return this.rosters.submit(user.tenant_id, id, body)
  }

  /**
   * Handles `POST /v1/rosters/:id/approve`: approves a submitted roster.
   *
   * @param user - Signed-in user.
   * @param id - Roster identifier.
   * @param body - Optional version and reason.
   * @returns The approved roster.
   */
  @Post(':id/approve')
  @RequirePermissions(PERMISSIONS.WORKFORCE_ROSTER_APPROVE)
  approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: RosterMoveDto,
  ): Promise<Roster> {
    return this.rosters.approve(user.tenant_id, id, body)
  }

  /**
   * Handles `POST /v1/rosters/:id/return`: returns a submitted or approved roster to draft.
   *
   * @param user - Signed-in user.
   * @param id - Roster identifier.
   * @param body - The reason and an optional version.
   * @returns The draft roster.
   */
  @Post(':id/return')
  @RequirePermissions(PERMISSIONS.WORKFORCE_ROSTER_APPROVE)
  return(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: ReturnRosterDto,
  ): Promise<Roster> {
    return this.rosters.return(user.tenant_id, id, body)
  }

  /**
   * Handles `POST /v1/rosters/:id/publish`: publishes an approved roster, or a draft when approval
   * is not required.
   *
   * @param user - Signed-in user.
   * @param id - Roster identifier.
   * @param body - Optional version and reason.
   * @returns The published roster.
   */
  @Post(':id/publish')
  @RequirePermissions(PERMISSIONS.WORKFORCE_ROSTER_WRITE)
  publish(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: RosterMoveDto,
  ): Promise<Roster> {
    return this.rosters.publish(user.tenant_id, id, body)
  }

  /**
   * Handles `POST /v1/rosters/:id/close`: closes a published roster after its period.
   *
   * @param user - Signed-in user.
   * @param id - Roster identifier.
   * @param body - Optional version and reason.
   * @returns The closed roster.
   */
  @Post(':id/close')
  @RequirePermissions(PERMISSIONS.WORKFORCE_ROSTER_WRITE)
  close(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: RosterMoveDto,
  ): Promise<Roster> {
    return this.rosters.close(user.tenant_id, id, body)
  }

  /**
   * Handles `POST /v1/rosters/:id/validate`: checks every rule and the coverage of a roster and
   * answers the violations and the gaps. Nothing is refused.
   *
   * @param user - Signed-in user.
   * @param id - Roster identifier.
   * @returns The report and when it ran.
   */
  @Post(':id/validate')
  @RequirePermissions(PERMISSIONS.WORKFORCE_ROSTER_VALIDATE)
  validate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<ValidationAnswer> {
    return this.validation.validate(user.tenant_id, id)
  }

  /**
   * Handles `POST /v1/rosters/:id/coverage-overrides`: accepts a coverage gap with a reason.
   *
   * @param user - Signed-in user.
   * @param id - Roster identifier.
   * @param body - The gap and the reason.
   * @returns The roster with the override.
   */
  @Post(':id/coverage-overrides')
  @RequirePermissions(PERMISSIONS.WORKFORCE_ROSTER_OVERRIDE)
  addOverride(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: CoverageOverrideDto,
  ): Promise<Roster> {
    return this.validation.addOverride(user.tenant_id, id, {
      date: body.date,
      shiftId: body.shiftId,
      requirementId: body.requirementId,
      reason: body.reason,
      version: body.version,
    })
  }
}
