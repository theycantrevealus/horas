import { type LeaveLedgerEntry } from '@repository/model/leave-ledger-entry'
import { planUse, summarizeBalance } from './balance'

/**
 * Builds a ledger entry for the balance rules.
 *
 * @param kind - What the entry does.
 * @param days - Signed days.
 * @param bucket - Own or carried-over days.
 * @param expiresOn - Last day of carried-over days.
 * @returns The entry.
 */
function entry(
  kind: LeaveLedgerEntry['kind'],
  days: number,
  bucket: 'own' | 'carry_over' = 'own',
  expiresOn: string | null = null,
): Pick<LeaveLedgerEntry, 'kind' | 'days' | 'bucket' | 'expires_on'> {
  return { kind, days, bucket, expires_on: expiresOn }
}

describe('summarizeBalance', () => {
  it('is empty without entries', () => {
    expect(summarizeBalance([], 0)).toEqual({
      granted: 0,
      used: 0,
      carriedOver: 0,
      carriedOverExpiresOn: null,
      expired: 0,
      adjusted: 0,
      pending: 0,
      available: 0,
      carryOverLeft: 0,
      ownLeft: 0,
    })
  })

  it('sums a grant, a carry-over and uses split across the two buckets', () => {
    const summary = summarizeBalance(
      [
        entry('grant', 12),
        entry('carry_over', 3, 'carry_over', '2027-06-30'),
        entry('use', -3, 'carry_over'),
        entry('use', -1, 'own'),
      ],
      2,
    )

    expect(summary).toMatchObject({
      granted: 12,
      carriedOver: 3,
      carriedOverExpiresOn: '2027-06-30',
      used: 4,
      carryOverLeft: 0,
      ownLeft: 11,
      pending: 2,
      available: 9,
    })
  })

  it('counts a reversal back, an expiry out and an adjustment either way', () => {
    const summary = summarizeBalance(
      [
        entry('grant', 12),
        entry('use', -5),
        entry('reversal', 2),
        entry('expiry', -1.5),
        entry('adjustment', 3),
        entry('adjustment', -0.5),
      ],
      0,
    )

    expect(summary).toMatchObject({ used: 3, expired: 1.5, adjusted: 2.5, ownLeft: 12 - 5 + 2 - 1.5 + 3 - 0.5, available: 10 })
  })

  it('lets an HR adjustment take the balance below zero, and the pending days show as a negative available', () => {
    const summary = summarizeBalance([entry('grant', 2), entry('adjustment', -4)], 1)

    expect(summary).toMatchObject({ ownLeft: -2, available: -3 })
  })

  it('keeps half days exact', () => {
    const entries = Array.from({ length: 25 }, () => entry('use', -0.5))

    expect(summarizeBalance([entry('grant', 20), ...entries], 0)).toMatchObject({ used: 12.5, ownLeft: 7.5, available: 7.5 })
  })
})

describe('planUse', () => {
  const summary = (carryOverLeft: number, ownLeft: number) => ({
    granted: 0, used: 0, carriedOver: 0, carriedOverExpiresOn: null, expired: 0, adjusted: 0, pending: 0, available: carryOverLeft + ownLeft, carryOverLeft, ownLeft,
  })

  it('uses carried-over days before the days of the period', () => {
    expect(planUse(summary(3, 10), 4)).toEqual([
      { bucket: 'carry_over', days: 3 },
      { bucket: 'own', days: 1 },
    ])
    expect(planUse(summary(3, 10), 2)).toEqual([{ bucket: 'carry_over', days: 2 }])
    expect(planUse(summary(0, 10), 4)).toEqual([{ bucket: 'own', days: 4 }])
    expect(planUse(summary(2.5, 10), 3)).toEqual([
      { bucket: 'carry_over', days: 2.5 },
      { bucket: 'own', days: 0.5 },
    ])
  })

  it('never takes days from a carry-over bucket that is below zero', () => {
    expect(planUse(summary(-1, 10), 4)).toEqual([{ bucket: 'own', days: 4 }])
  })
})
