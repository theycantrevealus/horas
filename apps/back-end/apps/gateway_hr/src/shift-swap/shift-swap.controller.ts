import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { type ShiftSwapRequest } from '@repository/model/shift-swap-request'
import { type AuthenticatedUser } from '@identity/authenticated-user'
import { CurrentUser, RequirePermissions } from '@identity/guard/decorators'
import { PERMISSIONS } from '@identity/permission'
import { SwapService } from '@workforce/rostering/swap.service'
import {
  ApproveSwapDto,
  CreateSwapDto,
  ListOwnSwapsDto,
  ListSwapsDto,
  RejectSwapDto,
  SwapMoveDto,
} from './shift-swap.dto'

/**
 * Shift swap requests of the signed-in user's tenant (HR plan 5.7).
 */
@Controller({ version: '1' })
export class ShiftSwapController {
  /**
   * @param swaps - Swap service.
   */
  constructor(private readonly swaps: SwapService) {}

  /**
   * Handles `GET /v1/shift-swaps`: lists the requests of the tenant, latest first.
   *
   * @param user - Signed-in user.
   * @param query - Filters and paging.
   * @returns The requests.
   */
  @Get('shift-swaps')
  @RequirePermissions(PERMISSIONS.WORKFORCE_SHIFT_SWAP_READ)
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListSwapsDto,
  ): Promise<ShiftSwapRequest[]> {
    return this.swaps.list(user.tenant_id, query)
  }

  /**
   * Handles `GET /v1/employees/me/shift-swaps`: the signed-in employee's own requests, as
   * requester or counterpart. It needs a sign-in and a linked employee, and no permission.
   *
   * @param user - Signed-in user.
   * @param query - Status and paging.
   * @returns The requests.
   */
  @Get('employees/me/shift-swaps')
  listOwn(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListOwnSwapsDto,
  ): Promise<ShiftSwapRequest[]> {
    return this.swaps.listOwn(user.tenant_id, user.employee_id, query)
  }

  /**
   * Handles `POST /v1/shift-swaps`: the signed-in employee asks to trade or hand over a shift.
   *
   * @param user - Signed-in user.
   * @param body - The request.
   * @returns The created request.
   */
  @Post('shift-swaps')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateSwapDto,
  ): Promise<ShiftSwapRequest> {
    return this.swaps.create(user.tenant_id, user.employee_id, body)
  }

  /**
   * Handles `POST /v1/shift-swaps/:id/accept`: the named counterpart accepts.
   *
   * @param user - Signed-in user.
   * @param id - Request identifier.
   * @param body - Optional version.
   * @returns The accepted request.
   */
  @Post('shift-swaps/:id/accept')
  accept(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: SwapMoveDto,
  ): Promise<ShiftSwapRequest> {
    return this.swaps.accept(user.tenant_id, user.employee_id, id, body)
  }

  /**
   * Handles `POST /v1/shift-swaps/:id/approve`: the Head of Unit approves; the assignments change.
   * The decider is never the requester or the counterpart.
   *
   * @param user - Signed-in user.
   * @param id - Request identifier.
   * @param body - Optional version and reason.
   * @returns The approved request.
   */
  @Post('shift-swaps/:id/approve')
  @RequirePermissions(PERMISSIONS.WORKFORCE_SHIFT_SWAP_DECIDE)
  approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: ApproveSwapDto,
  ): Promise<ShiftSwapRequest> {
    return this.swaps.approve(user.tenant_id, user.employee_id, id, body)
  }

  /**
   * Handles `POST /v1/shift-swaps/:id/reject`: the Head of Unit rejects with a reason.
   *
   * @param user - Signed-in user.
   * @param id - Request identifier.
   * @param body - The reason and an optional version.
   * @returns The rejected request.
   */
  @Post('shift-swaps/:id/reject')
  @RequirePermissions(PERMISSIONS.WORKFORCE_SHIFT_SWAP_DECIDE)
  reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: RejectSwapDto,
  ): Promise<ShiftSwapRequest> {
    return this.swaps.reject(user.tenant_id, user.employee_id, id, body)
  }

  /**
   * Handles `POST /v1/shift-swaps/:id/cancel`: the requester withdraws the request.
   *
   * @param user - Signed-in user.
   * @param id - Request identifier.
   * @param body - Optional version.
   * @returns The cancelled request.
   */
  @Post('shift-swaps/:id/cancel')
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: SwapMoveDto,
  ): Promise<ShiftSwapRequest> {
    return this.swaps.cancel(user.tenant_id, user.employee_id, id, body)
  }
}
