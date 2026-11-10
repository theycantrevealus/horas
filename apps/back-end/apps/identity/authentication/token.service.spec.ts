import { SignJWT, decodeProtectedHeader, decodeJwt } from 'jose'
import { type AuthConfigType } from '@configuration/auth'
import { UnauthenticatedError } from '../identity.error'
import { type AccessTokenClaims, TokenService } from './token.service'

/**
 * Signing secret used by every test; long enough for HS256.
 */
const SECRET = 'test-signing-secret-with-at-least-32-characters'

/**
 * Issue time of the tokens in these tests: the current time, because the service verifies
 * expiry against the clock and a fixed past date would make every token look expired.
 */
const NOW = new Date()

/**
 * Seconds since the epoch of {@link NOW}.
 */
const NOW_SECONDS = Math.floor(NOW.getTime() / 1000)

/**
 * Claims of a typical signed-in employee.
 */
const CLAIMS: AccessTokenClaims = {
  accountId: 'acc-1',
  tenantId: 'ten-1',
  employeeId: 'emp-1',
  authzVersion: 3,
  sessionId: 'ses-1',
  mustChangePassword: false,
}

/**
 * Builds the typed `auth` configuration of a test.
 *
 * @param accessTokenTtlSeconds - Lifetime of access tokens.
 * @returns The configuration.
 */
function config(accessTokenTtlSeconds = 900): AuthConfigType {
  return {
    jwt: {
      secret: SECRET,
      issuer: 'horas',
      audience: 'horas-back-office',
      accessTokenTtlSeconds,
    },
    refreshTokenTtlDays: 7,
    lockout: { maxAttempts: 5, lockoutMinutes: 15 },
    password: { minLength: 12, historyCount: 5 },
    securityEventRetentionDays: 365,
    externalAccountMaxDays: 90,
  }
}

/**
 * Signs a token from scratch, so a test can break one rule at a time.
 *
 * @param payload - Claims to sign.
 * @param broken - The single rule to break, if any.
 * @param broken.type - Value of the `typ` header.
 * @param broken.algorithm - Signing algorithm.
 * @param broken.issuer - `iss` claim.
 * @param broken.audience - `aud` claim.
 * @param broken.expiresAt - `exp` claim, in seconds since the epoch.
 * @returns The compact JWT.
 */
async function signRaw(
  payload: Record<string, unknown>,
  broken: {
    type?: string
    algorithm?: 'HS256' | 'HS512'
    issuer?: string
    audience?: string
    expiresAt?: number
  } = {},
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({
      alg: broken.algorithm ?? 'HS256',
      typ: broken.type ?? 'at+jwt',
    })
    .setSubject(CLAIMS.accountId)
    .setIssuer(broken.issuer ?? 'horas')
    .setAudience(broken.audience ?? 'horas-back-office')
    .setIssuedAt(NOW_SECONDS)
    .setExpirationTime(broken.expiresAt ?? NOW_SECONDS + 900)
    .sign(new TextEncoder().encode(SECRET))
}

/**
 * Payload of a valid access token, built by hand so one claim can be replaced.
 *
 * @param overrides - Claims that differ from a valid token.
 * @returns The payload.
 */
function claims(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    tid: CLAIMS.tenantId,
    emp: CLAIMS.employeeId,
    authz: CLAIMS.authzVersion,
    sid: CLAIMS.sessionId,
    pwd: CLAIMS.mustChangePassword,
    ...overrides,
  }
}

describe('TokenService', () => {
  const tokens = new TokenService(config())

  it('signs an access token that carries the holder claims', async () => {
    const { token } = await tokens.signAccessToken(
      { ...CLAIMS, mustChangePassword: true },
      NOW,
    )

    expect(decodeJwt(token)).toMatchObject({
      sub: 'acc-1',
      tid: 'ten-1',
      emp: 'emp-1',
      authz: 3,
      sid: 'ses-1',
      pwd: true,
      iss: 'horas',
      aud: 'horas-back-office',
    })
  })

  it('marks the token as an access token, so another JWT cannot stand in for one', async () => {
    const { token } = await tokens.signAccessToken(CLAIMS, NOW)

    expect(decodeProtectedHeader(token)).toMatchObject({
      alg: 'HS256',
      typ: 'at+jwt',
    })
  })

  it('keeps the access token valid for the configured lifetime', async () => {
    const { token, expiresAt } = await tokens.signAccessToken(
      CLAIMS,
      NOW,
    )
    const payload = decodeJwt(token)

    expect(payload.exp).toBe(NOW_SECONDS + 900)
    // JWT times have second precision, so the expiry is truncated the same way.
    expect(expiresAt.getTime()).toBe(NOW_SECONDS * 1000 + 900_000)
  })

  it('verifies its own token back into the claims', async () => {
    const { token } = await tokens.signAccessToken(
      { ...CLAIMS, mustChangePassword: true },
      NOW,
    )

    await expect(tokens.verifyAccessToken(token)).resolves.toEqual({
      ...CLAIMS,
      mustChangePassword: true,
    })
  })

  it('rejects an expired access token with token_expired', async () => {
    const expired = await signRaw(claims(), { expiresAt: NOW_SECONDS - 1 })

    await expect(tokens.verifyAccessToken(expired)).rejects.toMatchObject({
      code: 'token_expired',
    })
  })

  it('rejects a token issued for another audience', async () => {
    const token = await signRaw(claims(), { audience: 'another-app' })

    await expect(tokens.verifyAccessToken(token)).rejects.toMatchObject({
      code: 'invalid_token',
    })
  })

  it('rejects a token issued by another issuer', async () => {
    const token = await signRaw(claims(), { issuer: 'another-issuer' })

    await expect(tokens.verifyAccessToken(token)).rejects.toMatchObject({
      code: 'invalid_token',
    })
  })

  it('rejects a JWT that is not an access token', async () => {
    const token = await signRaw(claims(), { type: 'JWT' })

    await expect(tokens.verifyAccessToken(token)).rejects.toMatchObject({
      code: 'invalid_token',
    })
  })

  it('rejects a token signed with another algorithm', async () => {
    const token = await signRaw(claims(), { algorithm: 'HS512' })

    await expect(tokens.verifyAccessToken(token)).rejects.toMatchObject({
      code: 'invalid_token',
    })
  })

  it('rejects a token whose claims have the wrong type', async () => {
    const token = await signRaw(claims({ authz: '3' }))

    await expect(tokens.verifyAccessToken(token)).rejects.toMatchObject({
      code: 'invalid_token',
    })
  })

  it('reports every rejection as UnauthenticatedError, not as a raw JWT error', async () => {
    const token = await signRaw(claims(), { type: 'JWT' })

    await expect(tokens.verifyAccessToken(token)).rejects.toBeInstanceOf(
      UnauthenticatedError,
    )
  })

  it('issues a random refresh token and stores only its hash', () => {
    const first = tokens.issueRefreshToken()
    const second = tokens.issueRefreshToken()

    expect(first.token).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(first.hash).toMatch(/^[a-f0-9]{64}$/)
    expect(first.hash).toBe(tokens.hashRefreshToken(first.token))
    expect(second.token).not.toBe(first.token)
    expect(first.token).not.toContain(first.hash)
  })

  it('hashes the same refresh token to the same value', () => {
    const { token } = tokens.issueRefreshToken()

    expect(tokens.hashRefreshToken(token)).toBe(tokens.hashRefreshToken(token))
  })
})
