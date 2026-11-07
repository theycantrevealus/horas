/**
 * The signed-in caller, put on `request.user` by `AuthenticationGuard`.
 * `id`, `display_name` and `kind` are also what `RequestLoggingInterceptor` turns into the actor
 * of change records, so history shows who acted.
 *
 * @property id - Account identifier (same as `account_id`; the interceptor reads `id`).
 * @property account_id - Account identifier.
 * @property tenant_id - Tenant of the account. Every query on tenant data must use it.
 * @property employee_id - Linked employee, set only by the server (`6.8`), or `null`.
 * @property display_name - Name to show in history.
 * @property kind - `service` for machine accounts, otherwise `account`.
 * @property session_id - Session the access token belongs to.
 * @property must_change_password - Whether the user must change the password before doing anything else.
 */
export interface AuthenticatedUser {
  id: string
  account_id: string
  tenant_id: string
  employee_id: string | null
  display_name: string
  kind: 'account' | 'service'
  session_id: string
  must_change_password: boolean
}
