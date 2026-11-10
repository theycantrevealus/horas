# Engineering Workflow

General rules for every developer and AI agent working in this repository, for every task. Area rules (`back-end/`, `front-end/`, `typescript.md`, `git-workflow.md`) add to these; when an area rule is more specific, it wins.

## 1. Role

Act as a senior engineer working on a production system. Your responsibilities include:

1. Understanding existing code before changing it.
2. Following established architectural boundaries.
3. Implementing requirements with minimal unnecessary changes.
4. Maintaining backward compatibility where required.
5. Writing meaningful automated tests.
6. Investigating root causes rather than applying superficial fixes.
7. Identifying security, reliability, and performance risks.
8. Reporting exactly what was changed and verified.

- Do not optimize for the smallest amount of code. Optimize for correctness, maintainability, observability, and reliability.
- Do not assume that a technically valid implementation is automatically correct for the business. Check it against `.claude/business/` and `.claude/design/`.

## 2. Before modifying files

Determine:

- Which files are involved.
- Which applications or libraries depend on them.
- Whether the working tree already contains user changes.
- Which tests cover the affected behavior.
- Which commands are available to validate the change (the root scripts `pnpm lint`, `pnpm type-check`, `pnpm test`, and the scripts of the affected `package.json`).

Protect the work of others:

- Check first whether there are changes that do not come from your work (`git status`, `git diff`).
- Never overwrite unrelated user changes.
- Do not revert, reset, or clean the Git working tree without explicit approval.
- Starting a task on a clean tree and a fresh branch is covered by `git-workflow.md` section 1.1.

## 3. Planning

For tasks involving multiple modules, database changes, messaging, security, or architectural decisions:

1. Summarize your understanding of the requirement.
2. Identify the affected components.
3. Describe the intended implementation.
4. Identify failure scenarios and compatibility risks.
5. Define the tests needed to verify the behavior.
6. Present the plan before making substantial changes.

For small, isolated changes, proceed directly after inspection.

If a requirement is ambiguous and the ambiguity could cause data loss, financial inconsistency, a security vulnerability, or a breaking API change, ask for clarification before proceeding. The areas where agents must always stop and ask are listed in `git-workflow.md` section 5.

## 4. Focused changes

- Make the smallest complete change that satisfies the requirement.
- Avoid unrelated refactoring.
- Do not modify generated files unless the project requires it.
- Do not introduce new dependencies without a clear justification.
- Do not duplicate existing utilities or business rules.
- Do not silently change public API contracts.
- Do not suppress TypeScript errors to make the build pass.
- Do not remove failing tests merely to achieve a green test suite.

## 5. Verification and reporting

Never claim that a build, test, migration, or deployment succeeded unless the relevant command actually completed successfully. If verification cannot be performed, explain why.

When reporting, distinguish between:

| Status | Meaning |
|---|---|
| Implemented | The code or document is written. Says nothing about whether it works. |
| Tested successfully | The relevant command ran and passed. Name the command. |
| Tested with failures | The command ran and failed. Show the failure and whether it is new or pre-existing. |
| Not tested | No verification was run. Say why. |
| Blocked | Verification needs an external dependency or environment that is not available. Name it. |
