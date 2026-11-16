import { type Repository } from '@utility/database/interface'
import { type HolidayCalendar } from '@repository/model/holiday-calendar'

/**
 * Filters and paging of the calendar list.
 *
 * @property code - Only this calendar code.
 * @property year - Only this year.
 * @property country - Only calendars of this country.
 * @property limit - Page size.
 * @property offset - Items to skip.
 */
export interface HolidayCalendarQuery {
  code?: string
  year?: number
  country?: string
  limit?: number
  offset?: number
}

/**
 * Persistence of holiday calendars, one document per tenant, code and year.
 */
export interface HolidayCalendarRepository extends Repository<HolidayCalendar> {
  /**
   * Finds the calendar of a code in a year.
   *
   * @param tenantId - Tenant to search in.
   * @param code - Calendar code.
   * @param year - Calendar year.
   * @returns The calendar, or `null` when there is none.
   */
  findByCodeAndYear(
    tenantId: string,
    code: string,
    year: number,
  ): Promise<HolidayCalendar | null>

  /**
   * Finds the tenant's calendars, ordered by code and then year, latest first.
   *
   * @param tenantId - Tenant to search in.
   * @param query - Optional filters and paging.
   * @returns The calendars, possibly none.
   */
  findByFilter(
    tenantId: string,
    query?: HolidayCalendarQuery,
  ): Promise<HolidayCalendar[]>
}
