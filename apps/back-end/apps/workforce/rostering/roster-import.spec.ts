import { parseRosterFile } from './roster-import'

/**
 * Builds a table from a header and rows.
 *
 * @param header - Header cells.
 * @param rows - Data rows.
 * @returns The table.
 */
function table(header: string[], ...rows: string[][]) {
  return { header, rows }
}

/**
 * Captures the code of the rejection of a call.
 *
 * @param work - The call.
 * @returns The `code` of the thrown error.
 */
function codeOf(work: () => unknown): string | undefined {
  try {
    work()
  } catch (thrown: unknown) {
    return (thrown as { code?: string }).code
  }
  return undefined
}

const header = ['employee_number', 'date', 'shift_code', 'role', 'overtime_consent']

describe('parseRosterFile', () => {
  it('reads valid rows, cleaning the shift code and defaulting the role and the consent', () => {
    const parsed = parseRosterFile(
      table(header, ['E001', '2099-03-02', ' p ', '', ''], ['E002', '2099-03-02', 'M', 'Team_Leader', 'YES'], ['E003', '2099-03-03', 'L', 'staff', 'no']),
    )

    expect(parsed).toMatchObject({ rows: 3, invalidRows: 0, errors: [] })
    expect(parsed.parsed).toEqual([
      { row: 2, employeeNumber: 'E001', date: '2099-03-02', shiftCode: 'P', role: 'staff', overtimeConsent: false },
      { row: 3, employeeNumber: 'E002', date: '2099-03-02', shiftCode: 'M', role: 'team_leader', overtimeConsent: true },
      { row: 4, employeeNumber: 'E003', date: '2099-03-03', shiftCode: 'L', role: 'staff', overtimeConsent: false },
    ])
  })

  it('accepts only the three required columns, in any order and any case', () => {
    const parsed = parseRosterFile(table(['Shift_Code', 'DATE', 'Employee_Number'], ['P', '2099-03-02', 'E001']))
    expect(parsed.parsed).toEqual([{ row: 2, employeeNumber: 'E001', date: '2099-03-02', shiftCode: 'P', role: 'staff', overtimeConsent: false }])
  })

  it('reports every cell problem by row and column with a code, never with the cell text', () => {
    const parsed = parseRosterFile(
      table(
        header,
        ['', '2099-03-02', 'P', '', ''],
        ['Rahasia1', '2099-02-30', 'P', '', ''],
        ['Rahasia2', '2099-03-02', 'TOOLONGCODE', '', ''],
        ['Rahasia3', '2099-03-02', 'P', 'boss', ''],
        ['Rahasia4', '2099-03-02', 'P', '', 'maybe'],
        ['Rahasia5', '2099-03-05', 'P', '', ''],
        ['rahasia5', '2099-03-05', 'M', '', ''],
        ['x'.repeat(65), 'soon', '', 'boss', 'maybe'],
      ),
    )

    expect(parsed.rows).toBe(8)
    expect(parsed.parsed).toHaveLength(1)
    expect(parsed.invalidRows).toBe(7)
    expect(parsed.errors).toEqual([
      { row: 2, column: 'employee_number', code: 'invalid_employee_number' },
      { row: 3, column: 'date', code: 'invalid_date' },
      { row: 4, column: 'shift_code', code: 'invalid_shift_code' },
      { row: 5, column: 'role', code: 'invalid_role' },
      { row: 6, column: 'overtime_consent', code: 'invalid_consent' },
      { row: 8, column: 'date', code: 'duplicate_row' },
      { row: 9, column: 'employee_number', code: 'invalid_employee_number' },
      { row: 9, column: 'date', code: 'invalid_date' },
      { row: 9, column: 'shift_code', code: 'invalid_shift_code' },
      { row: 9, column: 'role', code: 'invalid_role' },
      { row: 9, column: 'overtime_consent', code: 'invalid_consent' },
    ])
    expect(JSON.stringify(parsed.errors)).not.toContain('Rahasia')
  })

  it('refuses a header that lacks a required column, or has another or repeated one', () => {
    for (const bad of [
      ['date', 'shift_code'],
      ['employee_number', 'shift_code'],
      ['employee_number', 'date'],
      ['employee_number', 'date', 'shift_code', 'note'],
      ['employee_number', 'date', 'shift_code', 'Date'],
    ]) {
      expect(codeOf(() => parseRosterFile(table(bad, bad.map(() => 'x'))))).toBe('invalid_header')
    }
  })

  it('refuses a file without rows', () => {
    expect(codeOf(() => parseRosterFile(table(header)))).toBe('no_rows')
  })
})
