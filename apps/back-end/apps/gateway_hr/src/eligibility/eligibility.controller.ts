import { Controller, Get, Header, Param, Query } from '@nestjs/common'
import { type AuthenticatedUser } from '@identity/authenticated-user'
import { CurrentUser, RequirePermissions } from '@identity/guard/decorators'
import { PERMISSIONS } from '@identity/permission'
import {
  type EligibilityAnswer,
  EligibilityQueryService,
} from '@workforce/eligibility/eligibility-query.service'
import { EligibilityQueryDto } from './eligibility.dto'

/**
 * Clinical eligibility of an employee (HR plan 6).
 */
@Controller({ path: 'employees', version: '1' })
export class EligibilityController {
  /**
   * @param eligibility - Eligibility query service.
   */
  constructor(private readonly eligibility: EligibilityQueryService) {}

  /**
   * Handles `GET /v1/employees/:id/eligibility`. The answer is never cached (`HR-ELG-001`).
   *
   * @param user - Signed-in user.
   * @param id - The employee.
   * @param query - The unit, optional date and optional privilege.
   * @returns Whether the employee is eligible, with every condition checked.
   */
  @Get(':id/eligibility')
  @Header('Cache-Control', 'no-store')
  @RequirePermissions(PERMISSIONS.WORKFORCE_ELIGIBILITY_READ)
  check(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query() query: EligibilityQueryDto,
  ): Promise<EligibilityAnswer> {
    return this.eligibility.check(user.tenant_id, {
      employeeId: id,
      unitId: query.unitId,
      date: query.date,
      privilegeId: query.privilegeId,
    })
  }
}
