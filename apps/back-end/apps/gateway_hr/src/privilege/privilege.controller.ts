import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common'
import { type PrivilegeCatalogItem } from '@repository/model/privilege-catalog-item'
import { type AuthenticatedUser } from '@identity/authenticated-user'
import { CurrentUser, RequirePermissions } from '@identity/guard/decorators'
import { PERMISSIONS } from '@identity/permission'
import { PrivilegeService } from '@workforce/privilege/privilege.service'
import {
  CreatePrivilegeDto,
  ListPrivilegesDto,
  RetirePrivilegeDto,
  UpdatePrivilegeDto,
} from './privilege.dto'

/**
 * The privilege catalog of the signed-in user's tenant.
 */
@Controller({ path: 'privileges', version: '1' })
export class PrivilegeController {
  /**
   * @param privileges - Privilege service.
   */
  constructor(private readonly privileges: PrivilegeService) {}

  /**
   * Handles `GET /v1/privileges`: lists catalog items, ordered by code.
   *
   * @param user - Signed-in user.
   * @param query - Optional filters and paging.
   * @returns The items.
   */
  @Get()
  @RequirePermissions(PERMISSIONS.WORKFORCE_PRIVILEGE_READ)
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListPrivilegesDto,
  ): Promise<PrivilegeCatalogItem[]> {
    return this.privileges.list(user.tenant_id, {
      committee: query.committee,
      profession: query.profession,
      status: query.status,
      facilityId: query.facilityId,
      limit: query.limit,
      offset: query.offset,
    })
  }

  /**
   * Handles `POST /v1/privileges`: adds an item to the catalog.
   *
   * @param user - Signed-in user.
   * @param body - The item.
   * @returns The created item.
   */
  @Post()
  @RequirePermissions(PERMISSIONS.WORKFORCE_PRIVILEGE_WRITE)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreatePrivilegeDto,
  ): Promise<PrivilegeCatalogItem> {
    return this.privileges.create(user.tenant_id, {
      code: body.code,
      committee: body.committee,
      name: body.name ?? [],
      description: body.description,
      professions: body.professions ?? [],
      specialties: body.specialties,
      minClinicalLevel: body.minClinicalLevel ?? null,
      requiredEvidence: body.requiredEvidence,
      externalCodes: body.externalCodes,
      facilityIds: body.facilityIds,
      reason: body.reason,
    })
  }

  /**
   * Handles `GET /v1/privileges/:id`.
   *
   * @param user - Signed-in user.
   * @param id - Item identifier.
   * @returns The item.
   */
  @Get(':id')
  @RequirePermissions(PERMISSIONS.WORKFORCE_PRIVILEGE_READ)
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<PrivilegeCatalogItem> {
    return this.privileges.get(user.tenant_id, id)
  }

  /**
   * Handles `PATCH /v1/privileges/:id`: edits an active item.
   *
   * @param user - Signed-in user.
   * @param id - Item identifier.
   * @param body - Fields to change.
   * @returns The updated item.
   */
  @Patch(':id')
  @RequirePermissions(PERMISSIONS.WORKFORCE_PRIVILEGE_WRITE)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: UpdatePrivilegeDto,
  ): Promise<PrivilegeCatalogItem> {
    return this.privileges.update(user.tenant_id, id, {
      name: body.name,
      description: body.description,
      professions: body.professions,
      specialties: body.specialties,
      minClinicalLevel: body.minClinicalLevel,
      requiredEvidence: body.requiredEvidence,
      externalCodes: body.externalCodes,
      facilityIds: body.facilityIds,
      version: body.version,
      reason: body.reason,
    })
  }

  /**
   * Handles `POST /v1/privileges/:id/retire`: stops new requests for an item.
   *
   * @param user - Signed-in user.
   * @param id - Item identifier.
   * @param body - Optional version and reason.
   * @returns The retired item.
   */
  @Post(':id/retire')
  @RequirePermissions(PERMISSIONS.WORKFORCE_PRIVILEGE_WRITE)
  retire(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: RetirePrivilegeDto,
  ): Promise<PrivilegeCatalogItem> {
    return this.privileges.retire(user.tenant_id, id, body)
  }
}
