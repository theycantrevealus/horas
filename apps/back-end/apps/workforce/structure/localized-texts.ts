import { type LocalizedText } from '@repository/model/common/localized-text'

/**
 * Format of a BCP 47 language tag as used here, for example `id-ID` or `en`.
 */
const LOCALE_PATTERN = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/

/**
 * Limits of a list of texts per language.
 *
 * @property maxItems - Most entries allowed.
 * @property maxLength - Longest text, after trimming.
 */
export interface LocalizedTextLimits {
  maxItems: number
  maxLength: number
}

/**
 * Cleans a list of texts per language: trims the text and checks that there is at least one
 * entry, no more than the limit, valid language tags, no empty or too long text and no
 * language twice (compared without case).
 *
 * @param items - Texts as sent.
 * @param limits - Limits of the list.
 * @returns The cleaned list, or `null` when it breaks a rule.
 */
export function normalizeLocalizedTexts(
  items: LocalizedText[],
  limits: LocalizedTextLimits,
): LocalizedText[] | null {
  const cleaned = items.map(({ locale, text }) => ({
    locale: locale.trim(),
    text: text.trim(),
  }))
  const locales = new Set(cleaned.map(({ locale }) => locale.toLowerCase()))
  if (
    cleaned.length === 0 ||
    cleaned.length > limits.maxItems ||
    cleaned.some(
      ({ locale, text }) =>
        !LOCALE_PATTERN.test(locale) ||
        text.length === 0 ||
        text.length > limits.maxLength,
    ) ||
    locales.size !== cleaned.length
  ) {
    return null
  }
  return cleaned
}
