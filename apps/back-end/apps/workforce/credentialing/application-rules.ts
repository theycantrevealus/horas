import { type Coding } from '@repository/model/common/coding'

/**
 * Limits of the lists of an application (HR plan 4.2 AP5, AP6 and AP8).
 */
export const LIMITS = {
  privileges: 50,
  units: 50,
  documents: 30,
  notes: 500,
  reason: 500,
} as const

/**
 * Application types this group accepts. Re-credentialing and privilege extension need the SPK
 * being renewed, which exists after group 4.3 (HR plan 4.2 AP3).
 */
export const SUPPORTED_TYPES: readonly string[] = ['initial', 'temporary']

/**
 * Reads the numeric rank of a clinical level from the properties of its code concept.
 *
 * @param properties - Properties of the `clinical-level` concept, or `undefined`.
 * @returns The rank, or `null` when the concept has none.
 */
export function levelRank(
  properties: Record<string, unknown> | undefined,
): number | null {
  const rank = properties?.rank
  return typeof rank === 'number' && Number.isFinite(rank) ? rank : null
}

/**
 * Lists the mandatory evidence types that no attached document covers.
 *
 * @param mandatory - Mandatory evidence types of the requested privileges.
 * @param documents - Types of the attached documents.
 * @returns The codes of the missing types, without duplicates.
 */
export function missingEvidence(
  mandatory: Coding[],
  documents: Coding[],
): string[] {
  const present = new Set(
    documents.map(({ system, code }) => `${system}|${code}`),
  )
  const missing = new Set<string>()
  for (const { system, code } of mandatory) {
    if (!present.has(`${system}|${code}`)) {
      missing.add(code)
    }
  }
  return [...missing]
}

/**
 * Tells whether a list of identifiers has a repeated entry.
 *
 * @param ids - Identifiers.
 * @returns True when one appears twice.
 */
export function hasRepeats(ids: string[]): boolean {
  return new Set(ids).size !== ids.length
}
