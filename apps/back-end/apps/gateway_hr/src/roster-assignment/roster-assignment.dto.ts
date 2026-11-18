import { Transform, Type } from 'class-transformer'
import {
  IsBoolean,
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
 * The roles an assignment can have.
 */
const ROLES = ['staff', 'team_leader', 'supervisor', 'dpjp_on_call']

/**
 * Query of `GET /v1/rosters/:id/assignments`.
 *
 * @property date - Only assignments on this date.
 * @property from - Only assignments on or after this date.
 * @property to - Only assignments on or before this date.
 * @property employeeId - Only assignments of this employee.
 * @property status - Only assignments in this status.
 * @property limit - Page size, 1 to 500.
 * @property offset - Records to skip.
 */
export class ListAssignmentsDto {
  @IsOptional()
  @IsLocalDate()
  date?: string

  @IsOptional()
  @IsLocalDate()
  from?: string

  @IsOptional()
  @IsLocalDate()
  to?: string

  @IsOptional()
  @IsMongoId()
  employeeId?: string

  @IsOptional()
  @IsIn(['planned', 'cancelled'])
  status?: 'planned' | 'cancelled'

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number
}

/**
 * Body of `POST /v1/rosters/:id/assignments`; the service checks the business rules.
 *
 * @property employeeId - The employee.
 * @property date - The local date the shift starts.
 * @property shiftId - The shift definition.
 * @property role - Role in the shift; `staff` when missing.
 * @property overtimeConsent - The employee consents to overtime on this shift.
 * @property reason - Why, kept in the change history.
 */
export class AddAssignmentDto {
  @IsMongoId()
  employeeId!: string

  @IsLocalDate()
  date!: string

  @IsMongoId()
  shiftId!: string

  @IsOptional()
  @IsIn(ROLES)
  role?: 'staff' | 'team_leader' | 'supervisor' | 'dpjp_on_call'

  @IsOptional()
  @IsBoolean()
  overtimeConsent?: boolean

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason?: string
}

/**
 * Body of `PATCH /v1/roster-assignments/:id`. The employee and the date are not in it.
 *
 * @property shiftId - A different shift.
 * @property role - A different role.
 * @property overtimeConsent - Consent for overtime on the shift.
 * @property version - Version the client read.
 * @property reason - Why, kept in the change history.
 */
export class ChangeAssignmentDto {
  @IsOptional()
  @IsMongoId()
  shiftId?: string

  @IsOptional()
  @IsIn(ROLES)
  role?: 'staff' | 'team_leader' | 'supervisor' | 'dpjp_on_call'

  @IsOptional()
  @IsBoolean()
  overtimeConsent?: boolean

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
 * Body of `POST /v1/roster-assignments/:id/cancel`.
 *
 * @property version - Version the client read.
 * @property reason - Why, kept in the change history.
 */
export class CancelAssignmentDto {
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
