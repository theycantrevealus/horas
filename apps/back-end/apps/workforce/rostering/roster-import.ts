import { type CsvTable } from '@utility/validation/csv'
import { isLocalDate } from '@utility/validation/local-date'
import { type HrImportError } from '@repository/model/hr-import'
import { type RosterRole } from '@repository/model/roster-assignment'
import { InvalidRequestError } from '../workforce.error'
import { isRosterRole } from './roster-assignment-rules'
import { normalizeShiftCode } from './shift-rules'

/**
 * One row of a roster file whose cells are of the right form. Whether the employee, the shift and
 * the date exist or fit the roster is checked later against the records.
 *
 * @property row - Row number; the header is row 1.
 * @property employeeNumber - The employee's number.
 * @property date - The local date the shift starts.
 * @property shiftCode - The cleaned shift code.
 * @property role - Role in the shift.
 * @property overtimeConsent - The employee consents to overtime on this row.
 */
export interface ParsedRosterRow {
  row: number
  employeeNumber: string
  date: string
  shiftCode: string
  role: RosterRole
  overtimeConsent: boolean
}

/**
 * What reading a roster file found.
 *
 * @property rows - Data rows in the file.
 * @property parsed - The rows whose cells are of the right form.
 * @property errors - Every cell problem, as a position and a code (never a cell value).
 * @property invalidRows - Number of rows with at least one problem.
 */
export interface ParsedRosterFile {
  rows: number
  parsed: ParsedRosterRow[]
  errors: HrImportError[]
  invalidRows: number
}

/**
 * The most characters an employee number can have in a file.
 */
const MAX_NUMBER_LENGTH = 64

/**
 * Finds the columns of a roster file (HR plan 5.6 section 3).
 *
 * @param header - The cells of the first row.
 * @returns The index of each column; the optional ones are `-1` when missing.
 * @throws InvalidRequestError `invalid_header` when a column is unknown or repeated, or one of
 * `employee_number`, `date` and `shift_code` is missing.
 */
function readHeader(header: string[]): {
  employeeNumber: number
  date: number
  shiftCode: number
  role: number
  consent: number
} {
  const names = header.map((cell) => cell.toLowerCase())
  const known = ['employee_number', 'date', 'shift_code', 'role', 'overtime_consent']
  if (
    new Set(names).size !== names.length ||
    names.some((name) => !known.includes(name))
  ) {
    throw invalidHeader()
  }
  const find = (name: string): number => names.indexOf(name)
  const columns = {
    employeeNumber: find('employee_number'),
    date: find('date'),
    shiftCode: find('shift_code'),
    role: find('role'),
    consent: find('overtime_consent'),
  }
  if (columns.employeeNumber < 0 || columns.date < 0 || columns.shiftCode < 0) {
    throw invalidHeader()
  }
  return columns
}

/**
 * @returns The rejection for a file whose header is not the expected one.
 */
function invalidHeader(): InvalidRequestError {
  return new InvalidRequestError(
    'invalid_header',
    'The header must have employee_number, date and shift_code, and may have role and overtime_consent, and nothing else.',
  )
}

/**
 * Reads the rows of a roster file. Every cell is checked for its form and every problem is
 * reported by row number and column with a code, never with the cell text (HR plan 5.6 IM3, IM4).
 * Row numbers count the header as row 1, so the first data row is row 2.
 *
 * @param table - The file as a header and rows.
 * @returns The rows of the right form and the problems.
 * @throws InvalidRequestError `invalid_header` or `no_rows`.
 */
export function parseRosterFile(table: CsvTable): ParsedRosterFile {
  const columns = readHeader(table.header)
  if (table.rows.length === 0) {
    throw new InvalidRequestError('no_rows', 'The file has no assignment rows.')
  }
  const parsed: ParsedRosterRow[] = []
  const errors: HrImportError[] = []
  const seen = new Set<string>()
  let invalidRows = 0
  table.rows.forEach((cells, position) => {
    const row = position + 2
    const found: HrImportError[] = []
    const employeeNumber = cells[columns.employeeNumber] ?? ''
    const date = cells[columns.date] ?? ''
    const shiftCode = normalizeShiftCode(cells[columns.shiftCode] ?? '')
    const roleCell = columns.role < 0 ? '' : (cells[columns.role] ?? '').toLowerCase()
    const consentCell =
      columns.consent < 0 ? '' : (cells[columns.consent] ?? '').toLowerCase()
    if (employeeNumber === '' || employeeNumber.length > MAX_NUMBER_LENGTH) {
      found.push({ row, column: 'employee_number', code: 'invalid_employee_number' })
    }
    if (!isLocalDate(date)) {
      found.push({ row, column: 'date', code: 'invalid_date' })
    }
    if (shiftCode === null) {
      found.push({ row, column: 'shift_code', code: 'invalid_shift_code' })
    }
    const role = roleCell === '' ? 'staff' : roleCell
    if (!isRosterRole(role)) {
      found.push({ row, column: 'role', code: 'invalid_role' })
    }
    if (consentCell !== '' && consentCell !== 'yes' && consentCell !== 'no') {
      found.push({ row, column: 'overtime_consent', code: 'invalid_consent' })
    }
    if (found.length === 0) {
      const key = `${employeeNumber.toLowerCase()} ${date}`
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
      parsed.push({
        row,
        employeeNumber,
        date,
        shiftCode: shiftCode as string,
        role: role as RosterRole,
        overtimeConsent: consentCell === 'yes',
      })
    }
  })
  return { rows: table.rows.length, parsed, errors, invalidRows }
}
