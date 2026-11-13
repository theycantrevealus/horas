# Series state: <master plan file name>

Updated: <YYYY-MM-DD HH:mm> by <agent or developer>
Rules: `.claude/rules/task-state.md`
Master plan: `.claude/design/plans/<file>.md`

## Position

- Current step: <step id and name>, branch `<branch>` (or not started)
- Next step: <step id and name>, plan `<file or not written>`

## Finished steps

| Step | Branch | PR | Outcome |
|---|---|---|---|
| <id> | `<branch>` | <#n> | <one line: built, deviations, follow-ups> |

## Conventions for every step

- <pattern settled for all steps, for example "the gateway test follows facility.spec.ts">

## Constraints from the developer

- <correction or "don't do" note that applies to every step, with date>

## Decisions not yet documented

| Id | Decision | Doc to update |
|---|---|---|
| <id> | <decision and reason> | <path> |

## Documentation to update

- <master plan, design or rule out of date, and how>

## Open questions

- <question>: <who must answer, which step it blocks>
