import { Transform, Type } from 'class-transformer'
import {
  IsBoolean,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator'

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
 * @returns A boolean for `true` or `false`, else the value unchanged.
 */
function toBoolean({ value }: { value: unknown }): unknown {
  if (value === 'true') {
    return true
  }
  return value === 'false' ? false : value
}

/**
 * Query of `POST /v1/rosters/:id/imports`. The body is the CSV file itself, so the options travel
 * in the query.
 *
 * @property apply - False or missing checks the file; true applies a file that was checked.
 * @property checkId - The `validated` import that checked this same file (needed to apply).
 * @property version - Version of the roster the client read (applying only).
 * @property reason - Why, kept in the change history (applying only).
 */
export class ImportRosterQueryDto {
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  apply?: boolean

  @IsOptional()
  @IsMongoId()
  checkId?: string

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
