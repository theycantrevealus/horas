import { type LocalDate } from '@repository/model/common/calendar'
import { type EmploymentContract } from '@repository/model/employment-contract'
import { addDays } from '../assignment/assignment-rules'

/**
 * The part of a contract that continuous service reads.
 */
export type ServiceContract = Pick<
  EmploymentContract,
  'period' | 'status' | 'termination'
>

/**
 * The last day a contract runs: the early end of a terminated one, else its end date.
 *
 * @param contract - The contract.
 * @returns The last day, or `null` for an open-ended contract.
 */
function lastDay(contract: ServiceContract): LocalDate | null {
  return contract.termination?.date ?? contract.period.end
}

/**
 * Finds when an employee's continuous service began (HR plan 8.2 LB1, HR spec 9.4.5). Service is the
 * unbroken run of contracts that reaches the contract in force today: a contract that starts the day
 * after the previous one ended, or while it runs, continues the service; a gap of a day or more
 * starts a new one. Draft contracts never count, and the original hire date is not used because it
 * survives a rehire.
 *
 * @param contracts - The employee's contracts.
 * @param today - Today as a local date.
 * @returns First day of the current service, or `null` when no contract is in force today.
 */
export function serviceStart(
  contracts: ServiceContract[],
  today: LocalDate,
): LocalDate | null {
  const counted = contracts.filter((contract) => contract.status !== 'draft')
  const inForce = counted.filter((contract) => {
    const end = lastDay(contract)
    return contract.period.start <= today && (end === null || end >= today)
  })
  if (inForce.length === 0) {
    return null
  }
  let start = inForce.map((contract) => contract.period.start).sort()[0]!
  for (;;) {
    const dayBefore = addDays(start, -1)
    const earlier = counted.filter((contract) => {
      const end = lastDay(contract)
      return contract.period.start < start && (end === null || end >= dayBefore)
    })
    if (earlier.length === 0) {
      return start
    }
    start = earlier.map((contract) => contract.period.start).sort()[0]!
  }
}
