import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common'
import { type Separation } from '@repository/model/separation'
import {
  CurrentPermissions,
  RequirePermissions,
} from '@identity/guard/decorators'
import { PERMISSIONS } from '@identity/permission'
import { type AuthenticatedUser } from '@identity/authenticated-user'
import { CurrentUser } from '@identity/guard/decorators'
import {
  SeparationImpactService,
  type SeparationImpact,
} from '@workforce/separation/separation-impact.service'
import { SeparationService } from '@workforce/separation/separation.service'
import { ForbiddenError } from '@workforce/workforce.error'
import {
  CancelSeparationDto,
  ChecklistItemDto,
  CreateSeparationDto,
  SeparationsQueryDto,
  UpdateSeparationDto,
} from './separation.dto'

/**
 * Separations of the signed-in user's tenant (HR spec 9.10): record, change, cancel, read, the
 * impact and the exit checklist. Completion is added with the worker job.
 */
@Controller({ version: '1' })
export class SeparationController {
  /**
   * @param separations - Separation service.
   * @param impacts - Separation impact service.
   */
  constructor(
    private readonly separations: SeparationService,
    private readonly impacts: SeparationImpactService,
  ) {}

  /**
   * Handles `POST /v1/employees/:id/separations`: records a separation. An immediate separation also
   * needs `workforce.separation:complete`.
   *
   * @param user - Signed-in user.
   * @param held - The caller's permissions.
   * @param id - Employee identifier.
   * @param body - The separation.
   * @returns The separation, without its reason.
   */
  @Post('employees/:id/separations')
  @RequirePermissions(PERMISSIONS.WORKFORCE_SEPARATION_WRITE)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentPermissions() held: ReadonlySet<string>,
    @Param('id') id: string,
    @Body() body: CreateSeparationDto,
  ): Promise<Separation> {
    if (
      body.immediate === true &&
      !held.has(PERMISSIONS.WORKFORCE_SEPARATION_COMPLETE)
    ) {
      throw new ForbiddenError(
        'permission_required',
        'An immediate separation needs the permission to complete it.',
      )
    }
    return this.separations.create(user.tenant_id, id, {
      type: { system: body.type.system, code: body.type.code },
      lastWorkingDay: body.lastWorkingDay,
      noticeReceivedOn: body.noticeReceivedOn ?? null,
      immediate: body.immediate,
      reason: body.reason,
    })
  }

  /**
   * Handles `GET /v1/separations`: separations, by last working day.
   *
   * @param user - Signed-in user.
   * @param query - Filters and paging.
   * @returns The separations, without reasons.
   */
  @Get('separations')
  @RequirePermissions(PERMISSIONS.WORKFORCE_SEPARATION_READ)
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SeparationsQueryDto,
  ): Promise<Separation[]> {
    return this.separations.list(user.tenant_id, query)
  }

  /**
   * Handles `GET /v1/separations/:id`: one separation, without its reason.
   *
   * @param user - Signed-in user.
   * @param id - Separation identifier.
   * @returns The separation.
   */
  @Get('separations/:id')
  @RequirePermissions(PERMISSIONS.WORKFORCE_SEPARATION_READ)
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<Separation> {
    return this.separations.get(user.tenant_id, id)
  }

  /**
   * Handles `GET /v1/separations/:id/details`: the reason. The read is recorded in the change log.
   *
   * @param user - Signed-in user.
   * @param id - Separation identifier.
   * @returns The reason.
   */
  @Get('separations/:id/details')
  @RequirePermissions(PERMISSIONS.WORKFORCE_SEPARATION_READ_DETAILS)
  details(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<{ reason: string }> {
    return this.separations.details(user.tenant_id, id)
  }

  /**
   * Handles `GET /v1/separations/:id/impact`: what completion would close.
   *
   * @param user - Signed-in user.
   * @param id - Separation identifier.
   * @returns The impact.
   */
  @Get('separations/:id/impact')
  @RequirePermissions(PERMISSIONS.WORKFORCE_SEPARATION_READ)
  impact(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<SeparationImpact> {
    return this.impacts.impact(user.tenant_id, id)
  }

  /**
   * Handles `PATCH /v1/separations/:id`: changes a planned separation.
   *
   * @param user - Signed-in user.
   * @param id - Separation identifier.
   * @param body - The changes.
   * @returns The updated separation.
   */
  @Patch('separations/:id')
  @RequirePermissions(PERMISSIONS.WORKFORCE_SEPARATION_WRITE)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: UpdateSeparationDto,
  ): Promise<Separation> {
    return this.separations.update(user.tenant_id, id, {
      type: body.type
        ? { system: body.type.system, code: body.type.code }
        : undefined,
      lastWorkingDay: body.lastWorkingDay,
      noticeReceivedOn: body.noticeReceivedOn,
      reason: body.reason,
      version: body.version,
    })
  }

  /**
   * Handles `POST /v1/separations/:id/cancel`: cancels a planned separation.
   *
   * @param user - Signed-in user.
   * @param id - Separation identifier.
   * @param body - The reason.
   * @returns The cancelled separation.
   */
  @Post('separations/:id/cancel')
  @RequirePermissions(PERMISSIONS.WORKFORCE_SEPARATION_WRITE)
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: CancelSeparationDto,
  ): Promise<Separation> {
    return this.separations.cancel(user.tenant_id, id, body)
  }

  /**
   * Handles `PUT /v1/separations/:id/checklist/:system/:code`: marks an exit checklist item.
   *
   * @param user - Signed-in user.
   * @param id - Separation identifier.
   * @param system - Code system of the item.
   * @param code - Code of the item.
   * @param body - Whether it is done.
   * @returns The separation.
   */
  @Put('separations/:id/checklist/:system/:code')
  @RequirePermissions(PERMISSIONS.WORKFORCE_SEPARATION_WRITE)
  checklist(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('system') system: string,
    @Param('code') code: string,
    @Body() body: ChecklistItemDto,
  ): Promise<Separation> {
    return this.separations.setChecklistItem(
      user.tenant_id,
      id,
      { system, code, done: body.done },
      body.version,
    )
  }
}
