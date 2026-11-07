---
name: pr
description: Push the current branch and open a pull request that follows the project's Git workflow standard. Use only when the user explicitly asks to open or update a pull request.
disable-model-invocation: true
---

# Pull request procedure

The standard lives in `.claude/rules/git-workflow.md`. Read sections 1, 3, 4 and 5 before you start, and follow them.

1. **Branch.** Run `git branch --show-current`. Stop if it is `main`: PRs come from feature branches. The branch name must match `<type>/<scope>-<description>`.
2. **Clean tree.** Run `git status`. If there are uncommitted changes, ask the user whether to commit them first (use the `commit` skill). Do not commit them silently.
3. **Up to date.** Run `git fetch origin` and check whether `main` moved. If the branch is behind, rebase on `origin/main` and resolve conflicts, then re-run the checks.
4. **Signed commits.** Run `git log origin/main..HEAD --format='%h %G? %s'`. Every commit must show `G`. If one does not, tell the user and do not push.
5. **Checks.** Run `pnpm lint`, `pnpm type-check` and `pnpm test` from the repository root. If one fails, stop and report. Do not open the PR with known failures unless the user explicitly says so, and then open it as a draft and say what fails.
6. **Review the range.** Run `git log origin/main..HEAD --oneline` and `git diff origin/main...HEAD --stat`. If the diff is larger than about 400 changed lines (excluding generated files), suggest splitting it.
7. **Title and body.** Title: `type(scope): subject` (it becomes the squash commit on `main`). Body: fill every section of `.github/pull_request_template.md` from the real diff and the checks you ran. Do not tick a checklist item you did not verify. Never include secrets or real patient data.
8. **Confirm.** Show the user the title, body and target branch, and wait for a clear yes. Pushing and opening a PR are outward-facing.
9. **Push and open.** Run `git push -u origin <branch>` (never `--force`), then `gh pr create --base main --draft --title "<title>" --body-file <file>`. Open as a draft unless the user says the work is ready.
10. **Report.** Give the PR link and the check results. Say plainly what was not verified.

Do not merge, approve, close or force-push. Do not change repository settings.
