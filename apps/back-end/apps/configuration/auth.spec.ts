import { AuthConfig, AuthSchema } from './auth'

describe('AuthSchema', () => {
  it('refuses to start without a signing secret or with a short one', () => {
    expect(AuthSchema.validate({}).error?.message).toContain('AUTH_JWT_SECRET')
    expect(
      AuthSchema.validate({ AUTH_JWT_SECRET: 'too-short' }).error?.message,
    ).toContain('at least 32')
  })

  it('applies safe defaults', () => {
    const { error, value } = AuthSchema.validate({
      AUTH_JWT_SECRET: 'x'.repeat(40),
    })
    expect(error).toBeUndefined()
    expect(value).toMatchObject({
      AUTH_ACCESS_TOKEN_TTL_SECONDS: 900,
      AUTH_REFRESH_TOKEN_TTL_DAYS: 7,
      AUTH_MAX_FAILED_ATTEMPTS: 5,
      AUTH_LOCKOUT_MINUTES: 15,
      AUTH_PASSWORD_MIN_LENGTH: 12,
    })
  })

  it('rejects access tokens that live too long', () => {
    expect(
      AuthSchema.validate({
        AUTH_JWT_SECRET: 'x'.repeat(40),
        AUTH_ACCESS_TOKEN_TTL_SECONDS: 86_400,
      }).error,
    ).toBeDefined()
  })
})

describe('AuthConfig', () => {
  it('maps variables to the typed namespace', () => {
    process.env.AUTH_JWT_SECRET = 'y'.repeat(40)
    process.env.AUTH_MAX_FAILED_ATTEMPTS = '7'
    const config = AuthConfig()
    expect(config.jwt.secret).toBe('y'.repeat(40))
    expect(config.lockout.maxAttempts).toBe(7)
    expect(config.password.minLength).toBe(12)
  })
})
