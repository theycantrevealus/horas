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
import { type OrganizationUnit } from '@repository/model/organization-unit'
import { type AuthenticatedUser } from '@identity/authenticated-user'
import { CurrentUser, RequirePermissions } from '@identity/guard/decorators'
import { PERMISSIONS } from '@identity/permission'
import { UnitService } from '@workforce/structure/unit.service'
import { type UnitTreeNode } from '@workforce/structure/unit-tree'
import {
  CloseUnitDto,
  CreateUnitDto,
  ListUnitsDto,
  MoveUnitDto,
  UnitTreeDto,
  UpdateUnitDto,
} from './unit.dto'

/**
 * Organization units (the organization chart) of the signed-in user's tenant.
 */
@Controller({ path: 'units', version: '1' })
export class UnitController {
  /**
   * @param units - Unit service.
   */
  constructor(private readonly units: UnitService) {}

  /**
   * Handles `GET /v1/units`: lists the units of one facility.
   *
   * @param user - Signed-in user.
   * @param query - Facility, filters and paging.
   * @returns One page of units.
   */
  @Get()
  @RequirePermissions(PERMISSIONS.WORKFORCE_UNIT_READ)
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListUnitsDto,
  ): Promise<Page<OrganizationUnit>> {
    return this.units.list(user.tenant_id, query)
  }

  /**
   * Handles `GET /v1/units/tree`: the organization chart of one facility. Declared before the
   * `:id` route so `tree` is not read as an identifier.
   *
   * @param user - Signed-in user.
   * @param query - Facility and selection.
   * @returns The root nodes of the chart.
   */
  @Get('tree')
  @RequirePermissions(PERMISSIONS.WORKFORCE_UNIT_READ)
  tree(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: UnitTreeDto,
  ): Promise<UnitTreeNode[]> {
    return this.units.tree(user.tenant_id, query)
  }

  /**
   * Handles `POST /v1/units`: adds a unit.
   *
   * @param user - Signed-in user.
   * @param body - The unit.
   * @returns The created unit.
   */
  @Post()
  @RequirePermissions(PERMISSIONS.WORKFORCE_UNIT_WRITE)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateUnitDto,
  ): Promise<OrganizationUnit> {
    return this.units.create(user.tenant_id, body)
  }

  /**
   * Handles `GET /v1/units/:id`.
   *
   * @param user - Signed-in user.
   * @param id - Unit identifier.
   * @returns The unit.
   */
  @Get(':id')
  @RequirePermissions(PERMISSIONS.WORKFORCE_UNIT_READ)
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<OrganizationUnit> {
    return this.units.get(user.tenant_id, id)
  }

  /**
   * Handles `PATCH /v1/units/:id`: edits a unit.
   *
   * @param user - Signed-in user.
   * @param id - Unit identifier.
   * @param body - Fields to change.
   * @returns The updated unit.
   */
  @Patch(':id')
  @RequirePermissions(PERMISSIONS.WORKFORCE_UNIT_WRITE)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: UpdateUnitDto,
  ): Promise<OrganizationUnit> {
    return this.units.update(user.tenant_id, id, body)
  }

  /**
   * Handles `POST /v1/units/:id/move`: moves a unit with all units below it.
   *
   * @param user - Signed-in user.
   * @param id - Unit identifier.
   * @param body - New parent.
   * @returns The moved unit.
   */
  @Post(':id/move')
  @RequirePermissions(PERMISSIONS.WORKFORCE_UNIT_WRITE)
  move(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: MoveUnitDto,
  ): Promise<OrganizationUnit> {
    return this.units.move(user.tenant_id, id, body)
  }

  /**
   * Handles `POST /v1/units/:id/close`: closes a unit.
   *
   * @param user - Signed-in user.
   * @param id - Unit identifier.
   * @param body - End date and optional version and reason.
   * @returns The closed unit.
   */
  @Post(':id/close')
  @RequirePermissions(PERMISSIONS.WORKFORCE_UNIT_WRITE)
  close(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: CloseUnitDto,
  ): Promise<OrganizationUnit> {
    return this.units.close(user.tenant_id, id, body)
  }
}
