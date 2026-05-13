# Agent Development Guide

This guide is for coding agents making changes in `agent-quickstart-python`.

## Start Here

- Read [README.md](./README.md) for setup, supported run modes, and verification.
- Use [ARCHITECTURE.md](./ARCHITECTURE.md) for system-level request flow.
- Use module guides only when working inside that module:
  - [web/AGENTS.md](./web/AGENTS.md)
  - [server/AGENTS.md](./server/AGENTS.md)

## Current System Shape

- Frontend: Next.js 16, React 19, TypeScript, `agora-rtc-react`, `agora-rtm`, `agora-agent-client-toolkit`, `agora-agent-uikit`
- Local backend: Python FastAPI in `server`
- Deployed web backend: Next route handlers in `web/app/api`
- Auth: Token007 generated from `AGORA_APP_ID` and `AGORA_APP_CERTIFICATE`
- Default agent config: managed Deepgram STT, OpenAI LLM, and MiniMax TTS

## Supported Modes

### Local Python-Backed Development

- Run from the repo root with `bun run dev`
- Root scripts start:
  - FastAPI on `http://localhost:8000`
  - Next.js on `http://localhost:3000`
- In this mode, the web app still calls `/api/*`, but the Next route handlers proxy to the Python service through `AGENT_BACKEND_URL=http://localhost:8000`

### Single-Target Web Deployment

- Deploy `web` as a Next.js app
- `/api/get_config`, `/api/v2/startAgent`, and `/api/v2/stopAgent` run inside the Next app
- Do not assume a separate Python service exists in this mode

## Routing Ownership

- UI and RTC/RTM client lifecycle live in `web`
- `/api/*` entrypoints for the web app live in `web/app/api`
- Python agent lifecycle logic lives in `server/src`
- For deployability changes, update both the README and architecture docs if the owner of `/api/*` changes

## Key Files

- `README.md`: setup, local vs deploy modes, troubleshooting, verification
- `ARCHITECTURE.md`: top-level environment model
- `web/src/components/app.tsx`: conversation UI shell
- `web/src/hooks/useAgoraConnection.ts`: RTC, RTM, transcript, and token renewal lifecycle
- `web/src/lib/server/agora.ts`: shared server-side token and agent helpers for Next route handlers
- `server/src/server.py`: FastAPI entrypoints
- `server/src/agent.py`: async Agora agent lifecycle wrapper

## Working Rules

- Prefer the smallest change that keeps local mode and deployed mode aligned.
- Do not reintroduce `web/proxy.ts`; the current proxy fallback is route-local through `AGENT_BACKEND_URL`.
- Do not assume Zustand or a separate client-side store exists.
- Do not require third-party vendor API keys unless the code actually introduces a non-managed path.
- Keep token expiry and renewal behavior aligned across the Python backend and Next route handlers.

## Standard Commands

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

## Done Criteria

Before finishing a change:

1. Run the narrowest relevant verification command.
2. If the change affects the deployable web app, ensure `bun run verify:web` passes.
3. If the change affects local Python-backed development, ensure `bun run verify:local` or the narrower `bun run verify:local:fastapi` / `bun run verify:web:proxy` / `bun run verify:backend` commands pass as appropriate.
4. Treat `server/.env.local` as CLI-managed by default. If you change required env vars or setup steps, update both the root README and the module README.
5. Update `README.md` or architecture docs when the developer workflow or request flow changes.

`bun run verify:local:fastapi` exercises the real FastAPI route layer through Next, but with a fake agent implementation so the check stays deterministic and does not depend on a live managed-agent start.
