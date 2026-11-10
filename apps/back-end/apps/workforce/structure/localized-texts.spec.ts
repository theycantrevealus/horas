import { normalizeLocalizedTexts } from './localized-texts'

const limits = { maxItems: 3, maxLength: 10 }

describe('normalizeLocalizedTexts', () => {
  it('trims and keeps the entries', () => {
    expect(
      normalizeLocalizedTexts(
        [{ locale: ' id-ID ', text: ' RS Sehat ' }],
        limits,
      ),
    ).toEqual([{ locale: 'id-ID', text: 'RS Sehat' }])
  })

  it.each([
    ['no entry', []],
    [
      'too many entries',
      ['a1', 'b2', 'c3', 'd4'].map((locale) => ({ locale, text: 'x' })),
    ],
    ['bad language tag', [{ locale: 'indonesian_ID', text: 'x' }]],
    ['empty text', [{ locale: 'en', text: '  ' }]],
    ['too long text', [{ locale: 'en', text: 'x'.repeat(11) }]],
    [
      'same language twice, other case',
      [
        { locale: 'en-US', text: 'a' },
        { locale: 'EN-us', text: 'b' },
      ],
    ],
  ])('returns null for %s', (_name, items) => {
    expect(normalizeLocalizedTexts(items, limits)).toBeNull()
  })
})
