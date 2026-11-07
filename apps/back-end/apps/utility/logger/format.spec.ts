import { Logform } from 'winston'
import { runWithRequestContext } from './context'
import { REDACTED, requestContext, sanitize } from './format'

/**
 * Runs a winston format on one entry.
 *
 * @param format - Format to apply.
 * @param info - Entry to transform.
 * @returns The transformed entry.
 */
function apply(
  format: Logform.Format,
  info: Logform.TransformableInfo,
): Logform.TransformableInfo {
  const result = format.transform(info, format.options)
  if (typeof result !== 'object') {
    throw new Error('Format dropped the entry')
  }
  return result
}

describe('sanitize', () => {
  it('redacts sensitive fields at any depth, matching names loosely', () => {
    const info = apply(sanitize(), {
      level: 'info',
      message: 'login',
      password: 'p',
      request: {
        headers: { Authorization: 'Bearer x' },
        patient: { NIK: '317', name: 'kept' },
      },
      items: [{ access_token: 't' }],
    })

    expect(info.password).toBe(REDACTED)
    expect(info.request).toEqual({
      headers: { Authorization: REDACTED },
      patient: { NIK: REDACTED, name: 'kept' },
    })
    expect(info.items).toEqual([{ access_token: REDACTED }])
  })

  it('redacts extra configured keys', () => {
    const info = apply(sanitize({ redactKeys: ['medicalRecordNumber'] }), {
      level: 'info',
      message: 'm',
      medical_record_number: '42',
    })

    expect(info.medical_record_number).toBe(REDACTED)
  })

  it('serializes nested errors and normalizes the stack', () => {
    const cause = Object.assign(new Error('boom'), {
      code: 11000,
      retryable: false,
    })
    const info = apply(sanitize(), {
      level: 'error',
      message: 'failed',
      stack: ['Error: failed\n    at x'],
      error: cause,
    })

    expect(info.stack).toBe('Error: failed\n    at x')
    expect(info.error).toEqual({
      name: 'Error',
      message: 'boom',
      code: 11000,
      retryable: false,
    })
  })

  it('removes empty stacks and undefined fields sent by the Nest adapter', () => {
    const info = apply(sanitize(), {
      level: 'error',
      message: 'm',
      stack: [undefined],
      context: undefined,
    })

    expect('stack' in info).toBe(false)
    expect('context' in info).toBe(false)
  })

  it('stops at circular references and cuts long strings', () => {
    const loop: Record<string, unknown> = {}
    loop.self = loop
    const info = apply(sanitize(), {
      level: 'info',
      message: 'm',
      loop,
      text: 'x'.repeat(5000),
    })

    expect(info.loop).toEqual({ self: '[Circular]' })
    expect(String(info.text).length).toBe(2001)
  })
})

describe('requestContext', () => {
  it('adds the correlation identifier inside a request context only', () => {
    const inside = runWithRequestContext({ correlationId: 'abc' }, () =>
      apply(requestContext(), { level: 'info', message: 'm' }),
    )
    const outside = apply(requestContext(), { level: 'info', message: 'm' })

    expect(inside.correlationId).toBe('abc')
    expect(outside.correlationId).toBeUndefined()
  })
})
