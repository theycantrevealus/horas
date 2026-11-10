import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common'
import { type CodeConcept } from '@repository/model/code-concept'
import { type AuthenticatedUser } from '@identity/authenticated-user'
import { CurrentUser, RequirePermissions } from '@identity/guard/decorators'
import { PERMISSIONS } from '@identity/permission'
import {
  CodeConceptService,
  type ImportResult,
} from '@workforce/concept/code-concept.service'
import {
  CreateCodeConceptDto,
  ImportCodeConceptsDto,
  ListCodeConceptsDto,
  UpdateCodeConceptDto,
} from './code-concept.dto'

/**
 * Code concepts of the signed-in user's tenant, plus the platform-wide ones for reading.
 */
@Controller({ path: 'code-concepts', version: '1' })
export class CodeConceptController {
  /**
   * @param concepts - Code concept service.
   */
  constructor(private readonly concepts: CodeConceptService) {}

  /**
   * Handles `GET /v1/code-concepts?system=…`: lists the codes of one system.
   *
   * @param user - Signed-in user.
   * @param query - System and optional status.
   * @returns The concepts ordered by code.
   */
  @Get()
  @RequirePermissions(PERMISSIONS.WORKFORCE_CODE_CONCEPT_READ)
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListCodeConceptsDto,
  ): Promise<CodeConcept[]> {
    return this.concepts.list(user.tenant_id, query)
  }

  /**
   * Handles `POST /v1/code-concepts`: adds a tenant concept.
   *
   * @param user - Signed-in user.
   * @param body - The concept.
   * @returns The created concept.
   */
  @Post()
  @RequirePermissions(PERMISSIONS.WORKFORCE_CODE_CONCEPT_MANAGE)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateCodeConceptDto,
  ): Promise<CodeConcept> {
    return this.concepts.create(user.tenant_id, body)
  }

  /**
   * Handles `POST /v1/code-concepts/import`: copies a ready-made bundle into the tenant.
   *
   * @param user - Signed-in user.
   * @param body - Name of the bundle.
   * @returns How many concepts were added and skipped.
   */
  @Post('import')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.WORKFORCE_CODE_CONCEPT_MANAGE)
  import(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: ImportCodeConceptsDto,
  ): Promise<ImportResult> {
    return this.concepts.import(user.tenant_id, body.bundle)
  }

  /**
   * Handles `PATCH /v1/code-concepts/:id`: edits or retires a tenant concept.
   *
   * @param user - Signed-in user.
   * @param id - Concept identifier.
   * @param body - Fields to change.
   * @returns The updated concept.
   */
  @Patch(':id')
  @RequirePermissions(PERMISSIONS.WORKFORCE_CODE_CONCEPT_MANAGE)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: UpdateCodeConceptDto,
  ): Promise<CodeConcept> {
    return this.concepts.update(user.tenant_id, id, body)
  }
}
