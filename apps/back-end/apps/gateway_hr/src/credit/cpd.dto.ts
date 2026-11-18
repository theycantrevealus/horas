import { Transform, Type } from 'class-transformer'
import {
  IsDateString,
  IsDefined,
  IsIn,
  IsInt,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
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
 * The activity that earned the credits.
 *
 * @property title - Activity title.
 * @property category - Category code.
 * @property provider - Organizer.
 */
export class CpdActivityDto {
  @IsString()
  @MaxLength(400)
  title!: string

  @IsDefined()
  @ValidateNested()
  @Type(() => CodingDto)
  category!: CodingDto

  @IsOptional()
  @IsString()
  @MaxLength(400)
  provider?: string | null
}

/**
 * Reference to the proof of an activity. The file itself is not checked.
 *
 * @property fileId - File identifier.
 * @property contentType - MIME type.
 * @property sha256 - SHA-256 hash of the file.
 */
export class CpdEvidenceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  fileId!: string

  @IsString()
  @MaxLength(100)
  contentType!: string

  @IsString()
  @Matches(/^[0-9a-fA-F]{64}$/)
  sha256!: string
}

/**
 * Fields shared by the HR and the self-service recording of credits.
 *
 * @property creditSystem - Credit system code.
 * @property activity - What was done.
 * @property activityDate - When it was done.
 * @property points - Points, at most two decimals.
 * @property evidence - Proof; required for self-service.
 * @property reason - Why, kept in the change history.
 */
export class OwnCpdRecordDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => CodingDto)
  creditSystem!: CodingDto

  @IsDefined()
  @ValidateNested()
  @Type(() => CpdActivityDto)
  activity!: CpdActivityDto

  @IsLocalDate()
  activityDate!: string

  @IsNumber()
  points!: number

  @IsOptional()
  @ValidateNested()
  @Type(() => CpdEvidenceDto)
  evidence?: CpdEvidenceDto | null

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason?: string
}

/**
 * Body of `POST /v1/cpd-records`: credits recorded by HR for an employee.
 *
 * @property employeeId - The holder.
 */
export class RecordCpdDto extends OwnCpdRecordDto {
  @IsMongoId()
  employeeId!: string
}

/**
 * Body of `POST /v1/cpd-records/:id/review`.
 *
 * @property outcome - `accept` or `reject`.
 * @property reason - Why; required for a rejection.
 * @property version - Version the client read.
 */
export class ReviewCpdDto {
  @IsIn(['accept', 'reject'])
  outcome!: 'accept' | 'reject'

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  version?: number
}

/**
 * The counting cycle of a credit total.
 *
 * @property start - First day.
 * @property end - Last day.
 */
export class CpdCycleDto {
  @IsLocalDate()
  start!: string

  @IsLocalDate()
  end!: string
}

/**
 * Body of `PUT /v1/employees/:id/cpd-summaries/:system`.
 *
 * @property creditSystem - Credit system code; its code must equal the path.
 * @property cycle - Counting period.
 * @property totalPoints - Total read from the national platform.
 * @property checkedAt - When it was read; defaults to now.
 */
export class SetCpdSummaryDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => CodingDto)
  creditSystem!: CodingDto

  @IsDefined()
  @ValidateNested()
  @Type(() => CpdCycleDto)
  cycle!: CpdCycleDto

  @IsNumber()
  totalPoints!: number

  @IsOptional()
  @IsDateString()
  checkedAt?: string
}

/**
 * Query of `GET /v1/employees/:id/cpd-records`.
 *
 * @property creditSystem - Only this credit system code.
 * @property status - Only records in this status.
 * @property limit - Page size, 1 to 100.
 * @property offset - Records to skip.
 */
export class ListCpdRecordsDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  creditSystem?: string

  @IsOptional()
  @IsIn(['submitted', 'accepted', 'rejected'])
  status?: 'submitted' | 'accepted' | 'rejected'

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
