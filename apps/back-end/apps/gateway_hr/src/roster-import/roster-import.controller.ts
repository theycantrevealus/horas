import { Body, Controller, Param, Post, Query } from '@nestjs/common'
import { type HrImport } from '@repository/model/hr-import'
import { type AuthenticatedUser } from '@identity/authenticated-user'
import { CurrentUser, RequirePermissions } from '@identity/guard/decorators'
import { PERMISSIONS } from '@identity/permission'
import { RosterImportService } from '@workforce/rostering/roster-import.service'
import { ImportRosterQueryDto } from './roster-import.dto'

/**
 * What the roster import answers: the import record and what the file would leave in the roster.
 */
export type RosterImportReply = HrImport & {
  coverageGaps: number | null
  restDayGaps: number | null
}

/**
 * The roster CSV import of the signed-in user's tenant.
 */
@Controller({ path: 'rosters', version: '1' })
export class RosterImportController {
  /**
   * @param imports - Roster import service.
   */
  constructor(private readonly imports: RosterImportService) {}

  /**
   * Handles `POST /v1/rosters/:id/imports`: checks a roster CSV file (the request body, content
   * type `text/csv`), and records the result. Nothing is written to the roster.
   *
   * @param user - Signed-in user.
   * @param id - Roster identifier.
   * @param query - Whether to apply, the check, the version and the reason.
   * @param body - The CSV text; anything else is refused by the service.
   * @returns The import record, with its counts and row errors, and what the file would leave.
   */
  @Post(':id/imports')
  @RequirePermissions(PERMISSIONS.WORKFORCE_ROSTER_IMPORT)
  async importFile(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query() query: ImportRosterQueryDto,
    @Body() body: unknown,
  ): Promise<RosterImportReply> {
    const answer = await this.imports.importFile(user.tenant_id, id, {
      content: body,
      apply: query.apply,
      checkId: query.checkId,
      version: query.version,
      reason: query.reason,
    })
    return Object.assign({}, answer.import, {
      coverageGaps: answer.coverageGaps,
      restDayGaps: answer.restDayGaps,
    })
  }
}
