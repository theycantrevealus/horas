import { Type } from 'class-transformer'
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

/**
 * Statuses a separation can be in, for the `status` filter.
 */
export const SEPARATION_STATUS_VALUES = [
  'planned',
  'completed',
  'cancelled',
] as const

/**
 * Body of `POST /v1/employees/:id/separations`.
 *
 * @property type - The separation type, a code of a separation type system.
 * @property lastWorkingDay - The last day the employee works.
 * @property noticeReceivedOn - When notice was given.
 * @property immediate - Completed when recorded; needs `workforce.separation:complete`.
 * @property reason - Why, 1 to 1000 characters.
 */
export class CreateSeparationDto {
  @ValidateNested()
  @Type(() => CodingDto)
  type!: CodingDto

  @IsLocalDate()
  lastWorkingDay!: string

  @IsOptional()
  @IsLocalDate()
  noticeReceivedOn?: string

  @IsOptional()
  @IsBoolean()
  immediate?: boolean

  @IsString()
  @MaxLength(4000)
  reason!: string
}

/**
 * Body of `PATCH /v1/separations/:id`.
 *
 * @property type - A new type.
 * @property lastWorkingDay - A new last working day.
 * @property noticeReceivedOn - A new notice date, or `null` to clear it.
 * @property reason - A new reason.
 * @property version - Version the caller read.
 */
export class UpdateSeparationDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => CodingDto)
  type?: CodingDto

  @IsOptional()
  @IsLocalDate()
  lastWorkingDay?: string

  @IsOptional()
  @IsLocalDate()
  noticeReceivedOn?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  reason?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version?: number
}

/**
 * Body of `POST /v1/separations/:id/cancel`.
 *
 * @property reason - Why, 1 to 500 characters.
 * @property version - Version the caller read.
 */
export class CancelSeparationDto {
  @IsString()
  @MaxLength(2000)
  reason!: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version?: number
}

/**
 * Body of `PUT /v1/separations/:id/checklist/:system/:code`.
 *
 * @property done - Whether the item is done.
 * @property version - Version the caller read.
 */
export class ChecklistItemDto {
  @IsBoolean()
  done!: boolean

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version?: number
}

/**
 * Filters and paging of `GET /v1/separations`.
 */
export class SeparationsQueryDto {
  @IsOptional()
  @IsIn(SEPARATION_STATUS_VALUES)
  status?: (typeof SEPARATION_STATUS_VALUES)[number]

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  typeCode?: string

  @IsOptional()
  @IsString()
  @MaxLength(64)
  unitId?: string

  @IsOptional()
  @IsString()
  @MaxLength(64)
  facilityId?: string

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
