import { Body, Controller, Get, Post, Query } from '@nestjs/common'
import { type Page } from '@utility/database/interface'
import { type HrParameter } from '@repository/model/hr-parameter'
import { type AuthenticatedUser } from '@identity/authenticated-user'
import { CurrentUser, RequirePermissions } from '@identity/guard/decorators'
import { PERMISSIONS } from '@identity/permission'
import { type ParameterDefinition } from '@workforce/parameter/catalog'
import {
  type EffectiveParameter,
  ParameterService,
} from '@workforce/parameter/parameter.service'
import {
  EffectiveParameterDto,
  ListParametersDto,
  SetParameterDto,
} from './parameter.dto'

/**
 * HR parameters of the signed-in user's tenant: dated values set at the tenant, an organization,
 * a facility or a unit.
 */
@Controller({ path: 'parameters', version: '1' })
export class ParameterController {
  /**
   * @param parameters - Parameter service.
   */
  constructor(private readonly parameters: ParameterService) {}

  /**
   * Handles `GET /v1/parameters`: lists the values that were set.
   *
   * @param user - Signed-in user.
   * @param query - Filters and paging.
   * @returns One page of values.
   */
  @Get()
  @RequirePermissions(PERMISSIONS.WORKFORCE_PARAMETER_READ)
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListParametersDto,
  ): Promise<Page<HrParameter>> {
    return this.parameters.list(user.tenant_id, query)
  }

  /**
   * Handles `GET /v1/parameters/catalog`: the keys that can be set.
   *
   * @returns Every key with its type, default, allowed scopes and description.
   */
  @Get('catalog')
  @RequirePermissions(PERMISSIONS.WORKFORCE_PARAMETER_READ)
  catalog(): readonly ParameterDefinition[] {
    return this.parameters.catalog()
  }

  /**
   * Handles `GET /v1/parameters/effective`: the value in force for a key, place and date.
   *
   * @param user - Signed-in user.
   * @param query - Key, place and date.
   * @returns The value and where it comes from.
   */
  @Get('effective')
  @RequirePermissions(PERMISSIONS.WORKFORCE_PARAMETER_READ)
  effective(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: EffectiveParameterDto,
  ): Promise<EffectiveParameter> {
    return this.parameters.effective(user.tenant_id, query)
  }

  /**
   * Handles `POST /v1/parameters`: sets a value from a date.
   *
   * @param user - Signed-in user.
   * @param body - The value.
   * @returns The stored value.
   */
  @Post()
  @RequirePermissions(PERMISSIONS.WORKFORCE_PARAMETER_WRITE)
  set(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: SetParameterDto,
  ): Promise<HrParameter> {
    return this.parameters.set(user.tenant_id, body)
  }
}
