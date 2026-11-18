import { Transform, Type } from 'class-transformer'
import {
  IsBoolean,
  IsDefined,
  IsIn,
  IsInt,
  IsMongoId,
  IsNumber,
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
 * Body of `POST /v1/assignments`.
 *
 * @property employeeId - The employee.
 * @property positionId - The position.
 * @property contractId - Active contract of the employee.
 * @property kind - Assignment kind code.
 * @property period - Dates; `end` is required for acting and secondment.
 * @property fte - Full-time equivalent, above 0 and at most 1; default 1.
 * @property isPrimary - Whether this is the primary assignment; default true for the first one.
 * @property decisionNumber - Decision (SK) number.
 * @property reason - Why, kept in the change history.
 */
export class CreateAssignmentDto {
  @IsMongoId()
  employeeId!: string

  @IsMongoId()
  positionId!: string

  @IsMongoId()
  contractId!: string

  @IsDefined()
  @ValidateNested()
  @Type(() => CodingDto)
  kind!: CodingDto

  @IsDefined()
  @ValidateNested()
  @Type(() => DatePeriodDto)
  period!: DatePeriodDto

  @IsOptional()
  @IsNumber()
  fte?: number

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean

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
 * Body of `POST /v1/assignments/:id/end`.
 *
 * @property date - Last day of the assignment.
 * @property version - Version the client read.
 * @property reason - Why, kept in the change history.
 */
export class EndAssignmentDto {
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
 * Query of `GET /v1/units/:id/assignments`.
 *
 * @property status - Only assignments in this status.
 * @property limit - Page size, 1 to 100.
 * @property offset - Records to skip.
 */
export class ListUnitAssignmentsDto {
  @IsOptional()
  @IsIn(['planned', 'active', 'ended'])
  status?: 'planned' | 'active' | 'ended'

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
