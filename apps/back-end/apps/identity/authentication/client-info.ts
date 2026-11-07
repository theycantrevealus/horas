import { createHash } from 'node:crypto'

/**
 * What the server knows about the calling client.
 *
 * @property ip - Client address, or `null` when unknown.
 * @property userAgent - `User-Agent` header, or `null`.
 * @property app - Application name, for example `back-office-web`.
 */
export interface ClientInfo {
  ip: string | null
  userAgent: string | null
  app: string
}

/**
 * Hashes a text with SHA-256, so raw user agents are never stored.
 *
 * @param text - Text to hash.
 * @returns Hexadecimal digest.
 */
export function sha256Hex(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}
