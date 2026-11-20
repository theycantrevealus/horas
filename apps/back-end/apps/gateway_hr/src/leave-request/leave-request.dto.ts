import { Transform, Type } from 'class-transformer'
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNumber,
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

/**
 * Optional version of the request the caller read, shared by the decision bodies.
 *
 * @property version - Version of the request the caller read, for the concurrency check.
 */
export class VersionedDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version?: number
}

/**
 * Body of `POST /v1/leave-requests/:id/approve`.
 *
 * @property replacementEmployeeId - The replacement, at the first step.
 * @property noReplacementReason - Why there is none, at the first step.
 */
export class ApproveLeaveDto extends VersionedDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  replacementEmployeeId?: string

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  noReplacementReason?: string
}

/**
 * Body of `POST /v1/leave-requests/:id/reject`.
 *
 * @property reason - Why, 1 to 500 characters.
 */
export class RejectLeaveDto extends VersionedDto {
  @IsString()
  @MaxLength(2000)
  reason!: string
}

/**
 * Body of `POST /v1/leave-requests/:id/cancel`.
 *
 * @property reason - Why; required for an approved leave.
 */
export class CancelLeaveDto extends VersionedDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string
}

/**
 * One day of a correction.
 *
 * @property date - The date.
 * @property count - The new count: 0, 0.5 or 1.
 */
export class DayChangeDto {
  @IsLocalDate()
  date!: string

  @IsNumber()
  count!: number
}

/**
 * Body of `PATCH /v1/leave-requests/:id/days`.
 *
 * @property days - The dates to change.
 */
export class AdjustDaysDto extends VersionedDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(366)
  @ValidateNested({ each: true })
  @Type(() => DayChangeDto)
  days!: DayChangeDto[]
}

/**
 * Body of `POST /v1/leave-requests/:id/change-type`.
 *
 * @property leaveType - The new leave type.
 * @property reason - Why, 1 to 500 characters.
 */
export class ChangeLeaveTypeDto extends VersionedDto {
  @ValidateNested()
  @Type(() => CodingDto)
  leaveType!: CodingDto

  @IsString()
  @MaxLength(2000)
  reason!: string
}

/**
 * One shift to give to the replacement.
 *
 * @property assignmentId - A shift the leave cancelled.
 * @property role - The role the replacement takes; the old one when missing.
 */
export class CoverItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  assignmentId!: string

  @IsOptional()
  @IsIn(['staff', 'team_leader', 'supervisor', 'dpjp_on_call'])
  role?: 'staff' | 'team_leader' | 'supervisor' | 'dpjp_on_call'
}

/**
 * Body of `POST /v1/leave-requests/:id/cover`.
 *
 * @property items - The shifts to cover, 1 to 200.
 */
export class ConfirmCoverDto extends VersionedDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => CoverItemDto)
  items!: CoverItemDto[]
}

/**
 * Body of `POST /v1/leave-requests/:id/end-early`.
 *
 * @property lastDate - The last day of the leave now.
 * @property reason - Why, 1 to 500 characters.
 */
export class EndEarlyDto extends VersionedDto {
  @IsLocalDate()
  lastDate!: string

  @IsString()
  @MaxLength(2000)
  reason!: string
}
