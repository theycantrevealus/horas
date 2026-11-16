import { Types } from 'mongoose'
import { runWithRequestContext } from '@utility/logger/context'
import { type AppLogger } from '@utility/logger/service'
import { type HolidayCalendar } from '@repository/model/holiday-calendar'
import { type ParameterService } from '../parameter/parameter.service'
import { InMemoryHolidayCalendars, InMemoryHrImports } from '../testing/in-memory'
import { HolidayImportService } from './holiday-import.service'

describe('HolidayImportService', () => {
  const tenantId = new Types.ObjectId().toHexString()
  const otherTenantId = new Types.ObjectId().toHexString()
  const log = vi.fn()
  const warn = vi.fn()
  const error = vi.fn()
  const debug = vi.fn()
  let calendars: InMemoryHolidayCalendars
  let imports: InMemoryHrImports
  let service: HolidayImportService
  let limits: { rows: number; errors: number }
  let calendar: HolidayCalendar

  const header = 'date,kind,name_id-ID,name_en'
  const good = `${header}\n2027-08-17,public,Hari Kemerdekaan,Independence Day\n2027-12-24,collective_leave,Cuti Bersama,\n`

  /**
   * Runs `work` as a signed-in request.
   *
   * @param work - Code to run.
   * @returns What `work` returns.
   */
  function asAdmin<T>(work: () => Promise<T>): Promise<T> {
    return runWithRequestContext(
      {
        correlationId: 'c1',
        actor: { account_id: 'a1', display_name: 'Admin', kind: 'account' },
      },
      work,
    )
  }

  /**
   * Checks a file as the admin.
   *
   * @param content - The CSV text.
   * @param id - Calendar identifier; the main calendar by default.
   * @returns The import record.
   */
  function check(content: unknown, id = calendar.id) {
    return asAdmin(() => service.importFile(tenantId, id, { content }))
  }

  /**
   * Applies a file as the admin.
   *
   * @param content - The CSV text.
   * @param checkId - The check of the file.
   * @param extra - More input, such as a version.
   * @returns The import record.
   */
  function apply(content: unknown, checkId: string | undefined, extra: object = {}) {
    return asAdmin(() => service.importFile(tenantId, calendar.id, { content, apply: true, checkId, ...extra }))
  }

  /**
   * Captures the rejection of a call.
   *
   * @param work - The call.
   * @returns The thrown error.
   */
  async function rejection(work: () => Promise<unknown>) {
    try {
      await work()
    } catch (thrown: unknown) {
      return thrown
    }
    return undefined
  }

  /**
   * Stores a calendar directly.
   *
   * @param override - Fields that replace the defaults.
   * @returns The calendar.
   */
  function store(override: Partial<HolidayCalendar> = {}) {
    return asAdmin(() =>
      calendars.create({
        tenant_id: tenantId,
        code: 'id-national',
        year: 2027,
        country: 'ID',
        subdivision: null,
        holidays: [],
        last_import_id: null,
        ...override,
      }),
    )
  }

  beforeEach(async () => {
    vi.resetAllMocks()
    limits = { rows: 5000, errors: 500 }
    calendars = new InMemoryHolidayCalendars()
    imports = new InMemoryHrImports()
    const parameters = {
      resolve: async (_tenant: string, { key }: { key: string }) => ({
        value: key === 'IMPORT_MAX_ROWS' ? limits.rows : limits.errors,
      }),
    } as unknown as ParameterService
    const logger = { log, warn, error, debug } as unknown as AppLogger
    service = new HolidayImportService(
      calendars,
      imports,
      parameters,
      { run: (work: () => Promise<unknown>) => work() } as never,
      logger,
    )
    calendar = await store()
  })

  describe('check', () => {
    it('records a validated import with its counts and the file hash, leaves the calendar alone, and writes one log entry without values', async () => {
      const result = await check(good)

      expect(result).toMatchObject({
        tenant_id: tenantId,
        kind: 'holiday_calendar',
        target: { calendar_code: 'id-national', year: 2027 },
        file: { content_type: 'text/csv' },
        status: 'validated',
        counts: { rows: 2, valid: 2, invalid: 0, created: 2, updated: 0, skipped: 0 },
        errors: [],
        applied: null,
        failure: null,
      })
      expect(result.file.sha256).toMatch(/^[0-9a-f]{64}$/)
      expect(result.file.file_id).toBe(`inline:${result.file.sha256.slice(0, 16)}`)
      expect(result.uploaded.by).toMatchObject({ account_id: 'a1' })
      expect((await calendars.findOne(calendar.id))?.holidays).toEqual([])
      expect(log).toHaveBeenCalledTimes(1)
      expect(log.mock.calls[0]?.[0]).toMatchObject({
        event: 'holiday_import_check',
        outcome: 'success',
        status: 'validated',
        rows: 2,
        created: 2,
      })
      const written = JSON.stringify([log.mock.calls, warn.mock.calls, error.mock.calls])
      for (const text of ['Hari Kemerdekaan', '2027-08-17', 'Cuti Bersama']) {
        expect(written).not.toContain(text)
      }
    })

    it('previews what an apply would do against the current calendar', async () => {
      const existing = await store({
        code: 'preview',
        holidays: [
          { date: '2027-08-17', name: [{ locale: 'id-ID', text: 'Lama' }], kind: 'public', source: 'imported', status: 'active', import_id: new Types.ObjectId().toHexString() },
          { date: '2027-12-24', name: [{ locale: 'id-ID', text: 'Saya' }], kind: 'collective_leave', source: 'manual', status: 'active', import_id: null },
        ],
      })

      const result = await check(good, existing.id)

      expect(result.counts).toMatchObject({ created: 0, updated: 1, skipped: 1 })
    })

    it('records an invalid import with row errors as codes, and zero created, updated and skipped', async () => {
      const result = await check(`${header}\n2027-02-30,public,Rahasia,\n2027-08-17,public,Benar,\n`)

      expect(result).toMatchObject({
        status: 'invalid',
        counts: { rows: 2, valid: 1, invalid: 1, created: 0, updated: 0, skipped: 0 },
        errors: [{ row: 2, column: 'date', code: 'invalid_date' }],
      })
      expect(JSON.stringify(result)).not.toContain('Rahasia')
      expect((await calendars.findOne(calendar.id))?.holidays).toEqual([])
    })

    it('keeps at most IMPORT_MAX_ERRORS row errors, and counts every invalid row', async () => {
      limits.errors = 2
      const rows = Array.from({ length: 5 }, () => 'bad,public,x,').join('\n')

      const result = await check(`${header}\n${rows}\n`)

      expect(result.errors).toHaveLength(2)
      expect(result.counts.invalid).toBe(5)
    })

    it.each([
      ['csv_required', { not: 'text' }],
      ['csv_required', undefined],
      ['empty_file', ''],
      ['invalid_encoding', `${header}\n2027-01-01,public,Ta�hun,\n`],
      ['invalid_csv', `${header}\n2027-01-01,public\n`],
      ['invalid_header', 'date,kind\n2027-01-01,public\n'],
      ['invalid_header', 'date,kind,name_en,extra\n2027-01-01,public,A,B\n'],
      ['no_rows', `${header}\n`],
    ])('refuses an unreadable file with %s and records nothing', async (code, content) => {
      expect(await rejection(() => check(content))).toMatchObject({ code })
      expect(await imports.findByFilter(tenantId)).toEqual([])
      expect(warn.mock.calls[0]?.[0]).toMatchObject({ event: 'holiday_import_check', outcome: 'failure', code })
    })

    it('refuses a file with more rows than IMPORT_MAX_ROWS', async () => {
      limits.rows = 2
      const rows = ['2027-01-01', '2027-01-02', '2027-01-03'].map((date) => `${date},public,A,`).join('\n')

      expect(await rejection(() => check(`${header}\n${rows}\n`))).toMatchObject({ code: 'too_many_rows' })
      expect(await imports.findByFilter(tenantId)).toEqual([])
    })

    it('refuses a file that would take the calendar over 400 holidays', async () => {
      const days = Array.from({ length: 365 }, (_, index) => new Date(Date.UTC(2027, 0, 1 + index)).toISOString().slice(0, 10))
      const locals = Array.from({ length: 40 }, (_, index) => ({
        date: days[index] ?? '',
        name: [{ locale: 'en', text: 'L' }],
        kind: 'local' as const,
        source: 'manual' as const,
        status: 'active' as const,
        import_id: null,
      }))
      const full = await store({ code: 'full', holidays: locals })
      const rows = days.map((date) => `${date},public,P,`).join('\n')

      expect(await rejection(() => check(`${header}\n${rows}\n`, full.id))).toMatchObject({ code: 'too_many_holidays' })
      expect(await imports.findByFilter(tenantId)).toEqual([])
    })

    it('answers not found for a missing, foreign, malformed or platform calendar', async () => {
      const foreign = await store({ tenant_id: otherTenantId, code: 'other' })
      const platform = await asAdmin(() => calendars.create({ code: 'platform', year: 2027, country: 'ID', subdivision: null, holidays: [], last_import_id: null }))

      for (const id of [foreign.id, platform.id, new Types.ObjectId().toHexString(), 'bad']) {
        expect(await rejection(() => check(good, id))).toMatchObject({ code: 'calendar_not_found' })
      }
      expect(await imports.findByFilter(tenantId)).toEqual([])
    })

    it('refuses to record without an acting account', async () => {
      expect(await rejection(() => service.importFile(tenantId, calendar.id, { content: good }))).toMatchObject({ code: 'actor_required' })
    })
  })

  describe('apply', () => {
    it('merges the checked file, marks the import applied, sets last_import_id and writes one log entry without values', async () => {
      const checked = await check(good)

      const applied = await apply(good, checked.id, { reason: 'Alasan Rahasia' })

      expect(applied).toMatchObject({
        id: checked.id,
        status: 'applied',
        counts: { rows: 2, valid: 2, invalid: 0, created: 2, updated: 0, skipped: 0 },
      })
      expect(applied.applied?.by).toMatchObject({ account_id: 'a1' })
      const stored = await calendars.findOne(calendar.id)
      expect(stored?.last_import_id).toBe(checked.id)
      expect(stored?.holidays).toEqual([
        { date: '2027-08-17', name: [{ locale: 'id-ID', text: 'Hari Kemerdekaan' }, { locale: 'en', text: 'Independence Day' }], kind: 'public', source: 'imported', status: 'active', import_id: checked.id },
        { date: '2027-12-24', name: [{ locale: 'id-ID', text: 'Cuti Bersama' }], kind: 'collective_leave', source: 'imported', status: 'active', import_id: checked.id },
      ])
      const entry = log.mock.calls.at(-1)?.[0]
      expect(entry).toMatchObject({ event: 'holiday_import_apply', outcome: 'success', status: 'applied', created: 2 })
      const written = JSON.stringify([log.mock.calls, warn.mock.calls, error.mock.calls])
      for (const text of ['Hari Kemerdekaan', '2027-08-17', 'Alasan Rahasia']) {
        expect(written).not.toContain(text)
      }
    })

    it('updates imported days, and never touches manual days or brings back removed imported days', async () => {
      const other = new Types.ObjectId().toHexString()
      const target = await store({
        code: 'merge',
        holidays: [
          { date: '2027-08-17', name: [{ locale: 'id-ID', text: 'Lama' }], kind: 'public', source: 'imported', status: 'active', import_id: other },
          { date: '2027-12-24', name: [{ locale: 'id-ID', text: 'Punya HR' }], kind: 'collective_leave', source: 'manual', status: 'active', import_id: null },
          { date: '2027-05-01', name: [{ locale: 'id-ID', text: 'Dihapus' }], kind: 'public', source: 'imported', status: 'removed', import_id: other },
        ],
      })
      const file = `${header}\n2027-08-17,public,Baru,\n2027-12-24,collective_leave,Dari Berkas,\n2027-05-01,public,Hidup lagi,\n2027-01-01,public,Tahun Baru,\n`
      const checked = await check(file, target.id)

      const applied = await asAdmin(() => service.importFile(tenantId, target.id, { content: file, apply: true, checkId: checked.id }))

      expect(applied.counts).toMatchObject({ created: 1, updated: 1, skipped: 2 })
      const days = (await calendars.findOne(target.id))?.holidays ?? []
      expect(days.map((item) => [item.date, item.status, item.source])).toEqual([
        ['2027-01-01', 'active', 'imported'],
        ['2027-05-01', 'removed', 'imported'],
        ['2027-08-17', 'active', 'imported'],
        ['2027-12-24', 'active', 'manual'],
      ])
      expect(days.find((item) => item.date === '2027-08-17')?.name).toEqual([{ locale: 'id-ID', text: 'Baru' }])
      expect(days.find((item) => item.date === '2027-12-24')?.name).toEqual([{ locale: 'id-ID', text: 'Punya HR' }])
    })

    it('merges against the calendar as it is when applying, not as it was when checked', async () => {
      const checked = await check(good)
      await asAdmin(() =>
        calendars.update(calendar.id, {
          holidays: [{ date: '2027-08-17', name: [{ locale: 'id-ID', text: 'Tambahan HR' }], kind: 'public', source: 'manual', status: 'active', import_id: null }],
        }),
      )

      const applied = await apply(good, checked.id)

      expect(applied.counts).toMatchObject({ created: 1, skipped: 1 })
      const stored = (await calendars.findOne(calendar.id))?.holidays ?? []
      expect(stored.find((item) => item.date === '2027-08-17')?.source).toBe('manual')
    })

    it('needs the id of a check', async () => {
      expect(await rejection(() => apply(good, undefined))).toMatchObject({ code: 'check_required' })
    })

    it('refuses a check that is missing, malformed, foreign, of another calendar, invalid or already applied', async () => {
      const valid = await check(good)
      const invalid = await check(`${header}\nbad,public,x,\n`)
      const elsewhere = await store({ code: 'elsewhere' })
      const ofElsewhere = await asAdmin(() => service.importFile(tenantId, elsewhere.id, { content: good }))
      const foreignCalendar = await store({ tenant_id: otherTenantId, code: 'id-national' })
      const foreign = await asAdmin(() => service.importFile(otherTenantId, foreignCalendar.id, { content: good }))
      await apply(good, valid.id)

      for (const checkId of [new Types.ObjectId().toHexString(), 'bad', foreign.id, ofElsewhere.id, invalid.id, valid.id]) {
        expect(await rejection(() => apply(good, checkId))).toMatchObject({ code: 'check_not_valid' })
      }
    })

    it('refuses a file that is not the one that was checked, and changes nothing', async () => {
      const checked = await check(good)

      expect(await rejection(() => apply(`${good}2027-01-01,public,Satu Lagi,\n`, checked.id))).toMatchObject({ code: 'check_mismatch' })
      expect((await calendars.findOne(calendar.id))?.holidays).toEqual([])
      expect((await imports.findOne(checked.id))?.status).toBe('validated')
    })

    it('refuses the same file once it was applied, but allows checking it again, with everything skipped', async () => {
      const first = await check(good)
      await apply(good, first.id)
      const second = await check(good)

      expect(second.counts).toMatchObject({ created: 0, updated: 0, skipped: 2 })
      const again = await rejection(() => apply(good, second.id))
      expect(again).toMatchObject({ code: 'import_already_applied' })
      expect((await imports.findOne(second.id))?.status).toBe('validated')
    })

    it('refuses a stale version, and accepts the current one', async () => {
      const checked = await check(good)

      expect(await rejection(() => apply(good, checked.id, { version: 99 }))).toMatchObject({ code: 'stale_version' })
      expect((await imports.findOne(checked.id))?.status).toBe('validated')
      const accepted = await apply(good, checked.id, { version: calendar.version })
      expect(accepted.status).toBe('applied')
    })

    it('refuses to apply a file that would take the calendar over 400 holidays', async () => {
      const days = Array.from({ length: 365 }, (_, index) => new Date(Date.UTC(2027, 0, 1 + index)).toISOString().slice(0, 10))
      const rows = days.map((date) => `${date},public,P,`).join('\n')
      const file = `${header}\n${rows}\n`
      const full = await store({ code: 'late' })
      const checked = await check(file, full.id)
      await asAdmin(() =>
        calendars.update(full.id, {
          holidays: Array.from({ length: 40 }, (_, index) => ({
            date: days[index] ?? '',
            name: [{ locale: 'en', text: 'L' }],
            kind: 'local' as const,
            source: 'manual' as const,
            status: 'active' as const,
            import_id: null,
          })),
        }),
      )

      expect(
        await rejection(() => asAdmin(() => service.importFile(tenantId, full.id, { content: file, apply: true, checkId: checked.id }))),
      ).toMatchObject({ code: 'too_many_holidays' })
      expect((await imports.findOne(checked.id))?.status).toBe('validated')
    })

    it('answers not found for a foreign calendar', async () => {
      const checked = await check(good)
      const result = await rejection(() =>
        asAdmin(() => service.importFile(otherTenantId, calendar.id, { content: good, apply: true, checkId: checked.id })),
      )
      expect(result).toMatchObject({ code: 'calendar_not_found' })
    })
  })
})
