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
import { LocalizedTextDto } from '../facility/facility.dto'

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
 * One piece of evidence a requester must attach.
 *
 * @property type - Evidence type code.
 * @property description - What is expected, per language.
 * @property mandatory - Whether the application cannot be submitted without it.
 */
export class RequiredEvidenceDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => CodingDto)
  type!: CodingDto

  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => LocalizedTextDto)
  description!: LocalizedTextDto[]

  @IsBoolean()
  mandatory!: boolean
}

/**
 * Fields an item shares between creation and edit; all optional here, the service decides which
 * are needed.
 *
 * @property name - Name per language.
 * @property description - Description per language.
 * @property professions - Professions that may request it.
 * @property specialties - Specialties that may request it.
 * @property minClinicalLevel - Required career level, or `null`.
 * @property requiredEvidence - Evidence to attach.
 * @property externalCodes - Matching procedure codes.
 * @property facilityIds - Facilities that may grant it; empty means all.
 * @property reason - Why, kept in the change history.
 */
export class PrivilegeFieldsDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => LocalizedTextDto)
  name?: LocalizedTextDto[]

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => LocalizedTextDto)
  description?: LocalizedTextDto[]

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CodingDto)
  professions?: CodingDto[]

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CodingDto)
  specialties?: CodingDto[]

  @IsOptional()
  @ValidateNested()
  @Type(() => CodingDto)
  minClinicalLevel?: CodingDto | null

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => RequiredEvidenceDto)
  requiredEvidence?: RequiredEvidenceDto[]

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CodingDto)
  externalCodes?: CodingDto[]

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsMongoId({ each: true })
  facilityIds?: string[]

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason?: string
}

/**
 * Body of `POST /v1/privileges`.
 *
 * @property code - Catalog code.
 * @property committee - Owning committee code.
 */
export class CreatePrivilegeDto extends PrivilegeFieldsDto {
  @IsString()
  @MaxLength(64)
  code!: string

  @IsDefined()
  @ValidateNested()
  @Type(() => CodingDto)
  committee!: CodingDto
}

/**
 * Body of `PATCH /v1/privileges/:id`: any of the editable fields.
 *
 * @property version - Version the client read.
 */
export class UpdatePrivilegeDto extends PrivilegeFieldsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  version?: number
}

/**
 * Body of `POST /v1/privileges/:id/retire`.
 *
 * @property version - Version the client read.
 * @property reason - Why, kept in the change history.
 */
export class RetirePrivilegeDto {
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
 * Query of `GET /v1/privileges`.
 *
 * @property committee - Only this committee code.
 * @property profession - Only items open to this profession code.
 * @property status - Only items in this status.
 * @property facilityId - Only items this facility may grant.
 * @property limit - Page size, 1 to 100.
 * @property offset - Records to skip.
 */
export class ListPrivilegesDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  committee?: string

  @IsOptional()
  @IsString()
  @MaxLength(64)
  profession?: string

  @IsOptional()
  @IsIn(['active', 'retired'])
  status?: 'active' | 'retired'

  @IsOptional()
  @IsMongoId()
  facilityId?: string

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
