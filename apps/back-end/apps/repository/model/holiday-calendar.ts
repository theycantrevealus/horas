import { type Entity } from '@utility/database/interface'
import { type ActorRef } from '@utility/history/actor'
import { type LocalDate } from './common/calendar'
import { type LocalizedText } from './common/localized-text'
import { Timestamp } from './timestamp'

/**
 * One day of a holiday calendar. Imported and HR-maintained days are combined; an entry is
 * identified by `date` and `kind` (decision C6).
 *
 * @property date - The day.
 * @property name - Name per language.
 * @property kind - Public holiday, collective leave (cuti bersama) or local holiday.
 * @property source - Loaded from an import or added by HR.
 * @property status - HR can remove an imported day; a later import does not bring it back.
 * @property import_id - Import that loaded it, or `null` for manual days.
 */
export interface HolidayEntry {
  date: LocalDate
  name: LocalizedText[]
  kind: 'public' | 'collective_leave' | 'local'
  source: 'imported' | 'manual'
  status: 'active' | 'removed'
  import_id: string | null
}

/**
 * Holidays of one calendar in one year, for coverage day patterns
 * (`human-resource-collections.md` 5.2).
 *
 * @property tenant_id - Tenant that owns the calendar; absent for platform calendars.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property code - Calendar code, for example `id-national` or `id-jk`.
 * @property year - Calendar year; unique with `code`.
 * @property country - ISO 3166-1 alpha-2 code.
 * @property subdivision - ISO 3166-2 code, or `null` for a national calendar.
 * @property holidays - The days.
 * @property last_import_id - Latest import that loaded this calendar, or `null`.
 * @property created_by - Who created the record.
 */
export class HolidayCalendar extends Timestamp implements Entity {
  id!: string
  tenant_id?: string
  schema_version!: number
  version!: number
  code!: string
  year!: number
  country!: string
  subdivision!: string | null
  holidays!: HolidayEntry[]
  last_import_id!: string | null
  created_by!: ActorRef
}
