import { type DatePeriod } from './calendar'
import { type Coding } from './coding'

/**
 * Official identifier of a person as the application sees it after reading: national id,
 * passport, tax id, social insurance number. The plain value never leaves the repository,
 * which stores it encrypted (`database.md` 4.6).
 *
 * @property type - Kind of identifier, for example `national_id` or `tax_id`.
 * @property system - Identifier system, for example `id.nik`, `id.npwp`, `sg.nric`.
 * @property issuing_country - ISO 3166-1 alpha-2 code.
 * @property value_masked - Value with all but the last four characters hidden.
 * @property value_hash - Keyed hash of the normalized value, for lookups and uniqueness.
 * @property period - Validity of the document, when it has one.
 * @property verified_at - When HR checked the original document, or `null`.
 */
export interface PersonIdentifier {
  type: Coding
  system: string
  issuing_country: string
  value_masked: string
  value_hash: string
  period: DatePeriod | null
  verified_at: Date | null
}

/**
 * Identifier as a caller writes it: with the plain value, which the repository encrypts,
 * hashes and masks.
 *
 * @property type - Kind of identifier.
 * @property system - Identifier system.
 * @property issuing_country - ISO 3166-1 alpha-2 code.
 * @property value - Plain value as printed on the document.
 * @property period - Validity of the document, when it has one.
 */
export interface PersonIdentifierInput {
  type: Coding
  system: string
  issuing_country: string
  value: string
  period: DatePeriod | null
}
