import {
  type HumanName,
  type HumanNameUse,
} from '@repository/model/common/human-name'

/**
 * Most names an employee can hold besides the official one (HR plan E2).
 */
export const MAX_OTHER_NAMES = 5

/**
 * Most entries in the given names, prefixes and suffixes of one name.
 */
const MAX_PARTS = 5

/**
 * ISO 15924 script code: four letters, the first in capitals (`Latn`, `Arab`).
 */
const SCRIPT_PATTERN = /^[A-Z][a-z]{3}$/

/**
 * A name as sent by a client.
 *
 * @property use - Purpose of the name; ignored for the official name.
 * @property text - Full name as printed.
 * @property family - Family name.
 * @property given - Given names, in order.
 * @property prefix - Titles before the name.
 * @property suffix - Titles after the name.
 * @property script - ISO 15924 script code of a native-script variant.
 */
export interface NameInput {
  use?: HumanNameUse
  text: string
  family?: string
  given?: string[]
  prefix?: string[]
  suffix?: string[]
  script?: string
}

/**
 * Trims a list of name parts and checks it.
 *
 * @param parts - Parts as sent, or nothing.
 * @param maxLength - Longest part.
 * @returns The trimmed parts, or `null` when the list is too long or a part is empty or too long.
 */
function cleanParts(
  parts: string[] | undefined,
  maxLength: number,
): string[] | null {
  const trimmed = (parts ?? []).map((part) => part.trim())
  return trimmed.length <= MAX_PARTS &&
    trimmed.every((part) => part.length >= 1 && part.length <= maxLength)
    ? trimmed
    : null
}

/**
 * Cleans one name: trims the text, family name, given names and titles and checks their limits
 * (text up to 200 characters, the rest up to 100, titles up to 30, at most 5 of each list).
 *
 * @param input - Name as sent.
 * @param use - Purpose to store; the caller decides it.
 * @returns The cleaned name, or `null` when it breaks a rule.
 */
export function normalizeName(
  input: NameInput,
  use: HumanNameUse,
): HumanName | null {
  const text = input.text.trim()
  const family = input.family === undefined ? undefined : input.family.trim()
  const given = cleanParts(input.given, 100)
  const prefix = cleanParts(input.prefix, 30)
  const suffix = cleanParts(input.suffix, 30)
  if (
    text.length < 1 ||
    text.length > 200 ||
    (family !== undefined && (family.length < 1 || family.length > 100)) ||
    !given ||
    !prefix ||
    !suffix ||
    (input.script !== undefined && !SCRIPT_PATTERN.test(input.script))
  ) {
    return null
  }
  return {
    use,
    text,
    ...(family === undefined ? {} : { family }),
    given,
    prefix,
    suffix,
    ...(input.script === undefined ? {} : { script: input.script }),
  }
}

/**
 * Cleans the other names of an employee: at most 5, each `usual`, `maiden` or `alias`.
 *
 * @param inputs - Names as sent.
 * @returns The cleaned names, or `null` when the list breaks a rule.
 */
export function normalizeOtherNames(inputs: NameInput[]): HumanName[] | null {
  if (inputs.length > MAX_OTHER_NAMES) {
    return null
  }
  const names: HumanName[] = []
  for (const input of inputs) {
    const use = input.use
    if (use !== 'usual' && use !== 'maiden' && use !== 'alias') {
      return null
    }
    const name = normalizeName(input, use)
    if (!name) {
      return null
    }
    names.push(name)
  }
  return names
}
