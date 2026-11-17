import { IsMongoId, IsOptional } from 'class-validator'
import { IsLocalDate } from '@utility/validation/local-date'

/**
 * Query of `GET /v1/employees/:id/eligibility`.
 *
 * @property unitId - The unit to check (required).
 * @property date - The local date; today in the unit's facility zone when omitted.
 * @property privilegeId - The privilege (catalog item) to check as condition 5.
 */
export class EligibilityQueryDto {
  @IsMongoId()
  unitId!: string

  @IsOptional()
  @IsLocalDate()
  date?: string

  @IsOptional()
  @IsMongoId()
  privilegeId?: string
}
