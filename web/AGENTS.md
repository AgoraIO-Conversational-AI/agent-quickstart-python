# Web Client Agent Guide

Use this guide when changing files under `web/`.

## Current Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS
- `agora-rtc-react`
- `agora-rtm`
- `agora-agent-client-toolkit`
- `agora-agent-uikit`

## What This Module Owns

- The landing screen and live conversation UI
- RTC client setup and channel join lifecycle
- RTM login, transcript handling, and token renewal
- Web-facing `/api/*` paths via Next rewrites
- Python backend forwarding through `AGENT_BACKEND_URL`

## Important Files

- `app/page.tsx`: root page and Agora provider setup
- `src/components/app.tsx`: user-facing conversation experience
- `src/hooks/useAgoraConnection.ts`: RTC/RTM/agent lifecycle
- `src/lib/conversation.ts`: transcript helpers
- `src/services/api.ts`: browser API client
- `next.config.ts`: Turbopack root configuration and `/api/*` rewrite mappings

## Request Flow

### Local Development

- Run `bun run dev` from the repo root
- Next rewrites `/api/*` requests to `http://localhost:8000`
- `AGENT_BACKEND_URL` is set by the root scripts

### Deployment

- Deploy `web` as the app root
- Set `AGENT_BACKEND_URL` to a reachable Python backend

## Working Rules

- Keep `/api/*` paths as rewrites to Python; do not reintroduce in-process Route Handlers.
- Keep RTC client creation StrictMode-safe.
- Keep transcript speaker mapping based on actual UIDs, not heuristics.
- When adding new env requirements for deployed mode, update `.env.local.example` and the root README.

## Commands

From the repo root:

```bash
bun run frontend
bun run verify:web
```

Useful narrower check:

```bash
bun run verify:web:api
bun run verify:local:fastapi
```

`bun run verify:local:fastapi` boots the FastAPI app and checks the Next proxy path against its real routes, but swaps in a fake agent implementation so the smoke test stays fast and deterministic.

From `web/` directly:

```bash
bun run doctor
bun run verify
```
