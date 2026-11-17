import { Transform, Type } from 'class-transformer'
import {
  IsDefined,
  IsIn,
  IsInt,
  IsMongoId,
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
 * Shape of a local time; the service checks that it is a real time of day.
 */
const TIME_SHAPE = /^\d{2}:\d{2}$/

/**
 * Query of `GET /v1/practice-schedules`. Without `date` it lists schedules; with `date` it answers
 * the sessions of that date.
 *
 * @property date - The local date whose sessions are wanted.
 * @property unitId - Only this polyclinic.
 * @property employeeId - Only this doctor.
 * @property status - Only schedules in this status (not with `date`).
 * @property limit - Page size, 1 to 100.
 * @property offset - Records to skip.
 */
export class ListPracticeSchedulesDto {
  @IsOptional()
  @IsLocalDate()
  date?: string

  @IsOptional()
  @IsMongoId()
  unitId?: string

  @IsOptional()
  @IsMongoId()
  employeeId?: string

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

/**
 * Body of `POST /v1/practice-schedules`.
 *
 * @property employeeId - The doctor.
 * @property unitId - The polyclinic.
 * @property dayOfWeek - ISO weekday, 1 to 7.
 * @property startTime - Local start `HH:mm`.
 * @property endTime - Local end `HH:mm`.
 * @property quota - Most patients per session; missing or `null` for no limit.
 * @property validFrom - First day.
 * @property validUntil - Last day; missing or `null` for open-ended.
 * @property reason - Why, kept in the change history.
 */
export class CreatePracticeScheduleDto {
  @IsMongoId()
  employeeId!: string

  @IsMongoId()
  unitId!: string

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7)
  dayOfWeek!: number

  @Matches(TIME_SHAPE)
  startTime!: string

  @Matches(TIME_SHAPE)
  endTime!: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  quota?: number | null

  @IsLocalDate()
  validFrom!: string

  @IsOptional()
  @IsLocalDate()
  validUntil?: string | null

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason?: string
}

/**
 * Body of `PATCH /v1/practice-schedules/:id`. The doctor, the polyclinic and the weekday never
 * change.
 *
 * @property startTime - New local start.
 * @property endTime - New local end.
 * @property quota - New quota; `null` removes the limit.
 * @property validFrom - New first day, only before the schedule has started.
 * @property validUntil - New last day; `null` makes it open-ended.
 * @property version - Version of the schedule the client read.
 * @property reason - Why, kept in the change history.
 */
export class UpdatePracticeScheduleDto {
  @IsOptional()
  @Matches(TIME_SHAPE)
  startTime?: string

  @IsOptional()
  @Matches(TIME_SHAPE)
  endTime?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  quota?: number | null

  @IsOptional()
  @IsLocalDate()
  validFrom?: string

  @IsOptional()
  @IsLocalDate()
  validUntil?: string | null

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
 * Body of `POST /v1/practice-schedules/:id/end`.
 *
 * @property lastDate - The last day the schedule applies.
 * @property version - Version of the schedule the client read.
 * @property reason - Why, kept in the change history.
 */
export class EndPracticeScheduleDto {
  @IsLocalDate()
  lastDate!: string

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
 * The new time of a moved session.
 *
 * @property date - New date.
 * @property startTime - New local start `HH:mm`.
 * @property endTime - New local end `HH:mm`.
 */
export class MovedToDto {
  @IsLocalDate()
  date!: string

  @Matches(TIME_SHAPE)
  startTime!: string

  @Matches(TIME_SHAPE)
  endTime!: string
}

/**
 * Body of `POST /v1/practice-schedules/:id/exceptions`.
 *
 * @property date - The date of the session.
 * @property kind - `cancelled` or `moved`.
 * @property reason - A code of `id.practice-exception-reason`.
 * @property movedTo - Where the session goes; required for `moved`, refused for `cancelled`.
 * @property version - Version of the schedule the client read.
 */
export class CreateExceptionDto {
  @IsLocalDate()
  date!: string

  @IsIn(['cancelled', 'moved'])
  kind!: 'cancelled' | 'moved'

  @IsDefined()
  @ValidateNested()
  @Type(() => CodingDto)
  reason!: CodingDto

  @IsOptional()
  @ValidateNested()
  @Type(() => MovedToDto)
  movedTo?: MovedToDto

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  version?: number
}

/**
 * Body of `POST /v1/practice-schedule-exceptions/:id/cancel`.
 *
 * @property version - Version of the exception the client read.
 * @property reason - Why, kept in the change history.
 */
export class UndoExceptionDto {
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

