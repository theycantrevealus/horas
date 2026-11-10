# Back End Authentication and Access Control

The identity context (`apps/back-end/apps/identity`, alias `@identity/*`) authenticates callers and decides what they may do. Design: `.claude/design/account-and-workforce-collections.md` (sections 5 and 6). Repository rules: `database.md`. Logging rules: `logging.md`.

## 1. Layout

| Path | Contents |
|---|---|
| `identity.module.ts` | `IdentityModule`: services and the six identity repository modules. |
| `authentication/` | `AuthenticationService` (login, refresh, logout, password change, token check), `TokenService`, `PasswordHasher`, `CredentialService`, `SecurityAuditService`, `password-policy.ts`. |
| `authorization/` | `AuthorizationService` (permissions from role bindings), `RoleService`. |
| `account/` | `AccountService` (provisioning, holds, resets, role bindings), `account-status.ts`, `login-identifier.ts`. |
| `guard/` | `AuthenticationGuard`, `PermissionsGuard` and the decorators. |
| `permission.ts` | The permission catalog (`PERMISSIONS`). |
| `identity.error.ts`, `identity.filter.ts` | Transport-neutral business errors and the filter that maps them to HTTP. |
| `testing/in-memory.ts` | In-memory repositories for tests that need real services without MongoDB. |

The HTTP side is in the gateway: `gateway_back_office/src/account/` (`AuthController`, `AccountController`, `RoleController`). `gateway_hr` reuses the guards, decorators, permission catalog and exception filter of this context but has no login route.

## 2. Protecting a route

Both guards are global (`APP_GUARD`, in this order) in the application's root module. **Every route requires a signed-in caller unless it is `@Public()`.**

```ts
@Controller({ path: 'lov', version: '1' })
export class LovController {
  @Get(':group')
  @RequirePermissions(PERMISSIONS.LOV_READ)   // all listed permissions are required
  getByGroup(@Param('group') group: string) { ... }
}
```

- `@Public()`: open route (login, refresh, health). Use it sparingly.
- `@RequirePermissions(...)`: tenant-wide permissions from the catalog. Without it, a signed-in caller is enough.
- `@CurrentUser()`: the `AuthenticatedUser` (`id`, `tenant_id`, `employee_id`, ...). Always pass `user.tenant_id` to services and refuse records of other tenants as "not found". Never take the tenant or `employee_id` from the request body.
- `@AllowPasswordChange()`: reachable while the password must be changed (only change-password, logout and `me`).
- New permission: add it to `PERMISSIONS` in `permission.ts`. Roles can only hold catalog permissions.
- `AuthenticationGuard` sets `request.user`; `RequestLoggingInterceptor` turns it into the actor of change records. Do not build actors by hand in controllers.

## 3. Tokens and sessions

- Access token: JWT (HS256, `typ: at+jwt`), 15 minutes by default, claims `sub`, `tid`, `emp`, `authz`, `sid`, `pwd`. Secret in `auth.env` (`AUTH_JWT_SECRET`, at least 32 characters, no default). Use asymmetric keys before a service outside the trusted deployment verifies tokens. `gateway_hr` verifies tokens with the same secret as `gateway_back_office` because both run as one trusted deployment (`workforce.md` 2); a third service, or a different trust boundary, needs asymmetric keys first.
- Refresh token: 256-bit random, stored as SHA-256, **single use**. Each refresh creates a new session in the same family. Presenting a used token revokes the whole family and writes `token_reuse_detected`.
- `authz_version` on the account is part of the token. Changing roles, holds or status increments it; the next request answers `401 token_stale` and the client refreshes. Services that change access must increment it in the same transaction.
- A session replaced by rotation keeps its access token valid until it expires, so requests in flight do not fail. Explicit revocation (logout, hold, password change or reset) ends the whole family.
- `Cache-Control: no-store` on every response that carries tokens or a temporary password.

## 4. Passwords and lockout

- Argon2id (19 MiB, 2 passes, 1 lane), PHC string with parameters; rehashed at login when parameters rise.
- Policy: minimum length (`AUTH_PASSWORD_MIN_LENGTH`, 12), maximum 128, no name or login identifier inside it, not one of the last `AUTH_PASSWORD_HISTORY_COUNT` passwords. No composition rules.
- Accounts are created with a generated temporary password (shown once, `must_change`). The only allowed action is changing it.
- Failed logins are counted with one atomic update; `AUTH_MAX_FAILED_ATTEMPTS` failures lock the account for `AUTH_LOCKOUT_MINUTES`. After the lockout ends, one more wrong password locks it again.
- Unknown identifier, wrong password and lockout answer with the same body and take the same time. Only after a correct password does the service say why an account cannot sign in (`account_unavailable`).
- Never log or store attempted passwords or login names. `security_events` holds identifiers, reason codes, a hash of the user agent and the client address, and expires by TTL.

## 5. Not built yet (decisions)

- **Multi-factor authentication.** Accounts with `mfa_required` cannot sign in (`mfa_unavailable`) instead of skipping the second factor.
- **SSO / federated identities** and the identity-provider collections.
- **Account requests and approval** (design 6.10). `POST /v1/accounts` creates accounts directly. It does not check that the employee exists in HRM (no `WORKFORCE_DIRECTORY` port yet), and a `disable` hold can only be lifted through that missing flow.
- **Scoped permissions.** Only `tenant`-scope bindings grant permissions. Organization, facility and unit bindings grant nothing until a scope-aware check exists, so a unit-level role can never act tenant-wide.
- **Two-person approval** of privileged roles (`approved_by`), role derivation from HR assignments, HR event consumers and the reconciliation job.
- **Request throttling by address.** Only per-account lockout exists; add rate limiting at the gateway or proxy. Behind a proxy, configure Fastify `trustProxy` so the logged address is the client's.
- **First administrator.** Nothing creates the first account, role and binding. Insert them with a seed script or `mongosh` for a new tenant.
