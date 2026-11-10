import { type ExternalId } from '@repository/model/common/external-id'

/**
 * Most identifiers one organization or facility can hold.
 */
export const MAX_EXTERNAL_IDS = 20

/**
 * Cleans a list of identifiers given by other systems (company numbers, regulator codes):
 * trims text and checks that there are at most 20, none empty and no repeated `system`.
 *
 * @param items - Identifiers as sent.
 * @returns The cleaned identifiers, or `null` when the list breaks a rule.
 */
export function normalizeExternalIds(items: ExternalId[]): ExternalId[] | null {
  const cleaned = items.map(({ system, value }) => ({
    system: system.trim(),
    value: value.trim(),
  }))
  const systems = new Set(cleaned.map(({ system }) => system))
  if (
    cleaned.length > MAX_EXTERNAL_IDS ||
    cleaned.some(({ system, value }) => !system || !value) ||
    systems.size !== cleaned.length
  ) {
    return null
  }
  return cleaned
}
