import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common'
import { type PracticeSchedule } from '@repository/model/practice-schedule'
import { type AuthenticatedUser } from '@identity/authenticated-user'
import { CurrentUser, RequirePermissions } from '@identity/guard/decorators'
import { PERMISSIONS } from '@identity/permission'
import {
  PracticeScheduleService,
  type PracticeSession,
} from '@workforce/rostering/practice-schedule.service'
import {
  CreatePracticeScheduleDto,
  EndPracticeScheduleDto,
  ListPracticeSchedulesDto,
  UpdatePracticeScheduleDto,
} from './practice-schedule.dto'

/**
 * The practice schedules of the signed-in user's tenant (HR plan 5.8).
 */
@Controller({ path: 'practice-schedules', version: '1' })
export class PracticeScheduleController {
  /**
   * @param schedules - Practice schedule service.
   */
  constructor(private readonly schedules: PracticeScheduleService) {}

  /**
   * Handles `GET /v1/practice-schedules`: lists schedules, or with `date` answers the sessions of
   * that date for registration.
   *
   * @param user - Signed-in user.
   * @param query - Filters, paging and the optional date.
   * @returns The schedules, or the sessions of the date.
   */
  @Get()
  @RequirePermissions(PERMISSIONS.WORKFORCE_PRACTICE_SCHEDULE_READ)
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListPracticeSchedulesDto,
  ): Promise<PracticeSchedule[] | PracticeSession[]> {
    const { date, ...filters } = query
    return date === undefined
      ? this.schedules.list(user.tenant_id, filters)
      : this.schedules.sessions(user.tenant_id, {
          date,
          unitId: filters.unitId,
          employeeId: filters.employeeId,
          limit: filters.limit,
          offset: filters.offset,
        })
  }

  /**
   * Handles `POST /v1/practice-schedules`: adds a doctor's weekly session.
   *
   * @param user - Signed-in user.
   * @param body - The schedule.
   * @returns The created schedule.
   */
  @Post()
  @RequirePermissions(PERMISSIONS.WORKFORCE_PRACTICE_SCHEDULE_WRITE)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreatePracticeScheduleDto,
  ): Promise<PracticeSchedule> {
    return this.schedules.create(user.tenant_id, body)
  }

  /**
   * Handles `PATCH /v1/practice-schedules/:id`: changes the times, quota and validity.
   *
   * @param user - Signed-in user.
   * @param id - Schedule identifier.
   * @param body - Fields to change.
   * @returns The updated schedule.
   */
  @Patch(':id')
  @RequirePermissions(PERMISSIONS.WORKFORCE_PRACTICE_SCHEDULE_WRITE)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: UpdatePracticeScheduleDto,
  ): Promise<PracticeSchedule> {
    return this.schedules.update(user.tenant_id, id, body)
  }

  /**
   * Handles `POST /v1/practice-schedules/:id/end`: ends the schedule after a date.
   *
   * @param user - Signed-in user.
   * @param id - Schedule identifier.
   * @param body - The last date, optional version and reason.
   * @returns The ended schedule.
   */
  @Post(':id/end')
  @RequirePermissions(PERMISSIONS.WORKFORCE_PRACTICE_SCHEDULE_WRITE)
  end(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: EndPracticeScheduleDto,
  ): Promise<PracticeSchedule> {
    return this.schedules.end(user.tenant_id, id, body)
  }
}
