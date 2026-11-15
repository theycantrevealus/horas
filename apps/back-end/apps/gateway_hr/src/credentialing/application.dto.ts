import { Transform, Type } from 'class-transformer'
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDefined,
  IsIn,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator'
import { CodingDto } from '../code-concept/code-concept.dto'
import { DocumentRefDto } from '../license/license.dto'

/**
 * Trims a string value before validation; other values pass through unchanged.
 *
 * @param params - Value being transformed.
 * @param params.value - The raw value.
 * @returns The trimmed string, or the value unchanged.
 */
function trim({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value
}

/**
 * One requested privilege.
 *
 * @property catalogItemId - The catalog item.
 * @property requestedCondition - Condition asked for.
 * @property proposedSupervisorEmployeeId - Proposed supervisor; needed for `supervised`.
 * @property notes - Notes.
 */
export class RequestedPrivilegeDto {
  @IsMongoId()
  catalogItemId!: string

  @IsIn(['full', 'supervised', 'restricted'])
  requestedCondition!: 'full' | 'supervised' | 'restricted'

  @IsOptional()
  @IsMongoId()
  proposedSupervisorEmployeeId?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null
}

/**
 * One attached document.
 *
 * @property type - Document type code.
 * @property file - Reference to the file.
 * @property licenseId - Licence of the applicant the document belongs to.
 */
export class ApplicationDocumentDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => CodingDto)
  type!: CodingDto

  @IsDefined()
  @ValidateNested()
  @Type(() => DocumentRefDto)
  file!: DocumentRefDto

  @IsOptional()
  @IsMongoId()
  licenseId?: string | null
}

/**
 * A temporary request.
 *
 * @property requestedDays - How long the privileges are needed.
 * @property urgency - Why, a code.
 */
export class TemporaryRequestDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  requestedDays!: number

  @IsDefined()
  @ValidateNested()
  @Type(() => CodingDto)
  urgency!: CodingDto
}

/**
 * Parts an application shares between creation and edit; all optional here, the service decides
 * which are needed.
 *
 * @property requestedPrivileges - What is asked for.
 * @property requestedUnitIds - Units the privileges are asked for.
 * @property documents - Attached documents.
 * @property temporary - Temporary request; type `temporary` only.
 * @property reason - Why, kept in the change history.
 */
export class ApplicationPartsDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => RequestedPrivilegeDto)
  requestedPrivileges?: RequestedPrivilegeDto[]

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsMongoId({ each: true })
  requestedUnitIds?: string[]

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ApplicationDocumentDto)
  documents?: ApplicationDocumentDto[]

  @IsOptional()
  @ValidateNested()
  @Type(() => TemporaryRequestDto)
  temporary?: TemporaryRequestDto | null

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason?: string
}

/**
 * Body of `POST /v1/credential-applications`.
 *
 * @property employeeId - The applicant.
 * @property credentialingFacilityId - Facility whose committee credentials the applicant.
 * @property type - Application type.
 */
export class CreateApplicationDto extends ApplicationPartsDto {
  @IsMongoId()
  employeeId!: string

  @IsMongoId()
  credentialingFacilityId!: string

  @IsIn(['initial', 'recredentialing', 'privilege_extension', 'temporary'])
  type!: 'initial' | 'recredentialing' | 'privilege_extension' | 'temporary'
}

/**
 * Body of `PATCH /v1/credential-applications/:id`.
 *
 * @property version - Version the client read.
 */
export class UpdateApplicationDto extends ApplicationPartsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  version?: number
}

/**
 * Body of `POST /v1/credential-applications/:id/submit`.
 *
 * @property version - Version the client read.
 * @property reason - Why, kept in the change history.
 */
export class SubmitApplicationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  version?: number

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason?: string
}

/**
 * Body of `POST /v1/credential-applications/:id/withdraw`.
 *
 * @property reason - Why.
 * @property version - Version the client read.
 */
export class WithdrawApplicationDto {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  reason!: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  version?: number
}

/**
 * Query of `GET /v1/credential-applications`.
 *
 * @property status - Only applications in this status.
 * @property committee - Only this committee code.
 * @property facilityId - Only applications credentialed by this facility.
 * @property employeeId - Only applications of this applicant.
 * @property olderThanDays - Only applications in their status for at least this many days.
 * @property limit - Page size, 1 to 100.
 * @property offset - Records to skip.
 */
export class ListApplicationsDto {
  @IsOptional()
  @IsIn([
    'draft',
    'submitted',
    'under_review',
    'returned',
    'assessed',
    'recommended',
    'approved',
    'rejected',
    'withdrawn',
  ])
  status?:
    | 'draft'
    | 'submitted'
    | 'under_review'
    | 'returned'
    | 'assessed'
    | 'recommended'
    | 'approved'
    | 'rejected'
    | 'withdrawn'

  @IsOptional()
  @IsString()
  @MaxLength(64)
  committee?: string

  @IsOptional()
  @IsMongoId()
  facilityId?: string

  @IsOptional()
  @IsMongoId()
  employeeId?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3650)
  olderThanDays?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number
}

/**
 * Body of `POST /v1/credential-applications/:id/start-review`.
 *
 * @property version - Version the client read.
 * @property reason - Why, kept in the change history.
 */
export class StartReviewDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  version?: number

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason?: string
}

/**
 * Body of `POST /v1/credential-applications/:id/return`.
 *
 * @property reason - Why it is sent back.
 * @property version - Version the client read.
 */
export class ReturnApplicationDto {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  version?: number
}

/**
 * Body of `POST /v1/credential-applications/:id/assessors`.
 *
 * @property assessorEmployeeIds - The employees to appoint; the service allows 1 to 20.
 * @property version - Version the client read.
 * @property reason - Why, kept in the change history.
 */
export class AppointAssessorsDto {
  @IsArray()
  @ArrayMaxSize(100)
  @IsMongoId({ each: true })
  assessorEmployeeIds!: string[]

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  version?: number

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason?: string
}

/**
 * Body of `POST /v1/credential-applications/:id/conflict-declaration`.
 *
 * @property hasConflict - Whether the assessor has a conflict of interest.
 * @property relationship - Kind of relationship; needed exactly when there is a conflict.
 * @property version - Version the client read.
 */
export class DeclareConflictDto {
  @IsBoolean()
  hasConflict!: boolean

  @IsOptional()
  @ValidateNested()
  @Type(() => CodingDto)
  relationship?: CodingDto | null

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  version?: number
}
