import { createHash } from 'node:crypto'
import { Inject, Injectable } from '@nestjs/common'
import {
  RepositoryConflictError,
  RepositoryNotFoundError,
} from '@utility/database/error'
import {
  TRANSACTION_MANAGER,
  type TransactionManager,
} from '@utility/database/transaction'
import { type ActorRef } from '@utility/history/actor'
import { withChangeReason } from '@utility/history/reason'
import { getRequestContext } from '@utility/logger/context'
import { AppLogger } from '@utility/logger/service'
import { CsvReadError, readCsv } from '@utility/validation/csv'
import { type HolidayCalendarRepository } from '@repository/interface/holiday-calendar'
import { type HrImportRepository } from '@repository/interface/hr-import'
import { type HolidayCalendar } from '@repository/model/holiday-calendar'
import { type HrImport } from '@repository/model/hr-import'
import {
  REPOSITORY_HOLIDAY_CALENDAR,
  REPOSITORY_HR_IMPORT,
} from '@repository/token'
import { observe } from '../observe'
import { ParameterService } from '../parameter/parameter.service'
import {
  ConflictError,
  ForbiddenError,
  InvalidRequestError,
  NotFoundError,
} from '../workforce.error'
import {
  mergeHolidays,
  parseHolidayFile,
  type HolidayMerge,
  type ParsedHolidayFile,
} from './holiday-import'
import { HOLIDAY_LIMITS } from './holiday-rules'

const NAME = 'HolidayImportService'

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
 * Data of a holiday import.
 *
 * @property content - The CSV text of the request body.
 * @property apply - False or missing checks the file; true applies a file that was checked.
 * @property checkId - The `validated` import that checked this same file (needed to apply).
 * @property version - Version of the calendar the caller read (applying only).
 * @property reason - Why, kept in the change history (applying only).
 */
export interface ImportHolidaysInput {
  content: unknown
  apply?: boolean
  checkId?: string
  version?: number
  reason?: string
}

/**
 * What reading the file found, with the limits that applied.
 *
 * @property sha256 - SHA-256 of the file.
 * @property parsed - The rows and their errors.
 */
interface FileAnalysis {
  sha256: string
  parsed: ParsedHolidayFile
  maxErrors: number
}

/**
 * The CSV import of holiday calendars (HR plan 5.2 HC8 to HC14). A check reads the whole file and
 * records the result without touching the calendar. Applying needs a check of the same file: the
 * client sends the file again with the check's id, because no file is stored (HR plan D3), and the
 * service compares the hashes.
 */
@Injectable()
export class HolidayImportService {
  /**
   * @param calendars - Holiday calendar repository.
   * @param imports - HR import repository.
   * @param parameters - HR parameters, for the import limits.
   * @param transactions - Transaction manager of the main connection.
   * @param logger - Logger of this service.
   */
  constructor(
    @Inject(REPOSITORY_HOLIDAY_CALENDAR)
    private readonly calendars: HolidayCalendarRepository,
    @Inject(REPOSITORY_HR_IMPORT)
    private readonly imports: HrImportRepository,
    @Inject(ParameterService) private readonly parameters: ParameterService,
    @Inject(TRANSACTION_MANAGER)
    private readonly transactions: TransactionManager,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /**
   * Checks a holiday file, or applies a file that was checked.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Calendar identifier.
   * @param input - The file and what to do with it.
   * @returns The import record, with its counts and row errors.
   * @throws NotFoundError `calendar_not_found`.
   * @throws InvalidRequestError `csv_required`, `empty_file`, `invalid_encoding`, `invalid_csv`,
   * `invalid_header`, `no_rows`, `too_many_rows`, `too_many_holidays`, `check_required` or
   * `check_not_valid` and `check_mismatch` when applying.
   * @throws ConflictError `import_already_applied` or `stale_version`.
   * @throws ForbiddenError `actor_required`.
   */
  importFile(
    tenantId: string,
    id: string,
    input: ImportHolidaysInput,
  ): Promise<HrImport> {
    const apply = input.apply === true
    return observe(
      this.logger,
      apply ? 'holiday_import_apply' : 'holiday_import_check',
      `${NAME}.${apply ? 'apply' : 'check'}`,
      async () => {
        const calendar = await this.load(tenantId, id)
        const analysis = await this.analyze(tenantId, calendar, input.content)
        return apply
          ? this.apply(tenantId, calendar, analysis, input)
          : this.check(tenantId, calendar, analysis, input.reason)
      },
      'log',
      (result) => ({
        status: result.status,
        rows: result.counts.rows,
        invalid: result.counts.invalid,
        created: result.counts.created,
        updated: result.counts.updated,
        skipped: result.counts.skipped,
      }),
    )
  }

  /**
   * Reads and checks the file text: the limits, the CSV, the header and every row.
   *
   * @param tenantId - Tenant of the caller.
   * @param calendar - The calendar the file goes into.
   * @param content - The body of the request.
   * @returns The hash of the file, its rows and the error limit.
   * @throws InvalidRequestError `csv_required`, `empty_file`, `invalid_encoding`, `invalid_csv`,
   * `invalid_header`, `no_rows` or `too_many_rows`.
   */
  private async analyze(
    tenantId: string,
    calendar: HolidayCalendar,
    content: unknown,
  ): Promise<FileAnalysis> {
    if (typeof content !== 'string') {
      throw new InvalidRequestError(
        'csv_required',
        'Send the file as the request body with the content type text/csv.',
      )
    }
    const maxRows = Number(
      (await this.parameters.resolve(tenantId, { key: 'IMPORT_MAX_ROWS' })).value,
    )
    const maxErrors = Number(
      (await this.parameters.resolve(tenantId, { key: 'IMPORT_MAX_ERRORS' }))
        .value,
    )
    let table: ReturnType<typeof readCsv>
    try {
      table = readCsv(content)
    } catch (error: unknown) {
      if (error instanceof CsvReadError) {
        throw new InvalidRequestError(error.code, READ_MESSAGES[error.code])
      }
      throw error
    }
    if (table.rows.length > maxRows) {
      throw new InvalidRequestError(
        'too_many_rows',
        `The file has more than ${maxRows} rows.`,
      )
    }
    return {
      sha256: createHash('sha256').update(content, 'utf8').digest('hex'),
      parsed: parseHolidayFile(table, calendar.year),
      maxErrors,
    }
  }

  /**
   * Records the check of a file. The calendar is not changed (HR plan 5.2 HC10).
   *
   * @param tenantId - Tenant of the caller.
   * @param calendar - The calendar the file goes into.
   * @param analysis - What reading the file found.
   * @param reason - Optional reason for the change history.
   * @returns The recorded import, `validated` or `invalid`.
   */
  private async check(
    tenantId: string,
    calendar: HolidayCalendar,
    analysis: FileAnalysis,
    reason: string | undefined,
  ): Promise<HrImport> {
    const { parsed } = analysis
    const valid = parsed.errors.length === 0
    const merge = valid
      ? this.merge(calendar, parsed, 'preview')
      : { created: 0, updated: 0, skipped: 0 }
    const actor = this.actor()
    const write = (): Promise<HrImport> =>
      this.imports.create({
        tenant_id: tenantId,
        kind: 'holiday_calendar',
        target: { calendar_code: calendar.code, year: calendar.year },
        file: {
          file_id: `inline:${analysis.sha256.slice(0, 16)}`,
          content_type: 'text/csv',
          sha256: analysis.sha256,
        },
        status: valid ? 'validated' : 'invalid',
        counts: {
          rows: parsed.rows,
          valid: parsed.holidays.length,
          invalid: parsed.invalidRows,
          created: merge.created,
          updated: merge.updated,
          skipped: merge.skipped,
        },
        errors: parsed.errors.slice(0, analysis.maxErrors),
        uploaded: { by: actor, at: new Date() },
        applied: null,
        failure: null,
      })
    return reason ? withChangeReason(reason, write) : write()
  }

  /**
   * Applies a file that was checked: the merge, the calendar and the import record change in one
   * transaction (HR plan 5.2 HC11 to HC13).
   *
   * @param tenantId - Tenant of the caller.
   * @param calendar - The calendar the file goes into.
   * @param analysis - What reading the file found.
   * @param input - Check id, version and reason.
   * @returns The applied import.
   */
  private async apply(
    tenantId: string,
    calendar: HolidayCalendar,
    analysis: FileAnalysis,
    input: ImportHolidaysInput,
  ): Promise<HrImport> {
    if (!input.checkId) {
      throw new InvalidRequestError(
        'check_required',
        'Applying needs the id of the check of this same file.',
      )
    }
    const check = await this.imports.findOne(input.checkId)
    if (
      !check ||
      check.tenant_id !== tenantId ||
      check.deleted_at ||
      check.kind !== 'holiday_calendar' ||
      !('calendar_code' in check.target) ||
      check.target.calendar_code !== calendar.code ||
      check.target.year !== calendar.year ||
      check.status !== 'validated'
    ) {
      throw new InvalidRequestError(
        'check_not_valid',
        'The check was not found for this calendar, or it was not valid or was already applied.',
      )
    }
    if (check.file.sha256 !== analysis.sha256) {
      throw new InvalidRequestError(
        'check_mismatch',
        'The file is not the one that was checked.',
      )
    }
    const earlier = await this.imports.findByFilter(tenantId, {
      kind: 'holiday_calendar',
      calendarCode: calendar.code,
      year: calendar.year,
      status: 'applied',
      sha256: analysis.sha256,
      limit: 1,
    })
    if (earlier.length > 0) {
      throw this.alreadyApplied()
    }
    if (analysis.parsed.errors.length > 0) {
      throw new InvalidRequestError(
        'check_not_valid',
        'The check was not valid.',
      )
    }
    if (input.version !== undefined && input.version !== calendar.version) {
      throw this.stale()
    }
    const merged = this.merge(calendar, analysis.parsed, check.id)
    const actor = this.actor()
    const write = (): Promise<HrImport> =>
      this.transactions.run(async () => {
        try {
          await this.calendars.update(
            calendar.id,
            { holidays: merged.holidays, last_import_id: check.id },
            { expectedVersion: calendar.version },
          )
        } catch (error: unknown) {
          throw this.translate(error)
        }
        try {
          return await this.imports.update(
            check.id,
            {
              status: 'applied',
              counts: {
                rows: analysis.parsed.rows,
                valid: analysis.parsed.holidays.length,
                invalid: 0,
                created: merged.created,
                updated: merged.updated,
                skipped: merged.skipped,
              },
              applied: { by: actor, at: new Date() },
            },
            { expectedVersion: check.version },
          )
        } catch (error: unknown) {
          throw error instanceof RepositoryConflictError
            ? this.alreadyApplied()
            : this.translate(error)
        }
      })
    return input.reason ? withChangeReason(input.reason, write) : write()
  }

  /**
   * Merges the valid rows into the calendar and checks that it still fits (HR plan 5.2 HC12).
   *
   * @param calendar - The calendar.
   * @param parsed - The rows of the file.
   * @param importId - The import that loads them.
   * @returns The merge.
   * @throws InvalidRequestError `too_many_holidays`.
   */
  private merge(
    calendar: HolidayCalendar,
    parsed: ParsedHolidayFile,
    importId: string,
  ): HolidayMerge {
    const merged = mergeHolidays(calendar.holidays, parsed.holidays, importId)
    if (merged.holidays.length > HOLIDAY_LIMITS.maxHolidays) {
      throw new InvalidRequestError(
        'too_many_holidays',
        `A calendar holds at most ${HOLIDAY_LIMITS.maxHolidays} holidays.`,
      )
    }
    return merged
  }

  /**
   * @returns The signed-in actor.
   * @throws ForbiddenError `actor_required`.
   */
  private actor(): ActorRef {
    const actor = getRequestContext()?.actor
    if (!actor) {
      throw new ForbiddenError(
        'actor_required',
        'A signed-in actor is required.',
      )
    }
    return actor
  }

  /**
   * Loads a calendar of the caller's tenant. A platform calendar (no tenant) counts as missing.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Calendar identifier.
   * @returns The calendar.
   * @throws NotFoundError `calendar_not_found`.
   */
  private async load(tenantId: string, id: string): Promise<HolidayCalendar> {
    const calendar = await this.calendars.findOne(id)
    if (!calendar || calendar.tenant_id !== tenantId || calendar.deleted_at) {
      throw new NotFoundError(
        'calendar_not_found',
        'The calendar was not found.',
      )
    }
    return calendar
  }

  /**
   * Turns a repository rejection of the calendar write into a workforce error.
   *
   * @param error - What the repository threw.
   * @returns The error to throw instead.
   */
  private translate(error: unknown): unknown {
    if (error instanceof RepositoryConflictError) {
      return this.stale()
    }
    if (error instanceof RepositoryNotFoundError) {
      return new NotFoundError(
        'calendar_not_found',
        'The calendar was not found.',
      )
    }
    return error
  }

  /**
   * @returns The conflict for a file that was applied before.
   */
  private alreadyApplied(): ConflictError {
    return new ConflictError(
      'import_already_applied',
      'This file was already applied to this calendar.',
    )
  }

  /**
   * @returns The conflict for a stale version.
   */
  private stale(): ConflictError {
    return new ConflictError(
      'stale_version',
      'The calendar was changed by someone else. Reload it and try again.',
    )
  }
}
