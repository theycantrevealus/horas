import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common'
import { type LeaveLedgerEntry } from '@repository/model/leave-ledger-entry'
import { type AuthenticatedUser } from '@identity/authenticated-user'
import { CurrentUser, RequirePermissions } from '@identity/guard/decorators'
import { PERMISSIONS } from '@identity/permission'
import {
  LeaveBalanceService,
  type LeaveBalanceView,
} from '@workforce/leave/leave-balance.service'
import {
  AdjustLeaveDto,
  LeaveBalancesQueryDto,
  LeaveLedgerQueryDto,
} from './leave-balance.dto'

/**
 * The leave balances of the signed-in user's tenant.
 */
@Controller({ version: '1' })
export class LeaveBalanceController {
  /**
   * @param balances - Leave balance service.
   */
  constructor(private readonly balances: LeaveBalanceService) {}

  /**
   * Handles `GET /v1/employees/me/leave-balances`: the signed-in employee's own balances. It needs a
   * sign-in and a linked employee, and no permission.
   *
   * @param user - Signed-in user.
   * @param query - Optional date.
   * @returns The balances.
   */
  @Get('employees/me/leave-balances')
  mine(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: LeaveBalancesQueryDto,
  ): Promise<LeaveBalanceView[]> {
    return this.balances.ownBalances(
      user.tenant_id,
      user.employee_id,
      query.onDate,
    )
  }

  /**
   * Handles `GET /v1/employees/:id/leave-balances`: an employee's balances.
   *
   * @param user - Signed-in user.
   * @param id - Employee identifier.
   * @param query - Optional date.
   * @returns The balances.
   */
  @Get('employees/:id/leave-balances')
  @RequirePermissions(PERMISSIONS.WORKFORCE_LEAVE_BALANCE_READ)
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query() query: LeaveBalancesQueryDto,
  ): Promise<LeaveBalanceView[]> {
    return this.balances.balances(user.tenant_id, id, query.onDate)
  }

  /**
   * Handles `GET /v1/employees/:id/leave-ledger`: the entries behind a balance.
   *
   * @param user - Signed-in user.
   * @param id - Employee identifier.
   * @param query - Optional filters and paging.
   * @returns The ledger entries, oldest first.
   */
  @Get('employees/:id/leave-ledger')
  @RequirePermissions(PERMISSIONS.WORKFORCE_LEAVE_BALANCE_READ)
  ledger(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query() query: LeaveLedgerQueryDto,
  ): Promise<LeaveLedgerEntry[]> {
    return this.balances.ledgerOf(user.tenant_id, id, {
      leaveTypeSystem: query.leaveTypeSystem,
      leaveTypeCode: query.leaveTypeCode,
      periodStart: query.periodStart,
      limit: query.limit,
      offset: query.offset,
    })
  }

  /**
   * Handles `POST /v1/employees/:id/leave-adjustments`: HR Manager adds or removes days.
   *
   * @param user - Signed-in user.
   * @param id - Employee identifier.
   * @param body - Leave type, period, days and reason.
   * @returns The new ledger entry.
   */
  @Post('employees/:id/leave-adjustments')
  @RequirePermissions(PERMISSIONS.WORKFORCE_LEAVE_BALANCE_ADJUST)
  adjust(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: AdjustLeaveDto,
  ): Promise<LeaveLedgerEntry> {
    return this.balances.adjust(user.tenant_id, id, {
      leaveType: body.leaveType,
      periodStart: body.periodStart,
      days: body.days,
      reason: body.reason,
    })
  }
}
