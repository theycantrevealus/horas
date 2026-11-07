import { type AccountHold } from '@repository/model/account'
import { deriveStatus, unusableReason } from './account-status'

/**
 * Builds a hold for tests.
 *
 * @param kind - Hold kind.
 * @param reason - Hold reason.
 * @returns The hold.
 */
function hold(
  kind: AccountHold['kind'],
  reason: AccountHold['reason'] = 'administrative',
): AccountHold {
  return {
    kind,
    reason,
    source: 'identity',
    source_ref: null,
    placed_by: { account_id: 'a', display_name: 'A', kind: 'account' },
    placed_at: new Date(),
  }
}

describe('deriveStatus', () => {
  it('lets a disable hold win over a suspend hold', () => {
    expect(
      deriveStatus([hold('suspend'), hold('disable')], 'active', true),
    ).toBe('disabled')
  })

  it('suspends while any suspend hold remains', () => {
    expect(deriveStatus([hold('suspend')], 'active', true)).toBe('suspended')
  })

  it('returns to active, or to pending activation if the user never signed in, once holds are gone', () => {
    expect(deriveStatus([], 'suspended', true)).toBe('active')
    expect(deriveStatus([], 'suspended', false)).toBe('pending_activation')
  })

  it('never reopens a closed account', () => {
    expect(deriveStatus([], 'closed', true)).toBe('closed')
  })

  it('keeps other statuses when there are no holds', () => {
    expect(deriveStatus([], 'pending_activation', false)).toBe(
      'pending_activation',
    )
  })
})

describe('unusableReason', () => {
  const now = new Date('2026-06-01T00:00:00Z')
  const open = { not_before: null, expires_at: null }

  it('allows active and pending accounts', () => {
    expect(unusableReason({ status: 'active', validity: open }, now)).toBeNull()
    expect(
      unusableReason({ status: 'pending_activation', validity: open }, now),
    ).toBeNull()
  })

  it.each(['closed', 'disabled', 'suspended', 'locked'] as const)(
    'refuses a %s account',
    (status) => {
      expect(unusableReason({ status, validity: open }, now)).toBe(status)
    },
  )

  it('honours the validity period', () => {
    expect(
      unusableReason(
        {
          status: 'active',
          validity: { not_before: new Date('2026-07-01'), expires_at: null },
        },
        now,
      ),
    ).toBe('not_yet_valid')
    expect(
      unusableReason(
        { status: 'active', validity: { not_before: null, expires_at: now } },
        now,
      ),
    ).toBe('expired')
  })
})
