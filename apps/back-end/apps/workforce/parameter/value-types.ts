import { type Coding } from '@repository/model/common/coding'
import { type ParameterType } from './catalog'

/**
 * Most numbers one integer list may hold (HR plan R2).
 */
const MAX_LIST_ITEMS = 10

/**
 * Most points one profession can require (HR plan R2).
 */
const MAX_POINTS = 10000

/**
 * Most professions one points list may name.
 */
const MAX_PROFESSIONS = 100

/**
 * One entry of a `profession_points` value.
 *
 * @property profession - Profession code.
 * @property points - Points required.
 */
export interface ProfessionPoints {
  profession: Coding
  points: number
}

/**
 * Tells whether a value is a whole number.
 *
 * @param value - Value to check.
 * @returns True for a finite whole number.
 */
function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value)
}

/**
 * Checks a value against a parameter type and returns it in its stored form: integer lists from
 * largest to smallest, profession entries reduced to their known fields. The system of a
 * profession code is only checked as text here; the service checks the codes against the code
 * concepts.
 *
 * @param type - Type and limits of the parameter.
 * @param value - Value as sent.
 * @returns The cleaned value, or `undefined` when the value does not fit the type.
 */
export function checkValue(type: ParameterType, value: unknown): unknown {
  switch (type.kind) {
    case 'integer':
      return isInteger(value) && value >= type.min && value <= type.max
        ? value
        : undefined
    case 'decimal':
      return typeof value === 'number' &&
        Number.isFinite(value) &&
        value >= type.min &&
        value <= type.max
        ? value
        : undefined
    case 'boolean':
      return typeof value === 'boolean' ? value : undefined
    case 'choice':
      return typeof value === 'string' && type.choices.includes(value)
        ? value
        : undefined
    case 'integer_list': {
      if (
        !Array.isArray(value) ||
        value.length === 0 ||
        value.length > MAX_LIST_ITEMS ||
        !value.every((item) => isInteger(item) && item >= 1 && item <= 3650) ||
        new Set(value).size !== value.length
      ) {
        return undefined
      }
      return [...(value as number[])].sort((left, right) => right - left)
    }
    case 'profession_points':
      return checkProfessionPoints(value)
  }
}

/**
 * Checks a list of profession and points entries.
 *
 * @param value - Value as sent.
 * @returns The cleaned entries, or `undefined` when the value is not valid.
 */
function checkProfessionPoints(value: unknown): ProfessionPoints[] | undefined {
  if (!Array.isArray(value) || value.length > MAX_PROFESSIONS) {
    return undefined
  }
  const cleaned: ProfessionPoints[] = []
  for (const entry of value as unknown[]) {
    if (typeof entry !== 'object' || entry === null) {
      return undefined
    }
    const { profession, points } = entry as Record<string, unknown>
    if (
      typeof profession !== 'object' ||
      profession === null ||
      typeof (profession as Record<string, unknown>).system !== 'string' ||
      typeof (profession as Record<string, unknown>).code !== 'string' ||
      !isInteger(points) ||
      points < 0 ||
      points > MAX_POINTS
    ) {
      return undefined
    }
    const { system, code } = profession as { system: string; code: string }
    cleaned.push({ profession: { system, code }, points })
  }
  const keys = cleaned.map(
    ({ profession }) => `${profession.system}|${profession.code}`,
  )
  return new Set(keys).size === keys.length ? cleaned : undefined
}
