import {
  LIMITS,
  normalizeShiftCode,
  parseLocalTime,
  shiftMinutes,
} from './shift-rules'

describe('shift rules', () => {
  it('cleans a shift code to upper case with 1 to 8 letters or digits', () => {
    expect(normalizeShiftCode(' p ')).toBe('P')
    expect(normalizeShiftCode('nd')).toBe('ND')
    expect(normalizeShiftCode('m2')).toBe('M2')
    expect(normalizeShiftCode('ABCDEFG1')).toBe('ABCDEFG1')
    for (const bad of ['', '  ', 'ABCDEFGHI', 'P-1', 'P 1', 'p/1', 'é', 'P_']) {
      expect(normalizeShiftCode(bad)).toBeNull()
    }
  })

  it('reads a local time HH:mm as minutes from midnight', () => {
    expect(parseLocalTime('00:00')).toBe(0)
    expect(parseLocalTime('07:30')).toBe(450)
    expect(parseLocalTime('23:59')).toBe(1439)
    for (const bad of ['24:00', '7:30', '07:60', '0730', '07:30:00', '', 'ab:cd', ' 07:30', '07:3']) {
      expect(parseLocalTime(bad)).toBeNull()
    }
  })

  it('counts the minutes of a shift, an end earlier than the start meaning the next day', () => {
    expect(shiftMinutes(7 * 60, 14 * 60)).toBe(420)
    expect(shiftMinutes(21 * 60, 7 * 60)).toBe(600)
    expect(shiftMinutes(23 * 60 + 59, 0)).toBe(1)
    expect(shiftMinutes(0, 23 * 60 + 59)).toBe(1439)
  })

  it('bounds the list of units', () => {
    expect(LIMITS.units).toBe(100)
  })
})
