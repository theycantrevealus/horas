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
import { type LeaveRequest } from '@repository/model/leave-request'
import { type AuthenticatedUser } from '@identity/authenticated-user'
import {
  CurrentPermissions,
  CurrentUser,
  RequirePermissions,
} from '@identity/guard/decorators'
import { PERMISSIONS } from '@identity/permission'
import { LeaveDecisionService } from '@workforce/leave/leave-decision.service'
import { LeaveTypeChangeService } from '@workforce/leave/leave-type-change.service'
import {
  LeaveCoverService,
  type ConfirmCoverResult,
  type LeaveCoverProposal,
} from '@workforce/leave/leave-cover.service'
import { LeaveEndEarlyService } from '@workforce/leave/leave-end-early.service'
import { LeaveDetailService } from '@workforce/leave/leave-detail.service'
import { type LeaveCaller } from '@workforce/leave/leave-caller'
import {
  LeaveRequestService,
  type LeavePreview,
  type LeaveRequestInput,
} from '@workforce/leave/leave-request.service'
import {
  AdjustDaysDto,
  ApproveLeaveDto,
  CancelLeaveDto,
  ChangeLeaveTypeDto,
  ConfirmCoverDto,
  EndEarlyDto,
  RejectLeaveDto,
  HrLeaveRequestDto,
  LeaveDatesDto,
  LeaveRequestsQueryDto,
  OwnLeaveRequestDto,
  OwnLeaveRequestsQueryDto,
  PreviewLeaveDto,
  ProofDto,
} from './leave-request.dto'

/**
 * Builds the caller the leave services decide on from the signed-in user and the permissions the
 * guard loaded.
 *
 * @param user - Signed-in user.
 * @param held - The caller's permissions.
 * @returns The caller.
 */
function toCaller(
  user: AuthenticatedUser,
  held: ReadonlySet<string>,
): LeaveCaller {
  return {
    accountId: user.id,
    employeeId: user.employee_id,
    canRead: held.has(PERMISSIONS.WORKFORCE_LEAVE_REQUEST_READ),
    canReadDetails: held.has(PERMISSIONS.WORKFORCE_LEAVE_REQUEST_READ_DETAILS),
    canWrite: held.has(PERMISSIONS.WORKFORCE_LEAVE_REQUEST_WRITE),
    canDecide: held.has(PERMISSIONS.WORKFORCE_LEAVE_REQUEST_DECIDE),
    canApproveHr: held.has(PERMISSIONS.WORKFORCE_LEAVE_REQUEST_APPROVE_HR),
  }
}

/**
 * Maps the dates of a body to the service input.
 *
 * @param body - The dates as sent.
 * @param employeeId - The employee to request for, if not the caller.
 * @returns The service input.
 */
function toInput(body: LeaveDatesDto, employeeId?: string): LeaveRequestInput {
  return {
    ...(employeeId === undefined ? {} : { employeeId }),
    leaveType: { system: body.leaveType.system, code: body.leaveType.code },
    start: body.start,
    end: body.end,
    ...(body.halfDays ? { halfDays: body.halfDays } : {}),
  }
}

/**
 * Leave requests of the signed-in user's tenant: preview, create and read. Routes marked with an
 * empty permission list need a sign-in only; the services decide what the caller may see.
 */
@Controller({ version: '1' })
export class LeaveRequestController {
  /**
   * @param requests - Leave request service.
   * @param details - Leave detail service, for the reason and the proof.
   * @param decisions - Leave decision service: days, approve, reject and cancel.
   * @param typeChanges - Leave type change service.
   * @param covers - Cover of an approved leave by the replacement.
   * @param endings - Ending an approved leave early.
   */
  constructor(
    private readonly requests: LeaveRequestService,
    private readonly details: LeaveDetailService,
    private readonly decisions: LeaveDecisionService,
    private readonly typeChanges: LeaveTypeChangeService,
    private readonly covers: LeaveCoverService,
    private readonly endings: LeaveEndEarlyService,
  ) {}

  /**
   * Handles `POST /v1/leave-requests/preview`: what a request would count and who would decide it.
   * Writes nothing.
   *
   * @param user - Signed-in user.
   * @param held - The caller's permissions.
   * @param body - The dates.
   * @returns The preview.
   */
  @Post('leave-requests/preview')
  @RequirePermissions()
  preview(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentPermissions() held: ReadonlySet<string>,
    @Body() body: PreviewLeaveDto,
  ): Promise<LeavePreview> {
    return this.requests.preview(
      user.tenant_id,
      toCaller(user, held),
      toInput(body, body.employeeId),
    )
  }

  /**
   * Handles `POST /v1/employees/me/leave-requests`: the signed-in employee requests leave.
   *
   * @param user - Signed-in user.
   * @param held - The caller's permissions.
   * @param body - The request.
   * @returns The request, without its reason.
   */
  @Post('employees/me/leave-requests')
  @RequirePermissions()
  createOwn(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentPermissions() held: ReadonlySet<string>,
    @Body() body: OwnLeaveRequestDto,
  ): Promise<LeaveRequest> {
    return this.requests.create(user.tenant_id, toCaller(user, held), {
      ...toInput(body),
      reason: body.reason,
    })
  }

  /**
   * Handles `POST /v1/leave-requests`: HR requests leave for an employee.
   *
   * @param user - Signed-in user.
   * @param held - The caller's permissions.
   * @param body - The request.
   * @returns The request, without its reason.
   */
  @Post('leave-requests')
  @RequirePermissions(PERMISSIONS.WORKFORCE_LEAVE_REQUEST_WRITE)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentPermissions() held: ReadonlySet<string>,
    @Body() body: HrLeaveRequestDto,
  ): Promise<LeaveRequest> {
    return this.requests.create(user.tenant_id, toCaller(user, held), {
      ...toInput(body, body.employeeId),
      reason: body.reason,
    })
  }

  /**
   * Handles `GET /v1/employees/me/leave-requests`: the signed-in employee's own requests.
   *
   * @param user - Signed-in user.
   * @param held - The caller's permissions.
   * @param query - Filters and paging.
   * @returns The requests.
   */
  @Get('employees/me/leave-requests')
  @RequirePermissions()
  listOwn(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentPermissions() held: ReadonlySet<string>,
    @Query() query: OwnLeaveRequestsQueryDto,
  ): Promise<LeaveRequest[]> {
    return this.requests.listOwn(user.tenant_id, toCaller(user, held), query)
  }

  /**
   * Handles `GET /v1/leave-requests`: every request of the tenant, or what waits for the caller.
   *
   * @param user - Signed-in user.
   * @param held - The caller's permissions.
   * @param query - Filters and paging.
   * @returns The requests.
   */
  @Get('leave-requests')
  @RequirePermissions()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentPermissions() held: ReadonlySet<string>,
    @Query() query: LeaveRequestsQueryDto,
  ): Promise<LeaveRequest[]> {
    return this.requests.list(user.tenant_id, toCaller(user, held), query)
  }

  /**
   * Handles `GET /v1/leave-requests/:id`: one request, without its reason and proof.
   *
   * @param user - Signed-in user.
   * @param held - The caller's permissions.
   * @param id - Request identifier.
   * @returns The request.
   */
  @Get('leave-requests/:id')
  @RequirePermissions()
  get(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentPermissions() held: ReadonlySet<string>,
    @Param('id') id: string,
  ): Promise<LeaveRequest> {
    return this.requests.get(user.tenant_id, id, toCaller(user, held))
  }

  /**
   * Handles `GET /v1/leave-requests/:id/details`: the reason and the proof. The read is recorded in
   * the change log.
   *
   * @param user - Signed-in user.
   * @param held - The caller's permissions.
   * @param id - Request identifier.
   * @returns The reason and the proof.
   */
  @Get('leave-requests/:id/details')
  @RequirePermissions()
  readDetails(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentPermissions() held: ReadonlySet<string>,
    @Param('id') id: string,
  ) {
    return this.details.read(user.tenant_id, id, toCaller(user, held))
  }

  /**
   * Handles `PUT /v1/leave-requests/:id/proof`: attaches the proof of a leave.
   *
   * @param user - Signed-in user.
   * @param held - The caller's permissions.
   * @param id - Request identifier.
   * @param body - The proof.
   * @returns The request, without its reason and proof.
   */
  @Put('leave-requests/:id/proof')
  @RequirePermissions()
  attachProof(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentPermissions() held: ReadonlySet<string>,
    @Param('id') id: string,
    @Body() body: ProofDto,
  ): Promise<LeaveRequest> {
    return this.details.attachProof(
      user.tenant_id,
      id,
      {
        file_id: body.proof.fileId,
        content_type: body.proof.contentType,
        sha256: body.proof.sha256,
      },
      toCaller(user, held),
      body.version,
    )
  }

  /**
   * Handles `PATCH /v1/leave-requests/:id/days`: the Head corrects the counted days.
   *
   * @param user - Signed-in user.
   * @param held - The caller's permissions.
   * @param id - Request identifier.
   * @param body - The dates to change.
   * @returns The updated request.
   */
  @Patch('leave-requests/:id/days')
  @RequirePermissions()
  adjustDays(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentPermissions() held: ReadonlySet<string>,
    @Param('id') id: string,
    @Body() body: AdjustDaysDto,
  ): Promise<LeaveRequest> {
    return this.decisions.adjustDays(user.tenant_id, id, body, toCaller(user, held))
  }

  /**
   * Handles `POST /v1/leave-requests/:id/approve`: approves the step the request waits for.
   *
   * @param user - Signed-in user.
   * @param held - The caller's permissions.
   * @param id - Request identifier.
   * @param body - The replacement of the first step.
   * @returns The updated request.
   */
  @Post('leave-requests/:id/approve')
  @RequirePermissions()
  approve(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentPermissions() held: ReadonlySet<string>,
    @Param('id') id: string,
    @Body() body: ApproveLeaveDto,
  ): Promise<LeaveRequest> {
    return this.decisions.approve(user.tenant_id, id, body, toCaller(user, held))
  }

  /**
   * Handles `POST /v1/leave-requests/:id/reject`: rejects the step the request waits for.
   *
   * @param user - Signed-in user.
   * @param held - The caller's permissions.
   * @param id - Request identifier.
   * @param body - The reason.
   * @returns The updated request.
   */
  @Post('leave-requests/:id/reject')
  @RequirePermissions()
  reject(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentPermissions() held: ReadonlySet<string>,
    @Param('id') id: string,
    @Body() body: RejectLeaveDto,
  ): Promise<LeaveRequest> {
    return this.decisions.reject(user.tenant_id, id, body, toCaller(user, held))
  }

  /**
   * Handles `POST /v1/leave-requests/:id/cancel`: the requester, or HR, cancels a request.
   *
   * @param user - Signed-in user.
   * @param held - The caller's permissions.
   * @param id - Request identifier.
   * @param body - The reason, required for an approved leave.
   * @returns The updated request.
   */
  @Post('leave-requests/:id/cancel')
  @RequirePermissions()
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentPermissions() held: ReadonlySet<string>,
    @Param('id') id: string,
    @Body() body: CancelLeaveDto,
  ): Promise<LeaveRequest> {
    return this.decisions.cancel(user.tenant_id, id, body, toCaller(user, held))
  }

  /**
   * Handles `POST /v1/leave-requests/:id/change-type`: HR changes the leave type of an approved
   * leave.
   *
   * @param user - Signed-in user.
   * @param id - Request identifier.
   * @param body - The new type and the reason.
   * @returns The updated request.
   */
  @Post('leave-requests/:id/change-type')
  @RequirePermissions(PERMISSIONS.WORKFORCE_LEAVE_REQUEST_CHANGE_TYPE)
  changeType(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: ChangeLeaveTypeDto,
  ): Promise<LeaveRequest> {
    return this.typeChanges.change(user.tenant_id, id, {
      leaveType: { system: body.leaveType.system, code: body.leaveType.code },
      reason: body.reason,
      version: body.version,
    })
  }

  /**
   * Handles `GET /v1/leave-requests/:id/cover`: the cancelled shifts checked against the
   * replacement now. Writes no log.
   *
   * @param user - Signed-in user.
   * @param held - The caller's permissions.
   * @param id - Request identifier.
   * @returns The proposal.
   */
  @Get('leave-requests/:id/cover')
  @RequirePermissions()
  proposal(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentPermissions() held: ReadonlySet<string>,
    @Param('id') id: string,
  ): Promise<LeaveCoverProposal> {
    return this.covers.proposal(user.tenant_id, id, toCaller(user, held))
  }

  /**
   * Handles `POST /v1/leave-requests/:id/cover`: the first-step decider gives the chosen shifts to
   * the replacement. Once per request.
   *
   * @param user - Signed-in user.
   * @param held - The caller's permissions.
   * @param id - Request identifier.
   * @param body - The shifts to cover.
   * @returns The created assignments and the refused items.
   */
  @Post('leave-requests/:id/cover')
  @RequirePermissions()
  confirmCover(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentPermissions() held: ReadonlySet<string>,
    @Param('id') id: string,
    @Body() body: ConfirmCoverDto,
  ): Promise<ConfirmCoverResult> {
    return this.covers.confirm(user.tenant_id, id, body, toCaller(user, held))
  }

  /**
   * Handles `POST /v1/leave-requests/:id/end-early`: HR ends a leave that has started before its
   * last day.
   *
   * @param user - Signed-in user.
   * @param id - Request identifier.
   * @param body - The last date and the reason.
   * @returns The updated request.
   */
  @Post('leave-requests/:id/end-early')
  @RequirePermissions(PERMISSIONS.WORKFORCE_LEAVE_REQUEST_WRITE)
  endEarly(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: EndEarlyDto,
  ): Promise<LeaveRequest> {
    return this.endings.endEarly(user.tenant_id, id, body)
  }
}
