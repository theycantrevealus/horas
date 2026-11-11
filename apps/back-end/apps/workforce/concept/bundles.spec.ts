import { BUNDLE_NAMES, BUNDLES, findBundle } from './bundles'
import { normalizeProperties } from './properties'
import { satisfiesSystemRules } from './system-rules'
import { normalizeLocalizedTexts } from '../structure/localized-texts'

const CONCEPT_CODE = /^[a-z0-9][a-z0-9._-]{0,63}$/
const SYSTEM_NAME = /^[a-z0-9][a-z0-9._-]{1,63}$/

describe('bundles', () => {
  it('knows the Indonesian bundle and nothing else yet', () => {
    expect(BUNDLE_NAMES).toEqual(['id'])
    expect(findBundle('id')?.length).toBeGreaterThan(0)
    expect(findBundle('xx')).toBeUndefined()
    expect(findBundle('constructor')).toBeUndefined()
    expect(findBundle('__proto__')).toBeUndefined()
  })

  describe.each(Object.entries(BUNDLES))('bundle %s', (_name, concepts) => {
    it('has valid systems and codes, and no code twice', () => {
      const seen = new Set<string>()
      for (const { system, code } of concepts) {
        expect(system).toMatch(SYSTEM_NAME)
        expect(code).toMatch(CONCEPT_CODE)
        const key = `${system}|${code}`
        expect(seen.has(key)).toBe(false)
        seen.add(key)
      }
    })

    it('gives every concept display text in Indonesian and English', () => {
      for (const { display } of concepts) {
        expect(
          normalizeLocalizedTexts(display, { maxItems: 10, maxLength: 200 }),
        ).not.toBeNull()
        expect(display.map(({ locale }) => locale).sort()).toEqual([
          'en',
          'id-ID',
        ])
      }
    })

    it('gives every concept properties that pass the shape check and its system rules', () => {
      for (const { system, code, properties } of concepts) {
        expect(
          normalizeProperties(properties),
          `${system}|${code}`,
        ).not.toBeNull()
        expect(
          satisfiesSystemRules(system, properties),
          `${system}|${code}`,
        ).toBe(true)
      }
    })

    it('maps to well-formed codes in other systems', () => {
      for (const { mappings } of concepts) {
        expect(mappings.length).toBeLessThanOrEqual(10)
        for (const mapping of mappings) {
          expect(mapping.system.length).toBeGreaterThan(0)
          expect(mapping.code.length).toBeGreaterThan(0)
        }
      }
    })

    it('refers only to committees and workforce categories that the bundle defines', () => {
      const codes = (system: string) =>
        concepts
          .filter((concept) => concept.system === system)
          .map((concept) => concept.code)
      const categories = codes('id.workforce-category')
      const committees = codes('id.committee')
      for (const { system, properties } of concepts) {
        if (
          system === 'id.workforce-category' &&
          properties.credentialing_committee !== null
        ) {
          expect(committees).toContain(properties.credentialing_committee)
        }
        if (system === 'id.profession') {
          expect(categories).toContain(properties.workforce_category)
        }
      }
    })

    it('covers every system the HR specification names', () => {
      const systems = new Set(concepts.map((concept) => concept.system))
      expect([...systems].sort()).toEqual([
        'id.assignment-kind',
        'id.committee',
        'id.committee-role',
        'id.employment-type',
        'id.license-type',
        'id.profession',
        'id.unit-type',
        'id.workforce-category',
      ])
    })
  })
})
