import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { type HolidayCalendar } from '@repository/model/holiday-calendar'
import { type AuthenticatedUser } from '@identity/authenticated-user'
import { CurrentUser, RequirePermissions } from '@identity/guard/decorators'
import { PERMISSIONS } from '@identity/permission'
import { HolidayImportService } from '@workforce/rostering/holiday-import.service'
import { HolidayService } from '@workforce/rostering/holiday.service'
import { type HrImport } from '@repository/model/hr-import'
import {
  AddHolidayDto,
  CreateCalendarDto,
  ImportHolidaysQueryDto,
  ListCalendarsDto,
  RemoveHolidayDto,
} from './holiday.dto'

/**
 * The holiday calendars of the signed-in user's tenant.
 */
@Controller({ path: 'holiday-calendars', version: '1' })
export class HolidayController {
  /**
   * @param holidays - Holiday service.
   * @param holidayImports - Holiday import service.
   */
  constructor(
    private readonly holidays: HolidayService,
    private readonly holidayImports: HolidayImportService,
  ) {}

  /**
   * Handles `GET /v1/holiday-calendars`: lists calendars with their holidays.
   *
   * @param user - Signed-in user.
   * @param query - Optional filters and paging.
   * @returns The calendars.
   */
  @Get()
  @RequirePermissions(PERMISSIONS.WORKFORCE_HOLIDAY_CALENDAR_READ)
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListCalendarsDto,
  ): Promise<HolidayCalendar[]> {
    return this.holidays.list(user.tenant_id, {
      code: query.code,
      year: query.year,
      country: query.country,
      includeRemoved: query.includeRemoved,
      limit: query.limit,
      offset: query.offset,
    })
  }

  /**
   * Handles `POST /v1/holiday-calendars`: creates an empty calendar for a year.
   *
   * @param user - Signed-in user.
   * @param body - The calendar.
   * @returns The created calendar.
   */
  @Post()
  @RequirePermissions(PERMISSIONS.WORKFORCE_HOLIDAY_CALENDAR_WRITE)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateCalendarDto,
  ): Promise<HolidayCalendar> {
    return this.holidays.create(user.tenant_id, {
      code: body.code,
      year: body.year,
      country: body.country,
      subdivision: body.subdivision,
      reason: body.reason,
    })
  }

  /**
   * Handles `POST /v1/holiday-calendars/:id/holidays`: adds a holiday by hand.
   *
   * @param user - Signed-in user.
   * @param id - Calendar identifier.
   * @param body - The holiday.
   * @returns The updated calendar.
   */
  @Post(':id/holidays')
  @RequirePermissions(PERMISSIONS.WORKFORCE_HOLIDAY_CALENDAR_WRITE)
  addHoliday(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: AddHolidayDto,
  ): Promise<HolidayCalendar> {
    return this.holidays.addHoliday(user.tenant_id, id, {
      date: body.date,
      kind: body.kind,
      name: body.name,
      version: body.version,
      reason: body.reason,
    })
  }

  /**
   * Handles `POST /v1/holiday-calendars/:id/holidays/remove`: removes a holiday.
   *
   * @param user - Signed-in user.
   * @param id - Calendar identifier.
   * @param body - The day and kind to remove.
   * @returns The updated calendar.
   */
  @Post(':id/holidays/remove')
  @RequirePermissions(PERMISSIONS.WORKFORCE_HOLIDAY_CALENDAR_WRITE)
  removeHoliday(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: RemoveHolidayDto,
  ): Promise<HolidayCalendar> {
    return this.holidays.removeHoliday(user.tenant_id, id, {
      date: body.date,
      kind: body.kind,
      version: body.version,
      reason: body.reason,
    })
  }

  /**
   * Handles `POST /v1/holiday-calendars/:id/imports`: checks a CSV file (the request body, content
   * type `text/csv`), or applies a file that was checked.
   *
   * @param user - Signed-in user.
   * @param id - Calendar identifier.
   * @param query - Whether to apply, the check, the version and the reason.
   * @param body - The CSV text; anything else is refused by the service.
   * @returns The import record, with its counts and row errors.
   */
  @Post(':id/imports')
  @RequirePermissions(PERMISSIONS.WORKFORCE_HOLIDAY_CALENDAR_WRITE)
  importFile(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query() query: ImportHolidaysQueryDto,
    @Body() body: unknown,
  ): Promise<HrImport> {
    return this.holidayImports.importFile(user.tenant_id, id, {
      content: body,
      apply: query.apply,
      checkId: query.checkId,
      version: query.version,
      reason: query.reason,
    })
  }
}
