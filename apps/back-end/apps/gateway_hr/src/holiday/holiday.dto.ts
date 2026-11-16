import { Transform, Type } from 'class-transformer'
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator'
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
 * @returns A boolean for `true` or `false`, else the value unchanged.
 */
function toBoolean({ value }: { value: unknown }): unknown {
  if (value === 'true') {
    return true
  }
  return value === 'false' ? false : value
}

/**
 * The kinds of holiday.
 */
const KINDS = ['public', 'collective_leave', 'local']

/**
 * Query of `GET /v1/holiday-calendars`.
 *
 * @property code - Only this calendar code.
 * @property year - Only this year.
 * @property country - Only calendars of this country.
 * @property includeRemoved - Also return removed holidays.
 * @property limit - Page size, 1 to 100.
 * @property offset - Records to skip.
 */
export class ListCalendarsDto {
  @IsOptional()
  @IsString()
  @MaxLength(32)
  code?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year?: number

  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  includeRemoved?: boolean

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
 * Body of `POST /v1/holiday-calendars`; the service checks the formats and ranges.
 *
 * @property code - Calendar code, for example `id-national`.
 * @property year - Calendar year.
 * @property country - ISO 3166-1 alpha-2 country.
 * @property subdivision - ISO 3166-2 code, or empty for a national calendar.
 * @property reason - Why, kept in the change history.
 */
export class CreateCalendarDto {
  @IsString()
  @MaxLength(64)
  code!: string

  @IsInt()
  year!: number

  @IsString()
  @MaxLength(8)
  country!: string

  @IsOptional()
  @IsString()
  @MaxLength(16)
  subdivision?: string | null

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason?: string
}

/**
 * Body of `POST /v1/holiday-calendars/:id/holidays`.
 *
 * @property date - The day, `YYYY-MM-DD`; the service checks it is a real day of the year.
 * @property kind - Public holiday, collective leave or local holiday.
 * @property name - Name per language.
 * @property version - Version the client read.
 * @property reason - Why, kept in the change history.
 */
export class AddHolidayDto {
  @IsString()
  @MaxLength(16)
  date!: string

  @IsIn(KINDS)
  kind!: 'public' | 'collective_leave' | 'local'

  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => LocalizedTextDto)
  name!: LocalizedTextDto[]

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
 * Body of `POST /v1/holiday-calendars/:id/holidays/remove`.
 *
 * @property date - The day of the holiday.
 * @property kind - The kind of the holiday.
 * @property version - Version the client read.
 * @property reason - Why, kept in the change history.
 */
export class RemoveHolidayDto {
  @IsString()
  @MaxLength(16)
  date!: string

  @IsIn(KINDS)
  kind!: 'public' | 'collective_leave' | 'local'

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
