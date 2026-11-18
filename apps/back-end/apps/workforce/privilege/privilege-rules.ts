/**
 * Format of a catalog code after trimming and upper-casing, for example `PD-012` (HR plan 4.1 PC1).
 */
const CODE_PATTERN = /^[A-Z0-9][A-Z0-9._/-]{1,29}$/

/**
 * Format of the system and the code of an external procedure code (HR plan 4.1 PC8): 1 to 64
 * visible characters without spaces.
 */
const EXTERNAL_PATTERN = /^[^\s]{1,64}$/

/**
 * Most entries of each list on an item (HR plan 4.1 PC4 to PC8).
 */
export const LIMITS = {
  professions: 20,
  specialties: 50,
  facilities: 50,
  evidence: 20,
  externalCodes: 10,
} as const

/**
 * Cleans a catalog code: trimmed and upper case.
 *
 * @param raw - Code as sent.
 * @returns The cleaned code, or `null` when it does not fit the shape.
 */
export function normalizeCatalogCode(raw: string): string | null {
  const cleaned = raw.trim().toUpperCase()
  return CODE_PATTERN.test(cleaned) ? cleaned : null
}

/**
 * Checks the system and the code of an external procedure code, for format only.
 *
 * @param coding - The code as sent.
 * @returns True when both parts have the right format.
 */
export function isValidExternalCode(coding: {
  system: string
  code: string
}): boolean {
  return (
    EXTERNAL_PATTERN.test(coding.system) && EXTERNAL_PATTERN.test(coding.code)
  )
}

/**
 * Finds the first repeated code in a list of codings.
 *
 * @param items - Codings, compared by system and code.
 * @returns True when a coding appears twice.
 */
export function hasDuplicate(items: { system: string; code: string }[]): boolean {
  const seen = new Set(items.map(({ system, code }) => `${system}|${code}`))
  return seen.size !== items.length
}
