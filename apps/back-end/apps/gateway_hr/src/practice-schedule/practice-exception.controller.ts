import { Body, Controller, Param, Post } from '@nestjs/common'
import { type PracticeScheduleException } from '@repository/model/practice-schedule-exception'
import { type AuthenticatedUser } from '@identity/authenticated-user'
import { CurrentUser, RequirePermissions } from '@identity/guard/decorators'
import { PERMISSIONS } from '@identity/permission'
import { PracticeExceptionService } from '@workforce/rostering/practice-exception.service'
import { CreateExceptionDto, UndoExceptionDto } from './practice-schedule.dto'

/**
 * The exceptions of practice schedules of the signed-in user's tenant (HR plan 5.8).
 */
@Controller({ version: '1' })
export class PracticeExceptionController {
  /**
   * @param exceptions - Practice exception service.
   */
  constructor(private readonly exceptions: PracticeExceptionService) {}

  /**
   * Handles `POST /v1/practice-schedules/:id/exceptions`: cancels or moves one session on a date.
   *
   * @param user - Signed-in user.
   * @param id - Schedule identifier.
   * @param body - The exception.
   * @returns The created exception.
   */
  @Post('practice-schedules/:id/exceptions')
  @RequirePermissions(PERMISSIONS.WORKFORCE_PRACTICE_SCHEDULE_WRITE)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: CreateExceptionDto,
  ): Promise<PracticeScheduleException> {
    return this.exceptions.create(user.tenant_id, id, body)
  }

  /**
   * Handles `POST /v1/practice-schedule-exceptions/:id/cancel`: undoes an exception.
   *
   * @param user - Signed-in user.
   * @param id - Exception identifier.
   * @param body - Optional version and reason.
   * @returns The exception as it was.
   */
  @Post('practice-schedule-exceptions/:id/cancel')
  @RequirePermissions(PERMISSIONS.WORKFORCE_PRACTICE_SCHEDULE_WRITE)
  undo(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: UndoExceptionDto,
  ): Promise<PracticeScheduleException> {
    return this.exceptions.undo(user.tenant_id, id, body)
  }
}
