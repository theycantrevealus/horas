import { canonicalTimeZone, isTimeZone } from './is-time-zone'

describe('isTimeZone', () => {
  it.each([
    'Asia/Jakarta',
    'Asia/Makassar',
    'Asia/Jayapura',
    'Europe/London',
    'America/New_York',
    'UTC',
  ])('accepts %s', (zone) => {
    expect(isTimeZone(zone)).toBe(true)
  })

  it.each([
    'Mars/Base',
    '',
    'UTC+7',
    '+07:00',
    '-05:00',
    'Jakarta',
    7,
    null,
    undefined,
  ])('rejects %o', (value) => {
    expect(isTimeZone(value)).toBe(false)
  })
})

describe('canonicalTimeZone', () => {
  it('returns the canonical name for a differently cased name', () => {
    expect(canonicalTimeZone('asia/jakarta')).toBe('Asia/Jakarta')
    expect(canonicalTimeZone('ASIA/MAKASSAR')).toBe('Asia/Makassar')
  })

  it('returns null for an unknown zone', () => {
    expect(canonicalTimeZone('Mars/Base')).toBeNull()
  })
})
