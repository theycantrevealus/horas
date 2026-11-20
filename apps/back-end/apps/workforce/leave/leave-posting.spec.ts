import { type LeaveLedgerEntry } from '@repository/model/leave-ledger-entry'
import { heldDays } from './leave-posting'

/**
 * Builds the fields of a ledger entry that `heldDays` reads.
 *
 * @param kind - What the entry does.
 * @param days - Signed days.
 * @param override - Other fields.
 * @returns The entry.
 */
function entry(kind: LeaveLedgerEntry['kind'], days: number, override: Partial<LeaveLedgerEntry> = {}): LeaveLedgerEntry {
  return {
    kind,
    days,
    bucket: 'own',
    leave_type: { system: 'id.leave-type', code: 'tahunan' },
    period: { start: '2026-03-15', end: '2027-03-14' },
    ...override,
  } as LeaveLedgerEntry
}

describe('heldDays', () => {
  it('sums the uses of each bucket and ignores other kinds', () => {
    const held = heldDays([entry('grant', 12), entry('use', -1.5, { bucket: 'carry_over' }), entry('use', -2), entry('use', -0.5)])

    expect(held).toEqual([
      { leave_type: { system: 'id.leave-type', code: 'tahunan' }, period: { start: '2026-03-15', end: '2027-03-14' }, bucket: 'carry_over', days: 1.5 },
      { leave_type: { system: 'id.leave-type', code: 'tahunan' }, period: { start: '2026-03-15', end: '2027-03-14' }, bucket: 'own', days: 2.5 },
    ])
  })

  it('holds nothing once every use is reversed, and keeps what a partial reversal leaves', () => {
    expect(heldDays([entry('use', -3), entry('reversal', 3)])).toEqual([])
    expect(heldDays([entry('use', -3), entry('reversal', 1.5)])).toMatchObject([{ days: 1.5 }])
  })

  it('keeps leave types and periods apart', () => {
    const held = heldDays([entry('use', -2), entry('reversal', 2), entry('use', -1, { leave_type: { system: 'id.leave-type', code: 'menikah' } })])

    expect(held).toHaveLength(1)
    expect(held[0]).toMatchObject({ leave_type: { code: 'menikah' }, days: 1 })
  })
})
