import { Logger } from '@nestjs/common'
import { Types } from 'mongoose'
import { PERMISSIONS } from '@identity/permission'
import { createHrGateway, type HrGateway } from '../testing/hr-gateway'
import {
  createInMemoryWorkforce,
  type InMemoryWorkforce,
} from '../testing/in-memory-workforce'
import { HolidayManagementModule } from './holiday-management.module'

describe('holiday calendar endpoints (in-memory repositories)', () => {
  const workforce: InMemoryWorkforce = createInMemoryWorkforce()
  let gateway: HrGateway
  let call: HrGateway['call']
  let callRaw: HrGateway['callRaw']
  let writerToken: string
  let readerToken: string
  let otherTenantToken: string
  let tenantId: string
  let otherTenantId: string
  const name = [{ locale: 'id-ID', text: 'Hari Kemerdekaan' }]

  /**
   * Creates a calendar through the API as the writer.
   *
   * @param override - Fields that replace the defaults.
   * @returns The reply.
   */
  function createCalendar(override: object = {}) {
    return call('POST', '/v1/holiday-calendars', writerToken, {
      code: 'id-national',
      year: 2027,
      country: 'ID',
      ...override,
    })
  }

  /**
   * Adds a holiday through the API as the writer.
   *
   * @param id - Calendar identifier.
   * @param override - Fields that replace the defaults.
   * @returns The reply.
   */
  function add(id: string, override: object = {}) {
    return call('POST', `/v1/holiday-calendars/${id}/holidays`, writerToken, {
      date: '2027-08-17',
      kind: 'public',
      name,
      ...override,
    })
  }

  /**
   * Captures every entry the application writes through Nest's logger.
   *
   * @returns The entries and a function that restores the logger.
   */
  function captureLogs(): {
    written: Record<string, unknown>[]
    restore: () => void
  } {
    const written: Record<string, unknown>[] = []
    const spies = (['log', 'warn', 'error', 'debug', 'verbose'] as const).map(
      (level) =>
        vi
          .spyOn(Logger.prototype, level)
          .mockImplementation((entry: unknown) => {
            if (typeof entry === 'object' && entry !== null) {
              written.push(entry as Record<string, unknown>)
            }
          }),
    )
    return { written, restore: () => spies.forEach((spy) => spy.mockRestore()) }
  }

  beforeAll(async () => {
    gateway = await createHrGateway({
      modules: [HolidayManagementModule],
      ...workforce.options,
    })
    call = gateway.call
    callRaw = gateway.callRaw
    ;({ tenantId, otherTenantId } = gateway)
    writerToken = await gateway.seedAndLogin(tenantId, 'writer', [
      PERMISSIONS.WORKFORCE_HOLIDAY_CALENDAR_READ,
      PERMISSIONS.WORKFORCE_HOLIDAY_CALENDAR_WRITE,
    ])
    readerToken = await gateway.seedAndLogin(tenantId, 'reader', [
      PERMISSIONS.WORKFORCE_HOLIDAY_CALENDAR_READ,
    ])
    otherTenantToken = await gateway.seedAndLogin(otherTenantId, 'other', [
      PERMISSIONS.WORKFORCE_HOLIDAY_CALENDAR_READ,
      PERMISSIONS.WORKFORCE_HOLIDAY_CALENDAR_WRITE,
    ])
  })

  afterAll(async () => {
    await gateway.close()
  })

  it('refuses every route without a token (401) and the writes without the write permission (403)', async () => {
    const id = new Types.ObjectId().toHexString()
    const routes: ['GET' | 'POST', string, object | undefined][] = [
      ['GET', '/v1/holiday-calendars', undefined],
      ['POST', '/v1/holiday-calendars', {}],
      ['POST', `/v1/holiday-calendars/${id}/holidays`, {}],
      ['POST', `/v1/holiday-calendars/${id}/holidays/remove`, {}],
      ['POST', `/v1/holiday-calendars/${id}/imports`, {}],
    ]
    for (const [method, url, payload] of routes) {
      expect((await call(method, url, undefined, payload)).status).toBe(401)
    }
    for (const [method, url, payload] of routes.filter(([method]) => method !== 'GET')) {
      expect((await call(method, url, readerToken, payload)).status).toBe(403)
    }
    expect((await call('GET', '/v1/holiday-calendars', readerToken)).status).toBe(200)
  })

  it('creates a calendar, adds and removes holidays, and lists them with and without the removed ones', async () => {
    const created = await createCalendar({ code: ' ID-National ', subdivision: null, reason: 'Baru' })

    expect(created.status).toBe(201)
    const calendar = created.body as Record<string, any>
    expect(calendar).toMatchObject({
      tenant_id: tenantId,
      code: 'id-national',
      year: 2027,
      country: 'ID',
      subdivision: null,
      holidays: [],
      last_import_id: null,
    })
    expect(calendar).not.toHaveProperty('_id')

    const first = await add(calendar.id, { reason: 'Libur nasional' })
    expect(first.status).toBe(201)
    expect(first.body).toMatchObject({
      holidays: [{ date: '2027-08-17', kind: 'public', source: 'manual', status: 'active', import_id: null, name }],
    })
    await add(calendar.id, { date: '2027-01-01', kind: 'collective_leave', name: [{ locale: 'en', text: 'Leave' }] })
    const removed = await call('POST', `/v1/holiday-calendars/${calendar.id}/holidays/remove`, writerToken, { date: '2027-01-01', kind: 'collective_leave' })
    expect(removed.status).toBe(201)

    const listed = await call('GET', '/v1/holiday-calendars?code=id-national&year=2027', readerToken)
    expect((listed.body as any[])[0].holidays.map((holiday: any) => holiday.date)).toEqual(['2027-08-17'])
    const all = await call('GET', '/v1/holiday-calendars?code=id-national&year=2027&includeRemoved=true', readerToken)
    expect((all.body as any[])[0].holidays.map((holiday: any) => [holiday.date, holiday.status])).toEqual([
      ['2027-01-01', 'removed'],
      ['2027-08-17', 'active'],
    ])

    const back = await add(calendar.id, { date: '2027-01-01', kind: 'collective_leave', name: [{ locale: 'en', text: 'Leave again' }] })
    expect((back.body as any).holidays[0]).toMatchObject({ date: '2027-01-01', status: 'active', source: 'manual' })
  })

  it('filters by country and year, orders by code and latest year, and pages', async () => {
    await createCalendar({ code: 'sg-national', year: 2027, country: 'SG' })
    await createCalendar({ code: 'id-national', year: 2028 })

    const bySg = await call('GET', '/v1/holiday-calendars?country=SG', readerToken)
    expect((bySg.body as any[]).map((item) => item.code)).toEqual(['sg-national'])
    const ordered = await call('GET', '/v1/holiday-calendars?limit=100', readerToken)
    const keys = (ordered.body as any[]).map((item) => `${item.code} ${item.year}`)
    expect(keys.indexOf('id-national 2028')).toBeLessThan(keys.indexOf('id-national 2027'))
    expect(((await call('GET', '/v1/holiday-calendars?limit=1&offset=1', readerToken)).body as any[])).toHaveLength(1)
  })

  it('answers 404 for a missing, malformed or foreign calendar, and never lists another tenant\'s', async () => {
    const created = (await createCalendar({ code: 'only-mine' })).body as Record<string, any>
    const unknown = new Types.ObjectId().toHexString()
    for (const id of [unknown, 'bad']) {
      expect((await add(id)).body).toMatchObject({ code: 'calendar_not_found' })
      expect((await call('POST', `/v1/holiday-calendars/${id}/holidays/remove`, writerToken, { date: '2027-08-17', kind: 'public' })).body).toMatchObject({ code: 'calendar_not_found' })
    }
    expect((await call('POST', `/v1/holiday-calendars/${created.id}/holidays`, otherTenantToken, { date: '2027-08-17', kind: 'public', name })).status).toBe(404)
    const own = await call('GET', '/v1/holiday-calendars?limit=100', otherTenantToken)
    expect((own.body as any[]).map((item) => item.code)).not.toContain('only-mine')
  })

  it('answers 409 for a calendar or holiday that exists and a stale version, and 404 for a day that is not there', async () => {
    const created = (await createCalendar({ code: 'dup', year: 2030 })).body as Record<string, any>

    const again = await createCalendar({ code: 'DUP', year: 2030 })
    expect(again.status).toBe(409)
    expect(again.body).toMatchObject({ code: 'calendar_exists' })
    await add(created.id, { date: '2030-05-01' })
    const twice = await add(created.id, { date: '2030-05-01' })
    expect(twice.status).toBe(409)
    expect(twice.body).toMatchObject({ code: 'holiday_exists' })
    const stale = await add(created.id, { date: '2030-06-01', version: 99 })
    expect(stale.status).toBe(409)
    expect(stale.body).toMatchObject({ code: 'stale_version' })
    const missing = await call('POST', `/v1/holiday-calendars/${created.id}/holidays/remove`, writerToken, { date: '2030-12-25', kind: 'public' })
    expect(missing.status).toBe(404)
    expect(missing.body).toMatchObject({ code: 'holiday_not_found' })
  })

  it('answers 422 for the business rules', async () => {
    const created = (await createCalendar({ code: 'rules', year: 2031 })).body as Record<string, any>

    expect((await createCalendar({ code: '1x' })).body).toMatchObject({ code: 'invalid_code' })
    expect((await createCalendar({ code: 'ok-code', year: 1999 })).body).toMatchObject({ code: 'invalid_year' })
    expect((await createCalendar({ code: 'ok-code', country: 'id' })).body).toMatchObject({ code: 'invalid_country' })
    expect((await createCalendar({ code: 'ok-code', subdivision: 'SG-01' })).body).toMatchObject({ code: 'invalid_subdivision' })
    expect((await add(created.id, { date: '2031-02-30' })).body).toMatchObject({ code: 'invalid_date' })
    expect((await add(created.id, { date: '2032-01-01' })).body).toMatchObject({ code: 'date_outside_year' })
    expect((await add(created.id, { date: '2031-01-01', name: [] })).body).toMatchObject({ code: 'invalid_name' })
    expect((await call('POST', `/v1/holiday-calendars/${created.id}/holidays/remove`, writerToken, { date: '2032-01-01', kind: 'public' })).body).toMatchObject({
      code: 'date_outside_year',
    })
  })

  it('validates the request: 400 for shape, and list limits', async () => {
    const created = (await createCalendar({ code: 'shape', year: 2033 })).body as Record<string, any>

    expect((await call('POST', '/v1/holiday-calendars', writerToken, {})).status).toBe(400)
    expect((await createCalendar({ year: '2027' })).status).toBe(400)
    expect((await createCalendar({ year: 2027.5 })).status).toBe(400)
    expect((await createCalendar({ country: 1 })).status).toBe(400)
    expect((await add(created.id, { kind: 'weird' })).status).toBe(400)
    expect((await add(created.id, { name: 'text' })).status).toBe(400)
    expect((await add(created.id, { name: [{ locale: 1 }] })).status).toBe(400)
    expect((await add(created.id, { date: 20270101 })).status).toBe(400)
    expect((await add(created.id, { version: -1 })).status).toBe(400)
    expect((await call('POST', `/v1/holiday-calendars/${created.id}/holidays/remove`, writerToken, { date: '2033-01-01' })).status).toBe(400)
    for (const query of ['limit=0', 'limit=101', 'offset=-1', 'year=abc', 'includeRemoved=maybe']) {
      expect((await call('GET', `/v1/holiday-calendars?${query}`, readerToken)).status).toBe(400)
    }
  })

  it('writes no log entry when data is only read, except the access log of the request', async () => {
    const { written, restore } = captureLogs()
    try {
      const replies = [
        await call('GET', '/v1/holiday-calendars', readerToken),
        await call('GET', '/v1/holiday-calendars?limit=0', readerToken),
      ]
      expect(replies.map((reply) => reply.status)).toEqual([200, 400])
      await vi.waitFor(() =>
        expect(written.filter((entry) => entry.event === 'http_request')).toHaveLength(replies.length),
      )

      expect(written.filter((entry) => entry.event !== 'http_request')).toEqual([])
    } finally {
      restore()
    }
  })

  it('logs one entry per write, without codes, dates, names or reasons', async () => {
    const { written, restore } = captureLogs()
    try {
      const created = (await createCalendar({ code: 'logcode', year: 2034, reason: 'Alasan Rahasia' })).body as Record<string, any>
      await add(created.id, { date: '2034-03-04', name: [{ locale: 'id-ID', text: 'Nama Rahasia' }], reason: 'Alasan Tambah Rahasia' })
      await call('POST', `/v1/holiday-calendars/${created.id}/holidays/remove`, writerToken, { date: '2034-03-04', kind: 'public', reason: 'Alasan Hapus Rahasia' })
      await vi.waitFor(() =>
        expect(written.filter((entry) => entry.event === 'http_request')).toHaveLength(3),
      )

      expect(written.filter((entry) => entry.event !== 'http_request').map((entry) => entry.event)).toEqual([
        'calendar_create',
        'holiday_add',
        'holiday_remove',
      ])
      for (const text of ['logcode', '2034-03-04', 'Nama Rahasia', 'Alasan Rahasia', 'Alasan Tambah Rahasia', 'Alasan Hapus Rahasia']) {
        expect(JSON.stringify(written)).not.toContain(text)
      }
    } finally {
      restore()
    }
  })

  describe('CSV import', () => {
    const header = 'date,kind,name_id-ID,name_en'
    const file = `${header}\n2040-08-17,public,Hari Kemerdekaan,Independence Day\n2040-12-24,collective_leave,Cuti Bersama,\n`

    /**
     * Sends a CSV file to the import route as the writer.
     *
     * @param id - Calendar identifier.
     * @param text - The file.
     * @param query - Query string without the question mark.
     * @param token - Token to use; the writer's by default.
     * @returns The reply.
     */
    function upload(id: string, text: string, query = '', token = writerToken) {
      return callRaw('POST', `/v1/holiday-calendars/${id}/imports${query ? `?${query}` : ''}`, token, text, 'text/csv')
    }

    it('checks a file, then applies it by sending the same file with the check id', async () => {
      const calendar = (await createCalendar({ code: 'csv-flow', year: 2040 })).body as Record<string, any>

      const checked = await upload(calendar.id, file)
      expect(checked.status).toBe(201)
      const record = checked.body as Record<string, any>
      expect(record).toMatchObject({
        kind: 'holiday_calendar',
        target: { calendar_code: 'csv-flow', year: 2040 },
        status: 'validated',
        counts: { rows: 2, valid: 2, invalid: 0, created: 2, updated: 0, skipped: 0 },
        errors: [],
      })
      expect(record.file.sha256).toMatch(/^[0-9a-f]{64}$/)
      expect(record).not.toHaveProperty('_id')
      const before = await call('GET', '/v1/holiday-calendars?code=csv-flow&year=2040', readerToken)
      expect((before.body as any[])[0].holidays).toEqual([])

      const applied = await upload(calendar.id, file, `apply=true&checkId=${record.id}&reason=Impor`)
      expect(applied.status).toBe(201)
      expect(applied.body).toMatchObject({ id: record.id, status: 'applied', counts: { created: 2 } })
      const after = (await call('GET', '/v1/holiday-calendars?code=csv-flow&year=2040', readerToken)).body as any[]
      expect(after[0].last_import_id).toBe(record.id)
      expect(after[0].holidays.map((item: any) => [item.date, item.source, item.import_id])).toEqual([
        ['2040-08-17', 'imported', record.id],
        ['2040-12-24', 'imported', record.id],
      ])

      const again = await upload(calendar.id, file)
      expect((again.body as any).counts).toMatchObject({ created: 0, skipped: 2 })
      const twice = await upload(calendar.id, file, `apply=true&checkId=${(again.body as any).id}`)
      expect(twice.status).toBe(409)
      expect(twice.body).toMatchObject({ code: 'import_already_applied' })
    })

    it('reports an invalid file with row errors as codes and changes nothing', async () => {
      const calendar = (await createCalendar({ code: 'csv-bad', year: 2040 })).body as Record<string, any>

      const checked = await upload(calendar.id, `${header}\n2040-02-30,public,Rahasia,\n2041-01-01,public,Rahasia,\n`)

      expect(checked.status).toBe(201)
      expect(checked.body).toMatchObject({
        status: 'invalid',
        counts: { rows: 2, valid: 0, invalid: 2 },
        errors: [
          { row: 2, column: 'date', code: 'invalid_date' },
          { row: 3, column: 'date', code: 'date_outside_year' },
        ],
      })
      expect(JSON.stringify(checked.body)).not.toContain('Rahasia')
      const applied = await upload(calendar.id, file, `apply=true&checkId=${(checked.body as any).id}`)
      expect(applied.body).toMatchObject({ code: 'check_not_valid' })
    })

    it('refuses to apply another file than the one checked, and a missing or unknown check', async () => {
      const calendar = (await createCalendar({ code: 'csv-mismatch', year: 2040 })).body as Record<string, any>
      const checked = (await upload(calendar.id, file)).body as Record<string, any>

      expect((await upload(calendar.id, `${file}2040-01-01,public,Lain,\n`, `apply=true&checkId=${checked.id}`)).body).toMatchObject({ code: 'check_mismatch' })
      expect((await upload(calendar.id, file, 'apply=true')).body).toMatchObject({ code: 'check_required' })
      expect((await upload(calendar.id, file, `apply=true&checkId=${new Types.ObjectId().toHexString()}`)).body).toMatchObject({ code: 'check_not_valid' })
      expect((await upload(calendar.id, file, `apply=true&checkId=${checked.id}&version=99`)).body).toMatchObject({ code: 'stale_version' })
    })

    it('answers 422 for a file that cannot be read, and records nothing', async () => {
      const calendar = (await createCalendar({ code: 'csv-422', year: 2040 })).body as Record<string, any>

      const cases: [string, string][] = [
        ['empty_file', ''],
        ['invalid_header', 'date,kind\n2040-01-01,public\n'],
        ['no_rows', `${header}\n`],
        ['invalid_csv', `${header}\n2040-01-01,public\n`],
      ]
      for (const [code, text] of cases) {
        const reply = await upload(calendar.id, text)
        expect(reply.status).toBe(422)
        expect(reply.body).toMatchObject({ code })
      }
      const json = await call('POST', `/v1/holiday-calendars/${calendar.id}/imports`, writerToken, { date: 'x' })
      expect(json.status).toBe(422)
      expect(json.body).toMatchObject({ code: 'csv_required' })
      expect(await workforce.hrImports.findByFilter(tenantId, { calendarCode: 'csv-422' })).toEqual([])
    })

    it('answers 415 for a content type Fastify cannot read and 413 for a file over 512 KB', async () => {
      const calendar = (await createCalendar({ code: 'csv-type', year: 2040 })).body as Record<string, any>

      const other = await callRaw('POST', `/v1/holiday-calendars/${calendar.id}/imports`, writerToken, file, 'application/octet-stream')
      expect(other.status).toBe(415)
      const big = await upload(calendar.id, `${header}\n${'2040-01-01,public,x,\n'.repeat(30_000)}`)
      expect(big.status).toBe(413)
    })

    it('answers 404 for a missing, malformed or foreign calendar, and validates the query', async () => {
      const calendar = (await createCalendar({ code: 'csv-404', year: 2040 })).body as Record<string, any>

      for (const id of [new Types.ObjectId().toHexString(), 'bad']) {
        expect((await upload(id, file)).body).toMatchObject({ code: 'calendar_not_found' })
      }
      expect((await upload(calendar.id, file, '', otherTenantToken)).status).toBe(404)
      for (const query of ['apply=maybe', 'checkId=bad', 'version=-1', 'version=x']) {
        expect((await upload(calendar.id, file, query)).status).toBe(400)
      }
    })

    it('logs one entry per check and apply, without cells, dates or reasons', async () => {
      const calendar = (await createCalendar({ code: 'csv-log', year: 2040 })).body as Record<string, any>
      const { written, restore } = captureLogs()
      try {
        const checked = (await upload(calendar.id, file)).body as Record<string, any>
        await upload(calendar.id, file, `apply=true&checkId=${checked.id}&reason=Alasan%20Rahasia`)
        await vi.waitFor(() => expect(written.filter((entry) => entry.event === 'http_request')).toHaveLength(2))

        expect(written.filter((entry) => entry.event !== 'http_request').map((entry) => entry.event)).toEqual([
          'holiday_import_check',
          'holiday_import_apply',
        ])
        for (const text of ['Hari Kemerdekaan', 'Independence Day', '2040-08-17', 'Alasan Rahasia', 'csv-log']) {
          expect(JSON.stringify(written)).not.toContain(text)
        }
      } finally {
        restore()
      }
    })
  })
})
