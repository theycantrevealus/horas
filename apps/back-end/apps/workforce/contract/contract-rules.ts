import {
  compareLocalDates,
  isLocalDate,
  todayUtc,
} from '@utility/validation/local-date'

/**
 * Shape of a contract number: upper case letters, digits, dots, hyphens, underscores and slashes,
 * 1 to 40 characters, starting with a letter or digit (HR plan T2).
 */
const NUMBER_PATTERN = /^[A-Z0-9][A-Z0-9._/-]{0,39}$/

/**
 * Earliest contract date accepted (HR plan T4).
 */
const EARLIEST_DATE = '1950-01-01'

/**
 * Years ahead a contract date may lie (HR plan T4).
 */
const YEARS_AHEAD = 10

/**
 * What the employment type says about a contract (the concept's properties).
 *
 * @property requiresEndDate - The period must have an end date.
 * @property allowsProbation - A probation period is allowed.
 */
export interface TypeRules {
  requiresEndDate: boolean
  allowsProbation: boolean
}

/**
 * The terms of a contract that depend on each other.
 *
 * @property start - First day of the contract.
 * @property end - Last day, or `null` for an open-ended contract.
 * @property probationEndDate - Last day of probation, or `null`.
 */
export interface ContractTerms {
  start: string
  end: string | null
  probationEndDate: string | null
}

/**
 * Why a set of contract terms was refused.
 *
 * @property code - Stable code of the rejection.
 * @property message - Public message.
 */
export interface TermsProblem {
  code:
    | 'invalid_period'
    | 'end_date_required'
    | 'invalid_probation_date'
    | 'probation_not_allowed'
  message: string
}

/**
 * Cleans a contract number: trimmed and upper case.
 *
 * @param raw - Number as sent.
 * @returns The cleaned number, or `null` when it does not fit the shape.
 */
export function normalizeContractNumber(raw: string): string | null {
  const cleaned = raw.trim().toUpperCase()
  return NUMBER_PATTERN.test(cleaned) ? cleaned : null
}

/**
 * Checks a full-time equivalent: above 0, at most 1, at most two decimals (HR plan T6).
 *
 * @param fte - Value as sent.
 * @returns True when it is valid.
 */
export function isValidFte(fte: number): boolean {
  return (
    Number.isFinite(fte) &&
    fte > 0 &&
    fte <= 1 &&
    Number(fte.toFixed(2)) === fte
  )
}

/**
 * Checks the dates of a contract against each other and against what its employment type allows
 * (HR plan T4 and T5).
 *
 * @param terms - Start, end and probation end.
 * @param rules - What the employment type requires and allows.
 * @param now - The current instant; a parameter so tests control it.
 * @returns The problem, or `null` when the terms are valid.
 */
export function checkContractTerms(
  terms: ContractTerms,
  rules: TypeRules,
  now: Date = new Date(),
): TermsProblem | null {
  const latestDate = todayUtc(
    new Date(now.getTime() + YEARS_AHEAD * 365 * 24 * 60 * 60 * 1000),
  )
  const dates = [terms.start, terms.end, terms.probationEndDate].filter(
    (date): date is string => date !== null,
  )
  if (
    dates.some(
      (date) =>
        !isLocalDate(date) ||
        compareLocalDates(date, EARLIEST_DATE) < 0 ||
        compareLocalDates(date, latestDate) > 0,
    ) ||
    (terms.end !== null && compareLocalDates(terms.end, terms.start) < 0)
  ) {
    return {
      code: 'invalid_period',
      message:
        'The dates must be real dates from 1950-01-01 to ten years ahead, and the end not before the start.',
    }
  }
  if (rules.requiresEndDate && terms.end === null) {
    return {
      code: 'end_date_required',
      message: 'This employment type needs an end date.',
    }
  }
  if (terms.probationEndDate !== null) {
    if (!rules.allowsProbation) {
      return {
        code: 'probation_not_allowed',
        message: 'This employment type does not allow a probation period.',
      }
    }
    if (
      compareLocalDates(terms.probationEndDate, terms.start) < 0 ||
      (terms.end !== null &&
        compareLocalDates(terms.probationEndDate, terms.end) > 0)
    ) {
      return {
        code: 'invalid_probation_date',
        message: 'The probation must end inside the contract period.',
      }
    }
  }
  return null
}
