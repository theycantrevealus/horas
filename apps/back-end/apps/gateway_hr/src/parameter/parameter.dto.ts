import { Transform, Type } from 'class-transformer'
import {
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

/**
 * Levels a parameter value can be set at.
 */
const SCOPE_KINDS = [
  'tenant',
  'organization',
  'facility',
  'unit',
  'committee',
] as const

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
 * Scope of a parameter value.
 *
 * @property kind - Level the value applies to.
 * @property id - Identifier of the organization, facility or unit; none for the tenant.
 */
export class ParameterScopeDto {
  @IsIn(SCOPE_KINDS)
  kind!: (typeof SCOPE_KINDS)[number]

  @IsOptional()
  @IsMongoId()
  id?: string | null
}

/**
 * Body of `POST /v1/parameters`.
 *
 * @property key - Parameter key from the catalog.
 * @property scope - Level the value applies to.
 * @property value - The value; its shape depends on the key and is checked by the service.
 * @property effectiveFrom - First day the value applies, `YYYY-MM-DD`.
 * @property notes - Legal basis, up to 500 characters.
 * @property reason - Why the value is set, kept in the change history.
 */
export class SetParameterDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  key!: string

  @IsDefined()
  @ValidateNested()
  @Type(() => ParameterScopeDto)
  scope!: ParameterScopeDto

  @IsDefined()
  value!: unknown

  @IsLocalDate()
  effectiveFrom!: string

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason?: string
}

/**
 * Query of `GET /v1/parameters`.
 *
 * @property key - Only values of this parameter.
 * @property scopeKind - Only values set at this level.
 * @property scopeId - Only values set for this organization, facility or unit.
 * @property limit - Page size, 1 to 100.
 * @property offset - Records to skip.
 */
export class ListParametersDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  key?: string

  @IsOptional()
  @IsIn(SCOPE_KINDS)
  scopeKind?: (typeof SCOPE_KINDS)[number]

  @IsOptional()
  @IsMongoId()
  scopeId?: string

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
 * Query of `GET /v1/parameters/effective`.
 *
 * @property key - Parameter key from the catalog. Required.
 * @property organizationId - Organization to read the value for.
 * @property facilityId - Facility to read the value for.
 * @property unitId - Unit to read the value for.
 * @property date - Day the value must be in force; defaults to today.
 */
export class EffectiveParameterDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  key!: string

  @IsOptional()
  @IsMongoId()
  organizationId?: string

  @IsOptional()
  @IsMongoId()
  facilityId?: string

  @IsOptional()
  @IsMongoId()
  unitId?: string

  @IsOptional()
  @IsLocalDate()
  date?: string
}
