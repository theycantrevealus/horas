/**
 * Purpose of a recorded name.
 */
export type HumanNameUse = 'official' | 'usual' | 'maiden' | 'alias'

/**
 * Person name that works for any culture. Academic and professional titles (Indonesian
 * gelar such as `dr.` or `Sp.PD`, or `MD`, `FRCP`) go to `prefix` and `suffix`.
 *
 * @property use - Purpose of the name.
 * @property text - Full name as printed, for example `dr. Siti Rahma, Sp.PD`.
 * @property family - Family name; absent for people with a single name.
 * @property given - Given names, in order.
 * @property prefix - Titles before the name.
 * @property suffix - Titles after the name.
 * @property script - ISO 15924 script code for native-script variants, for example `Arab`.
 */
export interface HumanName {
  use: HumanNameUse
  text: string
  family?: string
  given: string[]
  prefix: string[]
  suffix: string[]
  script?: string
}
