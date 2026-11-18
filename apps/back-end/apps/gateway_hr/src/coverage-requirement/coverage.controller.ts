import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common'
import { type CoverageRequirement } from '@repository/model/coverage-requirement'
import { type AuthenticatedUser } from '@identity/authenticated-user'
import { CurrentUser, RequirePermissions } from '@identity/guard/decorators'
import { PERMISSIONS } from '@identity/permission'
import { CoverageService } from '@workforce/rostering/coverage.service'
import {
  CreateCoverageDto,
  ListCoverageDto,
  RetireCoverageDto,
  UpdateCoverageDto,
} from './coverage.dto'

/**
 * The coverage requirements of the signed-in user's tenant.
 */
@Controller({ path: 'coverage-requirements', version: '1' })
export class CoverageController {
  /**
   * @param coverage - Coverage service.
   */
  constructor(private readonly coverage: CoverageService) {}

  /**
   * Handles `GET /v1/coverage-requirements`: lists requirements.
   *
   * @param user - Signed-in user.
   * @param query - Optional filters and paging.
   * @returns The requirements.
   */
  @Get()
  @RequirePermissions(PERMISSIONS.WORKFORCE_COVERAGE_REQUIREMENT_READ)
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListCoverageDto,
  ): Promise<CoverageRequirement[]> {
    return this.coverage.list(user.tenant_id, {
      unitId: query.unitId,
      shiftId: query.shiftId,
      status: query.status,
      dayPattern: query.dayPattern,
      onDate: query.onDate,
      limit: query.limit,
      offset: query.offset,
    })
  }

  /**
   * Handles `POST /v1/coverage-requirements`: adds a requirement.
   *
   * @param user - Signed-in user.
   * @param body - The requirement.
   * @returns The created requirement.
   */
  @Post()
  @RequirePermissions(PERMISSIONS.WORKFORCE_COVERAGE_REQUIREMENT_WRITE)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateCoverageDto,
  ): Promise<CoverageRequirement> {
    return this.coverage.create(user.tenant_id, {
      unitId: body.unitId,
      shiftId: body.shiftId,
      dayPattern: body.dayPattern,
      match: body.match,
      minCount: body.minCount,
      teamLeaderRequired: body.teamLeaderRequired,
      period: body.period,
      reason: body.reason,
    })
  }

  /**
   * Handles `PATCH /v1/coverage-requirements/:id`: edits a requirement.
   *
   * @param user - Signed-in user.
   * @param id - Requirement identifier.
   * @param body - Fields to change.
   * @returns The updated requirement.
   */
  @Patch(':id')
  @RequirePermissions(PERMISSIONS.WORKFORCE_COVERAGE_REQUIREMENT_WRITE)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: UpdateCoverageDto,
  ): Promise<CoverageRequirement> {
    return this.coverage.update(user.tenant_id, id, {
      dayPattern: body.dayPattern,
      match: body.match,
      minCount: body.minCount,
      teamLeaderRequired: body.teamLeaderRequired,
      periodEnd: body.period?.end,
      version: body.version,
      reason: body.reason,
    })
  }

  /**
   * Handles `POST /v1/coverage-requirements/:id/retire`: stops checking a requirement.
   *
   * @param user - Signed-in user.
   * @param id - Requirement identifier.
   * @param body - Optional version and reason.
   * @returns The retired requirement.
   */
  @Post(':id/retire')
  @RequirePermissions(PERMISSIONS.WORKFORCE_COVERAGE_REQUIREMENT_WRITE)
  retire(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: RetireCoverageDto,
  ): Promise<CoverageRequirement> {
    return this.coverage.retire(user.tenant_id, id, body)
  }
}
