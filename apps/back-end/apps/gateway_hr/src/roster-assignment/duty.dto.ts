import { IsISO8601, IsOptional } from 'class-validator'
import { IsLocalDate } from '@utility/validation/local-date'

/**
 * Query of `GET /v1/units/:id/on-duty`.
 *
 * @property at - The moment, an ISO 8601 date and time with a zone; now when missing.
 */
export class OnDutyDto {
  @IsOptional()
  @IsISO8601({ strict: true })
  at?: string
}

/**
 * Query of `GET /v1/employees/me/roster`.
 *
 * @property from - First day, `YYYY-MM-DD`.
 * @property to - Last day, `YYYY-MM-DD`; at most 62 days after the first.
 */
export class MyRosterDto {
  @IsLocalDate()
  from!: string

  @IsLocalDate()
  to!: string
}
