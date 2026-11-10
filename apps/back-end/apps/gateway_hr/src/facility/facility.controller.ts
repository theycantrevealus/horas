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
import { type Facility } from '@repository/model/facility'
import { type AuthenticatedUser } from '@identity/authenticated-user'
import { CurrentUser, RequirePermissions } from '@identity/guard/decorators'
import { PERMISSIONS } from '@identity/permission'
import { FacilityService } from '@workforce/structure/facility.service'
import {
  CreateFacilityDto,
  ListFacilitiesDto,
  UpdateFacilityDto,
} from './facility.dto'

/**
 * Facilities (hospital and clinic sites) of the signed-in user's tenant.
 */
@Controller({ path: 'facilities', version: '1' })
export class FacilityController {
  /**
   * @param facilities - Facility service.
   */
  constructor(private readonly facilities: FacilityService) {}

  /**
   * Handles `GET /v1/facilities`: lists the tenant's facilities.
   *
   * @param user - Signed-in user.
   * @param query - Filters and paging.
   * @returns One page of facilities.
   */
  @Get()
  @RequirePermissions(PERMISSIONS.WORKFORCE_FACILITY_READ)
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListFacilitiesDto,
  ): Promise<Page<Facility>> {
    return this.facilities.list(user.tenant_id, query)
  }

  /**
   * Handles `POST /v1/facilities`: adds a site.
   *
   * @param user - Signed-in user.
   * @param body - The facility.
   * @returns The created facility.
   */
  @Post()
  @RequirePermissions(PERMISSIONS.WORKFORCE_FACILITY_WRITE)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateFacilityDto,
  ): Promise<Facility> {
    return this.facilities.create(user.tenant_id, body)
  }

  /**
   * Handles `GET /v1/facilities/:id`.
   *
   * @param user - Signed-in user.
   * @param id - Facility identifier.
   * @returns The facility.
   */
  @Get(':id')
  @RequirePermissions(PERMISSIONS.WORKFORCE_FACILITY_READ)
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<Facility> {
    return this.facilities.get(user.tenant_id, id)
  }

  /**
   * Handles `PATCH /v1/facilities/:id`: edits a facility or sets it inactive.
   *
   * @param user - Signed-in user.
   * @param id - Facility identifier.
   * @param body - Fields to change.
   * @returns The updated facility.
   */
  @Patch(':id')
  @RequirePermissions(PERMISSIONS.WORKFORCE_FACILITY_WRITE)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: UpdateFacilityDto,
  ): Promise<Facility> {
    return this.facilities.update(user.tenant_id, id, body)
  }
}
