# Agent Development Guide

This guide is for coding agents making changes in `agent-quickstart-python`.

## How to Load

This repository uses progressive disclosure documentation. Docs live under `docs/ai/` in three levels.

1. Read [docs/ai/L0_repo_card.md](docs/ai/L0_repo_card.md) to identify the repo.
2. Load ALL 8 files in [docs/ai/L1/](docs/ai/L1/). They are small — load all upfront.
3. Follow L2 deep-dive links only when L1 isn't detailed enough. The index is at [docs/ai/L1/L2/_index.md](docs/ai/L1/L2/_index.md).

The sections below (Start Here, Patterns, Anti-Patterns, etc.) remain the canonical contributor handbook for hands-on work; the `docs/ai/` tree is the structured summary used by AI agents.

## Start Here

- Read [README.md](./README.md) for setup, supported run modes, and verification.
- Use [ARCHITECTURE.md](./ARCHITECTURE.md) for system-level request flow.
- For layout and responsibilities inside `web/` vs `server/`, use [docs/ai/L1/03_code_map.md](docs/ai/L1/03_code_map.md) and [docs/ai/L1/02_architecture.md](docs/ai/L1/02_architecture.md).

## Current System Shape

- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS, `agora-rtc-react`, `agora-rtm`, `agora-agent-client-toolkit`, and `agora-agent-uikit`
- Backend: Python FastAPI in `server`
- Web API facade: Next rewrites in `web/next.config.ts`
- Auth: Token007 generated from `AGORA_APP_ID` and `AGORA_APP_CERTIFICATE`
- Default agent config: managed Deepgram STT, OpenAI LLM, and MiniMax TTS

## Supported Modes

### Local Python-Backed Development

- Run from the repo root with `bun run dev`.
- Root scripts start FastAPI on `http://localhost:8000` and Next.js on `http://localhost:3000`.
- The web app calls `/api/*`; Next rewrites those requests to the Python service through `AGENT_BACKEND_URL=http://localhost:8000`.

### Deployment

- Deploy `web` as a Next.js app.
- Deploy or provide a reachable Python FastAPI backend.
- Set `AGENT_BACKEND_URL` in the web deployment target.

## Routing / Ownership

- UI and RTC/RTM client lifecycle live in `web`.
- Browser-facing `/api/*` paths are declared in `web/next.config.ts` rewrites.
- Python agent lifecycle logic lives in `server/src`.
- For deployability changes, update README and architecture docs when the owner of `/api/*` changes.

## Key Files

- `README.md`: setup, local vs deploy modes, troubleshooting, and verification.
- `ARCHITECTURE.md`: top-level environment model.
- `web/next.config.ts`: `/api/*` rewrite mappings to the Python backend.
- `web/src/components/LandingPage.tsx`: conversation entry point, RTM login, token renewal.
- `web/src/components/ConversationComponent.tsx`: core real-time UI, RTC join, `AgoraVoiceAI`, mic UI.
- `web/src/services/api.ts`: browser API client.
- `server/src/server.py`: FastAPI entrypoints.
- `server/src/agent.py`: async Agora agent lifecycle wrapper.

## Patterns

- Keep the web client calling `/api/*`; hide backend placement behind Next rewrites.
- Keep token generation behavior in the Python backend.
- Keep RTC client creation StrictMode-safe.
- Keep transcript speaker mapping based on actual UIDs, not heuristics.
- Keep managed-provider defaults unless a change intentionally adds a custom provider path.

## Working Rules

- Prefer the smallest change that keeps local mode and deployed mode aligned.
- Keep Python-specific agent lifecycle changes in `server`.
- Keep browser state and RTC/RTM lifecycle changes in `web`.
- Treat `server/.env.local` as CLI-managed by default.
- If you change request or response contracts, update the web client, backend, contract checks, and README together.

## Commands

From the repo root:

```bash
bun install
bun run doctor
bun run doctor:local
bun run dev
bun run verify
bun run verify:local
```

Useful narrower checks:

```bash
bun run verify:web
bun run verify:local:fastapi
bun run verify:web:proxy
bun run verify:backend
```

Inside `web/`, use:

```bash
bun run doctor
bun run verify
```

## Verification Safety

- Safe without live Agora credentials:
  - `bun run doctor`
  - `bun run verify:web:api`
  - `bun run verify:web:proxy`
  - `bun run verify:backend`
- Requires local env setup but not a live Agora session:
  - `bun run doctor:local`
  - `bun run verify:local`
- Exercises the FastAPI route layer through Next with a fake agent implementation:
  - `bun run verify:local:fastapi`
- Often blocked inside restricted sandboxes because of port binding or Turbopack process spawning:
  - `bun run dev`
  - `bun run verify:web:build`
  - `bun run verify:local`

## Anti-Patterns / What NOT To Do

- Do not reintroduce Next Route Handlers or `web/proxy.ts` for agent/token logic.
- Do not assume Zustand or a separate client-side store exists.
- Do not require third-party vendor API keys unless the code introduces a non-managed path.
- Do not move token generation into the web app.
- Do not change `/api/*` ownership without updating README, architecture docs, root `AGENTS.md`, and the relevant `docs/ai/L1/` files.

## Done Criteria

Before finishing a change:

1. Run the narrowest relevant verification command.
2. If the change affects the deployable web app, ensure `bun run verify:web` passes.
3. If the change affects local Python-backed development, ensure `bun run verify:local` or the narrower `bun run verify:local:fastapi`, `bun run verify:web:proxy`, or `bun run verify:backend` command passes as appropriate.
4. If you change required env vars or setup steps, update both the root README and the module README.
5. Update README or architecture docs when developer workflow, request flow, or deployment guidance changes.
6. If the change touches workflows, interfaces, gotchas, or security details, update the matching file under [docs/ai/L1/](docs/ai/L1/) and bump `Last Reviewed` in [docs/ai/L0_repo_card.md](docs/ai/L0_repo_card.md).

## Git Conventions

### Commit messages — conventional commits

- **Format:** `type: description` or `type(scope): description`
- **Types:** `feat:` (new feature), `fix:` (bug fix), `chore:` (maintenance, version bumps), `test:` (test additions/changes), `docs:` (documentation)
- **Scoped variant:** `feat(scope):`, `fix(scope):` — e.g. `feat(server): enable_metrics`
- **Lowercase after prefix** — `feat: add feature`, not `feat: Add feature`
- **Present tense** — "add feature", not "added feature"
- **PR number appended** — `feat: add feature (#123)`

### Branch names

- **Format:** `type/short-description` — lowercase, hyphen-separated
- **Types match commit types:** `feat/`, `fix/`, `chore/`, `test/`, `docs/`
- **Examples:** `feat/fastapi-metrics`, `fix/rtm-presence-race`, `docs/progressive-disclosure`

### General rules

- **No AI tool names** — never mention claude, cursor, copilot, cody, aider, gemini, codex, chatgpt, or gpt-3/4 in commit messages or PR descriptions.
- **No Co-Authored-By trailers** — omit AI attribution lines.
- **No `--no-verify`** — let git hooks run normally.
- **No git config changes** — do not modify `user.name` or `user.email`.

## Doc Commands

| Command         | When to use                                                  |
| --------------- | ------------------------------------------------------------ |
| generate docs   | No `docs/ai/` directory exists yet                           |
| update docs     | Code changed since the `Last Reviewed` date in L0            |
| test docs       | Verify docs give agents the right context (writes `docs/ai/test-results.md`) |

The generator and tester live in the [AgoraIO-Community/ai-devkit](https://github.com/AgoraIO-Community/ai-devkit) skill set. See the [progressive disclosure standard](https://github.com/AgoraIO-Community/ai-devkit/blob/main/docs/progressive-disclosure-standard.md) for the full specification.
