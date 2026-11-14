import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { type ProfessionalLicense } from '@repository/model/professional-license'
import { type AuthenticatedUser } from '@identity/authenticated-user'
import { CurrentUser, RequirePermissions } from '@identity/guard/decorators'
import { PERMISSIONS } from '@identity/permission'
import {
  LicenseService,
  type RegisterLicenseInput,
} from '@workforce/license/license.service'
import {
  ListLicensesDto,
  OwnLicenseDto,
  RegisterLicenseDto,
  RevokeLicenseDto,
  VerifyLicenseDto,
} from './license.dto'

/**
 * Maps the body of a registration to the service input.
 *
 * @param body - The validated body.
 * @param employeeId - The holder, when HR names one.
 * @returns The service input.
 */
function toInput(
  body: OwnLicenseDto,
  employeeId?: string,
): RegisterLicenseInput {
  return {
    employeeId,
    licenseType: body.licenseType,
    profession: body.profession,
    specialty: body.specialty ?? null,
    documentNumber: body.documentNumber,
    issuingAuthority: {
      name: body.issuingAuthority.name,
      code: body.issuingAuthority.code ?? null,
    },
    jurisdiction: {
      country: body.jurisdiction.country,
      subdivision: body.jurisdiction.subdivision ?? null,
    },
    practiceLocation: body.practiceLocation ?? null,
    issueDate: body.issueDate,
    expiryDate: body.expiryDate ?? null,
    document: {
      file_id: body.document.fileId,
      content_type: body.document.contentType,
      sha256: body.document.sha256,
    },
    replacesLicenseId: body.replacesLicenseId ?? null,
    reason: body.reason,
  }
}

/**
 * Professional licences of the signed-in user's tenant.
 */
@Controller({ path: 'licenses', version: '1' })
export class LicenseController {
  /**
   * @param licenses - Licence service.
   */
  constructor(private readonly licenses: LicenseService) {}

  /**
   * Handles `GET /v1/licenses`: lists licences, optionally those about to expire.
   *
   * @param user - Signed-in user.
   * @param query - Optional filters and paging.
   * @returns The licences.
   */
  @Get()
  @RequirePermissions(PERMISSIONS.WORKFORCE_LICENSE_READ)
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListLicensesDto,
  ): Promise<ProfessionalLicense[]> {
    return this.licenses.list(user.tenant_id, {
      status: query.status,
      licenseType: query.licenseType,
      facilityId: query.facilityId,
      expiringWithinDays: query.expiringWithinDays,
      limit: query.limit,
      offset: query.offset,
    })
  }

  /**
   * Handles `POST /v1/licenses`: HR registers a licence.
   *
   * @param user - Signed-in user.
   * @param body - The licence.
   * @returns The registered licence, pending verification.
   */
  @Post()
  @RequirePermissions(PERMISSIONS.WORKFORCE_LICENSE_WRITE)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: RegisterLicenseDto,
  ): Promise<ProfessionalLicense> {
    return this.licenses.create(user.tenant_id, toInput(body, body.employeeId))
  }

  /**
   * Handles `POST /v1/licenses/:id/verify`: records the primary-source verification.
   *
   * @param user - Signed-in user.
   * @param id - Licence identifier.
   * @param body - Outcome, method, notes and, for a mismatch, the reason.
   * @returns The verified or rejected licence.
   */
  @Post(':id/verify')
  @RequirePermissions(PERMISSIONS.WORKFORCE_LICENSE_VERIFY)
  verify(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: VerifyLicenseDto,
  ): Promise<ProfessionalLicense> {
    return this.licenses.verify(user.tenant_id, id, body)
  }

  /**
   * Handles `POST /v1/licenses/:id/revoke`: records a revocation by the issuing authority.
   *
   * @param user - Signed-in user.
   * @param id - Licence identifier.
   * @param body - Effective date, reason and notes.
   * @returns The revoked licence.
   */
  @Post(':id/revoke')
  @RequirePermissions(PERMISSIONS.WORKFORCE_LICENSE_VERIFY)
  revoke(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: RevokeLicenseDto,
  ): Promise<ProfessionalLicense> {
    return this.licenses.revoke(user.tenant_id, id, body)
  }

  /**
   * Handles `GET /v1/licenses/:id`.
   *
   * @param user - Signed-in user.
   * @param id - Licence identifier.
   * @returns The licence.
   */
  @Get(':id')
  @RequirePermissions(PERMISSIONS.WORKFORCE_LICENSE_READ)
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<ProfessionalLicense> {
    return this.licenses.get(user.tenant_id, id)
  }
}

/**
 * The licences of one employee, and the signed-in employee's own submission.
 */
@Controller({ path: 'employees', version: '1' })
export class EmployeeLicensesController {
  /**
   * @param licenses - Licence service.
   */
  constructor(private readonly licenses: LicenseService) {}

  /**
   * Handles `GET /v1/employees/:id/licenses`: lists the employee's licences.
   *
   * @param user - Signed-in user.
   * @param id - Employee identifier.
   * @returns The licences, newest issue date first.
   */
  @Get(':id/licenses')
  @RequirePermissions(PERMISSIONS.WORKFORCE_LICENSE_READ)
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<ProfessionalLicense[]> {
    return this.licenses.listByEmployee(user.tenant_id, id)
  }

  /**
   * Handles `POST /v1/employees/me/licenses`: the signed-in employee submits their own licence.
   *
   * @param user - Signed-in user.
   * @param body - The licence.
   * @returns The submitted licence, pending verification.
   */
  @Post('me/licenses')
  createOwn(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: OwnLicenseDto,
  ): Promise<ProfessionalLicense> {
    return this.licenses.createOwn(
      user.tenant_id,
      user.employee_id ?? null,
      toInput(body),
    )
  }
}
