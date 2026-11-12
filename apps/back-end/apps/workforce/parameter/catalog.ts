/**
 * Level a parameter value applies to.
 */
export type ParameterScopeKind =
  'tenant' | 'organization' | 'facility' | 'unit' | 'committee'

/**
 * Type of a parameter value and its limits (HR plan R2).
 */
export type ParameterType =
  | { kind: 'integer'; min: number; max: number }
  | { kind: 'decimal'; min: number; max: number }
  | { kind: 'integer_list' }
  | { kind: 'boolean' }
  | { kind: 'choice'; choices: readonly string[] }
  | { kind: 'profession_points' }

/**
 * One parameter of the catalog (HR specification 10).
 *
 * @property key - Parameter key, upper case with underscores.
 * @property type - Type of the value and its limits.
 * @property default - Value that applies when none is set.
 * @property scopes - Levels a value may be set at.
 * @property description - What the parameter does and which rule reads it.
 */
export interface ParameterDefinition {
  key: string
  type: ParameterType
  default: unknown
  scopes: readonly ParameterScopeKind[]
  description: string
}

const TENANT_ORG_FACILITY: readonly ParameterScopeKind[] = [
  'tenant',
  'organization',
  'facility',
]
const ALL_PLACES: readonly ParameterScopeKind[] = [
  'tenant',
  'organization',
  'facility',
  'unit',
]

/**
 * Every HR parameter that can be set, in the order of HR specification 10. The defaults are the
 * specification's; those it marks to verify are marked in the description. The limits only catch
 * typing mistakes, they are not legal limits.
 */
export const PARAMETER_CATALOG: readonly ParameterDefinition[] = [
  {
    key: 'LICENSE_ALERT_DAYS',
    type: { kind: 'integer_list' },
    default: [180, 90, 60, 30],
    scopes: TENANT_ORG_FACILITY,
    description:
      'Days before a licence expires at which an alert is sent (6.6).',
  },
  {
    key: 'SKP_REQUIRED_POINTS',
    type: { kind: 'profession_points' },
    default: [],
    scopes: ['tenant'],
    description:
      'Continuing-education points required per profession (HR-LIC-010). No default yet: verify the national requirement.',
  },
  {
    key: 'MAX_PRACTICE_LOCATIONS_MEDIS',
    type: { kind: 'integer', min: 1, max: 20 },
    default: 3,
    scopes: ['tenant'],
    description:
      'Most locations a medical practitioner may practise at (HR-LIC-007). Verify.',
  },
  {
    key: 'SPK_VALIDITY_YEARS',
    type: { kind: 'integer', min: 1, max: 10 },
    default: 3,
    scopes: TENANT_ORG_FACILITY,
    description:
      'Years a clinical appointment letter stays valid (HR-CRD-004). Verify.',
  },
  {
    key: 'RECREDENTIAL_LEAD_DAYS',
    type: { kind: 'integer', min: 1, max: 365 },
    default: 90,
    scopes: TENANT_ORG_FACILITY,
    description:
      'Days before an appointment ends at which re-credentialing starts (7.4.2).',
  },
  {
    key: 'MIN_ASSESSORS',
    type: { kind: 'integer', min: 1, max: 20 },
    default: 1,
    scopes: ['committee'],
    description:
      'Fewest assessors of a credentialing application, owned by each committee (7.4.1).',
  },
  {
    key: 'CREDENTIAL_SLA_DAYS',
    type: { kind: 'integer', min: 1, max: 365 },
    default: 14,
    scopes: TENANT_ORG_FACILITY,
    description:
      'Days a credentialing step may take before it is escalated (7.6).',
  },
  {
    key: 'TEMPORARY_PRIVILEGE_MAX_DAYS',
    type: { kind: 'integer', min: 1, max: 365 },
    default: 60,
    scopes: TENANT_ORG_FACILITY,
    description: 'Most days a temporary privilege lasts (7.4.4).',
  },
  {
    key: 'ROSTER_PERIOD',
    type: { kind: 'choice', choices: ['month', 'week', 'two_weeks'] },
    default: 'month',
    scopes: TENANT_ORG_FACILITY,
    description: 'Length of a roster period (8.2).',
  },
  {
    key: 'ROSTER_PUBLISH_LEAD_DAYS',
    type: { kind: 'integer', min: 0, max: 90 },
    default: 7,
    scopes: ALL_PLACES,
    description:
      'Days before a period starts by which its roster is published (8.4.1).',
  },
  {
    key: 'ROSTER_APPROVAL_REQUIRED',
    type: { kind: 'boolean' },
    default: true,
    scopes: ALL_PLACES,
    description:
      'Whether a roster needs approval before it is published (8.3).',
  },
  {
    key: 'ROSTER_LOOKAHEAD_DAYS',
    type: { kind: 'integer', min: 1, max: 90 },
    default: 14,
    scopes: ALL_PLACES,
    description:
      'Days ahead in which roster problems are flagged (HR-ROS-032).',
  },
  {
    key: 'MIN_REST_HOURS',
    type: { kind: 'decimal', min: 0, max: 24 },
    default: 8,
    scopes: ALL_PLACES,
    description: 'Fewest hours of rest between two shifts (HR-ROS-011).',
  },
  {
    key: 'MAX_WEEKLY_HOURS',
    type: { kind: 'decimal', min: 1, max: 168 },
    default: 40,
    scopes: ALL_PLACES,
    description: 'Most working hours in a week (HR-ROS-012). Verify.',
  },
  {
    key: 'MAX_OVERTIME_HOURS_DAY',
    type: { kind: 'decimal', min: 0, max: 24 },
    default: 4,
    scopes: ALL_PLACES,
    description: 'Most overtime hours in a day (HR-ROS-013). Verify.',
  },
  {
    key: 'MAX_OVERTIME_HOURS_WEEK',
    type: { kind: 'decimal', min: 0, max: 168 },
    default: 18,
    scopes: ALL_PLACES,
    description: 'Most overtime hours in a week (HR-ROS-013). Verify.',
  },
  {
    key: 'MAX_CONSECUTIVE_NIGHTS',
    type: { kind: 'integer', min: 1, max: 14 },
    default: 3,
    scopes: ALL_PLACES,
    description: 'Most night shifts in a row (HR-ROS-015).',
  },
  {
    key: 'CREDENTIALING_SCOPE',
    type: { kind: 'choice', choices: ['facility', 'group'] },
    default: 'facility',
    scopes: ['tenant'],
    description:
      'Whether each facility credentials its own staff or the group does it centrally (7, HR-CRD-009).',
  },
  {
    key: 'IMPORT_MAX_ROWS',
    type: { kind: 'integer', min: 1, max: 100000 },
    default: 5000,
    scopes: ['tenant'],
    description: 'Most rows of one roster import (8.4.1).',
  },
  {
    key: 'IMPORT_MAX_ERRORS',
    type: { kind: 'integer', min: 1, max: 10000 },
    default: 500,
    scopes: ['tenant'],
    description: 'Most row errors reported by one roster import (8.4.1).',
  },
]

/**
 * Finds a parameter of the catalog.
 *
 * @param key - Parameter key.
 * @returns The definition, or `undefined` when the key is not in the catalog.
 */
export function findParameter(key: string): ParameterDefinition | undefined {
  return PARAMETER_CATALOG.find((definition) => definition.key === key)
}
