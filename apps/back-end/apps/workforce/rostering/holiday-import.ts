import { type CsvTable } from '@utility/validation/csv'
import { type HrImportError } from '@repository/model/hr-import'
import { type LocalizedText } from '@repository/model/common/localized-text'
import { type HolidayEntry } from '@repository/model/holiday-calendar'
import { LOCALE_PATTERN } from '../structure/localized-texts'
import { InvalidRequestError } from '../workforce.error'
import {
  compareHolidays,
  HOLIDAY_LIMITS,
  isDateInYear,
  isHolidayKind,
} from './holiday-rules'
import { isLocalDate } from '@utility/validation/local-date'

/**
 * One valid row of a holiday file.
 *
 * @property date - The day, `YYYY-MM-DD`.
 * @property kind - Public holiday, collective leave or local holiday.
 * @property name - The names of the row, one per language column that is filled.
 */
export interface ParsedHoliday {
  date: string
  kind: HolidayEntry['kind']
  name: LocalizedText[]
}

/**
 * What reading a holiday file found.
 *
 * @property rows - Data rows in the file.
 * @property holidays - The valid rows.
 * @property errors - Every row error found, as a position and a code (never a cell value).
 * @property invalidRows - Number of rows with at least one error.
 */
export interface ParsedHolidayFile {
  rows: number
  holidays: ParsedHoliday[]
  errors: HrImportError[]
  invalidRows: number
}

/**
 * Result of merging a file into a calendar (HR plan 5.2 HC12).
 *
 * @property holidays - The calendar's holidays after the merge, in date order.
 * @property created - Days added.
 * @property updated - Imported days whose names changed.
 * @property skipped - Days left as they were.
 */
export interface HolidayMerge {
  holidays: HolidayEntry[]
  created: number
  updated: number
  skipped: number
}

/**
 * Checks the header of a holiday file and finds its name columns (HR plan 5.2 HC8).
 *
 * @param header - The cells of the first row.
 * @returns The index of `date` and `kind` and the name columns with their language.
 * @throws InvalidRequestError `invalid_header` when a column is unknown or repeated, `date` or
 * `kind` is missing, or there is no `name_<locale>` column.
 */
function readHeader(header: string[]): {
  date: number
  kind: number
  names: { index: number; locale: string; column: string }[]
} {
  const lower = header.map((cell) => cell.toLowerCase())
  const date = lower.indexOf('date')
  const kind = lower.indexOf('kind')
  const names: { index: number; locale: string; column: string }[] = []
  const seen = new Set<string>()
  header.forEach((cell, index) => {
    const key = lower[index] ?? ''
    if (seen.has(key)) {
      throw invalidHeader()
    }
    seen.add(key)
    if (key === 'date' || key === 'kind') {
      return
    }
    const locale = key.startsWith('name_') ? cell.slice('name_'.length) : ''
    if (!LOCALE_PATTERN.test(locale)) {
      throw invalidHeader()
    }
    names.push({ index, locale, column: cell })
  })
  if (date < 0 || kind < 0 || names.length === 0) {
    throw invalidHeader()
  }
  return { date, kind, names }
}

/**
 * @returns The rejection for a file whose header is not the expected one.
 */
function invalidHeader(): InvalidRequestError {
  return new InvalidRequestError(
    'invalid_header',
    'The header must have date, kind and at least one name_<locale> column, such as name_id-ID, and nothing else.',
  )
}

/**
 * Reads the rows of a holiday file for a calendar year. Every row is checked and every problem is
 * reported by row number and column with a code, never with the cell text (HR plan 5.2 HC8, HC10).
 * Row numbers count the header as row 1, so the first data row is row 2.
 *
 * @param table - The file as a header and rows.
 * @param year - Year of the calendar the file goes into.
 * @returns The valid rows and the errors.
 * @throws InvalidRequestError `invalid_header` or `no_rows`.
 */
export function parseHolidayFile(
  table: CsvTable,
  year: number,
): ParsedHolidayFile {
  const columns = readHeader(table.header)
  if (table.rows.length === 0) {
    throw new InvalidRequestError('no_rows', 'The file has no holiday rows.')
  }
  const holidays: ParsedHoliday[] = []
  const errors: HrImportError[] = []
  const seen = new Set<string>()
  let invalidRows = 0
  table.rows.forEach((cells, position) => {
    const row = position + 2
    const found: HrImportError[] = []
    const date = cells[columns.date] ?? ''
    const kind = (cells[columns.kind] ?? '').toLowerCase()
    if (!isLocalDate(date)) {
      found.push({ row, column: 'date', code: 'invalid_date' })
    } else if (!isDateInYear(date, year)) {
      found.push({ row, column: 'date', code: 'date_outside_year' })
    }
    if (!isHolidayKind(kind)) {
      found.push({ row, column: 'kind', code: 'invalid_kind' })
    }
    const name: LocalizedText[] = []
    for (const column of columns.names) {
      const text = cells[column.index] ?? ''
      if (text === '') {
        continue
      }
      if (text.length > HOLIDAY_LIMITS.nameLength) {
        found.push({ row, column: column.column, code: 'invalid_name' })
      } else {
        name.push({ locale: column.locale, text })
      }
    }
    if (name.length === 0 && !found.some((item) => item.code === 'invalid_name')) {
      found.push({ row, column: null, code: 'missing_name' })
    }
    if (found.length === 0) {
      const key = `${date} ${kind}`
      if (seen.has(key)) {
        found.push({ row, column: 'date', code: 'duplicate_row' })
      } else {
        seen.add(key)
      }
    }
    if (found.length > 0) {
      invalidRows += 1
      errors.push(...found)
    } else {
      holidays.push({ date, kind: kind as HolidayEntry['kind'], name })
    }
  })
  return { rows: table.rows.length, holidays, errors, invalidRows }
}

/**
 * Tells whether two lists of names are the same, whatever their order.
 *
 * @param left - One list.
 * @param right - Another list.
 * @returns True when both hold the same languages with the same texts.
 */
function sameNames(left: LocalizedText[], right: LocalizedText[]): boolean {
  const key = (items: LocalizedText[]): string =>
    JSON.stringify(
      items
        .map(({ locale, text }) => [locale.toLowerCase(), text])
        .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
    )
  return key(left) === key(right)
}

/**
 * Merges the valid rows of a file into a calendar's holidays (HR plan 5.2 HC12). A new day is
 * added as imported. An imported active day gets the new names when they differ. A manual day and
 * a removed imported day are never touched, and the file never removes anything.
 *
 * @param existing - The calendar's holidays.
 * @param incoming - The valid rows of the file.
 * @param importId - The import that loads them.
 * @returns The holidays after the merge and the counts.
 */
export function mergeHolidays(
  existing: HolidayEntry[],
  incoming: ParsedHoliday[],
  importId: string,
): HolidayMerge {
  const holidays = [...existing]
  let created = 0
  let updated = 0
  let skipped = 0
  for (const row of incoming) {
    const index = holidays.findIndex(
      (holiday) => holiday.date === row.date && holiday.kind === row.kind,
    )
    const current = index < 0 ? undefined : holidays[index]
    if (current === undefined) {
      holidays.push({
        date: row.date,
        name: row.name,
        kind: row.kind,
        source: 'imported',
        status: 'active',
        import_id: importId,
      })
      created += 1
    } else if (
      current.source === 'imported' &&
      current.status === 'active' &&
      !sameNames(current.name, row.name)
    ) {
      holidays[index] = {
        date: current.date,
        name: row.name,
        kind: current.kind,
        source: 'imported',
        status: 'active',
        import_id: importId,
      }
      updated += 1
    } else {
      skipped += 1
    }
  }
  return { holidays: holidays.sort(compareHolidays), created, updated, skipped }
}
