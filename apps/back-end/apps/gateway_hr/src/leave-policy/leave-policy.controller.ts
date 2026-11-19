import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common'
import { type LeavePolicy } from '@repository/model/leave-policy'
import { type AuthenticatedUser } from '@identity/authenticated-user'
import { CurrentUser, RequirePermissions } from '@identity/guard/decorators'
import { PERMISSIONS } from '@identity/permission'
import {
  LeavePolicyService,
  type ImportLeavePoliciesResult,
} from '@workforce/leave/leave-policy.service'
import {
  CreateLeavePolicyDto,
  ImportLeavePoliciesDto,
  ListLeavePolicyDto,
  UpdateLeavePolicyDto,
} from './leave-policy.dto'

/**
 * The leave policies of the signed-in user's tenant.
 */
@Controller({ path: 'leave-policies', version: '1' })
export class LeavePolicyController {
  /**
   * @param policies - Leave policy service.
   */
  constructor(private readonly policies: LeavePolicyService) {}

  /**
   * Handles `GET /v1/leave-policies`: lists policy versions.
   *
   * @param user - Signed-in user.
   * @param query - Optional filters and paging.
   * @returns The policy versions.
   */
  @Get()
  @RequirePermissions(PERMISSIONS.WORKFORCE_LEAVE_POLICY_READ)
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListLeavePolicyDto,
  ): Promise<LeavePolicy[]> {
    return this.policies.list(user.tenant_id, {
      leaveTypeSystem: query.leaveTypeSystem,
      leaveTypeCode: query.leaveTypeCode,
      onDate: query.onDate,
      limit: query.limit,
      offset: query.offset,
    })
  }

  /**
   * Handles `POST /v1/leave-policies`: adds a policy version.
   *
   * @param user - Signed-in user.
   * @param body - The version.
   * @returns The created policy.
   */
  @Post()
  @RequirePermissions(PERMISSIONS.WORKFORCE_LEAVE_POLICY_WRITE)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateLeavePolicyDto,
  ): Promise<LeavePolicy> {
    return this.policies.create(user.tenant_id, {
      leaveType: body.leaveType,
      effectiveFrom: body.effectiveFrom,
      balance: body.balance,
      counting: body.counting,
      halfDays: body.halfDays ?? false,
      paid: body.paid,
      employmentTypes: body.employmentTypes ?? [],
      approval: body.approval,
      noticeDays: body.noticeDays ?? 0,
      retroactiveDays: body.retroactiveDays ?? 0,
      maxDaysPerRequest: body.maxDaysPerRequest,
      proof: body.proof ?? null,
      notes: body.notes ?? null,
      reason: body.reason,
    })
  }

  /**
   * Handles `POST /v1/leave-policies/import`: loads a country bundle.
   *
   * @param user - Signed-in user.
   * @param body - Bundle name, start date and optional reason.
   * @returns How many versions were created and skipped.
   */
  @Post('import')
  @RequirePermissions(PERMISSIONS.WORKFORCE_LEAVE_POLICY_WRITE)
  import(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: ImportLeavePoliciesDto,
  ): Promise<ImportLeavePoliciesResult> {
    return this.policies.import(user.tenant_id, {
      bundle: body.bundle,
      effectiveFrom: body.effectiveFrom,
      reason: body.reason,
    })
  }

  /**
   * Handles `PATCH /v1/leave-policies/:id`: edits a version that has not started.
   *
   * @param user - Signed-in user.
   * @param id - Policy identifier.
   * @param body - Fields to change.
   * @returns The updated policy.
   */
  @Patch(':id')
  @RequirePermissions(PERMISSIONS.WORKFORCE_LEAVE_POLICY_WRITE)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: UpdateLeavePolicyDto,
  ): Promise<LeavePolicy> {
    return this.policies.update(user.tenant_id, id, {
      balance: body.balance,
      counting: body.counting,
      halfDays: body.halfDays,
      paid: body.paid,
      employmentTypes: body.employmentTypes,
      approval: body.approval,
      noticeDays: body.noticeDays,
      retroactiveDays: body.retroactiveDays,
      maxDaysPerRequest: body.maxDaysPerRequest,
      proof: body.proof,
      notes: body.notes,
      version: body.version,
      reason: body.reason,
    })
  }
}
