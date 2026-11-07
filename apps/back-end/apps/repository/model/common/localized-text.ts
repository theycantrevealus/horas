/**
 * Text in one language.
 *
 * @property locale - BCP 47 language tag, for example `id-ID`.
 * @property text - The text in that language.
 */
export interface LocalizedText {
  locale: string
  text: string
}
