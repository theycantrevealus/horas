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
import { type Organization } from '@repository/model/organization'
import { type AuthenticatedUser } from '@identity/authenticated-user'
import { CurrentUser, RequirePermissions } from '@identity/guard/decorators'
import { PERMISSIONS } from '@identity/permission'
import { OrganizationService } from '@workforce/structure/organization.service'
import {
  CreateOrganizationDto,
  ListOrganizationsDto,
  UpdateOrganizationDto,
} from './organization.dto'

/**
 * Organizations (legal employers) of the signed-in user's tenant.
 */
@Controller({ path: 'organizations', version: '1' })
export class OrganizationController {
  /**
   * @param organizations - Organization service.
   */
  constructor(private readonly organizations: OrganizationService) {}

  /**
   * Handles `GET /v1/organizations`: lists the tenant's organizations.
   *
   * @param user - Signed-in user.
   * @param query - Filters and paging.
   * @returns One page of organizations.
   */
  @Get()
  @RequirePermissions(PERMISSIONS.WORKFORCE_ORGANIZATION_READ)
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListOrganizationsDto,
  ): Promise<Page<Organization>> {
    return this.organizations.list(user.tenant_id, query)
  }

  /**
   * Handles `POST /v1/organizations`: registers an employer.
   *
   * @param user - Signed-in user.
   * @param body - The organization.
   * @returns The created organization.
   */
  @Post()
  @RequirePermissions(PERMISSIONS.WORKFORCE_ORGANIZATION_WRITE)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateOrganizationDto,
  ): Promise<Organization> {
    return this.organizations.create(user.tenant_id, body)
  }

  /**
   * Handles `GET /v1/organizations/:id`.
   *
   * @param user - Signed-in user.
   * @param id - Organization identifier.
   * @returns The organization.
   */
  @Get(':id')
  @RequirePermissions(PERMISSIONS.WORKFORCE_ORGANIZATION_READ)
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<Organization> {
    return this.organizations.get(user.tenant_id, id)
  }

  /**
   * Handles `PATCH /v1/organizations/:id`: edits an organization or sets it inactive.
   *
   * @param user - Signed-in user.
   * @param id - Organization identifier.
   * @param body - Fields to change.
   * @returns The updated organization.
   */
  @Patch(':id')
  @RequirePermissions(PERMISSIONS.WORKFORCE_ORGANIZATION_WRITE)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: UpdateOrganizationDto,
  ): Promise<Organization> {
    return this.organizations.update(user.tenant_id, id, body)
  }
}
