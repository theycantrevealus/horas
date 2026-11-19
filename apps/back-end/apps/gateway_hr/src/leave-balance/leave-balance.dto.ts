import { Transform, Type } from 'class-transformer'
import {
  IsInt,
  IsNumber,
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
 * Query of the two balance reads.
 *
 * @property onDate - A local date; the balance of the period that holds it. Today when missing.
 */
export class LeaveBalancesQueryDto {
  @IsOptional()
  @IsLocalDate()
  onDate?: string
}

/**
 * Query of `GET /v1/employees/:id/leave-ledger`.
 *
 * @property leaveTypeSystem - Only entries of this code system.
 * @property leaveTypeCode - Only entries of this leave type code.
 * @property periodStart - Only entries of the entitlement period that starts on this date.
 * @property limit - Page size, 1 to 100.
 * @property offset - Records to skip.
 */
export class LeaveLedgerQueryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  leaveTypeSystem?: string

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  leaveTypeCode?: string

  @IsOptional()
  @IsLocalDate()
  periodStart?: string

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
 * Body of `POST /v1/employees/:id/leave-adjustments`.
 *
 * @property leaveType - The leave type.
 * @property periodStart - First day of the entitlement period to adjust.
 * @property days - Days to add (positive) or remove (negative), in steps of 0.5.
 * @property reason - Why, kept in the change history.
 */
export class AdjustLeaveDto {
  @IsObject()
  @ValidateNested()
  @Type(() => CodingDto)
  leaveType!: CodingDto

  @IsLocalDate()
  periodStart!: string

  @IsNumber({ allowNaN: false, allowInfinity: false })
  days!: number

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string
}
