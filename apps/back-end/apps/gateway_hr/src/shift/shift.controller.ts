import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common'
import { type ShiftDefinition } from '@repository/model/shift-definition'
import { type AuthenticatedUser } from '@identity/authenticated-user'
import { CurrentUser, RequirePermissions } from '@identity/guard/decorators'
import { PERMISSIONS } from '@identity/permission'
import { ShiftService } from '@workforce/rostering/shift.service'
import {
  CreateShiftDto,
  ListShiftsDto,
  RetireShiftDto,
  UpdateShiftDto,
} from './shift.dto'

/**
 * The shift definitions of the signed-in user's tenant.
 */
@Controller({ path: 'shift-definitions', version: '1' })
export class ShiftController {
  /**
   * @param shifts - Shift service.
   */
  constructor(private readonly shifts: ShiftService) {}

  /**
   * Handles `GET /v1/shift-definitions`: lists shifts, ordered by facility and code.
   *
   * @param user - Signed-in user.
   * @param query - Optional filters and paging.
   * @returns The shifts.
   */
  @Get()
  @RequirePermissions(PERMISSIONS.WORKFORCE_SHIFT_DEFINITION_READ)
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListShiftsDto,
  ): Promise<ShiftDefinition[]> {
    return this.shifts.list(user.tenant_id, {
      facilityId: query.facilityId,
      status: query.status,
      type: query.type,
      unitId: query.unitId,
      limit: query.limit,
      offset: query.offset,
    })
  }

  /**
   * Handles `POST /v1/shift-definitions`: defines a shift.
   *
   * @param user - Signed-in user.
   * @param body - The shift.
   * @returns The created shift.
   */
  @Post()
  @RequirePermissions(PERMISSIONS.WORKFORCE_SHIFT_DEFINITION_WRITE)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateShiftDto,
  ): Promise<ShiftDefinition> {
    return this.shifts.create(user.tenant_id, {
      facilityId: body.facilityId,
      code: body.code,
      name: body.name ?? [],
      type: body.type,
      startTime: body.startTime,
      endTime: body.endTime,
      paidMinutes: body.paidMinutes,
      isNight: body.isNight,
      unitIds: body.unitIds,
      reason: body.reason,
    })
  }

  /**
   * Handles `PATCH /v1/shift-definitions/:id`: edits a shift.
   *
   * @param user - Signed-in user.
   * @param id - Shift identifier.
   * @param body - Fields to change.
   * @returns The updated shift.
   */
  @Patch(':id')
  @RequirePermissions(PERMISSIONS.WORKFORCE_SHIFT_DEFINITION_WRITE)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: UpdateShiftDto,
  ): Promise<ShiftDefinition> {
    return this.shifts.update(user.tenant_id, id, {
      name: body.name,
      startTime: body.startTime,
      endTime: body.endTime,
      paidMinutes: body.paidMinutes,
      isNight: body.isNight,
      unitIds: body.unitIds,
      version: body.version,
      reason: body.reason,
    })
  }

  /**
   * Handles `POST /v1/shift-definitions/:id/retire`: stops a shift from being assigned.
   *
   * @param user - Signed-in user.
   * @param id - Shift identifier.
   * @param body - Optional version and reason.
   * @returns The retired shift.
   */
  @Post(':id/retire')
  @RequirePermissions(PERMISSIONS.WORKFORCE_SHIFT_DEFINITION_WRITE)
  retire(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: RetireShiftDto,
  ): Promise<ShiftDefinition> {
    return this.shifts.retire(user.tenant_id, id, body)
  }
}
