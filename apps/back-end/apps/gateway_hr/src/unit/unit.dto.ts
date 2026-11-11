import { Transform, Type } from 'class-transformer'
import {
  ArrayMaxSize,
  ArrayMinSize,
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
  ValidateIf,
  ValidateNested,
} from 'class-validator'
import { IsLocalDate } from '@utility/validation/local-date'
import { CodingDto } from '../code-concept/code-concept.dto'
import { LocalizedTextDto } from '../facility/facility.dto'
import { ExternalIdDto } from '../organization/organization.dto'

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
 * Reads `true` and `false` from a query string; other values stay as they are and fail validation.
 *
 * @param params - Value being transformed.
 * @param params.value - The raw value.
 * @returns A boolean for `true` and `false`, otherwise the value.
 */
function toBoolean({ value }: { value: unknown }): unknown {
  if (value === 'true') {
    return true
  }
  return value === 'false' ? false : value
}

/**
 * Body of `POST /v1/units`.
 *
 * @property facilityId - Facility of the unit; cannot be changed later.
 * @property code - Unique code inside the facility: lower case, 2 to 32 characters.
 * @property name - Names per language, 1 to 10.
 * @property type - Unit type from the unit-type code system.
 * @property parentId - Parent unit; none for a top unit.
 * @property isClinical - Patients are treated here; defaults from the type.
 * @property startDate - First day of the unit; defaults to today in the facility's time zone.
 * @property externalIds - Codes given by other systems, at most 20.
 */
export class CreateUnitDto {
  @IsMongoId()
  facilityId!: string

  @IsString()
  @MaxLength(32)
  code!: string

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => LocalizedTextDto)
  name!: LocalizedTextDto[]

  @IsDefined()
  @ValidateNested()
  @Type(() => CodingDto)
  type!: CodingDto

  @IsOptional()
  @IsMongoId()
  parentId?: string

  @IsOptional()
  @IsBoolean()
  isClinical?: boolean

  @IsOptional()
  @IsLocalDate()
  startDate?: string

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ExternalIdDto)
  externalIds?: ExternalIdDto[]
}

/**
 * Body of `PATCH /v1/units/:id`. The facility, code, parent, status and period cannot be changed
 * here; if sent they are dropped by the validation pipe.
 *
 * @property name - New names, replacing the old ones.
 * @property type - New unit type.
 * @property isClinical - New clinical flag.
 * @property externalIds - New identifiers, replacing the old ones.
 * @property version - Version the client read; the edit fails when the record changed since.
 * @property reason - Why the data changes, kept in the change history.
 */
export class UpdateUnitDto {
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => LocalizedTextDto)
  name?: LocalizedTextDto[]

  @IsOptional()
  @ValidateNested()
  @Type(() => CodingDto)
  type?: CodingDto

  @IsOptional()
  @IsBoolean()
  isClinical?: boolean

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ExternalIdDto)
  externalIds?: ExternalIdDto[]

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
 * Body of `POST /v1/units/:id/move`.
 *
 * @property parentId - New parent unit, or `null` to make it a top unit. Required.
 * @property version - Version the client read.
 * @property reason - Why the unit moves.
 */
export class MoveUnitDto {
  @ValidateIf((body: MoveUnitDto) => body.parentId !== null)
  @IsMongoId()
  parentId!: string | null

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
 * Body of `POST /v1/units/:id/close`.
 *
 * @property endDate - Last day of the unit; defaults to today in the facility's time zone.
 * @property version - Version the client read.
 * @property reason - Why the unit closes.
 */
export class CloseUnitDto {
  @IsOptional()
  @IsLocalDate()
  endDate?: string

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
 * Query of `GET /v1/units`.
 *
 * @property facilityId - Facility whose units are listed. Required.
 * @property parentId - Only direct children of this unit.
 * @property status - Only units with this status.
 * @property limit - Page size, 1 to 100.
 * @property offset - Records to skip.
 */
export class ListUnitsDto {
  @IsMongoId()
  facilityId!: string

  @IsOptional()
  @IsMongoId()
  parentId?: string

  @IsOptional()
  @IsIn(['active', 'closed'])
  status?: 'active' | 'closed'

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
 * Query of `GET /v1/units/tree`.
 *
 * @property facilityId - Facility whose chart is read. Required.
 * @property rootId - Only this unit's subtree.
 * @property includeClosed - Also closed units; by default only active ones.
 */
export class UnitTreeDto {
  @IsMongoId()
  facilityId!: string

  @IsOptional()
  @IsMongoId()
  rootId?: string

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  includeClosed?: boolean
}
