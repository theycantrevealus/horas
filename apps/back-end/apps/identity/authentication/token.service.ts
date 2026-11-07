import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { Inject, Injectable } from '@nestjs/common'
import { type ConfigType } from '@nestjs/config'
import { SignJWT, errors, jwtVerify } from 'jose'
import { AuthConfig } from '@configuration/auth'
import { UnauthenticatedError } from '../identity.error'

/**
 * Value of the `typ` header of access tokens (RFC 9068), so other JWTs cannot be used as access tokens.
 */
const ACCESS_TOKEN_TYPE = 'at+jwt'

/**
 * What an access token says about its holder.
 *
 * @property accountId - Account identifier (`sub`).
 * @property tenantId - Tenant of the account.
 * @property employeeId - Linked employee, or `null`.
 * @property authzVersion - The account's `authz_version` when the token was issued.
 * @property sessionId - Session the token belongs to.
 * @property mustChangePassword - Whether only a password change is allowed.
 */
export interface AccessTokenClaims {
  accountId: string
  tenantId: string
  employeeId: string | null
  authzVersion: number
  sessionId: string
  mustChangePassword: boolean
}

/**
 * A signed access token.
 *
 * @property token - The compact JWT.
 * @property expiresAt - When it stops being valid.
 */
export interface IssuedAccessToken {
  token: string
  expiresAt: Date
}

/**
 * A new refresh token. The plain token goes to the client once; only its hash is stored.
 *
 * @property token - Opaque random token.
 * @property hash - SHA-256 of the token, hexadecimal.
 */
export interface IssuedRefreshToken {
  token: string
  hash: string
}

/**
 * Issues and verifies tokens: short-lived signed access tokens (JWT, HS256) and opaque refresh tokens.
 * A single shared secret is enough while one application issues and verifies tokens; move to
 * asymmetric keys before other services need to verify them.
 */
@Injectable()
export class TokenService {
  private readonly key: Uint8Array

  /**
   * @param config - Typed `auth` configuration.
   */
  constructor(
    @Inject(AuthConfig.KEY)
    private readonly config: ConfigType<typeof AuthConfig>,
  ) {
    this.key = new TextEncoder().encode(config.jwt.secret)
  }

  /**
   * Signs an access token.
   *
   * @param claims - What the token says about its holder.
   * @param now - Issue time.
   * @returns The token and its expiry.
   */
  async signAccessToken(
    claims: AccessTokenClaims,
    now: Date,
  ): Promise<IssuedAccessToken> {
    const issuedAt = Math.floor(now.getTime() / 1000)
    const expiresAt = issuedAt + this.config.jwt.accessTokenTtlSeconds
    const token = await new SignJWT({
      tid: claims.tenantId,
      emp: claims.employeeId,
      authz: claims.authzVersion,
      sid: claims.sessionId,
      pwd: claims.mustChangePassword,
    })
      .setProtectedHeader({ alg: 'HS256', typ: ACCESS_TOKEN_TYPE })
      .setSubject(claims.accountId)
      .setIssuer(this.config.jwt.issuer)
      .setAudience(this.config.jwt.audience)
      .setJti(randomUUID())
      .setIssuedAt(issuedAt)
      .setExpirationTime(expiresAt)
      .sign(this.key)
    return { token, expiresAt: new Date(expiresAt * 1000) }
  }

  /**
   * Verifies an access token: signature, algorithm, type, issuer, audience and expiry.
   *
   * @param token - Compact JWT from the `Authorization` header.
   * @returns The claims.
   * @throws UnauthenticatedError when the token is invalid or expired.
   */
  async verifyAccessToken(token: string): Promise<AccessTokenClaims> {
    try {
      const { payload } = await jwtVerify(token, this.key, {
        algorithms: ['HS256'],
        typ: ACCESS_TOKEN_TYPE,
        issuer: this.config.jwt.issuer,
        audience: this.config.jwt.audience,
      })
      const { sub, tid, emp, authz, sid, pwd } = payload
      if (
        typeof sub !== 'string' ||
        typeof tid !== 'string' ||
        typeof authz !== 'number' ||
        typeof sid !== 'string' ||
        (emp !== null && typeof emp !== 'string')
      ) {
        throw new UnauthenticatedError(
          'invalid_token',
          'The access token is not valid.',
        )
      }
      return {
        accountId: sub,
        tenantId: tid,
        employeeId: emp ?? null,
        authzVersion: authz,
        sessionId: sid,
        mustChangePassword: pwd === true,
      }
    } catch (error: unknown) {
      if (error instanceof UnauthenticatedError) {
        throw error
      }
      if (error instanceof errors.JWTExpired) {
        throw new UnauthenticatedError(
          'token_expired',
          'The access token has expired.',
        )
      }
      throw new UnauthenticatedError(
        'invalid_token',
        'The access token is not valid.',
      )
    }
  }

  /**
   * Creates a random refresh token (256 bits) and its storage hash.
   *
   * @returns The token to send to the client and the hash to store.
   */
  issueRefreshToken(): IssuedRefreshToken {
    const token = randomBytes(32).toString('base64url')
    return { token, hash: this.hashRefreshToken(token) }
  }

  /**
   * Hashes a refresh token for storage and lookup. SHA-256 is enough because the token is
   * random with 256 bits of entropy, so it cannot be guessed from its hash.
   *
   * @param token - Refresh token.
   * @returns Hexadecimal SHA-256.
   */
  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex')
  }
}
