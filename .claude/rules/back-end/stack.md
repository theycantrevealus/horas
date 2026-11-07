# Back End Stack

- Runtime: Node.js.
- Language: TypeScript.
- Framework: NestJS.
- Architecture: NestJS monorepo.
- Testing: Use vitest
- Lint: Use oxlint
- Database: MongoDB via Mongoose, behind repositories. See `database.md`.

## 1. General Style

- Use modules to define clear dependency boundaries.
- Use dependency injection instead of manually constructing application dependencies.
- Keep controllers thin.
- Keep transport-specific concerns out of domain logic.
- Use DTOs and the existing validation pipeline for incoming data.
- Follow existing exception-filter and interceptor conventions.
- Use configuration providers rather than reading environment variables throughout business logic.
- Avoid circular module dependencies.
- Use lifecycle hooks only when their behavior is necessary and clear.

## 2. Dependency Injection

Before adding a provider:

- Check whether an appropriate provider already exists.
- Verify that its owning module exports it when necessary.
- Import the owning module rather than duplicating the provider.
- Avoid registering multiple independent instances of a stateful provider unintentionally.
- Prefer scoped modules over `global: true`. Only `ConfigModule` and database connection modules are global.
- Bind abstractions with `Symbol` tokens and `useClass`, `useFactory` or `useValue`. Do not create providers manually with `new` or `moduleRef.create`.
- Repositories and database connections follow `database.md`.

## 3. Environment Variable

### 3.1 Environment selection

The target environment is selected by `NODE_ENV` in the run command of `package.json`. `apps/back-end/apps/utility/environment.ts` resolves it:

- `environmentName`: `NODE_ENV`, or `development` when it is unset or empty.
- `environmentIdentifier`: absolute path `<cwd>/environment/<environmentName>`. Back-end scripts must run with `apps/back-end` as the working directory.

### 3.2 Env file layout

All env files are stored in `apps/back-end/environment/<environment>/`, where `<environment>` is `development`, `preproduction` or `production`. The folder name must match the `NODE_ENV` value.

Group variables by purpose, one file per context, with the same file names in every environment folder:

- `application.env`: general application settings (`APP_NAME`, `APP_DB`).
- `mongo.env`: MongoDB connection settings (`MONGO_URL`, `MONGO_USER`, `MONGO_PASSWORD`, `MONGO_DB_NAME`).
- Further contexts follow the same pattern, for example `postgre.env` for PostgreSQL connection settings.

Do not put variables of one context in another context's file. Do not commit real secrets for `preproduction` or `production`.

### 3.3 Configuration modules

Configuration code lives in `apps/back-end/apps/configuration/` (alias `@configuration/*`). Each context has one file, named after its env file, that exports both:

- A Joi schema (`<Context>Schema`) that validates the required variables.
- A typed config factory (`<Context>Config`) created with `registerAs('<namespace>', ...)` that maps variables to a namespaced object (for example `app`, `mongo`).

`apps/configuration/index.ts` exports `ConfigSchema`, which merges every context schema using `Joi.object().concat(...)`.

### 3.4 Wiring into an application

Each application registers `ConfigModule.forRoot` once in its root module (see `GatewayBackOfficeModule`):

- `isGlobal: true`, so feature modules do not re-import `ConfigModule`.
- `envFilePath`: one entry per env file, built from `environmentIdentifier` (`${environmentIdentifier}/application.env`, and so on).
- `load`: the `registerAs` config factories.
- `validationSchema: ConfigSchema`, so the app fails at startup when a required variable is missing or invalid.

### 3.5 Consuming configuration

- Inject `ConfigService` and read values by namespace (for example `configService.get('mongo.url')`) or inject the typed config with `@Inject(MongoConfig.KEY)`. Never read `process.env` in services, controllers or domain logic.
- The only exceptions are the `registerAs` factories and bootstrap code in `main.ts`, which must stay minimal.
- Do not log secrets such as `MONGO_PASSWORD`.

### 3.6 Adding a new context

1. Create `environment/<environment>/<context>.env` for every environment.
2. Create `apps/configuration/<context>.ts` with the Joi schema and `registerAs` factory.
3. Concat the schema in `apps/configuration/index.ts`.
4. Add the file to `envFilePath` and the factory to `load` in each application that needs it.
5. If the context is a database connection, also follow `database.md` section 2.
