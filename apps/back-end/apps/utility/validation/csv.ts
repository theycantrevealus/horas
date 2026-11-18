import { CsvError, parse } from 'csv-parse/sync'

/**
 * Why a CSV text could not be read at all.
 *
 * - `empty_file`: no header row.
 * - `invalid_encoding`: the text holds characters that are not valid UTF-8.
 * - `invalid_csv`: broken quotes, or a row with another number of cells than the header.
 */
export type CsvReadErrorCode = 'empty_file' | 'invalid_encoding' | 'invalid_csv'

/**
 * A CSV text that cannot be read. It carries a code and never part of the text, because cells can
 * hold personal data.
 */
export class CsvReadError extends Error {
  /**
   * @param code - Why the text cannot be read.
   */
  constructor(readonly code: CsvReadErrorCode) {
    super(code)
    this.name = 'CsvReadError'
  }
}

/**
 * A CSV text split into a header and rows of cells.
 *
 * @property header - The cells of the first row, trimmed.
 * @property rows - The data rows; every row has as many cells as the header, trimmed.
 */
export interface CsvTable {
  header: string[]
  rows: string[][]
}

/**
 * Reads a UTF-8 CSV text: comma separated, double quotes for cells with commas, quotes or line
 * breaks, a byte-order mark allowed, empty lines skipped. Every row must have as many cells as the
 * header.
 *
 * @param text - The file as text.
 * @returns The header and the data rows.
 * @throws CsvReadError `empty_file`, `invalid_encoding` or `invalid_csv`.
 */
export function readCsv(text: string): CsvTable {
  if (text.includes('�')) {
    throw new CsvReadError('invalid_encoding')
  }
  let records: string[][]
  try {
    records = parse(text, {
      bom: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: false,
    }) as string[][]
  } catch (error: unknown) {
    if (error instanceof CsvError) {
      throw new CsvReadError('invalid_csv')
    }
    throw error
  }
  const [header, ...rows] = records
  if (header === undefined || header.every((cell) => cell === '')) {
    throw new CsvReadError('empty_file')
  }
  return { header, rows }
}
