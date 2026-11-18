import { Types } from 'mongoose'
import { runWithRequestContext } from '@utility/logger/context'
import { type AppLogger } from '@utility/logger/service'
import { type HolidayCalendar } from '@repository/model/holiday-calendar'
import { InMemoryHolidayCalendars } from '../testing/in-memory'
import { HolidayService } from './holiday.service'

describe('HolidayService', () => {
  const tenantId = new Types.ObjectId().toHexString()
  const otherTenantId = new Types.ObjectId().toHexString()
  const log = vi.fn()
  const warn = vi.fn()
  const error = vi.fn()
  const debug = vi.fn()
  let calendars: InMemoryHolidayCalendars
  let service: HolidayService

  const name = [{ locale: 'id-ID', text: 'Hari Kemerdekaan' }]

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

  /**
   * Builds a stored holiday.
   *
   * @param override - Fields that replace the defaults.
   * @returns The holiday.
   */
  function holiday(override: Partial<HolidayCalendar['holidays'][number]> = {}) {
    return {
      date: '2027-08-17',
      name,
      kind: 'public' as const,
      source: 'imported' as const,
      status: 'active' as const,
      import_id: new Types.ObjectId().toHexString(),
      ...override,
    }
  }

  beforeEach(() => {
    vi.resetAllMocks()
    calendars = new InMemoryHolidayCalendars()
    const logger = { log, warn, error, debug } as unknown as AppLogger
    service = new HolidayService(calendars, logger)
  })

  describe('create', () => {
    it('creates an empty calendar with a cleaned code, and writes one log entry without values', async () => {
      const created = await asAdmin(() =>
        service.create(tenantId, { code: ' ID-JK ', year: 2027, country: 'ID', subdivision: 'ID-JK', reason: 'Alasan Rahasia' }),
      )

      expect(created).toMatchObject({
        tenant_id: tenantId,
        code: 'id-jk',
        year: 2027,
        country: 'ID',
        subdivision: 'ID-JK',
        holidays: [],
        last_import_id: null,
      })
      expect(log).toHaveBeenCalledTimes(1)
      expect(log.mock.calls[0]?.[0]).toMatchObject({ event: 'calendar_create', outcome: 'success' })
      const written = JSON.stringify([log.mock.calls, warn.mock.calls, error.mock.calls])
      for (const text of ['Alasan Rahasia', 'id-jk', 'ID-JK']) {
        expect(written).not.toContain(text)
      }
    })

    it('creates a national calendar without a subdivision', async () => {
      const created = await asAdmin(() => service.create(tenantId, { code: 'id-national', year: 2027, country: 'ID' }))
      expect(created.subdivision).toBeNull()
    })

    it.each([
      ['invalid_code', { code: '1x', year: 2027, country: 'ID' }],
      ['invalid_year', { code: 'id-national', year: 1999, country: 'ID' }],
      ['invalid_year', { code: 'id-national', year: 2026.5, country: 'ID' }],
      ['invalid_country', { code: 'id-national', year: 2027, country: 'id' }],
      ['invalid_subdivision', { code: 'id-national', year: 2027, country: 'ID', subdivision: 'SG-01' }],
    ])('refuses %s', async (code, input) => {
      expect(await rejection(() => asAdmin(() => service.create(tenantId, input)))).toMatchObject({ code })
      expect(await calendars.findByFilter(tenantId)).toEqual([])
      expect(error).toHaveBeenCalledTimes(0)
      expect(warn.mock.calls[0]?.[0]).toMatchObject({ event: 'calendar_create', outcome: 'failure', code })
    })

    it('refuses a second calendar of the same code and year, but allows another year, code or tenant', async () => {
      await store()

      expect(await rejection(() => asAdmin(() => service.create(tenantId, { code: 'ID-National', year: 2027, country: 'ID' })))).toMatchObject({
        code: 'calendar_exists',
      })
      await asAdmin(() => service.create(tenantId, { code: 'id-national', year: 2028, country: 'ID' }))
      await asAdmin(() => service.create(tenantId, { code: 'id-jk', year: 2027, country: 'ID' }))
      await asAdmin(() => service.create(otherTenantId, { code: 'id-national', year: 2027, country: 'ID' }))
    })
  })

  describe('addHoliday', () => {
    it('adds a manual active holiday in date order and writes one log entry without values', async () => {
      const calendar = await store({ holidays: [holiday({ date: '2027-12-25' })] })

      const updated = await asAdmin(() =>
        service.addHoliday(tenantId, calendar.id, { date: '2027-01-01', kind: 'local', name: [{ locale: ' id-ID ', text: ' Ulang Tahun RS ' }], reason: 'Alasan Rahasia' }),
      )

      expect(updated.holidays.map((item) => item.date)).toEqual(['2027-01-01', '2027-12-25'])
      expect(updated.holidays[0]).toEqual({
        date: '2027-01-01',
        name: [{ locale: 'id-ID', text: 'Ulang Tahun RS' }],
        kind: 'local',
        source: 'manual',
        status: 'active',
        import_id: null,
      })
      expect(log.mock.calls[0]?.[0]).toMatchObject({ event: 'holiday_add', outcome: 'success' })
      const written = JSON.stringify([log.mock.calls, warn.mock.calls, error.mock.calls])
      for (const text of ['Alasan Rahasia', 'Ulang Tahun', '2027-01-01']) {
        expect(written).not.toContain(text)
      }
    })

    it('allows two kinds on one date, and refuses an active day of the same date and kind', async () => {
      const calendar = await store({ holidays: [holiday()] })

      await asAdmin(() => service.addHoliday(tenantId, calendar.id, { date: '2027-08-17', kind: 'local', name }))
      expect(await rejection(() => asAdmin(() => service.addHoliday(tenantId, calendar.id, { date: '2027-08-17', kind: 'public', name })))).toMatchObject({
        code: 'holiday_exists',
      })
      expect((await calendars.findOne(calendar.id))?.holidays).toHaveLength(2)
    })

    it('brings a removed day back as a manual entry with the new name', async () => {
      const calendar = await store({ holidays: [holiday({ status: 'removed' })] })

      const updated = await asAdmin(() =>
        service.addHoliday(tenantId, calendar.id, { date: '2027-08-17', kind: 'public', name: [{ locale: 'en', text: 'Independence Day' }] }),
      )

      expect(updated.holidays).toHaveLength(1)
      expect(updated.holidays[0]).toMatchObject({
        source: 'manual',
        status: 'active',
        import_id: null,
        name: [{ locale: 'en', text: 'Independence Day' }],
      })
    })

    it.each([
      ['invalid_kind', { date: '2027-08-17', kind: 'religious', name }],
      ['invalid_date', { date: '2027-02-30', kind: 'public', name }],
      ['invalid_date', { date: '17/08/2027', kind: 'public', name }],
      ['date_outside_year', { date: '2028-01-01', kind: 'public', name }],
      ['invalid_name', { date: '2027-08-17', kind: 'public', name: [] }],
      ['invalid_name', { date: '2027-08-17', kind: 'public', name: [{ locale: 'id-ID', text: '  ' }] }],
    ])('refuses %s', async (code, input) => {
      const calendar = await store()
      expect(
        await rejection(() => asAdmin(() => service.addHoliday(tenantId, calendar.id, input as Parameters<HolidayService['addHoliday']>[2]))),
      ).toMatchObject({ code })
      expect((await calendars.findOne(calendar.id))?.holidays).toEqual([])
    })

    it('refuses a calendar that would hold more than 400 holidays, removed ones included', async () => {
      const full = Array.from({ length: 400 }, (_, index) => {
        const day = new Date(Date.UTC(2027, 0, 1 + index)).toISOString().slice(0, 10)
        return holiday({ date: day, status: index % 2 ? 'removed' : 'active' })
      }).filter((item) => item.date.startsWith('2027'))
      expect(full.length).toBeGreaterThan(300)
      const padded = [...full, ...full.map((item) => holiday({ date: item.date, kind: 'local' }))].slice(0, 400)
      const calendar = await store({ holidays: padded })

      expect(await rejection(() => asAdmin(() => service.addHoliday(tenantId, calendar.id, { date: '2027-12-31', kind: 'collective_leave', name })))).toMatchObject({
        code: 'too_many_holidays',
      })
    })

    it('refuses a stale version and a missing, foreign, malformed or platform calendar with one not-found code', async () => {
      const calendar = await store()
      const foreign = await store({ tenant_id: otherTenantId })
      const platform = await asAdmin(() =>
        calendars.create({ code: 'platform', year: 2027, country: 'ID', subdivision: null, holidays: [], last_import_id: null }),
      )

      expect(await rejection(() => asAdmin(() => service.addHoliday(tenantId, calendar.id, { date: '2027-08-17', kind: 'public', name, version: 99 })))).toMatchObject({
        code: 'stale_version',
      })
      for (const id of [foreign.id, platform.id, new Types.ObjectId().toHexString(), 'not-an-id']) {
        expect(await rejection(() => asAdmin(() => service.addHoliday(tenantId, id, { date: '2027-08-17', kind: 'public', name })))).toMatchObject({
          code: 'calendar_not_found',
        })
      }
    })

    it('accepts the current version', async () => {
      const calendar = await store()
      const updated = await asAdmin(() => service.addHoliday(tenantId, calendar.id, { date: '2027-08-17', kind: 'public', name, version: calendar.version }))
      expect(updated.holidays).toHaveLength(1)
    })
  })

  describe('removeHoliday', () => {
    it('marks an imported or a manual holiday as removed, keeps it, and writes one log entry without values', async () => {
      const imported = holiday()
      const manual = holiday({ date: '2027-01-01', kind: 'local', source: 'manual', import_id: null })
      const calendar = await store({ holidays: [manual, imported] })

      await asAdmin(() => service.removeHoliday(tenantId, calendar.id, { date: '2027-08-17', kind: 'public', reason: 'Alasan Rahasia' }))
      const updated = await asAdmin(() => service.removeHoliday(tenantId, calendar.id, { date: '2027-01-01', kind: 'local' }))

      expect(updated.holidays.map((item) => [item.date, item.status])).toEqual([
        ['2027-01-01', 'removed'],
        ['2027-08-17', 'removed'],
      ])
      expect(updated.holidays[1]).toMatchObject({ source: 'imported', import_id: imported.import_id })
      expect(log.mock.calls[0]?.[0]).toMatchObject({ event: 'holiday_remove', outcome: 'success' })
      const written = JSON.stringify([log.mock.calls, warn.mock.calls, error.mock.calls])
      for (const text of ['Alasan Rahasia', '2027-08-17', 'Hari Kemerdekaan']) {
        expect(written).not.toContain(text)
      }
    })

    it('answers not found for a missing or already removed day, and for the wrong kind', async () => {
      const calendar = await store({ holidays: [holiday({ status: 'removed' }), holiday({ date: '2027-05-01' })] })

      for (const input of [
        { date: '2027-08-17', kind: 'public' as const },
        { date: '2027-12-25', kind: 'public' as const },
        { date: '2027-05-01', kind: 'local' as const },
      ]) {
        expect(await rejection(() => asAdmin(() => service.removeHoliday(tenantId, calendar.id, input)))).toMatchObject({ code: 'holiday_not_found' })
      }
    })

    it('refuses a bad kind or date and a date outside the year', async () => {
      const calendar = await store()
      for (const [code, input] of [
        ['invalid_kind', { date: '2027-08-17', kind: 'x' }],
        ['invalid_date', { date: 'nope', kind: 'public' }],
        ['date_outside_year', { date: '2026-08-17', kind: 'public' }],
      ] as const) {
        expect(
          await rejection(() => asAdmin(() => service.removeHoliday(tenantId, calendar.id, input as Parameters<HolidayService['removeHoliday']>[2]))),
        ).toMatchObject({ code })
      }
    })

    it('refuses a stale version and another tenant\'s calendar', async () => {
      const calendar = await store({ holidays: [holiday()] })
      const foreign = await store({ tenant_id: otherTenantId, code: 'other', holidays: [holiday()] })

      expect(await rejection(() => asAdmin(() => service.removeHoliday(tenantId, calendar.id, { date: '2027-08-17', kind: 'public', version: 99 })))).toMatchObject({
        code: 'stale_version',
      })
      expect(await rejection(() => asAdmin(() => service.removeHoliday(tenantId, foreign.id, { date: '2027-08-17', kind: 'public' })))).toMatchObject({
        code: 'calendar_not_found',
      })
      expect((await calendars.findOne(calendar.id))?.holidays[0]?.status).toBe('active')
    })
  })

  describe('list', () => {
    it('lists the tenant\'s calendars by code and then latest year, hides removed holidays, and writes no log entry', async () => {
      const older = await store({ year: 2026 })
      const newer = await store({ year: 2027, holidays: [holiday(), holiday({ date: '2027-05-01', status: 'removed' })] })
      const other = await store({ code: 'id-jk' })
      await store({ tenant_id: otherTenantId, code: 'zz' })
      await asAdmin(() => calendars.create({ code: 'platform', year: 2027, country: 'ID', subdivision: null, holidays: [], last_import_id: null }))

      const found = await service.list(tenantId, { limit: 100 })

      expect(found.map((item) => item.id)).toEqual([other.id, newer.id, older.id])
      expect(found[1]?.holidays).toHaveLength(1)
      expect([log, warn, error, debug].every((spy) => spy.mock.calls.length === 0)).toBe(true)
    })

    it('shows removed holidays on request, filters, and pages', async () => {
      await store({ year: 2026 })
      const newer = await store({ year: 2027, holidays: [holiday({ status: 'removed' })] })
      await store({ code: 'sg-national', country: 'SG' })

      expect((await service.list(tenantId, { includeRemoved: true, year: 2027, code: 'id-national' }))[0]?.holidays).toHaveLength(1)
      expect((await service.list(tenantId, { year: 2027, code: 'id-national' }))[0]?.holidays).toHaveLength(0)
      expect((await service.list(tenantId, { country: 'SG' })).map((item) => item.code)).toEqual(['sg-national'])
      expect((await service.list(tenantId, { limit: 1, offset: 1 }))).toHaveLength(1)
      expect((await service.list(tenantId, { year: 2027, code: 'id-national' }))[0]?.id).toBe(newer.id)
    })
  })
})
