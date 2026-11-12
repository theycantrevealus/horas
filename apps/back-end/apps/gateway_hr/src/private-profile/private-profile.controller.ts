import { Body, Controller, Get, Header, Param, Put } from '@nestjs/common'
import { type EmployeePrivateProfile } from '@repository/model/employee-private-profile'
import { type AuthenticatedUser } from '@identity/authenticated-user'
import { CurrentUser, RequirePermissions } from '@identity/guard/decorators'
import { PERMISSIONS } from '@identity/permission'
import {
  PrivateProfileService,
  type RevealedIdentifierValue,
} from '@workforce/private-profile/private-profile.service'
import {
  ReplaceBankAccountsDto,
  ReplaceIdentifiersDto,
  SaveProfileDto,
} from './private-profile.dto'

/**
 * Cache header of every response that carries confidential data.
 */
const NO_STORE = 'no-store'

/**
 * The confidential profile of employees of the signed-in user's tenant. Every response carries
 * `Cache-Control: no-store`, like the responses that carry tokens (`authentication.md` 3).
 */
@Controller({ path: 'employees', version: '1' })
export class PrivateProfileController {
  /**
   * @param profiles - Private profile service.
   */
  constructor(private readonly profiles: PrivateProfileService) {}

  /**
   * Handles `GET /v1/employees/me/private-profile`: the caller's own profile, masked. It needs no
   * permission: an employee may always read their own data. `me` is a static path and wins over
   * `:id` in the router.
   *
   * @param user - Signed-in user.
   * @returns The caller's profile.
   */
  @Get('me/private-profile')
  @Header('Cache-Control', NO_STORE)
  me(@CurrentUser() user: AuthenticatedUser): Promise<EmployeePrivateProfile> {
    return this.profiles.getOwn(user.tenant_id, user.employee_id)
  }

  /**
   * Handles `GET /v1/employees/:id/private-profile`: the profile, masked.
   *
   * @param user - Signed-in user.
   * @param id - Employee identifier.
   * @returns The profile.
   */
  @Get(':id/private-profile')
  @RequirePermissions(PERMISSIONS.WORKFORCE_PRIVATE_PROFILE_READ)
  @Header('Cache-Control', NO_STORE)
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<EmployeePrivateProfile> {
    return this.profiles.get(user.tenant_id, id)
  }

  /**
   * Handles `PUT /v1/employees/:id/private-profile`: creates or replaces the profile fields.
   *
   * @param user - Signed-in user.
   * @param id - Employee identifier.
   * @param body - The new fields.
   * @returns The profile, masked.
   */
  @Put(':id/private-profile')
  @RequirePermissions(PERMISSIONS.WORKFORCE_PRIVATE_PROFILE_WRITE)
  @Header('Cache-Control', NO_STORE)
  save(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: SaveProfileDto,
  ): Promise<EmployeePrivateProfile> {
    return this.profiles.save(user.tenant_id, id, body)
  }

  /**
   * Handles `PUT /v1/employees/:id/private-profile/identifiers`: replaces the identifiers.
   *
   * @param user - Signed-in user.
   * @param id - Employee identifier.
   * @param body - The new identifiers.
   * @returns The profile, masked.
   */
  @Put(':id/private-profile/identifiers')
  @RequirePermissions(PERMISSIONS.WORKFORCE_PRIVATE_PROFILE_WRITE)
  @Header('Cache-Control', NO_STORE)
  replaceIdentifiers(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: ReplaceIdentifiersDto,
  ): Promise<EmployeePrivateProfile> {
    return this.profiles.replaceIdentifiers(user.tenant_id, id, body)
  }

  /**
   * Handles `PUT /v1/employees/:id/private-profile/bank-accounts`: replaces the bank accounts.
   *
   * @param user - Signed-in user.
   * @param id - Employee identifier.
   * @param body - The new accounts.
   * @returns The profile, masked.
   */
  @Put(':id/private-profile/bank-accounts')
  @RequirePermissions(PERMISSIONS.WORKFORCE_PRIVATE_PROFILE_WRITE)
  @Header('Cache-Control', NO_STORE)
  replaceBankAccounts(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: ReplaceBankAccountsDto,
  ): Promise<EmployeePrivateProfile> {
    return this.profiles.replaceBankAccounts(user.tenant_id, id, body)
  }

  /**
   * Handles `GET /v1/employees/:id/private-profile/identifiers/:system`: reveals one identifier in
   * full. The reveal is recorded as an access in the change history.
   *
   * @param user - Signed-in user.
   * @param id - Employee identifier.
   * @param system - Identifier system, for example `id.nik`.
   * @returns The system and the plain value.
   */
  @Get(':id/private-profile/identifiers/:system')
  @RequirePermissions(PERMISSIONS.WORKFORCE_PRIVATE_PROFILE_REVEAL)
  @Header('Cache-Control', NO_STORE)
  reveal(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('system') system: string,
  ): Promise<RevealedIdentifierValue> {
    return this.profiles.revealIdentifier(user.tenant_id, id, system)
  }
}
