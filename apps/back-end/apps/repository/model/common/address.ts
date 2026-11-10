/**
 * One country-specific administrative level, for example a kelurahan, kecamatan or county.
 *
 * @property level - Level number, 1 being the largest below the subdivision.
 * @property code - Official code, for example a Kemendagri code.
 * @property name - Name of the area.
 */
export interface AddressAdminLevel {
  level: number
  code?: string
  name: string
}

/**
 * Postal address usable in any country.
 *
 * @property use - Purpose of the address.
 * @property lines - Street, building, RT/RW.
 * @property admin_levels - Local administrative levels.
 * @property city - City or town.
 * @property subdivision - ISO 3166-2 code, for example `ID-JK`.
 * @property postal_code - Postal code.
 * @property country - ISO 3166-1 alpha-2 code.
 */
export interface Address {
  use: 'home' | 'work' | 'temp' | 'mailing'
  lines: string[]
  admin_levels: AddressAdminLevel[]
  city?: string
  subdivision?: string
  postal_code?: string
  country: string
}
