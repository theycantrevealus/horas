/**
 * Channel or number to reach a person. Phone numbers are E.164, emails lower-case.
 *
 * @property system - Kind of channel.
 * @property value - The number or address.
 * @property use - Whether it is a work, home or mobile contact.
 * @property is_primary - Preferred contact of its kind.
 * @property verified_at - When the contact was confirmed, or `null`.
 */
export interface ContactPoint {
  system: 'phone' | 'email' | 'other'
  value: string
  use: 'work' | 'home' | 'mobile'
  is_primary: boolean
  verified_at: Date | null
}
