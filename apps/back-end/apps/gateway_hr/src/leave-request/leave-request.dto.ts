import { Transform, Type } from 'class-transformer'
import {
  IsBoolean,
  IsIn,
  IsInt,
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
import { DocumentRefDto } from '../license/license.dto'

/**
 * Statuses a request can be in, for the `status` filter.
 */
export const LEAVE_STATUS_VALUES = [
  'requested',
  'head_approved',
  'approved',
  'rejected',
  'cancelled',
] as const

/**
 * Turns the strings `true` and `false` of a query into booleans.
 *
 * @param params - Value being transformed.
 * @param params.value - The raw value.
 * @returns A boolean for `true` and `false`, otherwise the value unchanged.
 */
function toBoolean({ value }: { value: unknown }): unknown {
  if (value === 'true') {
    return true
  }
  return value === 'false' ? false : value
}

/**
 * A half first or last day.
 *
 * @property first - The first day counts half.
 * @property last - The last day counts half.
 */
export class HalfDaysDto {
  @IsBoolean()
  first!: boolean

  @IsBoolean()
  last!: boolean
}

/**
 * Dates of a request, shared by the preview and the two ways to create one.
 *
 * @property leaveType - The leave type, a code of a leave type system.
 * @property start - First date.
 * @property end - Last date.
 * @property halfDays - A half first or last day.
 */
export class LeaveDatesDto {
  @ValidateNested()
  @Type(() => CodingDto)
  leaveType!: CodingDto

  @IsLocalDate()
  start!: string

  @IsLocalDate()
  end!: string

  @IsOptional()
  @ValidateNested()
  @Type(() => HalfDaysDto)
  halfDays?: HalfDaysDto
}

/**
 * Body of `POST /v1/leave-requests/preview`.
 *
 * @property employeeId - The employee to preview for; the caller's own when missing.
 */
export class PreviewLeaveDto extends LeaveDatesDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  employeeId?: string
}

/**
 * Body of `POST /v1/employees/me/leave-requests`.
 *
 * @property reason - Why, 1 to 1000 characters; kept apart from the request.
 */
export class OwnLeaveRequestDto extends LeaveDatesDto {
  @IsString()
  @MaxLength(2000)
  reason!: string
}

/**
 * Body of `POST /v1/leave-requests`: HR requests on an employee's behalf.
 *
 * @property employeeId - The employee.
 */
export class HrLeaveRequestDto extends OwnLeaveRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  employeeId!: string
}

/**
 * Body of `PUT /v1/leave-requests/:id/proof`.
 *
 * @property proof - Reference to the file.
 * @property version - Version the caller read, for the concurrency check.
 */
export class ProofDto {
  @ValidateNested()
  @Type(() => DocumentRefDto)
  proof!: DocumentRefDto

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version?: number
}

/**
 * Paging and filters of the signed-in employee's own requests.
 */
export class OwnLeaveRequestsQueryDto {
  @IsOptional()
  @IsIn(LEAVE_STATUS_VALUES)
  status?: (typeof LEAVE_STATUS_VALUES)[number]

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
 * Filters and paging of `GET /v1/leave-requests`.
 */
export class LeaveRequestsQueryDto extends OwnLeaveRequestsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  unitId?: string

  @IsOptional()
  @IsString()
  @MaxLength(64)
  employeeId?: string

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  waitingForMe?: boolean

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  proofOverdue?: boolean
}
