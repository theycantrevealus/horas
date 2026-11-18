import { type Coding } from '@repository/model/common/coding'
import {
  type LeaveApprovalRule,
  type LeaveBalanceRule,
  type LeavePolicy,
} from '@repository/model/leave-policy'
import { systemSuffix } from '../concept/system-rules'
import { InvalidRequestError } from '../workforce.error'

/**
 * The balance rule as a request sends it. One loose shape for the three kinds, so a setting that
 * does not belong to the kind can be seen and refused (HR plan 8.1 LP3).
 *
 * @property kind - `period`, `per_event` or `none`.
 * @property period - For `period`: `calendar_year` or `service_year`.
 * @property days - Days per period, or per event.
 * @property minServiceMonths - For `period`: months of service before the first entitlement.
 * @property carryOver - For `period`: unused days that move on, or `null`.
 * @property deductCollectiveLeave - For `period`: collective leave is taken from the balance.
 */
export interface LeaveBalanceInput {
  kind: string
  period?: string
  days?: number
  minServiceMonths?: number
  carryOver?: { maxDays: number; expiresAfterMonths: number } | null
  deductCollectiveLeave?: boolean
}

/**
 * The editable rules of a leave policy as a request sends them (HR plan 8.1 section 1).
 *
 * @property balance - How days are granted.
 * @property counting - `working_days` or `calendar_days`.
 * @property halfDays - Whether half days may be requested.
 * @property paid - Whether the leave is paid.
 * @property employmentTypes - Employment types that may use it; empty means all.
 * @property approval - One or two steps, and an optional threshold for the second.
 * @property noticeDays - Days between the request and the first leave day.
 * @property retroactiveDays - Days after the start the leave may still be requested.
 * @property maxDaysPerRequest - Most days of one request.
 * @property proof - Days after the start the proof is due, or `null` when none is needed.
 * @property notes - Legal basis, or `null`.
 */
export interface LeavePolicyInput {
  balance: LeaveBalanceInput
  counting: string
  halfDays: boolean
  paid: boolean
  employmentTypes: Coding[]
  approval: { steps: string; twoStepAboveDays?: number | null }
  noticeDays: number
  retroactiveDays: number
  maxDaysPerRequest: number
  proof: { dueDays: number } | null
  notes: string | null
}

/**
 * The checked rules, in the stored shape.
 */
export type LeavePolicyFields = Pick<
  LeavePolicy,
  | 'balance'
  | 'counting'
  | 'half_days'
  | 'paid'
  | 'employment_types'
  | 'approval'
  | 'notice_days'
  | 'retroactive_days'
  | 'max_days_per_request'
  | 'proof'
  | 'notes'
>

/**
 * Longest legal note.
 */
const MAX_NOTES_LENGTH = 500

/**
 * Most employment types one policy may list.
 */
const MAX_EMPLOYMENT_TYPES = 20

/**
 * Tells whether a value is a number from `min` to `max` in steps of half a day.
 *
 * @param value - Value to check.
 * @param min - Smallest allowed value.
 * @param max - Largest allowed value.
 * @returns True for a finite multiple of 0.5 inside the range.
 */
function isHalfSteps(value: unknown, min: number, max: number): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max &&
    value * 2 === Math.round(value * 2)
  )
}

/**
 * Tells whether a value is a whole number from `min` to `max`.
 *
 * @param value - Value to check.
 * @param min - Smallest allowed value.
 * @param max - Largest allowed value.
 * @returns True for an integer inside the range.
 */
function isWhole(value: unknown, min: number, max: number): value is number {
  return Number.isInteger(value) && (value as number) >= min && (value as number) <= max
}

/**
 * Checks the balance rule (LP3) and keeps only the settings of its kind.
 *
 * @param balance - The balance rule as sent.
 * @returns The balance rule in the stored shape.
 * @throws InvalidRequestError `invalid_balance`.
 */
function checkBalance(balance: LeaveBalanceInput): LeaveBalanceRule {
  const fail = (): never => {
    throw new InvalidRequestError(
      'invalid_balance',
      'The balance rule is not valid for its kind.',
    )
  }
  const periodOnly = [
    balance.period,
    balance.minServiceMonths,
    balance.carryOver,
    balance.deductCollectiveLeave,
  ]
  if (balance.kind === 'none') {
    return balance.days === undefined &&
      periodOnly.every((value) => value === undefined)
      ? { kind: 'none' }
      : fail()
  }
  if (balance.kind === 'per_event') {
    return isHalfSteps(balance.days, 0.5, 366) &&
      periodOnly.every((value) => value === undefined)
      ? { kind: 'per_event', days: balance.days }
      : fail()
  }
  if (
    balance.kind !== 'period' ||
    (balance.period !== 'calendar_year' && balance.period !== 'service_year') ||
    !isHalfSteps(balance.days, 0.5, 366) ||
    !isWhole(balance.minServiceMonths, 0, 120) ||
    (balance.deductCollectiveLeave !== undefined &&
      typeof balance.deductCollectiveLeave !== 'boolean')
  ) {
    return fail()
  }
  const carry = balance.carryOver
  if (
    carry &&
    (!isHalfSteps(carry.maxDays, 0.5, balance.days) ||
      !isWhole(carry.expiresAfterMonths, 1, 24))
  ) {
    return fail()
  }
  return {
    kind: 'period',
    period: balance.period,
    days: balance.days,
    min_service_months: balance.minServiceMonths,
    carry_over: carry
      ? {
          max_days: carry.maxDays,
          expires_after_months: carry.expiresAfterMonths,
        }
      : null,
    deduct_collective_leave: balance.deductCollectiveLeave ?? false,
  }
}

/**
 * Checks the employment types (LP5).
 *
 * @param types - Codes as sent.
 * @returns The codes in the stored shape.
 * @throws InvalidRequestError `invalid_employment_type` or `duplicate_employment_type`.
 */
function checkEmploymentTypes(types: Coding[]): Coding[] {
  if (!Array.isArray(types) || types.length > MAX_EMPLOYMENT_TYPES) {
    throw new InvalidRequestError(
      'invalid_employment_type',
      'A policy lists at most 20 employment types.',
    )
  }
  const seen = new Set<string>()
  return types.map((type) => {
    if (
      systemSuffix(type.system) !== 'employment-type' ||
      typeof type.code !== 'string' ||
      type.code.length === 0
    ) {
      throw new InvalidRequestError(
        'invalid_employment_type',
        'The employment types must be codes of an employment type system.',
      )
    }
    const key = `${type.system}|${type.code}`
    if (seen.has(key)) {
      throw new InvalidRequestError(
        'duplicate_employment_type',
        'An employment type is listed twice.',
      )
    }
    seen.add(key)
    return { system: type.system, code: type.code }
  })
}

/**
 * Checks the approval rule (LP5).
 *
 * @param approval - The rule as sent.
 * @returns The rule in the stored shape.
 * @throws InvalidRequestError `invalid_approval`.
 */
function checkApproval(approval: LeavePolicyInput['approval']): LeaveApprovalRule {
  const above = approval.twoStepAboveDays ?? null
  if (
    (approval.steps !== 'one_step' && approval.steps !== 'two_step') ||
    (above !== null &&
      (approval.steps !== 'one_step' || !isHalfSteps(above, 0.5, 366)))
  ) {
    throw new InvalidRequestError(
      'invalid_approval',
      'The approval rule is not valid.',
    )
  }
  return { steps: approval.steps, two_step_above_days: above }
}

/**
 * Checks the editable rules of a leave policy and returns them in the stored shape. The leave type
 * and the effective date are checked by the service (LP1, LP2).
 *
 * @param input - The rules as sent.
 * @returns The checked rules.
 * @throws InvalidRequestError `invalid_balance`, `invalid_counting`, `invalid_max_days`,
 * `invalid_employment_type`, `duplicate_employment_type`, `invalid_approval`, `invalid_notice`,
 * `invalid_retroactive`, `invalid_proof` or `invalid_notes`.
 */
export function checkPolicyInput(input: LeavePolicyInput): LeavePolicyFields {
  const balance = checkBalance(input.balance)
  if (input.counting !== 'working_days' && input.counting !== 'calendar_days') {
    throw new InvalidRequestError(
      'invalid_counting',
      'Leave is counted in working days or calendar days.',
    )
  }
  const maxOk =
    isHalfSteps(input.maxDaysPerRequest, 0.5, 366) &&
    (balance.kind !== 'per_event' || input.maxDaysPerRequest === balance.days)
  if (!maxOk) {
    throw new InvalidRequestError(
      'invalid_max_days',
      'The most days of one request must be 0.5 to 366, and equal the days of a per-event policy.',
    )
  }
  const employmentTypes = checkEmploymentTypes(input.employmentTypes)
  const approval = checkApproval(input.approval)
  if (!isWhole(input.noticeDays, 0, 365)) {
    throw new InvalidRequestError(
      'invalid_notice',
      'The notice must be 0 to 365 days.',
    )
  }
  if (!isWhole(input.retroactiveDays, 0, 30)) {
    throw new InvalidRequestError(
      'invalid_retroactive',
      'The days after the start that a request is still accepted must be 0 to 30.',
    )
  }
  if (input.proof !== null && !isWhole(input.proof.dueDays, 0, 60)) {
    throw new InvalidRequestError(
      'invalid_proof',
      'The proof must be due 0 to 60 days after the start.',
    )
  }
  const notes = input.notes === null ? null : input.notes.trim()
  if (notes !== null && notes.length > MAX_NOTES_LENGTH) {
    throw new InvalidRequestError(
      'invalid_notes',
      'The notes must have at most 500 characters.',
    )
  }
  return {
    balance,
    counting: input.counting,
    half_days: input.halfDays,
    paid: input.paid,
    employment_types: employmentTypes,
    approval,
    notice_days: input.noticeDays,
    retroactive_days: input.retroactiveDays,
    max_days_per_request: input.maxDaysPerRequest,
    proof: input.proof ? { due_days: input.proof.dueDays } : null,
    notes: notes === '' ? null : notes,
  }
}

/**
 * Turns stored rules back into the shape a request sends, so an edit can merge the fields that
 * were sent over the stored ones and check the result as a whole.
 *
 * @param fields - Stored rules.
 * @returns The same rules as a request would send them.
 */
export function toPolicyInput(fields: LeavePolicyFields): LeavePolicyInput {
  const balance = fields.balance
  return {
    balance:
      balance.kind === 'period'
        ? {
            kind: 'period',
            period: balance.period,
            days: balance.days,
            minServiceMonths: balance.min_service_months,
            carryOver: balance.carry_over
              ? {
                  maxDays: balance.carry_over.max_days,
                  expiresAfterMonths: balance.carry_over.expires_after_months,
                }
              : null,
            deductCollectiveLeave: balance.deduct_collective_leave,
          }
        : balance.kind === 'per_event'
          ? { kind: 'per_event', days: balance.days }
          : { kind: 'none' },
    counting: fields.counting,
    halfDays: fields.half_days,
    paid: fields.paid,
    employmentTypes: fields.employment_types,
    approval: {
      steps: fields.approval.steps,
      twoStepAboveDays: fields.approval.two_step_above_days,
    },
    noticeDays: fields.notice_days,
    retroactiveDays: fields.retroactive_days,
    maxDaysPerRequest: fields.max_days_per_request,
    proof: fields.proof ? { dueDays: fields.proof.due_days } : null,
    notes: fields.notes,
  }
}
