<!-- ai-coding-scaffold: v0.1.3 -->

# AGENTS.md

## Conversation Modes

Identify mode based on user input and apply corresponding response strategy:

| Mode | Recognition | Strategy |
|------|-------------|----------|
| **workflow** | Contains feat/fix/refactor/chore, or explicit dev task | **Start workflow (mandatory state management)** |
| **continue** | "continue / resume", or unfinished PROJECT_STATE.md exists | Read state file, restore context, enter workflow |
| **general** | Technical questions, code explanations, general inquiries | Direct answer, no workflow |

---

## Mode Switching Rules

### general → workflow Fallback

When **general mode response involves these operations**, must prompt user to switch to workflow mode:

- File modifications (create, edit, delete)
- Command execution (git, build, test, etc.)
- Todo changes (add, update tasks)

**Prompt format**:

```
⚠️ Development operation detected

Current operation requires:
- [specific operation list]

Recommend switching to workflow mode for state tracking. Switch?
```

---

## workflow Mode (Mandatory State Machine)

### workflow Startup Gate (Hard Gate)

> **Upon entering workflow mode, the following steps MUST be completed first. No dev actions allowed until done.**

1. **Check `PROJECT_STATE.md`**
   - Not exists → Create immediately (use `docs/PROJECT_STATE_TEMPLATE.md`)
   - Exists → Check if update needed

2. **Explicitly declare state result in current output (required)**:

```
[STATE] PROJECT_STATE.md: checked / updated
```

> ⚠️ **Missing `[STATE]` declaration = workflow not started.**

---

### workflow Progress Display (Standard Output)

```
Entering workflow mode

[🔍 Clarify] → [📐 Design] → [⚡ Execute] → [✅ Verify] → [📝 Summary]
  ▲ Current
```

---

## Preferences

- Language: English
- Timezone: UTC, YYYY-MM-DD, 24h

---

## AI Behavior Standards

### PROJECT_STATE.md Maintenance (Hard Constraint)

**Core Principle**:
> **State maintenance is part of workflow, not optional behavior.**

#### 1. Mandatory Check Per Turn (workflow mode)

In workflow mode, **must complete before each response**:

- Does PROJECT_STATE.md exist?
- Does current phase / todo / decisions need update?

Provide **state anchor** in output, e.g.:

```
[STATE] PROJECT_STATE.md: todo 3 → 2, phase: 📐Design
```

**⚠️ Minimum Output Frequency Requirement**:

> **Even if state unchanged, must include `[STATE]` line in every output.**

Prevents "state fatigue" in long execution flows.

#### 2. Mandatory Update Nodes (Cannot Skip)

- Create / update todo
- Complete todo item
- After commit
- Phase transition
- Blockers / decision points
- **Even lightweight tasks (single file change, sync, tweak)**

> ⚠️ **Cannot skip state update because "task too small".**

#### 3. Template

- Use `docs/PROJECT_STATE_TEMPLATE.md`

---

### Git Commit Strategy

- **Commit frequency**: Immediately after completing each todo item
- **Don't accumulate**: Don't finish entire todo list then commit
- **Atomic commits**: One commit = one complete, independent change unit

---

### Quality Review

- **Generated ≠ Complete**
- After completing each todo item:
  - Proactively ask if review needed
- Review content:
  - Code: logic correctness, type safety, edge cases
  - Docs: accuracy, clarity, usable examples
- **Fix issues immediately, don't accumulate**

---

### Conversation Review (Auto-execute)

#### Regular Turns (Simplified)

```
Progress: 📐Design → ⚡Execute | Turn 5 | +32 -10 lines
```

#### Phase Transition (Full)

```
Entering ⚡Execute phase

[🔍 Clarify] → [📐 Design] → [⚡ Execute] → [✅ Verify] → [📝 Summary]
                              ▲ Current
```

#### Task Complete (Efficiency Stats)

```
📊 Session Statistics
Turns: 12 | Tokens: ~8.2k | Changes: +156 -23 ~45
🤖 15min | 🧑‍💻 3h | ⬇️ 2.75h
```

Review standards: `docs/REVIEW_TEMPLATES.md`

---

### Context Management (Mandatory Wrap-up)

When any of the following occurs:

- Conversation exceeds 10 turns
- Large code or doc changes
- User indicates insufficient context
- Agent perceives context risk

**Must execute the following**:

1. Pause current task
2. Update PROJECT_STATE.md (progress / todos / key decisions)
3. Commit all uncommitted changes
4. Output switch prompt:

```
⚠️ Recommend switching to new conversation

Completed:
- [completed task list]

To continue:
- [incomplete task list]

Next: Start new conversation, type "continue <task name>"
```

---

## Documentation Navigation

| Document | Description |
|----------|-------------|
| PROJECT_STATE.md | Project state record (workflow required) |
| ARCHITECTURE.md | Technical architecture and data flow |
| CLAUDE.md | Claude-specific quick reference |
| .claude/skill-overview.md | Skills overview and connection flow |
| .claude/skill-rtc-integration.md | RTC integration with agora-rtc-react hooks |
| .claude/skill-rtm-integration.md | RTM integration guide |
| .claude/skill-conversational-ai-api.md | AgoraVoiceAI (agora-agent-client-toolkit) integration |

---

## Project Overview

Agora Conversational quick-start Web Demo - A starter template for building real-time conversational applications with Agora SDK.

**Architecture**: Frontend (React + TypeScript) + Backend (Python FastAPI)

For detailed architecture, see [ARCHITECTURE.md](./ARCHITECTURE.md)

## Core Rules

### Tech Stack

**Frontend**:
| Item | Value |
|------|-------|
| Package Manager | bun |
| Framework | React |
| Language | TypeScript |
| Styling | Tailwind CSS |
| State Management | Zustand |
| Lint/Format | Biome |

**Backend**:
| Item | Value |
|------|-------|
| Framework | FastAPI |
| Language | Python 3.6+ |
| Token Generation | Custom TokenBuilder |
| HTTP Client | requests |

### Key Constraints

1. **Frontend**: No environment variables needed - all config from backend
2. **Backend**: Must be running on port 8000 before starting frontend
3. Run `bun run lint` before commit and ensure pass
4. Type-first: All components and functions must be properly typed

### File Naming

- Files: `kebab-case`
- Components: `PascalCase`

### Code Style

Biome enforces consistent formatting and linting rules.

Path alias: `@/*` → `./src/*`

---

## Common Commands

**Frontend**:
```bash
bun dev          # Start dev server (requires backend running)
bun build        # Production build
bun lint         # Run Biome lint
```

**Backend** (from project root):
```bash
cd ../server-python
python3 src/server.py    # Start Python service on port 8000
```

**Full Stack** (from project root):
```bash
bun run dev    # Starts both frontend and backend
```

## Git Commit Format

```bash
git commit -m "<type>(<scope>): <summary>

## Changes
- <detail 1>
- <detail 2>

Generated with AI Agent"
```

**Type**: `feat` / `fix` / `docs` / `refactor` / `perf` / `test` / `chore` / `style`
