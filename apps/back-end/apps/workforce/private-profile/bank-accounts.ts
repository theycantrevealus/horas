import { type BankAccountInput } from '@repository/model/common/bank-account'
import { isCurrencyCode } from '@utility/validation/iso-codes'

/**
 * Most bank accounts one employee can hold (HR plan S15).
 */
export const MAX_BANK_ACCOUNTS = 5

/**
 * Account number or IBAN after the clean-up: 5 to 34 letters or digits.
 */
const ACCOUNT_NUMBER_PATTERN = /^[A-Z0-9]{5,34}$/

/**
 * SWIFT/BIC code: 8 or 11 characters.
 */
const SWIFT_BIC_PATTERN = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/

/**
 * A bank account as sent by a client.
 *
 * @property bank - Bank code.
 * @property account_name - Name on the account.
 * @property account_number - Account number or IBAN as printed.
 * @property swift_bic - SWIFT/BIC code.
 * @property currency - ISO 4217 code.
 * @property is_primary - Account used for salary.
 */
export type BankAccountEntry = BankAccountInput

/**
 * Cleans the bank accounts of an employee: at most 5, each with a name of 1 to 200 characters, a
 * number or IBAN (spaces and hyphens removed, upper case, 5 to 34 letters or digits), an optional
 * SWIFT/BIC code and an ISO 4217 currency, and exactly one primary account when the list is not
 * empty. Whether the bank code is active is the service's check.
 *
 * @param inputs - Accounts as sent.
 * @returns The cleaned accounts, or `null` when the list breaks a rule.
 */
export function normalizeBankAccounts(
  inputs: BankAccountEntry[],
): BankAccountInput[] | null {
  if (inputs.length > MAX_BANK_ACCOUNTS) {
    return null
  }
  const accounts: BankAccountInput[] = []
  for (const input of inputs) {
    const name = input.account_name.trim()
    const number = input.account_number.replace(/[\s-]/g, '').toUpperCase()
    const swift =
      input.swift_bic === null
        ? null
        : input.swift_bic.replace(/\s/g, '').toUpperCase()
    if (
      name.length < 1 ||
      name.length > 200 ||
      !ACCOUNT_NUMBER_PATTERN.test(number) ||
      (swift !== null && !SWIFT_BIC_PATTERN.test(swift)) ||
      !isCurrencyCode(input.currency)
    ) {
      return null
    }
    accounts.push({
      bank: { system: input.bank.system, code: input.bank.code },
      account_name: name,
      account_number: number,
      swift_bic: swift,
      currency: input.currency,
      is_primary: input.is_primary === true,
    })
  }
  const keys = accounts.map(
    ({ bank, account_number }) =>
      `${bank.system}|${bank.code}|${account_number}`,
  )
  const primaries = accounts.filter(({ is_primary }) => is_primary).length
  if (
    new Set(keys).size !== keys.length ||
    (accounts.length > 0 && primaries !== 1)
  ) {
    return null
  }
  return accounts
}
