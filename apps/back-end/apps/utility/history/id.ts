import { randomBytes } from 'node:crypto'

/**
 * Creates a UUID version 7: a 48-bit millisecond timestamp followed by random bits,
 * so identifiers are unique and sort by creation time.
 *
 * @param now - Timestamp in milliseconds; defaults to the current time.
 * @returns The UUID in canonical text form.
 */
export function uuidv7(now: number = Date.now()): string {
  const bytes = randomBytes(16)
  let time = BigInt(now)
  for (let index = 5; index >= 0; index--) {
    bytes[index] = Number(time & 0xffn)
    time >>= 8n
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x70
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = bytes.toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
