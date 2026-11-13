---
name: start
description: Start a new task on a fresh branch cut from the latest origin/main. Use when the user starts a new task, feature or fix, before making any change.
---

# Start a task

The standard lives in `.claude/rules/git-workflow.md`. Read section 1 (Branches and Starting a task) before you start.

Every new task starts from the latest `main`, on its own branch. Never start a task on a branch that already carried earlier work.

1. **Check the tree.** Run `git status --short`. If there are uncommitted changes, stop and ask the user: commit them first (use the `commit` skill), stash them, or bring them along. Never carry them over silently.
2. **Decide if this is a new task.** If the user is continuing work on the current branch, do not use this skill: stay on it, run `git fetch origin`, and catch up by merging `origin/main` (section 1). Otherwise continue.
3. **Fetch.** Run `git fetch origin`.
4. **Name the branch.** Use `<type>/<scope>-<short-description>` (section 1), with the types and scopes of section 2. Ask the user if the type or scope is unclear. Check that it does not already exist: `git branch --list <name>` and `git ls-remote --heads origin <name>`.
5. **Create it from origin/main**, without tracking it, so a plain `git push` can never target `main`:

   ```bash
   git switch -c <branch> --no-track origin/main
   ```

6. **Verify.** Run `git log -1 --oneline` and confirm it is the tip of `origin/main`, and `git branch -vv` shows no upstream. Run `git config commit.gpgsign` and confirm it prints `true` (section 2.3); if not, tell the user.
7. **Task state.** Follow `.claude/rules/task-state.md`. Decide whether the task is a step of a series (a master plan in `.claude/design/plans/` built one branch per step); ask the developer if it is unclear. If it is, read `.claude/state/series--<master plan>.md` (create it from `SERIES-TEMPLATE.md` when missing), set its "Current step" to this step and branch, and follow its conventions and constraints. Create `.claude/state/<branch>.md` (`/` replaced by `--`) from `TEMPLATE.md`, with the `Series:` line filled in or `none`. Copy nothing from another branch's state file.
8. **Report.** Say which branch you created, the `origin/main` commit it starts from, the series step it belongs to (if any) and its constraints, and that the work can begin.

Do not push in this skill. The first `git push -u origin <branch>` happens in the `pr` skill, when the user asks.
