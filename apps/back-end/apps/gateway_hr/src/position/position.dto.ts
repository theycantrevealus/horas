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
  ValidateNested,
} from 'class-validator'
import { IsLocalDate } from '@utility/validation/local-date'
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
 * Body of `POST /v1/positions`.
 *
 * @property unitId - Unit of the position; cannot be changed later.
 * @property code - Unique code inside the unit: lower case, 2 to 32 characters.
 * @property title - Titles per language, 1 to 10.
 * @property kind - Structural (management) or functional.
 * @property isHeadOfUnit - Whether it is the unit's head position; default false.
 * @property allowedProfessions - Professions that may fill it, at most 20; empty for any.
 * @property grade - Job grade.
 * @property budgetedHeadcount - People the position is budgeted for, 1 to 1,000; default 1.
 * @property startDate - First day; defaults to today in the facility's time zone.
 */
export class CreatePositionDto {
  @IsMongoId()
  unitId!: string

  @IsString()
  @MaxLength(32)
  code!: string

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => LocalizedTextDto)
  title!: LocalizedTextDto[]

  @IsDefined()
  @IsIn(['structural', 'functional'])
  kind!: 'structural' | 'functional'

  @IsOptional()
  @IsBoolean()
  isHeadOfUnit?: boolean

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CodingDto)
  allowedProfessions?: CodingDto[]

  @IsOptional()
  @ValidateNested()
  @Type(() => CodingDto)
  grade?: CodingDto | null

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  budgetedHeadcount?: number

  @IsOptional()
  @IsLocalDate()
  startDate?: string
}

/**
 * Body of `PATCH /v1/positions/:id`. The unit, code, kind, head flag, status and period cannot be
 * changed here; if sent they are dropped by the validation pipe. Send `grade: null` to clear it.
 *
 * @property title - New titles, replacing the old ones.
 * @property grade - New grade, or `null` to clear it.
 * @property allowedProfessions - New list, replacing the old one.
 * @property budgetedHeadcount - New headcount.
 * @property version - Version the client read; the edit fails when the record changed since.
 * @property reason - Why the data changes, kept in the change history.
 */
export class UpdatePositionDto {
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => LocalizedTextDto)
  title?: LocalizedTextDto[]

  @IsOptional()
  @ValidateNested()
  @Type(() => CodingDto)
  grade?: CodingDto | null

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CodingDto)
  allowedProfessions?: CodingDto[]

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  budgetedHeadcount?: number

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
 * Body of `POST /v1/positions/:id/close`.
 *
 * @property endDate - Last day; defaults to today in the facility's time zone.
 * @property version - Version the client read.
 * @property reason - Why the position closes.
 */
export class ClosePositionDto {
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
 * Query of `GET /v1/positions`.
 *
 * @property unitId - Unit whose positions are listed. Required.
 * @property status - Only positions with this status.
 * @property kind - Only positions of this kind.
 * @property isHeadOfUnit - Only head positions (`true`) or only the others (`false`).
 * @property limit - Page size, 1 to 100.
 * @property offset - Records to skip.
 */
export class ListPositionsDto {
  @IsMongoId()
  unitId!: string

  @IsOptional()
  @IsIn(['active', 'closed'])
  status?: 'active' | 'closed'

  @IsOptional()
  @IsIn(['structural', 'functional'])
  kind?: 'structural' | 'functional'

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isHeadOfUnit?: boolean

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
