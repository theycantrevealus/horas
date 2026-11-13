---
name: resume
description: Continue earlier work from its task state files. Use when the developer says continue, resume or next step, refers to an earlier chat, names a branch, plan or step in progress, or when the current branch has a state file in .claude/state/.
---

# Resume a task

The standard lives in `.claude/rules/task-state.md`. Read it before you start.

1. **Find the series and the branch.** From the developer's words, the current branch (`git branch --show-current`) and `.claude/state/`, work out which series (`series--<master plan>.md`) and which branch the work belongs to. If it is unclear, list the state files and ask.
2. **Read the series file first**, when there is one: position, finished steps, conventions, constraints, undocumented decisions, documentation to update, open questions. Then read the master plan it names.
3. **Read the branch.**
   - Continuing a branch: check it out only if the working tree is clean (`git status --short`), otherwise ask. Read `.claude/state/<branch>.md` (`/` replaced by `--`).
   - Starting the next step of a series: there is no branch yet. Use the `start` skill, which links the new branch to the series.
   - If an expected file does not exist, say so and ask whether to rebuild it from the plans and git history; do not guess silently.
4. **Read what they point to.** The step's plan, the design sections named in the decisions, and the rules of the area (`CLAUDE.md` lists them).
5. **Check against the repository.** Run `git fetch origin`, `git status --short`, `git log --oneline origin/main..HEAD` and `git log --oneline origin/main`. Every commit and PR marked done must exist. If the branch is behind `origin/main`, say so; do not merge on your own. Report every difference between the state files, the master plan and the repository, and ask how to proceed.
6. **Restate before acting.** Tell the developer in a few lines: the goal, the current step, what is done, the next action, the open questions and the constraints you will follow. Then continue, unless an open question blocks it; in that case ask it first.
7. **Keep it current.** From now on, update the state files as `.claude/rules/task-state.md` section 5 requires.
