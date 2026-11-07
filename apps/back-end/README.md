# @horas/back-end

NestJS (v12) monorepo for the HORAS back end.

| Project   | Path            | Default port            | Purpose                                     |
| --------- | --------------- | ----------------------- | ------------------------------------------- |
| `gateway` | `apps/gateway`  | `3000` (`PORT`)         | Public HTTP API entry point                 |
| `worker`  | `apps/worker`   | `3001` (`WORKER_PORT`)  | Background processing (transport TBD)       |

Shared Nest libraries go in `libs/` (`pnpm exec nest g library <name>`).

## Commands (run from this folder or with `pnpm --filter @horas/back-end <script>`)

| Script                         | Description                                |
| ------------------------------ | ------------------------------------------ |
| `start:dev` / `start:dev:worker` | Run gateway / worker in watch mode       |
| `build`                        | Build both apps with rspack into `dist/apps/*` |
| `start:prod` / `start:prod:worker` | Run the built gateway / worker         |
| `lint`                         | oxlint (type-aware)                        |
| `type-check`                   | `tsc --noEmit` for both apps               |
| `test` / `test:e2e` / `test:cov` | Vitest unit / e2e / coverage            |
