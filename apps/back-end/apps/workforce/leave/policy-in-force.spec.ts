import { type LeavePolicy } from '@repository/model/leave-policy'
import { versionsInForce } from './policy-in-force'

/**
 * Builds a policy version with only the fields the selection reads.
 *
 * @param code - Leave type code.
 * @param effectiveFrom - Start date of the version.
 * @returns The version.
 */
function version(code: string, effectiveFrom: string): LeavePolicy {
  return {
    id: `${code}@${effectiveFrom}`,
    leave_type: { system: 'id.leave-type', code },
    effective_from: effectiveFrom,
  } as LeavePolicy
}

describe('versionsInForce', () => {
  const versions = [
    version('sakit', '2030-01-01'),
    version('tahunan', '2020-01-01'),
    version('tahunan', '2099-01-01'),
    version('tahunan', '2027-01-01'),
  ]

  it('keeps, for each leave type, the version with the latest start on or before the date, ordered by type code', () => {
    expect(versionsInForce(versions, '2028-06-01').map((item) => item.id)).toEqual(['tahunan@2027-01-01'])
    expect(versionsInForce(versions, '2099-01-01').map((item) => item.id)).toEqual(['sakit@2030-01-01', 'tahunan@2099-01-01'])
  })

  it('includes a version on its start date and none before it', () => {
    expect(versionsInForce(versions, '2020-01-01').map((item) => item.id)).toEqual(['tahunan@2020-01-01'])
    expect(versionsInForce(versions, '2019-12-31')).toEqual([])
    expect(versionsInForce([], '2030-01-01')).toEqual([])
  })

  it('does not depend on the order of the input', () => {
    expect(versionsInForce([...versions].reverse(), '2028-06-01').map((item) => item.id)).toEqual(['tahunan@2027-01-01'])
  })
})
