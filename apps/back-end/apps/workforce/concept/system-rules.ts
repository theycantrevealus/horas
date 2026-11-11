/**
 * What a required property of a known code system looks like.
 *
 * @property name - Property name.
 * @property kind - `boolean`, `text`, or `text_or_null`.
 * @property values - Allowed values for a text property, when it is a fixed list (`null` allowed
 * only for `text_or_null`).
 * @property required - Whether a concept of the system must carry it.
 */
export interface PropertyRule {
  name: string
  kind: 'boolean' | 'text' | 'text_or_null'
  values?: readonly (string | null)[]
  required: boolean
}

/**
 * Properties that later HR rules read, per code system. The key is the name after the country
 * prefix, so `id.license-type` and `us.license-type` follow the same rule (HR plan C6).
 */
export const SYSTEM_RULES: Readonly<Record<string, readonly PropertyRule[]>> = {
  'workforce-category': [
    { name: 'is_clinical', kind: 'boolean', required: true },
    { name: 'credentialing_committee', kind: 'text_or_null', required: true },
  ],
  'employment-type': [
    { name: 'allows_probation', kind: 'boolean', required: true },
    { name: 'requires_end_date', kind: 'boolean', required: true },
  ],
  'license-type': [
    {
      name: 'eligibility_role',
      kind: 'text_or_null',
      values: ['registration', 'practice_permit', null],
      required: true,
    },
    { name: 'requires_expiry_date', kind: 'boolean', required: true },
    { name: 'location_specific', kind: 'boolean', required: true },
    { name: 'max_locations_parameter', kind: 'text_or_null', required: false },
  ],
  'unit-type': [{ name: 'clinical_default', kind: 'boolean', required: true }],
  profession: [{ name: 'workforce_category', kind: 'text', required: true }],
}

/**
 * Returns the name of a code system without its country prefix: `license-type` for
 * `id.license-type`.
 *
 * @param system - Code system name.
 * @returns The part after the first dot, or `null` when the system has no prefix.
 */
export function systemSuffix(system: string): string | null {
  const dot = system.indexOf('.')
  return dot > 0 && dot < system.length - 1 ? system.slice(dot + 1) : null
}

/**
 * Tells whether one property value satisfies its rule.
 *
 * @param rule - The rule.
 * @param value - The value of the property.
 * @returns True when the value has the right kind and, for a fixed list, an allowed value.
 */
function satisfies(rule: PropertyRule, value: unknown): boolean {
  if (rule.kind === 'boolean') {
    return typeof value === 'boolean'
  }
  if (value === null) {
    return (
      rule.kind === 'text_or_null' &&
      (!rule.values || rule.values.includes(null))
    )
  }
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    (!rule.values || rule.values.includes(value))
  )
}

/**
 * Checks the properties of a concept against the rules of its code system. A system without
 * rules accepts any properties.
 *
 * @param system - Code system of the concept.
 * @param properties - Properties of the concept, already shape-checked.
 * @returns True when every required property is present and every present rule property is valid.
 */
export function satisfiesSystemRules(
  system: string,
  properties: Record<string, unknown>,
): boolean {
  const suffix = systemSuffix(system)
  const rules = suffix ? SYSTEM_RULES[suffix] : undefined
  if (!rules) {
    return true
  }
  return rules.every((rule) => {
    const present = Object.prototype.hasOwnProperty.call(properties, rule.name)
    return present ? satisfies(rule, properties[rule.name]) : !rule.required
  })
}
