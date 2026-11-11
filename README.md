# HORAS — Hospital Information Management System

HORAS is a hospital ERP. It is built first for hospitals in Indonesia and designed to serve hospitals in other countries: stored data does not depend on one country's codes, time zone or identifiers.

## Overview

| Area | Technology |
|---|---|
| Monorepo | pnpm workspaces |
| Language | TypeScript |
| Back end | NestJS monorepo, MongoDB through Mongoose (behind repositories), Vitest, oxlint |
| Front end | Vue 3, Vite, Pinia, Vue Router, Cypress |
| Commits | Conventional Commits, checked by commitlint through husky |

```
apps/
  back-end/    NestJS applications (gateways, worker) and bounded contexts
  front-end/   Vue application
packages/
  shared-types/    Types shared by front end and back end
  api-contracts/   API contracts
  shared-utils/    Pure functions shared by front end and back end
.claude/
  rules/       Engineering standards (source of truth)
  business/    Business specifications and glossary
  design/      Collection and endpoint designs, build plans
  skills/      Claude Code skills for this project
```

## Getting started

Requirements:

- Node.js `^22.18.0`
- pnpm `>=10.5.0`
- MongoDB running as a replica set (a single-node replica set is enough for local development). Transactions need it.

```bash
pnpm install
```

The back end reads its settings from `apps/back-end/environment/<environment>/*.env` (see `.claude/rules/back-end/stack.md` section 3).

| Command (repository root) | Does |
|---|---|
| `pnpm dev:gateway` | Runs the back-office gateway with reload. |
| `pnpm dev:hr` | Runs the HR gateway with reload (port 3001). |
| `pnpm dev:worker` | Runs the worker with reload. |
| `pnpm dev:front-end` | Runs the front end. |
| `pnpm lint` | Lints every package. |
| `pnpm type-check` | Type-checks every package. |
| `pnpm test` | Runs every test suite. |

## Contributing

The full standards live in `.claude/rules/`. This section is a summary; when it and a rule file disagree, the rule file wins.

Before you start, read:

- [`engineering-workflow.md`](.claude/rules/engineering-workflow.md): how to inspect, plan, change and report.
- [`git-workflow.md`](.claude/rules/git-workflow.md): branches, commits and pull requests.
- [`typescript.md`](.claude/rules/typescript.md) and the area rules in [`back-end/`](.claude/rules/back-end/) or [`front-end/`](.claude/rules/front-end/).
- The business specification and design documents of the module you work on, in [`.claude/business/`](.claude/business/) and [`.claude/design/`](.claude/design/).

### Branches

- `main` is protected. Never commit or push to it directly.
- Every task gets a new branch cut from the latest `origin/main`:

  ```bash
  git fetch origin
  git switch -c <type>/<scope>-<short-description> --no-track origin/main
  ```

- Name branches `<type>/<scope>-<short-description>`, for example `feat/identity-authentication`.
- Catch up with `main` by merging `origin/main`, never by rebasing a pushed branch.
- Do not reuse a branch after its pull request was merged.

### Commits

- Format: `type(scope): subject`. Imperative, lowercase, no trailing period, at most 72 characters. The scope is required.
- Types: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `build`, `ci`, `chore`, `revert`.
- Scopes: `identity`, `workforce`, `gateway`, `gateway-hr`, `worker`, `repository`, `history`, `utility`, `config`, `front-end`, `shared-types`, `api-contracts`, `shared-utils`, `deps`, `repo` (see `git-workflow.md` 2.2 for what each covers).
- One logical change per commit. Explain *why* in the body when the change is not trivial.
- **Every commit must be signed** (`git config commit.gpgsign true`). `main` rejects unsigned commits.
- Never commit secrets, `.env` files, `logs/`, `dist/`, personal data or real hospital data. Stage files by name.
- Do not bypass hooks with `--no-verify`.

### Pull requests

1. Run the checks from the repository root and fix every failure:

   ```bash
   pnpm lint
   pnpm type-check
   pnpm test
   ```

2. Merge `origin/main` into your branch if `main` moved.
3. Open the PR against `main`, as a **draft** while work is in progress. The title follows the commit format; PRs are squash-merged, so it becomes the commit on `main`.
4. Fill in every section of the PR template. Keep the diff around 400 changed lines or fewer.
5. Code and documentation changes go in separate PRs.
6. At least one code-owner approval and green CI are required. Address review comments with new commits, not force-pushes.

## Claude Code skills

If you use [Claude Code](https://claude.com/claude-code), this repository includes skills that apply the rules above for you. Type the command in a Claude Code session opened at the repository root.

| Skill | Command | What it does | When to use it |
|---|---|---|---|
| `start` | `/start` | Checks the working tree is clean, fetches, and creates a correctly named branch from the latest `origin/main`. | At the beginning of every new task. |
| `commit` | `/commit` | Inspects the diff, runs lint, type-check and tests, writes a Conventional Commit message and makes a signed commit. Never pushes. | When a logical change is ready to commit. |
| `pr` | `/pr` | Checks branch, signatures and up-to-dateness, runs the checks, fills the PR template from the real diff, and opens a draft PR after you confirm. | When you want to open a pull request. Runs only when you type it. |
| `review` | `/review`, `/review <PR#>` | Reviews your branch or a pull request against the HORAS rules (tenant isolation, repositories, change history, logging, security, tests, business fit) and lists findings by severity. Runs locally; reads the PR from GitHub with `gh`. | When you want a review. Runs only when you type it. |

Typical flow:

```
/start  →  write code and tests  →  /commit  →  /pr
```

`/review` options:

- `/review`: review the current branch against `origin/main`.
- `/review <PR#>`: review a pull request without checking it out.
- `--deep`: also run lint, type-check and tests on the PR in a temporary worktree.
- `--comment`: post the findings as inline comments on the PR. Claude shows you the comments and posts them only after you confirm. It never approves, requests changes or merges.

Reviews are never automatic: nothing runs in CI, and each review uses the Claude usage of the person who runs it.

## Security

See [`SECURITY.md`](SECURITY.md).
