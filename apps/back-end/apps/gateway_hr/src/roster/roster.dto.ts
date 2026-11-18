import { Transform, Type } from 'class-transformer'
import {
  IsIn,
  IsInt,
  IsMongoId,
  IsObject,
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
 * Query of `GET /v1/rosters`.
 *
 * @property unitId - Only rosters of this unit.
 * @property facilityId - Only rosters of this facility.
 * @property status - Only rosters in this status.
 * @property from - Only rosters whose period ends on or after this date.
 * @property to - Only rosters whose period starts on or before this date.
 * @property limit - Page size, 1 to 100.
 * @property offset - Records to skip.
 */
export class ListRostersDto {
  @IsOptional()
  @IsMongoId()
  unitId?: string

  @IsOptional()
  @IsMongoId()
  facilityId?: string

  @IsOptional()
  @IsIn(['draft', 'submitted', 'approved', 'published', 'closed'])
  status?: 'draft' | 'submitted' | 'approved' | 'published' | 'closed'

  @IsOptional()
  @IsLocalDate()
  from?: string

  @IsOptional()
  @IsLocalDate()
  to?: string

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
 * The period of a new roster.
 *
 * @property start - First day, `YYYY-MM-DD`.
 * @property end - Last day, `YYYY-MM-DD`.
 */
export class RosterPeriodDto {
  @IsLocalDate()
  start!: string

  @IsLocalDate()
  end!: string
}

/**
 * Body of `POST /v1/rosters`; the service checks the period against `ROSTER_PERIOD`.
 *
 * @property unitId - The unit.
 * @property period - First and last day.
 * @property reason - Why, kept in the change history.
 */
export class CreateRosterDto {
  @IsMongoId()
  unitId!: string

  @IsObject()
  @ValidateNested()
  @Type(() => RosterPeriodDto)
  period!: RosterPeriodDto

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason?: string
}

/**
 * Body of the status moves that take no reason of their own: submit, approve, publish and close.
 *
 * @property version - Version the client read.
 * @property reason - Why, kept in the change history.
 */
export class RosterMoveDto {
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
 * Body of `POST /v1/rosters/:id/return`; the reason is required and checked by the service.
 *
 * @property version - Version the client read.
 * @property reason - Why the roster is returned.
 */
export class ReturnRosterDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  version?: number

  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  reason!: string
}

/**
 * Body of `POST /v1/rosters/:id/coverage-overrides`; the service checks that the gap exists.
 *
 * @property date - The day of the gap.
 * @property shiftId - The shift of the gap.
 * @property requirementId - The requirement that is not met.
 * @property reason - Why the gap is accepted; required.
 * @property version - Version of the roster the client read.
 */
export class CoverageOverrideDto {
  @IsLocalDate()
  date!: string

  @IsMongoId()
  shiftId!: string

  @IsMongoId()
  requirementId!: string

  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  reason!: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  version?: number
}
