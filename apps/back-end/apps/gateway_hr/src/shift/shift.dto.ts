import { Transform, Type } from 'class-transformer'
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
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
import { LocalizedTextDto } from '../facility/facility.dto'

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
 * Query of `GET /v1/shift-definitions`.
 *
 * @property facilityId - Only shifts of this facility.
 * @property status - Only shifts in this status.
 * @property type - Only shifts of this kind.
 * @property unitId - Only shifts this unit may use.
 * @property limit - Page size, 1 to 100.
 * @property offset - Records to skip.
 */
export class ListShiftsDto {
  @IsOptional()
  @IsMongoId()
  facilityId?: string

  @IsOptional()
  @IsIn(['active', 'retired'])
  status?: 'active' | 'retired'

  @IsOptional()
  @IsIn(['regular', 'on_call_onsite', 'on_call_remote', 'off'])
  type?: 'regular' | 'on_call_onsite' | 'on_call_remote' | 'off'

  @IsOptional()
  @IsMongoId()
  unitId?: string

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
 * The fields a shift shares between creation and edit; the service checks the business rules.
 *
 * @property name - Name per language.
 * @property startTime - Local start `HH:mm`.
 * @property endTime - Local end `HH:mm`.
 * @property paidMinutes - Working time counted.
 * @property isNight - Whether it is a night shift.
 * @property unitIds - Units that may use it; empty means all.
 * @property reason - Why, kept in the change history.
 */
export class ShiftPartsDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => LocalizedTextDto)
  name?: LocalizedTextDto[]

  @IsOptional()
  @IsString()
  @MaxLength(16)
  startTime?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(16)
  endTime?: string | null

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  paidMinutes?: number

  @IsOptional()
  @IsBoolean()
  isNight?: boolean

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsMongoId({ each: true })
  unitIds?: string[]

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason?: string
}

/**
 * Body of `POST /v1/shift-definitions`.
 *
 * @property facilityId - Facility that defines the shift.
 * @property code - Shift code, for example `M`; the service allows 1 to 8 letters or digits.
 * @property type - Kind of shift.
 */
export class CreateShiftDto extends ShiftPartsDto {
  @IsMongoId()
  facilityId!: string

  @IsString()
  @MaxLength(32)
  code!: string

  @IsIn(['regular', 'on_call_onsite', 'on_call_remote', 'off'])
  type!: 'regular' | 'on_call_onsite' | 'on_call_remote' | 'off'
}

/**
 * Body of `PATCH /v1/shift-definitions/:id`.
 *
 * @property version - Version the client read.
 */
export class UpdateShiftDto extends ShiftPartsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  version?: number
}

/**
 * Body of `POST /v1/shift-definitions/:id/retire`.
 *
 * @property version - Version the client read.
 * @property reason - Why, kept in the change history.
 */
export class RetireShiftDto {
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
