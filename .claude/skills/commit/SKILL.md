---
name: commit
description: Create a git commit that follows the project's Git workflow standard (Conventional Commits, required scope, pre-commit checks). Use when the user asks to commit changes.
---

# Commit procedure

The standard lives in `.claude/rules/git-workflow.md`. Read sections 1, 2, 3 and 5 before you start, and follow them. Do not rely on memory of them.

1. **Branch.** Run `git fetch origin` and `git branch --show-current`. If it is `main`, or `gh pr list --head <branch> --state merged --json number` is not empty (the branch was already merged), stop and use the `start` skill to create a fresh branch from `origin/main` first. Do not commit new work onto a finished branch. If `git rev-list --count HEAD..origin/main` is not `0`, tell the user the branch is behind `main`; do not change anything on your own.
2. **Inspect.** Run `git status` and `git diff` (and `git diff --staged`). Understand the whole change. If it mixes unrelated purposes, propose splitting it into several commits and commit them one at a time.
3. **Exclude.** Never stage `.env` files, `logs/`, `dist/`, secrets or unrelated formatting changes. Stage files **by name**, never with `git add -A` or `git add .`.
4. **Check.** Run `pnpm lint`, `pnpm type-check` and `pnpm test` from the repository root (section 3). If a check fails, stop, report the output and fix the cause. Do not commit failing work, and do not use `--no-verify`.
5. **Docs.** If the change affects a collection, repository, permission or business rule, confirm the matching file in `.claude/design/` or `.claude/business/` is updated in the same change.
6. **Message.** Write `type(scope): subject` using the types and the scope table in section 2. Imperative subject, at most 72 characters, no trailing period. Add a body explaining *why* when the change is not trivial. Add `!` and a `BREAKING CHANGE:` footer for breaking changes. Base it on the actual diff.
7. **Signing.** Run `git config commit.gpgsign`. It must print `true` (commits to `main` require verified signatures, section 2.3). If not, stop and ask the user to configure signing. Never pass `--no-gpg-sign`.
8. **Commit.** Pass the message with a heredoc. End it with the attribution line your tool requires. If the `commit-msg` hook rejects the message, fix the message and create a new commit.
9. **Report.** Show the resulting `git log -1 --stat --format='%h %G? %s'` (the signature flag must be `G`), and state which checks ran and passed. Say plainly if any check was skipped or failed.

Never push in this skill. Pushing belongs to the `pr` skill and only when the user asks.
