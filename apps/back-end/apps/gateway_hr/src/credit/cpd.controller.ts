import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { type CpdRecord } from '@repository/model/cpd-record'
import { type AuthenticatedUser } from '@identity/authenticated-user'
import { CurrentUser, RequirePermissions } from '@identity/guard/decorators'
import { PERMISSIONS } from '@identity/permission'
import {
  CpdService,
  type RegisterCpdInput,
} from '@workforce/credit/cpd.service'
import {
  ListCpdRecordsDto,
  OwnCpdRecordDto,
  RecordCpdDto,
  ReviewCpdDto,
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
 * The credit records of one employee, and the signed-in employee's own submission.
 */
@Controller({ path: 'employees', version: '1' })
export class EmployeeCpdController {
  /**
   * @param credits - Credit service.
   */
  constructor(private readonly credits: CpdService) {}

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
