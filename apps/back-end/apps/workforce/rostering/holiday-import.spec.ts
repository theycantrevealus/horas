import { type HolidayEntry } from '@repository/model/holiday-calendar'
import { mergeHolidays, parseHolidayFile } from './holiday-import'

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

describe('parseHolidayFile', () => {
  const header = ['date', 'kind', 'name_id-ID', 'name_en']

  it('reads valid rows with the languages that are filled', () => {
    const parsed = parseHolidayFile(
      table(header, ['2027-08-17', 'public', 'Hari Kemerdekaan', 'Independence Day'], ['2027-12-24', 'Collective_Leave', 'Cuti Bersama', '']),
      2027,
    )

    expect(parsed).toMatchObject({ rows: 2, invalidRows: 0, errors: [] })
    expect(parsed.holidays).toEqual([
      { date: '2027-08-17', kind: 'public', name: [{ locale: 'id-ID', text: 'Hari Kemerdekaan' }, { locale: 'en', text: 'Independence Day' }] },
      { date: '2027-12-24', kind: 'collective_leave', name: [{ locale: 'id-ID', text: 'Cuti Bersama' }] },
    ])
  })

  it('accepts the columns in any order and any case of their names', () => {
    const parsed = parseHolidayFile(table(['NAME_en', 'Kind', 'DATE'], ['New Year', 'local', '2027-01-01']), 2027)
    expect(parsed.holidays).toEqual([{ date: '2027-01-01', kind: 'local', name: [{ locale: 'en', text: 'New Year' }] }])
  })

  it('reports every row error by row number and column with a code, never with the cell text', () => {
    const parsed = parseHolidayFile(
      table(
        header,
        ['2027-02-30', 'public', 'Rahasia Satu', ''],
        ['2028-01-01', 'public', 'Rahasia Dua', ''],
        ['2027-03-03', 'religious', 'Rahasia Tiga', ''],
        ['2027-04-04', 'public', '', ''],
        ['2027-05-05', 'public', 'x'.repeat(201), ''],
        ['2027-06-06', 'public', 'Enam', ''],
        ['2027-06-06', 'public', 'Enam lagi', ''],
        ['bad', 'bad', '', ''],
      ),
      2027,
    )

    expect(parsed.rows).toBe(8)
    expect(parsed.holidays).toHaveLength(1)
    expect(parsed.invalidRows).toBe(7)
    expect(parsed.errors).toEqual([
      { row: 2, column: 'date', code: 'invalid_date' },
      { row: 3, column: 'date', code: 'date_outside_year' },
      { row: 4, column: 'kind', code: 'invalid_kind' },
      { row: 5, column: null, code: 'missing_name' },
      { row: 6, column: 'name_id-ID', code: 'invalid_name' },
      { row: 8, column: 'date', code: 'duplicate_row' },
      { row: 9, column: 'date', code: 'invalid_date' },
      { row: 9, column: 'kind', code: 'invalid_kind' },
      { row: 9, column: null, code: 'missing_name' },
    ])
    expect(JSON.stringify(parsed.errors)).not.toContain('Rahasia')
  })

  it('refuses a header that lacks date, kind or a name column, or has another or repeated column', () => {
    for (const bad of [
      ['kind', 'name_en'],
      ['date', 'name_en'],
      ['date', 'kind'],
      ['date', 'kind', 'name_en', 'note'],
      ['date', 'kind', 'name_en', 'name_en'],
      ['date', 'kind', 'name_en', 'Date'],
      ['date', 'kind', 'name_'],
      ['date', 'kind', 'name_1'],
    ]) {
      expect(codeOf(() => parseHolidayFile(table(bad, bad.map(() => 'x')), 2027))).toBe('invalid_header')
    }
  })

  it('refuses a file without rows', () => {
    expect(codeOf(() => parseHolidayFile(table(header), 2027))).toBe('no_rows')
  })
})

describe('mergeHolidays', () => {
  const importId = 'i2'
  const entry = (override: Partial<HolidayEntry> = {}): HolidayEntry => ({
    date: '2027-08-17',
    name: [{ locale: 'id-ID', text: 'Lama' }],
    kind: 'public',
    source: 'imported',
    status: 'active',
    import_id: 'i1',
    ...override,
  })
  const row = (date: string, text: string, kind: HolidayEntry['kind'] = 'public') => ({
    date,
    kind,
    name: [{ locale: 'id-ID', text }],
  })

  it('adds a new day as an imported active entry, in date order', () => {
    const merged = mergeHolidays([entry({ date: '2027-12-25' })], [row('2027-01-01', 'Tahun Baru')], importId)

    expect(merged).toMatchObject({ created: 1, updated: 0, skipped: 0 })
    expect(merged.holidays.map((item) => item.date)).toEqual(['2027-01-01', '2027-12-25'])
    expect(merged.holidays[0]).toEqual({
      date: '2027-01-01',
      name: [{ locale: 'id-ID', text: 'Tahun Baru' }],
      kind: 'public',
      source: 'imported',
      status: 'active',
      import_id: importId,
    })
  })

  it('updates the names of an imported active day and takes the new import id; the same names are skipped', () => {
    const changed = mergeHolidays([entry()], [row('2027-08-17', 'Baru')], importId)
    expect(changed).toMatchObject({ created: 0, updated: 1, skipped: 0 })
    expect(changed.holidays[0]).toMatchObject({ name: [{ locale: 'id-ID', text: 'Baru' }], import_id: importId, source: 'imported' })

    const same = mergeHolidays([entry()], [row('2027-08-17', 'Lama')], importId)
    expect(same).toMatchObject({ created: 0, updated: 0, skipped: 1 })
    expect(same.holidays[0]?.import_id).toBe('i1')
  })

  it('never touches a manual day or a removed imported day, and never brings a removed day back', () => {
    const manual = entry({ source: 'manual', import_id: null })
    const removed = entry({ date: '2027-05-01', status: 'removed' })

    const merged = mergeHolidays([manual, removed], [row('2027-08-17', 'Baru'), row('2027-05-01', 'Baru')], importId)

    expect(merged).toMatchObject({ created: 0, updated: 0, skipped: 2 })
    expect(merged.holidays).toEqual([removed, manual])
  })

  it('treats the same date with another kind as another day', () => {
    const merged = mergeHolidays([entry()], [row('2027-08-17', 'Lokal', 'local')], importId)
    expect(merged).toMatchObject({ created: 1, skipped: 0 })
    expect(merged.holidays.map((item) => item.kind)).toEqual(['local', 'public'])
  })

  it('never removes a day that is not in the file, and does not change its input', () => {
    const existing = [entry(), entry({ date: '2027-09-09' })]
    const copy = JSON.stringify(existing)

    const merged = mergeHolidays(existing, [], importId)

    expect(merged.holidays).toHaveLength(2)
    expect(JSON.stringify(existing)).toBe(copy)
  })

  it('compares names without regard to their order or the case of the language', () => {
    const two = entry({ name: [{ locale: 'id-ID', text: 'A' }, { locale: 'en', text: 'B' }] })
    const merged = mergeHolidays(
      [two],
      [{ date: '2027-08-17', kind: 'public', name: [{ locale: 'EN', text: 'B' }, { locale: 'id-id', text: 'A' }] }],
      importId,
    )
    expect(merged).toMatchObject({ updated: 0, skipped: 1 })
  })
})
