import { Transform, Type } from 'class-transformer'
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
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
 * Query of `GET /v1/leave-policies`.
 *
 * @property leaveTypeSystem - Only policies of this code system.
 * @property leaveTypeCode - Only policies of this leave type code.
 * @property onDate - Only the version in force of each type on this date.
 * @property limit - Page size, 1 to 100.
 * @property offset - Records to skip.
 */
export class ListLeavePolicyDto {
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
 * The days a `period` policy carries into the next period.
 *
 * @property maxDays - Most days that move on.
 * @property expiresAfterMonths - Months the carried days stay usable.
 */
export class LeaveCarryOverDto {
  @IsNumber({ allowNaN: false, allowInfinity: false })
  maxDays!: number

  @IsNumber({ allowNaN: false, allowInfinity: false })
  expiresAfterMonths!: number
}

/**
 * The balance rule. One shape for the three kinds; the service refuses settings that do not
 * belong to the kind.
 *
 * @property kind - `period`, `per_event` or `none`.
 * @property period - For `period`: `calendar_year` or `service_year`.
 * @property days - Days per period, or per event.
 * @property minServiceMonths - For `period`: months of service before the first entitlement.
 * @property carryOver - For `period`: unused days that move on, or `null`.
 * @property deductCollectiveLeave - For `period`: collective leave is taken from the balance.
 */
export class LeaveBalanceDto {
  @IsIn(['period', 'per_event', 'none'])
  kind!: 'period' | 'per_event' | 'none'

  @IsOptional()
  @IsIn(['calendar_year', 'service_year'])
  period?: 'calendar_year' | 'service_year'

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  days?: number

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  minServiceMonths?: number

  @IsOptional()
  @ValidateNested()
  @Type(() => LeaveCarryOverDto)
  carryOver?: LeaveCarryOverDto | null

  @IsOptional()
  @IsBoolean()
  deductCollectiveLeave?: boolean
}

/**
 * The approval rule.
 *
 * @property steps - `one_step` or `two_step`.
 * @property twoStepAboveDays - Days above which a one-step policy needs two steps, or `null`.
 */
export class LeaveApprovalDto {
  @IsIn(['one_step', 'two_step'])
  steps!: 'one_step' | 'two_step'

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  twoStepAboveDays?: number | null
}

/**
 * The proof rule.
 *
 * @property dueDays - Days after the first leave date the proof is due.
 */
export class LeaveProofDto {
  @IsNumber({ allowNaN: false, allowInfinity: false })
  dueDays!: number
}

/**
 * Body of `POST /v1/leave-policies`.
 *
 * @property leaveType - The leave type.
 * @property effectiveFrom - First date the version applies.
 * @property balance - How days are granted.
 * @property counting - `working_days` or `calendar_days`.
 * @property halfDays - Whether half days may be requested; false when missing.
 * @property paid - Whether the leave is paid.
 * @property employmentTypes - Employment types that may use it; empty or missing means all.
 * @property approval - One or two approval steps.
 * @property noticeDays - Days of notice; 0 when missing.
 * @property retroactiveDays - Days after the start a request is still accepted; 0 when missing.
 * @property maxDaysPerRequest - Most days of one request.
 * @property proof - Proof rule, or `null`/missing for none.
 * @property notes - Legal basis, or `null`/missing.
 * @property reason - Why, kept in the change history.
 */
export class CreateLeavePolicyDto {
  @IsObject()
  @ValidateNested()
  @Type(() => CodingDto)
  leaveType!: CodingDto

  @IsLocalDate()
  effectiveFrom!: string

  @IsObject()
  @ValidateNested()
  @Type(() => LeaveBalanceDto)
  balance!: LeaveBalanceDto

  @IsIn(['working_days', 'calendar_days'])
  counting!: 'working_days' | 'calendar_days'

  @IsOptional()
  @IsBoolean()
  halfDays?: boolean

  @IsBoolean()
  paid!: boolean

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CodingDto)
  employmentTypes?: CodingDto[]

  @IsObject()
  @ValidateNested()
  @Type(() => LeaveApprovalDto)
  approval!: LeaveApprovalDto

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  noticeDays?: number

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  retroactiveDays?: number

  @IsNumber({ allowNaN: false, allowInfinity: false })
  maxDaysPerRequest!: number

  @IsOptional()
  @ValidateNested()
  @Type(() => LeaveProofDto)
  proof?: LeaveProofDto | null

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  notes?: string | null

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason?: string
}

/**
 * Body of `PATCH /v1/leave-policies/:id`. The leave type and the start date are not in it. A field
 * that is missing keeps its value; `proof` and `notes` accept `null` to clear them.
 *
 * @property balance - New balance rule.
 * @property counting - New counting.
 * @property halfDays - New half-day flag.
 * @property paid - New paid flag.
 * @property employmentTypes - New employment types, replacing the old list.
 * @property approval - New approval rule.
 * @property noticeDays - New notice.
 * @property retroactiveDays - New after-the-fact days.
 * @property maxDaysPerRequest - New limit per request.
 * @property proof - New proof rule, or `null`.
 * @property notes - New notes, or `null`.
 * @property version - Version the client read.
 * @property reason - Why, kept in the change history.
 */
export class UpdateLeavePolicyDto {
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => LeaveBalanceDto)
  balance?: LeaveBalanceDto

  @IsOptional()
  @IsIn(['working_days', 'calendar_days'])
  counting?: 'working_days' | 'calendar_days'

  @IsOptional()
  @IsBoolean()
  halfDays?: boolean

  @IsOptional()
  @IsBoolean()
  paid?: boolean

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CodingDto)
  employmentTypes?: CodingDto[]

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => LeaveApprovalDto)
  approval?: LeaveApprovalDto

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  noticeDays?: number

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  retroactiveDays?: number

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  maxDaysPerRequest?: number

  @IsOptional()
  @ValidateNested()
  @Type(() => LeaveProofDto)
  proof?: LeaveProofDto | null

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  notes?: string | null

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
 * Body of `POST /v1/leave-policies/import`.
 *
 * @property bundle - Bundle name, for example `id`.
 * @property effectiveFrom - First date the created versions apply.
 * @property reason - Why, kept in the change history.
 */
export class ImportLeavePoliciesDto {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  bundle!: string

  @IsLocalDate()
  effectiveFrom!: string

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason?: string
}
