import { type FieldClassification } from '@utility/history/record'
import { type HolidayCalendar } from './holiday-calendar'

/**
 * Sensitivity of `HolidayCalendar` fields for the change log. Holiday calendars are public.
 */
export const HolidayCalendarClassification: FieldClassification<HolidayCalendar> =
  {
    default: 'public',
    arrayKeys: {
      holidays: ['date', 'kind'],
    },
  }
