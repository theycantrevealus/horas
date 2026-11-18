import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common'
import { type CpdRecord } from '@repository/model/cpd-record'
import { type AuthenticatedUser } from '@identity/authenticated-user'
import { CurrentUser, RequirePermissions } from '@identity/guard/decorators'
import { PERMISSIONS } from '@identity/permission'
import {
  CpdService,
  type RegisterCpdInput,
} from '@workforce/credit/cpd.service'
import {
  CpdSummaryService,
  type CpdSummaryView,
} from '@workforce/credit/cpd-summary.service'
import {
  ListCpdRecordsDto,
  OwnCpdRecordDto,
  RecordCpdDto,
  ReviewCpdDto,
  SetCpdSummaryDto,
} from './cpd.dto'

/**
 * Maps the body of a recording to the service input.
 *
 * @param body - The validated body.
 * @param employeeId - The holder, when HR names one.
 * @returns The service input.
 */
function toInput(body: OwnCpdRecordDto, employeeId?: string): RegisterCpdInput {
  return {
    employeeId,
    creditSystem: body.creditSystem,
    activity: {
      title: body.activity.title,
      category: body.activity.category,
      provider: body.activity.provider ?? null,
    },
    activityDate: body.activityDate,
    points: body.points,
    evidence: body.evidence
      ? {
          file_id: body.evidence.fileId,
          content_type: body.evidence.contentType,
          sha256: body.evidence.sha256,
        }
      : null,
    reason: body.reason,
  }
}

/**
 * Professional credit records of the signed-in user's tenant.
 */
@Controller({ path: 'cpd-records', version: '1' })
export class CpdRecordController {
  /**
   * @param credits - Credit service.
   */
  constructor(private readonly credits: CpdService) {}

  /**
   * Handles `POST /v1/cpd-records`: HR records earned credits.
   *
   * @param user - Signed-in user.
   * @param body - The record.
   * @returns The accepted record.
   */
  @Post()
  @RequirePermissions(PERMISSIONS.WORKFORCE_CPD_WRITE)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: RecordCpdDto,
  ): Promise<CpdRecord> {
    return this.credits.create(user.tenant_id, toInput(body, body.employeeId))
  }

  /**
   * Handles `POST /v1/cpd-records/:id/review`: accepts or rejects a record.
   *
   * @param user - Signed-in user.
   * @param id - Record identifier.
   * @param body - Outcome, reason and optional version.
   * @returns The reviewed record.
   */
  @Post(':id/review')
  @RequirePermissions(PERMISSIONS.WORKFORCE_CPD_REVIEW)
  review(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: ReviewCpdDto,
  ): Promise<CpdRecord> {
    return this.credits.review(
      user.tenant_id,
      id,
      { outcome: body.outcome, reason: body.reason, version: body.version },
      user.employee_id ?? null,
    )
  }
}

/**
 * The credit records and totals of one employee, and the signed-in employee's own submission.
 */
@Controller({ path: 'employees', version: '1' })
export class EmployeeCpdController {
  /**
   * @param credits - Credit service.
   * @param summaries - Credit total service.
   */
  constructor(
    private readonly credits: CpdService,
    private readonly summaries: CpdSummaryService,
  ) {}

  /**
   * Handles `GET /v1/employees/:id/cpd-summaries`: lists the stored credit totals, each with the
   * accepted points of its cycle.
   *
   * @param user - Signed-in user.
   * @param id - Employee identifier.
   * @returns The totals.
   */
  @Get(':id/cpd-summaries')
  @RequirePermissions(PERMISSIONS.WORKFORCE_CPD_READ)
  listSummaries(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<CpdSummaryView[]> {
    return this.summaries.list(user.tenant_id, id)
  }

  /**
   * Handles `PUT /v1/employees/:id/cpd-summaries/:system`: records the total read from a national
   * platform.
   *
   * @param user - Signed-in user.
   * @param id - Employee identifier.
   * @param system - The credit system code.
   * @param body - Credit system, cycle, total and optional read time.
   * @returns The stored total.
   */
  @Put(':id/cpd-summaries/:system')
  @RequirePermissions(PERMISSIONS.WORKFORCE_CPD_WRITE)
  setSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('system') system: string,
    @Body() body: SetCpdSummaryDto,
  ): Promise<CpdSummaryView> {
    return this.summaries.set(user.tenant_id, id, system, {
      creditSystem: body.creditSystem,
      cycle: { start: body.cycle.start, end: body.cycle.end },
      totalPoints: body.totalPoints,
      checkedAt: body.checkedAt ? new Date(body.checkedAt) : undefined,
    })
  }

  /**
   * Handles `GET /v1/employees/:id/cpd-records`: lists the employee's credit records.
   *
   * @param user - Signed-in user.
   * @param id - Employee identifier.
   * @param query - Optional filters and paging.
   * @returns The records, newest activity first.
   */
  @Get(':id/cpd-records')
  @RequirePermissions(PERMISSIONS.WORKFORCE_CPD_READ)
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query() query: ListCpdRecordsDto,
  ): Promise<CpdRecord[]> {
    return this.credits.listByEmployee(user.tenant_id, id, {
      creditSystem: query.creditSystem,
      status: query.status,
      limit: query.limit,
      offset: query.offset,
    })
  }

  /**
   * Handles `POST /v1/employees/me/cpd-records`: the signed-in employee submits their own credits.
   *
   * @param user - Signed-in user.
   * @param body - The record.
   * @returns The submitted record.
   */
  @Post('me/cpd-records')
  createOwn(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: OwnCpdRecordDto,
  ): Promise<CpdRecord> {
    return this.credits.createOwn(
      user.tenant_id,
      user.employee_id ?? null,
      toInput(body),
    )
  }
}
