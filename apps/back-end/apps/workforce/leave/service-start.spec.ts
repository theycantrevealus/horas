import { type EmploymentContract } from '@repository/model/employment-contract'
import { serviceStart, type ServiceContract } from './service-start'

/**
 * Builds a contract for the service rule.
 *
 * @param start - First day.
 * @param end - Last day, or `null` for open-ended.
 * @param override - Status and termination.
 * @returns The contract.
 */
function contract(
  start: string,
  end: string | null,
  override: Partial<Pick<EmploymentContract, 'status' | 'termination'>> = {},
): ServiceContract {
  return {
    period: { start, end },
    status: 'active',
    termination: null,
    ...override,
  }
}

describe('serviceStart', () => {
  const today = '2026-11-19'

  it('is the start of the contract in force today', () => {
    expect(serviceStart([contract('2024-03-01', null)], today)).toBe('2024-03-01')
  })

  it('continues a fixed-term contract renewed the day after the previous one ended', () => {
    const contracts = [
      contract('2024-01-01', '2024-12-31', { status: 'ended' }),
      contract('2025-01-01', '2025-12-31'),
    ]
    expect(serviceStart(contracts, '2025-06-01')).toBe('2024-01-01')
  })

  it('starts a new service after a gap of a day or more', () => {
    const contracts = [
      contract('2024-01-01', '2024-12-30', { status: 'ended' }),
      contract('2025-01-01', '2025-12-31'),
    ]
    expect(serviceStart(contracts, '2025-06-01')).toBe('2025-01-01')
  })

  it('walks back through a chain of renewals', () => {
    const contracts = [
      contract('2022-01-01', '2022-12-31', { status: 'ended' }),
      contract('2023-01-01', '2023-12-31', { status: 'ended' }),
      contract('2024-01-01', '2024-12-31', { status: 'superseded' }),
      contract('2025-01-01', null),
    ]
    expect(serviceStart(contracts, today)).toBe('2022-01-01')
  })

  it('counts the early end of a terminated contract, not its planned end', () => {
    const terminated = contract('2024-01-01', '2025-12-31', {
      status: 'terminated',
      termination: {
        date: '2024-06-30',
        reason: { system: 'id.termination-reason', code: 'resigned' },
        notes: null,
      },
    })
    expect(serviceStart([terminated, contract('2024-07-01', null)], today)).toBe('2024-01-01')
    expect(serviceStart([terminated, contract('2024-07-02', null)], today)).toBe('2024-07-02')
  })

  it('counts contracts that run in parallel from the earliest start', () => {
    const contracts = [contract('2024-01-01', null), contract('2025-01-01', '2025-12-31')]
    expect(serviceStart(contracts, '2025-06-01')).toBe('2024-01-01')
  })

  it('is null when no contract is in force today', () => {
    expect(serviceStart([], today)).toBeNull()
    expect(serviceStart([contract('2024-01-01', '2025-12-31', { status: 'ended' })], today)).toBeNull()
    expect(serviceStart([contract('2027-01-01', null)], today)).toBeNull()
  })

  it('never counts a draft contract', () => {
    expect(serviceStart([contract('2024-01-01', null, { status: 'draft' })], today)).toBeNull()
    const contracts = [
      contract('2024-01-01', '2024-12-31', { status: 'draft' }),
      contract('2025-01-01', null),
    ]
    expect(serviceStart(contracts, today)).toBe('2025-01-01')
  })
})
