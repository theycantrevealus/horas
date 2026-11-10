import { satisfiesSystemRules, systemSuffix } from './system-rules'

describe('systemSuffix', () => {
  it.each([
    ['id.license-type', 'license-type'],
    ['us.license-type', 'license-type'],
    ['id.a.b', 'a.b'],
    ['employment-type', null],
    ['.x', null],
    ['x.', null],
  ])('%s gives %s', (system, expected) => {
    expect(systemSuffix(system)).toBe(expected)
  })
})

describe('satisfiesSystemRules', () => {
  const license = {
    eligibility_role: 'registration',
    requires_expiry_date: false,
    location_specific: false,
  }

  it('accepts any properties for a system without rules', () => {
    expect(satisfiesSystemRules('id.assignment-kind', {})).toBe(true)
    expect(satisfiesSystemRules('id.assignment-kind', { anything: 1 })).toBe(
      true,
    )
    expect(satisfiesSystemRules('isco-08', {})).toBe(true)
  })

  it('applies the same rules to every country prefix', () => {
    expect(satisfiesSystemRules('id.license-type', license)).toBe(true)
    expect(satisfiesSystemRules('us.license-type', license)).toBe(true)
    expect(satisfiesSystemRules('us.license-type', {})).toBe(false)
  })

  it.each([
    [
      'a missing required property',
      { requires_expiry_date: false, location_specific: false },
    ],
    ['a boolean given as text', { ...license, requires_expiry_date: 'false' }],
    [
      'an eligibility role outside the list',
      { ...license, eligibility_role: 'admin' },
    ],
    ['an empty text', { ...license, eligibility_role: '' }],
    [
      'an optional property of the wrong kind',
      { ...license, max_locations_parameter: 3 },
    ],
  ])('rejects %s for a licence type', (_name, properties) => {
    expect(satisfiesSystemRules('id.license-type', properties)).toBe(false)
  })

  it('accepts a null eligibility role and an optional property', () => {
    expect(
      satisfiesSystemRules('id.license-type', {
        ...license,
        eligibility_role: null,
      }),
    ).toBe(true)
    expect(
      satisfiesSystemRules('id.license-type', {
        ...license,
        max_locations_parameter: 'MAX_PRACTICE_LOCATIONS_MEDIS',
      }),
    ).toBe(true)
  })

  it('requires a boolean is_clinical and a committee that is text or null for workforce categories', () => {
    expect(
      satisfiesSystemRules('id.workforce-category', {
        is_clinical: true,
        credentialing_committee: 'komite_medik',
      }),
    ).toBe(true)
    expect(
      satisfiesSystemRules('id.workforce-category', {
        is_clinical: false,
        credentialing_committee: null,
      }),
    ).toBe(true)
    expect(
      satisfiesSystemRules('id.workforce-category', { is_clinical: true }),
    ).toBe(false)
    expect(
      satisfiesSystemRules('id.workforce-category', {
        is_clinical: 'yes',
        credentialing_committee: null,
      }),
    ).toBe(false)
  })

  it('does not allow null where only text is allowed', () => {
    expect(
      satisfiesSystemRules('id.profession', {
        workforce_category: 'tenaga_medis',
      }),
    ).toBe(true)
    expect(
      satisfiesSystemRules('id.profession', { workforce_category: null }),
    ).toBe(false)
    expect(satisfiesSystemRules('id.profession', {})).toBe(false)
  })

  it('checks employment types and unit types', () => {
    expect(
      satisfiesSystemRules('id.employment-type', {
        allows_probation: true,
        requires_end_date: false,
      }),
    ).toBe(true)
    expect(
      satisfiesSystemRules('id.employment-type', { allows_probation: true }),
    ).toBe(false)
    expect(
      satisfiesSystemRules('id.unit-type', { clinical_default: true }),
    ).toBe(true)
    expect(satisfiesSystemRules('id.unit-type', {})).toBe(false)
  })
})
