import { Body, Controller, Get, Param, Post } from '@nestjs/common'
import { type HrImport } from '@repository/model/hr-import'
import { type AuthenticatedUser } from '@identity/authenticated-user'
import { CurrentUser, RequirePermissions } from '@identity/guard/decorators'
import { PERMISSIONS } from '@identity/permission'
import { HrImportService } from '@workforce/import/hr-import.service'
import { CancelImportDto } from './hr-import.dto'

/**
 * The file imports of the signed-in user's tenant, of any kind.
 */
@Controller({ path: 'hr-imports', version: '1' })
export class HrImportController {
  /**
   * @param imports - HR import service.
   */
  constructor(private readonly imports: HrImportService) {}

  /**
   * Handles `GET /v1/hr-imports/:id`: views an import's status, counts and row errors.
   *
   * @param user - Signed-in user.
   * @param id - Import identifier.
   * @returns The import.
   */
  @Get(':id')
  @RequirePermissions(PERMISSIONS.WORKFORCE_HR_IMPORT_READ)
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<HrImport> {
    return this.imports.get(user.tenant_id, id)
  }

  /**
   * Handles `POST /v1/hr-imports/:id/cancel`: discards a checked import.
   *
   * @param user - Signed-in user.
   * @param id - Import identifier.
   * @param body - Optional version and reason.
   * @returns The cancelled import.
   */
  @Post(':id/cancel')
  @RequirePermissions(PERMISSIONS.WORKFORCE_HR_IMPORT_CANCEL)
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: CancelImportDto,
  ): Promise<HrImport> {
    return this.imports.cancel(user.tenant_id, id, body)
  }
}
