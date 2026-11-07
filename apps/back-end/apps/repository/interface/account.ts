/**
 * Account summary embedded in other records, for example as `created_by`.
 *
 * @property id - Account identifier.
 * @property email - Account email address.
 * @property first_name - First name.
 * @property last_name - Last name.
 * @property authorize - Authorization entries; their shape is not defined yet.
 */
export interface IAccount {
  id: string
  email: string
  first_name: string
  last_name: string
  authorize: unknown[]
}
