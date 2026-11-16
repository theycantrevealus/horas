import { Transform, Type } from 'class-transformer'
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsMongoId,
  IsNumber,
  IsObject,
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
 * The day patterns a requirement can have.
 */
const DAY_PATTERNS = ['all', 'weekdays', 'weekends_holidays']

/**
 * Query of `GET /v1/coverage-requirements`.
 *
 * @property unitId - Only requirements of this unit.
 * @property shiftId - Only requirements of this shift.
 * @property status - Only requirements in this status.
 * @property dayPattern - Only requirements with this day pattern.
 * @property onDate - Only requirements whose period covers this date.
 * @property limit - Page size, 1 to 100.
 * @property offset - Records to skip.
 */
export class ListCoverageDto {
  @IsOptional()
  @IsMongoId()
  unitId?: string

  @IsOptional()
  @IsMongoId()
  shiftId?: string

  @IsOptional()
  @IsIn(['active', 'retired'])
  status?: 'active' | 'retired'

  @IsOptional()
  @IsIn(DAY_PATTERNS)
  dayPattern?: 'all' | 'weekdays' | 'weekends_holidays'

  @IsOptional()
  @IsLocalDate()
  onDate?: string

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
 * Which staff count toward a requirement. An unset or `null` criterion matches anyone; the
 * service checks each code against its code system.
 *
 * @property workforceCategory - Required category.
 * @property profession - Required profession.
 * @property specialty - Required specialty.
 * @property minClinicalLevel - Lowest career level that counts.
 */
export class CoverageMatchDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => CodingDto)
  workforceCategory?: CodingDto | null

  @IsOptional()
  @ValidateNested()
  @Type(() => CodingDto)
  profession?: CodingDto | null

  @IsOptional()
  @ValidateNested()
  @Type(() => CodingDto)
  specialty?: CodingDto | null

  @IsOptional()
  @ValidateNested()
  @Type(() => CodingDto)
  minClinicalLevel?: CodingDto | null
}

/**
 * The period of a new requirement.
 *
 * @property start - First day, `YYYY-MM-DD`.
 * @property end - Last day, or empty for open-ended.
 */
export class CoveragePeriodDto {
  @IsLocalDate()
  start!: string

  @IsOptional()
  @IsLocalDate()
  end?: string | null
}

/**
 * The only part of the period an edit can change.
 *
 * @property end - New last day, or `null` for open-ended.
 */
export class CoveragePeriodEndDto {
  @ValidateIf((_object, value: unknown) => value !== null)
  @IsLocalDate()
  end!: string | null
}

/**
 * Body of `POST /v1/coverage-requirements`.
 *
 * @property unitId - The unit.
 * @property shiftId - The shift.
 * @property dayPattern - Days it applies to.
 * @property match - Which staff count.
 * @property minCount - Minimum number of matching staff.
 * @property teamLeaderRequired - One counted person must be team leader.
 * @property period - When it applies.
 * @property reason - Why, kept in the change history.
 */
export class CreateCoverageDto {
  @IsMongoId()
  unitId!: string

  @IsMongoId()
  shiftId!: string

  @IsIn(DAY_PATTERNS)
  dayPattern!: 'all' | 'weekdays' | 'weekends_holidays'

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CoverageMatchDto)
  match?: CoverageMatchDto

  @IsNumber({ allowNaN: false, allowInfinity: false })
  minCount!: number

  @IsOptional()
  @IsBoolean()
  teamLeaderRequired?: boolean

  @IsObject()
  @ValidateNested()
  @Type(() => CoveragePeriodDto)
  period!: CoveragePeriodDto

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason?: string
}

/**
 * Body of `PATCH /v1/coverage-requirements/:id`. The unit, the shift and the start of the period
 * are not in it, and a requirement that has started can change only `period.end`.
 *
 * @property dayPattern - New day pattern.
 * @property match - New criteria, replacing the old ones.
 * @property minCount - New minimum count.
 * @property teamLeaderRequired - New team leader flag.
 * @property period - New last day.
 * @property version - Version the client read.
 * @property reason - Why, kept in the change history.
 */
export class UpdateCoverageDto {
  @IsOptional()
  @IsIn(DAY_PATTERNS)
  dayPattern?: 'all' | 'weekdays' | 'weekends_holidays'

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CoverageMatchDto)
  match?: CoverageMatchDto

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  minCount?: number

  @IsOptional()
  @IsBoolean()
  teamLeaderRequired?: boolean

  @IsOptional()
  @ValidateNested()
  @Type(() => CoveragePeriodEndDto)
  period?: CoveragePeriodEndDto

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
 * Body of `POST /v1/coverage-requirements/:id/retire`.
 *
 * @property version - Version the client read.
 * @property reason - Why, kept in the change history.
 */
export class RetireCoverageDto {
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
