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
} from 'class-validator'

/**
 * Turns the strings `true` and `false` of a query into booleans; other values pass through
 * unchanged so validation can refuse them.
 *
 * @param params - Value being transformed.
 * @param params.value - The raw value.
 * @returns The boolean, or the value unchanged.
 */
function toBoolean({ value }: { value: unknown }): unknown {
  if (value === 'true') {
    return true
  }
  return value === 'false' ? false : value
}

/**
 * Paging of a list: `limit` 1 to 100 and `offset` 0 or more.
 *
 * @property limit - Page size, 1 to 100.
 * @property offset - Records to skip.
 */
export class PagingDto {
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
 * Query of `GET /v1/clinical-appointments`.
 *
 * @property status - Only appointments in this status.
 * @property employeeId - Only the practitioner's appointments.
 * @property facilityId - Only appointments that cover this facility.
 * @property unitId - Only appointments that cover this unit.
 * @property expiringInDays - Only current appointments ending within this many days from today.
 */
export class ListAppointmentsDto extends PagingDto {
  @IsOptional()
  @IsIn(['active', 'suspended', 'revoked', 'expired', 'superseded'])
  status?: 'active' | 'suspended' | 'revoked' | 'expired' | 'superseded'

  @IsOptional()
  @IsMongoId()
  employeeId?: string

  @IsOptional()
  @IsMongoId()
  facilityId?: string

  @IsOptional()
  @IsMongoId()
  unitId?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3650)
  expiringInDays?: number
}

/**
 * Query of `GET /v1/privilege-grants`.
 *
 * @property catalogItemId - Only grants of this privilege.
 * @property employeeId - Only grants held by this practitioner.
 * @property status - Only grants in this status; `all` for every status. Default `active`.
 * @property condition - Only grants with this condition.
 * @property facilityId - Only grants that cover this facility.
 * @property unitId - Only grants that cover this unit.
 * @property flagged - `true`: only grants with an open flag; `false`: only grants without one.
 */
export class ListGrantsDto extends PagingDto {
  @IsOptional()
  @IsMongoId()
  catalogItemId?: string

  @IsOptional()
  @IsMongoId()
  employeeId?: string

  @IsOptional()
  @IsIn(['active', 'suspended', 'revoked', 'all'])
  status?: 'active' | 'suspended' | 'revoked' | 'all'

  @IsOptional()
  @IsIn(['full', 'supervised', 'restricted'])
  condition?: 'full' | 'supervised' | 'restricted'

  @IsOptional()
  @IsMongoId()
  facilityId?: string

  @IsOptional()
  @IsMongoId()
  unitId?: string

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  flagged?: boolean
}

/**
 * Body of the Director's decisions on an SPK or a grant: suspend, lift a suspension, revoke.
 *
 * @property reason - Why; the service allows 1 to 500 characters.
 * @property decisionNumber - The letter that records the decision; the service allows 1 to 64
 * characters.
 * @property version - Version the client read.
 */
export class StatusDecisionDto {
  @IsString()
  @MaxLength(5000)
  reason!: string

  @IsString()
  @MaxLength(200)
  decisionNumber!: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  version?: number
}
