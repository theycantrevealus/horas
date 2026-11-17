import { CsvReadError, readCsv, type CsvTable } from '@utility/validation/csv'
import { InvalidRequestError } from '../workforce.error'

/**
 * Messages for the files that cannot be read at all.
 */
const READ_MESSAGES: Record<CsvReadError['code'], string> = {
  empty_file: 'The file is empty.',
  invalid_encoding: 'The file must be UTF-8 text.',
  invalid_csv:
    'The file is not a valid CSV: check the quotes and that every row has as many cells as the header.',
}

/**
 * Checks that a request body is text and reads it as a CSV table, with the rejections both
 * imports (holiday calendars and rosters) answer.
 *
 * @param content - The body of the request.
 * @returns The header and the data rows.
 * @throws InvalidRequestError `csv_required`, `empty_file`, `invalid_encoding` or `invalid_csv`.
 */
export function readCsvBody(content: unknown): CsvTable {
  if (typeof content !== 'string') {
    throw new InvalidRequestError(
      'csv_required',
      'Send the file as the request body with the content type text/csv.',
    )
  }
  try {
    return readCsv(content)
  } catch (error: unknown) {
    if (error instanceof CsvReadError) {
      throw new InvalidRequestError(error.code, READ_MESSAGES[error.code])
    }
    throw error
  }
}
