import { InvalidRequestError } from '../identity.error'
import {
  assertPasswordAcceptable,
  PASSWORD_MAX_LENGTH,
} from './password-policy'

describe('assertPasswordAcceptable', () => {
  const policy = {
    minLength: 12,
    personalTexts: ['siti.rahma', 'Siti Rahma', 'ab'],
  }

  it('accepts a long passphrase without composition rules', () => {
    expect(() =>
      assertPasswordAcceptable('correct horse battery staple', policy),
    ).not.toThrow()
  })

  it('rejects short and overly long passwords', () => {
    expect(() => assertPasswordAcceptable('short', policy)).toThrow(
      InvalidRequestError,
    )
    expect(() =>
      assertPasswordAcceptable('x'.repeat(PASSWORD_MAX_LENGTH + 1), policy),
    ).toThrow(InvalidRequestError)
  })

  it('rejects passwords that contain the name or login, ignoring case', () => {
    expect(() =>
      assertPasswordAcceptable('My-SITI.RAHMA-2026!', policy),
    ).toThrow(/name or login/)
  })

  it('ignores personal texts that are too short to compare', () => {
    expect(() =>
      assertPasswordAcceptable('xxab-long-enough-yy', policy),
    ).not.toThrow()
  })
})
