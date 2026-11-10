import { normalizeExternalIds } from './external-ids'

describe('normalizeExternalIds', () => {
  it('trims text and keeps order', () => {
    expect(
      normalizeExternalIds([
        { system: ' id.npwp ', value: ' 1 ' },
        { system: 'id.nib', value: '2' },
      ]),
    ).toEqual([
      { system: 'id.npwp', value: '1' },
      { system: 'id.nib', value: '2' },
    ])
  })

  it('accepts an empty list and exactly 20 entries', () => {
    expect(normalizeExternalIds([])).toEqual([])
    expect(
      normalizeExternalIds(
        Array.from({ length: 20 }, (_, i) => ({ system: `s${i}`, value: 'v' })),
      ),
    ).toHaveLength(20)
  })

  it.each([
    [
      '21 entries',
      Array.from({ length: 21 }, (_, i) => ({ system: `s${i}`, value: 'v' })),
    ],
    ['empty system', [{ system: ' ', value: 'v' }]],
    ['empty value', [{ system: 's', value: '' }]],
    [
      'repeated system',
      [
        { system: 's', value: '1' },
        { system: ' s', value: '2' },
      ],
    ],
  ])('returns null for %s', (_name, items) => {
    expect(normalizeExternalIds(items)).toBeNull()
  })
})
