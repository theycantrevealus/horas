# Task State Across Chats

A chat's context is lost when it fills up or when a new chat starts. Rules, design and git history survive; what was decided, done and still open in the conversation does not. Every agent keeps that part in task state files, so a new chat continues exactly where the old one stopped, on the same branch or on the next branch of a longer plan.

## 1. Where information lives

| Kind | Place | Lifetime |
|---|---|---|
| Rules that apply to every task | `.claude/rules/` | Permanent, reviewed in PRs. |
| Approved decisions about data, endpoints and business behaviour | `.claude/design/`, `.claude/business/` | Permanent, reviewed in PRs. |
| Plans (scope, decisions to confirm, build order) | `.claude/design/plans/` | Permanent, reviewed in PRs. |
| **State of a series**: a plan carried out over several branches | `.claude/state/series--<plan>.md` | Until the whole plan is finished. Not committed. |
| **State of a branch**: the work in progress on one branch | `.claude/state/<branch>.md` | Until the branch is merged. Not committed. |
| The developer's personal preferences | Agent memory | Per developer. |

- State files are the only place for knowledge that exists only in a conversation. Never rely on a chat to remember a decision.
- A decision that must outlive the work moves into the matching design, business or plan document (a documentation PR; code and documentation never share a PR). Until then, the state file lists it with `doc: pending`.
- State files are not committed (`.gitignore`): they change every turn and would mix documentation into code PRs. They stay on the developer's machine; only `README.md` and the templates are committed.

## 2. Series

A **series** is any plan whose steps are built one after another, each on its own branch and PR: the `gateway_hr` endpoint groups today, and any later plan of the same shape (a front-end module built screen by screen, a migration done table by table). It does not matter how the plan names its steps.

- A series has a **master plan**, one file in `.claude/design/plans/` that lists the steps and their order (`2026-11-10-gateway-hr-plan.md`). The series file is named after it without the extension: `series--2026-11-10-gateway-hr-plan.md`.
- The series file holds what every later step needs and no single branch owns: the current and next step, one line per finished step (branch, PR, outcome), conventions settled for all steps, constraints from the developer, decisions not yet in a document, and the documentation still to update.
- A branch that carries one step names its series in its own state file (`Series:` line). A branch outside any series writes `Series: none`.
- The master plan on `main` is the reviewed record of progress; the series file is the working copy. When they disagree, the series file lists the difference under "Documentation to update" until a documentation PR fixes the plan.
- Start a series file when the second branch of a plan begins, or earlier when the developer says the plan runs over several branches. Start it from `.claude/state/SERIES-TEMPLATE.md`.

## 3. Branch state

- One file per branch: `.claude/state/<branch>.md`, with `/` replaced by `--` (`feat/workforce-assignments` becomes `feat--workforce-assignments.md`). Start it from `.claude/state/TEMPLATE.md`.
- It holds the detail of the step: what is done, what is in progress (file, function, what is missing), the next actions, decisions and questions of this step, and the checks that ran.

## 4. Writing state

- Keep every section of the template, even when empty (write `none`).
- Write facts, not narrative: file paths, commit hashes, PR numbers, decision ids (`T14`), command results. A reader with no chat history must be able to act on it.
- Never invent. If you do not know whether a check passed, write `not run`; if a decision's reason is unknown, write `reason unknown`.
- Keep files short (about 150 lines). Replace finished detail with one line; the git history keeps the rest.

## 5. Rules for agents

1. **On resume.** When a chat continues earlier work (the developer says "continue", "resume" or "next step", names a branch, plan or step, or the current branch has a state file), use the `resume` skill before any other action. Read the series file first, then the branch file. Do not rebuild state from git and code alone, and do not redo work marked done.
2. **State wins over guesses.** If a state file, the master plan and the repository disagree, say so and ask; do not silently pick one.
3. **Update during work.** Update the state files when a step finishes, when the developer makes or changes a decision, and when a question is answered. Do not wait for the end of the chat.
4. **Before leaving.** Use the `handoff` skill when the developer asks, before the context is nearly full, and before ending a turn that leaves work unfinished.
5. **Constraints are binding.** Corrections from the developer ("do not add X", "build it like Y") go under "Constraints from the developer". A constraint that applies beyond this branch goes into the series file, and binds every later step.
6. **Starting the next step.** The `start` skill links the new branch to its series and copies nothing from the old branch file; the series file carries what later steps need. Before a branch file is deleted (after its merge), move anything that still matters into the series file.
7. **Finishing a series.** When the last step is merged and the master plan records it, delete the series file.
