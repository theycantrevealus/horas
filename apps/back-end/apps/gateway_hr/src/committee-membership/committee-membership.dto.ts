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
import { CodingDto, DatePeriodDto } from '../code-concept/code-concept.dto'

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
 * Body of `POST /v1/committee-memberships`.
 *
 * @property employeeId - The member.
 * @property facilityId - Facility whose committee it is.
 * @property committee - Committee code.
 * @property role - Role code.
 * @property period - Dates; `end` is optional.
 * @property decisionNumber - Decision (SK) number.
 * @property reason - Why, kept in the change history.
 */
export class CreateCommitteeMembershipDto {
  @IsMongoId()
  employeeId!: string

  @IsMongoId()
  facilityId!: string

  @IsDefined()
  @ValidateNested()
  @Type(() => CodingDto)
  committee!: CodingDto

  @IsDefined()
  @ValidateNested()
  @Type(() => CodingDto)
  role!: CodingDto

  @IsDefined()
  @ValidateNested()
  @Type(() => DatePeriodDto)
  period!: DatePeriodDto

  @IsOptional()
  @IsString()
  @MaxLength(200)
  decisionNumber?: string

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason?: string
}

/**
 * Body of `POST /v1/committee-memberships/:id/end`.
 *
 * @property date - Last day of the membership.
 * @property version - Version the client read.
 * @property reason - Why, kept in the change history.
 */
export class EndCommitteeMembershipDto {
  @IsLocalDate()
  date!: string

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
 * Query of `GET /v1/committee-memberships`.
 *
 * @property facilityId - Facility whose committees are listed. Required.
 * @property committee - Only this committee code.
 * @property role - Only this role code.
 * @property status - Only memberships in this status.
 * @property limit - Page size, 1 to 100.
 * @property offset - Records to skip.
 */
export class ListCommitteeMembershipsDto {
  @IsMongoId()
  facilityId!: string

  @IsOptional()
  @IsString()
  @MaxLength(64)
  committee?: string

  @IsOptional()
  @IsString()
  @MaxLength(64)
  role?: string

  @IsOptional()
  @IsIn(['active', 'ended'])
  status?: 'active' | 'ended'

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
