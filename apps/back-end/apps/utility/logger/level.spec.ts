import { createLogLevelMapper, isLogLevelName, toLogLevelName } from './level'

describe('toLogLevelName', () => {
  it('keeps platform level names, ignoring case', () => {
    expect(toLogLevelName('ERROR')).toBe('error')
    expect(toLogLevelName(' debug ')).toBe('debug')
  })

  it('maps common aliases from other libraries', () => {
    expect(toLogLevelName('warning')).toBe('warn')
    expect(toLogLevelName('critical')).toBe('fatal')
    expect(toLogLevelName('trace')).toBe('silly')
  })

  it('uses the fallback for unknown or non-string levels', () => {
    expect(toLogLevelName('loud')).toBe('info')
    expect(toLogLevelName(3, 'warn')).toBe('warn')
  })
})

describe('createLogLevelMapper', () => {
  const kafkaLevel = createLogLevelMapper({
    0: 'error',
    1: 'error',
    2: 'warn',
    4: 'info',
    5: 'debug',
  })

  it('maps numeric library levels', () => {
    expect(kafkaLevel(1)).toBe('error')
    expect(kafkaLevel(5)).toBe('debug')
  })

  it('falls back to name matching, then to the fallback level', () => {
    expect(kafkaLevel('warning')).toBe('warn')
    expect(kafkaLevel(99)).toBe('info')
  })
})

describe('isLogLevelName', () => {
  it('rejects inherited object keys', () => {
    expect(isLogLevelName('toString')).toBe(false)
    expect(isLogLevelName('fatal')).toBe(true)
  })
})
