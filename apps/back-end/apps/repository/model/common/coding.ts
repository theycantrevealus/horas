/**
 * Reference to a code in a code system, for example `{ system: 'id.employment-type', code: 'pkwt' }`.
 * The system name carries the jurisdiction (`database.md` 4.6).
 *
 * @property system - Code system name.
 * @property code - Code inside the system.
 * @property display - Optional text to show, in the record's language.
 */
export interface Coding {
  system: string
  code: string
  display?: string
}
