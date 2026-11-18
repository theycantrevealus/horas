---
name: handoff
description: Write everything a new chat needs into the task state files (the branch file and, for a plan built over several branches, the series file). Use when the developer asks to hand off, save state or wrap up, before the context is nearly full, before ending a turn that leaves work unfinished, and when a series step is finished.
---

# Hand off a task

The standard lives in `.claude/rules/task-state.md`. Read it before you start.

1. **Find the files.** Run `git branch --show-current`. The branch file is `.claude/state/<branch>.md` with `/` replaced by `--`; create it from `.claude/state/TEMPLATE.md` if missing. If its `Series:` line names a series, or the chat worked on a step of a master plan, open that series file too (create it from `SERIES-TEMPLATE.md` if missing).
2. **Collect facts.** Run `git fetch origin`, `git status --short`, `git log --oneline origin/main..HEAD` and `git diff --stat`. Read the plan the files point to. For a series, compare the master plan on `origin/main` (`git show origin/main:<path>`) with what is really merged (`git log --oneline origin/main`).
3. **Go through the chat.** List everything that exists only in this conversation: decisions and their reasons, answered and open questions, corrections from the developer, approaches tried and rejected, and the results of commands you ran. If the chat covered several steps or branches, go through each.
4. **Sort each item.** Detail of this step goes into the branch file. What a later step needs (conventions, constraints from the developer, undocumented decisions that apply to later steps, documentation that is out of date) goes into the series file. When in doubt whether it matters later, put it in the series file.
5. **Update every section.** Branch file: finished steps with commit hashes, "In progress" precise enough to continue without the chat (file, function, what is missing), ordered "Next". Series file: "Position", one row per finished step, and every difference between the master plan and the repository under "Documentation to update".
6. **Do not invent.** Write only what happened in this chat or is in the repository. Unknown results are `not run`, unknown reasons `reason unknown`.
7. **Report.** Show the paths of the files you updated and a short summary (done, next, open questions, constraints). Tell the developer how to start the next chat: `Resume the task on branch <branch>.`, or for the next step of a series, `Start the next step of <master plan>.`

Do not commit the state files; they are ignored by git.
