import { Transform, Type } from 'class-transformer'
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator'
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
 * Format of a language tag, for example `id-ID`.
 */
const LOCALE_PATTERN = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/

/**
 * A text in one language.
 *
 * @property locale - BCP 47 language tag.
 * @property text - The text.
 */
export class LocalizedTextDto {
  @Matches(LOCALE_PATTERN, {
    message: 'locale must be a language tag like id-ID',
  })
  locale!: string

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  text!: string
}

/**
 * One local administrative level of an address.
 *
 * @property level - Level number, 1 to 6.
 * @property code - Official code of the area.
 * @property name - Name of the area.
 */
export class AddressAdminLevelDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(6)
  level!: number

  @IsOptional()
  @IsString()
  @MaxLength(32)
  code?: string

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string
}

/**
 * Postal address of a facility.
 *
 * @property use - Purpose of the address.
 * @property lines - Street and building lines, at most 5.
 * @property admin_levels - Local administrative levels, at most 6.
 * @property city - City or town.
 * @property subdivision - ISO 3166-2 code, for example `ID-JK`.
 * @property postal_code - Postal code.
 * @property country - ISO 3166-1 alpha-2 code.
 */
export class AddressDto {
  @IsIn(['home', 'work', 'temp', 'mailing'])
  use!: 'home' | 'work' | 'temp' | 'mailing'

  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  lines!: string[]

  @IsArray()
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => AddressAdminLevelDto)
  admin_levels!: AddressAdminLevelDto[]

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string

  @IsOptional()
  @IsString()
  @MaxLength(6)
  subdivision?: string

  @IsOptional()
  @IsString()
  @MaxLength(20)
  postal_code?: string

  @Matches(/^[A-Z]{2}$/, { message: 'country must be two capital letters' })
  country!: string
}

/**
 * Body of `POST /v1/facilities`.
 *
 * @property organizationId - Organization that runs the facility; must be active.
 * @property code - Unique code: lower case, 2 to 32 characters (checked again by the service).
 * @property name - Names per language, 1 to 10.
 * @property timezone - IANA time zone name; cannot be changed later.
 * @property address - Site address.
 * @property holidayCalendarCodes - Holiday calendars that apply, at most 10.
 * @property externalIds - Codes given by regulators, at most 20.
 */
export class CreateFacilityDto {
  @IsMongoId()
  organizationId!: string

  @IsString()
  @MaxLength(32)
  code!: string

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => LocalizedTextDto)
  name!: LocalizedTextDto[]

  @IsString()
  @MaxLength(64)
  timezone!: string

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto | null

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(32, { each: true })
  holidayCalendarCodes?: string[]

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ExternalIdDto)
  externalIds?: ExternalIdDto[]
}

/**
 * Body of `PATCH /v1/facilities/:id`. `organizationId`, `code` and `timezone` cannot be
 * changed; if sent they are dropped by the validation pipe. Send `address: null` to clear it.
 *
 * @property name - New names, replacing the old ones.
 * @property address - New address, or `null` to clear it.
 * @property holidayCalendarCodes - New list of calendars, replacing the old one.
 * @property externalIds - New list of identifiers, replacing the old one.
 * @property status - New status.
 * @property version - Version the client read; the edit fails when the record changed since.
 * @property reason - Why the data changes, kept in the change history.
 */
export class UpdateFacilityDto {
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => LocalizedTextDto)
  name?: LocalizedTextDto[]

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto | null

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(32, { each: true })
  holidayCalendarCodes?: string[]

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ExternalIdDto)
  externalIds?: ExternalIdDto[]

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive'

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
 * Query of `GET /v1/facilities`.
 *
 * @property organizationId - Only facilities of this organization.
 * @property status - Only facilities with this status.
 * @property limit - Page size, 1 to 100.
 * @property offset - Records to skip.
 */
export class ListFacilitiesDto {
  @IsOptional()
  @IsMongoId()
  organizationId?: string

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive'

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
