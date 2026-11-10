import { Transform, Type } from 'class-transformer'
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
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
 * One company identifier (NIB, NPWP badan, EIN, UEN).
 *
 * @property system - Issuing system, for example `id.npwp-badan`.
 * @property value - The identifier.
 */
export class ExternalIdDto {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  system!: string

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  value!: string
}

/**
 * Body of `POST /v1/organizations`.
 *
 * @property code - Unique code: lower case, 2 to 32 characters (checked again by the service).
 * @property legalName - Registered name.
 * @property country - ISO 3166-1 alpha-2 code.
 * @property currency - ISO 4217 code.
 * @property identifiers - Company identifiers, at most 20.
 */
export class CreateOrganizationDto {
  @IsString()
  @MaxLength(32)
  code!: string

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  legalName!: string

  @Matches(/^[A-Z]{2}$/, { message: 'country must be two capital letters' })
  country!: string

  @Matches(/^[A-Z]{3}$/, { message: 'currency must be three capital letters' })
  currency!: string

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ExternalIdDto)
  identifiers?: ExternalIdDto[]
}

/**
 * Body of `PATCH /v1/organizations/:id`. `code` and `country` cannot be changed; if sent they
 * are dropped by the validation pipe.
 *
 * @property legalName - New registered name.
 * @property currency - New ISO 4217 code.
 * @property identifiers - New list of identifiers, replacing the old one.
 * @property status - New status.
 * @property version - Version the client read; the edit fails when the record changed since.
 * @property reason - Why the data changes, kept in the change history.
 */
export class UpdateOrganizationDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  legalName?: string

  @IsOptional()
  @Matches(/^[A-Z]{3}$/, { message: 'currency must be three capital letters' })
  currency?: string

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ExternalIdDto)
  identifiers?: ExternalIdDto[]

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
 * Query of `GET /v1/organizations`.
 *
 * @property status - Only organizations with this status.
 * @property limit - Page size, 1 to 100.
 * @property offset - Records to skip.
 */
export class ListOrganizationsDto {
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
