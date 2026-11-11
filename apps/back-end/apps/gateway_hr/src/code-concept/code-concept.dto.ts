import { Transform, Type } from 'class-transformer'
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator'
import { IsLocalDate } from '@utility/validation/local-date'
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
 * A code in another code system, for example an ISCO-08 occupation code.
 *
 * @property system - The other system.
 * @property code - Code in that system.
 */
export class CodingDto {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  system!: string

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  code!: string
}

/**
 * When a concept may be used, as local dates.
 *
 * @property start - First day, `YYYY-MM-DD`.
 * @property end - Last day, `YYYY-MM-DD`, or `null` for open-ended.
 */
export class DatePeriodDto {
  @IsLocalDate()
  start!: string

  @IsOptional()
  @IsLocalDate()
  end?: string | null
}

/**
 * Query of `GET /v1/code-concepts`.
 *
 * @property system - Code system to list; required.
 * @property status - Only concepts with this status.
 */
export class ListCodeConceptsDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  system!: string

  @IsOptional()
  @IsIn(['active', 'retired'])
  status?: 'active' | 'retired'
}

/**
 * Body of `POST /v1/code-concepts`.
 *
 * @property system - Code system, for example `id.license-type` (checked again by the service).
 * @property code - Code inside the system (checked again by the service).
 * @property display - Text per language, 1 to 10.
 * @property properties - Attributes that rules read; checked by the service per code system.
 * @property mappings - Equivalent codes in other systems, at most 10.
 * @property period - When the concept may be used.
 */
export class CreateCodeConceptDto {
  @IsString()
  @MaxLength(64)
  system!: string

  @IsString()
  @MaxLength(64)
  code!: string

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => LocalizedTextDto)
  display!: LocalizedTextDto[]

  @IsOptional()
  @IsObject()
  properties?: Record<string, unknown>

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => CodingDto)
  mappings?: CodingDto[]

  @IsOptional()
  @ValidateNested()
  @Type(() => DatePeriodDto)
  period?: DatePeriodDto | null
}

/**
 * Body of `PATCH /v1/code-concepts/:id`. `system` and `code` cannot be changed; if sent they
 * are dropped by the validation pipe. Send `period: null` to clear the period.
 *
 * @property display - New text per language, replacing the old.
 * @property properties - New properties, replacing the old.
 * @property mappings - New mappings, replacing the old.
 * @property period - New period, or `null` for always.
 * @property status - `retired` or `active`.
 * @property version - Version the client read; the edit fails when the record changed since.
 * @property reason - Why the data changes, kept in the change history.
 */
export class UpdateCodeConceptDto {
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => LocalizedTextDto)
  display?: LocalizedTextDto[]

  @IsOptional()
  @IsObject()
  properties?: Record<string, unknown>

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => CodingDto)
  mappings?: CodingDto[]

  @IsOptional()
  @ValidateNested()
  @Type(() => DatePeriodDto)
  period?: DatePeriodDto | null

  @IsOptional()
  @IsIn(['active', 'retired'])
  status?: 'active' | 'retired'

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
 * Body of `POST /v1/code-concepts/import`.
 *
 * @property bundle - Name of the bundle to import, for example `id`.
 */
export class ImportCodeConceptsDto {
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  bundle!: string
}
