import { type Coding } from './coding'

/**
 * Bank account of an employee as read. The account number is stored encrypted and shown
 * masked only.
 *
 * @property bank - Bank, as a code.
 * @property account_name - Name on the account.
 * @property account_number_masked - Number with all but the last four digits hidden.
 * @property swift_bic - SWIFT/BIC code for international transfers.
 * @property currency - ISO 4217 code.
 * @property is_primary - Account used for salary.
 */
export interface BankAccount {
  bank: Coding
  account_name: string
  account_number_masked: string
  swift_bic: string | null
  currency: string
  is_primary: boolean
}

/**
 * Bank account as a caller writes it, with the plain account number or IBAN.
 *
 * @property bank - Bank, as a code.
 * @property account_name - Name on the account.
 * @property account_number - Plain account number or IBAN.
 * @property swift_bic - SWIFT/BIC code.
 * @property currency - ISO 4217 code.
 * @property is_primary - Account used for salary.
 */
export interface BankAccountInput {
  bank: Coding
  account_name: string
  account_number: string
  swift_bic: string | null
  currency: string
  is_primary: boolean
}
