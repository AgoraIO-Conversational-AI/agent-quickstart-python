# Review Standards (Agent Self-check)

Agent auto-reviews at end of each phase using these standards, outputs review conclusion. User doesn't need to participate unless explicitly requesting interactive review.

---

## Usage

- **Default mode**: Agent auto-reviews, outputs progress and efficiency metrics
- **Interactive mode**: When user says "detailed review" or "check each item", show item by item

---

## Phase Indicators

### Full Progress Bar (shown on phase transition)

```
[🔍 Clarify] → [📐 Design] → [⚡ Execute] → [✅ Verify] → [📝 Summary]
                ▲ Current
```

### Phase Descriptions

| Icon | Phase | Meaning | Allowed Actions |
|------|-------|---------|-----------------|
| 🔍 | Clarify | Understand requirements | Ask, decompose, no assumptions |
| 📐 | Design | Plan solution | Structured reasoning, give options |
| ⚡ | Execute | Code/write docs | Direct action, no restating |
| ✅ | Verify | Check results | Compare against criteria, flag risks |
| 📝 | Summary | Consolidate output | Structured summary |

### Phase Transition

Clearly notify user when switching phases, e.g.:

```
Entering ⚡Execute phase

[🔍 Clarify] → [📐 Design] → [⚡ Execute] → [✅ Verify] → [📝 Summary]
                              ▲ Current
```

---

## Conversation Review (Agent Self-check)

Agent self-checks before each output:

1. **Correct phase** - Which phase am I in? Crossing phases?
2. **Converged output** - Giving finite options vs unbounded divergence?
3. **Avoid redundancy** - Repeating user-confirmed content?
4. **Blocker handling** - Missing info → interrupt vs assume?

Self-check pass → Output directly
Self-check fail → Adjust then output, or explain blocker

---

## Change Review (Pre-commit Self-check)

Agent self-checks before committing code/PR:

Required Items
- [ ] Only made changes within declared scope
- [ ] No unexpected behavior changes
- [ ] Ran lint
- [ ] Explained verification method

Extended Items (if applicable)
- [ ] Public component/config changes explained impact
- [ ] New dependencies explained necessity
- [ ] Rollback suggestion (if needed)

---

## Output Format

### Simplified (end of each output)

```
Progress: 📐Design → ⚡Execute | Turn 5 | +32 -10 lines
```

### Efficiency Metrics (phase end or task complete)

```
📊 Session Statistics
Turns: 12 | Tokens: ~8.2k | Changes: +156 -23 ~45
🤖 15min | 🧑‍💻 3h | ⬇️ 2.75h
```

- 🤖 = AI actual time
- 🧑‍💻 = Human estimated time
- ⬇️ = Time saved

### Needs Confirmation

```
⚠️ Needs confirmation | 📐Design | Changes exceed declared scope, continue?
```

### Blocked

```
❌ Blocked | 🔍Clarify | Missing required info, please provide XXX
```

---

## Interactive Review (On-demand Only)

Enter interactive mode when user says:
- "detailed review"
- "check each item"
- "expand review"

In interactive mode, show check items and results one by one.

---

## Emoji Usage Rules

| Context | Rule |
|---------|------|
| Conversation | ✅ Use freely, replace text |
| PROJECT_STATE.md | ✅ Use freely |
| Docs (AGENTS.md etc.) | ✅ Use freely |
| Code comments | ⚠️ Use sparingly |
| Commit messages | ❌ Never use |
