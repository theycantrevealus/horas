import { Transform, Type } from 'class-transformer'
import {
  IsIn,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator'

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
 * The statuses a request can be in.
 */
const STATUSES = [
  'requested',
  'accepted_by_counterpart',
  'approved',
  'rejected',
  'cancelled',
] as const

/**
 * Query of `GET /v1/employees/me/shift-swaps`.
 *
 * @property status - Only requests in this status.
 * @property limit - Page size, 1 to 100.
 * @property offset - Records to skip.
 */
export class ListOwnSwapsDto {
  @IsOptional()
  @IsIn(STATUSES)
  status?: (typeof STATUSES)[number]

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
 * Query of `GET /v1/shift-swaps`.
 *
 * @property unitId - Only requests of this unit.
 * @property rosterId - Only requests of this roster.
 * @property employeeId - Only requests where this employee is the requester or the counterpart.
 */
export class ListSwapsDto extends ListOwnSwapsDto {
  @IsOptional()
  @IsMongoId()
  unitId?: string

  @IsOptional()
  @IsMongoId()
  rosterId?: string

  @IsOptional()
  @IsMongoId()
  employeeId?: string
}

/**
 * Body of `POST /v1/shift-swaps`. The requester is the signed-in employee, never a field.
 *
 * @property assignmentId - The requester's assignment.
 * @property counterpartEmployeeId - Who takes over.
 * @property counterpartAssignmentId - The counterpart's assignment to trade; missing hands the shift over.
 * @property reason - Why, 1 to 500 characters.
 */
export class CreateSwapDto {
  @IsMongoId()
  assignmentId!: string

  @IsMongoId()
  counterpartEmployeeId!: string

  @IsOptional()
  @IsMongoId()
  counterpartAssignmentId?: string

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string
}

/**
 * Body of the moves of a request.
 *
 * @property version - Version of the request the client read.
 */
export class SwapMoveDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  version?: number
}

/**
 * Body of `POST /v1/shift-swaps/:id/approve`.
 *
 * @property version - Version of the request the client read.
 * @property reason - Optional note of the Head of Unit, 1 to 500 characters.
 */
export class ApproveSwapDto extends SwapMoveDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason?: string
}

/**
 * Body of `POST /v1/shift-swaps/:id/reject`.
 *
 * @property version - Version of the request the client read.
 * @property reason - Why, 1 to 500 characters.
 */
export class RejectSwapDto extends SwapMoveDto {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string
}

