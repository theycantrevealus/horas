import { Inject, Injectable } from '@nestjs/common'
import {
  RepositoryConflictError,
  RepositoryNotFoundError,
} from '@utility/database/error'
import { withChangeReason } from '@utility/history/reason'
import { AppLogger } from '@utility/logger/service'
import { isLocalDate } from '@utility/validation/local-date'
import {
  type HolidayCalendarQuery,
  type HolidayCalendarRepository,
} from '@repository/interface/holiday-calendar'
import { type LocalizedText } from '@repository/model/common/localized-text'
import {
  HolidayCalendar,
  type HolidayEntry,
} from '@repository/model/holiday-calendar'
import { REPOSITORY_HOLIDAY_CALENDAR } from '@repository/token'
import { observe } from '../observe'
import { normalizeLocalizedTexts } from '../structure/localized-texts'
import {
  ConflictError,
  InvalidRequestError,
  NotFoundError,
} from '../workforce.error'
import {
  compareHolidays,
  HOLIDAY_LIMITS,
  isCalendarYear,
  isCountryCode,
  isDateInYear,
  isHolidayKind,
  isSubdivisionCode,
  normalizeCalendarCode,
} from './holiday-rules'

const NAME = 'HolidayService'

/**
 * Filters of the calendar list.
 *
 * @property includeRemoved - Also return the holidays HR removed.
 */
export type HolidayCalendarListQuery = HolidayCalendarQuery & {
  includeRemoved?: boolean
}

/**
 * Data of a new calendar.
 *
 * @property code - Calendar code.
 * @property year - Calendar year.
 * @property country - ISO 3166-1 alpha-2 country.
 * @property subdivision - ISO 3166-2 code, or empty for a national calendar.
 * @property reason - Why, kept in the change history.
 */
export interface CreateCalendarInput {
  code: string
  year: number
  country: string
  subdivision?: string | null
  reason?: string
}

/**
 * Data of a holiday added by hand.
 *
 * @property date - The day, `YYYY-MM-DD`.
 * @property kind - Public holiday, collective leave or local holiday.
 * @property name - Name per language.
 * @property version - Version the caller read.
 * @property reason - Why, kept in the change history.
 */
export interface AddHolidayInput {
  date: string
  kind: HolidayEntry['kind']
  name: LocalizedText[]
  version?: number
  reason?: string
}

/**
 * Data of a holiday to remove.
 *
 * @property date - The day.
 * @property kind - The kind of the entry.
 * @property version - Version the caller read.
 * @property reason - Why, kept in the change history.
 */
export interface RemoveHolidayInput {
  date: string
  kind: HolidayEntry['kind']
  version?: number
  reason?: string
}

/**
 * The holiday calendars of a tenant (HR plan 5.2): list, create, and add or remove holidays by
 * hand. Nothing is deleted; a removed holiday stays in the calendar as `removed`. The code, the
 * year and the country never change.
 */
@Injectable()
export class HolidayService {
  /**
   * @param calendars - Holiday calendar repository.
   * @param logger - Logger of this service.
   */
  constructor(
    @Inject(REPOSITORY_HOLIDAY_CALENDAR)
    private readonly calendars: HolidayCalendarRepository,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /**
   * Lists the tenant's calendars with their holidays. Removed holidays are left out unless
   * `includeRemoved` is set. Writes no log entry (a read).
   *
   * @param tenantId - Tenant of the caller.
   * @param query - Optional filters and paging.
   * @returns The calendars.
   */
  async list(
    tenantId: string,
    query: HolidayCalendarListQuery,
  ): Promise<HolidayCalendar[]> {
    const { includeRemoved, ...filters } = query
    const found = await this.calendars.findByFilter(tenantId, filters)
    return includeRemoved
      ? found
      : found.map((calendar) =>
          this.withHolidays(
            calendar,
            calendar.holidays.filter((holiday) => holiday.status === 'active'),
          ),
        )
  }

  /**
   * Creates an empty calendar for a year (HR plan 5.2 HC1 to HC4).
   *
   * @param tenantId - Tenant of the caller.
   * @param input - The calendar.
   * @returns The created calendar.
   * @throws InvalidRequestError `invalid_code`, `invalid_year`, `invalid_country` or
   * `invalid_subdivision`.
   * @throws ConflictError `calendar_exists`.
   */
  create(tenantId: string, input: CreateCalendarInput): Promise<HolidayCalendar> {
    return observe(
      this.logger,
      'calendar_create',
      `${NAME}.create`,
      async () => {
        const code = normalizeCalendarCode(input.code ?? '')
        if (code === null) {
          throw new InvalidRequestError(
            'invalid_code',
            'The code must have 2 to 32 letters, digits or hyphens and start with a letter.',
          )
        }
        if (!isCalendarYear(input.year)) {
          throw new InvalidRequestError(
            'invalid_year',
            `The year must be a whole number from ${HOLIDAY_LIMITS.minYear} to ${HOLIDAY_LIMITS.maxYear}.`,
          )
        }
        if (!isCountryCode(input.country)) {
          throw new InvalidRequestError(
            'invalid_country',
            'The country must be two upper-case letters, for example ID.',
          )
        }
        const subdivision = input.subdivision ?? null
        if (subdivision !== null && !isSubdivisionCode(subdivision, input.country)) {
          throw new InvalidRequestError(
            'invalid_subdivision',
            'The subdivision must be a code of the country, for example ID-JK.',
          )
        }
        if (await this.calendars.findByCodeAndYear(tenantId, code, input.year)) {
          throw this.exists()
        }
        const write = (): Promise<HolidayCalendar> =>
          this.calendars.create({
            tenant_id: tenantId,
            code,
            year: input.year,
            country: input.country,
            subdivision,
            holidays: [],
            last_import_id: null,
          })
        try {
          return await (input.reason
            ? withChangeReason(input.reason, write)
            : write())
        } catch (error: unknown) {
          // Two requests with the same code and year at once: the unique index decided.
          throw error instanceof RepositoryConflictError ? this.exists() : error
        }
      },
    )
  }

  /**
   * Adds a holiday by hand. Adding over a removed day brings it back as a manual entry (HR plan
   * 5.2 HC5, HC6).
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Calendar identifier.
   * @param input - The holiday, optional version and reason.
   * @returns The updated calendar.
   * @throws NotFoundError `calendar_not_found`.
   * @throws InvalidRequestError `invalid_kind`, `invalid_date`, `date_outside_year`,
   * `invalid_name` or `too_many_holidays`.
   * @throws ConflictError `holiday_exists` or `stale_version`.
   */
  addHoliday(
    tenantId: string,
    id: string,
    input: AddHolidayInput,
  ): Promise<HolidayCalendar> {
    return observe(
      this.logger,
      'holiday_add',
      `${NAME}.addHoliday`,
      async () => {
        const calendar = await this.load(tenantId, id)
        this.checkDay(calendar, input.date, input.kind)
        const name = normalizeLocalizedTexts(input.name ?? [], {
          maxItems: HOLIDAY_LIMITS.nameItems,
          maxLength: HOLIDAY_LIMITS.nameLength,
        })
        if (name === null) {
          throw new InvalidRequestError(
            'invalid_name',
            'The name needs 1 to 10 texts of 1 to 200 characters, one per language.',
          )
        }
        this.assertVersion(calendar, input.version)
        const existing = calendar.holidays.find(
          (holiday) =>
            holiday.date === input.date && holiday.kind === input.kind,
        )
        if (existing?.status === 'active') {
          throw new ConflictError(
            'holiday_exists',
            'This day is already in the calendar with this kind.',
          )
        }
        if (!existing && calendar.holidays.length >= HOLIDAY_LIMITS.maxHolidays) {
          throw this.tooMany()
        }
        const added: HolidayEntry = {
          date: input.date,
          name,
          kind: input.kind,
          source: 'manual',
          status: 'active',
          import_id: null,
        }
        const holidays = [
          ...calendar.holidays.filter((holiday) => holiday !== existing),
          added,
        ].sort(compareHolidays)
        return this.write(input.reason, () =>
          this.calendars.update(
            calendar.id,
            { holidays },
            { expectedVersion: input.version },
          ),
        )
      },
    )
  }

  /**
   * Removes a holiday, imported or manual: the entry stays as `removed` (HR plan 5.2 HC7).
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Calendar identifier.
   * @param input - The day and kind, optional version and reason.
   * @returns The updated calendar.
   * @throws NotFoundError `calendar_not_found` or `holiday_not_found`.
   * @throws InvalidRequestError `invalid_kind`, `invalid_date` or `date_outside_year`.
   * @throws ConflictError `stale_version`.
   */
  removeHoliday(
    tenantId: string,
    id: string,
    input: RemoveHolidayInput,
  ): Promise<HolidayCalendar> {
    return observe(
      this.logger,
      'holiday_remove',
      `${NAME}.removeHoliday`,
      async () => {
        const calendar = await this.load(tenantId, id)
        this.checkDay(calendar, input.date, input.kind)
        const entry = calendar.holidays.find(
          (holiday) =>
            holiday.date === input.date &&
            holiday.kind === input.kind &&
            holiday.status === 'active',
        )
        if (!entry) {
          throw new NotFoundError(
            'holiday_not_found',
            'This day is not in the calendar.',
          )
        }
        this.assertVersion(calendar, input.version)
        const holidays = calendar.holidays.map((holiday) =>
          holiday === entry ? this.removed(holiday) : holiday,
        )
        return this.write(input.reason, () =>
          this.calendars.update(
            calendar.id,
            { holidays },
            { expectedVersion: input.version },
          ),
        )
      },
    )
  }

  /**
   * Checks the kind and the date of a holiday against the calendar.
   *
   * @param calendar - The calendar.
   * @param date - The day as sent.
   * @param kind - The kind as sent.
   * @throws InvalidRequestError `invalid_kind`, `invalid_date` or `date_outside_year`.
   */
  private checkDay(calendar: HolidayCalendar, date: string, kind: string): void {
    if (!isHolidayKind(kind)) {
      throw new InvalidRequestError(
        'invalid_kind',
        'The kind must be public, collective_leave or local.',
      )
    }
    if (!isLocalDate(date)) {
      throw new InvalidRequestError(
        'invalid_date',
        'The date must be a real day written as YYYY-MM-DD.',
      )
    }
    if (!isDateInYear(date, calendar.year)) {
      throw new InvalidRequestError(
        'date_outside_year',
        'The date must fall in the year of the calendar.',
      )
    }
  }

  /**
   * Copies a holiday as removed.
   *
   * @param holiday - The holiday.
   * @returns The same holiday with the status `removed`.
   */
  private removed(holiday: HolidayEntry): HolidayEntry {
    return {
      date: holiday.date,
      name: holiday.name,
      kind: holiday.kind,
      source: holiday.source,
      status: 'removed',
      import_id: holiday.import_id,
    }
  }

  /**
   * Copies a calendar with other holidays.
   *
   * @param calendar - The calendar.
   * @param holidays - The holidays to show.
   * @returns The calendar with those holidays.
   */
  private withHolidays(
    calendar: HolidayCalendar,
    holidays: HolidayEntry[],
  ): HolidayCalendar {
    return Object.assign(new HolidayCalendar(), calendar, { holidays })
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
      throw this.notFound()
    }
    return calendar
  }

  /**
   * Refuses a stale version before any write.
   *
   * @param calendar - The calendar as read.
   * @param version - Version the caller read.
   * @throws ConflictError `stale_version`.
   */
  private assertVersion(
    calendar: HolidayCalendar,
    version: number | undefined,
  ): void {
    if (version !== undefined && version !== calendar.version) {
      throw this.stale()
    }
  }

  /**
   * Runs a repository write, with the change reason when given, and turns repository rejections
   * into workforce errors.
   *
   * @param reason - Optional reason for the change history.
   * @param write - The repository call.
   * @returns What the call returns.
   */
  private async write(
    reason: string | undefined,
    write: () => Promise<HolidayCalendar>,
  ): Promise<HolidayCalendar> {
    try {
      return await (reason ? withChangeReason(reason, write) : write())
    } catch (error: unknown) {
      if (error instanceof RepositoryConflictError) {
        throw this.stale()
      }
      if (error instanceof RepositoryNotFoundError) {
        throw this.notFound()
      }
      throw error
    }
  }

  /**
   * @returns The not-found error for a calendar.
   */
  private notFound(): NotFoundError {
    return new NotFoundError(
      'calendar_not_found',
      'The calendar was not found.',
    )
  }

  /**
   * @returns The conflict for a second calendar with the same code and year.
   */
  private exists(): ConflictError {
    return new ConflictError(
      'calendar_exists',
      'A calendar with this code already exists for this year.',
    )
  }

  /**
   * @returns The rejection for a calendar that would hold too many holidays.
   */
  private tooMany(): InvalidRequestError {
    return new InvalidRequestError(
      'too_many_holidays',
      `A calendar holds at most ${HOLIDAY_LIMITS.maxHolidays} holidays.`,
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
