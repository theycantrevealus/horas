# Task state: <branch>

Updated: <YYYY-MM-DD HH:mm> by <agent or developer>
Rules: `.claude/rules/task-state.md`

## Task

- Goal: <one or two sentences: what done looks like>
- Branch: `<branch>`, cut from `origin/main` at `<hash>`
- Plan: `.claude/design/plans/<file>.md` (or none)
- Series: `.claude/state/series--<master plan>.md`, step <id> (or none)
- PR: <url or none>

## Done

- <step> (commit `<hash>`)

## In progress

- <step>: <what is written, what is missing, which file>

## Next

1. <next step>

## Decisions made in chat

| Id | Decision | Doc |
|---|---|---|
| <id> | <decision and reason> | <path, or pending> |

## Open questions

- <question>: <who must answer, what it blocks>

## Constraints from the developer

- <correction or "don't do" note, with date>

## Verification

| Command | Result | When |
|---|---|---|
| `pnpm type-check` | <passed / failed: summary / not run> | <commit or date> |
