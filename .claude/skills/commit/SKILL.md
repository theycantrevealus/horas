---
name: commit
description: Create a git commit that follows the project's Git workflow standard (Conventional Commits, required scope, pre-commit checks). Use when the user asks to commit changes.
---

# Commit procedure

The standard lives in `.claude/rules/git-workflow.md`. Read sections 1, 2, 3 and 5 before you start, and follow them. Do not rely on memory of them.

1. **Branch.** Run `git branch --show-current`. If it is `main`, create a branch named `<type>/<scope>-<description>` (section 1) before anything else.
2. **Inspect.** Run `git status` and `git diff` (and `git diff --staged`). Understand the whole change. If it mixes unrelated purposes, propose splitting it into several commits and commit them one at a time.
3. **Exclude.** Never stage `.env` files, `logs/`, `dist/`, secrets or unrelated formatting changes. Stage files **by name**, never with `git add -A` or `git add .`.
4. **Check.** Run `pnpm lint`, `pnpm type-check` and `pnpm test` from the repository root (section 3). If a check fails, stop, report the output and fix the cause. Do not commit failing work, and do not use `--no-verify`.
5. **Docs.** If the change affects a collection, repository, permission or business rule, confirm the matching file in `.claude/design/` or `.claude/business/` is updated in the same change.
6. **Message.** Write `type(scope): subject` using the types and the scope table in section 2. Imperative subject, at most 72 characters, no trailing period. Add a body explaining *why* when the change is not trivial. Add `!` and a `BREAKING CHANGE:` footer for breaking changes. Base it on the actual diff.
7. **Commit.** Pass the message with a heredoc. End it with the attribution line your tool requires. If the `commit-msg` hook rejects the message, fix the message and create a new commit.
8. **Report.** Show the resulting `git log -1 --stat`, and state which checks ran and passed. Say plainly if any check was skipped or failed.

Never push in this skill. Pushing belongs to the `pr` skill and only when the user asks.
