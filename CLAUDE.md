# CLAUDE.md — Hospital Information Management System Platform Engineering Handbook

## 1. Project Overview

This repository is a hospital ERP system that could handle local hospital (currently in Indonesia) but also able to implemented for international hospital.

This repository is a monorepo orchestrated and managed by `pnpm`.

The structure is:

- `apps/front-end`: Contains front-end project.
- `apps/back-end`: Contains back-end project.
- `packages`: Contains shared types, API contracts, shared utils.

### Primary Technology Stack and Rules

- Read `.claude/rules/typescript.md` to understand typescript standard in common use.
- Read all markdown documents inside `.claude/rules/back-end` to understand the back end standard.
- Read `.claude/business/glossary.md` and the business specification of the module you work on in `.claude/business/` before designing or changing business behaviour.
- Read the relevant design documents in `.claude/design/` before adding or changing collections: `account-and-workforce-collections.md` (approved), `data-change-history.md` (approved).

### Git workflow

- Read `.claude/rules/git-workflow.md` before committing, pushing or opening a pull request. It is the source of truth for branches, commit messages and PRs.
- To commit, use the `commit` skill. To open a pull request, use the `pr` skill (only when the user asks). Do not commit or push unless the user asked in the current conversation.
