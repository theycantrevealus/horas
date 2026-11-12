import { normalizeBankAccounts } from './bank-accounts'
import { normalizeIdentifier } from './identifier-formats'
import { normalizeContacts } from '../employee/contacts'

describe('normalizeIdentifier', () => {
  it('accepts the known Indonesian formats, cleaned of separators', () => {
    expect(normalizeIdentifier('id.nik', '3174 0112 3456 7890')).toBe(
      '3174011234567890',
    )
    expect(normalizeIdentifier('id.npwp', '12.345.678.9-012.345')).toBe(
      '123456789012345',
    )
    expect(normalizeIdentifier('id.npwp', '1234567890123456')).toBe(
      '1234567890123456',
    )
    expect(normalizeIdentifier('id.bpjs-kesehatan', '0001234567890')).toBe(
      '0001234567890',
    )
    expect(normalizeIdentifier('id.bpjs-ketenagakerjaan', '12345678901')).toBe(
      '12345678901',
    )
  })

  it.each([
    ['id.nik', '317401123456789'],
    ['id.nik', '31740112345678901'],
    ['id.nik', '317401123456789X'],
    ['id.npwp', '12345678901234'],
    ['id.bpjs-kesehatan', '123'],
    ['id.bpjs-ketenagakerjaan', '123456789012'],
  ])('refuses %s value %s', (system, value) => {
    expect(normalizeIdentifier(system, value)).toBeNull()
  })

  it('applies the general rule to other systems: upper case letters and digits, 4 to 40', () => {
    expect(normalizeIdentifier('passport', ' a-1234567 ')).toBe('A1234567')
    expect(normalizeIdentifier('sg.nric', 's1234567d')).toBe('S1234567D')
    expect(normalizeIdentifier('passport', 'abc')).toBeNull()
    expect(normalizeIdentifier('passport', 'a'.repeat(41))).toBeNull()
    expect(normalizeIdentifier('passport', 'ab#1234')).toBeNull()
  })

  it('treats the same identifier written two ways as one', () => {
    expect(normalizeIdentifier('id.nik', '3174011234567890')).toBe(
      normalizeIdentifier('id.nik', '3174-0112-3456-7890'),
    )
  })
})

describe('normalizeBankAccounts', () => {
  const account = (override: object = {}) => ({
    bank: { system: 'id.bank', code: 'bca' },
    account_name: ' Siti Rahma ',
    account_number: '123 456-7890',
    swift_bic: null,
    currency: 'IDR',
    is_primary: true,
    ...override,
  })

  it('cleans the number, name and swift code', () => {
    expect(normalizeBankAccounts([account({ swift_bic: 'cenaidja' })])).toEqual(
      [
        {
          bank: { system: 'id.bank', code: 'bca' },
          account_name: 'Siti Rahma',
          account_number: '1234567890',
          swift_bic: 'CENAIDJA',
          currency: 'IDR',
          is_primary: true,
        },
      ],
    )
    expect(normalizeBankAccounts([])).toEqual([])
  })

  it.each([
    ['an empty name', { account_name: '  ' }],
    ['a name over 200 characters', { account_name: 'x'.repeat(201) }],
    ['a short number', { account_number: '1234' }],
    ['a number over 34 characters', { account_number: '1'.repeat(35) }],
    ['a number with symbols', { account_number: '12345#6789' }],
    ['a bad swift code', { swift_bic: 'ABC' }],
    ['an unknown currency', { currency: 'XXZ' }],
  ])('refuses %s', (_label, override) => {
    expect(normalizeBankAccounts([account(override)])).toBeNull()
  })

  it('needs exactly one primary account, refuses repeats and more than 5', () => {
    expect(normalizeBankAccounts([account({ is_primary: false })])).toBeNull()
    expect(
      normalizeBankAccounts([
        account(),
        account({ account_number: '9999999999' }),
      ]),
    ).toBeNull()
    expect(
      normalizeBankAccounts([account(), account({ is_primary: false })]),
    ).toBeNull()
    expect(
      normalizeBankAccounts(
        Array.from({ length: 6 }, (_, index) =>
          account({
            account_number: `1234567${index}`,
            is_primary: index === 0,
          }),
        ),
      ),
    ).toBeNull()
  })
})

describe('normalizeContacts', () => {
  it('defaults the use to the first allowed one and keeps a given allowed use', () => {
    const contacts = normalizeContacts(
      [
        { system: 'phone', value: '+628121234567' },
        { system: 'email', value: 'A@B.id', use: 'mobile' },
      ],
      ['home', 'mobile'],
      10,
    )

    expect(contacts?.map(({ use }) => use)).toEqual(['home', 'mobile'])
    expect(contacts?.[1].value).toBe('a@b.id')
  })

  it('refuses a use that is not allowed and more than the limit', () => {
    expect(
      normalizeContacts(
        [{ system: 'phone', value: '+628121234567', use: 'work' }],
        ['home', 'mobile'],
        10,
      ),
    ).toBeNull()
    expect(
      normalizeContacts(
        [
          { system: 'phone', value: '+628121234567' },
          { system: 'phone', value: '+628121234568' },
        ],
        ['home'],
        1,
      ),
    ).toBeNull()
  })
})
