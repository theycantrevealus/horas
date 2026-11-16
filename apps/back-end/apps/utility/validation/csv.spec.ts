import { CsvReadError, readCsv } from './csv'

/**
 * Captures the code of the error a call throws.
 *
 * @param work - The call.
 * @returns The code of the `CsvReadError`, or `undefined` when nothing was thrown.
 */
function codeOf(work: () => unknown): string | undefined {
  try {
    work()
  } catch (thrown: unknown) {
    expect(thrown).toBeInstanceOf(CsvReadError)
    return (thrown as CsvReadError).code
  }
  return undefined
}

describe('readCsv', () => {
  it('reads a header and trimmed rows', () => {
    expect(readCsv('date,kind,name_en\n2027-08-17, public ,Independence Day\n')).toEqual({
      header: ['date', 'kind', 'name_en'],
      rows: [['2027-08-17', 'public', 'Independence Day']],
    })
  })

  it('accepts a byte-order mark, Windows line ends and empty lines', () => {
    const table = readCsv('﻿date,kind\r\n\r\n2027-01-01,public\r\n\r\n2027-05-01,local\r\n')
    expect(table.header).toEqual(['date', 'kind'])
    expect(table.rows).toEqual([['2027-01-01', 'public'], ['2027-05-01', 'local']])
  })

  it('reads quoted cells with commas, quotes and line breaks', () => {
    const table = readCsv('date,name\n2027-01-01,"Tahun Baru, ""1 Januari""\nbaris dua"\n')
    expect(table.rows).toEqual([['2027-01-01', 'Tahun Baru, "1 Januari"\nbaris dua']])
  })

  it('returns no rows for a header only', () => {
    expect(readCsv('date,kind\n')).toEqual({ header: ['date', 'kind'], rows: [] })
  })

  it('refuses an empty text or an empty header', () => {
    expect(codeOf(() => readCsv(''))).toBe('empty_file')
    expect(codeOf(() => readCsv('\n\n'))).toBe('empty_file')
    expect(codeOf(() => readCsv(' , \n1,2\n'))).toBe('empty_file')
  })

  it('refuses text that is not valid UTF-8', () => {
    expect(codeOf(() => readCsv('date,kind\n2027-01-01,publi�c\n'))).toBe('invalid_encoding')
  })

  it('refuses a row with another number of cells, and quotes that never close', () => {
    expect(codeOf(() => readCsv('date,kind\n2027-01-01\n'))).toBe('invalid_csv')
    expect(codeOf(() => readCsv('date,kind\n2027-01-01,public,extra\n'))).toBe('invalid_csv')
    expect(codeOf(() => readCsv('date,kind\n"2027-01-01,public\n'))).toBe('invalid_csv')
  })

  it('never puts cell text in the error', () => {
    try {
      readCsv('date,kind\nRahasia\n')
    } catch (thrown: unknown) {
      expect(JSON.stringify(thrown) + String((thrown as Error).message)).not.toContain('Rahasia')
    }
  })
})
