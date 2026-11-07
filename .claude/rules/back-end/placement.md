# Back End Code Placement

Where a helper, decorator or type lives decides who may depend on it. Pick the narrowest place that fits, and move code outward only when a second user needs it.

| Place | Alias | Put here | Rules |
|---|---|---|---|
| `apps/back-end/apps/utility/<area>/` | `@utility/<area>/*` | Generic back-end helpers any application can use: logger, history, database ports, filters, validation decorators. | No domain types (accounts, patients, models). Group by purpose (`validation`, `http`, `logger`), one folder per area. |
| `packages/shared-utils` | | Pure functions used by both the front end and the back end. | No Nest, `class-validator` or driver dependencies. |
| `apps/back-end/apps/<app>/src/<area>/` | | Code specific to one application or its transport, for example the gateway's HTTP adapters. | Name the folder by purpose (`http`, `account`). |
| `apps/back-end/apps/<context>/` | `@<context>/*` | Domain code of a bounded context (`identity`). | Stays transport-neutral: no HTTP, headers or Nest request types. |

## Rules

- Do not create folders named `common`, `shared`, `helpers` or `misc`. They collect unrelated code. Name the folder after what it holds.
- `apps/utility` must not import a domain context (`@identity/*`, `@repository/model/*` of one context). If a helper needs a domain type, it belongs in the application that owns the transport, or the type moves to `utility` when it is not a domain concept.
- Transport adapters that turn HTTP details into domain input (for example `toClientInfo` in the gateway's `http/`) stay in the application. Move them to `apps/utility/http/` when a second HTTP application needs them, together with the types they return.
- Validation decorators for DTOs go in `apps/utility/validation/`. If the front end needs the same check, extract the pure function to `packages/shared-utils` and keep the decorator in `utility`.
- Move code outward (app to `utility`, `utility` to `shared-utils`) when a second user exists, not in advance.
