/**
 * Formats of the identifier systems the platform knows (HR plan S13). A system not listed here uses
 * the general rule: 4 to 40 letters or digits after the clean-up.
 */
const KNOWN_FORMATS: Readonly<Record<string, RegExp>> = {
  'id.nik': /^\d{16}$/,
  'id.npwp': /^\d{15,16}$/,
  'id.bpjs-kesehatan': /^\d{13}$/,
  'id.bpjs-ketenagakerjaan': /^\d{11}$/,
}

/**
 * Format of any other identifier.
 */
const GENERAL_FORMAT = /^[A-Z0-9]{4,40}$/

/**
 * Format of the name of an identifier system: lower case letters, digits, dots, hyphens and
 * underscores, 2 to 64 characters.
 */
export const IDENTIFIER_SYSTEM_PATTERN = /^[a-z0-9][a-z0-9._-]{1,63}$/

/**
 * Cleans an identifier as printed on its document (spaces, dots, hyphens and slashes removed, upper
 * case) and checks it against the format of its system. The cleaned value is what the repository
 * hashes, so the same identifier written in two ways is the same identifier.
 *
 * @param system - Identifier system, for example `id.nik`.
 * @param raw - Value as sent.
 * @returns The cleaned value, or `null` when it does not fit the format of the system.
 */
export function normalizeIdentifier(
  system: string,
  raw: string,
): string | null {
  const cleaned = raw.replace(/[\s.\-/]/g, '').toUpperCase()
  const format = KNOWN_FORMATS[system] ?? GENERAL_FORMAT
  return format.test(cleaned) ? cleaned : null
}
