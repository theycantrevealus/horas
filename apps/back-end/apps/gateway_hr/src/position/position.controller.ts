import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common'
import { type Page } from '@utility/database/interface'
import { type Position } from '@repository/model/position'
import { type AuthenticatedUser } from '@identity/authenticated-user'
import { CurrentUser, RequirePermissions } from '@identity/guard/decorators'
import { PERMISSIONS } from '@identity/permission'
import { PositionService } from '@workforce/structure/position.service'
import {
  ClosePositionDto,
  CreatePositionDto,
  ListPositionsDto,
  UpdatePositionDto,
} from './position.dto'

/**
 * Positions (jobs) in the units of the signed-in user's tenant.
 */
@Controller({ path: 'positions', version: '1' })
export class PositionController {
  /**
   * @param positions - Position service.
   */
  constructor(private readonly positions: PositionService) {}

  /**
   * Handles `GET /v1/positions`: lists the positions of one unit.
   *
   * @param user - Signed-in user.
   * @param query - Unit, filters and paging.
   * @returns One page of positions.
   */
  @Get()
  @RequirePermissions(PERMISSIONS.WORKFORCE_POSITION_READ)
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListPositionsDto,
  ): Promise<Page<Position>> {
    return this.positions.list(user.tenant_id, query)
  }

  /**
   * Handles `POST /v1/positions`: adds a position.
   *
   * @param user - Signed-in user.
   * @param body - The position.
   * @returns The created position.
   */
  @Post()
  @RequirePermissions(PERMISSIONS.WORKFORCE_POSITION_WRITE)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreatePositionDto,
  ): Promise<Position> {
    return this.positions.create(user.tenant_id, body)
  }

  /**
   * Handles `GET /v1/positions/:id`.
   *
   * @param user - Signed-in user.
   * @param id - Position identifier.
   * @returns The position.
   */
  @Get(':id')
  @RequirePermissions(PERMISSIONS.WORKFORCE_POSITION_READ)
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<Position> {
    return this.positions.get(user.tenant_id, id)
  }

  /**
   * Handles `PATCH /v1/positions/:id`: edits a position.
   *
   * @param user - Signed-in user.
   * @param id - Position identifier.
   * @param body - Fields to change.
   * @returns The updated position.
   */
  @Patch(':id')
  @RequirePermissions(PERMISSIONS.WORKFORCE_POSITION_WRITE)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: UpdatePositionDto,
  ): Promise<Position> {
    return this.positions.update(user.tenant_id, id, body)
  }

  /**
   * Handles `POST /v1/positions/:id/close`: closes a position.
   *
   * @param user - Signed-in user.
   * @param id - Position identifier.
   * @param body - End date and optional version and reason.
   * @returns The closed position.
   */
  @Post(':id/close')
  @RequirePermissions(PERMISSIONS.WORKFORCE_POSITION_WRITE)
  close(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: ClosePositionDto,
  ): Promise<Position> {
    return this.positions.close(user.tenant_id, id, body)
  }
}
