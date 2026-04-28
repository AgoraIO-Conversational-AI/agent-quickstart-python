# Workflow Templates

Before starting a task, select the corresponding type and follow the steps. If unsure, default to `fix` with additional notes.

Universal constraint: Must update `PROJECT_STATE.md` at end of each phase.

---

## feat (New Feature/Page)

Entry Routing
1. Adding new page/route?
2. Adding new config or data source?
3. Involves new copy or i18n?

Minimum Questions
- Target page/route name?
- Expected behavior and acceptance criteria?

Action Checklist
- [ ] Confirm route and directory conventions
- [ ] Reuse or create components
- [ ] Add config and type definitions
- [ ] Update copy (if i18n)
- [ ] Run lint

Completion Criteria
- Page/feature works, meets acceptance criteria
- Lint passes

---

## fix (Bug Fix)

Entry Routing
1. Reproducible?
2. Error logs available?
3. Caused by recent changes?

Minimum Questions
- Repro steps + expected behavior + actual behavior?
- Affected page/component/API?

Action Checklist
- [ ] Locate trigger path and responsibility boundary
- [ ] Minimal fix
- [ ] Regression check

Completion Criteria
- Bug no longer reproduces
- Lint passes

---

## refactor (Refactoring)

Entry Routing
1. Changes external behavior?
2. Needs phased approach?

Minimum Questions
- Refactor motivation and scope?
- Invariants and behaviors that must not break?

Action Checklist
- [ ] Define boundaries and invariants
- [ ] Small-step replacement with verification
- [ ] Update related docs

Completion Criteria
- External behavior unchanged
- Lint/Test passes

---

## chore (Engineering/Dependencies/Config)

Entry Routing
1. Involves dependency upgrade?
2. Affects build/CI?

Minimum Questions
- Target dependency/config?
- Change motivation and risks?

Action Checklist
- [ ] Update dependency or config
- [ ] Run lint/build/test
- [ ] Document compatibility changes

Completion Criteria
- Change takes effect
- Key scripts pass

---

## docs (Documentation Update)

Entry Routing
1. New documentation?
2. Involves spec changes?

Action Checklist
- [ ] Update docs and links
- [ ] Mark update timestamp

Completion Criteria
- Docs readable and consistent

---

## test (Testing)

Entry Routing
1. Adding new tests?
2. Fixing test failures?

Action Checklist
- [ ] Add/fix tests
- [ ] Ensure stability

Completion Criteria
- Test cases pass stably
