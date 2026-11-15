import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common'
import { type CredentialApplication } from '@repository/model/credential-application'
import { type AuthenticatedUser } from '@identity/authenticated-user'
import { CurrentUser, RequirePermissions } from '@identity/guard/decorators'
import { PERMISSIONS } from '@identity/permission'
import { type ApplicationView } from '@workforce/credentialing/application-support'
import {
  AssessmentService,
  type AssessResult,
} from '@workforce/credentialing/assessment.service'
import { ReviewService } from '@workforce/credentialing/review.service'
import { type CredentialAssessment } from '@repository/model/credential-assessment'
import {
  ApplicationService,
  type ApplicationDocumentInput,
  type RequestedPrivilegeInput,
  type TemporaryInput,
} from '@workforce/credentialing/application.service'
import {
  AppointAssessorsDto,
  AssessDto,
  type ApplicationDocumentDto,
  CreateApplicationDto,
  DeclareConflictDto,
  ListApplicationsDto,
  RecommendDto,
  type RequestedPrivilegeDto,
  ReturnApplicationDto,
  StartReviewDto,
  SubmitApplicationDto,
  UpdateApplicationDto,
  WithdrawApplicationDto,
} from './application.dto'

/**
 * Maps the requested privileges of a body to the service input.
 *
 * @param items - The validated items.
 * @returns The service input.
 */
function toPrivileges(
  items: RequestedPrivilegeDto[] | undefined,
): RequestedPrivilegeInput[] | undefined {
  return items?.map((item) => ({
    catalogItemId: item.catalogItemId,
    requestedCondition: item.requestedCondition,
    proposedSupervisorEmployeeId: item.proposedSupervisorEmployeeId ?? null,
    notes: item.notes ?? null,
  }))
}

/**
 * Maps the documents of a body to the service input.
 *
 * @param items - The validated documents.
 * @returns The service input.
 */
function toDocuments(
  items: ApplicationDocumentDto[] | undefined,
): ApplicationDocumentInput[] | undefined {
  return items?.map((item) => ({
    type: item.type,
    file: {
      file_id: item.file.fileId,
      content_type: item.file.contentType,
      sha256: item.file.sha256,
    },
    licenseId: item.licenseId ?? null,
  }))
}

/**
 * Maps the temporary request of a body to the service input; `null` stays `null`.
 *
 * @param value - The validated request, `null` or `undefined`.
 * @returns The service input.
 */
function toTemporary(
  value: { requestedDays: number; urgency: TemporaryInput['urgency'] } | null | undefined,
): TemporaryInput | null | undefined {
  if (value === undefined || value === null) {
    return value
  }
  return { requestedDays: value.requestedDays, urgency: value.urgency }
}

/**
 * Credential applications of the signed-in user's tenant.
 */
@Controller({ path: 'credential-applications', version: '1' })
export class ApplicationController {
  /**
   * @param applications - Application service.
   * @param reviews - Committee review service, which also redacts what only the committee sees.
   * @param assessmentService - Assessment and recommendation service.
   */
  constructor(
    private readonly applications: ApplicationService,
    private readonly reviews: ReviewService,
    private readonly assessmentService: AssessmentService,
  ) {}

  /**
   * Shows one application to the caller: whole for a member of the applicant's committee,
   * without declarations and the recommendation summary for anyone else.
   *
   * @param user - Signed-in user.
   * @param application - The application.
   * @returns The application as the caller may see it.
   */
  private async show(
    user: AuthenticatedUser,
    application: CredentialApplication,
  ): Promise<ApplicationView> {
    const [shown] = await this.reviews.present(
      user.tenant_id,
      user.employee_id,
      [application],
    )
    return shown as ApplicationView
  }

  /**
   * Handles `GET /v1/credential-applications`: the committee work queue.
   *
   * @param user - Signed-in user.
   * @param query - Optional filters and paging.
   * @returns The applications, the oldest status first.
   */
  @Get()
  @RequirePermissions(PERMISSIONS.WORKFORCE_CREDENTIAL_APPLICATION_READ)
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListApplicationsDto,
  ): Promise<ApplicationView[]> {
    const found = await this.applications.list(user.tenant_id, {
      status: query.status,
      committee: query.committee,
      facilityId: query.facilityId,
      employeeId: query.employeeId,
      olderThanDays: query.olderThanDays,
      limit: query.limit,
      offset: query.offset,
    })
    return this.reviews.present(user.tenant_id, user.employee_id, found)
  }

  /**
   * Handles `POST /v1/credential-applications`: starts a draft.
   *
   * @param user - Signed-in user.
   * @param body - The application.
   * @returns The created draft.
   */
  @Post()
  @RequirePermissions(PERMISSIONS.WORKFORCE_CREDENTIAL_APPLICATION_WRITE)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateApplicationDto,
  ): Promise<CredentialApplication> {
    return this.applications.create(user.tenant_id, {
      employeeId: body.employeeId,
      credentialingFacilityId: body.credentialingFacilityId,
      type: body.type,
      requestedPrivileges: toPrivileges(body.requestedPrivileges) ?? [],
      requestedUnitIds: body.requestedUnitIds ?? [],
      documents: toDocuments(body.documents),
      temporary: toTemporary(body.temporary),
      reason: body.reason,
    })
  }

  /**
   * Handles `GET /v1/credential-applications/:id`.
   *
   * @param user - Signed-in user.
   * @param id - Application identifier.
   * @returns The application.
   */
  @Get(':id')
  @RequirePermissions(PERMISSIONS.WORKFORCE_CREDENTIAL_APPLICATION_READ)
  async get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<ApplicationView> {
    return this.show(user, await this.applications.get(user.tenant_id, id))
  }

  /**
   * Handles `PATCH /v1/credential-applications/:id`: edits a draft or a returned application.
   *
   * @param user - Signed-in user.
   * @param id - Application identifier.
   * @param body - Parts to change.
   * @returns The updated application.
   */
  @Patch(':id')
  @RequirePermissions(PERMISSIONS.WORKFORCE_CREDENTIAL_APPLICATION_WRITE)
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: UpdateApplicationDto,
  ): Promise<ApplicationView> {
    return this.show(
      user,
      await this.applications.update(user.tenant_id, id, {
        requestedPrivileges: toPrivileges(body.requestedPrivileges),
        requestedUnitIds: body.requestedUnitIds,
        documents: toDocuments(body.documents),
        temporary: toTemporary(body.temporary),
        version: body.version,
        reason: body.reason,
      }),
    )
  }

  /**
   * Handles `POST /v1/credential-applications/:id/submit`: sends a draft to the committee.
   *
   * @param user - Signed-in user.
   * @param id - Application identifier.
   * @param body - Optional version and reason.
   * @returns The submitted application.
   */
  @Post(':id/submit')
  @RequirePermissions(PERMISSIONS.WORKFORCE_CREDENTIAL_APPLICATION_WRITE)
  async submit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: SubmitApplicationDto,
  ): Promise<ApplicationView> {
    return this.show(
      user,
      await this.applications.submit(user.tenant_id, id, body),
    )
  }

  /**
   * Handles `POST /v1/credential-applications/:id/withdraw`: withdraws before assessment.
   *
   * @param user - Signed-in user.
   * @param id - Application identifier.
   * @param body - Reason and optional version.
   * @returns The withdrawn application.
   */
  @Post(':id/withdraw')
  @RequirePermissions(PERMISSIONS.WORKFORCE_CREDENTIAL_APPLICATION_WRITE)
  async withdraw(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: WithdrawApplicationDto,
  ): Promise<ApplicationView> {
    return this.show(
      user,
      await this.applications.withdraw(user.tenant_id, id, body),
    )
  }

  /**
   * Handles `POST /v1/credential-applications/:id/start-review`: the committee starts checking
   * completeness. Needs a seat in the applicant's committee.
   *
   * @param user - Signed-in user.
   * @param id - Application identifier.
   * @param body - Optional version and reason.
   * @returns The application under review.
   */
  @Post(':id/start-review')
  @RequirePermissions(PERMISSIONS.WORKFORCE_CREDENTIAL_REVIEW)
  startReview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: StartReviewDto,
  ): Promise<CredentialApplication> {
    return this.reviews.startReview(user.tenant_id, user.employee_id, id, body)
  }

  /**
   * Handles `POST /v1/credential-applications/:id/return`: the committee sends the application
   * back for missing documents. Needs a seat in the applicant's committee.
   *
   * @param user - Signed-in user.
   * @param id - Application identifier.
   * @param body - Reason and optional version.
   * @returns The returned application.
   */
  @Post(':id/return')
  @RequirePermissions(PERMISSIONS.WORKFORCE_CREDENTIAL_REVIEW)
  returnApplication(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: ReturnApplicationDto,
  ): Promise<CredentialApplication> {
    return this.reviews.returnApplication(
      user.tenant_id,
      user.employee_id,
      id,
      body,
    )
  }

  /**
   * Handles `POST /v1/credential-applications/:id/assessors`: the committee appoints assessors.
   * Needs a seat in the applicant's committee.
   *
   * @param user - Signed-in user.
   * @param id - Application identifier.
   * @param body - The employees to appoint.
   * @returns The application with its assessors.
   */
  @Post(':id/assessors')
  @RequirePermissions(PERMISSIONS.WORKFORCE_CREDENTIAL_REVIEW)
  appointAssessors(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: AppointAssessorsDto,
  ): Promise<CredentialApplication> {
    return this.reviews.appointAssessors(
      user.tenant_id,
      user.employee_id,
      id,
      body,
    )
  }

  /**
   * Handles `POST /v1/credential-applications/:id/conflict-declaration`: an appointed assessor
   * declares a conflict of interest, or none. Personal: sign-in only, the service checks that the
   * caller is one of the application's assessors.
   *
   * @param user - Signed-in user.
   * @param id - Application identifier.
   * @param body - The declaration.
   * @returns The application with the declaration.
   */
  @Post(':id/conflict-declaration')
  declareConflict(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: DeclareConflictDto,
  ): Promise<CredentialApplication> {
    return this.reviews.declareConflict(
      user.tenant_id,
      user.employee_id,
      id,
      body,
    )
  }

  /**
   * Handles `POST /v1/credential-applications/:id/assessments`: an appointed assessor records
   * the assessment of every requested privilege. Personal: sign-in only, the service checks
   * that the caller is one of the application's assessors.
   *
   * @param user - Signed-in user.
   * @param id - Application identifier.
   * @param body - A finding for every requested privilege.
   * @returns The stored findings and the status of the application.
   */
  @Post(':id/assessments')
  assess(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: AssessDto,
  ): Promise<AssessResult> {
    return this.assessmentService.assess(user.tenant_id, user.employee_id, id, {
      assessments: body.assessments.map((finding) => ({
        catalogItemId: finding.catalogItemId,
        methods: finding.methods,
        outcome: finding.outcome,
        recommendedCondition: finding.recommendedCondition ?? null,
        reason: finding.reason,
      })),
      version: body.version,
    })
  }

  /**
   * Handles `GET /v1/credential-applications/:id/assessments`: the committee reads the
   * assessments. Each assessment returned is recorded as an access in the change log. An
   * assessor sees only their own.
   *
   * @param user - Signed-in user.
   * @param id - Application identifier.
   * @returns The assessments the caller may see.
   */
  @Get(':id/assessments')
  @RequirePermissions(PERMISSIONS.WORKFORCE_CREDENTIAL_REVIEW)
  listAssessments(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<CredentialAssessment[]> {
    return this.assessmentService.list(user.tenant_id, user.employee_id, id)
  }

  /**
   * Handles `POST /v1/credential-applications/:id/recommendation`: the committee chair signs the
   * recommendation to the Director.
   *
   * @param user - Signed-in user.
   * @param id - Application identifier.
   * @param body - The summary and a decision for every requested privilege.
   * @returns The recommended application.
   */
  @Post(':id/recommendation')
  @RequirePermissions(PERMISSIONS.WORKFORCE_CREDENTIAL_REVIEW)
  recommend(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: RecommendDto,
  ): Promise<CredentialApplication> {
    return this.assessmentService.recommend(
      user.tenant_id,
      user.employee_id,
      id,
      {
        summary: body.summary,
        privileges: body.privileges.map((item) => ({
          catalogItemId: item.catalogItemId,
          outcome: item.outcome,
          condition: item.condition ?? null,
          supervisorEmployeeId: item.supervisorEmployeeId ?? null,
          restrictionNotes: item.restrictionNotes ?? null,
        })),
        version: body.version,
        reason: body.reason,
      },
    )
  }
}
